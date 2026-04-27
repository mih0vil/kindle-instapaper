import { login } from '@/app/actions';

import { cookies } from 'next/headers';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const savedUsername = cookieStore.get('instapaper_username')?.value || '';
  const savedPassword = cookieStore.get('instapaper_password')?.value || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Instapaper to Kindle</h1>
        <p className="text-zinc-400 mb-8">Enter your credentials to access your articles.</p>
        
        <form action={login} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2" htmlFor="username">
              Email or Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
              placeholder="you@example.com"
              defaultValue={savedUsername}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2" htmlFor="password">
              Password <span className="text-zinc-600 text-xs">(if you have one)</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              defaultValue={savedPassword}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-zinc-200 transition-colors mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
