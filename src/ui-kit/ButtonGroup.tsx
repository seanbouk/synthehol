interface ButtonGroupProps<T extends string | number> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (v: T) => void;
}

export function ButtonGroup<T extends string | number>({
  label,
  value,
  options,
  disabled = false,
  onChange
}: ButtonGroupProps<T>) {
  return (
    <div className={disabled ? 'button-group disabled' : 'button-group'}>
      {/* When label is undefined the slot is omitted; when it's the empty
          string we render a non-breaking space so the row's vertical
          position still matches sibling groups that DO have a label
          (e.g. Drive/Filter aligning with LFO's "Destination"). */}
      {label !== undefined && (
        <div className="button-group-label">{label || ' '}</div>
      )}
      <div className="button-group-row">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={opt.value === value ? 'btn-seg active' : 'btn-seg'}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
