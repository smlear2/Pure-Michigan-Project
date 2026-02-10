'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PaymentScheduleTable from '@/components/finance/PaymentScheduleTable'
import ExpenseList from '@/components/finance/ExpenseList'
import ExpenseForm from '@/components/finance/ExpenseForm'
import GamblingLedger from '@/components/finance/GamblingLedger'
import SettlementView from '@/components/finance/SettlementView'

type Tab = 'payments' | 'expenses' | 'ledger' | 'settlement'

export default function FinancesPage() {
  const params = useParams()
  const { tripId } = params as { tripId: string }

  const [activeTab, setActiveTab] = useState<Tab>('payments')
  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState<any>(null)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [currentTripPlayerId, setCurrentTripPlayerId] = useState<string | null>(null)
  const [players, setPlayers] = useState<any[]>([])

  // Tab data
  const [paymentItems, setPaymentItems] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [ledgerPlayers, setLedgerPlayers] = useState<any[]>([])
  const [settlementData, setSettlementData] = useState<any>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const monoFont = { fontFamily: 'var(--font-dm-mono), monospace' }

  // Load trip + determine organizer
  useEffect(() => {
    async function loadTrip() {
      try {
        const supabase = createClient()
        const [tripRes, { data: authData }] = await Promise.all([
          fetch(`/api/trips/${tripId}`),
          supabase.auth.getUser(),
        ])

        if (tripRes.ok) {
          const json = await tripRes.json()
          setTrip(json.data)

          const tripData = json.data
          const userEmail = authData?.user?.email
          if (userEmail && tripData.tripPlayers) {
            const myTp = tripData.tripPlayers.find(
              (tp: any) => tp.user.email === userEmail
            )
            if (myTp) {
              setCurrentTripPlayerId(myTp.id)
              setIsOrganizer(myTp.role === 'ORGANIZER')
            }
            setPlayers(
              tripData.tripPlayers
                .filter((tp: any) => tp.isActive !== false)
                .map((tp: any) => ({
                  id: tp.id,
                  user: tp.user,
                  team: tp.team || null,
                }))
            )
          }
        }
      } catch (err) {
        console.error('Failed to load trip:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTrip()
  }, [tripId])

  // Load tab data when tab changes
  useEffect(() => {
    if (loading) return
    loadTabData(activeTab)
  }, [activeTab, loading, tripId])

  const loadTabData = async (tab: Tab) => {
    try {
      switch (tab) {
        case 'payments': {
          const res = await fetch(`/api/trips/${tripId}/payments`)
          if (res.ok) {
            const json = await res.json()
            setPaymentItems(json.data)
          }
          break
        }
        case 'expenses': {
          const res = await fetch(`/api/trips/${tripId}/expenses`)
          if (res.ok) {
            const json = await res.json()
            setExpenses(json.data)
          }
          break
        }
        case 'ledger': {
          const res = await fetch(`/api/trips/${tripId}/ledger`)
          if (res.ok) {
            const json = await res.json()
            setLedgerPlayers(json.data.players)
          }
          break
        }
        case 'settlement': {
          const res = await fetch(`/api/trips/${tripId}/settlement`)
          if (res.ok) {
            const json = await res.json()
            setSettlementData(json.data)
          }
          break
        }
      }
    } catch (err) {
      console.error(`Failed to load ${tab} data:`, err)
    }
  }

  const refreshTab = () => loadTabData(activeTab)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'payments', label: 'Payments' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'settlement', label: 'Settlement' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400" style={monoFont}>Loading finances...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <Link
            href={`/trips/${tripId}`}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            style={monoFont}
          >
            &larr; Back to Dashboard
          </Link>
          <h1
            className="text-2xl font-bold text-white mt-2"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Finances
          </h1>
          {trip && (
            <p className="text-sm text-slate-500" style={monoFont}>{trip.name}</p>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 bg-slate-900/60 backdrop-blur rounded-lg border border-slate-800 p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={monoFont}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'payments' && (
          <PaymentScheduleTable
            items={paymentItems}
            tripId={tripId}
            isOrganizer={isOrganizer}
            onRefresh={refreshTab}
          />
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-3">
            {(isOrganizer || trip?.expensePermission === 'ALL_PLAYERS') && (
              <>
                {showExpenseForm ? (
                  <ExpenseForm
                    tripId={tripId}
                    players={players}
                    onSuccess={() => { setShowExpenseForm(false); refreshTab() }}
                    onCancel={() => setShowExpenseForm(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowExpenseForm(true)}
                    className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-800 transition-colors text-sm"
                    style={monoFont}
                  >
                    + Add Expense
                  </button>
                )}
              </>
            )}
            <ExpenseList
              expenses={expenses}
              tripId={tripId}
              currentTripPlayerId={currentTripPlayerId}
              isOrganizer={isOrganizer}
              onRefresh={refreshTab}
            />
          </div>
        )}

        {activeTab === 'ledger' && (
          <GamblingLedger players={ledgerPlayers} />
        )}

        {activeTab === 'settlement' && settlementData && (
          <SettlementView
            players={settlementData.players}
            simplifiedDebts={settlementData.simplifiedDebts}
          />
        )}
      </div>
    </div>
  )
}
