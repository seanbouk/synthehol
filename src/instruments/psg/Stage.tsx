import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Fixed 2200×800 design surface, uniformly CSS-scaled to fit whatever
 * container it sits in. Children are absolutely positioned in stage
 * coordinates and never reflow — the whole stage just scales.
 *
 * Base is 2200×800 (= 2.75:1) — picked so 1440p / ultrawide renders
 * around 1.5× (sharp at DPR=2) and 1080p sits at ~1.1×.
 */
export const STAGE_W = 2200;
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
