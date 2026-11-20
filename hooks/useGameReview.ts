'use client';

import { useCallback, useRef, useState } from 'react';
import type { GameState, MoveRecord } from '@/lib/chessTypes';
import { generateFEN, isCheckmate, isStalemate } from '@/lib/chessEngine';
import { getStockfishEngine } from '@/lib/stockfishEngine';
import { calculateAccuracy, classifyMove, type ReviewedMove } from '@/lib/reviewClassification';

const REVIEW_DEPTH = 14;

interface UseGameReviewResult {
  reviewing: boolean;
  progress: number; // 0..1
  reviewedMoves: ReviewedMove[];
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
  const [whiteAccuracy, setWhiteAccuracy] = useState<number | null>(null);
  const [blackAccuracy, setBlackAccuracy] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  const startReview = useCallback(async () => {
    if (reviewing || !moves.length) return;
    cancelledRef.current = false;
    setReviewing(true);
    setProgress(0);
    setReviewedMoves([]);
    setWhiteAccuracy(null);
    setBlackAccuracy(null);

    const engine = getStockfishEngine();
    const evaluations: Array<{ cp: number | null; mate: number | null }> = [];

    for (let i = 0; i < states.length; i++) {
      if (cancelledRef.current) return;
      const st = states[i];

      // Terminal positions have no legal moves, so the engine would just
      // reply "bestmove (none)" (or nothing at all) and stall the review.
      // Synthesize their evaluation directly instead of searching.
      if (isCheckmate(st, st.turn)) {
        // The side to move is mated. From White's perspective, a positive
        // mate means White is delivering it.
        evaluations.push({ cp: null, mate: st.turn === 'black' ? 1 : -1 });
      } else if (isStalemate(st, st.turn)) {
        evaluations.push({ cp: 0, mate: null }); // dead equal (draw)
      } else {
        const result = await engine.evaluate(generateFEN(st), REVIEW_DEPTH);
        evaluations.push({ cp: result.cp, mate: result.mate });
      }
      setProgress((i + 1) / states.length);
    }

    if (cancelledRef.current) return;

    const results: ReviewedMove[] = [];
    const whiteDrops: number[] = [];
    const blackDrops: number[] = [];

    for (let ply = 0; ply < moves.length; ply++) {
      const move = moves[ply];
      const before = evaluations[ply];
      const after = evaluations[ply + 1];
      const moverColor = ply % 2 === 0 ? 'white' : 'black';

      const { classification, winPercentDrop } = classifyMove(
        moverColor,
        before.cp,
        before.mate,
        after.cp,
        after.mate
      );

      (moverColor === 'white' ? whiteDrops : blackDrops).push(winPercentDrop);

      results.push({
        ply,
        notation: move.notation,
        classification,
        cpBefore: before.cp,
        cpAfter: after.cp,
        mateBefore: before.mate,
        mateAfter: after.mate,
        bestMove: null,
        winPercentDrop,
      });
    }

    setReviewedMoves(results);
    setWhiteAccuracy(calculateAccuracy(whiteDrops));
    setBlackAccuracy(calculateAccuracy(blackDrops));
    setReviewing(false);
  }, [states, moves, reviewing]);

  const cancelReview = useCallback(() => {
    cancelledRef.current = true;
    setReviewing(false);
  }, []);

  return { reviewing, progress, reviewedMoves, whiteAccuracy, blackAccuracy, startReview, cancelReview };
}
