'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import EightQueensPuzzle from '@/components/EightQueensPuzzle';
import KnightTourPuzzle from '@/components/KnightTourPuzzle';
import LichessPuzzleModal from '@/components/LichessPuzzleModal';

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--on-bg-muted)',
};

const KNOWN = ['daily', 'random', 'eight-queens', 'knights-tour'] as const;

/**
 * Full-screen page for each puzzle / trainer, so every dashboard button opens
 * its own route in the same window instead of a modal layered over the
 * dashboard. Closing (the × or clicking the backdrop) returns to the dashboard.
 */
export default function PuzzlePage() {
  const router = useRouter();
  const params = useParams();
  const { loading } = useAuth({ requireAuth: true });

  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const back = () => router.push('/dashboard');

  // Unknown slug → bounce back to the dashboard (done in an effect, not render).
  useEffect(() => {
    if (!loading && (!type || !KNOWN.includes(type as (typeof KNOWN)[number]))) {
      router.replace('/dashboard');
    }
  }, [loading, type, router]);

  if (loading) return <div style={loadingStyle}>Loading…</div>;

  switch (type) {
    case 'eight-queens':
      return <EightQueensPuzzle onClose={back} />;
    case 'knights-tour':
      return <KnightTourPuzzle onClose={back} />;
    case 'daily':
      return (
        <LichessPuzzleModal
          title="Daily Puzzle"
          endpoint="https://lichess.org/api/puzzle/daily"
          onClose={back}
        />
      );
    case 'random':
      return (
        <LichessPuzzleModal
          title="Random Puzzle"
          endpoint="https://lichess.org/api/puzzle/next"
          onClose={back}
        />
      );
    default:
      return <div style={loadingStyle}>Loading…</div>;
  }
}
