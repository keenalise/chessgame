'use client';

import { useEffect, useRef } from 'react';

const PIECES = ['♙', '♟', '♖', '♜', '♘', '♞', '♗', '♝', '♕', '♛', '♔', '♚'];

class Particle {
  x = 0;
  y = 0;
  size = 0;
  piece = '';
  speed = 0;
  opacity = 0;
  targetOpacity = 0;
  fadeIn = true;
  drift = 0;
  rotation = 0;
  angle = 0;

  constructor(private width: number, private height: number) {
    this.reset(true);
  }

  reset(initial: boolean) {
    this.x = Math.random() * this.width;
    this.y = initial ? Math.random() * this.height : this.height + 40;
    this.size = Math.random() * 18 + 8;
    this.piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    this.speed = Math.random() * 0.4 + 0.15;
    this.opacity = 0;
    this.targetOpacity = Math.random() * 0.16 + 0.07;
    this.fadeIn = true;
    this.drift = (Math.random() - 0.5) * 0.3;
    this.rotation = (Math.random() - 0.5) * 0.02;
    this.angle = 0;
  }

  update() {
    this.y -= this.speed;
    this.x += this.drift;
    this.angle += this.rotation;
    if (this.fadeIn) {
      this.opacity = Math.min(this.opacity + 0.003, this.targetOpacity);
      if (this.opacity >= this.targetOpacity) this.fadeIn = false;
    }
    if (this.y < -40) this.reset(false);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.opacity;
    ctx.font = `${this.size}px serif`;
    ctx.fillStyle = '#3b82c4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.piece, 0, 0);
    ctx.restore();
  }
}

class Streak {
  x = 0;
  y = 0;
  length = 0;
  angle = 0;
  speed = 0;
  opacity = 0;
  life = 0;
  maxLife = 0;
  active = false;

  constructor(private width: number, private height: number) {
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.width;
    this.y = Math.random() * this.height;
    this.length = Math.random() * 120 + 40;
    this.angle = Math.PI * 0.3 + (Math.random() - 0.5) * 0.5;
    this.speed = Math.random() * 1.5 + 0.8;
    this.opacity = 0;
    this.life = 0;
    this.maxLife = Math.random() * 80 + 40;
    this.active = Math.random() < 0.3;
  }

  update() {
    if (!this.active) {
      if (Math.random() < 0.002) this.active = true;
      return;
    }
    this.life++;
    const t = this.life / this.maxLife;
    this.opacity = t < 0.3 ? (t / 0.3) * 0.15 : (1 - (t - 0.3) / 0.7) * 0.15;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    if (this.life >= this.maxLife) {
      this.reset();
      this.x = Math.random() * this.width;
      this.y = Math.random() * this.height;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active || this.opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    const grad = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x - Math.cos(this.angle) * this.length,
      this.y - Math.sin(this.angle) * this.length
    );
    grad.addColorStop(0, '#3b82c4');
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
    ctx.stroke();
    ctx.restore();
  }
}

class Star {
  x = 0;
  y = 0;
  r = 0;
  baseOpacity = 0;
  phase = 0;
  speed = 0;

  constructor(private width: number, private height: number) {
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.width;
    this.y = Math.random() * this.height;
    this.r = Math.random() * 1.5 + 0.3;
    this.baseOpacity = Math.random() * 0.3 + 0.05;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 0.02 + 0.005;
  }

  update() {
    this.phase += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.baseOpacity * (0.5 + 0.5 * Math.sin(this.phase));
    ctx.fillStyle = '#3b82c4';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function ChessBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let particles: Particle[] = [];
    let streaks: Streak[] = [];
    let stars: Star[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      particles = Array.from({ length: 28 }, () => new Particle(canvas!.width, canvas!.height));
      streaks = Array.from({ length: 12 }, () => new Streak(canvas!.width, canvas!.height));
      stars = Array.from({ length: 80 }, () => new Star(canvas!.width, canvas!.height));
    }
    resize();
    window.addEventListener('resize', resize);

    function loop() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      const grad = ctx!.createRadialGradient(
        canvas!.width * 0.4,
        canvas!.height * 0.4,
        0,
        canvas!.width * 0.5,
        canvas!.height * 0.5,
        canvas!.width * 0.8
      );
      grad.addColorStop(0, 'rgba(242,247,252,1)');
      grad.addColorStop(0.5, 'rgba(232,240,249,1)');
      grad.addColorStop(1, 'rgba(217,231,245,1)');
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      stars.forEach((s) => {
        s.update();
        s.draw(ctx!);
      });
      streaks.forEach((s) => {
        s.update();
        s.draw(ctx!);
      });
      particles.forEach((p) => {
        p.update();
        p.draw(ctx!);
      });

      rafId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />;
}
