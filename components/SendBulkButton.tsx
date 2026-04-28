'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Button component for sending 20 unread articles to Kindle in bulk.
 */
export function SendBulkButton() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSendBulk = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/send-bulk-to-kindle', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send bulk');
      }

      setStatus('success');
      setMessage(`Successfully sent and archived bulk (Newest: ${data.newestDate})`);
      
      // Refresh the page data to remove archived articles
      router.refresh();

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (err) {
      console.error('Bulk send failed:', err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSendBulk}
        disabled={status === 'loading'}
        className={`px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
          status === 'loading'
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-zinc-100 text-zinc-950 hover:bg-white'
        }`}
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending bulk...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Send new articles to Kindle
          </>
        )}
      </button>
      
      {message && (
        <p className={`text-xs font-medium text-center ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
