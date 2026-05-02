import { cookies } from 'next/headers';

export interface AppConfig {
  INSTAPAPER_CONSUMER_KEY: string;
  INSTAPAPER_CONSUMER_SECRET: string;
  INSTAPAPER_USERNAME?: string;
  INSTAPAPER_PASSWORD?: string;
  POSTMARK_SERVER_TOKEN: string;
  POSTMARK_FROM_EMAIL: string;
  KINDLE_EMAIL: string;
  BULK_SEND_LIMIT: number;
  FETCH_PARALLEL_LIMIT: number;
}

/**
 * Retrieves the application configuration.
 * Merges values from .env file and secure cookies.
 * Priority: .env > Cookies.
 * 
 * @returns The merged application configuration
 */
export async function getConfig(): Promise<AppConfig> {
  const cookieStore = await cookies();
  
  // Helper to get value from env or cookie
  const getValue = (key: string, defaultValue: string = ''): string => {
    return process.env[key] || cookieStore.get(key.toLowerCase())?.value || defaultValue;
  };

  return {
    INSTAPAPER_CONSUMER_KEY: getValue('INSTAPAPER_CONSUMER_KEY'),
    INSTAPAPER_CONSUMER_SECRET: getValue('INSTAPAPER_CONSUMER_SECRET'),
    INSTAPAPER_USERNAME: getValue('INSTAPAPER_USERNAME') || undefined,
    INSTAPAPER_PASSWORD: getValue('INSTAPAPER_PASSWORD') || undefined,
    POSTMARK_SERVER_TOKEN: getValue('POSTMARK_SERVER_TOKEN'),
    POSTMARK_FROM_EMAIL: getValue('POSTMARK_FROM_EMAIL'),
    KINDLE_EMAIL: getValue('KINDLE_EMAIL'),
    BULK_SEND_LIMIT: parseInt(getValue('BULK_SEND_LIMIT', '20'), 10),
    FETCH_PARALLEL_LIMIT: parseInt(getValue('FETCH_PARALLEL_LIMIT', '5'), 10),
  };
}

/**
 * Checks if all required fields are present in the configuration.
 * Returns both the completion status and the list of missing fields.
 */
export async function isConfigComplete(): Promise<{ complete: boolean; missingFields: string[] }> {
  const fields = [
    'INSTAPAPER_CONSUMER_KEY',
    'INSTAPAPER_CONSUMER_SECRET',
    'INSTAPAPER_USERNAME',
    'INSTAPAPER_PASSWORD',
    'POSTMARK_SERVER_TOKEN',
    'POSTMARK_FROM_EMAIL',
    'KINDLE_EMAIL'
  ];

  const missingFields = fields.filter(field => !process.env[field]);
  
  return {
    complete: missingFields.length === 0,
    missingFields
  };
}
