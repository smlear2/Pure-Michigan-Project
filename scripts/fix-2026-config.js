const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trip = await prisma.trip.findFirst({ where: { year: 2026 } });
  if (!trip) { console.log('No 2026 trip found'); return; }

  console.log('Before:', JSON.stringify(trip.handicapConfig));

  const updated = {
    percentage: 80,
    offTheLow: true,
    maxHandicap: 24,
    useUnifiedFormula: true,
    teamCombos: {
      FOURSOMES: { lowPct: 60, highPct: 40 },
      SCRAMBLE: { lowPct: 35, highPct: 15 },
    },
    skinsTeamCombos: {
      FOURSOMES: { lowPct: 50, highPct: 50 },
    },
  };

  await prisma.trip.update({
    where: { id: trip.id },
    data: { handicapConfig: updated },
  });

  const after = await prisma.trip.findFirst({ where: { year: 2026 } });
  console.log('After:', JSON.stringify(after.handicapConfig));
}

main().then(() => process.exit());
