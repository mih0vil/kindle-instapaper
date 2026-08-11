import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { getConfig } from './config';

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
 * In-memory cache for OAuth tokens.
 */
let cachedTokens: { token: string; secret: string } | null = null;

/**
 * Clears the cached tokens from memory.
 */
export function clearAuthTokens() {
  cachedTokens = null;
}

/**
 * Retrieves OAuth tokens, using in-memory cache or exchanging credentials if necessary.
 * 
 * @returns Object containing OAuth token and secret
 */
export async function getAuthTokens(): Promise<{ token: string; secret: string }> {
  // 1. Check in-memory cache
  if (cachedTokens) return cachedTokens;

  const config = getConfig();
  
  // 2. Use .env overrides if available
  if (config.INSTAPAPER_TOKEN && config.INSTAPAPER_SECRET) {
    cachedTokens = { token: config.INSTAPAPER_TOKEN, secret: config.INSTAPAPER_SECRET };
    return cachedTokens;
  }

  // 3. Otherwise, exchange username/password
  if (!config.INSTAPAPER_USERNAME || !config.INSTAPAPER_PASSWORD) {
    throw new Error('Instapaper credentials or tokens not configured in .env');
  }

  console.log('Exchanging credentials for fresh Instapaper tokens...');
  const tokens = await exchangeXAuthTokens(config.INSTAPAPER_USERNAME, config.INSTAPAPER_PASSWORD);
  
  // Save to memory
  cachedTokens = tokens;

  return tokens;
}

/**
 * Creates an OAuth client for Instapaper API using dynamic configuration.
 */
export function getOauthClient() {
  const config = getConfig();
  return new OAuth({
    consumer: {
      key: config.INSTAPAPER_CONSUMER_KEY || '',
      secret: config.INSTAPAPER_CONSUMER_SECRET || '',
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
}

/**
 * Base URL for the Instapaper API v1.
 */
export const INSTAPAPER_API_URL = 'https://www.instapaper.com/api/1';

/**
 * Helper to perform an authenticated fetch with automatic retry on 401.
 */
async function authenticatedFetch(
  endpoint: string, 
  data: Record<string, string | number>, 
  isRetry = false
): Promise<Response> {
  const { token, secret } = await getAuthTokens();
  
  const url = `${INSTAPAPER_API_URL}${endpoint}`;
  const requestData = {
    url,
    method: 'POST',
    data,
  };

  const oauth = getOauthClient();
  const headers = oauth.toHeader(oauth.authorize(requestData, { key: token, secret }));

  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => body.append(key, value.toString()));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  // Handle 401 Unauthorized by clearing cache and retrying once
  if (response.status === 401 && !isRetry) {
    console.warn('Instapaper tokens invalid (401). Clearing cache and retrying...');
    clearAuthTokens();
    return authenticatedFetch(endpoint, data, true);
  }

  return response;
}

/**
 * Fetches bookmarks from a specific folder.
 */
export async function fetchBookmarks(folder_id: 'unread' | 'archive', limit: number = 100): Promise<InstapaperItem[]> {
  const response = await authenticatedFetch('/bookmarks/list', { folder_id, limit });

  if (!response.ok) {
    throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches the processed text content of a bookmark.
 */
export async function getBookmarkText(bookmark_id: string) {
  const response = await authenticatedFetch('/bookmarks/get_text', { bookmark_id });

  if (!response.ok) {
    throw new Error(`Failed to fetch article text: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Archives a bookmark.
 */
export async function archiveBookmark(bookmark_id: string) {
  const response = await authenticatedFetch('/bookmarks/archive', { bookmark_id });

  if (!response.ok) {
    throw new Error(`Failed to archive bookmark: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Unarchives a bookmark (moves it back to unread).
 */
export async function unarchiveBookmark(bookmark_id: string) {
  const response = await authenticatedFetch('/bookmarks/unarchive', { bookmark_id });

  if (!response.ok) {
    throw new Error(`Failed to unarchive bookmark: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Exchanges Instapaper username and password for OAuth tokens using xAuth.
 */
export async function exchangeXAuthTokens(username: string, password?: string) {
  const requestData = {
    url: `${INSTAPAPER_API_URL}/oauth/access_token`,
    method: 'POST',
    data: {
      x_auth_username: username,
      x_auth_password: password || '',
      x_auth_mode: 'client_auth',
    },
  };

  const oauth = getOauthClient();
  const headers = oauth.toHeader(oauth.authorize(requestData));

  const body = new URLSearchParams();
  body.append('x_auth_username', username);
  if (password) body.append('x_auth_password', password);
  body.append('x_auth_mode', 'client_auth');

  const response = await fetch(requestData.url, {
    method: requestData.method,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const text = await response.text();
  const params = new URLSearchParams(text);
  const token = params.get('oauth_token');
  const secret = params.get('oauth_token_secret');

  if (!token || !secret) {
    throw new Error('Invalid response from Instapaper');
  }

  return { token, secret };
}
