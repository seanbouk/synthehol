interface LEDToggleProps {
  value: number;       // 0 / 1 (numeric to fit the PSG store's int convention)
  onChange: (v: number) => void;
  label: string;
  /** Use the warning/destructive colour for the LED (e.g. ring mod). */
  warn?: boolean;
  disabled?: boolean;
}

export function LEDToggle({ value, onChange, label, warn = false, disabled = false }: LEDToggleProps) {
  const on = value > 0;
  const cls = [
    'led-toggle',
    on ? 'on' : '',
    warn ? 'warn' : '',
    disabled ? 'disabled' : ''
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={() => !disabled && onChange(on ? 0 : 1)}
      disabled={disabled}
    >
      <span className="led" />
      <span className="led-label">{label}</span>
    </button>
  );
}
