/**
 * Merge real User accounts into 2025 trip seed data.
 *
 * For Stephen Lear: He has TWO TripPlayers on 2025 — a seed one (with all scores)
 * and a real one. Move MatchPlayers from seed -> real TripPlayer, update Scores'
 * tripPlayerId, then delete the seed TripPlayer and seed User.
 *
 * For Tom, Dylan, Danny, Joe Ways: They have seed Users on the 2025 trip AND
 * real User records (from 2026 invitations). Reassign the seed TripPlayer to
 * point to the real User, then delete the seed User.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Merge Real Users into 2025 Trip ===\n')

  // 1. Find the 2025 trip
  const trip = await prisma.trip.findFirst({ where: { year: 2025 } })
  if (!trip) throw new Error('2025 trip not found')

  // 2. Handle Stephen Lear — merge seed TripPlayer into real TripPlayer
  console.log('--- Stephen Lear ---')
  const seedStephen = await prisma.user.findFirst({
    where: { email: 'stephen-lear@seed.local' },
    include: {
      tripPlayers: {
        where: { tripId: trip.id },
        include: {
          matchPlayers: { select: { id: true } },
          scores: { select: { id: true } }
        }
      }
    }
  })
  const realStephen = await prisma.user.findFirst({
    where: { email: 's.lear2@gmail.com' },
    include: {
      tripPlayers: {
        where: { tripId: trip.id },
        select: { id: true }
      }
    }
  })

  if (seedStephen && realStephen) {
    const seedTP = seedStephen.tripPlayers[0]
    const realTP = realStephen.tripPlayers[0]

    if (seedTP && realTP) {
      console.log(`  Seed TripPlayer: ${seedTP.id} (${seedTP.matchPlayers.length} matchPlayers, ${seedTP.scores.length} scores)`)
      console.log(`  Real TripPlayer: ${realTP.id}`)

      // Move all MatchPlayers from seed to real TripPlayer
      const mpResult = await prisma.matchPlayer.updateMany({
        where: { tripPlayerId: seedTP.id },
        data: { tripPlayerId: realTP.id }
      })
      console.log(`  Moved ${mpResult.count} MatchPlayers to real TripPlayer`)

      // Move all Scores from seed to real TripPlayer
      const scoreResult = await prisma.score.updateMany({
        where: { tripPlayerId: seedTP.id },
        data: { tripPlayerId: realTP.id }
      })
      console.log(`  Moved ${scoreResult.count} Scores to real TripPlayer`)

      // Copy handicapAtTime from seed to real if real doesn't have one
      const seedTPFull = await prisma.tripPlayer.findUnique({ where: { id: seedTP.id } })
      const realTPFull = await prisma.tripPlayer.findUnique({ where: { id: realTP.id } })
      if (seedTPFull.handicapAtTime && !realTPFull.handicapAtTime) {
        await prisma.tripPlayer.update({
          where: { id: realTP.id },
          data: { handicapAtTime: seedTPFull.handicapAtTime }
        })
        console.log(`  Copied handicapAtTime: ${seedTPFull.handicapAtTime}`)
      }

      // Delete the seed TripPlayer
      await prisma.tripPlayer.delete({ where: { id: seedTP.id } })
      console.log(`  Deleted seed TripPlayer`)

      // Delete the seed User (if no other TripPlayers)
      const otherTPs = await prisma.tripPlayer.count({ where: { userId: seedStephen.id } })
      if (otherTPs === 0) {
        await prisma.user.delete({ where: { id: seedStephen.id } })
        console.log(`  Deleted seed User`)
      }
    }
  } else {
    console.log('  SKIP: seed or real user not found')
  }

  // 3. Handle Tom, Dylan, Danny, Joe Ways
  const mergeList = [
    { seedEmail: 'tom-bostwick@seed.local', realEmail: 'tombostwick94@yahoo.com', name: 'Tom Bostwick' },
    { seedEmail: 'dylan-plachta@seed.local', realEmail: 'dplachta0241@gmail.com', name: 'Dylan Plachta' },
    { seedEmail: 'danny-morales@seed.local', realEmail: 'danny.morales813@gmail.com', name: 'Danny Morales' },
    { seedEmail: 'joey-ways@seed.local', realEmail: 'jwaysjr@gmail.com', name: 'Joe Ways' },
  ]

  for (const { seedEmail, realEmail, name } of mergeList) {
    console.log(`\n--- ${name} ---`)
    const seedUser = await prisma.user.findFirst({ where: { email: seedEmail } })
    const realUser = await prisma.user.findFirst({ where: { email: realEmail } })

    if (!seedUser) { console.log('  SKIP: seed user not found'); continue }
    if (!realUser) { console.log('  SKIP: real user not found'); continue }

    console.log(`  Seed User: ${seedUser.id} (${seedUser.email})`)
    console.log(`  Real User: ${realUser.id} (${realUser.email})`)

    // Check if real user already has a TripPlayer on this trip
    const existingRealTP = await prisma.tripPlayer.findFirst({
      where: { tripId: trip.id, userId: realUser.id }
    })

    if (existingRealTP) {
      // Real user already has a TripPlayer — need to merge like Stephen
      console.log(`  Real user already has TripPlayer on 2025 trip — merging...`)
      const seedTP = await prisma.tripPlayer.findFirst({
        where: { tripId: trip.id, userId: seedUser.id }
      })
      if (seedTP) {
        await prisma.matchPlayer.updateMany({
          where: { tripPlayerId: seedTP.id },
          data: { tripPlayerId: existingRealTP.id }
        })
        await prisma.score.updateMany({
          where: { tripPlayerId: seedTP.id },
          data: { tripPlayerId: existingRealTP.id }
        })
        await prisma.tripPlayer.delete({ where: { id: seedTP.id } })
        console.log('  Merged MatchPlayers+Scores, deleted seed TripPlayer')
      }
    } else {
      // Reassign the seed TripPlayer to the real user
      const seedTP = await prisma.tripPlayer.findFirst({
        where: { tripId: trip.id, userId: seedUser.id }
      })
      if (seedTP) {
        await prisma.tripPlayer.update({
          where: { id: seedTP.id },
          data: { userId: realUser.id }
        })
        console.log(`  Reassigned TripPlayer ${seedTP.id} to real user`)
      }
    }

    // Delete seed user if no remaining TripPlayers
    const remaining = await prisma.tripPlayer.count({ where: { userId: seedUser.id } })
    if (remaining === 0) {
      await prisma.user.delete({ where: { id: seedUser.id } })
      console.log('  Deleted seed user')
    } else {
      console.log(`  Seed user still has ${remaining} TripPlayers, keeping`)
    }
  }

  // 4. Summary
  console.log('\n=== Summary ===')
  const players2025 = await prisma.tripPlayer.findMany({
    where: { tripId: trip.id },
    include: { user: { select: { name: true, email: true, supabaseId: true } } },
    orderBy: { user: { name: 'asc' } }
  })
  players2025.forEach(tp => {
    const isSeed = tp.user.email.endsWith('@seed.local')
    const isPending = tp.user.supabaseId.startsWith('pending-') || tp.user.supabaseId.startsWith('seed-')
    console.log(`  ${tp.user.name.padEnd(20)} | ${tp.user.email.padEnd(35)} | ${isSeed ? 'SEED' : 'REAL'} | ${isPending ? 'PENDING' : 'ACTIVE'}`)
  })

  const scoreCount = await prisma.score.count()
  console.log(`\nTotal scores in DB: ${scoreCount}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
