import { useEffect, useRef } from 'react';

interface ADSRCurveProps {
  attack: number;
  decay: number;
  sustain: number;  // 0..1
  release: number;
}

const WIDTH = 480;
const HEIGHT = 100;
const SUSTAIN_DURATION = 0.5; // fixed sustain region for the visualisation

export function ADSRCurve({ attack, decay, sustain, release }: ADSRCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#100d0b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const total = attack + decay + SUSTAIN_DURATION + release;
    const xAt = (t: number) => (t / total) * (WIDTH - 4) + 2;
    const yAt = (v: number) => HEIGHT - 8 - v * (HEIGHT - 16);

    // Grid baseline
    ctx.strokeStyle = '#322c28';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yAt(0));
    ctx.lineTo(WIDTH, yAt(0));
    ctx.stroke();

    // Stage boundaries (faint verticals)
    const boundaries = [attack, attack + decay, attack + decay + SUSTAIN_DURATION];
    ctx.strokeStyle = '#1f1b18';
    ctx.beginPath();
    for (const t of boundaries) {
      ctx.moveTo(xAt(t), 0);
      ctx.lineTo(xAt(t), HEIGHT);
    }
    ctx.stroke();

    // Envelope path
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(0));
    ctx.lineTo(xAt(attack), yAt(1));
    ctx.lineTo(xAt(attack + decay), yAt(sustain));
    ctx.lineTo(xAt(attack + decay + SUSTAIN_DURATION), yAt(sustain));
    ctx.lineTo(xAt(total), yAt(0));
    ctx.stroke();

    // Subtle fill
    ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
    ctx.lineTo(xAt(total), yAt(0));
    ctx.lineTo(xAt(0), yAt(0));
    ctx.fill();
  }, [attack, decay, sustain, release]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: WIDTH, height: HEIGHT, borderRadius: 4, display: 'block', marginTop: 12 }}
    />
  );
}
