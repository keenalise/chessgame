export type MoveClassification = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface ReviewedMove {
  ply: number;
  notation: string;
  classification: MoveClassification;
  cpBefore: number | null;
  cpAfter: number | null;
  mateBefore: number | null;
  mateAfter: number | null;
  bestMove: string | null;
  winPercentDrop: number;
}

/**
 * Converts a centipawn score (White's perspective) into a 0-100 "win
 * percentage" for White, using the same logistic curve Lichess uses. This
 * matters because a swing from +900 to +700 is nearly meaningless (both are
 * "completely winning"), while +50 to -150 is a real turning point - a flat
 * centipawn-difference comparison (like the original project used) treats
 * both swings as equally significant, which is misleading.
 */
export function cpToWinPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function evalToWinPercent(cp: number | null, mate: number | null): number {
  if (mate != null) return mate > 0 ? 100 : 0;
  return cpToWinPercent(cp ?? 0);
}

const CLASSIFICATION_THRESHOLDS: Array<{ maxDrop: number; label: MoveClassification }> = [
  { maxDrop: 0.5, label: 'best' },
  { maxDrop: 2, label: 'excellent' },
  { maxDrop: 5, label: 'good' },
  { maxDrop: 10, label: 'inaccuracy' },
  { maxDrop: 20, label: 'mistake' },
  { maxDrop: Infinity, label: 'blunder' },
];

export function classifyMove(
  moverColor: 'white' | 'black',
  cpBefore: number | null,
  mateBefore: number | null,
  cpAfter: number | null,
  mateAfter: number | null
): { classification: MoveClassification; winPercentDrop: number } {
  const winBefore = evalToWinPercent(cpBefore, mateBefore);
  const winAfter = evalToWinPercent(cpAfter, mateAfter);

  // Both percentages are "White's win %" - flip to "mover's win %" so a drop
  // always means the move hurt the person who just played it.
  const moverWinBefore = moverColor === 'white' ? winBefore : 100 - winBefore;
  const moverWinAfter = moverColor === 'white' ? winAfter : 100 - winAfter;

  const drop = Math.max(0, moverWinBefore - moverWinAfter);
  const match = CLASSIFICATION_THRESHOLDS.find((t) => drop <= t.maxDrop)!;
  return { classification: match.label, winPercentDrop: drop };
}

/**
 * Aggregate accuracy score (0-100) for one side across a full game, using
 * the same exponential mapping Lichess uses to turn average win% loss into
 * a single "accuracy" number.
 */
export function calculateAccuracy(winPercentDrops: number[]): number {
  if (!winPercentDrops.length) return 100;
  const avgDrop = winPercentDrops.reduce((a, b) => a + b, 0) / winPercentDrops.length;
  const accuracy = 103.1668 * Math.exp(-0.04354 * avgDrop) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(accuracy * 10) / 10));
}
