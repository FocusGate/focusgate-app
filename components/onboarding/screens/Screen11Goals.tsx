import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import OptionCard from "@/components/onboarding/OptionCard";
import ContinueButton from "@/components/onboarding/ContinueButton";
import { GOAL_OPTIONS } from "@/lib/onboarding";

/** Multi-select — unlike every other quiz screen, picking a card here doesn't
 *  auto-advance (you're allowed more than one), so a manual Continue button appears once
 *  at least one goal is selected. These goals double as signup-time inputs: they steer
 *  which sites get suggested for the default block list and what the dashboard's
 *  goal-reminder line says once the account exists. */
export default function Screen11Goals({
  value,
  onChange,
  onNext,
}: {
  value: string[];
  onChange: (goals: string[]) => void;
  onNext: () => void;
}) {
  function toggle(goalValue: string) {
    onChange(value.includes(goalValue) ? value.filter((v) => v !== goalValue) : [...value, goalValue]);
  }

  return (
    <ScreenShell maxWidth={620}>
      <ScreenHeading eyebrow="Almost there" title="What are you working toward?" subtitle="Pick as many as apply." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, textAlign: "left" }}>
        {GOAL_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} icon={opt.icon} label={opt.label} selected={value.includes(opt.value)} onSelect={() => toggle(opt.value)} />
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <ContinueButton onClick={onNext} disabled={value.length === 0} />
      </div>
    </ScreenShell>
  );
}
