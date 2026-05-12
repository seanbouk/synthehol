import { useCallback, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Apply log scaling to map UI position to value. Good for cutoff, env times. */
  log?: boolean;
  /** Snap to integer values. */
  step?: number;
  /** Custom value formatter for the readout. */
  format?: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

const SIZE = 52;
const RADIUS = 20;
const ARC_START = Math.PI * 0.75;       // bottom-left
const ARC_END = Math.PI * 0.25 + Math.PI * 2; // bottom-right, going clockwise

function toNormalized(value: number, min: number, max: number, log: boolean): number {
  if (log) return Math.log(value / min) / Math.log(max / min);
  return (value - min) / (max - min);
}

function fromNormalized(t: number, min: number, max: number, log: boolean, step: number | undefined): number {
  const clamped = Math.max(0, Math.min(1, t));
  let v = log ? min * Math.pow(max / min, clamped) : min + (max - min) * clamped;
  if (step !== undefined && step > 0) v = Math.round(v / step) * step;
  return v;
}

export function Knob({ label, value, min, max, log = false, step, format, disabled = false, onChange }: KnobProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ startY: number; startT: number } | null>(null);

  // Redraw on value/range change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Background arc
    ctx.strokeStyle = disabled ? '#1a1d27' : '#2a2f3d';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, ARC_START, ARC_END);
    ctx.stroke();

    // Value arc
    const t = toNormalized(value, min, max, log);
    const angle = ARC_START + t * (ARC_END - ARC_START);
    ctx.strokeStyle = disabled ? '#404552' : '#6ee7b7';
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, ARC_START, angle);
    ctx.stroke();

    // Indicator line from centre
    const ix = cx + Math.cos(angle) * (RADIUS - 6);
    const iy = cy + Math.sin(angle) * (RADIUS - 6);
    ctx.strokeStyle = disabled ? '#5b6072' : '#e6e8ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ix, iy);
    ctx.stroke();
  }, [value, min, max, log, disabled]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const t = toNormalized(value, min, max, log);
      dragRef.current = { startY: e.clientY, startT: t };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [value, min, max, log, disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const dy = e.clientY - dragRef.current.startY;
      // 200px of vertical drag = full range. Shift slows it down 4x.
      const sensitivity = e.shiftKey ? 800 : 200;
      const newT = dragRef.current.startT - dy / sensitivity;
      onChange(fromNormalized(newT, min, max, log, step));
    },
    [min, max, log, step, onChange]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
  }, []);

  const onDoubleClick = useCallback(() => {
    // Reset to centre of range on double-click.
    onChange(fromNormalized(0.5, min, max, log, step));
  }, [min, max, log, step, onChange]);

  return (
    <div className={disabled ? 'knob disabled' : 'knob'}>
      <canvas
        ref={canvasRef}
        style={{
          width: SIZE,
          height: SIZE,
          cursor: disabled ? 'not-allowed' : 'ns-resize'
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={disabled ? undefined : onDoubleClick}
      />
      <div className="knob-label">{label}</div>
      <div className="knob-value">{format ? format(value) : value.toFixed(2)}</div>
    </div>
  );
}
