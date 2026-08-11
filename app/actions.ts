'use server';

import { revalidatePath } from 'next/cache';
import { getBookmarkText, archiveBookmark, unarchiveBookmark, fetchBookmarks, InstapaperBookmark } from '@/lib/instapaper';
import { sendEmailToKindle } from '@/lib/postmark';
import { getConfig } from '@/lib/config';

import { processArticleAndCalculateSize } from '@/lib/article-size';

/**
 * Sends a specific article to Kindle via email.
 * 
 * @param bookmarkId - The ID of the bookmark to send
 * @param title - The title of the article
 * @returns Success or error message
 */
export async function sendToKindle(bookmarkId: string, title: string) {
  try {
    const rawContent = await getBookmarkText(bookmarkId);
    const { sanitizedHtml } = await processArticleAndCalculateSize(rawContent);
    const htmlContent = `<h1>${title}</h1>${sanitizedHtml}`;
    
    const config = getConfig();
    const kindleEmail = config.KINDLE_EMAIL;

    if (!kindleEmail) {
      return { error: 'Kindle email not configured' };
    }

    await sendEmailToKindle(kindleEmail, title, htmlContent);
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to send to Kindle:', error);
    const message = error instanceof Error ? error.message : 'Failed to send to Kindle';
    return { error: message };
  }
}

/**
 * Server action to archive a bookmark.
 * 
 * @param bookmarkId - The ID of the bookmark to archive
 * @returns Success or error message
 */
export async function archiveAction(bookmarkId: string) {
  try {
    await archiveBookmark(bookmarkId);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to archive:', error);
    const message = error instanceof Error ? error.message : 'Failed to archive';
    return { error: message };
  }
}

/**
 * Revalidates the home page articles list.
 */
export async function refreshArticles() {
  revalidatePath('/');
}

/**
 * Server action to unarchive a bookmark.
 * 
 * @param bookmarkId - The ID of the bookmark to unarchive
 * @returns Success or error message
 */
export async function unarchiveAction(bookmarkId: string) {
  try {
    await unarchiveBookmark(bookmarkId);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to unarchive:', error);
    const message = error instanceof Error ? error.message : 'Failed to unarchive';
    return { error: message };
  }
}

/**
 * Server action to archive articles older than a specific date.
 * 
 * @param date - The date to compare against
 * @returns Success or error message
 */
export async function archiveOldArticles(date: string) {
  try {
    const thresholdDate = new Date(date);
    const thresholdTimestamp = Math.floor(thresholdDate.getTime() / 1000);

    // Fetch up to 500 unread bookmarks (Instapaper limit per request)
    const items = await fetchBookmarks('unread', 500);
    const bookmarks = items.filter((item): item is InstapaperBookmark => item.type === 'bookmark');

    const oldBookmarks = bookmarks.filter(b => b.time < thresholdTimestamp);

    if (oldBookmarks.length === 0) {
      return { success: true, count: 0 };
    }

    // Archive them one by one
    for (const b of oldBookmarks) {
      await archiveBookmark(b.bookmark_id.toString());
    }

    revalidatePath('/');
    return { success: true, count: oldBookmarks.length };
  } catch (error: unknown) {
    console.error('Failed to archive old articles:', error);
    const message = error instanceof Error ? error.message : 'Failed to archive old articles';
    return { error: message };
  }
}

/**
 * Fetches unread bookmarks older than a specific date.
 * Useful for batch processing on the client side with progress tracking.
 * 
 * @param date - The date to compare against
 * @returns List of bookmark IDs and titles
 */
export async function getOldBookmarks(date: string) {
  try {
    const thresholdDate = new Date(date);
    const thresholdTimestamp = Math.floor(thresholdDate.getTime() / 1000);

    const items = await fetchBookmarks('unread', 500);
    const bookmarks = items.filter((item): item is InstapaperBookmark => item.type === 'bookmark');

    const oldBookmarks = bookmarks
      .filter(b => b.time < thresholdTimestamp)
      .map(b => ({ id: b.bookmark_id.toString(), title: b.title }));

    return { bookmarks: oldBookmarks };
  } catch (error: unknown) {
    console.error('Failed to fetch old articles:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch old articles';
    return { error: message };
  }
}
