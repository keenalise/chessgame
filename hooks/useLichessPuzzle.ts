'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { GameState, PieceColor, Pos } from '@/lib/chessTypes';
import { applyMove, isMoveLegal, moveToUCI, parseFEN } from '@/lib/chessEngine';
import { parseUCI } from '@/lib/engineApi';

interface PuzzlePlayer {
  name?: string;
  color?: PieceColor;
}

interface RawPuzzleResponse {
  game: {
    id: string;
    pgn: string;
    players?: PuzzlePlayer[];
  };
  puzzle: {
    id: string;
    rating: number;
    initialPly: number;
    solution: string[];
    themes: string[];
  };
}

export type PuzzleFeedback = 'none' | 'correct' | 'incorrect' | 'solved';

interface UseLichessPuzzleResult {
  loading: boolean;
  error: string | null;
  state: GameState | null;
  puzzleColor: PieceColor | null;
  rating: number | null;
  themes: string[];
  feedback: PuzzleFeedback;
  attemptMove: (from: Pos, to: Pos) => void;
  showSolution: () => void;
  reload: () => void;
}

/** Converts a UCI move string like "e2e4" or "e7e8q" into chess.js's move-object shape. */
function uciToChessJsMove(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

/**
 * Fetches a Lichess puzzle (daily or "next"/random) and replays its PGN to
 * reach the actual puzzle position.
 *
 * The PGN replay itself uses chess.js rather than this project's own
 * resolveSANMove(): a puzzle's PGN can be an arbitrarily old real game with
 * every SAN edge case (multi-piece disambiguation, underpromotion, etc.),
 * and getting that 100% right is exactly the kind of thing a mature,
 * widely-used library is better suited for than a hand-rolled resolver.
 * Once the puzzle position itself is reached, control hands off to our own
 * engine (via parseFEN) for the actual interactive solving - the part that
 * only ever deals with positions our own move generator already understands.
 */
export function useLichessPuzzle(endpoint: string): UseLichessPuzzleResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [solution, setSolution] = useState<string[]>([]);
  const [nextSolutionIndex, setNextSolutionIndex] = useState(0);
  const [puzzleColor, setPuzzleColor] = useState<PieceColor | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<PuzzleFeedback>('none');
  const [reloadToken, setReloadToken] = useState(0);
  const retryCountRef = useRef(0);
  const MAX_AUTO_RETRIES = 3;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedback('none');
    try {
      const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Puzzle fetch failed: ${res.status}`);
      const data: RawPuzzleResponse = await res.json();

      const sanMoves = data.game.pgn.trim().split(/\s+/).filter(Boolean);
      const chess = new Chess();

      const pliesToReplay = data.puzzle.initialPly + 1;
      for (let i = 0; i < pliesToReplay; i++) {
        const san = sanMoves[i];
        if (!san) break;
        if (!chess.move(san)) {
          throw new Error(`This puzzle's game history could not be replayed (move ${i + 1}: "${san}").`);
        }
      }

      // solution[0] is the "setup" move that establishes the puzzle position;
      // the player is responsible for solution[1], solution[2], ...
      const setupUci = data.puzzle.solution[0];
      if (setupUci && !chess.move(uciToChessJsMove(setupUci))) {
        throw new Error(`This puzzle's setup move ("${setupUci}") was not legal in the replayed position.`);
      }

      const replayState = parseFEN(chess.fen());

      retryCountRef.current = 0;
      setState(replayState);
      setSolution(data.puzzle.solution);
      setNextSolutionIndex(1);
      setPuzzleColor(replayState.turn);
      setRating(data.puzzle.rating);
      setThemes(data.puzzle.themes || []);
    } catch (err) {
      // A single malformed puzzle shouldn't dead-end the feature - try a
      // fresh one automatically before bothering the user with an error.
      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        retryCountRef.current += 1;
        setTimeout(() => load(), 200);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, reloadToken]);

  const attemptMove = useCallback(
    (from: Pos, to: Pos) => {
      if (!state) return;
      if (!isMoveLegal(state, from, to)) return;

      const { state: nextState, move } = applyMove(state, from, to);
      const uci = moveToUCI(move);
      const expected = solution[nextSolutionIndex];

      // Compare ignoring promotion-letter case; both sides use lowercase already.
      if (expected && uci === expected) {
        setState(nextState);
        setFeedback('correct');

        const isLastMove = nextSolutionIndex + 1 >= solution.length;
        if (isLastMove) {
          setFeedback('solved');
          return;
        }

        // Auto-play the opponent's reply after a short pause.
        const replyUci = solution[nextSolutionIndex + 1];
        setTimeout(() => {
          const { from: rFrom, to: rTo, promotion } = parseUCI(replyUci);
          const promoKind =
            promotion === 'q' ? 'queen' : promotion === 'r' ? 'rook' : promotion === 'b' ? 'bishop' : promotion === 'n' ? 'knight' : undefined;
          setState((prev) => (prev ? applyMove(prev, rFrom, rTo, { promotion: promoKind }).state : prev));
          setNextSolutionIndex(nextSolutionIndex + 2);
          setFeedback('none');
        }, 500);
      } else {
        setFeedback('incorrect');
        setTimeout(() => setFeedback('none'), 800);
      }
    },
    [state, solution, nextSolutionIndex]
  );

  const showSolution = useCallback(() => {
    if (!state) return;
    let cursorState = state;
    let i = nextSolutionIndex;

    function step() {
      if (i >= solution.length) {
        setFeedback('solved');
        return;
      }
      const { from, to, promotion } = parseUCI(solution[i]);
      const promoKind =
        promotion === 'q' ? 'queen' : promotion === 'r' ? 'rook' : promotion === 'b' ? 'bishop' : promotion === 'n' ? 'knight' : undefined;
      cursorState = applyMove(cursorState, from, to, { promotion: promoKind }).state;
      setState(cursorState);
      i++;
      setTimeout(step, 500);
    }
    step();
    setNextSolutionIndex(solution.length);
  }, [state, solution, nextSolutionIndex]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { loading, error, state, puzzleColor, rating, themes, feedback, attemptMove, showSolution, reload };
}