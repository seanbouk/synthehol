import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE_W, STAGE_H } from './grid';

/**
 * Fixed 2240×800 design surface (14×5 cells × 160 px), uniformly CSS-
 * scaled to fit whatever container it sits in. Children are absolutely
 * positioned in stage coordinates and never reflow — the whole stage
 * just scales.
 *
 * Base is 2240×800 (= 2.8:1, 14:5) — picked so every PSG panel control
 * lands on a 160 px grid cell.
 */
export { STAGE_W, STAGE_H };

export function Stage({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const s = Math.min(rect.width / STAGE_W, rect.height / STAGE_H) * 0.95;
      setScale(Math.max(0.1, s));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="psg-stage" ref={containerRef}>
      <div
        className="psg-stage-inner"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
