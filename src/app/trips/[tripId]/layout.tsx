import { Suspense } from 'react'

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <p className="text-slate-500" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
            Loading...
          </p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
