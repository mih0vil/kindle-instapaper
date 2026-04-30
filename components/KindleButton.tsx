'use client';

import { MouseEvent, useState } from 'react';
import { sendToKindle } from '@/app/actions';

/**
 * Button component for sending an article to Kindle.
 * Handles the loading state and feedback.
 * 
 * @param bookmarkId - The ID of the bookmark to send
 * @param title - The title of the article
 */
export function KindleButton({ bookmarkId, title, compact = false }: { bookmarkId: string, title: string, compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e?: MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStatus('loading');
    setError(null);
    
    try {
      const result = await sendToKindle(bookmarkId, title);
      if ('error' in result) {
        setStatus('error');
        setError(result.error || 'Failed to send');
      } else {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Kindle send error:', err);
      setStatus('error');
      setError('An unexpected error occurred');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSend}
        disabled={status === 'loading'}
        className={`flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
          compact ? 'px-4 py-2 rounded-lg text-sm font-medium' : 'px-6 py-3 rounded-xl font-semibold'
        } ${
          status === 'loading'
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : status === 'success'
            ? 'bg-emerald-500 text-white'
            : status === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-white text-black hover:bg-zinc-200'
        }`}
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </>
        ) : status === 'success' ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Sent to Kindle!
          </>
        ) : status === 'error' ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Failed to Send
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width={compact ? "16" : "20"} height={compact ? "16" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {compact ? 'Send' : 'Send to Kindle'}
          </>
        )}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
