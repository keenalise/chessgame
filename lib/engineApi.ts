import type { GameState } from './chessTypes';
import { getLegalDestinations } from './chessEngine';

/**
 * Best-effort "what should I play here" lookup, in three tiers:
 *  1. Lichess cloud eval - instant, but only knows previously-analyzed positions
 *  2. chess-api.com over WebSocket - short timeout, analyzes on demand
 *  3. A random legal move - guarantees the game never gets stuck
 *
 * Returns a UCI move string (e.g. "e2e4", "e7e8q") or null if truly no
 * legal move exists (checkmate/stalemate - callers should check that first).
 */
export async function fetchBestMove(fen: string, state: GameState, depth = 12): Promise<string | null> {
  const fromLichess = await fetchFromLichessCloudEval(fen);
  if (fromLichess) return fromLichess;

  const fromChessApi = await fetchFromChessApi(fen, depth);
  if (fromChessApi) return fromChessApi;

  return getRandomLegalMoveUCI(state);
}

async function fetchFromLichessCloudEval(fen: string): Promise<string | null> {
  try {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const firstMove: string | undefined = data?.pvs?.[0]?.moves?.split(' ')?.[0];
    return firstMove ?? null;
  } catch {
    return null;
  }
}

function fetchFromChessApi(fen: string, depth: number): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket('wss://chess-api.com/v1');
    } catch {
      resolve(null);
      return;
    }

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(value);
    };

    const timeout = setTimeout(() => finish(null), 2000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ fen, depth, maxThinkingTime: 50 }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'log' || data.type === 'info') return;
        if (data.move || data.lan) finish(data.move || data.lan);
      } catch {
        finish(null);
      }
    };

    ws.onerror = () => finish(null);
  });
}

function getRandomLegalMoveUCI(state: GameState): string | null {
  const moves: string[] = [];
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const squareName = (row: number, col: number) => `${FILES[col]}${8 - row}`;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (!piece) continue;
      const dests = getLegalDestinations(state, { row, col });
      dests.forEach((dest) => {
        moves.push(`${squareName(row, col)}${squareName(dest.row, dest.col)}`);
      });
    }
  }

  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Parses a UCI string like "e2e4" or "e7e8q" into board coordinates + promotion. */
export function parseUCI(uci: string): { from: { row: number; col: number }; to: { row: number; col: number }; promotion?: string } {
  const files = 'abcdefgh';
  const fromCol = files.indexOf(uci[0]);
  const fromRow = 8 - parseInt(uci[1], 10);
  const toCol = files.indexOf(uci[2]);
  const toRow = 8 - parseInt(uci[3], 10);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, promotion };
}
