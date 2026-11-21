'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PositionExplorer.module.css';

interface ExplorerMove {
  san?: string;
  uci: string;
  white: number;
  draws: number;
  black: number;
}

interface ExplorerGame {
  winner?: 'white' | 'black';
  white?: { name?: string; rating?: number };
  black?: { name?: string; rating?: number };
  event?: string;
  year?: number;
  month?: string;
}

interface ExplorerData {
  white?: number;
  draws?: number;
  black?: number;
  moves?: ExplorerMove[];
  topGames?: ExplorerGame[];
}

interface EngineMove {
  move: string | null;
  cp?: number;
  mate?: number;
  depth?: number;
}

const EXPLORER_URL = 'https://explorer.lichess.ovh/master';
const CLOUD_EVAL_URL = 'https://lichess.org/api/cloud-eval';

function normalizeFEN(fen: string): string {
  return fen.trim().split(' ').slice(0, 4).join(' ');
}

async function fetchExplorerData(fen: string): Promise<ExplorerData | null> {
  try {
    const url = `${EXPLORER_URL}?fen=${encodeURIComponent(fen)}&moves=10&topGames=8`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Explorer API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[PositionExplorer] Explorer fetch failed:', err);
    return null;
  }
}

async function fetchEngineMove(fen: string): Promise<EngineMove | null> {
  try {
    const url = `${CLOUD_EVAL_URL}?fen=${encodeURIComponent(fen)}&multiPv=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Cloud eval error: ${res.status}`);
    const data = await res.json();
    const pv = data?.pvs?.[0];
    if (!pv) return null;
    return {
      move: pv.moves ? pv.moves.split(' ')[0] : null,
      cp: pv.cp,
      mate: pv.mate,
      depth: data.depth,
    };
  } catch (err) {
    console.warn('[PositionExplorer] Cloud eval fetch failed:', err);
    return null;
  }
}

function resultLabel(winner?: 'white' | 'black'): string {
  if (winner === 'white') return '1-0';
  if (winner === 'black') return '0-1';
  return '½-½';
}

interface PositionExplorerProps {
  fen: string;
  /** Optional: convert an engine's UCI move (e.g. "e2e4") to SAN for display. */
  sanConverter?: (uci: string) => string;
  onClose?: () => void;
}

// Simple in-memory cache shared across mounts within the same session.
const explorerCache = new Map<string, ExplorerData | null>();
const evalCache = new Map<string, EngineMove | null>();

export default function PositionExplorer({ fen, sanConverter, onClose }: PositionExplorerProps) {
  // Collapsed by default — it's an optional study aid, not a core control, and
  // we only hit the network once the user actually opens it.
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<ExplorerData | null>(null);
  const [engineMove, setEngineMove] = useState<EngineMove | null>(null);
  const requestToken = useRef(0);

  useEffect(() => {
    if (!fen || !open) return;
    const key = normalizeFEN(fen);
    const myToken = ++requestToken.current;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);

      let explorerResult: ExplorerData | null;
      let engineResult: EngineMove | null;

      if (explorerCache.has(key) && evalCache.has(key)) {
        explorerResult = explorerCache.get(key) ?? null;
        engineResult = evalCache.get(key) ?? null;
      } else {
        [explorerResult, engineResult] = await Promise.all([fetchExplorerData(fen), fetchEngineMove(fen)]);
        explorerCache.set(key, explorerResult);
        evalCache.set(key, engineResult);
      }

      if (myToken !== requestToken.current) return; // stale response, a newer FEN came in

      setLoading(false);
      if (!explorerResult) {
        setError(true);
        setData(null);
        return;
      }
      setData(explorerResult);
      setEngineMove(engineResult);
    }, 300);

    return () => clearTimeout(timer);
  }, [fen, open]);

  const totalGames = (data?.white ?? 0) + (data?.draws ?? 0) + (data?.black ?? 0);
  const hasMoves = !!data?.moves?.length;
  const noData = !loading && !error && data && !hasMoves && !totalGames;

  // Collapsed: just a small pill in the corner.
  if (!open) {
    return (
      <button
        type="button"
        className={styles.collapsedToggle}
        onClick={() => setOpen(true)}
        title="Opening explorer: master games & engine preference for this position"
      >
        🔍 Explorer
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Opening Explorer</span>
        <button
          type="button"
          className={styles.close}
          onClick={() => {
            setOpen(false);
            onClose?.();
          }}
          title="Hide panel"
        >
          &times;
        </button>
      </div>

      <div className={styles.body}>
        <p className={styles.hint}>Master-game stats &amp; the engine&apos;s pick for the current position.</p>

        {loading && <div className={styles.loading}>Looking up position…</div>}

        {!loading && error && (
          <div className={styles.empty}>Lookup failed. Check your connection and try again.</div>
        )}

        {!loading && noData && (
          <div className={styles.empty}>
            No master games found from this position.
            <br />
            <span className={styles.emptySub}>You&apos;re likely in novel territory.</span>
          </div>
        )}

        {!loading && !error && data && (hasMoves || totalGames > 0) && (
          <>
            {engineMove?.move && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Engine preference</div>
                <div className={styles.engineMove}>
                  <span className={styles.moveTag}>
                    {sanConverter ? sanConverter(engineMove.move) : engineMove.move}
                  </span>
                  <span className={styles.eval}>
                    {engineMove.mate != null
                      ? `mate in ${Math.abs(engineMove.mate)}`
                      : engineMove.cp != null
                      ? (engineMove.cp / 100).toFixed(2)
                      : ''}
                  </span>
                </div>
              </div>
            )}

            {hasMoves && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Master continuations ({totalGames} games)</div>
                <div className={styles.movesList}>
                  {data.moves!.slice(0, 8).map((m) => {
                    const total = (m.white || 0) + (m.draws || 0) + (m.black || 0);
                    const whitePct = total ? Math.round((m.white / total) * 100) : 0;
                    const drawPct = total ? Math.round((m.draws / total) * 100) : 0;
                    const blackPct = Math.max(0, 100 - whitePct - drawPct);
                    return (
                      <div key={m.uci} className={styles.moveRow}>
                        <span className={styles.moveName}>{m.san || m.uci}</span>
                        <span className={styles.moveCount}>{total} games</span>
                        <div
                          className={styles.bar}
                          title={`White ${whitePct}% / Draw ${drawPct}% / Black ${blackPct}%`}
                        >
                          <div className={styles.barWhite} style={{ width: `${whitePct}%` }} />
                          <div className={styles.barDraw} style={{ width: `${drawPct}%` }} />
                          <div className={styles.barBlack} style={{ width: `${blackPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!!data.topGames?.length && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Games from this position</div>
                <div className={styles.gamesList}>
                  {data.topGames.map((g, i) => {
                    const year = g.year ?? (g.month ? g.month.split('-')[0] : '');
                    return (
                      <div key={i} className={styles.gameRow}>
                        <div className={styles.gamePlayers}>
                          {g.white?.name || 'White'} ({g.white?.rating ?? '?'}) – {g.black?.name || 'Black'} (
                          {g.black?.rating ?? '?'})
                        </div>
                        <div className={styles.gameMeta}>
                          {g.event || ''}
                          {year ? ` · ${year}` : ''} · {resultLabel(g.winner)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
