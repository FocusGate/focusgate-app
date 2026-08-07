import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";

export default function Screen01Problem({ onNext }: { onNext: () => void }) {
  return (
    <ScreenShell>
      <ScreenHeading
        eyebrow="Before we start"
        title="You've tried everything to focus."
        subtitle="Apps that block distractions. Timers. Willpower. And somehow your phone still wins by 2pm."
      />
      <ContinueButton onClick={onNext} />
    </ScreenShell>
  );
}
