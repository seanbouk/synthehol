import { useCallback } from 'react';
import { Stage } from '../../ui-kit/Stage';
import { useHoldOrTap } from '../../ui-kit/useHoldOrTap';
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
import { ParamEditor } from './ParamEditor';

/**
 * Drum machine panel.
 *
 * Pattern + transport + selection live in the drums store; this
 * component binds the UI to it. Step cells distinguish tap from hold:
 * tap toggles on/off, hold opens that step in the right-panel editor.
 * Lane labels are hold-to-edit too (length + future mute/solo).
 *
 * Steps beyond a lane's `length` are dimmed and inert — that's how
 * polymetric reads visually. Per-lane playheads advance independently
 * via the scheduler's per-lane cursors.
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

// ─────────────────────────────────────────────────────────────────────
// Step cell
// ─────────────────────────────────────────────────────────────────────

function StepCell({ lane, step }: { lane: number; step: number }) {
  const cell = useDrumsStore((s) => s.pattern.lanes[lane]?.steps[step]);
  const laneLength = useDrumsStore((s) => s.pattern.lanes[lane]?.length ?? 0);
  const playhead = useDrumsStore((s) => s.currentStepPerLane[lane] === step);
  const selected = useDrumsStore((s) =>
    s.selection.kind === 'step' && s.selection.lane === lane && s.selection.step === step
  );

  const toggleStep = useDrumsStore((s) => s.toggleStep);
  const setSelection = useDrumsStore((s) => s.setSelection);

  const outOfRange = step >= laneLength;

  const handlers = useHoldOrTap({
    onTap: () => {
      if (outOfRange) return;
      toggleStep(lane, step);
    },
    onHold: () => {
      // Hold works even on out-of-range steps so users can preview
      // params before extending the lane.
      setSelection({ kind: 'step', lane, step });
    }
  });

  if (!cell) return <div />;

  const beat = step % 4 === 0;
  const classes = [
    'drums-step',
    cell.on ? 'on' : '',
    beat ? 'beat' : '',
    playhead ? 'playhead' : '',
    selected ? 'selected' : '',
    outOfRange ? 'out-of-range' : '',
    cell.mute ? 'muted' : '',
    !cell.on && (cell.ratchet > 1 || cell.condition.kind !== 'none' || cell.probability < 1)
      ? 'has-meta'
      : ''
  ]
    .filter(Boolean)
    .join(' ');

  // A small indicator badge in the corner of a step that has
  // non-default per-step state (ratchet, condition, probability) so
  // users see at a glance that a step is "loaded". Lit steps show
  // the badge as well.
  const hasMeta =
    cell.ratchet > 1 || cell.condition.kind !== 'none' || cell.probability < 1;

  return (
    <button
      type="button"
      className={classes}
      data-lane={lane}
      aria-label={`Lane ${lane + 1} step ${step + 1}${cell.on ? ' (on)' : ''}`}
      style={cell.on ? { opacity: cell.mute ? 0.35 : 0.4 + cell.velocity * 0.6 } : undefined}
      {...handlers}
    >
      {hasMeta && <span className="drums-step-meta" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Lane label row
// ─────────────────────────────────────────────────────────────────────

function LaneLabelRow({ lane }: { lane: number }) {
  const laneDef = DEFAULT_KIT.lanes[lane];
  const selected = useDrumsStore(
    (s) => s.selection.kind === 'lane' && s.selection.lane === lane
  );
  const setSelection = useDrumsStore((s) => s.setSelection);

  const handlers = useHoldOrTap({
    onTap: () => {
      // Tap toggles selection of this lane (so a second tap clears it).
      setSelection(selected ? { kind: 'none' } : { kind: 'lane', lane });
    },
    onHold: () => {
      setSelection({ kind: 'lane', lane });
    }
  });

  if (!laneDef) return null;

  return (
    <div
      className={`drums-lane-label ${selected ? 'selected' : ''}`}
      data-lane={lane}
      {...handlers}
    >
      <span className="drums-lane-color" data-lane={lane} />
      <span className="drums-lane-name">{laneDef.name}</span>
      <span className="drums-lane-buttons">
        <span className="drums-lane-btn">M</span>
        <span className="drums-lane-btn">S</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────

export function DrumsPanel() {
  const isPlaying = useDrumsStore((s) => s.isPlaying);
  const bpm = useDrumsStore((s) => s.bpm);
  const setPlaying = useDrumsStore((s) => s.setPlaying);
  const setBpm = useDrumsStore((s) => s.setBpm);
  const setSelection = useDrumsStore((s) => s.setSelection);

  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      setPlaying(false);
      stopScheduler();
      return;
    }
    const engine = await ensureDrumsEngine();
    setPlaying(true);
    const ctx = engine.output.context as AudioContext;
    startScheduler(ctx, engine);
  }, [isPlaying, setPlaying]);

  const handleBpmStep = useCallback(
    (delta: number) => setBpm(bpm + delta),
    [bpm, setBpm]
  );

  // Click on the body background — but not on any interactive child
  // — deselects. Children with their own pointer handlers stop the
  // propagation if needed; otherwise this catch-all clears selection.
  const handleBodyPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setSelection({ kind: 'none' });
      }
    },
    [setSelection]
  );

  return (
    <Stage>
      <div className="drums-body" onPointerDown={handleBodyPointerDown}>

        {/* ── Top strip ───────────────────────────────────────────── */}
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

        {/* ── Left panel: lane label strips ───────────────────────── */}
        <Region rect={LEFT_PANEL} className="drums-region drums-left">
          {DEFAULT_KIT.lanes.map((lane, i) => (
            <LaneLabelRow key={lane.name} lane={i} />
          ))}
        </Region>

        {/* ── Step grid ───────────────────────────────────────────── */}
        <Region rect={STEP_GRID} className="drums-region drums-grid">
          {Array.from({ length: STEP_ROWS }, (_, r) =>
            Array.from({ length: STEP_COLS }, (_, c) => (
              <StepCell key={`${r}-${c}`} lane={r} step={c} />
            ))
          )}
        </Region>

        {/* ── Right panel: context-sensitive editor ───────────────── */}
        <Region rect={RIGHT_PANEL} className="drums-region drums-right">
          <ParamEditor />
        </Region>

        {/* ── Bottom strip ────────────────────────────────────────── */}
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
            <PlayheadReadout />
          </div>
        </Region>

      </div>
    </Stage>
  );
}

function PlayheadReadout() {
  const isPlaying = useDrumsStore((s) => s.isPlaying);
  const step = useDrumsStore((s) => s.currentStepPerLane[0] ?? -1);
  if (!isPlaying || step < 0) return <span className="drums-muted">stopped</span>;
  return <span className="drums-muted">kick · step {step + 1}</span>;
}
