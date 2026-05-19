import { useCallback, useRef } from 'react';

/**
 * Compact horizontal slider — for tight panels where a vertical
 * Slider would chew too much space. Drag horizontally; click anywhere
 * on the track to jump there. Bipolar mode draws the fill from the
 * centre out (useful for ±-shaped parameters like uTime).
 */

interface HSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  log?: boolean;
  bipolar?: boolean;
  /** Track width in px. Default 200. */
  width?: number;
  format?: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

const TRACK_H = 6;
const CAP_W = 14;
const CAP_H = 18;
const DEFAULT_WIDTH = 200;

function toNorm(value: number, min: number, max: number, log: boolean): number {
  if (log) return Math.log(value / min) / Math.log(max / min);
  return (value - min) / (max - min);
}
function fromNorm(t: number, min: number, max: number, log: boolean, step?: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  let v = log ? min * Math.pow(max / min, clamped) : min + (max - min) * clamped;
  if (step !== undefined && step > 0) v = Math.round(v / step) * step;
  return v;
}

export function HSlider({
  label,
  value,
  min,
  max,
  step,
  log = false,
  bipolar = false,
  width = DEFAULT_WIDTH,
  format,
  disabled = false,
  onChange
}: HSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = (e.clientX - rect.left) / rect.width;
      onChange(fromNorm(t, min, max, log, step));
    },
    [min, max, log, step, onChange]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      draggingRef.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setFromPointer(e);
    },
    [disabled, setFromPointer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      setFromPointer(e);
    },
    [setFromPointer]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = false;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    },
    []
  );

  const onDoubleClick = useCallback(() => {
    if (disabled) return;
    onChange(bipolar ? (min + max) / 2 : min);
  }, [bipolar, min, max, onChange, disabled]);

  const pct = Math.max(0, Math.min(1, toNorm(value, min, max, log)));
  const capLeft = pct * (width - CAP_W);

  let fillLeft: number, fillW: number;
  if (bipolar) {
    const centre = width / 2;
    if (pct >= 0.5) {
      fillLeft = centre;
      fillW = (pct - 0.5) * width;
    } else {
      fillLeft = pct * width;
      fillW = (0.5 - pct) * width;
    }
  } else {
    fillLeft = 0;
    fillW = pct * width;
  }

  return (
    <div className={disabled ? 'hslider disabled' : 'hslider'}>
      <div className="hslider-label">{label}</div>
      <div
        ref={trackRef}
        className="hslider-track"
        style={{ width, height: TRACK_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="hslider-fill"
          style={{ left: fillLeft, width: fillW }}
        />
        <div
          className="hslider-cap"
          style={{ left: capLeft, width: CAP_W, height: CAP_H }}
        />
      </div>
      <div className="hslider-value">
        {format ? format(value) : value.toFixed(2)}
      </div>
    </div>
  );
}
