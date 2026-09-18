import { Buffer } from 'buffer';
import sharp from 'sharp';

export interface ProcessedArticleContent {
  sanitizedHtml: string;
  estimatedSizeBytes: number;
}

/** Images at or below this size are left untouched - compression overhead isn't worth it. */
const COMPRESSION_THRESHOLD_BYTES = 200 * 1024;

/** Max width for compressed images - plenty of resolution for e-ink Kindle displays. */
const MAX_IMAGE_WIDTH = 1200;

const JPEG_QUALITY = 75;

/**
 * Downscales and re-encodes an image buffer to JPEG to shrink it for DOCX embedding.
 * Returns null if sharp can't decode the buffer (e.g. corrupt or unsupported format),
 * in which case the original bytes should be used as-is.
 *
 * @param buffer - Raw image bytes
 * @returns The compressed buffer and its mime type, or null on failure
 */
async function compressImageBuffer(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const compressed = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return { buffer: compressed, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}

/**
 * Calculates the estimated byte size of an article including text and images.
 * Also sanitizes invalid or broken image tags to prevent conversion failures, and
 * compresses images larger than COMPRESSION_THRESHOLD_BYTES so the resulting DOCX
 * stays well within Postmark's attachment limit.
 *
 * @param htmlContent - The raw HTML content of the article
 * @returns Object containing sanitized HTML and total estimated byte size
 */
export async function processArticleAndCalculateSize(htmlContent: string): Promise<ProcessedArticleContent> {
  if (!htmlContent) {
    return { sanitizedHtml: '', estimatedSizeBytes: 0 };
  }

  let sanitizedHtml = htmlContent;
  let imageSizeBytes = 0;

  // Regex to find <img> tags and extract src
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const imageMatches: Array<{ fullTag: string; src: string }> = [];

  let match;
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    imageMatches.push({ fullTag: match[0], src: match[1] });
  }

  for (const { fullTag, src } of imageMatches) {
    try {
      if (src.startsWith('data:')) {
        // Validate data URLs. Their bytes are already part of sanitizedHtml's text length,
        // whether or not we recompress them below, so they must NOT also be added to
        // imageSizeBytes - that would double-count them.
        if (src.includes('base64,')) {
          const base64Data = src.split('base64,')[1];
          if (base64Data) {
            // Check if base64 decodes to an HTML error page
            if (src.startsWith('data:image/svg+xml')) {
              try {
                const decoded = Buffer.from(base64Data, 'base64').toString('utf8');
                if (decoded.includes('<!DOCTYPE html>') || decoded.includes('<html')) {
                  sanitizedHtml = sanitizedHtml.replace(fullTag, '');
                  continue;
                }
              } catch {
                sanitizedHtml = sanitizedHtml.replace(fullTag, '');
                continue;
              }
              // SVGs are vector-based and already small - skip raster compression
            } else {
              const buffer = Buffer.from(base64Data, 'base64');
              if (buffer.length > COMPRESSION_THRESHOLD_BYTES) {
                const compressed = await compressImageBuffer(buffer);
                if (compressed) {
                  const newSrc = `data:${compressed.mimeType};base64,${compressed.buffer.toString('base64')}`;
                  sanitizedHtml = sanitizedHtml.replace(fullTag, fullTag.replace(src, newSrc));
                }
              }
            }
          }
        }
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        // Issue GET request with timeout to get image size and verify validity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
          const res = await fetch(src, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const contentType = res.headers.get('content-type') || '';
          if (!res.ok || contentType.includes('text/html')) {
            // Remove broken or non-image response tags
            sanitizedHtml = sanitizedHtml.replace(fullTag, '');
          } else {
            const contentLength = res.headers.get('content-length');
            const declaredSize = contentLength ? parseInt(contentLength, 10) : NaN;

            if (!isNaN(declaredSize) && declaredSize <= COMPRESSION_THRESHOLD_BYTES) {
              // Small enough already - no need to download the body
              imageSizeBytes += declaredSize;
            } else {
              const arrayBuf = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);

              if (buffer.length > COMPRESSION_THRESHOLD_BYTES && !contentType.includes('svg')) {
                const compressed = await compressImageBuffer(buffer);
                if (compressed) {
                  // Embedded as a data URI below - its bytes now live in sanitizedHtml's
                  // text length, so don't also add them to imageSizeBytes.
                  const dataUri = `data:${compressed.mimeType};base64,${compressed.buffer.toString('base64')}`;
                  sanitizedHtml = sanitizedHtml.replace(fullTag, fullTag.replace(src, dataUri));
                } else {
                  // Compression failed - stays a remote URL, so its bytes aren't in sanitizedHtml.
                  imageSizeBytes += buffer.length;
                }
              } else {
                // Left as a remote URL (not embedded) - count it, since html-to-docx will
                // fetch it separately and its bytes aren't part of sanitizedHtml.
                imageSizeBytes += buffer.length;
              }
            }
          }
        } catch {
          clearTimeout(timeoutId);
          // On network error or timeout, remove unresolvable tag
          sanitizedHtml = sanitizedHtml.replace(fullTag, '');
        }
      }
    } catch {
      sanitizedHtml = sanitizedHtml.replace(fullTag, '');
    }
  }

  const textSizeBytes = Buffer.byteLength(sanitizedHtml, 'utf8');
  const estimatedSizeBytes = textSizeBytes + imageSizeBytes;

  return {
    sanitizedHtml,
    estimatedSizeBytes,
  };
}
