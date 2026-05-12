interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step, format, disabled = false, onChange }: SliderProps) {
  return (
    <div className={disabled ? 'slider disabled' : 'slider'}>
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step ?? (max - min) / 200}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
