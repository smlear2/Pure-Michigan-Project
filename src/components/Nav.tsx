'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function Nav() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200/10 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand */}
        <Link
          href="/"
          className="text-lg font-light tracking-tight text-slate-900 dark:text-white"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Pure Michigan Open
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          )}

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-3">
              <span
                className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {user.user_metadata?.name || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
