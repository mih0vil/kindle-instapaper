import { isConfigComplete } from '@/lib/config';
import { LoginForm } from '@/components/LoginForm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Login page for Instapaper to Kindle.
 * Calculates missing configuration fields and renders the dynamic login form.
 */
export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;

  // If already logged in, redirect to home
  if (token) {
    redirect('/');
  }

  // Check if config is complete
  const { missingFields } = await isConfigComplete();
  
  // Prepare initial values from .env for the form
  const initialValues: Record<string, string> = {
    INSTAPAPER_CONSUMER_KEY: process.env.INSTAPAPER_CONSUMER_KEY || '',
    INSTAPAPER_CONSUMER_SECRET: process.env.INSTAPAPER_CONSUMER_SECRET || '',
    INSTAPAPER_USERNAME: process.env.INSTAPAPER_USERNAME || '',
    INSTAPAPER_PASSWORD: process.env.INSTAPAPER_PASSWORD || '',
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN || '',
    POSTMARK_FROM_EMAIL: process.env.POSTMARK_FROM_EMAIL || '',
    KINDLE_EMAIL: process.env.KINDLE_EMAIL || '',
    BULK_SEND_LIMIT: process.env.BULK_SEND_LIMIT || '20',
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent dark:from-blue-900/10 pointer-events-none" />
      <LoginForm initialValues={initialValues} missingFields={missingFields} />
    </main>
  );
}
