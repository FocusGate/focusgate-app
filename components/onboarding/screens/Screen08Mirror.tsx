import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";
import { daysLostPerYear, hoursForAnswer } from "@/lib/onboarding";

export default function Screen08Mirror({ hoursLost, onNext }: { hoursLost: string; onNext: () => void }) {
  const hours = hoursForAnswer(hoursLost);
  const days = daysLostPerYear(hours);

  return (
    <ScreenShell>
      <ScreenHeading eyebrow="Here's the math" title="You're losing more time than you think." />
      <div
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(176,141,87,0.4)",
          borderRadius: 20,
          padding: "36px 24px",
          marginBottom: 28,
        }}
      >
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 64, color: "#b08d57", lineHeight: 1 }}>~{days} days</div>
        <p style={{ color: "#9a9da4", fontSize: 15, marginTop: 12 }}>lost to distractions every year, at {hours} hours a day.</p>
      </div>
      <p style={{ color: "#7a7d84", fontSize: 14, marginBottom: 28 }}>That&apos;s almost {Math.round(days / 7)} weeks of your life — every single year.</p>
      <ContinueButton onClick={onNext} />
    </ScreenShell>
  );
}
