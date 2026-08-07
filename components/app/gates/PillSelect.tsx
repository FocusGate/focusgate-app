export default function PillSelect<T extends string | number>({
  options,
  value,
  onChange,
  accent,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            style={{
              background: active ? accent : "transparent",
              color: active ? "#0a0a0a" : "#9a9da4",
              border: `1px solid ${active ? accent : "rgba(255,255,255,0.15)"}`,
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
