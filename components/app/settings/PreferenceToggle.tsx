export default function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{label}</div>
        {description && <div style={{ color: "#7a7d84", fontSize: 12, marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0,
          width: 42,
          height: 24,
          borderRadius: 999,
          border: "none",
          background: checked ? "#F59E0B" : "#26262b",
          position: "relative",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "background 0.2s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );
}
