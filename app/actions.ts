'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { instapaperOauth, INSTAPAPER_API_URL, getBookmarkText, archiveBookmark, unarchiveBookmark, fetchBookmarks, InstapaperBookmark } from '@/lib/instapaper';
import { sendEmailToKindle } from '@/lib/postmark';

/**
 * Logs in a user by exchanging credentials for an OAuth token.
 * 
 * @param formData - Form data containing username and password
 * @returns Error object if authentication fails, otherwise redirects to home
 */
export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username) {
    return { error: 'Username is required' };
  }

  const requestData = {
    url: `${INSTAPAPER_API_URL}/oauth/access_token`,
    method: 'POST',
    data: {
      x_auth_username: username,
      x_auth_password: password || '',
      x_auth_mode: 'client_auth',
    },
  };

  const headers = instapaperOauth.toHeader(instapaperOauth.authorize(requestData));

  const body = new URLSearchParams();
  body.append('x_auth_username', username);
  if (password) body.append('x_auth_password', password);
  body.append('x_auth_mode', 'client_auth');

  try {
    const response = await fetch(requestData.url, {
      method: requestData.method,
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      console.error(response);
      return { error: `Authentication failed: ${response.statusText}` };
    }

    const text = await response.text();
    // response is qline format: oauth_token=...&oauth_token_secret=...
    const params = new URLSearchParams(text);
    const token = params.get('oauth_token');
    const secret = params.get('oauth_token_secret');

    if (!token || !secret) {
      return { error: 'Invalid response from Instapaper' };
    }

    // Await the cookies object before using it
    const cookieStore = await cookies();
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
 * 
 * @returns Redirects to login page
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('instapaper_token');
  cookieStore.delete('instapaper_secret');
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
    const htmlContent = await getBookmarkText(token, secret, bookmarkId);
    const kindleEmail = process.env.KINDLE_EMAIL;

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
    // Note: In a production app with many articles, we might want to handle rate limits or use a queue
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
