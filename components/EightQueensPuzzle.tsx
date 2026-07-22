'use client';

import { useMemo, useState } from 'react';
import styles from './PuzzleModal.module.css';

function solveAllEightQueens(): number[][] {
  const solutions: number[][] = [];
  const cols: number[] = new Array(8).fill(-1);

  function isSafe(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      const c = cols[r];
      if (c === col || Math.abs(c - col) === row - r) return false;
    }
    return true;
  }

  function place(row: number) {
    if (row === 8) {
      solutions.push([...cols]);
      return;
    }
    for (let col = 0; col < 8; col++) {
      if (isSafe(row, col)) {
        cols[row] = col;
        place(row + 1);
        cols[row] = -1;
      }
    }
  }

  place(0);
  return solutions;
}

function countAttacks(state: number[]): Set<string> {
  const conflicts = new Set<string>();
  for (let r1 = 0; r1 < 8; r1++) {
    if (state[r1] === -1) continue;
    for (let r2 = r1 + 1; r2 < 8; r2++) {
      if (state[r2] === -1) continue;
      const c1 = state[r1];
      const c2 = state[r2];
      if (c1 === c2 || Math.abs(c1 - c2) === r2 - r1) {
        conflicts.add(`${r1},${c1}`);
        conflicts.add(`${r2},${c2}`);
      }
    }
  }
  return conflicts;
}

interface EightQueensPuzzleProps {
  onClose: () => void;
}

export default function EightQueensPuzzle({ onClose }: EightQueensPuzzleProps) {
  const [state, setState] = useState<number[]>(() => new Array(8).fill(-1));
  const [solutions, setSolutions] = useState<number[][] | null>(null);
  const [solutionIndex, setSolutionIndex] = useState(0);

  const conflicts = useMemo(() => countAttacks(state), [state]);
  const queenCount = state.filter((c) => c !== -1).length;
  const isSolved = queenCount === 8 && conflicts.size === 0;

  function toggleQueen(row: number, col: number) {
    setState((prev) => {
      const next = [...prev];
      next[row] = next[row] === col ? -1 : col;
      return next;
    });
    setSolutions(null);
  }

  function clearBoard() {
    setState(new Array(8).fill(-1));
    setSolutions(null);
  }

  function showAllSolutions() {
    const all = solveAllEightQueens();
    setSolutions(all);
    setSolutionIndex(0);
    setState(all[0]);
  }

  function browseSolution(delta: number) {
    if (!solutions) return;
    const next = (solutionIndex + delta + solutions.length) % solutions.length;
    setSolutionIndex(next);
    setState(solutions[next]);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>8 Queens Puzzle</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <p className={styles.instructions}>
          Place 8 queens so none attack each other. Click a square to place/remove a queen.
        </p>

        <div className={styles.puzzleBoard}>
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => {
              const hasQueen = state[row] === col;
              const isConflict = hasQueen && conflicts.has(`${row},${col}`);
              const isDark = (row + col) % 2 === 1;
              return (
                <div
                  key={`${row}-${col}`}
                  className={[
                    styles.puzzleSquare,
                    isDark ? styles.dark : styles.light,
                    isConflict ? styles.conflict : '',
                  ].join(' ')}
                  onClick={() => toggleQueen(row, col)}
                >
                  {hasQueen ? '♛' : ''}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.puzzleStatus}>
          {queenCount}/8 queens placed
          {queenCount === 8 && (isSolved ? ' — Solved! 🎉' : ' — queens are attacking each other')}
        </div>

        <div className={styles.puzzleActions}>
          <button className={styles.actionBtn} onClick={clearBoard}>
            Clear
          </button>
          <button className={styles.actionBtn} onClick={showAllSolutions}>
            Show All Solutions (92)
          </button>
        </div>

        {solutions && (
          <div className={styles.solutionNav}>
            <button className={styles.actionBtn} onClick={() => browseSolution(-1)}>
              ◀ Prev
            </button>
            <span>
              Solution {solutionIndex + 1} / {solutions.length}
            </span>
            <button className={styles.actionBtn} onClick={() => browseSolution(1)}>
              Next ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
