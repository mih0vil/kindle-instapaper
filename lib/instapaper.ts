import OAuth from 'oauth-1.0a';
import crypto from 'crypto';


export const instapaperOauth = new OAuth({
  consumer: {
    key: process.env.INSTAPAPER_CONSUMER_KEY || '',
    secret: process.env.INSTAPAPER_CONSUMER_SECRET || '',
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

export const INSTAPAPER_API_URL = 'https://www.instapaper.com/api/1';

export async function fetchBookmarks(token: string, secret: string, folder_id: 'unread' | 'archive', limit: number = 100) {
  const requestData = {
    url: `${INSTAPAPER_API_URL}/bookmarks/list`,
    method: 'POST',
    data: {
      folder_id,
      limit,
    },
  };

  const tokenData = {
    key: token,
    secret: secret,
  };

  const headers = instapaperOauth.toHeader(instapaperOauth.authorize(requestData, tokenData));

  // Convert data to application/x-www-form-urlencoded
  const body = new URLSearchParams();
  body.append('folder_id', folder_id);
  body.append('limit', limit.toString());

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
  }

  return response.json();
}

export async function getBookmarkText(token: string, secret: string, bookmark_id: string) {
  const requestData = {
    url: `${INSTAPAPER_API_URL}/bookmarks/get_text`,
    method: 'POST',
    data: {
      bookmark_id,
    },
  };

  const tokenData = {
    key: token,
    secret: secret,
  };

  const headers = instapaperOauth.toHeader(instapaperOauth.authorize(requestData, tokenData));

  const body = new URLSearchParams();
  body.append('bookmark_id', bookmark_id);

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article text: ${response.statusText}`);
  }

  return response.text();
}
