'use client';

import { useState } from 'react';
import { archiveAction, unarchiveAction } from '@/app/actions';

/**
 * Button component for archiving or unarchiving an article.
 * 
 * @param bookmarkId - The ID of the bookmark
 * @param isArchived - Current status of the bookmark
 */
export function ArchiveButton({ 
  bookmarkId, 
  isArchived 
}: { 
  bookmarkId: string, 
  isArchived: boolean 
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      if (isArchived) {
        await unarchiveAction(bookmarkId);
      } else {
        await archiveAction(bookmarkId);
      }
    } catch (err) {
      console.error('Archive action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        loading 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-zinc-800 active:scale-95'
      } ${
        isArchived ? 'text-zinc-400 hover:text-white' : 'text-emerald-500 hover:text-emerald-400'
      }`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : isArchived ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Unarchive
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><polyline points="1 3 12 13 23 3"/><path d="M12 13v9"/></svg>
          Archive
        </>
      )}
    </button>
  );
}
