/**
 * KancaSela Client-Side Security & Input Sanitization Utilities
 * Protects against XSS (Cross-Site Scripting), HTML injection, and malicious input fuzzing.
 */

/**
 * Strips HTML tags, null bytes, script protocols, and unsafe control characters.
 * @param {string} input - Raw user input string
 * @param {number} maxLength - Maximum allowable string length (default: 60)
 * @returns {string} Sanitized string
 */
export function sanitizeText(input, maxLength = 60) {
  if (typeof input !== 'string') return ''

  let sanitized = input
    // Remove null bytes
    .replace(/\0/g, '')
    // Strip entire script, style, and iframe blocks and their inner contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Strip remaining HTML tags (<img ...>, <div>, etc.)
    .replace(/<[^>]*>?/gm, '')
    // Replace dangerous HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Strip javascript: or data: URIs
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Trim leading/trailing whitespace
    .trim()

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitizes and validates multiplayer room codes (e.g. TRU-8K2N).
 * @param {string} code - Raw room code
 * @returns {string} Validated uppercase alphanumeric code
 */
export function sanitizeRoomCode(code) {
  if (typeof code !== 'string') return ''
  const tagFree = code.replace(/<[^>]*>?/gm, '')
  return tagFree
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 16)
}

/**
 * Sanitizes an array of player names, ensuring no XSS payload or empty names.
 * @param {string[]} names - Array of player name strings
 * @returns {string[]} Sanitized player names array
 */
export function sanitizePlayerNames(names) {
  if (!Array.isArray(names)) return []
  return names.map((name, index) => {
    const clean = sanitizeText(name, 30)
    return clean.length > 0 ? clean : `Pemain ${index + 1}`
  })
}

/**
 * Validates whether a given string is a valid UUID v4 format.
 * @param {string} id - Input identifier
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(id) {
  if (typeof id !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Masks email address for safe display in UI.
 * @param {string} email - Email address (e.g. gabriel@gmail.com)
 * @returns {string} Masked email (e.g. g***l@gmail.com)
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local.charAt(0)}*@${domain}`
  return `${local.charAt(0)}${'*'.repeat(local.length - 2)}${local.charAt(local.length - 1)}@${domain}`
}
