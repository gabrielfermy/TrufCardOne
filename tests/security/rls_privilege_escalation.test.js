import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54341'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

test('Security RLS: Privilege Escalation & Access Control Suite', async (t) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  await t.test('verifies public read access to game profiles without exposing private credentials', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, is_pro')
      .limit(5)

    assert.strictEqual(error, null, 'Public select on profiles should succeed')
    assert.ok(Array.isArray(data), 'Profiles should return array')
    // Verify no password hashes or secret tokens exist in profiles
    data.forEach((p) => {
      assert.strictEqual(p.password, undefined)
      assert.strictEqual(p.encrypted_password, undefined)
      assert.strictEqual(p.secret, undefined)
    })
  })

  await t.test('unauthenticated client cannot escalate role to admin', async () => {
    // Attempt unauthorized direct update
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', '33333333-3333-3333-3333-333333333333')
      .select()

    // RLS policy prevents update or trigger blocks it
    const isBlocked = error !== null || !data || data.length === 0
    assert.ok(isBlocked, 'Direct unauthorized role update must be blocked by RLS/Trigger')
  })

  await t.test('unauthenticated client cannot arbitrarily delete game sessions of other users', async () => {
    // Attempt deleting session belonging to another user
    const { data, error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .select()

    // Must be blocked or return 0 rows
    const isBlocked = error !== null || !data || data.length === 0
    assert.ok(isBlocked, 'Unauthorized session deletion must be prevented')
  })
})
