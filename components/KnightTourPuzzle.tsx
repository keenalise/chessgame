'use client';

import { useRef, useState } from 'react';
import styles from './PuzzleModal.module.css';

const KNIGHT_DELTAS: Array<[number, number]> = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

/** Warnsdorff's-heuristic-free plain backtracking solver, starting from (startRow, startCol). */
function solveKnightTour(startRow: number, startCol: number): Array<[number, number]> | null {
  const visited: number[][] = Array.from({ length: 8 }, () => new Array(8).fill(-1));
  const path: Array<[number, number]> = [[startRow, startCol]];
  visited[startRow][startCol] = 0;

  function bt(row: number, col: number, moveNum: number): boolean {
    if (moveNum === 64) return true;

    // Order candidate moves by Warnsdorff's rule (fewest onward moves first)
    // to keep plain backtracking fast enough to run on the main thread.
    const candidates = KNIGHT_DELTAS.map(([dr, dc]) => [row + dr, col + dc] as [number, number])
      .filter(([r, c]) => isOnBoard(r, c) && visited[r][c] === -1)
      .map((pos) => {
        const onwardCount = KNIGHT_DELTAS.filter(([dr, dc]) => {
          const r2 = pos[0] + dr;
          const c2 = pos[1] + dc;
          return isOnBoard(r2, c2) && visited[r2][c2] === -1;
        }).length;
        return { pos, onwardCount };
      })
      .sort((a, b) => a.onwardCount - b.onwardCount);

    for (const { pos } of candidates) {
      const [r, c] = pos;
      visited[r][c] = moveNum;
      path.push([r, c]);
      if (bt(r, c, moveNum + 1)) return true;
      path.pop();
      visited[r][c] = -1;
    }
    return false;
  }

  const solved = bt(startRow, startCol, 1);
  return solved ? path : null;
}

interface KnightTourPuzzleProps {
  onClose: () => void;
}

export default function KnightTourPuzzle({ onClose }: KnightTourPuzzleProps) {
  const [visitOrder, setVisitOrder] = useState<number[][]>(() =>
    Array.from({ length: 8 }, () => new Array(8).fill(-1))
  );
  const [knightPos, setKnightPos] = useState<[number, number] | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [solving, setSolving] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reset() {
    if (animTimer.current) clearTimeout(animTimer.current);
    setVisitOrder(Array.from({ length: 8 }, () => new Array(8).fill(-1)));
    setKnightPos(null);
    setMoveCount(0);
    setSolving(false);
  }

  function isLegalKnightMove(row: number, col: number): boolean {
    if (!knightPos) return true; // first placement can go anywhere
    const [kr, kc] = knightPos;
    const rowDiff = Math.abs(kr - row);
    const colDiff = Math.abs(kc - col);
    const isKnightShape = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    return isKnightShape && visitOrder[row][col] === -1;
  }

  function handleSquareClick(row: number, col: number) {
    if (solving) return;
    if (!isLegalKnightMove(row, col)) return;

    const nextOrder = visitOrder.map((r) => r.slice());
    nextOrder[row][col] = moveCount;
    setVisitOrder(nextOrder);
    setKnightPos([row, col]);
    setMoveCount((m) => m + 1);
  }

  function animateSolution(path: Array<[number, number]>) {
    setSolving(true);
    const nextOrder = Array.from({ length: 8 }, () => new Array(8).fill(-1));
    let i = 0;

    function step() {
      const [r, c] = path[i];
      nextOrder[r][c] = i;
      setVisitOrder(nextOrder.map((row) => row.slice()));
      setKnightPos([r, c]);
      setMoveCount(i + 1);
      i++;
      if (i < path.length) {
        animTimer.current = setTimeout(step, 120);
      } else {
        setSolving(false);
      }
    }
    step();
  }

  function handleSolve() {
    const start = knightPos ?? [0, 0];
    const solution = solveKnightTour(start[0], start[1]);
    if (!solution) {
      alert('No solution found from this starting square (unexpected - please reset and try again).');
      return;
    }
    animateSolution(solution);
  }

  const isComplete = moveCount === 64;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Knight&apos;s Tour</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <p className={styles.instructions}>
          Move the knight to visit every square exactly once. Click a square to place the knight, then click legal
          knight-move squares to continue.
        </p>

        <div className={styles.puzzleBoard}>
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => {
              const visitedAt = visitOrder[row][col];
              const isKnightHere = knightPos?.[0] === row && knightPos?.[1] === col;
              const isDark = (row + col) % 2 === 1;
              const isLegal = !solving && isLegalKnightMove(row, col);
              return (
                <div
                  key={`${row}-${col}`}
                  className={[
                    styles.puzzleSquare,
                    isDark ? styles.dark : styles.light,
                    isLegal && knightPos ? styles.legalHint : '',
                  ].join(' ')}
                  onClick={() => handleSquareClick(row, col)}
                >
                  {isKnightHere ? '♞' : visitedAt !== -1 ? visitedAt + 1 : ''}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.puzzleStatus}>
          {moveCount}/64 squares visited
          {isComplete && ' — Tour complete! 🎉'}
        </div>

        <div className={styles.puzzleActions}>
          <button className={styles.actionBtn} onClick={reset} disabled={solving}>
            Reset
          </button>
          <button className={styles.actionBtn} onClick={handleSolve} disabled={solving || isComplete}>
            {solving ? 'Solving…' : 'Auto-Solve from Here'}
          </button>
        </div>
      </div>
    </div>
  );
}
