const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const players = await p.tripPlayer.findMany({
    where: { trip: { year: 2025 } },
    include: {
      user: { select: { id: true, name: true, email: true, supabaseId: true } },
      team: { select: { name: true } }
    },
    orderBy: { user: { name: 'asc' } }
  })

  players.forEach(tp => {
    const pending = tp.user.supabaseId.startsWith('pending-') || tp.user.supabaseId.startsWith('seed-')
    console.log(`${tp.user.name.padEnd(20)} | ${tp.user.email.padEnd(30)} | ${tp.team?.name || 'no team'} | ${pending ? 'SEED' : 'REAL'}`)
  })
  console.log(`\nTotal: ${players.length} players`)
}

main().catch(console.error).finally(() => p.$disconnect())
