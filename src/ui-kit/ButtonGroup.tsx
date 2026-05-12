interface ButtonGroupProps<T extends string | number> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function ButtonGroup<T extends string | number>({
  label,
  value,
  options,
  onChange
}: ButtonGroupProps<T>) {
  return (
    <div className="button-group">
      {label && <div className="button-group-label">{label}</div>}
      <div className="button-group-row">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className={opt.value === value ? 'btn-seg active' : 'btn-seg'}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
