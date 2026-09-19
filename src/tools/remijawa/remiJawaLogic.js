/**
 * Remi Jawa Card Game Scoring Logic & Rule Engine
 * Based on docs/Peraturan Remi Jawa.md
 */

export const DEFAULT_DEALER_WORD = 'CHOLOKOPOK'

export const REMI_JAWA_POINTS = {
  JADI: {
    ANGKA: 1,  // 2 - 10
    GAMBAR: 2, // J, Q, K
    AS: 3      // A
  },
  MATI: {
    ANGKA: -1,  // 2 - 10
    GAMBAR: -2, // J, Q, K
    AS: -3,     // A
    JOKER: -10  // Joker tertahan
  },
  BONUS_TUTUP: {
    ATAS: 10,   // Tutup Atas / Deck
    BAWAH: 25   // Tutup Bawah / Sampah
  },
  BONUS_KARTU_TUTUP: {
    BIASA: 0,
    AS: 5,      // Tutup dengan As (+5)
    JOKER: 15   // Tutup dengan Joker (+15)
  }
}

/**
 * Calculates individual player round score breakdown
 */
export function calculatePlayerScoreBreakdown(playerData, isCloser, closeType = 'atas', closeSpecialCard = 'biasa', isDeckEmpty = false) {
  const jadiAngka = Number(playerData?.jadiAngka || 0)
  const jadiGambar = Number(playerData?.jadiGambar || 0)
  const jadiAs = Number(playerData?.jadiAs || 0)
  const jadiJokerPts = Number(playerData?.jadiJokerPts || 0) // Custom points if any (+1, +2, +3)

  const matiAngka = Number(playerData?.matiAngka || 0)
  const matiGambar = Number(playerData?.matiGambar || 0)
  const matiAs = Number(playerData?.matiAs || 0)
  const matiJoker = Number(playerData?.matiJoker || 0)

  // Calculate positive points from completed sets/melds
  const pointsJadi = (jadiAngka * REMI_JAWA_POINTS.JADI.ANGKA) +
                     (jadiGambar * REMI_JAWA_POINTS.JADI.GAMBAR) +
                     (jadiAs * REMI_JAWA_POINTS.JADI.AS) +
                     jadiJokerPts

  // Calculate negative penalties from uncompleted deadwood cards
  let pointsMati = (matiAngka * REMI_JAWA_POINTS.MATI.ANGKA) +
                   (matiGambar * REMI_JAWA_POINTS.MATI.GAMBAR) +
                   (matiAs * REMI_JAWA_POINTS.MATI.AS) +
                   (matiJoker * REMI_JAWA_POINTS.MATI.JOKER)
  if (pointsMati === 0) pointsMati = 0

  // Calculate closing bonus if this player closed the round
  let pointsBonusTutup = 0
  if (isCloser && !isDeckEmpty) {
    const baseBonus = closeType === 'bawah' ? REMI_JAWA_POINTS.BONUS_TUTUP.BAWAH : REMI_JAWA_POINTS.BONUS_TUTUP.ATAS
    let specialBonus = 0
    if (closeSpecialCard === 'as') {
      specialBonus = REMI_JAWA_POINTS.BONUS_KARTU_TUTUP.AS
    } else if (closeSpecialCard === 'joker') {
      specialBonus = REMI_JAWA_POINTS.BONUS_KARTU_TUTUP.JOKER
    }
    pointsBonusTutup = baseBonus + specialBonus
  }

  let totalScoreChange = pointsJadi + pointsMati + pointsBonusTutup
  if (totalScoreChange === 0) totalScoreChange = 0

  return {
    pointsJadi,
    pointsMati,
    pointsBonusTutup,
    totalScoreChange,
    details: {
      jadiAngka,
      jadiGambar,
      jadiAs,
      jadiJokerPts,
      matiAngka,
      matiGambar,
      matiAs,
      matiJoker,
      isCloser,
      closeType,
      closeSpecialCard
    }
  }
}

/**
 * Calculates Remi Jawa round score changes for all players
 */
export function calculateRemiJawaRoundScores({
  playersData = [],
  closerIndex = 0,
  closeType = 'atas',
  closeSpecialCard = 'biasa',
  isDeckEmpty = false
}) {
  return playersData.map((pData, idx) => {
    const isCloser = !isDeckEmpty && idx === closerIndex
    return calculatePlayerScoreBreakdown(pData, isCloser, closeType, closeSpecialCard, isDeckEmpty)
  })
}

/**
 * Determines dealer index for the next Remi Jawa round.
 * Round 1: firstDealer
 * Round 2+: Player with the LOWEST score in the previous round.
 * Tie-breaker: If previous dealer is among tied lowest scorers, dealer stays with them.
 * Otherwise, rotates clockwise starting from (prevDealer + 1) % playerCount.
 */
export function determineRemiJawaNextDealer(roundsList, firstDealer = 0, playerCount = 4) {
  if (!roundsList || roundsList.length === 0) {
    return firstDealer
  }

  const pCount = roundsList[0]?.player_scores?.length || playerCount || 4
  const lastRound = roundsList[roundsList.length - 1]
  const lastScores = lastRound?.player_scores || lastRound?.playerScores || []

  // Extract round score changes from the last round
  const roundScores = Array(pCount).fill(0)
  lastScores.forEach(ps => {
    const pIdx = ps.player_index ?? ps.playerIndex ?? 0
    if (pIdx >= 0 && pIdx < pCount) {
      roundScores[pIdx] = ps.score_change ?? ps.scoreChange ?? 0
    }
  })

  const minScore = Math.min(...roundScores)
  const lowestScorers = Array.from({ length: pCount }, (_, i) => i).filter(idx => roundScores[idx] === minScore)

  if (lowestScorers.length === 1) {
    return lowestScorers[0]
  }

  // Tie-breaker: If previous round dealer is among tied lowest scorers, keep them
  const prevDealer = lastRound.round_data?.dealerIndex ?? 
                     lastRound.round_data?.dealer_index ?? 
                     lastRound.roundData?.dealerIndex ?? 
                     lastRound.dealer_index ?? 
                     lastRound.dealerIndex ?? 
                     firstDealer

  if (lowestScorers.includes(prevDealer)) {
    return prevDealer
  }

  // Otherwise, rotate clockwise starting from previous dealer + 1
  for (let step = 1; step < pCount; step++) {
    const candidate = (prevDealer + step) % pCount
    if (lowestScorers.includes(candidate)) {
      return candidate
    }
  }

  return lowestScorers[0]
}

/**
 * Calculates consecutive dealer streak from recorded rounds
 */
export function getRemiJawaDealerStreak(roundsList, targetDealer, firstDealer = 0) {
  if (!roundsList || roundsList.length === 0) return 0
  let count = 0
  for (let i = roundsList.length - 1; i >= 0; i--) {
    const r = roundsList[i]
    const d = r.round_data?.dealerIndex ?? 
              r.round_data?.dealer_index ?? 
              r.roundData?.dealerIndex ?? 
              r.dealer_index ?? 
              r.dealerIndex ?? 
              (i === 0 ? firstDealer : null)
    if (d === targetDealer) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Formats dealer streak as letter badges or numeric progress
 */
export function formatDealerStreakStatus(streakCount, word = DEFAULT_DEALER_WORD, displayMode = 'word') {
  const sanitizedWord = (word && word.trim().length > 0 ? word.trim().toUpperCase() : DEFAULT_DEALER_WORD)
  const letters = sanitizedWord.split('')
  const maxLimit = letters.length
  const activeCount = Math.min(streakCount, maxLimit)

  return {
    streakCount,
    maxLimit,
    word: sanitizedWord,
    letters,
    activeCount,
    isLimitReached: streakCount >= maxLimit,
    displayMode,
    progressText: `${activeCount}/${maxLimit}`,
    activeLetters: letters.slice(0, activeCount).join('-')
  }
}

/**
 * Evaluates Game Over conditions
 */
export function checkRemiJawaGameOver(cumulativeScores = [], dealerStreak = 0, settings = {}) {
  const targetWin = settings?.targetWin || null // e.g. 100 or 150 pts
  const targetPenalty = settings?.targetPenalty || null // e.g. -100 or -200 pts
  const streakLimit = settings?.streakLimit !== undefined ? settings?.streakLimit : 10

  // 1. Check Dealer Streak Limit (e.g. 10x CHOLOKOPOK)
  if (streakLimit && streakLimit > 0 && dealerStreak >= streakLimit) {
    return {
      isGameOver: true,
      reason: 'dealer_streak',
      streakCount: dealerStreak,
      limit: streakLimit
    }
  }

  // 2. Check Target Win Score
  if (targetWin && targetWin > 0) {
    const winners = cumulativeScores
      .map((score, idx) => ({ idx, score }))
      .filter(p => p.score >= targetWin)
    if (winners.length > 0) {
      winners.sort((a, b) => b.score - a.score)
      return {
        isGameOver: true,
        reason: 'target_win',
        winnerIndex: winners[0].idx,
        targetScore: targetWin
      }
    }
  }

  // 3. Check Target Penalty / Elimination (if penalty threshold mode)
  if (targetPenalty && targetPenalty < 0) {
    const eliminated = cumulativeScores
      .map((score, idx) => ({ idx, score }))
      .filter(p => p.score <= targetPenalty)
    if (eliminated.length > 0) {
      return {
        isGameOver: true,
        reason: 'target_penalty',
        eliminatedIndices: eliminated.map(e => e.idx),
        targetPenalty
      }
    }
  }

  return { isGameOver: false }
}
