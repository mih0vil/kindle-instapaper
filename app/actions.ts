'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { instapaperOauth, INSTAPAPER_API_URL, getBookmarkText } from '@/lib/instapaper';
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
