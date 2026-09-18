import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchBookmarks, getBookmarkText, archiveBookmark, InstapaperBookmark, InstapaperItem } from '@/lib/instapaper';
import { sendEmailToKindle } from '@/lib/postmark';
import { getConfig } from '@/lib/config';
import { processArticleAndCalculateSize } from '@/lib/article-size';

/**
 * An article larger than this after compression can never fit in a bulk email
 * (Postmark's attachment limit is 10 MB) and would otherwise block every
 * subsequent bulk run. Such articles are archived unsent instead.
 */
const MAX_SINGLE_ARTICLE_BYTES = 8 * 1024 * 1024;

/**
 * Downgrades heading levels in HTML content (h1 -> h2, h2 -> h3, etc.).
 */
function transformHeadings(html: string): string {
  return html.replace(/<(\/?)(h[1-6])/gi, (_match, slash, tag) => {
    const level = parseInt(tag[1]);
    const newLevel = Math.min(level + 1, 6);
    return `<${slash}h${newLevel}`;
  });
}

/**
 * Fetches bookmark text for multiple articles using a sliding-window concurrency pool.
 */
async function fetchBookmarkContents(
  bookmarks: InstapaperBookmark[],
  concurrency: number
): Promise<string[]> {
  const results: string[] = new Array(bookmarks.length).fill('');
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < bookmarks.length) {
      const index = nextIndex++;
      const bookmark = bookmarks[index];
      try {
        const rawContent = await getBookmarkText(bookmark.bookmark_id.toString());
        results[index] = transformHeadings(rawContent);
      } catch (err) {
        console.error(`Failed to fetch content for bookmark ${bookmark.bookmark_id}:`, err);
        results[index] = `Failed to fetch content for bookmark "${bookmark?.title}"`;
      }
    }
  }

  const workerCount = Math.min(concurrency, bookmarks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/**
 * Archives multiple bookmarks using a sliding-window concurrency pool.
 */
async function archiveBookmarks(
  bookmarks: InstapaperBookmark[],
  concurrency: number
): Promise<void> {
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < bookmarks.length) {
      const index = nextIndex++;
      const bookmark = bookmarks[index];
      try {
        await archiveBookmark(bookmark.bookmark_id.toString());
      } catch (err) {
        console.error(`Failed to archive bookmark ${bookmark.bookmark_id} after bulk send:`, err);
      }
    }
  }

  const workerCount = Math.min(concurrency, bookmarks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

/**
 * API route to send a bulk of unread articles to Kindle.
 * Sends the N most recent unread articles combined into a single DOCX file.
 * N is controlled by the BULK_SEND_LIMIT environment variable (default: 20).
 * Calculates article and image sizes and sends a smaller bulk if the total size exceeds safety limits.
 * Articles that individually exceed MAX_SINGLE_ARTICLE_BYTES after compression are archived
 * without being sent, since they could never fit in a bulk email.
 */
export async function GET() {
  try {
    const config = getConfig();
    const kindleEmail = config.KINDLE_EMAIL;
    if (!kindleEmail) {
      return NextResponse.json({ error: 'Kindle email not configured' }, { status: 500 });
    }

    const bulkLimit = config.BULK_SEND_LIMIT;
    const parallelLimit = config.FETCH_PARALLEL_LIMIT;

    // Fetch bookmarks list
    const data: InstapaperItem[] = await fetchBookmarks('unread', bulkLimit);
    const bookmarks = data.filter((item): item is InstapaperBookmark => item.type === 'bookmark');

    if (bookmarks.length === 0) {
      return NextResponse.json({ error: 'No unread articles to send' }, { status: 400 });
    }

    // Fetch all article contents via a concurrency pool
    const articleContents = await fetchBookmarkContents(bookmarks, parallelLimit);

    // Calculate text and image sizes and sanitize HTML for all articles
    const processedArticles = await Promise.all(
      articleContents.map((content) => processArticleAndCalculateSize(content))
    );

    // Filter articles to ensure the total estimated payload fits within the maximum attachment size limit
    let totalEstimatedSize = 10 * 1024; // ~10KB TOC and structural wrapper overhead
    const selectedBookmarks: InstapaperBookmark[] = [];
    const selectedContents: string[] = [];
    const oversizedBookmarks: InstapaperBookmark[] = [];

    for (let i = 0; i < bookmarks.length; i++) {
      const articleSize = processedArticles[i].estimatedSizeBytes;

      // An article this large can never fit in a bulk email on its own - skip it and
      // archive it below so it doesn't keep blocking every future bulk run.
      if (articleSize > MAX_SINGLE_ARTICLE_BYTES) {
        console.log(
          `Article "${bookmarks[i].title}" is ${articleSize} bytes after compression, exceeding the ` +
          `${MAX_SINGLE_ARTICLE_BYTES} byte single-article limit. Archiving without sending.`
        );
        oversizedBookmarks.push(bookmarks[i]);
        continue;
      }

      if (selectedBookmarks.length > 0 && totalEstimatedSize + articleSize > config.MAX_BULK_ATTACHMENT_BYTES) {
        console.log(
          `Bulk attachment limit reached. Including ${selectedBookmarks.length} of ${bookmarks.length} articles ` +
          `(estimated size: ${totalEstimatedSize + articleSize} bytes > limit ${config.MAX_BULK_ATTACHMENT_BYTES} bytes).`
        );
        break;
      }

      selectedBookmarks.push(bookmarks[i]);
      selectedContents.push(processedArticles[i].sanitizedHtml);
      totalEstimatedSize += articleSize;
    }

    // Oversized articles are archived unconditionally - they were never going to be sendable.
    if (oversizedBookmarks.length > 0) {
      await archiveBookmarks(oversizedBookmarks, parallelLimit);
    }

    if (selectedBookmarks.length === 0) {
      revalidatePath('/');
      return NextResponse.json({ error: 'No articles could fit within the size limit' }, { status: 400 });
    }

    // Get the date of the newest article for the subject line
    const newestArticle = selectedBookmarks[0];
    const newestDate = new Date(newestArticle.time * 1000).toISOString().split('T')[0];
    const subject = `Instapaper ${newestDate}`;

    // Build combined HTML document
    let combinedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head><body>`;

    // Add Table of Contents
    combinedHtml += `<h1>Table of Contents</h1><ul>`;
    for (const bookmark of selectedBookmarks) {
      combinedHtml += `<li><a href="#article-${bookmark.bookmark_id}">${bookmark.title}</a></li>`;
    }
    combinedHtml += `</ul><hr style="margin: 40px 0; border: 0; border-top: 1px solid #eee;" />`;

    // Add each selected article
    for (let i = 0; i < selectedBookmarks.length; i++) {
      const bookmark = selectedBookmarks[i];
      const content = selectedContents[i];

      combinedHtml += `<article id="article-${bookmark.bookmark_id}">`;
      combinedHtml += `<h1>${bookmark.title}</h1>`;
      combinedHtml += content || `<p>Error fetching content for this article.</p>`;
      combinedHtml += `</article>`;

      if (i < selectedBookmarks.length - 1) {
        combinedHtml += `<hr style="margin: 40px 0; border: 0; border-top: 1px solid #eee;" />`;
      }
    }

    combinedHtml += `</body></html>`;

    // 1. Send the combined email first
    await sendEmailToKindle(kindleEmail, subject, combinedHtml);

    // 2. Archive ONLY the bookmarks that were successfully included in the sent bulk
    await archiveBookmarks(selectedBookmarks, parallelLimit);

    // Revalidate the home page to reflect archived status
    revalidatePath('/');

    return NextResponse.json({ newestDate, count: selectedBookmarks.length });
  } catch (error: unknown) {
    console.error('Bulk send error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
