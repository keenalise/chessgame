'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated "thinking" background: a glowing neural brain made of connected
 * nodes, with luminous "thoughts" revolving around it on tilted elliptical
 * orbits. Painted on a fixed full-screen canvas behind all page content.
 */

interface Node {
  x: number; // normalized (-1.3..1.3)
  y: number; // normalized (-1.1..1.1)
  phase: number;
}

interface Edge {
  a: number;
  b: number;
}

interface Pulse {
  edge: number;
  t: number; // 0..1 progress along the edge
  speed: number;
}

interface Thought {
  a: number; // orbit semi-major (in brain radii)
  b: number; // orbit semi-minor
  tilt: number; // orbit rotation
  speed: number; // rad/s (sign = direction)
  angle: number;
  size: number;
  glyph: string | null;
  hue: string;
  trail: { x: number; y: number }[];
}

// Wrinkled, lobed brain outline radius for a given angle.
function brainRadius(theta: number): number {
  return 1 + 0.1 * Math.sin(6 * theta) + 0.07 * Math.sin(3 * theta + 0.7) + 0.04 * Math.sin(9 * theta + 2);
}

function insideBrain(nx: number, ny: number): boolean {
  // Ellipse-shaped, slightly flattened at the bottom (brain stem area).
  const ex = nx / 1.18;
  const ey = ny / (ny > 0 ? 1.05 : 0.95);
  const r = Math.hypot(ex, ey);
  const theta = Math.atan2(ey, ex);
  if (r > brainRadius(theta) * 0.96) return false;
  if (Math.abs(nx) < 0.055) return false; // central fissure → two hemispheres
  return true;
}

export default function BrainBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const pulses: Pulse[] = [];
    const thoughts: Thought[] = [];

    // --- Build the brain node cloud ---
    let guard = 0;
    while (nodes.length < 82 && guard < 6000) {
      guard++;
      const nx = (Math.random() * 2 - 1) * 1.3;
      const ny = (Math.random() * 2 - 1) * 1.12;
      if (insideBrain(nx, ny)) nodes.push({ x: nx, y: ny, phase: Math.random() * Math.PI * 2 });
    }

    // Connect each node to its few nearest neighbours.
    for (let i = 0; i < nodes.length; i++) {
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        // Don't bridge the central fissure (keep hemispheres distinct).
        if (Math.sign(nodes[i].x) !== Math.sign(nodes[j].x)) continue;
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        dists.push({ j, d });
      }
      dists.sort((p, q) => p.d - q.d);
      for (let k = 0; k < Math.min(3, dists.length); k++) {
        if (dists[k].d < 0.42 && i < dists[k].j) edges.push({ a: i, b: dists[k].j });
      }
    }

    // --- Orbiting thoughts ---
    const GLYPHS = ['💡', '♟', '♞', '♛', null, null, null];
    for (let i = 0; i < 7; i++) {
      const a = 1.35 + Math.random() * 0.9;
      thoughts.push({
        a,
        b: a * (0.52 + Math.random() * 0.26),
        tilt: Math.random() * Math.PI,
        speed: (Math.random() * 0.25 + 0.12) * (Math.random() < 0.5 ? -1 : 1),
        angle: Math.random() * Math.PI * 2,
        size: 3.4 + Math.random() * 2.6,
        glyph: GLYPHS[i % GLYPHS.length],
        hue: Math.random() < 0.3 ? '#8f7cff' : '#7cc0ff',
        trail: [],
      });
    }

    let raf = 0;
    let last = performance.now();
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W * 0.5;
      cy = H * 0.46;
      R = Math.min(W, H) * 0.3;
    }
    resize();
    window.addEventListener('resize', resize);

    const toScreen = (nx: number, ny: number) => [cx + nx * R, cy + ny * R] as const;

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // Background wash.
      const bg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
      bg.addColorStop(0, '#132a57');
      bg.addColorStop(0.45, '#0d1a3a');
      bg.addColorStop(1, '#070c1d');
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // Soft luminous halo around the whole brain region.
      const halo = ctx!.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.8);
      halo.addColorStop(0, 'rgba(74,140,230,0.4)');
      halo.addColorStop(0.5, 'rgba(60,110,210,0.16)');
      halo.addColorStop(1, 'rgba(60,120,220,0)');
      ctx!.fillStyle = halo;
      ctx!.fillRect(0, 0, W, H);

      // Edges.
      ctx!.lineWidth = 1.1;
      for (const e of edges) {
        const [ax, ay] = toScreen(nodes[e.a].x, nodes[e.a].y);
        const [bx, by] = toScreen(nodes[e.b].x, nodes[e.b].y);
        ctx!.strokeStyle = 'rgba(130,185,245,0.22)';
        ctx!.beginPath();
        ctx!.moveTo(ax, ay);
        ctx!.lineTo(bx, by);
        ctx!.stroke();
      }

      // Signal pulses travelling along edges.
      if (!reduceMotion && pulses.length < 10 && Math.random() < 0.08) {
        pulses.push({ edge: Math.floor(Math.random() * edges.length), t: 0, speed: 0.5 + Math.random() * 0.8 });
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed * dt;
        if (p.t >= 1 || !edges[p.edge]) {
          pulses.splice(i, 1);
          continue;
        }
        const e = edges[p.edge];
        const [ax, ay] = toScreen(nodes[e.a].x, nodes[e.a].y);
        const [bx, by] = toScreen(nodes[e.b].x, nodes[e.b].y);
        const px = ax + (bx - ax) * p.t;
        const py = ay + (by - ay) * p.t;
        ctx!.fillStyle = 'rgba(170,220,255,0.9)';
        ctx!.beginPath();
        ctx!.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Nodes with a soft pulse.
      for (const n of nodes) {
        const [x, y] = toScreen(n.x, n.y);
        const pulse = reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * 1.4 + n.phase);
        const r = 1.8 + pulse * 2.2;
        const glow = ctx!.createRadialGradient(x, y, 0, x, y, r * 5);
        glow.addColorStop(0, `rgba(140,200,255,${0.6 + pulse * 0.4})`);
        glow.addColorStop(1, 'rgba(140,200,255,0)');
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = `rgba(230,244,255,${0.8 + pulse * 0.2})`;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Revolving thoughts.
      for (const th of thoughts) {
        if (!reduceMotion) th.angle += th.speed * dt;
        const lx = Math.cos(th.angle) * th.a * R;
        const ly = Math.sin(th.angle) * th.b * R;
        const x = cx + lx * Math.cos(th.tilt) - ly * Math.sin(th.tilt);
        const y = cy + lx * Math.sin(th.tilt) + ly * Math.cos(th.tilt);

        // Motion trail behind the thought.
        th.trail.push({ x, y });
        if (th.trail.length > 16) th.trail.shift();
        const isViolet = th.hue === '#8f7cff';
        for (let i = 0; i < th.trail.length - 1; i++) {
          const p = th.trail[i];
          const alpha = (i / th.trail.length) * 0.4;
          ctx!.fillStyle = isViolet ? `rgba(143,124,255,${alpha})` : `rgba(124,192,255,${alpha})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, th.size * (i / th.trail.length) * 0.9, 0, Math.PI * 2);
          ctx!.fill();
        }

        const glow = ctx!.createRadialGradient(x, y, 0, x, y, th.size * 7);
        glow.addColorStop(0, isViolet ? 'rgba(143,124,255,0.75)' : 'rgba(124,192,255,0.75)');
        glow.addColorStop(1, 'rgba(124,192,255,0)');
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(x, y, th.size * 7, 0, Math.PI * 2);
        ctx!.fill();

        if (th.glyph) {
          ctx!.globalAlpha = 0.95;
          ctx!.font = `${th.size * 5.5}px serif`;
          ctx!.textAlign = 'center';
          ctx!.textBaseline = 'middle';
          ctx!.fillText(th.glyph, x, y);
          ctx!.globalAlpha = 1;
        } else {
          ctx!.fillStyle = '#ffffff';
          ctx!.beginPath();
          ctx!.arc(x, y, th.size, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1 }} />;
}
