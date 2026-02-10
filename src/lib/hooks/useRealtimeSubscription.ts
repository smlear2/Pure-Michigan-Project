'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeSubscriptionOptions {
  table: string
  filter?: string
  onUpdate: () => void
  enabled?: boolean
}

/**
 * Subscribe to Supabase Realtime postgres_changes.
 * Uses "signal to refresh" pattern — calls onUpdate() on any change,
 * letting the consumer re-fetch full data from the API.
 */
export function useRealtimeSubscription({
  table,
  filter,
  onUpdate,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const stableOnUpdate = useCallback(() => {
    onUpdateRef.current()
  }, [])

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `${table}-${Math.random().toString(36).slice(2, 8)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        () => {
          stableOnUpdate()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [table, filter, enabled, stableOnUpdate])
}
