import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";

const TESTIMONIALS = [
  { quote: "I haven't touched Instagram during a study session in three weeks. That's never happened before.", name: "Priya, pre-med" },
  { quote: "The break gates sound annoying but they actually work — I just don't bother most of the time.", name: "Marcus, CS major" },
  { quote: "First app that made quitting harder than finishing. Exactly what I needed.", name: "Sofia, senior year" },
];

export default function Screen10SocialProof({ onNext }: { onNext: () => void }) {
  return (
    <ScreenShell maxWidth={620}>
      <ScreenHeading eyebrow="You're not alone" title="Students already locked in." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, textAlign: "left" }}>
        {TESTIMONIALS.map((t) => (
          <div key={t.name} style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ color: "#b08d57", fontSize: 13, marginBottom: 8 }}>★★★★★</div>
            <p style={{ color: "#d8d8dc", fontSize: 14, lineHeight: 1.6, margin: 0 }}>&ldquo;{t.quote}&rdquo;</p>
            <div style={{ color: "#7a7d84", fontSize: 12, marginTop: 10 }}>{t.name}</div>
          </div>
        ))}
      </div>
      <ContinueButton onClick={onNext} />
    </ScreenShell>
  );
}
