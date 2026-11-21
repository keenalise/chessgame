'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChessGame } from '@/hooks/useChessGame';
import { pieceImageUrl } from '@/lib/chessTypes';
import type { PieceKind, PieceColor, Piece } from '@/lib/chessTypes';
import PositionExplorer from '@/components/PositionExplorer';
import GameReviewPanel from '@/components/GameReviewPanel';
import styles from './play.module.css';

const PROMOTION_CHOICES: PieceKind[] = ['queen', 'rook', 'bishop', 'knight'];

const PIECE_VALUE: Record<string, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
const INITIAL_COUNTS: Record<string, number> = { pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1, king: 1 };
const CAPTURE_GLYPH: Record<string, string> = {
  white_pawn: '♙', white_knight: '♘', white_bishop: '♗', white_rook: '♖', white_queen: '♕',
  black_pawn: '♟', black_knight: '♞', black_bishop: '♝', black_rook: '♜', black_queen: '♛',
};
const CAPTURE_ORDER = ['queen', 'rook', 'bishop', 'knight', 'pawn'];

/** Derives captured pieces and the material lead directly from the live board. */
function deriveMaterial(board: (string | null)[][]) {
  const present: Record<string, number> = {};
  for (const row of board) {
    for (const cell of row) {
      if (cell) present[cell] = (present[cell] ?? 0) + 1;
    }
  }
  const capturedOf = (color: PieceColor) => {
    const glyphs: string[] = [];
    let points = 0;
    for (const kind of CAPTURE_ORDER) {
      const missing = INITIAL_COUNTS[kind] - (present[`${color}_${kind}`] ?? 0);
      for (let i = 0; i < missing; i++) glyphs.push(CAPTURE_GLYPH[`${color}_${kind}`]);
      points += Math.max(0, missing) * PIECE_VALUE[kind];
    }
    return { glyphs, points };
  };
  const black = capturedOf('black'); // black pieces that white has captured
  const white = capturedOf('white'); // white pieces that black has captured
  return {
    whiteCaptured: black.glyphs, // shown on White's card
    blackCaptured: white.glyphs, // shown on Black's card
    whiteLead: black.points - white.points,
  };
}

function PlayerCard({
  name,
  glyph,
  captured,
  lead,
  active,
}: {
  name: string;
  glyph: string;
  captured: string[];
  lead: number;
  active: boolean;
}) {
  return (
    <div className={`${styles.playerCard} ${active ? styles.playerCardActive : ''}`}>
      <div className={styles.playerAvatar}>{glyph}</div>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>{name}</span>
        <span className={styles.capturedRow}>
          {captured.length > 0 ? captured.join('') : ' '}
          {lead > 0 && <span className={styles.lead}>+{lead}</span>}
        </span>
      </div>
      {active && <span className={styles.turnDot} aria-label="to move" />}
    </div>
  );
}

export default function PlayPage() {
  const router = useRouter();
  const { user, loading } = useAuth({ requireAuth: true });
  const game = useChessGame();
  const [reviewOpen, setReviewOpen] = useState(false);
  // Lets the user dismiss the chess.com-style end-of-game card (via its ×) while
  // keeping the finished game on screen.
  const [cardDismissed, setCardDismissed] = useState(false);
  // Game endings the chess rules don't produce on their own: resignation and
  // agreed draws.
  const [manualEnd, setManualEnd] = useState<
    { kind: 'resign'; loser: PieceColor } | { kind: 'draw' } | null
  >(null);

  const rulesGameOver =
    game.status.kind === 'checkmate' ||
    game.status.kind === 'stalemate' ||
    game.status.kind === 'draw';
  const isGameOver = rulesGameOver || manualEnd !== null;

  // Honor ?mode=computer from the dashboard "vs Computer" / "Play Bots" entry.
  // enableVsComputer is idempotent, so StrictMode's double-invoke is harmless.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'computer') {
      game.enableVsComputer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the AI respond whenever it becomes its turn (but not after a resign/draw).
  useEffect(() => {
    if (manualEnd) return;
    game.maybeLetAIMove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state, game.isVsComputer, manualEnd]);

  function handleResign() {
    // In a vs-Computer game the human resigns; in pass & play the side to move does.
    const loser = game.isVsComputer ? game.playerColor : game.state.turn;
    setCardDismissed(false);
    setManualEnd({ kind: 'resign', loser });
  }
  function handleDraw() {
    setCardDismissed(false);
    setManualEnd({ kind: 'draw' });
  }
  function playAgain() {
    setManualEnd(null);
    setCardDismissed(false);
    game.newGame();
  }
  function rematch() {
    setManualEnd(null);
    setCardDismissed(false);
    game.rematch();
  }

  if (loading) return <div className={styles.loadingScreen}>Loading…</div>;

  const statusText = (() => {
    if (manualEnd?.kind === 'resign') {
      const winner = manualEnd.loser === 'white' ? 'Black' : 'White';
      return `${manualEnd.loser === 'white' ? 'White' : 'Black'} resigned — ${winner} wins`;
    }
    if (manualEnd?.kind === 'draw') return 'Draw by agreement';
    switch (game.status.kind) {
      case 'checkmate':
        return `Checkmate — ${game.status.winner === 'white' ? 'White' : 'Black'} wins`;
      case 'stalemate':
        return 'Draw by stalemate';
      case 'draw':
        return game.status.reason === 'threefold-repetition'
          ? 'Draw by threefold repetition'
          : 'Draw by the 50-move rule';
      default:
        return `${game.state.turn === 'white' ? "White" : "Black"} to move${
          game.aiThinking ? ' — computer is thinking…' : ''
        }`;
    }
  })();

  // Unified end-of-game result: who won (or 'draw') and *how*, so the card can
  // show a chess.com-style title + "By …" method line.
  const gameResult: { winner: PieceColor | 'draw'; method: string } | null = (() => {
    if (manualEnd?.kind === 'resign') {
      return { winner: manualEnd.loser === 'white' ? 'black' : 'white', method: 'Resignation' };
    }
    if (manualEnd?.kind === 'draw') return { winner: 'draw', method: 'Agreement' };
    if (game.status.kind === 'checkmate') return { winner: game.status.winner, method: 'Checkmate' };
    if (game.status.kind === 'stalemate') return { winner: 'draw', method: 'Stalemate' };
    if (game.status.kind === 'draw') {
      return {
        winner: 'draw',
        method: game.status.reason === 'threefold-repetition' ? 'Repetition' : 'the 50-Move Rule',
      };
    }
    return null;
  })();

  const youWon = gameResult && gameResult.winner !== 'draw' && gameResult.winner === game.playerColor;

  const gameOverTitle = (() => {
    if (!gameResult) return '';
    if (gameResult.winner === 'draw') return 'Draw';
    if (game.isVsComputer) return youWon ? 'You Won!' : 'You Lost';
    return gameResult.winner === 'white' ? 'White Wins!' : 'Black Wins!';
  })();

  const gameOverIcon = (() => {
    if (!gameResult) return '';
    if (gameResult.winner === 'draw') return '🤝';
    if (game.isVsComputer && !youWon) return '😔';
    return '🏆';
  })();

  const material = deriveMaterial(game.state.board);

  // Group plies into chess.com-style rows: [number, white move, black move].
  const moveRows: { number: number; white?: string; whitePly: number; black?: string; blackPly: number }[] = [];
  for (let i = 0; i < game.moveHistory.length; i += 2) {
    moveRows.push({
      number: i / 2 + 1,
      white: game.moveHistory[i]?.notation,
      whitePly: i,
      black: game.moveHistory[i + 1]?.notation,
      blackPly: i + 1,
    });
  }
  const activePly = game.cursor - 1;

  const opponentName = game.isVsComputer ? 'Computer' : 'Black';
  const youName = game.isVsComputer ? user?.displayName || 'You' : 'White';

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <button className={styles.brand} onClick={() => router.push('/dashboard')}>
          Keen<span>Chess</span>
        </button>
        <div className={styles.topBarActions}>
          <button className={styles.ghostBtn} onClick={() => router.push('/dashboard')}>
            Home
          </button>
        </div>
      </header>

      <div className={styles.mainArea}>
        <div className={styles.boardColumn}>
          <PlayerCard
            name={opponentName}
            glyph="♚"
            captured={material.blackCaptured}
            lead={-material.whiteLead}
            active={!isGameOver && game.state.turn === 'black'}
          />

          <div className={styles.boardWrap}>
            <div className={styles.board}>
              {game.state.board.map((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const isDark = (rowIndex + colIndex) % 2 === 1;
                  const isSelected = game.selected?.row === rowIndex && game.selected?.col === colIndex;
                  const isLegalDest = game.legalDestinations.some((d) => d.row === rowIndex && d.col === colIndex);
                  const lastMove = game.moveHistory[game.moveHistory.length - 1];
                  const isLastMoveSquare =
                    game.isAtLivePosition &&
                    lastMove &&
                    ((lastMove.from.row === rowIndex && lastMove.from.col === colIndex) ||
                      (lastMove.to.row === rowIndex && lastMove.to.col === colIndex));

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={[
                        styles.square,
                        isDark ? styles.dark : styles.light,
                        isSelected ? styles.selected : '',
                        isLastMoveSquare ? styles.lastMove : '',
                      ].join(' ')}
                      onClick={() => game.selectSquare({ row: rowIndex, col: colIndex })}
                    >
                      {colIndex === 0 && <span className={styles.rankLabel}>{8 - rowIndex}</span>}
                      {rowIndex === 7 && (
                        <span className={styles.fileLabel}>{String.fromCharCode(97 + colIndex)}</span>
                      )}
                      {isLegalDest && <div className={piece ? styles.captureHint : styles.moveHint} />}
                      {piece && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pieceImageUrl(piece)} alt={piece} className={styles.pieceImg} draggable={false} />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {isGameOver && !cardDismissed && (
              <div className={styles.gameOverOverlay}>
                <div className={styles.gameOverCard}>
                  <button
                    className={styles.gameOverClose}
                    onClick={() => setCardDismissed(true)}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <div className={styles.gameOverIcon}>{gameOverIcon}</div>
                  <div className={styles.gameOverTitle}>{gameOverTitle}</div>
                  <div className={styles.gameOverSub}>By {gameResult?.method}</div>
                  <button className={styles.reviewCta} onClick={() => setReviewOpen(true)}>
                    <span className={styles.reviewStar}>★</span> Game Review
                  </button>
                  <div className={styles.gameOverButtons}>
                    <button className={styles.gameOverBtn} onClick={playAgain}>
                      Play Again
                    </button>
                    <button className={styles.gameOverBtn} onClick={rematch}>
                      Rematch
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <PlayerCard
            name={youName}
            glyph="♔"
            captured={material.whiteCaptured}
            lead={material.whiteLead}
            active={!isGameOver && game.state.turn === 'white'}
          />
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.panelStatus}>{statusText}</div>

          <div className={styles.controlsTop}>
            <button
              className={`${styles.toggleBtn} ${game.isVsComputer ? styles.toggleOn : ''}`}
              onClick={game.toggleVsComputer}
            >
              🤖 vs Computer
              <span className={styles.toggleState}>{game.isVsComputer ? 'ON' : 'OFF'}</span>
            </button>

            {!isGameOver ? (
              <div className={styles.actionRow}>
                <button
                  className={styles.resignBtn}
                  onClick={handleResign}
                  disabled={game.moveHistory.length === 0}
                >
                  🏳️ Resign
                </button>
                <button
                  className={styles.drawBtn}
                  onClick={handleDraw}
                  disabled={game.moveHistory.length === 0}
                >
                  ½ Draw
                </button>
              </div>
            ) : (
              <>
                <div className={styles.actionRow}>
                  <button className={styles.primaryBtn} onClick={playAgain}>
                    Play Again
                  </button>
                  <button className={styles.rematchBtn} onClick={rematch}>
                    Rematch
                  </button>
                </div>
                <button className={styles.reviewBtn} onClick={() => setReviewOpen(true)}>
                  📊 Review Game
                </button>
              </>
            )}
          </div>

          <div className={styles.movesTitle}>Moves</div>
          <div className={styles.moveList}>
            {moveRows.length === 0 && <div className={styles.emptyMoves}>No moves yet.</div>}
            {moveRows.map((r) => (
              <div key={r.number} className={styles.moveRow}>
                <span className={styles.moveNumber}>{r.number}.</span>
                <button
                  className={`${styles.movePly} ${activePly === r.whitePly ? styles.movePlyActive : ''}`}
                  onClick={() => game.goToIndex(r.whitePly + 1)}
                >
                  {r.white}
                </button>
                {r.black ? (
                  <button
                    className={`${styles.movePly} ${activePly === r.blackPly ? styles.movePlyActive : ''}`}
                    onClick={() => game.goToIndex(r.blackPly + 1)}
                  >
                    {r.black}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>

          <div className={styles.navRow}>
            <button className={styles.navBtn} onClick={game.goToStart} disabled={game.cursor === 0}>
              ⏮
            </button>
            <button className={styles.navBtn} onClick={game.undo} disabled={game.cursor === 0}>
              ◀
            </button>
            <button className={styles.navBtn} onClick={game.redo} disabled={game.isAtLivePosition}>
              ▶
            </button>
            <button className={styles.navBtn} onClick={game.goToLive} disabled={game.isAtLivePosition}>
              ⏭
            </button>
          </div>
        </aside>
      </div>

      {game.pendingPromotion && (
        <div className={styles.modalOverlay}>
          <div className={styles.promotionModal}>
            <p>Promote to:</p>
            <div className={styles.promotionChoices}>
              {PROMOTION_CHOICES.map((kind) => (
                <button
                  key={kind}
                  className={styles.promotionChoice}
                  onClick={() => game.resolvePromotion(kind)}
                  title={kind[0].toUpperCase() + kind.slice(1)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pieceImageUrl(`${game.state.turn}_${kind}` as Piece)}
                    alt={kind}
                    className={styles.promotionPieceImg}
                    draggable={false}
                  />
                </button>
              ))}
            </div>
            <button className={styles.formLinkLike} onClick={game.cancelPromotion}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <PositionExplorer fen={game.fen} />

      {reviewOpen && (
        <GameReviewPanel
          states={game.states}
          moves={game.moveHistory}
          onJumpToPly={(ply) => {
            game.goToIndex(ply);
          }}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}
