/**
 * KancaSela Round Deduplication & Normalization Utilities
 * Prevents race conditions, double-saving, duplicate table columns, and streak skew across all games.
 */

/**
 * Safely deduplicates and orders an array of game rounds by round_number.
 * Retains the most up-to-date and complete round record if duplicates exist.
 * 
 * @param {Array} roundsList - Raw array of round objects
 * @returns {Array} Deduplicated, sorted array of rounds
 */
export function dedupeRounds(roundsList) {
  if (!Array.isArray(roundsList)) return []
  const map = new Map()

  for (const r of roundsList) {
    if (!r) continue
    const rawNum = r.round_number ?? r.roundNumber
    if (rawNum === undefined || rawNum === null || isNaN(Number(rawNum))) continue
    const key = Number(rawNum)

    if (!map.has(key)) {
      map.set(key, r)
    } else {
      const existing = map.get(key)
      const existingIsTemp = String(existing?.id || '').startsWith('local-') || String(existing?.id || '').startsWith('round-')
      const newIsTemp = String(r?.id || '').startsWith('local-') || String(r?.id || '').startsWith('round-')
      
      // If one has persistent DB id and the other is temp, keep the DB id one
      if (existingIsTemp && !newIsTemp) {
        map.set(key, r)
      } else if (!existingIsTemp && newIsTemp) {
        // Keep existing persistent round
      } else {
        // Otherwise prefer the one with richer player_scores
        const existingScoresLen = existing?.player_scores?.length || existing?.playerScores?.length || 0
        const newScoresLen = r?.player_scores?.length || r?.playerScores?.length || 0
        if (newScoresLen >= existingScoresLen) {
          map.set(key, r)
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const numA = Number(a.round_number ?? a.roundNumber ?? 0)
    const numB = Number(b.round_number ?? b.roundNumber ?? 0)
    return numA - numB
  })
}
