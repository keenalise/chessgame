'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, MoveRecord, Piece, Pos } from '@/lib/chessTypes';
import { pieceImageUrl } from '@/lib/chessTypes';
import { useGameReview } from '@/hooks/useGameReview';
import {
  CLASSIFICATION_ORDER,
  formatEval,
  whiteWinFraction,
  type MoveClassification,
} from '@/lib/reviewClassification';
import { playChessSound } from '@/lib/chessSounds';
import styles from './GameReviewPanel.module.css';

const CLASSIFICATION_LABEL: Record<MoveClassification, string> = {
  brilliant: 'Brilliant',
  great: 'Great',
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  book: 'Book',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

// Short glyphs shown inside the little coloured move badges (chess.com uses
// its own icon set; these are the closest legible text equivalents).
const CLASSIFICATION_GLYPH: Record<MoveClassification, string> = {
  brilliant: '!!',
  great: '!',
  best: '★',
  excellent: '✓',
  good: '✓',
  book: '◉',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

const ICON_CLASS: Record<MoveClassification, string> = {
  brilliant: styles.iconBrilliant,
  great: styles.iconGreat,
  best: styles.iconBest,
  excellent: styles.iconExcellent,
  good: styles.iconGood,
  book: styles.iconBook,
  inaccuracy: styles.iconInaccuracy,
  mistake: styles.iconMistake,
  blunder: styles.iconBlunder,
};

// Annotation colours, keyed the chess.com way: plain drag = green, with a
// modifier held = red / blue / yellow.
const ANNOTATION_COLORS = {
  green: '#15781b',
  red: '#882020',
  blue: '#003088',
  yellow: '#e68f00',
} as const;
type AnnotationColor = (typeof ANNOTATION_COLORS)[keyof typeof ANNOTATION_COLORS];

interface Arrow {
  from: Pos;
  to: Pos;
  color: AnnotationColor;
}
interface Highlight {
  pos: Pos;
  color: AnnotationColor;
}

function annotationColor(e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): AnnotationColor {
  if (e.shiftKey) return ANNOTATION_COLORS.red;
  if (e.altKey) return ANNOTATION_COLORS.blue;
  if (e.ctrlKey || e.metaKey) return ANNOTATION_COLORS.yellow;
  return ANNOTATION_COLORS.green;
}

/** Arrow geometry in "square units" (each board square is 1x1, viewBox 0 0 8 8). */
function arrowGeometry(from: Pos, to: Pos) {
  const fx = from.col + 0.5;
  const fy = from.row + 0.5;
  const tx = to.col + 0.5;
  const ty = to.row + 0.5;
  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = 0.34;
  const headHalf = 0.19;
  const startGap = 0.1;
  const bx = tx - ux * headLen; // base of the arrowhead
  const by = ty - uy * headLen;
  const sx = fx + ux * startGap; // shaft start, a touch out from the source centre
  const sy = fy + uy * startGap;
  const px = -uy; // perpendicular
  const py = ux;
  const headPoints = `${tx},${ty} ${bx + px * headHalf},${by + py * headHalf} ${bx - px * headHalf},${by - py * headHalf}`;
  return { sx, sy, bx, by, headPoints };
}

function ClassIcon({ c, size = 'sm' }: { c: MoveClassification; size?: 'sm' | 'lg' }) {
  return (
    <span className={`${styles.icon} ${ICON_CLASS[c]} ${size === 'lg' ? styles.iconLg : ''}`}>
      {CLASSIFICATION_GLYPH[c]}
    </span>
  );
}

/** "e2e4" -> "e2 → e4", "g7g8q" -> "g7 → g8=Q". */
function formatUci(uci: string | null): string {
  if (!uci || uci.length < 4) return '—';
  const promo = uci.length > 4 ? `=${uci[4].toUpperCase()}` : '';
  return `${uci.slice(0, 2)} → ${uci.slice(2, 4)}${promo}`;
}

interface GameReviewPanelProps {
  states: GameState[];
  moves: MoveRecord[];
  onJumpToPly: (ply: number) => void;
  onClose: () => void;
  /** When false, clicking the backdrop does not close (used for the dedicated review window). */
  dismissOnBackdrop?: boolean;
}

export default function GameReviewPanel({
  states,
  moves,
  onJumpToPly,
  onClose,
  dismissOnBackdrop = true,
}: GameReviewPanelProps) {
  const { reviewing, progress, reviewedMoves, evaluations, whiteAccuracy, blackAccuracy, startReview, cancelReview } =
    useGameReview(states, moves);

  // Which position (0..states.length-1) the board/eval bar currently shows.
  const [displayPly, setDisplayPly] = useState(states.length - 1);
  const displayPlyRef = useRef(displayPly);
  displayPlyRef.current = displayPly;

  // Right-click annotations (arrows + square highlights), kept PER position so
  // stepping back to a move restores whatever you drew on it.
  const [arrowsByPly, setArrowsByPly] = useState<Record<number, Arrow[]>>({});
  const [highlightsByPly, setHighlightsByPly] = useState<Record<number, Highlight[]>>({});
  const dragStart = useRef<Pos | null>(null);
  const arrows = arrowsByPly[displayPly] ?? [];
  const highlights = highlightsByPly[displayPly] ?? [];

  // Kick off automatically when the panel opens.
  useEffect(() => {
    startReview();
    return () => cancelReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jump to the end once the review finishes so the eval bar shows the result.
  useEffect(() => {
    if (!reviewing && reviewedMoves.length > 0) setDisplayPly(states.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewing]);

  function playNavSound(ply: number) {
    if (ply <= 0) return;
    const mv = moves[ply - 1];
    if (!mv) return;
    const type =
      mv.isCheck || mv.isCheckmate
        ? 'check'
        : mv.isCapture || mv.isEnPassant
        ? 'capture'
        : mv.isCastle
        ? 'castle'
        : 'move';
    playChessSound(type);
  }

  function goTo(ply: number) {
    const clamped = Math.max(0, Math.min(states.length - 1, ply));
    if (clamped !== displayPlyRef.current) playNavSound(clamped);
    displayPlyRef.current = clamped; // keep the ref ahead of the render for rapid key-repeat
    setDisplayPly(clamped);
    onJumpToPly(clamped); // keep the underlying game board in sync
  }

  // Arrow-key navigation (chess.com-style): ←/→ step, ↑/↓ jump to start/end.
  useEffect(() => {
    if (reviewing || reviewedMoves.length === 0) return;
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goTo(displayPlyRef.current - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          goTo(displayPlyRef.current + 1);
          break;
        case 'ArrowUp':
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'ArrowDown':
        case 'End':
          e.preventDefault();
          goTo(states.length - 1);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewing, reviewedMoves.length, states.length]);

  // If a right-drag is released anywhere outside the board, abandon it.
  useEffect(() => {
    function onUp() {
      dragStart.current = null;
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  function toggleArrow(from: Pos, to: Pos, color: AnnotationColor) {
    setArrowsByPly((prev) => {
      const list = prev[displayPly] ?? [];
      const same = (a: Arrow) =>
        a.from.row === from.row && a.from.col === from.col && a.to.row === to.row && a.to.col === to.col;
      const next = list.some(same) ? list.filter((a) => !same(a)) : [...list, { from, to, color }];
      return { ...prev, [displayPly]: next };
    });
  }

  function toggleHighlight(pos: Pos, color: AnnotationColor) {
    setHighlightsByPly((prev) => {
      const list = prev[displayPly] ?? [];
      const same = (h: Highlight) => h.pos.row === pos.row && h.pos.col === pos.col;
      const next = list.some(same) ? list.filter((h) => !same(h)) : [...list, { pos, color }];
      return { ...prev, [displayPly]: next };
    });
  }

  function handleSquareMouseDown(e: React.MouseEvent, r: number, c: number) {
    if (e.button === 2) {
      dragStart.current = { row: r, col: c };
    } else if (e.button === 0) {
      // A left click clears this position's annotations, just like chess.com.
      setArrowsByPly((prev) => ({ ...prev, [displayPly]: [] }));
      setHighlightsByPly((prev) => ({ ...prev, [displayPly]: [] }));
    }
  }

  function handleSquareMouseUp(e: React.MouseEvent, r: number, c: number) {
    if (e.button !== 2) return;
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const color = annotationColor(e);
    if (start.row === r && start.col === c) toggleHighlight({ row: r, col: c }, color);
    else toggleArrow(start, { row: r, col: c }, color);
  }

  // Per-side counts of each classification, for the summary table.
  const summary = useMemo(() => {
    const blank = () =>
      Object.fromEntries(CLASSIFICATION_ORDER.map((c) => [c, 0])) as Record<MoveClassification, number>;
    const white = blank();
    const black = blank();
    for (const rm of reviewedMoves) {
      (rm.ply % 2 === 0 ? white : black)[rm.classification] += 1;
    }
    return { white, black };
  }, [reviewedMoves]);

  const displayState = states[displayPly];
  const currentEval = evaluations[displayPly] ?? null;
  const currentMove = displayPly > 0 ? reviewedMoves[displayPly - 1] : null;
  const lastMove = displayPly > 0 ? moves[displayPly - 1] : null;
  const whiteFrac = currentEval ? whiteWinFraction(currentEval.cp, currentEval.mate) : 0.5;
  const evalText = currentEval ? formatEval(currentEval.cp, currentEval.mate) : '0.0';
  const evalFavoursWhite = whiteFrac >= 0.5;

  // Group plies into number | white | black rows for the move list.
  const moveRows: { n: number; whitePly: number; blackPly: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    moveRows.push({ n: i / 2 + 1, whitePly: i, blackPly: i + 1 });
  }

  return (
    <div className={styles.overlay} onClick={dismissOnBackdrop ? onClose : undefined}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Game Review</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {moves.length === 0 && <p className={styles.note}>Play some moves first, then review the game.</p>}

        {moves.length > 0 && reviewing && (
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>
              Analyzing position {Math.round(progress * states.length)} / {states.length}…
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {!reviewing && reviewedMoves.length > 0 && (
          <div className={styles.body}>
            {/* LEFT: evaluation bar + board + current-move readout + nav */}
            <div className={styles.leftPane}>
              <div className={styles.boardArea}>
                <div className={styles.evalBar}>
                  <div className={styles.evalBlack} style={{ height: `${(1 - whiteFrac) * 100}%` }} />
                  <div className={styles.evalWhite} style={{ height: `${whiteFrac * 100}%` }} />
                  <span className={`${styles.evalNum} ${evalFavoursWhite ? styles.evalNumWhite : styles.evalNumBlack}`}>
                    {evalText}
                  </span>
                </div>

                <div className={styles.boardStage} onContextMenu={(e) => e.preventDefault()}>
                  <div className={styles.board}>
                    {displayState.board.map((row, r) =>
                      row.map((piece, c) => {
                        const isDark = (r + c) % 2 === 1;
                        const isFrom = lastMove && lastMove.from.row === r && lastMove.from.col === c;
                        const isTo = lastMove && lastMove.to.row === r && lastMove.to.col === c;
                        const hl = highlights.find((h) => h.pos.row === r && h.pos.col === c);
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={[
                              styles.square,
                              isDark ? styles.dark : styles.light,
                              isFrom || isTo ? styles.moveHighlight : '',
                            ].join(' ')}
                            onMouseDown={(e) => handleSquareMouseDown(e, r, c)}
                            onMouseUp={(e) => handleSquareMouseUp(e, r, c)}
                          >
                            {hl && (
                              <span className={styles.sqHighlight} style={{ backgroundColor: hl.color }} />
                            )}
                            {piece && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pieceImageUrl(piece as Piece)}
                                alt={piece}
                                className={styles.pieceImg}
                                draggable={false}
                              />
                            )}
                            {isTo && currentMove && (
                              <span className={styles.squareBadge}>
                                <ClassIcon c={currentMove.classification} />
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Arrow overlay - sits above the pieces, ignores pointer events. */}
                  <svg className={styles.arrowSvg} viewBox="0 0 8 8" preserveAspectRatio="none">
                    {arrows.map((a, i) => {
                      const g = arrowGeometry(a.from, a.to);
                      return (
                        <g key={i} opacity={0.85}>
                          <line
                            x1={g.sx}
                            y1={g.sy}
                            x2={g.bx}
                            y2={g.by}
                            stroke={a.color}
                            strokeWidth={0.16}
                            strokeLinecap="round"
                          />
                          <polygon points={g.headPoints} fill={a.color} />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className={styles.currentMove}>
                {currentMove ? (
                  <>
                    <ClassIcon c={currentMove.classification} size="lg" />
                    <div className={styles.currentMoveText}>
                      <span className={styles.currentMoveNotation}>
                        {Math.floor(currentMove.ply / 2) + 1}
                        {currentMove.ply % 2 === 0 ? '.' : '…'} {currentMove.notation}
                      </span>
                      <span
                        className={styles.currentMoveLabel}
                        style={{ color: `var(--cls-${currentMove.classification})` }}
                      >
                        {CLASSIFICATION_LABEL[currentMove.classification]}
                        {currentMove.bestMove &&
                          currentMove.classification !== 'best' &&
                          currentMove.classification !== 'brilliant' &&
                          currentMove.classification !== 'great' &&
                          currentMove.classification !== 'book' && (
                            <span className={styles.bestLine}> · Best: {formatUci(currentMove.bestMove)}</span>
                          )}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className={styles.currentMoveStart}>Starting position</span>
                )}
              </div>

              <div className={styles.navRow}>
                <button className={styles.navBtn} onClick={() => goTo(0)} disabled={displayPly === 0}>
                  ⏮
                </button>
                <button className={styles.navBtn} onClick={() => goTo(displayPly - 1)} disabled={displayPly === 0}>
                  ◀
                </button>
                <button
                  className={styles.navBtn}
                  onClick={() => goTo(displayPly + 1)}
                  disabled={displayPly >= states.length - 1}
                >
                  ▶
                </button>
                <button
                  className={styles.navBtn}
                  onClick={() => goTo(states.length - 1)}
                  disabled={displayPly >= states.length - 1}
                >
                  ⏭
                </button>
              </div>
              <div className={styles.hintRow}>← → arrow keys to step · right-drag to draw arrows</div>
            </div>

            {/* RIGHT: accuracy, classification summary, move list */}
            <div className={styles.rightPane}>
              <div className={styles.accuracyRow}>
                <div className={styles.accuracyCard}>
                  <span className={styles.accuracyLabel}>White</span>
                  <span className={styles.accuracyValue}>{whiteAccuracy}%</span>
                  <span className={styles.accuracyCaption}>accuracy</span>
                </div>
                <div className={styles.accuracyCard}>
                  <span className={styles.accuracyLabel}>Black</span>
                  <span className={styles.accuracyValue}>{blackAccuracy}%</span>
                  <span className={styles.accuracyCaption}>accuracy</span>
                </div>
              </div>

              <div className={styles.summary}>
                <div className={styles.summaryHead}>
                  <span />
                  <span className={styles.summaryColHead}>White</span>
                  <span className={styles.summaryColHead}>Black</span>
                </div>
                {CLASSIFICATION_ORDER.map((c) => (
                  <div key={c} className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <ClassIcon c={c} />
                      {CLASSIFICATION_LABEL[c]}
                    </span>
                    <span className={styles.summaryCount}>{summary.white[c]}</span>
                    <span className={styles.summaryCount}>{summary.black[c]}</span>
                  </div>
                ))}
              </div>

              <div className={styles.movesTitle}>Moves</div>
              <div className={styles.moveList}>
                {moveRows.map((row) => {
                  const w = reviewedMoves[row.whitePly];
                  const b = reviewedMoves[row.blackPly];
                  return (
                    <div key={row.n} className={styles.moveRow}>
                      <span className={styles.moveNumber}>{row.n}.</span>
                      {w ? (
                        <button
                          className={`${styles.movePly} ${displayPly === row.whitePly + 1 ? styles.movePlyActive : ''}`}
                          onClick={() => goTo(row.whitePly + 1)}
                        >
                          <ClassIcon c={w.classification} />
                          {w.notation}
                        </button>
                      ) : (
                        <span />
                      )}
                      {b ? (
                        <button
                          className={`${styles.movePly} ${displayPly === row.blackPly + 1 ? styles.movePlyActive : ''}`}
                          onClick={() => goTo(row.blackPly + 1)}
                        >
                          <ClassIcon c={b.classification} />
                          {b.notation}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
