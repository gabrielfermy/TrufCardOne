import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = 'http://127.0.0.1:54341';
const LOCAL_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const STAGING_URL = 'https://rmeymlokzaccfoymtlrr.supabase.co';
const STAGING_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXltbG9remFjY2ZveW10bHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE1NzQsImV4cCI6MjEwNTIzNzU3NH0.5EaoJCOMhdzSDXeyQjNoNw8AZYY5Os26vMuVZgMMAY8';

const PROD_URL = 'https://fsqbhaophsjfldwtidcc.supabase.co';
const PROD_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcWJoYW9waHNqZmxkd3RpZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE2NzQsImV4cCI6MjEwNTIzNzY3NH0.GSk5v_dKt3e0dgDav_LTW1UAj5LoZVD4s8x9pMaGp_Q';

async function testLocal() {
  console.log('--- Testing Local ---');
  const localClient = createClient(LOCAL_URL, LOCAL_ANON);
  
  for (const email of ['gabriel@test.com', 'pro@kancasela.local', 'free@kancasela.local']) {
    const { data, error } = await localClient.auth.signInWithPassword({
      email,
      password: '123456'
    });
    console.log(`Local [${email}] login:`, data?.session ? '✅ SUCCESS' : `❌ FAILED: ${error?.message}`);
  }

  // Check admin user list via service role
  const localAdmin = createClient(LOCAL_URL, LOCAL_SERVICE);
  const { data: users, error: listErr } = await localAdmin.auth.admin.listUsers();
  console.log('Local seeded users in auth.users:', users?.users?.map(u => u.email), listErr?.message || '');
}

async function testStaging() {
  console.log('--- Testing Staging ---');
  const stagingClient = createClient(STAGING_URL, STAGING_ANON);
  const { data, error } = await stagingClient.auth.signInWithPassword({
    email: 'gabriel@test.com',
    password: '123456'
  });
  console.log('Staging login result:', { success: !!data?.session, user: data?.user?.email, error: error?.message });
}

async function testProd() {
  console.log('--- Testing Prod ---');
  const prodClient = createClient(PROD_URL, PROD_ANON);
  const { data, error } = await prodClient.auth.signInWithPassword({
    email: 'gabriel@test.com',
    password: '123456'
  });
  console.log('Prod login result:', { success: !!data?.session, user: data?.user?.email, error: error?.message });
}

async function main() {
  await testLocal();
  await testStaging();
  await testProd();
}

main().catch(console.error);
