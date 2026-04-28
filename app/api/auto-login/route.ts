import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig, isConfigComplete } from '@/lib/config';
import { exchangeXAuthTokens } from '@/lib/instapaper';

/**
 * Route handler to perform auto-login.
 * This is necessary because cookies can only be set in Route Handlers or Server Actions,
 * not directly in Server Components.
 */
export async function GET() {
  const { complete } = await isConfigComplete();
  
  if (!complete) {
    redirect('/login');
  }

  const config = await getConfig();
  const username = config.INSTAPAPER_USERNAME;
  const password = config.INSTAPAPER_PASSWORD;

  if (!username) {
    redirect('/login');
  }

  try {
    const { token, secret } = await exchangeXAuthTokens(username, password);

    const cookieStore = await cookies();
    cookieStore.set('instapaper_token', token, { httpOnly: true, secure: true });
    cookieStore.set('instapaper_secret', secret, { httpOnly: true, secure: true });

  } catch (error: unknown) {
    console.error('Auto-login error:', error);
    redirect('/login?error=auto_login_failed');
  }

  redirect('/');
}
