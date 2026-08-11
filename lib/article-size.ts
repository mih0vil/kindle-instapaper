import { Buffer } from 'buffer';

export interface ProcessedArticleContent {
  sanitizedHtml: string;
  estimatedSizeBytes: number;
}

/**
 * Calculates the estimated byte size of an article including text and images.
 * Also sanitizes invalid or broken image tags to prevent conversion failures.
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
        // Validate and size data URLs
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
            }
            const size = Math.ceil((base64Data.length * 3) / 4);
            imageSizeBytes += size;
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
            if (contentLength && !isNaN(parseInt(contentLength, 10))) {
              imageSizeBytes += parseInt(contentLength, 10);
            } else {
              const arrayBuf = await res.arrayBuffer();
              imageSizeBytes += arrayBuf.byteLength;
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
