/**
 * Remi (Indonesian 7-Card / Rummy) Game Logic
 */

export const CARD_VALUES = [
  { label: 'As (A)', pts: 15 },
  { label: 'King (K)', pts: 10 },
  { label: 'Queen (Q)', pts: 10 },
  { label: 'Jack (J)', pts: 10 },
  { label: '10', pts: 10 },
  { label: '9', pts: 9 },
  { label: '8', pts: 8 },
  { label: '7', pts: 7 },
  { label: '6', pts: 6 },
  { label: '5', pts: 5 },
  { label: '4', pts: 4 },
  { label: '3', pts: 3 },
  { label: '2', pts: 2 },
  { label: 'Joker', pts: 25 }
]

/**
 * Calculates Remi round score changes
 * @param {number} closerIndex Index of player who closed the table
 * @param {boolean} isTutupMurni True if closed with Tutup Murni (double penalty)
 * @param {Array<number>} cardPenalties Array of card penalty sum per player
 */
export function calculateRemiRoundScores(closerIndex, isTutupMurni, cardPenalties) {
  const mult = isTutupMurni ? 2 : 1

  return cardPenalties.map((penalty, idx) => {
    if (idx === closerIndex) {
      return 0 // Closer receives 0 penalty
    }
    return -(penalty * mult)
  })
}
