/**
 * Right-panel parameter editors. Bound to the drums store's
 * `selection` — renders the step or lane editor depending on what's
 * selected.
 *
 * Layout: one HSlider per continuous param, ButtonGroup for ratchet,
 * a two-row picker for condition (kind + N), and a LEDToggle for
 * mute. Header shows what's selected; tap-outside (handled in
 * DrumsPanel) clears the selection.
 */

import { HSlider } from '../../ui-kit/HSlider';
import { ButtonGroup } from '../../ui-kit/ButtonGroup';
import { LEDToggle } from '../../ui-kit/LEDToggle';
import {
  useDrumsStore,
  RATCHET_VALUES,
  CONDITION_N_VALUES,
  type StepCondition,
  type ConditionN,
  type Ratchet
} from './drums-state';
import { DEFAULT_KIT } from './kits';

// ─────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────

const pct = (v: number) => `${Math.round(v * 100)}%`;
const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
const stepLength = (v: number) =>
  v < 1 ? `${Math.round(v * 100)}%` : `${v.toFixed(2)} steps`;
const stepCount = (v: number) => `${Math.round(v)} step${Math.round(v) === 1 ? '' : 's'}`;

// ─────────────────────────────────────────────────────────────────────
// Condition picker
// ─────────────────────────────────────────────────────────────────────

type CondKind = 'none' | 'every' | 'notEvery';

const COND_KIND_OPTIONS: { value: CondKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'every', label: 'Every' },
  { value: 'notEvery', label: 'Not Every' }
];

function ConditionPicker({
  value,
  onChange
}: {
  value: StepCondition;
  onChange: (v: StepCondition) => void;
}) {
  const kind: CondKind = value.kind;
  const n: ConditionN = value.kind === 'none' ? 2 : value.n;

  const handleKind = (k: CondKind) => {
    if (k === 'none') onChange({ kind: 'none' });
    else onChange({ kind: k, n });
  };
  const handleN = (newN: ConditionN) => {
    if (value.kind === 'none') return;
    onChange({ kind: value.kind, n: newN });
  };

  return (
    <div className="drums-cond-picker">
      <ButtonGroup
        label="Condition"
        value={kind}
        options={COND_KIND_OPTIONS}
        onChange={handleKind}
      />
      <ButtonGroup
        value={n}
        options={CONDITION_N_VALUES.map((v) => ({
          value: v,
          label: String(v)
        }))}
        disabled={kind === 'none'}
        onChange={handleN}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step editor
// ─────────────────────────────────────────────────────────────────────

function StepEditor({ lane, step }: { lane: number; step: number }) {
  const cell = useDrumsStore((s) => s.pattern.lanes[lane]?.steps[step]);
  const setStepParam = useDrumsStore((s) => s.setStepParam);
  const toggleStep = useDrumsStore((s) => s.toggleStep);
  if (!cell) return null;

  const laneName = DEFAULT_KIT.lanes[lane]?.name ?? '—';

  return (
    <div className="drums-editor">
      <div className="drums-editor-header">
        STEP · {laneName} · {step + 1}
      </div>

      <LEDToggle
        label={cell.on ? 'Active' : 'Inactive'}
        value={cell.on ? 1 : 0}
        onChange={() => toggleStep(lane, step)}
      />

      <HSlider
        label="Velocity"
        value={cell.velocity}
        min={0}
        max={1}
        step={0.01}
        format={pct}
        onChange={(v) => setStepParam(lane, step, 'velocity', v)}
      />

      <HSlider
        label="Length"
        value={cell.length}
        min={0.05}
        max={4}
        log
        format={stepLength}
        onChange={(v) => setStepParam(lane, step, 'length', v)}
      />

      <HSlider
        label="µTime"
        value={cell.uTime}
        min={-0.5}
        max={0.5}
        step={0.01}
        bipolar
        format={signedPct}
        onChange={(v) => setStepParam(lane, step, 'uTime', v)}
      />

      <HSlider
        label="Chance"
        value={cell.probability}
        min={0}
        max={1}
        step={0.01}
        format={pct}
        onChange={(v) => setStepParam(lane, step, 'probability', v)}
      />

      <ButtonGroup
        label="Ratchet"
        value={cell.ratchet}
        options={RATCHET_VALUES.map((n) => ({ value: n, label: String(n) }))}
        onChange={(n) => setStepParam(lane, step, 'ratchet', n as Ratchet)}
      />

      <ConditionPicker
        value={cell.condition}
        onChange={(c) => setStepParam(lane, step, 'condition', c)}
      />

      <LEDToggle
        label="Mute"
        value={cell.mute ? 1 : 0}
        warn
        onChange={(v) => setStepParam(lane, step, 'mute', v > 0)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Lane editor
// ─────────────────────────────────────────────────────────────────────

function LaneEditor({ lane }: { lane: number }) {
  const ln = useDrumsStore((s) => s.pattern.lanes[lane]);
  const setLaneLength = useDrumsStore((s) => s.setLaneLength);
  if (!ln) return null;

  const laneName = DEFAULT_KIT.lanes[lane]?.name ?? '—';

  return (
    <div className="drums-editor">
      <div className="drums-editor-header">LANE · {laneName}</div>

      <HSlider
        label="Length"
        value={ln.length}
        min={1}
        max={16}
        step={1}
        format={stepCount}
        onChange={(v) => setLaneLength(lane, v)}
      />

      <div className="drums-editor-hint">
        Polymetric — different lanes can run at different lengths.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────

export function ParamEditor() {
  const selection = useDrumsStore((s) => s.selection);

  if (selection.kind === 'step') {
    return <StepEditor lane={selection.lane} step={selection.step} />;
  }
  if (selection.kind === 'lane') {
    return <LaneEditor lane={selection.lane} />;
  }
  return (
    <div className="drums-editor empty">
      <div className="drums-context-header">PARAMETERS</div>
      <div className="drums-context-hint">
        hold a step or a lane label to edit
      </div>
      <div className="drums-context-display" />
    </div>
  );
}
