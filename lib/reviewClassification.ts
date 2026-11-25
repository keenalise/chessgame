export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

/** Fixed display order (best → worst), used by legends and summaries. */
export const CLASSIFICATION_ORDER: MoveClassification[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'blunder',
];

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

/** White's win probability (0..1) for an eval - drives the evaluation bar. */
export function whiteWinFraction(cp: number | null, mate: number | null): number {
  return evalToWinPercent(cp, mate) / 100;
}

/**
 * Human-readable evaluation from White's perspective, chess.com style:
 * "+1.3", "-0.8", "M3" (White mates), "-M2" (Black mates), "0.0" when unknown.
 */
export function formatEval(cp: number | null, mate: number | null): string {
  if (mate != null) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  if (cp == null) return '0.0';
  const pawns = cp / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

// Base thresholds for the six "quality" tiers, by how much win% the move lost.
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

export interface DetailedClassificationInput {
  moverColor: 'white' | 'black';
  cpBefore: number | null;
  mateBefore: number | null;
  cpAfter: number | null;
  mateAfter: number | null;
  /** UCI of the move actually played. */
  playedUci: string | null;
  /** UCI of the engine's best move in the position before this move. */
  bestUci: string | null;
  /**
   * Material (in pawns) the mover gave up around this move - measured as the
   * drop in the mover's material balance once the opponent has replied.
   * Positive means a sacrifice; <= 0 means they didn't lose material.
   */
  sacrifice: number;
  /** Whether this move is still following the opening book. */
  isBook: boolean;
}

/**
 * Full chess.com-style classification. Starts from the six quality tiers, then
 * layers on the three "special" labels:
 *
 *  - book:      the move is known opening theory.
 *  - brilliant: a top move that sacrifices real material (>= an exchange) while
 *               keeping the position sound, from a position that wasn't already
 *               completely winning.
 *  - great:     the engine's single best move found in a balanced / slightly
 *               worse position - an approximation of chess.com's "only move".
 *
 * NOTE: brilliant/great are necessarily heuristic here. The engine returns a
 * single principal variation (no multi-PV), so we can't measure the gap to the
 * second-best move the way chess.com does; we approximate "only move" via the
 * position being balanced and the played move matching the engine's best.
 */
export function classifyMoveDetailed(input: DetailedClassificationInput): {
  classification: MoveClassification;
  winPercentDrop: number;
} {
  const { moverColor, cpBefore, mateBefore, cpAfter, mateAfter, playedUci, bestUci, sacrifice, isBook } = input;
  const base = classifyMove(moverColor, cpBefore, mateBefore, cpAfter, mateAfter);

  if (isBook) return { classification: 'book', winPercentDrop: base.winPercentDrop };

  const winBefore = evalToWinPercent(cpBefore, mateBefore);
  const winAfter = evalToWinPercent(cpAfter, mateAfter);
  const moverWinBefore = moverColor === 'white' ? winBefore : 100 - winBefore;
  const moverWinAfter = moverColor === 'white' ? winAfter : 100 - winAfter;

  const playedBest = !!playedUci && !!bestUci && playedUci === bestUci;
  const topTier = base.classification === 'best' || base.classification === 'excellent';

  // Brilliant: a strong move that sacrifices >= an exchange yet keeps the mover
  // at least equal, and wasn't played from an already-crushing position.
  if (topTier && sacrifice >= 1.5 && moverWinAfter >= 48 && moverWinBefore <= 88) {
    return { classification: 'brilliant', winPercentDrop: base.winPercentDrop };
  }

  // Great: the one precise best move in a roughly balanced / slightly worse
  // position (and not itself a sacrifice, which would be brilliant instead).
  const balanced = mateBefore == null && Math.abs(cpBefore ?? 0) <= 110;
  if (
    playedBest &&
    base.classification === 'best' &&
    balanced &&
    sacrifice < 1.5 &&
    moverWinBefore >= 30 &&
    moverWinBefore <= 62
  ) {
    return { classification: 'great', winPercentDrop: base.winPercentDrop };
  }

  return base;
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
