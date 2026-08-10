"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { RotateCcw } from "lucide-react";
import posthog from "posthog-js";
import {
  EMPTY_ANSWERS,
  TOTAL_STEPS,
  LAST_SCREEN,
  clearOnboardingState,
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingAnswers,
} from "@/lib/onboarding";
import Screen01Problem from "./screens/Screen01Problem";
import Screen02Solution from "./screens/Screen02Solution";
import Screen03Science from "./screens/Screen03Science";
import Screen04Name from "./screens/Screen04Name";
import Screen05FocusKiller from "./screens/Screen05FocusKiller";
import Screen06HoursLost from "./screens/Screen06HoursLost";
import Screen07PastFailures from "./screens/Screen07PastFailures";
import Screen08Mirror from "./screens/Screen08Mirror";
import Screen09BypassTest from "./screens/Screen09BypassTest";
import Screen10SocialProof from "./screens/Screen10SocialProof";
import Screen11Goals from "./screens/Screen11Goals";
import Screen12Timeframe from "./screens/Screen12Timeframe";
import Screen13Summary from "./screens/Screen13Summary";
import Screen14Commitment from "./screens/Screen14Commitment";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Orchestrates the 14 in-app screens: step + answers state, localStorage persistence
 *  (so a refresh mid-flow resumes instead of restarting), the progress bar, the back
 *  arrow, and the directional slide+fade transition between screens. Individual screens
 *  are dumb — they just receive whatever slice of `answers` they need plus callbacks.
 *  `TOTAL_STEPS` (15) drives the progress-bar math, not the step ceiling: the "15th page"
 *  is the real /signup route this flow hands off to once Screen 14 is answered, not
 *  another screen inside this component. */
export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [direction, setDirection] = useState(1);
  const hydratedRef = useRef(false);

  // Resume from localStorage after mount, not as a lazy useState initializer — this keeps
  // the server-rendered and first-client-rendered output identical (both start at step 1),
  // avoiding a hydration mismatch, at the cost of a brief flash of step 1 before jumping.
  // `?force=true` / `?test=true` skips the resume entirely so a dev can re-run the flow
  // from Screen 1 without manually clearing localStorage every time.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceRestart = params.get("force") === "true" || params.get("test") === "true";
    if (!forceRestart) {
      const saved = loadOnboardingState();
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resuming from localStorage once on mount is the intended sync here
        setStep(saved.step);
        setAnswers(saved.answers);
      }
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveOnboardingState({ step, answers });
  }, [step, answers]);

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(LAST_SCREEN, s + 1));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  }

  function resetForTesting() {
    clearOnboardingState();
    setDirection(-1);
    setStep(1);
    setAnswers(EMPTY_ANSWERS);
  }

  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  /** Option-card screens record the answer, then auto-advance 200ms later — snappy enough
   *  to feel responsive without the selection visually flashing by unnoticed. */
  function selectAndAdvance<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    update(key, value);
    setTimeout(goNext, 200);
  }

  /** Screen 14's selection doesn't advance to another internal screen — it hands off to
   *  the real /signup page (which reads the name/email/goals already captured here to
   *  prefill and seed the account, via loadOnboardingState()). */
  function finishOnboarding(value: string) {
    setAnswers((a) => ({ ...a, commitmentLevel: value }));
    posthog.capture("onboarding_completed", {
      goal_count: answers.goals.length,
      timeframe_weeks: answers.goalTimeframeWeeks || null,
      commitment_level: value,
    });
    setTimeout(() => router.push("/signup"), 200);
  }

  function renderScreen() {
    switch (step) {
      case 1:
        return <Screen01Problem onNext={goNext} />;
      case 2:
        return <Screen02Solution onNext={goNext} />;
      case 3:
        return <Screen03Science onNext={goNext} />;
      case 4:
        return <Screen04Name value={answers.name} onChange={(v) => update("name", v)} onNext={goNext} />;
      case 5:
        return <Screen05FocusKiller value={answers.focusKiller} onSelect={(v) => selectAndAdvance("focusKiller", v)} />;
      case 6:
        return <Screen06HoursLost value={answers.hoursLost} onSelect={(v) => selectAndAdvance("hoursLost", v)} />;
      case 7:
        return <Screen07PastFailures value={answers.pastFailures} onSelect={(v) => selectAndAdvance("pastFailures", v)} />;
      case 8:
        return <Screen08Mirror hoursLost={answers.hoursLost} onNext={goNext} />;
      case 9:
        return <Screen09BypassTest onNext={goNext} />;
      case 10:
        return <Screen10SocialProof onNext={goNext} />;
      case 11:
        return <Screen11Goals value={answers.goals} onChange={(v) => update("goals", v)} onNext={goNext} />;
      case 12:
        return <Screen12Timeframe value={answers.goalTimeframeWeeks} onSelect={(v) => selectAndAdvance("goalTimeframeWeeks", v)} />;
      case 13:
        return (
          <Screen13Summary
            name={answers.name}
            hoursLost={answers.hoursLost}
            goals={answers.goals}
            goalTimeframeWeeks={answers.goalTimeframeWeeks}
            onNext={goNext}
          />
        );
      case 14:
        return <Screen14Commitment value={answers.commitmentLevel} onSelect={finishOnboarding} />;
      default:
        return null;
    }
  }

  const showBack = step > 1 && step < LAST_SCREEN;
  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#060606", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)", zIndex: 100 }}>
        <motion.div
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ height: "100%", background: "linear-gradient(90deg, #b08d57, #F59E0B)" }}
        />
      </div>

      {showBack && (
        <button
          onClick={goBack}
          aria-label="Back"
          style={{
            position: "fixed",
            top: 22,
            left: 24,
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "none",
            color: "#7a7d84",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {process.env.NODE_ENV === "development" && (
        <button
          onClick={resetForTesting}
          title="Reset onboarding state (dev only)"
          style={{
            position: "fixed",
            bottom: 18,
            right: 18,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#1a1a1d",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#9a9da4",
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={12} strokeWidth={2} />
          Reset Onboarding State
        </button>
      )}
    </div>
  );
}
