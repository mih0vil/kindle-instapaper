'use client';

import { useState } from 'react';
import { login } from '@/app/actions';

interface LoginFormProps {
  initialValues: {
    INSTAPAPER_CONSUMER_KEY?: string;
    INSTAPAPER_CONSUMER_SECRET?: string;
    INSTAPAPER_USERNAME?: string;
    INSTAPAPER_PASSWORD?: string;
    POSTMARK_SERVER_TOKEN?: string;
    POSTMARK_FROM_EMAIL?: string;
    KINDLE_EMAIL?: string;
    BULK_SEND_LIMIT?: string;
  };
  missingFields: string[];
}

/**
 * Premium login form that allows manual entry of missing configuration fields.
 */
export function LoginForm({ initialValues, missingFields }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    
    const result = await login(formData);
    
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  }

  const fields = [
    { id: 'INSTAPAPER_CONSUMER_KEY', label: 'Instapaper Consumer Key', type: 'text', sensitive: true },
    { id: 'INSTAPAPER_CONSUMER_SECRET', label: 'Instapaper Consumer Secret', type: 'text', sensitive: true },
    { id: 'INSTAPAPER_USERNAME', label: 'Instapaper Username', type: 'text', sensitive: false },
    { id: 'INSTAPAPER_PASSWORD', label: 'Instapaper Password', type: 'password', sensitive: true },
    { id: 'POSTMARK_SERVER_TOKEN', label: 'Postmark Server Token', type: 'text', sensitive: true },
    { id: 'POSTMARK_FROM_EMAIL', label: 'Postmark From Email', type: 'email', sensitive: false },
    { id: 'KINDLE_EMAIL', label: 'Kindle Email', type: 'email', sensitive: false },
    { id: 'BULK_SEND_LIMIT', label: 'Bulk Send Limit', type: 'number', sensitive: false },
  ];

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-all duration-500">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
          Instapaper to Kindle
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Configure your connection settings
        </p>
      </div>

      <form action={handleSubmit} className="space-y-5">
        {fields.map((field) => {
          const isMissing = missingFields.includes(field.id);
          const initialValue = (initialValues as Record<string, string | undefined>)[field.id] || '';
          
          return (
            <div key={field.id} className="group transition-all duration-300">
              <label 
                htmlFor={field.id} 
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600"
              >
                {field.label}
                {!isMissing && <span className="ml-2 text-[10px] uppercase tracking-wider text-green-500 font-bold opacity-80">(From .env)</span>}
              </label>
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                defaultValue={initialValue}
                disabled={!isMissing}
                placeholder={isMissing ? `Enter your ${field.label.toLowerCase()}` : '••••••••'}
                required={isMissing}
                className={`w-full px-5 py-3 rounded-2xl border transition-all duration-300 outline-none
                  ${isMissing 
                    ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' 
                    : 'bg-gray-100 dark:bg-gray-800/50 border-transparent text-gray-400 cursor-not-allowed'
                  }
                  placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium
                `}
              />
            </div>
          );
        })}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl animate-shake">
            <p className="text-sm text-red-600 dark:text-red-400 font-semibold text-center">
              {error}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 mt-4"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
          ) : (
            'Save & Login'
          )}
        </button>
      </form>
      
      <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
        Configuration is stored in secure cookies for this session only.
      </p>
    </div>
  );
}
