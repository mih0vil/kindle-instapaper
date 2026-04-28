import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchBookmarks, getBookmarkText, InstapaperBookmark, InstapaperItem } from '@/lib/instapaper';
import Link from 'next/link';
import { KindleButton } from '@/components/KindleButton';
import { ArchiveButton } from '@/components/ArchiveButton';

/**
 * Article page component.
 * Displays the full content and metadata of a specific Instapaper bookmark.
 * 
 * @param params - URL parameters containing the bookmark ID
 * @param searchParams - URL search parameters containing navigation context
 */
export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params;
  const sp = await searchParams;
  const from = sp.from === 'archive' ? 'archive' : 'unread';
  
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    redirect('/login');
  }

  let bookmark: InstapaperBookmark | null = null;
  let content: string = '';
  let error: string | null = null;
  let isArchived: boolean = false;

  try {
    // We fetch unread and archive to find the bookmark
    const [unreadData, archiveData] = await Promise.all([
      fetchBookmarks(token, secret, 'unread', 500),
      fetchBookmarks(token, secret, 'archive', 500),
    ]);

    const archiveBookmarks = archiveData.filter((item: InstapaperItem): item is InstapaperBookmark => item.type === 'bookmark');
    
    bookmark = unreadData.filter((item: InstapaperItem): item is InstapaperBookmark => item.type === 'bookmark')
      .find((b) => b.bookmark_id.toString() === id) || null;

    if (!bookmark) {
      bookmark = archiveBookmarks.find((b) => b.bookmark_id.toString() === id) || null;
      if (bookmark) {
        isArchived = true;
      }
    }

    if (!bookmark) {
      error = 'Article not found.';
    } else {
      content = await getBookmarkText(token, secret, id);
    }
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link 
            href={`/?filter=${from}`} 
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors group"
            aria-label="Back to articles"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="group-hover:-translate-x-1 transition-transform"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight truncate">Instapaper to Kindle</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
            <p className="font-medium">Error</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
            <Link href="/" className="inline-block mt-4 text-emerald-500 hover:underline">Return to home</Link>
          </div>
        ) : !bookmark ? (
          <div className="text-center py-20 text-zinc-500">
            <p>Loading article...</p>
          </div>
        ) : (
          <article className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
                {bookmark.title}
              </h2>
              
              <div className="flex flex-wrap items-center gap-4 text-zinc-400 text-sm mb-8">
                <a 
                  href={bookmark.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                >
                  {new URL(bookmark.url).hostname.replace('www.', '')}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                </a>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
                {bookmark.time && (
                  <span>{new Date(bookmark.time * 1000).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                )}
              </div>

              {bookmark.description && (
                <div className="bg-zinc-900/50 border-l-4 border-emerald-500/50 p-6 rounded-r-xl italic text-zinc-300 mb-8 leading-relaxed">
                  {bookmark.description}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <KindleButton bookmarkId={id} title={bookmark.title} />
                <ArchiveButton bookmarkId={id} isArchived={isArchived} />
              </div>
            </header>

            <div 
              className="prose prose-invert prose-emerald max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight
                prose-p:leading-relaxed prose-p:text-zinc-300 prose-p:text-lg
                prose-a:text-emerald-500 prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-2xl prose-img:shadow-2xl
                instapaper-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </article>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .instapaper-content img { max-width: 100%; height: auto; margin: 2rem 0; }
        .instapaper-content p { margin-bottom: 1.5rem; }
        .instapaper-content h1, .instapaper-content h2, .instapaper-content h3 { margin-top: 2.5rem; margin-bottom: 1.25rem; }
      `}} />
    </div>
  );
}
