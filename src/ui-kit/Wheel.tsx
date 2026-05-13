import { useCallback, useRef } from 'react';

interface WheelProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Springs back to (min+max)/2 when released. Pitch wheels do this. */
  snapBack?: boolean;
  /** Custom formatter for the readout. */
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

const WHEEL_W = 96;
const WHEEL_H = 600;
const SENSITIVITY = WHEEL_H; // pixels of drag = full range

export function Wheel({
  label,
  value,
  min,
  max,
  snapBack = false,
  format,
  onChange
}: WheelProps) {
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = { startY: e.clientY, startValue: value };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [value]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const dy = e.clientY - dragRef.current.startY;
      // Upward drag = increase value (negative dy)
      const delta = -dy / SENSITIVITY;
      const range = max - min;
      const next = Math.max(min, Math.min(max, dragRef.current.startValue + delta * range));
      onChange(next);
    },
    [min, max, onChange]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      if (snapBack) onChange((min + max) / 2);
    },
    [snapBack, min, max, onChange]
  );

  const pct = (value - min) / (max - min);
  const indicatorTop = (1 - pct) * 100;

  return (
    <div className="wheel">
      <div
        className="wheel-track"
        style={{ width: WHEEL_W, height: WHEEL_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="wheel-indicator" style={{ top: `${indicatorTop}%` }} />
      </div>
      <div className="wheel-label">{label}</div>
      <div className="wheel-readout">{format ? format(value) : value.toFixed(2)}</div>
    </div>
  );
}
