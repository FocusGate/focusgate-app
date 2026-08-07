import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";

export default function Screen03Science({ onNext }: { onNext: () => void }) {
  return (
    <ScreenShell>
      <ScreenHeading eyebrow="Why soft blockers fail" title="Willpower runs out. A real lock doesn't." />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", marginBottom: 32 }}>
        <FactRow text="Every app you can disable in one tap, you eventually will — usually within the first week." />
        <FactRow text="Willpower is a limited resource that drains over the day, which is exactly when you need focus most." />
        <FactRow text="FocusGate removes the decision entirely. There's no button to turn it off mid-session." />
      </div>
      <ContinueButton onClick={onNext} />
    </ScreenShell>
  );
}

function FactRow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: 12, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px" }}>
      <span style={{ color: "#b08d57", fontSize: 16, flexShrink: 0 }}>—</span>
      <p style={{ color: "#d8d8dc", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}
