import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import OptionCard from "@/components/onboarding/OptionCard";

const OPTIONS = [
  { value: "turn-off", label: "Yes, but I just turn them off" },
  { value: "didnt-stick", label: "Yes, they didn't stick" },
  { value: "never-tried", label: "No, never tried" },
  { value: "willpower", label: "I rely on willpower alone" },
];

export default function Screen07PastFailures({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <ScreenShell>
      <ScreenHeading eyebrow="One more" title="Have you tried screen time limits before?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.value} label={opt.label} selected={value === opt.value} onSelect={() => onSelect(opt.value)} />
        ))}
      </div>
    </ScreenShell>
  );
}
