/**
 * Send password reset emails to specific users.
 * They'll receive a link to /auth/reset-password where they can set a new password.
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

const SITE_URL = 'https://pure-michigan-project.vercel.app'

async function main() {
  const targets = process.argv.slice(2)
  if (targets.length === 0) {
    console.log('Usage: node scripts/reset-passwords.js email1@example.com email2@example.com')
    console.log('Sends password reset emails to the specified users.')
    return
  }

  for (const email of targets) {
    console.log(`Sending password reset to ${email}...`)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/reset-password`,
    })
    if (error) {
      console.log(`  ERROR: ${error.message}`)
    } else {
      console.log(`  Sent! They should check their inbox.`)
    }
  }
}

main().catch(console.error)
