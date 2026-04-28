import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

/**
 * Represents a bookmark from Instapaper.
 */
export interface InstapaperBookmark {
  type: 'bookmark';
  bookmark_id: number;
  url: string;
  title: string;
  description: string;
  time: number;
  progress: number;
  progress_timestamp: number;
  private_source: string;
  hash: string;
}

/**
 * Represents user data returned by Instapaper API.
 */
export interface InstapaperUser {
  type: 'user';
  user_id: number;
  username: string;
  subscription_is_active: string;
}

/**
 * Union type for items returned by the Instapaper bookmarks list endpoint.
 */
export type InstapaperItem = InstapaperBookmark | InstapaperUser;


/**
 * OAuth client for Instapaper API.
 */
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

/**
 * Base URL for the Instapaper API v1.
 */
export const INSTAPAPER_API_URL = 'https://www.instapaper.com/api/1';

/**
 * Fetches bookmarks from a specific folder.
 * 
 * @param token - User's OAuth token
 * @param secret - User's OAuth secret
 * @param folder_id - The folder to fetch bookmarks from ('unread', 'archive', etc.)
 * @param limit - Maximum number of bookmarks to fetch (max 500)
 * @returns Promise with bookmark data
 */
export async function fetchBookmarks(token: string, secret: string, folder_id: 'unread' | 'archive', limit: number = 100): Promise<InstapaperItem[]> {
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

/**
 * Fetches the processed text content of a bookmark.
 * 
 * @param token - User's OAuth token
 * @param secret - User's OAuth secret
 * @param bookmark_id - The ID of the bookmark to fetch text for
 * @returns Promise with article HTML content
 */
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

/**
 * Archives a bookmark.
 * 
 * @param token - User's OAuth token
 * @param secret - User's OAuth secret
 * @param bookmark_id - The ID of the bookmark to archive
 * @returns Promise with the archived bookmark data
 */
export async function archiveBookmark(token: string, secret: string, bookmark_id: string) {
  const requestData = {
    url: `${INSTAPAPER_API_URL}/bookmarks/archive`,
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
  });

  if (!response.ok) {
    throw new Error(`Failed to archive bookmark: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Unarchives a bookmark (moves it back to unread).
 * 
 * @param token - User's OAuth token
 * @param secret - User's OAuth secret
 * @param bookmark_id - The ID of the bookmark to unarchive
 * @returns Promise with the unarchived bookmark data
 */
export async function unarchiveBookmark(token: string, secret: string, bookmark_id: string) {
  const requestData = {
    url: `${INSTAPAPER_API_URL}/bookmarks/unarchive`,
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
  });

  if (!response.ok) {
    throw new Error(`Failed to unarchive bookmark: ${response.statusText}`);
  }

  return response.json();
}
