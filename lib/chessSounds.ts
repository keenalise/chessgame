'use client';

/**
 * Chess move sounds, using Lichess's open sound assets (the same host this
 * project already pulls piece images from). Played both in the live game and
 * while stepping through the Game Review.
 *
 * Files live at https://lichess1.org/assets/sound/standard/<Name>.mp3. There is
 * no dedicated castle sound in the standard set - Lichess itself plays the Move
 * sound for castling, so we do the same.
 *
 * If the assets can't be reached (offline), we fall back to a tiny synthesized
 * click so the game is never silent.
 */

const BASE = 'https://lichess1.org/assets/sound/standard';

export type ChessSound = 'move' | 'capture' | 'check' | 'castle' | 'victory' | 'defeat' | 'draw' | 'notify';

const FILE: Record<ChessSound, string> = {
  move: 'Move',
  capture: 'Capture',
  check: 'Check',
  castle: 'Move', // Lichess has no separate castle sound in the standard set
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Draw',
  notify: 'GenericNotify',
};

const audioCache = new Map<string, HTMLAudioElement>();
let assetsReachable = true; // flips false on the first load error (e.g. offline)

function getBase(file: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let a = audioCache.get(file);
  if (!a) {
    a = new Audio(`${BASE}/${file}.mp3`);
    a.preload = 'auto';
    a.addEventListener('error', () => {
      assetsReachable = false;
    });
    audioCache.set(file, a);
  }
  return a;
}

// Warm the cache once on the client so the first move doesn't wait on a fetch.
if (typeof window !== 'undefined') {
  for (const file of new Set(Object.values(FILE))) getBase(file);
}

export function playChessSound(type: ChessSound) {
  if (typeof window === 'undefined') return;
  const base = getBase(FILE[type]);
  if (!base || !assetsReachable || base.error) {
    playSynthFallback(type);
    return;
  }
  try {
    // Clone so rapid successive moves overlap cleanly instead of cutting off;
    // the file is already cached, so clones don't re-download.
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = 0.7;
    const p = node.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    playSynthFallback(type);
  }
}

// ---------------------------------------------------------------------------
// Offline fallback: a self-contained Web Audio click, so nothing is silent
// when the Lichess assets can't be loaded.
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0) {
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function playSynthFallback(type: ChessSound) {
  const ac = getCtx();
  if (!ac) return;
  if (type === 'capture') {
    tone(ac, 'triangle', 260, 90, 0.12, 0.22);
  } else if (type === 'check') {
    tone(ac, 'sine', 720, 720, 0.08, 0.16);
    tone(ac, 'sine', 960, 960, 0.1, 0.16, 0.09);
  } else if (type === 'victory' || type === 'defeat' || type === 'draw' || type === 'notify') {
    tone(ac, 'sine', 523, 523, 0.12, 0.18);
    tone(ac, 'sine', type === 'defeat' ? 392 : 784, type === 'defeat' ? 392 : 784, 0.16, 0.18, 0.12);
  } else {
    tone(ac, 'sine', 300, 150, 0.09, 0.18);
  }
}
