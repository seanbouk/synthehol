import { useCallback, useRef } from 'react';

/**
 * Pointer-event hook that distinguishes a short tap from a long hold.
 *
 * Works for both mouse and touch via Pointer Events. A `pointerdown`
 * starts a hold timer; release before the threshold fires `onTap`,
 * release after fires nothing (the hold already fired on threshold).
 * Movement past `moveTolerance` pixels cancels the gesture entirely
 * — useful so scrolling/swipes don't trigger.
 *
 *   const h = useHoldOrTap({ onTap: doTap, onHold: doHold });
 *   return <button {...h}>…</button>;
 */
export interface HoldOrTapOptions {
  onTap?: () => void;
  onHold?: () => void;
  /** Time in ms after pointerdown before a hold is detected. Default 300. */
  holdMs?: number;
  /** Pixel movement that cancels the gesture entirely. Default 8. */
  moveTolerance?: number;
}

export interface HoldOrTapHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

export function useHoldOrTap(options: HoldOrTapOptions): HoldOrTapHandlers {
  const { onTap, onHold, holdMs = 300, moveTolerance = 8 } = options;

  const timerRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      heldRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      cancelTimer();
      timerRef.current = window.setTimeout(() => {
        heldRef.current = true;
        timerRef.current = null;
        onHold?.();
      }, holdMs);
    },
    [cancelTimer, onHold, holdMs]
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      const wasHeld = heldRef.current;
      const timerWasRunning = timerRef.current !== null;
      cancelTimer();
      startPosRef.current = null;
      // Only fire tap if we released before the hold timer fired AND
      // the gesture wasn't cancelled by movement (timer was running).
      if (!wasHeld && timerWasRunning) onTap?.();
    },
    [cancelTimer, onTap]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startPosRef.current;
      if (!start || timerRef.current === null) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > moveTolerance * moveTolerance) {
        cancelTimer();
        startPosRef.current = null;
      }
    },
    [cancelTimer, moveTolerance]
  );

  const onPointerCancel = useCallback(() => {
    cancelTimer();
    startPosRef.current = null;
  }, [cancelTimer]);

  const onPointerLeave = useCallback(() => {
    cancelTimer();
    startPosRef.current = null;
  }, [cancelTimer]);

  return { onPointerDown, onPointerUp, onPointerMove, onPointerCancel, onPointerLeave };
}
