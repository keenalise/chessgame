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
    fen?: string;
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
  /** The square of the piece the solver should move next, or null if solved. */
  hintSquare: Pos | null;
  attemptMove: (from: Pos, to: Pos) => void;
  showSolution: () => void;
  reload: () => void;
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

      // The puzzle position is the one the solver actually faces (it is their
      // move). The API provides it directly as puzzle.fen, so start from there.
      // The solver then plays solution[0], the opponent replies with
      // solution[1], the solver plays solution[2], and so on.
      let puzzleState: GameState;
      if (data.puzzle.fen) {
        puzzleState = parseFEN(data.puzzle.fen);
      } else {
        // Fallback for older responses without a fen: replay the game PGN to
        // the puzzle position (initialPly + 1 plies). We do NOT apply any
        // solution move here — solution[0] is the solver's first move.
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
        puzzleState = parseFEN(chess.fen());
      }

      retryCountRef.current = 0;
      setState(puzzleState);
      setSolution(data.puzzle.solution);
      setNextSolutionIndex(0); // the solver plays solution[0] first
      setPuzzleColor(puzzleState.turn);
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

      const expected = solution[nextSolutionIndex];
      // If the solution is a promotion (e.g. "g7g8q" or an underpromotion),
      // promote to the piece it specifies; applyMove defaults to queen otherwise.
      const expectedPromo = expected && expected.length > 4 ? expected[4] : undefined;
      const promoKind =
        expectedPromo === 'r' ? 'rook' : expectedPromo === 'b' ? 'bishop' : expectedPromo === 'n' ? 'knight' : expectedPromo === 'q' ? 'queen' : undefined;

      const { state: nextState, move } = applyMove(state, from, to, { promotion: promoKind });
      const uci = moveToUCI(move);

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
        // Legal, but not the solution move. Play it on the board so the user
        // actually sees their move, flag it as wrong, then take it back after a
        // moment so they can try again (the usual puzzle-trainer behavior).
        const prevState = state;
        setState(nextState);
        setFeedback('incorrect');
        setTimeout(() => {
          setState(prevState);
          setFeedback('none');
        }, 1200);
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

  // The piece to move for the next solution step - the "from" square of the
  // move the solver is expected to play. Used to power the Hint button.
  const hintSquare: Pos | null =
    nextSolutionIndex < solution.length ? parseUCI(solution[nextSolutionIndex]).from : null;

  return { loading, error, state, puzzleColor, rating, themes, feedback, hintSquare, attemptMove, showSolution, reload };
}