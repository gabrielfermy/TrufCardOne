const envs = [
  {
    name: 'STAGING (koncoselo.my.id)',
    url: 'https://rmeymlokzaccfoymtlrr.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXltbG9remFjY2ZveW10bHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE1NzQsImV4cCI6MjEwNTIzNzU3NH0.5EaoJCOMhdzSDXeyQjNoNw8AZYY5Os26vMuVZgMMAY8'
  },
  {
    name: 'PRODUCTION (kancasela.my.id)',
    url: 'https://fsqbhaophsjfldwtidcc.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcWJoYW9waHNqZmxkd3RpZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE2NzQsImV4cCI6MjEwNTIzNzY3NH0.GSk5v_dKt3e0dgDav_LTW1UAj5LoZVD4s8x9pMaGp_Q'
  }
]

async function testEndpoint(name, url, key, path) {
  try {
    const res = await fetch(`${url}${path}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    })
    const data = await res.json()
    if (res.ok) {
      const count = Array.isArray(data) ? `${data.length} records` : 'OK'
      return { status: 'PASS', msg: `${res.status} (${count})` }
    } else {
      return { status: 'FAIL', msg: `${res.status} - ${data.message || JSON.stringify(data)}` }
    }
  } catch (err) {
    return { status: 'ERROR', msg: err.message }
  }
}

async function testEnv(env) {
  console.log(`\n======================================================================`)
  console.log(`📡 Testing Environment: ${env.name}`)
  console.log(`🔗 Supabase URL: ${env.url}`)
  console.log(`======================================================================`)

  const tables = [
    { path: '/auth/v1/settings', label: '🔐 Auth Settings API' },
    { path: '/rest/v1/profiles?select=id,display_name,role&limit=5', label: '👤 profiles Table' },
    { path: '/rest/v1/game_sessions?select=id,title,game_type,is_completed&limit=5', label: '🎲 game_sessions Table' },
    { path: '/rest/v1/game_rounds?select=id,round_number&limit=5', label: '🃏 game_rounds Table' },
    { path: '/rest/v1/player_scores?select=id,player_index,score_change,score_cumulative&limit=5', label: '📊 player_scores Table' },
    { path: '/rest/v1/payment_transactions?select=id,status,order_id&limit=5', label: '💳 payment_transactions Table' },
    { path: '/rest/v1/audit_logs?select=id,action,details&limit=5', label: '📜 audit_logs Table' },
    { path: '/rest/v1/support_tickets?select=id,subject,status&limit=5', label: '🎫 support_tickets Table' }
  ]

  for (const item of tables) {
    const res = await testEndpoint(env.name, env.url, env.key, item.path)
    console.log(`  ${item.label.padEnd(30)}: ${res.status === 'PASS' ? '✅' : '❌'} ${res.msg}`)
  }
}

async function main() {
  for (const env of envs) {
    await testEnv(env)
  }
  console.log(`\n======================================================================\n`)
}

main()
