# tasks/todo.md — Pure Michigan Open / Golf SaaS Platform

---

## Sprint 1: Foundation ✅ COMPLETE

- [x] Set up Supabase project and connect Prisma
- [x] Update Prisma schema (global players, auth, wagering)
- [x] Set up Supabase Auth (login page, middleware, callback)
- [x] Seed database with 2025 Michigan Open data (16 players, 6 courses, 6 rounds, 28 matches)
- [x] Build nav bar and auth-aware landing page (Meter-inspired)

---

## Sprint 2: Setup Flow ✅ COMPLETE

Convert localStorage-based setup wizard to database-backed API routes.

- [x] Auth helpers (`getCurrentUser`, `requireOrganizer`)
- [x] Trip CRUD API (POST creates trip + ORGANIZER TripPlayer)
- [x] Teams API (batch upsert, defending champion)
- [x] Players API (placeholder users with `pending-<uuid>`, auth callback merge)
- [x] Courses API (TripCourse junction — link/unlink, not delete global)
- [x] Rounds API (CRUD with tee/course relations)
- [x] Rewrite all 6 setup pages (trip, teams, players, courses, rounds, hub)
- [x] Suspense layout for `useSearchParams()` across setup pages
- [x] Sync MatchFormat type with Prisma enum (added MODIFIED_ALT_SHOT, SHAMBLE)
- [x] Add `Trip.defaultMaxScore` (Int?, e.g. 3 = triple bogey cap)
- [x] Add `Round.maxScore` (Int?, overrides trip default)
- [x] Add `TripPlayer.canVerifyScores` (Boolean, default false)
- [x] Add `Trip.defendingChampionTeamId` to schema

### Architecture Decisions
- **tripId threading**: Query params (`?tripId=xxx`) on all setup pages
- **Placeholder users**: `supabaseId: 'pending-<uuid>'` for players added by organizer before they sign up. Auth callback merges on email match.
- **Batch upsert for teams**: PUT replaces all teams atomically (creates, updates, deletes with player-safety check)
- **Courses**: Global course + TripCourse junction. Remove unlinks, doesn't delete.

---

## Sprint 3: Scoring Engine ⬜ NOT STARTED

- [ ] Scorecard component (format-agnostic, data-driven)
- [ ] Live scoring page (mobile-first entry)
- [ ] Max stroke cap: scoring engine caps gross at par + maxScore
- [ ] Handicap stroke allocation per format
- [ ] Match result calculation (all formats: fourball, foursomes, modified alt shot, scramble, shamble, singles, strokeplay)
- [ ] Post-round verification flow (organizer + canVerifyScores players)
- [ ] Skins calculation (lowest unique net, no carryover default)

---

## Sprint 4: Results & Analytics ⬜ NOT STARTED

- [ ] Automated leaderboard / team standings
- [ ] Match results display
- [ ] Player stats / analytics
- [ ] Skins results display
- [ ] MVP calculation and display
- [ ] Dashboard (tournament hub)

---

## Sprint 5: Finances ⬜ NOT STARTED

Build AFTER Sprint 4 (scoring must be complete first).

### Payment Schedule
- [ ] Pre-trip invoicing: organizer creates due dates + amounts
- [ ] Track payment status per player (paid / unpaid / partial)
- [ ] Schema: `PaymentSchedule`, `PaymentRecord` models

### My Tab (Splitwise-style expense splitting)
- [ ] Add expenses with split options: even-all, even-some, custom amounts, full payback
- [ ] Configurable who can add expenses (organizer-only or all players)
- [ ] Schema: `Expense`, `ExpenseSplit` models

### My Ledger
- [ ] Gambling results aggregation: skins winnings, match bets, side games
- [ ] Per-player running total

### Net Settlement
- [ ] Combine Tab + Ledger into net owed/owing per player
- [ ] Detailed view (every line item) and simplified debt view (minimized transfers)

---

## Sprint 6: Polish ⬜ NOT STARTED

- [ ] Professional design pass (typography, spacing, color, motion)
- [ ] Edge cases and error handling
- [ ] Mobile responsiveness audit
- [ ] Performance optimization
- [ ] Small details that make it feel "finished"

---

## Sprint 7: Handoff ⬜ NOT STARTED

- [ ] Deploy to Vercel (production)
- [ ] Documentation for how to use, maintain, and make changes
- [ ] V2 roadmap
