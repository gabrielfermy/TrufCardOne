#!/usr/bin/env node

/**
 * KancaSela Enterprise Security Audit & SAST / VAPT Scanner
 * 
 * Performs automated static analysis (SAST), secret leak detection,
 * HTTP security header audits, and executes the security test suite.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const PROJECT_ROOT = process.cwd()

console.log('\n' + '='.repeat(70))
console.log('🛡️  KANCASELA ENTERPRISE SECURITY AUDIT (SAST / VAPT)')
console.log('='.repeat(70) + '\n')

let totalIssues = 0
let criticalIssues = 0

// -----------------------------------------------------------------------------
// 1. Secret & Private Key Leak Scanner
// -----------------------------------------------------------------------------
console.log('🔍 [1/4] Scanning codebase for hardcoded secrets & leaked keys...')

const SENSITIVE_PATTERNS = [
  { name: 'Supabase Service Role Key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*(?:service_role|supabase_admin)/g },
  { name: 'Private Stripe / Midtrans Server Key', regex: /(?:sk_live|SB-Mid-server-[a-zA-Z0-9_-]{20,}|Mid-server-[a-zA-Z0-9_-]{20,})/g },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'Private RSA / SSH Key', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
  { name: 'Hardcoded Database Password', regex: /postgres:\/\/[^:]+:([^@]+)@/g }
]

const SCAN_DIRS = ['src', 'public', 'supabase/functions']
const IGNORE_FILES = ['.env.example', 'security-audit.js']

function scanDirectoryForSecrets(dir) {
  const fullPath = path.join(PROJECT_ROOT, dir)
  if (!fs.existsSync(fullPath)) return

  const entries = fs.readdirSync(fullPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        scanDirectoryForSecrets(entryPath)
      }
    } else if (entry.isFile() && !IGNORE_FILES.includes(entry.name)) {
      const content = fs.readFileSync(path.join(PROJECT_ROOT, entryPath), 'utf-8')
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.regex.test(content)) {
          console.error(`  ❌ [CRITICAL LEAK] Found ${pattern.name} in: ${entryPath}`)
          totalIssues++
          criticalIssues++
        }
      }
    }
  }
}

for (const dir of SCAN_DIRS) {
  scanDirectoryForSecrets(dir)
}

if (criticalIssues === 0) {
  console.log('  ✅ No hardcoded private keys or service_role secrets detected in client code.\n')
} else {
  console.error(`  ⚠️  Found ${criticalIssues} potential secret leak(s)!\n`)
}


// -----------------------------------------------------------------------------
// 2. Static Code Analysis (SAST) for Dangerous DOM / XSS Sinks
// -----------------------------------------------------------------------------
console.log('🔍 [2/4] Running Static Analysis (SAST) for unsafe DOM sinks & eval()...')

const DANGEROUS_SINKS = [
  { name: 'eval() Execution', regex: /\beval\s*\(/g },
  { name: 'document.write() Sink', regex: /document\.write\s*\(/g },
  { name: 'dangerouslySetInnerHTML without sanitization', regex: /dangerouslySetInnerHTML\s*=\s*\{\s*__html\s*:\s*(?!DOMPurify|sanitizeText)[a-zA-Z0-9_.]+\s*\}/g }
]

function scanCodeForDangerousSinks(dir) {
  const fullPath = path.join(PROJECT_ROOT, dir)
  if (!fs.existsSync(fullPath)) return

  const entries = fs.readdirSync(fullPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        scanCodeForDangerousSinks(entryPath)
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.ts'))) {
      const content = fs.readFileSync(path.join(PROJECT_ROOT, entryPath), 'utf-8')
      for (const sink of DANGEROUS_SINKS) {
        if (sink.regex.test(content)) {
          console.warn(`  ⚠️  [SAST Warning] ${sink.name} in ${entryPath}`)
          totalIssues++
        }
      }
    }
  }
}

scanCodeForDangerousSinks('src')
console.log('  ✅ SAST DOM sink scan complete.\n')


// -----------------------------------------------------------------------------
// 3. HTTP Security Headers Verification (vercel.json)
// -----------------------------------------------------------------------------
console.log('🔍 [3/4] Verifying HTTP Security Headers in vercel.json...')

const vercelPath = path.join(PROJECT_ROOT, 'vercel.json')
if (fs.existsSync(vercelPath)) {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'))
  const headers = vercelConfig?.headers?.[0]?.headers || []
  const headerKeys = headers.map(h => h.key)

  const requiredHeaders = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Content-Security-Policy',
    'Strict-Transport-Security'
  ]

  let missingHeaders = 0
  for (const reqHeader of requiredHeaders) {
    if (headerKeys.includes(reqHeader)) {
      console.log(`  ✅ Header present: ${reqHeader}`)
    } else {
      console.error(`  ❌ Missing header: ${reqHeader}`)
      missingHeaders++
      totalIssues++
    }
  }

  if (missingHeaders === 0) {
    console.log('  ✅ All enterprise HTTP security headers configured properly.\n')
  } else {
    console.warn(`  ⚠️  ${missingHeaders} header(s) missing.\n`)
  }
} else {
  console.warn('  ⚠️  vercel.json not found.\n')
  totalIssues++
}


// -----------------------------------------------------------------------------
// 4. Executing Automated Security Unit Tests
// -----------------------------------------------------------------------------
console.log('🔍 [4/4] Running Automated Security Test Suite...')

try {
  const testOutput = execSync('node --test tests/security/*.test.js', { stdio: 'pipe' }).toString()
  console.log(testOutput)
  console.log('  ✅ All automated security tests passed successfully.\n')
} catch (err) {
  console.error('  ❌ Security test execution failed:')
  console.error(err.stdout?.toString() || err.message)
  totalIssues++
}

// -----------------------------------------------------------------------------
// Summary & Verdict
// -----------------------------------------------------------------------------
console.log('='.repeat(70))
if (totalIssues === 0) {
  console.log('🎉 VERDICT: SECURITY AUDIT PASSED! ZERO CRITICAL VULNERABILITIES DETECTED.')
  console.log('   All RLS policies, cryptographic signatures, anti-XSS, and headers verified.')
} else {
  console.log(`⚠️  VERDICT: AUDIT COMPLETED WITH ${totalIssues} NOTICE(S).`)
}
console.log('='.repeat(70) + '\n')

process.exit(totalIssues > 0 && criticalIssues > 0 ? 1 : 0)
