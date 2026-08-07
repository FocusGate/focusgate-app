"use client";

import MagneticButton from "@/components/MagneticButton";

/** Manual-advance button for the non-quiz screens (framing, mirroring, social proof,
 *  summary) — quiz/commitment screens auto-advance via OptionCard instead and never use
 *  this. */
export default function ContinueButton({
  onClick,
  children = "Continue →",
  disabled,
}: {
  onClick: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <MagneticButton>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          background: disabled ? "#26262b" : "#b08d57",
          color: disabled ? "#5b5e66" : "#fff",
          border: "none",
          padding: "16px 36px",
          borderRadius: 999,
          fontSize: 16,
          fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
          boxShadow: disabled ? "none" : "0 0 30px rgba(176,141,87,0.35)",
        }}
      >
        {children}
      </button>
    </MagneticButton>
  );
}
