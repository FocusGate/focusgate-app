import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import OptionCard from "@/components/onboarding/OptionCard";
import { HOURS_LOST_OPTIONS } from "@/lib/onboarding";

export default function Screen06HoursLost({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <ScreenShell>
      <ScreenHeading eyebrow="Be honest" title="How many hours a day do you lose to distractions?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {HOURS_LOST_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} label={opt.label} selected={value === opt.value} onSelect={() => onSelect(opt.value)} />
        ))}
      </div>
    </ScreenShell>
  );
}
