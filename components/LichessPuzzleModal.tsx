'use client';

import { useState } from 'react';
import { getLegalDestinations } from '@/lib/chessEngine';
import { pieceImageUrl } from '@/lib/chessTypes';
import type { Pos } from '@/lib/chessTypes';
import { useLichessPuzzle } from '@/hooks/useLichessPuzzle';
import styles from './PuzzleModal.module.css';

interface LichessPuzzleModalProps {
  title: string;
  endpoint: string;
  onClose: () => void;
}

export default function LichessPuzzleModal({ title, endpoint, onClose }: LichessPuzzleModalProps) {
  const { loading, error, state, puzzleColor, rating, feedback, attemptMove, showSolution, reload } =
    useLichessPuzzle(endpoint);
  const [selected, setSelected] = useState<Pos | null>(null);

  const legalDestinations = state && selected ? getLegalDestinations(state, selected) : [];

  function handleSquareClick(pos: Pos) {
    if (!state || feedback === 'solved') return;
    if (state.turn !== puzzleColor) return; // not the puzzle-solver's turn (mid-animation)

    if (selected && legalDestinations.some((d) => d.row === pos.row && d.col === pos.col)) {
      attemptMove(selected, pos);
      setSelected(null);
      return;
    }

    const piece = state.board[pos.row][pos.col];
    setSelected(piece && piece.startsWith(state.turn) ? pos : null);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {loading && <p className={styles.instructions}>Loading puzzle…</p>}
        {error && <p className={styles.instructions}>Could not load puzzle: {error}</p>}

        {!loading && !error && state && (
          <>
            <p className={styles.instructions}>
              {puzzleColor === 'white' ? 'White' : 'Black'} to move{rating ? ` · rated ${rating}` : ''}
            </p>

            <div className={styles.puzzleBoard}>
              {state.board.map((row, r) =>
                row.map((piece, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isSelected = selected?.row === r && selected?.col === c;
                  const isLegal = legalDestinations.some((d) => d.row === r && d.col === c);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={[
                        styles.puzzleSquare,
                        isDark ? styles.dark : styles.light,
                        isSelected ? styles.legalHint : '',
                      ].join(' ')}
                      onClick={() => handleSquareClick({ row: r, col: c })}
                    >
                      {isLegal && !piece && <span style={{ opacity: 0.35 }}>•</span>}
                      {piece && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pieceImageUrl(piece)}
                          alt={piece}
                          style={{ width: '82%', height: '82%', pointerEvents: 'none' }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.puzzleStatus}>
              {feedback === 'correct' && 'Correct! ✓'}
              {feedback === 'incorrect' && 'Not quite — try again'}
              {feedback === 'solved' && 'Puzzle solved! 🎉'}
              {feedback === 'none' && '\u00A0'}
            </div>

            <div className={styles.puzzleActions}>
              <button className={styles.actionBtn} onClick={showSolution} disabled={feedback === 'solved'}>
                Show Solution
              </button>
              <button className={styles.actionBtn} onClick={reload}>
                New Puzzle
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
