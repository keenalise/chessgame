'use client';

import { useCallback, useMemo, useState } from 'react';
import type { GameState, MoveRecord, PieceColor, PieceKind, Pos } from '@/lib/chessTypes';
import {
  applyMove,
  createInitialState,
  generateFEN,
  getLegalDestinations,
  isCheckmate,
  isFiftyMoveRule,
  isMoveLegal,
  isStalemate,
  moveToUCI,
  positionKey,
} from '@/lib/chessEngine';
import { fetchBestMove, parseUCI } from '@/lib/engineApi';

interface HistoryEntry {
  state: GameState;
  move: MoveRecord | null;
}

interface PendingPromotion {
  from: Pos;
  to: Pos;
}

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'check'; color: PieceColor }
  | { kind: 'checkmate'; winner: PieceColor }
  | { kind: 'stalemate' }
  | { kind: 'draw'; reason: 'fifty-move' | 'threefold-repetition' };

export function useChessGame() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => [{ state: createInitialState(), move: null }]);
  const [cursor, setCursor] = useState(0); // index into history - lets you scrub back/forward
  const [selected, setSelected] = useState<Pos | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const [isVsComputer, setIsVsComputer] = useState(false);
  const [playerColor, setPlayerColor] = useState<PieceColor>('white');
  const [aiThinking, setAiThinking] = useState(false);

  const state = history[cursor].state;
  const isAtLivePosition = cursor === history.length - 1;

  const status: GameStatus = useMemo(() => {
    if (isCheckmate(state, state.turn)) {
      return { kind: 'checkmate', winner: state.turn === 'white' ? 'black' : 'white' };
    }
    if (isStalemate(state, state.turn)) return { kind: 'stalemate' };
    if (isFiftyMoveRule(state)) return { kind: 'draw', reason: 'fifty-move' };

    const currentKey = positionKey(state);
    let repetitions = 0;
    for (let i = 0; i <= cursor; i++) {
      if (positionKey(history[i].state) === currentKey) repetitions++;
      if (repetitions >= 3) break;
    }
    if (repetitions >= 3) return { kind: 'draw', reason: 'threefold-repetition' };

    return { kind: 'playing' };
  }, [state, history, cursor]);

  const legalDestinations = useMemo(() => {
    if (!selected) return [];
    return getLegalDestinations(state, selected);
  }, [state, selected]);

  const selectSquare = useCallback(
    (pos: Pos) => {
      if (!isAtLivePosition || pendingPromotion) return;
      const piece = state.board[pos.row][pos.col];

      // Clicking a legal destination for the currently-selected piece: make the move.
      if (selected && legalDestinations.some((d) => d.row === pos.row && d.col === pos.col)) {
        const movingPiece = state.board[selected.row][selected.col];
        const isPromotionMove =
          movingPiece &&
          movingPiece.endsWith('pawn') &&
          (pos.row === 0 || pos.row === 7);

        if (isPromotionMove) {
          setPendingPromotion({ from: selected, to: pos });
          setSelected(null);
          return;
        }

        commitMove(selected, pos);
        return;
      }

      // Otherwise, (re)select if it's the current player's own piece.
      if (piece && piece.startsWith(state.turn)) {
        setSelected(pos);
      } else {
        setSelected(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, selected, legalDestinations, isAtLivePosition, pendingPromotion]
  );

  const commitMove = useCallback(
    (from: Pos, to: Pos, promotion?: PieceKind) => {
      if (!isMoveLegal(state, from, to)) return;
      const { state: nextState, move } = applyMove(state, from, to, { promotion });

      setHistory((prev) => {
        const truncated = prev.slice(0, cursor + 1);
        return [...truncated, { state: nextState, move }];
      });
      setCursor((c) => c + 1);
      setSelected(null);
      setPendingPromotion(null);
    },
    [state, cursor]
  );

  const resolvePromotion = useCallback(
    (promotion: PieceKind) => {
      if (!pendingPromotion) return;
      commitMove(pendingPromotion.from, pendingPromotion.to, promotion);
    },
    [pendingPromotion, commitMove]
  );

  const cancelPromotion = useCallback(() => setPendingPromotion(null), []);

  const undo = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);
  const redo = useCallback(() => setCursor((c) => Math.min(history.length - 1, c + 1)), [history.length]);
  const goToStart = useCallback(() => setCursor(0), []);
  const goToLive = useCallback(() => setCursor(history.length - 1), [history.length]);
  const goToIndex = useCallback((index: number) => setCursor(Math.max(0, Math.min(history.length - 1, index))), [
    history.length,
  ]);

  const newGame = useCallback(() => {
    setHistory([{ state: createInitialState(), move: null }]);
    setCursor(0);
    setSelected(null);
    setPendingPromotion(null);
    setAiThinking(false);
  }, []);

  const toggleVsComputer = useCallback(() => {
    setIsVsComputer((prev) => {
      const next = !prev;
      if (next) setPlayerColor(state.turn);
      return next;
    });
  }, [state.turn]);

  /** Call this after every human move (or on mount) to let the AI respond if it's its turn. */
  const maybeLetAIMove = useCallback(async () => {
    if (!isVsComputer) return;
    if (aiThinking) return;
    if (state.turn === playerColor) return;
    if (isCheckmate(state, state.turn) || isStalemate(state, state.turn)) return;

    setAiThinking(true);
    try {
      const fen = generateFEN(state);
      const uci = await fetchBestMove(fen, state);
      if (!uci) return;
      const { from, to, promotion } = parseUCI(uci);
      const promoKind: PieceKind | undefined =
        promotion === 'q'
          ? 'queen'
          : promotion === 'r'
          ? 'rook'
          : promotion === 'b'
          ? 'bishop'
          : promotion === 'n'
          ? 'knight'
          : undefined;
      if (isMoveLegal(state, from, to)) {
        commitMove(from, to, promoKind);
      }
    } finally {
      setAiThinking(false);
    }
  }, [isVsComputer, aiThinking, playerColor, state, commitMove]);

  const moveHistory = useMemo(() => history.slice(1).map((entry) => entry.move as MoveRecord), [history]);
  const states = useMemo(() => history.map((entry) => entry.state), [history]);
  const fen = useMemo(() => generateFEN(state), [state]);
  const uciMoveHistory = useMemo(() => moveHistory.map(moveToUCI), [moveHistory]);

  return {
    state,
    fen,
    status,
    selected,
    legalDestinations,
    pendingPromotion,
    moveHistory,
    states,
    uciMoveHistory,
    isAtLivePosition,
    cursor,
    historyLength: history.length,

    isVsComputer,
    playerColor,
    aiThinking,

    selectSquare,
    resolvePromotion,
    cancelPromotion,
    undo,
    redo,
    goToStart,
    goToLive,
    goToIndex,
    newGame,
    toggleVsComputer,
    maybeLetAIMove,
  };
}
