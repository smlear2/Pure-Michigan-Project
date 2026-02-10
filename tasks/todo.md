# tasks/todo.md — Pure Michigan Open / Golf SaaS Platform

---

## Phase 1: Discovery ✅ COMPLETE

- [x] Define product vision and positioning
- [x] Identify target customer (buddy trip groups first)
- [x] Establish competitive landscape (Unknown Golf)
- [x] Define design direction (Meter-inspired)
- [x] Gather tournament rules and format details
- [x] Confirm player count (16), team structure (2 teams, captains draft)
- [x] Confirm match formats (four-ball, alt shot, scramble, shamble, singles)
- [x] Confirm skins rules (no carryover, variable pot, lowest unique net)
- [x] Define V1 feature scope (6 features + auth)
- [x] Confirm tech stack (Next.js, Prisma, Supabase, Vercel)
- [x] Review existing codebase (schema, utils, components, pages)
- [x] Identify what to keep (data model, golf-utils logic) vs rebuild (UI)
- [x] Establish non-negotiables (one source of truth, global players, nothing hardcoded)
- [x] Define scoring flow (live entry → post-round verification)
- [x] Confirm auth strategy (Supabase Auth, players create accounts)
- [x] Create CLAUDE.md and project documentation

### Discovery Review
**What's solid in the existing codebase:**
- Prisma schema (Trip → Team → Player → Round → Match → Score hierarchy)
- Golf calculation logic (handicaps, stroke allocation, best ball, skins, net scores)
- TypeScript types (comprehensive, well-structured)
- Real 2025 Michigan Open data (16 players, 6 courses, 6 rounds, match results)
- API response helpers and Zod validation patterns
- Course search integration

**What needs to change:**
- localStorage → Supabase (one source of truth)
- Player model: trip-scoped → global identity with trip participation join table
- All hardcoded US/Europe references → dynamic team data
- UI: full rebuild with Meter-inspired design
- Add scoring logic for alt shot, scramble, shamble
- Add wagering/skins model to schema
- Add auth (Supabase Auth)
- Match status system needs proper design

---

## Phase 2: Planning 🔄 IN PROGRESS

- [ ] Propose V1 architecture (schema changes, data flow, page structure)
- [ ] Explain technical approach in plain language
- [ ] Estimate complexity (simple / medium / ambitious)
- [ ] Identify accounts, services, and decisions needed from Stevie
- [ ] Show rough outline of finished product (page map / wireframe)
- [ ] Get Stevie's approval on the plan before building

---

## Phase 3: Building ⬜ NOT STARTED

- [ ] Set up Supabase project and connect Prisma
- [ ] Update Prisma schema (global players, auth, wagering)
- [ ] Set up Supabase Auth
- [ ] Build setup flow (trip → teams → players → courses → rounds)
- [ ] Build scorecard component (format-agnostic, data-driven)
- [ ] Build live scoring page (mobile-first)
- [ ] Build post-round verification flow
- [ ] Build automated leaderboard / standings
- [ ] Build match format engine (all formats)
- [ ] Build skins calculation and display
- [ ] Build analytics / stats tracking
- [ ] Build homepage (Meter-inspired landing)
- [ ] Build dashboard (tournament hub)
- [ ] Seed with 2025 Michigan Open data for testing

---

## Phase 4: Polish ⬜ NOT STARTED

- [ ] Professional design pass (typography, spacing, color, motion)
- [ ] Edge cases and error handling
- [ ] Mobile responsiveness audit
- [ ] Performance optimization
- [ ] Small details that make it feel "finished"

---

## Phase 5: Handoff ⬜ NOT STARTED

- [ ] Deploy to Vercel
- [ ] Documentation for how to use, maintain, and make changes
- [ ] V2 roadmap
