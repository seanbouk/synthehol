import { useEffect, useRef } from 'react';

interface ADSRCurveProps {
  attack: number;
  decay: number;
  sustain: number;  // 0..1
  release: number;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 100;
const SUSTAIN_DURATION = 0.5; // fixed sustain region for the visualisation

export function ADSRCurve({
  attack,
  decay,
  sustain,
  release,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
}: ADSRCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(3, (window.devicePixelRatio || 1) * 1.5));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#100d0b';
    ctx.fillRect(0, 0, width, height);

    const total = attack + decay + SUSTAIN_DURATION + release;
    const xAt = (t: number) => (t / total) * (width - 4) + 2;
    const yAt = (v: number) => height - 8 - v * (height - 16);

    // Baseline
    ctx.strokeStyle = '#322c28';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yAt(0));
    ctx.lineTo(width, yAt(0));
    ctx.stroke();

    // Stage boundaries
    const boundaries = [attack, attack + decay, attack + decay + SUSTAIN_DURATION];
    ctx.strokeStyle = '#1f1b18';
    ctx.beginPath();
    for (const t of boundaries) {
      ctx.moveTo(xAt(t), 0);
      ctx.lineTo(xAt(t), height);
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
  }, [attack, decay, sustain, release, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, borderRadius: 4, display: 'block' }}
    />
  );
}
