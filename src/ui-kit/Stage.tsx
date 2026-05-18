import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Shared 14:5 design surface — 2240×800 px, uniformly CSS-scaled to fit
 * its container. Children are absolutely positioned in stage coords and
 * never reflow; the whole stage just scales.
 *
 * Instruments lay out on this canvas at whatever grid granularity suits
 * them:
 *   - PSG     14×5  cells of 160 px  (see src/instruments/psg/grid.ts)
 *   - Drums   28×10 cells of  80 px  (see src/instruments/drums/grid.ts)
 *
 * Both grids resolve to the same 2240×800 surface, so the Stage stays a
 * pure visual host and never needs to know which instrument it's
 * presenting.
 */
export const STAGE_W = 2240;
export const STAGE_H = 800;

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
    <div className="stage" ref={containerRef}>
      <div
        className="stage-inner"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
