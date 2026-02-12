const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Update all trips to add skinsTeamCombos for Foursomes (50/50 = average)
  const trips = await prisma.trip.findMany({
    select: { id: true, year: true, handicapConfig: true },
  });

  for (const trip of trips) {
    const config = trip.handicapConfig || {};
    if (config.skinsTeamCombos) {
      console.log(`Trip ${trip.year}: already has skinsTeamCombos, skipping`);
      continue;
    }

    const updated = {
      ...config,
      skinsTeamCombos: {
        FOURSOMES: { lowPct: 50, highPct: 50 },
      },
    };

    await prisma.trip.update({
      where: { id: trip.id },
      data: { handicapConfig: updated },
    });
    console.log(`Trip ${trip.year}: added skinsTeamCombos`);
  }
}

main().then(() => process.exit());
