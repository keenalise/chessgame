'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChessGame } from '@/hooks/useChessGame';
import { pieceImageUrl } from '@/lib/chessTypes';
import type { PieceKind } from '@/lib/chessTypes';
import PositionExplorer from '@/components/PositionExplorer';
import GameReviewPanel from '@/components/GameReviewPanel';
import styles from './play.module.css';

const PROMOTION_CHOICES: PieceKind[] = ['queen', 'rook', 'bishop', 'knight'];

export default function PlayPage() {
  const { loading } = useAuth({ requireAuth: true });
  const game = useChessGame();
  const [reviewOpen, setReviewOpen] = useState(false);

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
        return `${game.state.turn === 'white' ? "White's" : "Black's"} turn${
          game.aiThinking ? ' — computer is thinking…' : ''
        }`;
    }
  })();

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>KeenChess</h1>
        <div className={styles.topBarActions}>
          <button className={styles.btn} onClick={game.newGame}>
            New Game
          </button>
          <button
            className={`${styles.btn} ${game.isVsComputer ? styles.btnActive : ''}`}
            onClick={game.toggleVsComputer}
          >
            🤖 vs Computer: {game.isVsComputer ? 'ON' : 'OFF'}
          </button>
          <button
            className={styles.btn}
            onClick={() => setReviewOpen(true)}
            disabled={game.moveHistory.length === 0}
          >
            📊 Review Game
          </button>
        </div>
      </div>

      <div className={styles.mainArea}>
        <div className={styles.boardPanel}>
          <div className={styles.statusBar}>{statusText}</div>

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
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.movesTitle}>Move History</div>
          <ol className={styles.moveList}>
            {game.moveHistory.map((move, i) => (
              <li key={i} className={i === game.cursor - 1 ? styles.moveActive : ''}>
                {i % 2 === 0 ? <span className={styles.moveNumber}>{Math.floor(i / 2) + 1}.</span> : null}{' '}
                {move.notation}
              </li>
            ))}
          </ol>
        </div>
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
