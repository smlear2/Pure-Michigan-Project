# tasks/lessons.md — Pure Michigan Open / Golf SaaS Platform

Corrections and patterns to prevent repeated mistakes.

---

## Session: 2026-02-10 (Discovery)

### Lesson 1: Don't assume player count without verifying data
- **What happened:** Stevie said "6 players" early in conversation. I anchored on that number. The actual mock data (which Stevie confirmed is real) shows 16 players (8 per team).
- **Root cause:** Took an early casual answer as fact without cross-referencing against the codebase data.
- **Rule:** Always verify stated facts against existing data when available. If there's a conflict, ask — don't assume either is correct.

### Lesson 2: Don't assume the reason behind a technical decision
- **What happened:** I called out localStorage as a "shortcut" or "prototype approach." Stevie corrected me — I (a previous Claude session) had a logical reason for it (Supabase wasn't set up yet). The framing matters.
- **Root cause:** Assumed negative intent behind a technical choice without knowing the history.
- **Rule:** When reviewing existing code, describe what IS, not why it was done wrong. Ask about the reasoning before critiquing the decision.

### Lesson 3: Skins rules are specific — don't assume standard rules
- **What happened:** I discussed skins in general terms and referenced a fixed pot per skin. Stevie corrected: skins have a variable value based on how many are actually won in a round. No carryover. Lowest unique net score.
- **Root cause:** Applied generic golf knowledge instead of asking for the specific house rules.
- **Rule:** Every tournament has house rules. Always ask for specifics on scoring, skins, handicaps, and wagering before assuming standard rules apply.

### Lesson 4: "US vs Europe" is both specific AND needs to be generic
- **What happened:** I flagged hardcoded US/Europe as a problem. Stevie clarified it IS their actual theme, but the app must also support any team names for SaaS.
- **Root cause:** Framed it as either/or when it's both.
- **Rule:** The Pure Michigan Open's specific setup should be achievable through configuration, not hardcoding. The default/demo can be US vs Europe, but the system must be flexible.

### Lesson 5: Don't let datasets diverge — ever
- **What happened:** Stevie explicitly called out that a previous project had issues with running in circles with different datasets. Non-negotiable: one source of truth.
- **Rule:** There is ONE data layer (Supabase). No localStorage copies, no mock data files used at runtime, no in-memory caches that diverge. If data exists in two places, we've already failed.
