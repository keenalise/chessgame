'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createInitialState, applyMove } from '@/lib/chessEngine';
import type { GameState, MoveRecord, PieceKind, Pos } from '@/lib/chessTypes';
import GameReviewPanel from '@/components/GameReviewPanel';

/** localStorage key the play page writes the game to before opening this window. */
const REVIEW_STORAGE_KEY = 'keenchess:review';

interface SerializedMove {
  from: Pos;
  to: Pos;
  promotion: PieceKind | null;
}

const centerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  color: 'var(--on-bg-muted)',
  background: 'var(--bg)',
  padding: 24,
  textAlign: 'center',
};

/**
 * Dedicated Game Review window. The play page serializes the finished game to
 * localStorage and opens this route with window.open(); here we replay those
 * moves to rebuild the exact states + move records the review needs, then show
 * the full-screen review panel.
 */
export default function ReviewPage() {
  const router = useRouter();
  const { loading } = useAuth({ requireAuth: true });
  const [rebuild, setRebuild] = useState<{ states: GameState[]; moves: MoveRecord[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = 'Game Review — KeenChess';
  }, []);

  const serialized = useMemo<SerializedMove[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.moves) ? (parsed.moves as SerializedMove[]) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!serialized || serialized.length === 0) {
      setFailed(true);
      return;
    }
    try {
      const states: GameState[] = [createInitialState()];
      const moves: MoveRecord[] = [];
      let cur = states[0];
      for (const m of serialized) {
        const res = applyMove(cur, m.from, m.to, { promotion: m.promotion ?? undefined });
        cur = res.state;
        states.push(cur);
        moves.push(res.move);
      }
      setRebuild({ states, moves });
    } catch {
      setFailed(true);
    }
  }, [loading, serialized]);

  if (loading) return <div style={centerStyle}>Loading…</div>;

  if (failed) {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 40 }}>♟️</div>
        <h2 style={{ margin: 0, color: 'var(--on-bg)' }}>No game to review</h2>
        <p style={{ margin: 0, maxWidth: 360 }}>
          Finish a game, then press <strong>Review Game</strong> to open the analysis here.
        </p>
        <button
          onClick={() => router.push('/play')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid var(--accent)',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Go to the board
        </button>
      </div>
    );
  }

  if (!rebuild) return <div style={centerStyle}>Loading review…</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <GameReviewPanel
        states={rebuild.states}
        moves={rebuild.moves}
        onJumpToPly={() => {}}
        onClose={() => window.close()}
        dismissOnBackdrop={false}
      />
    </div>
  );
}
