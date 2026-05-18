import { useCallback } from 'react';
import { Stage } from '../../ui-kit/Stage';
import {
  LEFT_PANEL,
  STEP_GRID,
  RIGHT_PANEL,
  TOP_STRIP,
  BOTTOM_STRIP,
  STEP_ROWS,
  STEP_COLS
} from './layout';
import { useDrumsStore } from './drums-state';
import { ensureDrumsEngine } from './drums-host';
import { startScheduler, stopScheduler } from './drums-scheduler';
import { DEFAULT_KIT } from './kits';

/**
 * Drum machine panel.
 *
 * Pattern + transport state lives in the drums store; this component
 * binds the UI to it. The play button lazily creates the audio engine
 * on first press (browser user-gesture requirement) and starts the
 * sequencer. Step cells are click-to-toggle.
 *
 * See `grid.ts`, `layout.ts`, and `index.css` (`.drums-*` rules) for
 * the geometry; see `drums-engine.ts`, `drums-scheduler.ts` for the
 * audio path.
 */

const MODE_TABS = ['STEP', 'LIVE', 'AUTOM', 'PATTERN'] as const;

function Region({
  rect,
  className,
  children
}: {
  rect: { x: number; y: number; width: number; height: number };
  className: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height
      }}
    >
      {children}
    </div>
  );
}

export function DrumsPanel() {
  const pattern      = useDrumsStore((s) => s.pattern);
  const isPlaying    = useDrumsStore((s) => s.isPlaying);
  const bpm          = useDrumsStore((s) => s.bpm);
  const currentStep  = useDrumsStore((s) => s.currentStep);
  const toggleStep   = useDrumsStore((s) => s.toggleStep);
  const setPlaying   = useDrumsStore((s) => s.setPlaying);
  const setBpm       = useDrumsStore((s) => s.setBpm);

  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      setPlaying(false);
      stopScheduler();
      return;
    }
    // First press needs a user gesture to resume AudioContext.
    const engine = await ensureDrumsEngine();
    setPlaying(true);
    // engine.output is already connected; ensureDrumsEngine returns ctx via host.
    const ctx = engine.output.context as AudioContext;
    startScheduler(ctx, engine);
  }, [isPlaying, setPlaying]);

  const handleBpmStep = useCallback(
    (delta: number) => setBpm(bpm + delta),
    [bpm, setBpm]
  );

  return (
    <Stage>
      <div className="drums-body">

        {/* ── Top strip: kit + mode tabs (left), pattern + tempo (right) ── */}
        <Region rect={TOP_STRIP} className="drums-region drums-top">
          <div className="drums-top-left">
            <span className="drums-kit-name">KIT · {DEFAULT_KIT.name}</span>
            <div className="drums-mode-tabs">
              {MODE_TABS.map((m, i) => (
                <span
                  key={m}
                  className={`drums-mode-tab ${i === 0 ? 'active' : ''}`}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="drums-top-right">
            <span className="drums-pattern-id">PTN 01 / 16</span>
            <div className="drums-tempo-control">
              <button
                type="button"
                className="drums-tempo-btn"
                onClick={() => handleBpmStep(-1)}
                aria-label="Decrease tempo"
              >−</button>
              <span className="drums-tempo">♩ = {bpm}</span>
              <button
                type="button"
                className="drums-tempo-btn"
                onClick={() => handleBpmStep(+1)}
                aria-label="Increase tempo"
              >+</button>
            </div>
          </div>
        </Region>

        {/* ── Left panel: 8 lane label strips, one per grid row ────── */}
        <Region rect={LEFT_PANEL} className="drums-region drums-left">
          {DEFAULT_KIT.lanes.map((lane, i) => (
            <div key={lane.name} className="drums-lane-label" data-lane={i}>
              <span className="drums-lane-color" data-lane={i} />
              <span className="drums-lane-name">{lane.name}</span>
              <span className="drums-lane-buttons">
                <span className="drums-lane-btn">M</span>
                <span className="drums-lane-btn">S</span>
              </span>
            </div>
          ))}
        </Region>

        {/* ── Step grid: 16 × 8 cells. Click toggles on/off. ─────────── */}
        <Region rect={STEP_GRID} className="drums-region drums-grid">
          {Array.from({ length: STEP_ROWS }, (_, r) =>
            Array.from({ length: STEP_COLS }, (_, c) => {
              const cell = pattern[r]?.[c];
              const on = cell?.on ?? false;
              const beatBoundary = c % 4 === 0;
              const playhead = currentStep === c;
              const classes = [
                'drums-step',
                on ? 'on' : '',
                beatBoundary ? 'beat' : '',
                playhead ? 'playhead' : ''
              ].filter(Boolean).join(' ');
              return (
                <button
                  type="button"
                  key={`${r}-${c}`}
                  className={classes}
                  data-lane={r}
                  onClick={() => toggleStep(r, c)}
                  aria-label={`Lane ${r + 1} step ${c + 1}${on ? ' (on)' : ''}`}
                />
              );
            })
          )}
        </Region>

        {/* ── Right panel: context-sensitive area (placeholder) ─────── */}
        <Region rect={RIGHT_PANEL} className="drums-region drums-right">
          <div className="drums-context-header">PARAMETERS</div>
          <div className="drums-context-hint">
            hold a step, lane, or pattern
          </div>
          <div className="drums-context-display" />
        </Region>

        {/* ── Bottom strip: transport (left), readout (right) ───────── */}
        <Region rect={BOTTOM_STRIP} className="drums-region drums-bottom">
          <div className="drums-bottom-left">
            <button
              type="button"
              className={`drums-transport drums-play ${isPlaying ? 'on' : ''}`}
              onClick={handlePlayStop}
              aria-label={isPlaying ? 'Stop' : 'Play'}
            >
              {isPlaying ? '■' : '▶'}
            </button>
          </div>
          <div className="drums-bottom-center">
            <span className="drums-page-dots">● ○ ○ ○</span>
            <span className="drums-muted">page 1 / 4</span>
          </div>
          <div className="drums-bottom-right">
            <span className="drums-muted">
              {isPlaying && currentStep >= 0
                ? `step ${currentStep + 1} / 16`
                : 'stopped'}
            </span>
          </div>
        </Region>

      </div>
    </Stage>
  );
}
