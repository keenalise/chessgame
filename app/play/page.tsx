'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChessGame } from '@/hooks/useChessGame';
import { pieceImageUrl } from '@/lib/chessTypes';
import type { PieceKind, PieceColor } from '@/lib/chessTypes';
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

  const isGameOver =
    game.status.kind === 'checkmate' ||
    game.status.kind === 'stalemate' ||
    game.status.kind === 'draw';

  // Honor ?mode=computer from the dashboard "vs Computer" entry point.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'computer' && !game.isVsComputer) {
      game.toggleVsComputer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the AI respond whenever it becomes its turn.
  useEffect(() => {
    game.maybeLetAIMove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state, game.isVsComputer]);

  if (loading) return <div className={styles.loadingScreen}>Loading…</div>;

  const statusText = (() => {
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

  const gameOverTitle = (() => {
    if (game.status.kind === 'checkmate') return game.status.winner === 'white' ? 'White Wins!' : 'Black Wins!';
    if (game.status.kind === 'stalemate') return 'Stalemate';
    if (game.status.kind === 'draw') return 'Draw';
    return '';
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

            {isGameOver && (
              <div className={styles.gameOverOverlay}>
                <div className={styles.gameOverCard}>
                  <div className={styles.gameOverTitle}>{gameOverTitle}</div>
                  <div className={styles.gameOverSub}>{statusText}</div>
                  <button className={styles.reviewCta} onClick={() => setReviewOpen(true)}>
                    📊 Game Review
                  </button>
                  <button className={styles.ghostBtn} onClick={game.newGame}>
                    New Game
                  </button>
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
            <button className={styles.primaryBtn} onClick={game.newGame}>
              New Game
            </button>
            <button
              className={`${styles.toggleBtn} ${game.isVsComputer ? styles.toggleOn : ''}`}
              onClick={game.toggleVsComputer}
            >
              🤖 vs Computer
              <span className={styles.toggleState}>{game.isVsComputer ? 'ON' : 'OFF'}</span>
            </button>
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

          <button
            className={styles.reviewBtn}
            onClick={() => setReviewOpen(true)}
            disabled={!isGameOver}
            title={isGameOver ? 'Review the finished game' : 'Available once the game ends'}
          >
            📊 Review Game
          </button>
          {!isGameOver && <p className={styles.reviewHint}>Game review unlocks when the game ends.</p>}
        </aside>
      </div>

      {game.pendingPromotion && (
        <div className={styles.modalOverlay}>
          <div className={styles.promotionModal}>
            <p>Promote to:</p>
            <div className={styles.promotionChoices}>
              {PROMOTION_CHOICES.map((kind) => (
                <button key={kind} className={styles.promotionChoice} onClick={() => game.resolvePromotion(kind)}>
                  {kind[0].toUpperCase() + kind.slice(1)}
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
