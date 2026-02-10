import { Suspense } from 'react'

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
            Loading...
          </p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
