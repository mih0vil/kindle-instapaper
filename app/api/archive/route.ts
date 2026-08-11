import { NextResponse } from 'next/server';
import { archiveBookmark } from '@/lib/instapaper';

/**
 * API route to archive a bookmark silently.
 * Unlike server actions, this does not trigger an automatic UI re-render.
 */
export async function POST(request: Request) {
  try {
    const { bookmarkId } = await request.json();
    await archiveBookmark(bookmarkId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('API Archive error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
