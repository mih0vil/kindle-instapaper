import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchBookmarks, InstapaperBookmark, InstapaperUser, InstapaperItem } from '@/lib/instapaper';
import { logout } from '@/app/actions';
import Link from 'next/link';

/**
 * Home page component.
 * Displays a list of unread or archived bookmarks from Instapaper.
 * 
 * @param searchParams - URL search parameters (filter)
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('instapaper_token')?.value;
  const secret = cookieStore.get('instapaper_secret')?.value;

  if (!token || !secret) {
    redirect('/login');
  }

  // Await searchParams before using it
  const sp = await searchParams;
  const filter = sp.filter === 'archive' ? 'archive' : 'unread';

  let bookmarks: InstapaperBookmark[] = [];
  let user: InstapaperUser | null = null;
  let error: string | null = null;

  try {
    const data: InstapaperItem[] = await fetchBookmarks(token, secret, filter, 100);
    // Data is an array of objects mixed with type="user" and type="bookmark"
    user = data.find((item): item is InstapaperUser => item.type === 'user') || null;
    bookmarks = data.filter((item): item is InstapaperBookmark => item.type === 'bookmark');
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold tracking-tight">Instapaper to Kindle</h1>
        <div className="flex items-center gap-6">
          <span className="text-zinc-400 text-sm hidden sm:inline-block">
            {user ? user.username : 'Logged in'}
          </span>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <h2 className="text-3xl font-bold tracking-tight">Your Articles</h2>
          
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <a
              href="?filter=unread"
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                filter === 'unread' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Unread
            </a>
            <a
              href="?filter=archive"
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                filter === 'archive' 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Archive
            </a>
          </div>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
            <p className="font-medium">Failed to load articles.</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400">
            <p>No {filter} articles found.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookmarks.map((bookmark) => (
              <Link
                key={bookmark.bookmark_id}
                href={`/article/${bookmark.bookmark_id}`}
                className="group block bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors line-clamp-2 mb-2">
                  {bookmark.title || 'Untitled Article'}
                </h3>
                
                {bookmark.description && (
                  <p className="text-zinc-400 text-sm line-clamp-3 mb-4 leading-relaxed">
                    {bookmark.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <span className="truncate max-w-[200px]">
                    {new URL(bookmark.url).hostname.replace('www.', '')}
                  </span>
                  {bookmark.time && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                      <span>{new Date(bookmark.time * 1000).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
