import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchBookmarks, getBookmarkText, archiveBookmark, exchangeXAuthTokens, InstapaperBookmark, InstapaperItem } from '@/lib/instapaper';
import { sendEmailToKindle } from '@/lib/postmark';
import { getConfig } from '@/lib/config';

/**
 * Downgrades heading levels in HTML content (h1 -> h2, h2 -> h3, etc.).
 *
 * @param html - Original HTML content
 * @returns Transformed HTML
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
 *
 * Instead of waiting for a whole batch to finish before starting the next one,
 * a new fetch begins the moment any in-flight request completes — keeping exactly
 * `concurrency` requests active at all times (or fewer when work runs out).
 *
 * @param token - Instapaper OAuth token
 * @param secret - Instapaper OAuth secret
 * @param bookmarks - Ordered list of bookmarks whose content should be fetched
 * @param concurrency - Maximum number of simultaneous fetch requests
 * @returns Array of transformed HTML strings in the same order as the input bookmarks;
 *          empty string for any article that failed to fetch
 */
async function fetchBookmarkContents(
  token: string,
  secret: string,
  bookmarks: InstapaperBookmark[],
  concurrency: number
): Promise<string[]> {
  const results: string[] = new Array(bookmarks.length).fill('');

  // nextIndex tracks the next bookmark that hasn't been dispatched yet.
  // JavaScript is single-threaded so incrementing it inside an async function
  // is safe — no two workers can read the same value simultaneously.
  let nextIndex = 0;

  /**
   * A single worker: keeps picking the next undispatched bookmark, fetches its
   * content, stores the result, then loops — until no work remains.
   */
  async function worker(): Promise<void> {
    while (nextIndex < bookmarks.length) {
      const index = nextIndex++;
      const bookmark = bookmarks[index];
      try {
        const rawContent = await getBookmarkText(token, secret, bookmark.bookmark_id.toString());
        results[index] = transformHeadings(rawContent);
      } catch (err) {
        console.error(`Failed to fetch content for bookmark ${bookmark.bookmark_id}:`, err);
        results[index] = `Failed to fetch content for bookmark "${bookmark?.title}"`;
      }
    }
  }

  // Spawn `concurrency` workers (capped at the number of articles).
  // Each worker immediately picks up the next job as soon as it finishes the current one.
  const workerCount = Math.min(concurrency, bookmarks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/**
 * API route to send a bulk of unread articles to Kindle.
 * Sends the N most recent unread articles combined into a single DOCX file.
 * N is controlled by the BULK_SEND_LIMIT environment variable (default: 20).
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const config = await getConfig();
    let token = cookieStore.get('instapaper_token')?.value;
    let secret = cookieStore.get('instapaper_secret')?.value;

    // If no cookies, try to auto-login using .env credentials (useful for Cron jobs)
    if (!token || !secret) {
      if (config.INSTAPAPER_USERNAME && config.INSTAPAPER_PASSWORD) {
        try {
          const tokens = await exchangeXAuthTokens(config.INSTAPAPER_USERNAME, config.INSTAPAPER_PASSWORD);
          token = tokens.token;
          secret = tokens.secret;
        } catch (authError) {
          console.error('Cron auto-login failed:', authError);
          return NextResponse.json({ error: 'Authentication failed (Cron)' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Not authenticated and no .env credentials' }, { status: 401 });
      }
    }

    const kindleEmail = config.KINDLE_EMAIL;
    if (!kindleEmail) {
      return NextResponse.json({ error: 'Kindle email not configured' }, { status: 500 });
    }

    const bulkLimit = config.BULK_SEND_LIMIT;
    const parallelLimit = config.FETCH_PARALLEL_LIMIT;

    // Fetch bookmarks list
    const data: InstapaperItem[] = await fetchBookmarks(token, secret, 'unread', bulkLimit);
    const bookmarks = data.filter((item): item is InstapaperBookmark => item.type === 'bookmark');

    if (bookmarks.length === 0) {
      return NextResponse.json({ error: 'No unread articles to send' }, { status: 400 });
    }

    // Get the date of the newest article for the subject line
    const newestArticle = bookmarks[0];
    const newestDate = new Date(newestArticle.time * 1000).toISOString().split('T')[0];
    const subject = `Instapaper ${newestDate}`;

    // Fetch all article contents via a concurrency pool (parallelLimit simultaneous requests)
    const articleContents = await fetchBookmarkContents(token, secret, bookmarks, parallelLimit);

    // Build combined HTML document
    let combinedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head><body>`;

    // Add Table of Contents
    combinedHtml += `<h1>Table of Contents</h1><ul>`;
    for (const bookmark of bookmarks) {
      combinedHtml += `<li><a href="#article-${bookmark.bookmark_id}">${bookmark.title}</a></li>`;
    }
    combinedHtml += `</ul><hr style="margin: 40px 0; border: 0; border-top: 1px solid #eee;" />`;

    // Add each article
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      const content = articleContents[i];

      combinedHtml += `<article id="article-${bookmark.bookmark_id}">`;
      combinedHtml += `<h1>${bookmark.title}</h1>`;
      combinedHtml += content || `<p>Error fetching content for this article.</p>`;
      combinedHtml += `</article>`;

      if (i < bookmarks.length - 1) {
        combinedHtml += `<hr style="margin: 40px 0; border: 0; border-top: 1px solid #eee;" />`;
      }
    }

    combinedHtml += `</body></html>`;

    // 1. Send the combined email first
    await sendEmailToKindle(kindleEmail, subject, combinedHtml);

    // 2. Archive the bookmarks ONLY after successful send
    for (const bookmark of bookmarks) {
      try {
        await archiveBookmark(token, secret, bookmark.bookmark_id.toString());
      } catch (err) {
        console.error(`Failed to archive bookmark ${bookmark.bookmark_id} after bulk send:`, err);
      }
    }

    // Revalidate the home page to reflect archived status
    revalidatePath('/');

    return NextResponse.json({ newestDate });
  } catch (error: unknown) {
    console.error('Bulk send error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
