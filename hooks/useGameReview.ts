'use client';

import { useCallback, useRef, useState } from 'react';
import type { Board, GameState, MoveRecord } from '@/lib/chessTypes';
import { generateFEN, isCheckmate, isStalemate, moveToUCI } from '@/lib/chessEngine';
import { getStockfishEngine } from '@/lib/stockfishEngine';
import { calculateAccuracy, classifyMoveDetailed, type ReviewedMove } from '@/lib/reviewClassification';
import { isBookMove } from '@/lib/openingBook';

const REVIEW_DEPTH = 14;

/** Centipawn-ish values (in pawns) for material-sacrifice detection. */
const PIECE_VALUE: Record<string, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

/** Material balance of a board from White's point of view (in pawns). */
function materialBalance(board: Board): number {
  let total = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const [color, kind] = cell.split('_');
      const value = PIECE_VALUE[kind] ?? 0;
      total += color === 'white' ? value : -value;
    }
  }
  return total;
}

/** One evaluation per position, in White's perspective. */
export interface PositionEval {
  cp: number | null;
  mate: number | null;
  bestMove: string | null;
}

interface UseGameReviewResult {
  reviewing: boolean;
  progress: number; // 0..1
  reviewedMoves: ReviewedMove[];
  /** Evaluation of every position (states[i]) - length === states.length. */
  evaluations: PositionEval[];
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  startReview: () => void;
  cancelReview: () => void;
}

/**
 * Runs the Stockfish engine over every position in a finished (or in
 * progress) game and classifies each move by how much it changed the
 * mover's win probability - see lib/reviewClassification.ts for why win%
 * is used instead of a raw centipawn difference.
 */
export function useGameReview(states: GameState[], moves: MoveRecord[]): UseGameReviewResult {
  const [reviewing, setReviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reviewedMoves, setReviewedMoves] = useState<ReviewedMove[]>([]);
  const [evaluations, setEvaluations] = useState<PositionEval[]>([]);
  const [whiteAccuracy, setWhiteAccuracy] = useState<number | null>(null);
  const [blackAccuracy, setBlackAccuracy] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  const startReview = useCallback(async () => {
    if (reviewing || !moves.length) return;
    cancelledRef.current = false;
    setReviewing(true);
    setProgress(0);
    setReviewedMoves([]);
    setEvaluations([]);
    setWhiteAccuracy(null);
    setBlackAccuracy(null);

    const engine = getStockfishEngine();
    const evals: PositionEval[] = [];

    for (let i = 0; i < states.length; i++) {
      if (cancelledRef.current) return;
      const st = states[i];

      // Terminal positions have no legal moves, so the engine would just
      // reply "bestmove (none)" (or nothing at all) and stall the review.
      // Synthesize their evaluation directly instead of searching.
      if (isCheckmate(st, st.turn)) {
        // The side to move is mated. From White's perspective, a positive
        // mate means White is delivering it.
        evals.push({ cp: null, mate: st.turn === 'black' ? 1 : -1, bestMove: null });
      } else if (isStalemate(st, st.turn)) {
        evals.push({ cp: 0, mate: null, bestMove: null }); // dead equal (draw)
      } else {
        const result = await engine.evaluate(generateFEN(st), REVIEW_DEPTH);
        evals.push({ cp: result.cp, mate: result.mate, bestMove: result.bestMove });
      }
      setProgress((i + 1) / states.length);
    }

    if (cancelledRef.current) return;

    const sanNotations = moves.map((m) => m.notation);
    const results: ReviewedMove[] = [];
    const whiteDrops: number[] = [];
    const blackDrops: number[] = [];

    for (let ply = 0; ply < moves.length; ply++) {
      const move = moves[ply];
      const before = evals[ply];
      const after = evals[ply + 1];
      const moverColor = ply % 2 === 0 ? 'white' : 'black';
      const moverSign = moverColor === 'white' ? 1 : -1;

      // Material the mover sacrificed around this move: the drop in their own
      // material balance once the opponent has recaptured (states[ply+2]), so a
      // piece offered now and taken next ply registers as a sacrifice. For the
      // final move there's no reply yet, so fall back to the immediate board.
      const settledState = states[ply + 2] ?? states[ply + 1];
      const moverMatBefore = materialBalance(states[ply].board) * moverSign;
      const moverMatAfter = settledState ? materialBalance(settledState.board) * moverSign : moverMatBefore;
      const sacrifice = moverMatBefore - moverMatAfter;

      const { classification, winPercentDrop } = classifyMoveDetailed({
        moverColor,
        cpBefore: before.cp,
        mateBefore: before.mate,
        cpAfter: after.cp,
        mateAfter: after.mate,
        playedUci: moveToUCI(move),
        bestUci: before.bestMove,
        sacrifice,
        isBook: isBookMove(sanNotations, ply),
      });

      (moverColor === 'white' ? whiteDrops : blackDrops).push(winPercentDrop);

      results.push({
        ply,
        notation: move.notation,
        classification,
        cpBefore: before.cp,
        cpAfter: after.cp,
        mateBefore: before.mate,
        mateAfter: after.mate,
        bestMove: before.bestMove,
        winPercentDrop,
      });
    }

    setEvaluations(evals);
    setReviewedMoves(results);
    setWhiteAccuracy(calculateAccuracy(whiteDrops));
    setBlackAccuracy(calculateAccuracy(blackDrops));
    setReviewing(false);
  }, [states, moves, reviewing]);

  const cancelReview = useCallback(() => {
    cancelledRef.current = true;
    setReviewing(false);
  }, []);

  return { reviewing, progress, reviewedMoves, evaluations, whiteAccuracy, blackAccuracy, startReview, cancelReview };
}
