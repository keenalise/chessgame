'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './MusicPlayer.module.css';

/**
 * Right-edge music drawer that behaves like the Windows taskbar auto-hide:
 * the panel sits off-screen; moving the pointer to the right edge reveals a
 * handle; clicking the handle slides the embedded player in. When not pinned,
 * it auto-hides again once the pointer leaves.
 *
 * Swap EMBED_SRC for any embeddable player (Spotify / YouTube playlist, etc.).
 */
const EMBED_SRC =
  'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0';

export default function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [edgeHover, setEdgeHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // Auto-hide after the pointer leaves, unless pinned.
  const scheduleHide = () => {
    clearHide();
    if (pinned) return;
    hideTimer.current = setTimeout(() => {
      setOpen(false);
      setEdgeHover(false);
    }, 700);
  };

  useEffect(() => () => clearHide(), []);

  const handleVisible = edgeHover || open;

  return (
    <>
      {/* Invisible hot-zone pinned to the right edge of the viewport. */}
      <div
        className={styles.hotzone}
        onMouseEnter={() => {
          clearHide();
          setEdgeHover(true);
        }}
        onMouseLeave={scheduleHide}
      />

      {/* Reveal handle — appears when the edge is hovered or the panel is open. */}
      <button
        type="button"
        className={styles.handle}
        style={{ transform: handleVisible ? 'translate(0, -50%)' : 'translate(100%, -50%)' }}
        aria-label={open ? 'Hide music player' : 'Show music player'}
        onMouseEnter={clearHide}
        onMouseLeave={scheduleHide}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.handleIcon}>{open ? '✕' : '🎵'}</span>
        <span className={styles.handleText}>{open ? 'Hide' : 'Music'}</span>
      </button>

      {/* Sliding player panel. */}
      <aside
        className={styles.panel}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
        onMouseEnter={clearHide}
        onMouseLeave={scheduleHide}
      >
        <header className={styles.header}>
          <span className={styles.title}>🎵 Now Playing</span>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.pinBtn}
              data-active={pinned}
              aria-label={pinned ? 'Unpin player' : 'Pin player open'}
              title={pinned ? 'Unpin' : 'Pin open'}
              onClick={() => setPinned((p) => !p)}
            >
              📌
            </button>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Close player"
              onClick={() => {
                setPinned(false);
                setOpen(false);
                setEdgeHover(false);
              }}
            >
              ✕
            </button>
          </div>
        </header>
        <div className={styles.embedWrap}>
          <iframe
            title="Music player"
            src={EMBED_SRC}
            width="100%"
            height="100%"
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      </aside>
    </>
  );
}
