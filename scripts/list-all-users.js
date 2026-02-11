const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const users = await p.user.findMany({
    where: { NOT: { email: { endsWith: '@seed.local' } } },
    include: { tripPlayers: { select: { tripId: true } } },
    orderBy: { name: 'asc' }
  })

  console.log('=== Non-seed users ===')
  users.forEach(u => {
    const pending = u.supabaseId.startsWith('pending-')
    console.log(`${u.name.padEnd(20)} | ${u.email.padEnd(35)} | ${pending ? 'PENDING' : 'ACTIVE'} | trips: ${u.tripPlayers.length}`)
  })
  console.log(`\nTotal: ${users.length}`)
}

main().catch(console.error).finally(() => p.$disconnect())
