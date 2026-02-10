# Golf Trip Tracker ⛳

A modern web app for managing Ryder Cup-style golf trips. Track matches, skins, and MVP standings.

## Features

- **Flexible Teams** - Any number of teams with custom names and colors
- **Multiple Formats** - Fourball, Foursomes, Scramble, Singles, Stroke Play
- **Live Scoring** - Real-time hole-by-hole score entry
- **Automatic Calculations** - Match status, handicap strokes, skins
- **Customizable MVP** - Configure your own weighting formula
- **Mobile Friendly** - Works great on phones for on-course scoring

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd golf-trip
npm install
```

### 2. Set Up Database (Supabase - Free Tier)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings > Database** and copy your connection string
4. Create a `.env` file:

```bash
cp .env.example .env
```

5. Paste your database URL in `.env`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
```

### 3. Initialize Database

```bash
npm run db:push
```

This creates all the tables in your database.

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Usage

### First Time Setup

1. **Create Trip** - Name, dates, location
2. **Setup Teams** - Add teams with colors (e.g., USA vs Europe)
3. **Add Players** - Enter names and handicap indexes
4. **Add Courses** - Enter course data with tees and hole info
5. **Configure Rounds** - Set format, course, tees for each round

### During the Trip

1. **Pairings** - Assign players to matches
2. **Live Scoring** - Enter scores hole-by-hole
3. **Leaderboard** - Watch the team race unfold
4. **Skins** - Automatic calculation after each round

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma

## Project Structure

```
golf-trip/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx        # Homepage
│   │   ├── setup/          # Setup wizard pages
│   │   ├── scoring/        # Live scoring
│   │   ├── leaderboard/    # Standings
│   │   └── skins/          # Skins tracking
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── Scorecard.tsx  # Score entry grid
│   │   └── ...
│   ├── lib/               # Utilities
│   │   ├── golf-utils.ts  # Golf calculations
│   │   └── utils.ts       # General helpers
│   └── types/             # TypeScript types
├── prisma/
│   └── schema.prisma      # Database schema
└── ...
```

## Key Concepts

### Handicap Calculation

**Course Handicap** = Index × (Slope / 113)

Example: 8.5 index on 135 slope = 8.5 × (135/113) = **10**

### Playing Handicap (Strokes Received)

In match play, strokes are given off the lowest handicap player:

- Low man in group: 4 course handicap → receives 0 strokes
- Another player: 10 course handicap → receives 6 strokes

Strokes are allocated to the hardest holes (lowest stroke index first).

### Skins

- All players compete on each hole
- Lowest **net** score wins the skin
- If tied, no skin is awarded (no carryover by default)
- Money split based on skins won

## Customization

### MVP Weights

Edit in Setup > Scoring Rules:

| Category | Default |
|----------|---------|
| Match Points | 24% |
| Holes Won | 24% |
| Scoring vs Par | 24% |
| vs Handicap Index | 24% |
| Skins Money | 4% |

### Match Formats

- **Fourball**: 2v2, best ball
- **Foursomes**: 2v2, alternate shot
- **Scramble**: Team plays from best shot
- **Singles**: 1v1 match play
- **Stroke Play**: Individual total strokes

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy ✓

### Environment Variables for Production

```
DATABASE_URL=your_production_database_url
```

## Contributing

This is built for personal use first, but contributions welcome!

## License

MIT

---

Built with ☕ and 🏌️ by [Your Name]
