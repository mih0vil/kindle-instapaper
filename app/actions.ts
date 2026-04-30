'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getBookmarkText, archiveBookmark, unarchiveBookmark, fetchBookmarks, InstapaperBookmark, exchangeXAuthTokens } from '@/lib/instapaper';
import { sendEmailToKindle } from '@/lib/postmark';
import { getConfig } from '@/lib/config';

/**
 * Logs in a user by exchanging credentials for an OAuth token.
 * Stores manually entered configuration fields in secure cookies.
 * 
 * @param formData - Form data containing credentials and config
 * @returns Error object if authentication fails, otherwise redirects to home
 */
export async function login(formData: FormData) {
  const config = await getConfig();
  const cookieStore = await cookies();

  // Extract all fields from form
  const fields = [
    'INSTAPAPER_CONSUMER_KEY',
    'INSTAPAPER_CONSUMER_SECRET',
    'INSTAPAPER_USERNAME',
    'INSTAPAPER_PASSWORD',
    'POSTMARK_SERVER_TOKEN',
    'POSTMARK_FROM_EMAIL',
    'KINDLE_EMAIL',
    'BULK_SEND_LIMIT'
  ];

  const manualValues: Record<string, string> = {};
  
  for (const field of fields) {
    const value = formData.get(field) as string;
    // Only store in cookie if it was entered manually (not provided by .env)
    if (value && !process.env[field]) {
      manualValues[field] = value;
      cookieStore.set(field.toLowerCase(), value, { httpOnly: true, secure: true });
    }
  }

  // Use merged values for the actual login
  const username = (formData.get('INSTAPAPER_USERNAME') as string) || config.INSTAPAPER_USERNAME;
  const password = (formData.get('INSTAPAPER_PASSWORD') as string) || config.INSTAPAPER_PASSWORD;

  if (!username) {
    return { error: 'Username is required' };
  }

  try {
    const { token, secret } = await exchangeXAuthTokens(username, password);

    cookieStore.set('instapaper_token', token, { httpOnly: true, secure: true });
    cookieStore.set('instapaper_secret', secret, { httpOnly: true, secure: true });

  } catch (error: unknown) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred' };
  }

  redirect('/');
}

/**
 * Logs out the user by deleting session cookies.
 * Also deletes manual config cookies to allow a fresh setup.
 * 
 * @returns Redirects to login page
 */
export async function logout() {
  const cookieStore = await cookies();
  
  const cookiesToDelete = [
    'instapaper_token',
    'instapaper_secret',
    'instapaper_consumer_key',
    'instapaper_consumer_secret',
    'instapaper_username',
    'instapaper_password',
    'postmark_server_token',
    'postmark_from_email',
    'kindle_email',
    'bulk_send_limit'
  ];

  for (const c of cookiesToDelete) {
    cookieStore.delete(c);
  }

  redirect('/login');
}

/**
 * Sends a specific article to Kindle via email.
 * 
 * @param bookmarkId - The ID of the bookmark to send
 * @param title - The title of the article
 * @returns Success or error message
 */
export async function sendToKindle(bookmarkId: string, title: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    return { error: 'Not authenticated' };
  }

  try {
    const rawContent = await getBookmarkText(token, secret, bookmarkId);
    const htmlContent = `<h1>${title}</h1>${rawContent}`;
    const config = await getConfig();
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
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    return { error: 'Not authenticated' };
  }

  try {
    await archiveBookmark(token, secret, bookmarkId);
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
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    return { error: 'Not authenticated' };
  }

  try {
    await unarchiveBookmark(token, secret, bookmarkId);
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
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    return { error: 'Not authenticated' };
  }

  try {
    const thresholdDate = new Date(date);
    const thresholdTimestamp = Math.floor(thresholdDate.getTime() / 1000);

    // Fetch up to 500 unread bookmarks (Instapaper limit per request)
    const items = await fetchBookmarks(token, secret, 'unread', 500);
    const bookmarks = items.filter((item): item is InstapaperBookmark => item.type === 'bookmark');

    const oldBookmarks = bookmarks.filter(b => b.time < thresholdTimestamp);

    if (oldBookmarks.length === 0) {
      return { success: true, count: 0 };
    }

    // Archive them one by one
    for (const b of oldBookmarks) {
      await archiveBookmark(token, secret, b.bookmark_id.toString());
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
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    return { error: 'Not authenticated' };
  }

  try {
    const thresholdDate = new Date(date);
    const thresholdTimestamp = Math.floor(thresholdDate.getTime() / 1000);

    const items = await fetchBookmarks(token, secret, 'unread', 500);
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
