import type { Metadata } from 'next'
import { Fraunces, DM_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Nav } from '@/components/Nav'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '700'],
  variable: '--font-fraunces',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Golf Trip Tracker',
  description: 'Ryder Cup style tournament management for your golf trips',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 transition-colors duration-300">
            {/* Grain overlay - dark mode only */}
            <div
              className="fixed inset-0 opacity-[0.015] pointer-events-none hidden dark:block"
              style={{ backgroundImage: 'url(/grain.svg)' }}
            />
            <Nav />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
