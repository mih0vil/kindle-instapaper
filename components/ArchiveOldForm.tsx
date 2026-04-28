'use client';

import { useState } from 'react';
import { getOldBookmarks, refreshArticles } from '@/app/actions';

/**
 * Form component for archiving old articles in batch with progress tracking.
 * Displays a date input and a button that opens a progress modal.
 */
export function ArchiveOldForm() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Progress state
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setStatus('loading');
    setMessage('');

    try {
      const result = await getOldBookmarks(date);
      if ('error' in result) {
        setStatus('error');
        setMessage(result.error || 'An unexpected error occurred');
        return;
      }

      const bookmarksToArchive = result.bookmarks || [];
      if (bookmarksToArchive.length === 0) {
        setStatus('success');
        setMessage('No articles found older than the selected date.');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }

      // Start processing
      setTotal(bookmarksToArchive.length);
      setCurrent(0);
      setStatus('processing');

      for (let i = 0; i < bookmarksToArchive.length; i++) {
        const bookmark = bookmarksToArchive[i];
        setCurrentTitle(bookmark.title);

        const response = await fetch('/api/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookmarkId: bookmark.id }),
        });

        if (!response.ok) {
          throw new Error(`Failed to archive: ${bookmark.title}`);
        }

        setCurrent(i + 1);
      }

      await refreshArticles();

      setStatus('success');
      setMessage(`Successfully archived ${bookmarksToArchive.length} articles.`);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (err) {
      console.error('Batch archive failed:', err);
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  const progressPercentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M21 8V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" /><polyline points="1 3 12 13 23 3" /><path d="M12 13v9" /></svg>
          Bulk Archive
        </h3>

        <form onSubmit={handleArchive} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label htmlFor="archive-date" className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Archive articles older than
            </label>
            <input
              type="date"
              id="archive-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={status !== 'idle' && status !== 'success' && status !== 'error'}
            className={`whitespace-nowrap px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${status === 'loading' || status === 'processing'
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
          >
            {status === 'loading' || status === 'processing' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {status === 'loading' ? 'Searching...' : 'Archiving...'}
              </>
            ) : (
              'Archive old articles'
            )}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm font-medium ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 leading-relaxed italic">
            <span className="font-semibold text-zinc-400 not-italic mr-1">Note:</span>
            You should first archive old articles, because application will send bulks of unread articles to Kindle. It makes sense to send only new articles so old articles should be archived.
            The limit is around 500 articles. If you have more unread articles, execute this action several times.
          </p>
        </div>
      </div>

      {/* Progress Modal */}
      {status === 'processing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-white mb-2">Archiving Articles</h2>
            <p className="text-zinc-400 mb-8 text-sm">Please wait while we move your old articles to the archive.</p>

            <div className="space-y-6">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-zinc-300">Progress</span>
                <span className="text-sm font-bold text-emerald-500">{progressPercentage}%</span>
              </div>

              <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase tracking-widest">
                <span>{current} processed</span>
                <span>{total} total</span>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">Currently processing:</p>
                <p className="text-sm text-zinc-300 truncate font-medium">{currentTitle || '...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
