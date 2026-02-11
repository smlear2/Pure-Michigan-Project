const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const trip = await prisma.trip.findFirst({
    where: { year: 2025 },
    include: {
      teams: true,
      rounds: {
        include: {
          tee: { include: { course: true, holes: { orderBy: { number: 'asc' } } } },
          matches: {
            include: {
              players: {
                include: { tripPlayer: { include: { user: true } }, scores: true }
              }
            },
            orderBy: { matchNumber: 'asc' }
          }
        },
        orderBy: { roundNumber: 'asc' }
      },
      tripPlayers: { include: { user: { select: { name: true } }, team: { select: { name: true } } } },
      courses: { include: { course: true } }
    }
  })

  console.log('Trip:', trip.name, trip.year)
  console.log('Teams:', trip.teams.map(t => `${t.name} (${t.color})`).join(', '))
  console.log('Players:', trip.tripPlayers.length)
  trip.tripPlayers.forEach(tp => console.log(`  ${tp.user.name} - ${tp.team?.name || 'no team'} - hcp: ${tp.handicapAtTime}`))
  console.log('Courses:', trip.courses.map(c => c.course.name).join(', '))
  console.log('Rounds:', trip.rounds.length)
  trip.rounds.forEach(r => {
    console.log(`  R${r.roundNumber}: ${r.name} - ${r.tee.course.name} (${r.tee.name}) - ${r.format} - ${r.matches.length} matches`)
    r.matches.forEach(m => {
      const s1 = m.players.filter(p => p.side === 1).map(p => p.tripPlayer.user.name)
      const s2 = m.players.filter(p => p.side === 2).map(p => p.tripPlayer.user.name)
      const scoreCount = m.players.reduce((sum, p) => sum + p.scores.length, 0)
      console.log(`    M${m.matchNumber}: ${s1.join(' & ')} vs ${s2.join(' & ')} - ${m.status} - scores: ${scoreCount}`)
    })
  })

  const scoreCount = await prisma.score.count()
  console.log('\nTotal scores in DB:', scoreCount)
}

main().catch(console.error).finally(() => prisma.$disconnect())
