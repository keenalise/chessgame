'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/lib/firebase';
import EightQueensPuzzle from '@/components/EightQueensPuzzle';
import KnightTourPuzzle from '@/components/KnightTourPuzzle';
import LichessPuzzleModal from '@/components/LichessPuzzleModal';
import styles from './dashboard.module.css';

type ActiveModal = 'eight' | 'knight' | 'daily' | 'random' | null;

export default function DashboardPage() {
  const { user, loading } = useAuth({ requireAuth: true });
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [puzzleMenuOpen, setPuzzleMenuOpen] = useState(false);

  async function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    await signOutUser();
    router.push('/'); // fixed: original redirected to a non-existent chesslogin.html
  }

  if (loading) return <div className={styles.loadingScreen}>Loading…</div>;

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          Keen <span>Chess</span>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.navBtn} onClick={() => router.push('/dashboard')}>
            Home
          </button>
          <button className={styles.navBtn} onClick={() => router.push('/play')}>
            Play
          </button>
          <div className={styles.navDropdownWrap}>
            <button className={styles.navBtn} onClick={() => setPuzzleMenuOpen((o) => !o)}>
              Puzzles ▾
            </button>
            {puzzleMenuOpen && (
              <div className={styles.dropdown}>
                <button
                  onClick={() => {
                    setActiveModal('eight');
                    setPuzzleMenuOpen(false);
                  }}
                >
                  8 Queens
                </button>
                <button
                  onClick={() => {
                    setActiveModal('knight');
                    setPuzzleMenuOpen(false);
                  }}
                >
                  Knight&apos;s Tour
                </button>
                <button
                  onClick={() => {
                    setActiveModal('daily');
                    setPuzzleMenuOpen(false);
                  }}
                >
                  Daily Puzzle
                </button>
                <button
                  onClick={() => {
                    setActiveModal('random');
                    setPuzzleMenuOpen(false);
                  }}
                >
                  Random Puzzle
                </button>
              </div>
            )}
          </div>
          <a className={styles.navBtn} href="https://en.chessbase.com/" target="_blank" rel="noreferrer">
            News
          </a>
          <a className={styles.navBtn} href="https://learningchess.net/us/courses" target="_blank" rel="noreferrer">
            Learn
          </a>
          <a
            className={styles.navBtn}
            href="https://www.youtube.com/@GothamChess/videos"
            target="_blank"
            rel="noreferrer"
          >
            Watch
          </a>
          <button className={styles.navBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className={styles.hero}>
        <h1 className={styles.heroTitle}>Welcome{user?.displayName ? `, ${user.displayName}` : ''}</h1>
        <p className={styles.heroSubtitle}>Play a game, sharpen your tactics, or explore master theory.</p>

        <div className={styles.cardsRow}>
          <button className={styles.card} onClick={() => router.push('/play')}>
            <span className={styles.cardIcon}>♞</span>
            <span className={styles.cardTitle}>Play Chess</span>
            <span className={styles.cardDesc}>Full game with legal move checking and vs-computer mode</span>
          </button>
          <button className={styles.card} onClick={() => setActiveModal('eight')}>
            <span className={styles.cardIcon}>♛</span>
            <span className={styles.cardTitle}>8 Queens</span>
            <span className={styles.cardDesc}>Classic placement puzzle</span>
          </button>
          <button className={styles.card} onClick={() => setActiveModal('knight')}>
            <span className={styles.cardIcon}>♘</span>
            <span className={styles.cardTitle}>Knight&apos;s Tour</span>
            <span className={styles.cardDesc}>Visit every square exactly once</span>
          </button>
          <button className={styles.card} onClick={() => setActiveModal('daily')}>
            <span className={styles.cardIcon}>☀</span>
            <span className={styles.cardTitle}>Daily Puzzle</span>
            <span className={styles.cardDesc}>Today&apos;s tactic from Lichess</span>
          </button>
          <button className={styles.card} onClick={() => setActiveModal('random')}>
            <span className={styles.cardIcon}>🎲</span>
            <span className={styles.cardTitle}>Random Puzzle</span>
            <span className={styles.cardDesc}>A fresh tactic every time</span>
          </button>
        </div>
      </main>

      {activeModal === 'eight' && <EightQueensPuzzle onClose={() => setActiveModal(null)} />}
      {activeModal === 'knight' && <KnightTourPuzzle onClose={() => setActiveModal(null)} />}
      {activeModal === 'daily' && (
        <LichessPuzzleModal
          title="Daily Puzzle"
          endpoint="https://lichess.org/api/puzzle/daily"
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'random' && (
        <LichessPuzzleModal
          title="Random Puzzle"
          endpoint="https://lichess.org/api/puzzle/next"
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
