import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import OptionCard from "@/components/onboarding/OptionCard";

const OPTIONS = [
  { value: "extremely", icon: "🔥", label: "Extremely Committed" },
  { value: "very", icon: "💪", label: "Very committed" },
  { value: "somewhat", icon: "🙂", label: "Somewhat committed" },
  { value: "trying", icon: "🌱", label: "Just trying it out" },
];

export default function Screen14Commitment({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <ScreenShell>
      <ScreenHeading title="So, how committed are you to making this future happen?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.value} icon={opt.icon} label={opt.label} selected={value === opt.value} onSelect={() => onSelect(opt.value)} />
        ))}
      </div>
    </ScreenShell>
  );
}
