'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a password reset link.')
      }
      setLoading(false)
      return
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setMessage('Check your email for a confirmation link.')
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="text-5xl mb-4">⛳</div>
          <h1
            className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-white mb-2"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Golf Trip Tracker
          </h1>
          <p
            className="text-emerald-600 dark:text-emerald-400 text-sm tracking-wider uppercase"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            {mode === 'forgot' ? 'Reset your password' : mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            {message && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {message}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              {loading
                ? 'Loading...'
                : mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setMessage('') }}
                className="block w-full text-sm text-slate-500 dark:text-slate-400 hover:underline"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError('')
                setMessage('')
              }}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {mode === 'forgot'
                ? 'Back to sign in'
                : mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
