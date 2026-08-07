import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import ContinueButton from "@/components/onboarding/ContinueButton";

export default function Screen02Solution({ onNext }: { onNext: () => void }) {
  return (
    <ScreenShell>
      <ScreenHeading
        eyebrow="So we built something different"
        title="An app that won't let you quit."
        subtitle="Not another app you can just close. FocusGate locks the session, blocks the sites, and makes leaving early cost you something."
      />
      <ContinueButton onClick={onNext} />
    </ScreenShell>
  );
}
