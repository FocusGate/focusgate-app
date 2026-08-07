import { ShieldCheck, Smartphone, Flame } from "lucide-react";
import ScreenShell from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";
import { computeTargetDate, daysLostPerYear, hoursForAnswer, GOAL_OPTIONS } from "@/lib/onboarding";

export default function Screen13Summary({
  name,
  hoursLost,
  goals,
  goalTimeframeWeeks,
  onNext,
}: {
  name: string;
  hoursLost: string;
  goals: string[];
  goalTimeframeWeeks: number;
  onNext: () => void;
}) {
  const hours = hoursForAnswer(hoursLost);
  const hoursSavedDaily = Math.max(1, Math.round(hours));
  const targetDate = computeTargetDate(goalTimeframeWeeks || undefined);
  const displayName = name.trim() || "You";
  const primaryGoalLabel = GOAL_OPTIONS.find((g) => g.value === goals[0])?.label;

  return (
    <ScreenShell maxWidth={640}>
      <div
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(176,141,87,0.4)",
          borderRadius: 24,
          padding: "36px 28px",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(26px, 4vw, 34px)", color: "#fff", lineHeight: 1.3, margin: 0 }}>
          {displayName}, you will have unbreakable focus by <span style={{ color: "#b08d57" }}>{targetDate}</span>.
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 28 }}>
          <StatTile icon={<Smartphone size={18} color="#b08d57" />} label={`${hoursSavedDaily}+ Hours Saved Daily`} />
          <StatTile icon={<ShieldCheck size={18} color="#b08d57" />} label="Zero-Cheating Lockout Mode" />
          <StatTile icon={<Flame size={18} color="#b08d57" />} label="Unstoppable Focus Streak" />
        </div>

        <div style={{ marginTop: 24, color: "#b08d57", fontSize: 13, fontWeight: 700 }}>⚡ {daysLostPerYear(hours)}+ hours reclaimed this year</div>

        {primaryGoalLabel && (
          <div style={{ marginTop: 14, color: "#9a9da4", fontSize: 13 }}>
            🎯 Locked in on <span style={{ color: "#fff", fontWeight: 700 }}>{primaryGoalLabel}</span>
            {goals.length > 1 ? ` +${goals.length - 1} more` : ""}
          </div>
        )}
      </div>

      <div style={{ textAlign: "left", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px 26px", marginBottom: 28 }}>
        <div style={{ color: "#7a7d84", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          How we&apos;ll get you there
        </div>
        <FeatureRow title="Hardcore Locked-In Mode" description="No cheat buttons, no pauses. Distractions stay locked until your session timer officially finishes." />
        <FeatureRow title="The Gates" description="Every break has to be earned — a challenge, a written reason, or both — before your session pauses." />
      </div>

      <ContinueButton onClick={onNext}>Begin My Transformation →</ContinueButton>
    </ScreenShell>
  );
}

function StatTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ background: "#101012", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#d8d8dc", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function FeatureRow({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{title}</div>
      <p style={{ color: "#9a9da4", fontSize: 13, lineHeight: 1.55, margin: "4px 0 0" }}>{description}</p>
    </div>
  );
}
