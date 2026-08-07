import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";

export default function Screen04Name({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const valid = value.trim().length > 0;

  return (
    <ScreenShell maxWidth={440}>
      <ScreenHeading title="What should we call you?" subtitle="We'll use this to personalize the rest of your plan." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onNext();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your first name"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            padding: "16px 18px",
            borderRadius: 14,
            fontSize: 17,
            outline: "none",
            textAlign: "center",
          }}
        />
        <ContinueButton onClick={onNext} disabled={!valid} />
      </form>
    </ScreenShell>
  );
}
