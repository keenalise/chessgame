'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/lib/firebase';
import styles from './dashboard.module.css';

/** Tracks a consecutive-day visit streak in localStorage (best-effort). */
function useVisitStreak(): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      const today = new Date();
      const key = 'kc_streak';
      const raw = localStorage.getItem(key);
      const dayMs = 86_400_000;
      const todayStr = today.toISOString().slice(0, 10);
      let count = 1;
      if (raw) {
        const prev = JSON.parse(raw) as { count: number; last: string };
        const diff = Math.round((Date.parse(todayStr) - Date.parse(prev.last)) / dayMs);
        if (diff === 0) count = prev.count;
        else if (diff === 1) count = prev.count + 1;
        else count = 1;
      }
      localStorage.setItem(key, JSON.stringify({ count, last: todayStr }));
      setStreak(count);
    } catch {
      setStreak(1);
    }
  }, []);
  return streak;
}

function MiniBoard({ pieces }: { pieces?: string }) {
  return (
    <div className={styles.miniBoard} aria-hidden>
      {pieces && <span className={styles.miniPieces}>{pieces}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth({ requireAuth: true });
  const router = useRouter();
  const [mode, setMode] = useState<'standard' | 'computer'>('standard');
  const streak = useVisitStreak();

  /** Navigate to a puzzle/trainer's own full-screen page. */
  const openPuzzle = (slug: 'daily' | 'random' | 'eight-queens' | 'knights-tour') =>
    router.push(`/puzzle/${slug}`);

  async function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    await signOutUser();
    router.push('/');
  }

  function startGame() {
    router.push(mode === 'computer' ? '/play?mode=computer' : '/play');
  }

  if (loading) return <div className={styles.loadingScreen}>Loading…</div>;

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player';

  const railItems: { icon: string; label: string; onClick: () => void }[] = [
    { icon: '♟', label: 'Play', onClick: () => router.push('/play') },
    { icon: '🧩', label: 'Puzzles', onClick: () => openPuzzle('daily') },
    { icon: '♞', label: '8 Queens', onClick: () => openPuzzle('eight-queens') },
    { icon: '🐴', label: "Knight's Tour", onClick: () => openPuzzle('knights-tour') },
  ];

  return (
    <div className={styles.shell}>
      {/* Left icon rail */}
      <aside className={styles.rail}>
        <div className={styles.railLogo}>♔</div>
        <nav className={styles.railNav}>
          {railItems.map((item) => (
            <button key={item.label} className={styles.railBtn} title={item.label} onClick={item.onClick}>
              <span className={styles.railIcon}>{item.icon}</span>
              <span className={styles.railLabel}>{item.label}</span>
            </button>
          ))}
          <a className={styles.railBtn} href="https://learningchess.net/us/courses" target="_blank" rel="noreferrer" title="Learn">
            <span className={styles.railIcon}>🎓</span>
            <span className={styles.railLabel}>Learn</span>
          </a>
          <a className={styles.railBtn} href="https://www.youtube.com/@GothamChess/videos" target="_blank" rel="noreferrer" title="Watch">
            <span className={styles.railIcon}>📺</span>
            <span className={styles.railLabel}>Watch</span>
          </a>
        </nav>
        <button className={styles.railBtn} title="Logout" onClick={handleLogout}>
          <span className={styles.railIcon}>⎋</span>
          <span className={styles.railLabel}>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <div className={styles.content}>
        <header className={styles.topBar}>
          <div className={styles.userChip}>
            <span className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</span>
            <span className={styles.userName}>{displayName}</span>
          </div>
          <div className={styles.streakBadge}>
            🔥 <strong>{streak}</strong> Day Streak
          </div>
        </header>

        <div className={styles.grid}>
          {/* Main column */}
          <main className={styles.mainCol}>
            <section className={styles.playCard}>
              <h2 className={styles.playTitle}>Play Chess</h2>
              <div className={styles.modeRow}>
                <button
                  className={`${styles.modeChip} ${mode === 'standard' ? styles.modeChipActive : ''}`}
                  onClick={() => setMode('standard')}
                >
                  👥 Pass &amp; Play
                </button>
                <button
                  className={`${styles.modeChip} ${mode === 'computer' ? styles.modeChipActive : ''}`}
                  onClick={() => setMode('computer')}
                >
                  🤖 vs Computer
                </button>
              </div>
              <button className={styles.startBtn} onClick={startGame}>
                Start Game
              </button>
              <div className={styles.secondaryRow}>
                <button className={styles.secondaryBtn} onClick={() => router.push('/play')}>
                  ♟ New Board
                </button>
                <button className={styles.secondaryBtn} onClick={() => openPuzzle('random')}>
                  🧩 Solve a Puzzle
                </button>
              </div>
            </section>

            <section className={styles.previewRow}>
              <button className={styles.previewCard} onClick={() => openPuzzle('random')}>
                <MiniBoard pieces="♘" />
                <span className={styles.previewLabel}>Solve Puzzles</span>
                <span className={styles.previewBtn}>Start</span>
              </button>
              <button className={styles.previewCard} onClick={() => openPuzzle('eight-queens')}>
                <MiniBoard pieces="♛" />
                <span className={styles.previewLabel}>8 Queens</span>
                <span className={styles.previewBtn}>Play</span>
              </button>
              <button className={styles.previewCard} onClick={() => openPuzzle('knights-tour')}>
                <MiniBoard pieces="♞" />
                <span className={styles.previewLabel}>Knight&apos;s Tour</span>
                <span className={styles.previewBtn}>Play</span>
              </button>
            </section>

            <section className={styles.historyCard}>
              <div className={styles.historyHead}>
                <h3>Game History</h3>
              </div>
              <div className={styles.historyEmpty}>
                <span className={styles.historyEmptyIcon}>♟</span>
                <p>Your finished games will show here.</p>
                <button className={styles.secondaryBtn} onClick={startGame}>
                  Play your first game
                </button>
              </div>
            </section>
          </main>

          {/* Side column */}
          <aside className={styles.sideCol}>
            <section className={styles.dailyCard}>
              <div className={styles.dailyHead}>
                <span className={styles.dailyTitle}>Daily Puzzle</span>
                <span className={styles.dailyTag}>🌞 Today</span>
              </div>
              <MiniBoard pieces="♚ ♜" />
              <p className={styles.dailyDesc}>Today&apos;s tactic from Lichess.</p>
              <button className={styles.startBtn} onClick={() => openPuzzle('daily')}>
                Solve Daily Puzzle
              </button>
            </section>

            <section className={styles.quickCard}>
              <h3 className={styles.quickTitle}>Trainers</h3>
              <button className={styles.quickRow} onClick={() => openPuzzle('eight-queens')}>
                <span>♛</span> 8 Queens Puzzle
              </button>
              <button className={styles.quickRow} onClick={() => openPuzzle('knights-tour')}>
                <span>♞</span> Knight&apos;s Tour
              </button>
              <button className={styles.quickRow} onClick={() => openPuzzle('random')}>
                <span>🎲</span> Random Puzzle
              </button>
              <button className={styles.quickRow} onClick={() => router.push('/play')}>
                <span>🔍</span> Position Explorer
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
