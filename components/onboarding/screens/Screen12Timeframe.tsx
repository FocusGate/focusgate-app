"use client";

import { useState } from "react";
import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import OptionCard from "@/components/onboarding/OptionCard";
import ContinueButton from "@/components/onboarding/ContinueButton";
import { GOAL_TIMEFRAME_OPTIONS, monthsToWeeks } from "@/lib/onboarding";

/** Single-select, auto-advances like the earlier quiz screens for the two presets — this
 *  picks the horizon Screen 13's "you will have unbreakable focus by [date]" line (and
 *  the account's stored goal_target_date, once signup happens) is computed from. "Custom"
 *  is the odd one out: it has no fixed weeks value, so picking it just reveals a months
 *  input + its own Continue button instead of auto-advancing. */
export default function Screen12Timeframe({ value, onSelect }: { value: number; onSelect: (weeks: number) => void }) {
  const isPreset = GOAL_TIMEFRAME_OPTIONS.some((o) => o.weeks === value);
  // Resuming mid-flow with a previously-picked custom value (not one of the presets)
  // should re-open the custom input pre-filled, not silently drop back to nothing selected.
  const [customMode, setCustomMode] = useState(!isPreset && value > 0);
  const [months, setMonths] = useState(() => (!isPreset && value > 0 ? String(Math.round(value / 4.345)) : ""));

  const parsedMonths = Number(months);
  const validCustom = months.trim() !== "" && Number.isFinite(parsedMonths) && parsedMonths > 0 && parsedMonths <= 24;

  return (
    <ScreenShell>
      <ScreenHeading eyebrow="Set your horizon" title="When do you want to get there?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {GOAL_TIMEFRAME_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.weeks}
            label={opt.label}
            description={opt.description}
            selected={!customMode && value === opt.weeks}
            onSelect={() => {
              setCustomMode(false);
              onSelect(opt.weeks);
            }}
          />
        ))}
        <OptionCard
          label="Custom"
          description="Set your own number of months."
          selected={customMode}
          onSelect={() => setCustomMode(true)}
        />
      </div>

      {customMode && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            autoFocus
            type="number"
            min={1}
            max={24}
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            placeholder="Number of months (1–24)"
            style={{
              background: "#0A0A0A",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              padding: "16px 18px",
              borderRadius: 14,
              fontSize: 17,
              outline: "none",
              textAlign: "center",
            }}
          />
          <ContinueButton onClick={() => onSelect(monthsToWeeks(parsedMonths))} disabled={!validCustom} />
        </div>
      )}
    </ScreenShell>
  );
}
