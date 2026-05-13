import { useCallback, useRef } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Apply log scaling to map UI position to value. Good for LFO rate. */
  log?: boolean;
  /** Snap to a step on commit. Optional. */
  step?: number;
  /** Bipolar: fill draws from centre, double-click resets to centre. */
  bipolar?: boolean;
  /** Track height in px. Defaults to 210; PSG grid uses ~280 (2 cells). */
  trackHeight?: number;
  format?: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

const TRACK_W = 26;
const DEFAULT_TRACK_H = 210;
const CAP_H = 18;

function toNormalized(value: number, min: number, max: number, log: boolean): number {
  if (log) return Math.log(value / min) / Math.log(max / min);
  return (value - min) / (max - min);
}

function fromNormalized(
  t: number,
  min: number,
  max: number,
  log: boolean,
  step: number | undefined
): number {
  const clamped = Math.max(0, Math.min(1, t));
  let v = log ? min * Math.pow(max / min, clamped) : min + (max - min) * clamped;
  if (step !== undefined && step > 0) v = Math.round(v / step) * step;
  return v;
}

export function Slider({
  label,
  value,
  min,
  max,
  log = false,
  step,
  bipolar = false,
  trackHeight = DEFAULT_TRACK_H,
  format,
  disabled = false,
  onChange
}: SliderProps) {
  const TRACK_H = trackHeight;
  const TRAVEL = TRACK_H - CAP_H;
  const SENSITIVITY_PX = TRACK_H; // px of drag = full range

  const dragRef = useRef<{ startY: number; startT: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const t = toNormalized(value, min, max, log);
      dragRef.current = { startY: e.clientY, startT: t };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [value, min, max, log, disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const dy = e.clientY - dragRef.current.startY;
      const sensitivity = e.shiftKey ? SENSITIVITY_PX * 4 : SENSITIVITY_PX;
      const newT = dragRef.current.startT - dy / sensitivity;
      onChange(fromNormalized(newT, min, max, log, step));
    },
    [min, max, log, step, onChange, SENSITIVITY_PX]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    },
    []
  );

  const onDoubleClick = useCallback(() => {
    if (disabled) return;
    onChange(bipolar ? (min + max) / 2 : min);
  }, [bipolar, min, max, onChange, disabled]);

  const pct = Math.max(0, Math.min(1, toNormalized(value, min, max, log)));
  const capTop = TRAVEL * (1 - pct);

  // Fill: from bottom for unipolar; from centre (signed) for bipolar.
  let fillTop: number;
  let fillH: number;
  if (bipolar) {
    const centre = TRACK_H / 2;
    if (pct >= 0.5) {
      fillTop = centre - (pct - 0.5) * TRAVEL;
      fillH = (pct - 0.5) * TRAVEL;
    } else {
      fillTop = centre;
      fillH = (0.5 - pct) * TRAVEL;
    }
  } else {
    fillTop = capTop + CAP_H / 2;
    fillH = TRACK_H - fillTop;
  }

  return (
    <div className={disabled ? 'vslider disabled' : 'vslider'}>
      <div
        className="vslider-track"
        style={{ width: TRACK_W, height: TRACK_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="vslider-fill"
          style={{ top: fillTop, height: fillH }}
        />
        <div className="vslider-cap" style={{ top: capTop, height: CAP_H }} />
      </div>
      <div className="vslider-label">{label}</div>
      <div className="vslider-value">{format ? format(value) : value.toFixed(2)}</div>
    </div>
  );
}
