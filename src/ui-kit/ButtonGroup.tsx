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
      {label && <div className="button-group-label">{label}</div>}
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
