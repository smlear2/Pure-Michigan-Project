/**
 * Manually confirm Supabase auth users who didn't receive confirmation emails.
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env file manually (no dotenv dependency)
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // List all auth users to find Tom and Joe
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) { console.error('Error listing users:', error); return }

  const targets = ['tombostwick94@yahoo.com', 'jwaysjr@gmail.com']

  for (const email of targets) {
    const user = users.find(u => u.email === email)
    if (!user) {
      console.log(`${email}: NOT FOUND in Supabase auth`)
      continue
    }

    console.log(`${email}:`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`)
    console.log(`  Created: ${user.created_at}`)
    console.log(`  Last sign in: ${user.last_sign_in_at || 'never'}`)

    if (!user.email_confirmed_at) {
      console.log(`  → Confirming now...`)
      const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      })
      if (updateError) {
        console.log(`  → ERROR: ${updateError.message}`)
      } else {
        console.log(`  → CONFIRMED!`)
      }
    }
  }
}

main().catch(console.error)
