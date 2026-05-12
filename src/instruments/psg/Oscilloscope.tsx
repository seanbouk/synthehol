import { useEffect, useRef } from 'react';

interface OscilloscopeProps {
  analyser: AnalyserNode;
}

const WIDTH = 480;
const HEIGHT = 120;

export function Oscilloscope({ analyser }: OscilloscopeProps) {
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

    const buf = new Float32Array(analyser.fftSize);
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getFloatTimeDomainData(buf);

      ctx.fillStyle = '#0a0c12';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Zero line
      ctx.strokeStyle = '#2a2f3d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();

      // Waveform
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const step = buf.length / WIDTH;
      for (let x = 0; x < WIDTH; x++) {
        const sample = buf[Math.floor(x * step)] ?? 0;
        const y = HEIGHT / 2 - sample * (HEIGHT / 2 - 4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: WIDTH, height: HEIGHT, borderRadius: 4, display: 'block' }}
    />
  );
}
