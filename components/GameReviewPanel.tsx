'use client';

import { useEffect } from 'react';
import type { GameState, MoveRecord } from '@/lib/chessTypes';
import { useGameReview } from '@/hooks/useGameReview';
import type { MoveClassification } from '@/lib/reviewClassification';
import styles from './GameReviewPanel.module.css';

const CLASSIFICATION_LABEL: Record<MoveClassification, string> = {
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

const CLASSIFICATION_ICON: Record<MoveClassification, string> = {
  best: '★',
  excellent: '✓',
  good: '✓',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

interface GameReviewPanelProps {
  states: GameState[];
  moves: MoveRecord[];
  onJumpToPly: (ply: number) => void;
  onClose: () => void;
}

export default function GameReviewPanel({ states, moves, onJumpToPly, onClose }: GameReviewPanelProps) {
  const { reviewing, progress, reviewedMoves, whiteAccuracy, blackAccuracy, startReview, cancelReview } =
    useGameReview(states, moves);

  // Kick off automatically when the panel opens.
  useEffect(() => {
    startReview();
    return () => cancelReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Game Review</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {moves.length === 0 && <p className={styles.note}>Play some moves first, then review the game.</p>}

        {moves.length > 0 && reviewing && (
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>Analyzing position {Math.round(progress * (states.length))} / {states.length}…</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {!reviewing && reviewedMoves.length > 0 && (
          <>
            <div className={styles.accuracyRow}>
              <div className={styles.accuracyCard}>
                <span className={styles.accuracyLabel}>White accuracy</span>
                <span className={styles.accuracyValue}>{whiteAccuracy}%</span>
              </div>
              <div className={styles.accuracyCard}>
                <span className={styles.accuracyLabel}>Black accuracy</span>
                <span className={styles.accuracyValue}>{blackAccuracy}%</span>
              </div>
            </div>

            <div className={styles.moveList}>
              {reviewedMoves.map((rm) => (
                <button
                  key={rm.ply}
                  className={`${styles.moveRow} ${styles[rm.classification]}`}
                  onClick={() => onJumpToPly(rm.ply + 1)}
                >
                  <span className={styles.moveIndex}>
                    {rm.ply % 2 === 0 ? `${Math.floor(rm.ply / 2) + 1}.` : ''}
                  </span>
                  <span className={styles.moveNotation}>{rm.notation}</span>
                  <span className={styles.moveBadge}>
                    {CLASSIFICATION_ICON[rm.classification]} {CLASSIFICATION_LABEL[rm.classification]}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
