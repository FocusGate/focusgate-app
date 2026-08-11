"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LockConfirmModal from "@/components/app/LockConfirmModal";
import DeepFocusConfirmModal from "@/components/app/DeepFocusConfirmModal";
import { getUserGroups, type GroupSummary } from "@/lib/supabase";
import {
  ALL_MODE_CARDS,
  type SessionMode,
  type ModeConfig,
  POMODORO_FOCUS_MINUTES,
  POMODORO_BREAK_MINUTES,
  POMODORO_MIN_CYCLES,
  POMODORO_MAX_CYCLES,
  POMODORO_DEFAULT_CYCLES,
  EXAM_CRAM_MIN_MINUTES,
  EXAM_CRAM_MAX_MINUTES,
  EXAM_CRAM_DEFAULT_MINUTES,
  ALL_NIGHTER_DEFAULT_MINUTES,
  ALL_NIGHTER_CHECKPOINT_MINUTES,
  DEEP_FOCUS_MINUTES,
} from "@/lib/sessionModes";

export type StartConfig = { mode: SessionMode; minutes: number; modeConfig: ModeConfig | null; groupId: string | null };

const PRESET_MINUTES = [
  { label: "25 min", minutes: 25 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

/** Pomodoro's "wall clock" length: focus blocks only — breaks pause the clock (same
 *  accounting as a manual Take a Break), so they don't add to the planned duration. */
function pomodoroMinutes(cycles: number) {
  return cycles * POMODORO_FOCUS_MINUTES;
}

/** The first screen shown before every session — a grid of modes replaces the old plain
 *  duration selector. Locked In Mode's actual enforcement is identical underneath every
 *  one of these; this component only figures out *which* mode, its config, and produces
 *  a fully-resolved StartConfig once the (mode-appropriate) confirm gate is passed. */
export default function SessionModeFlow({ userId, onConfirmed }: { userId: string; onConfirmed: (cfg: StartConfig) => void }) {
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [cycles, setCycles] = useState(POMODORO_DEFAULT_CYCLES);
  const [craMinutes, setCramMinutes] = useState(EXAM_CRAM_DEFAULT_MINUTES);
  const [nighterMinutes, setNighterMinutes] = useState(ALL_NIGHTER_DEFAULT_MINUTES);
  const [customMinutes, setCustomMinutes] = useState(60);
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function selectMode(m: SessionMode) {
    setMode(m);
    setConfirming(false);
    if (m === "group_study" && groups === null) {
      getUserGroups(userId)
        .then(setGroups)
        .catch(() => setGroups([]));
    }
  }

  function backToGrid() {
    setMode(null);
    setConfirming(false);
  }

  function resolvedMinutes(): number {
    switch (mode) {
      case "pomodoro":
        return pomodoroMinutes(cycles);
      case "exam_cram":
        return craMinutes;
      case "all_nighter":
        return nighterMinutes;
      case "deep_focus":
        return DEEP_FOCUS_MINUTES;
      case "group_study":
        return customMinutes;
      default:
        return customMinutes;
    }
  }

  function resolvedModeConfig(): ModeConfig | null {
    if (mode === "pomodoro") return { cycles };
    if (mode === "all_nighter") return { checkpointMinutes: ALL_NIGHTER_CHECKPOINT_MINUTES };
    return null;
  }

  function handleConfirmed() {
    if (!mode) return;
    // Closes this component's own confirm modal immediately — without this, it keeps
    // re-rendering at its high z-index (needs to sit above the rest of this screen) even
    // after the parent takes over with the entry animation and LockedInOverlay, which
    // would otherwise leave it visibly stuck on top once that animation finishes.
    setConfirming(false);
    onConfirmed({ mode, minutes: resolvedMinutes(), modeConfig: resolvedModeConfig(), groupId: mode === "group_study" ? groupId : null });
  }

  const canContinue = mode === "group_study" ? !!groupId : true;

  return (
    <>
      {mode === null && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {ALL_MODE_CARDS.map((m) => (
            <ModeCard key={m.id} mode={m} onClick={() => selectMode(m.id)} />
          ))}
        </div>
      )}

      {mode !== null && !confirming && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <button
            onClick={backToGrid}
            style={{ background: "transparent", border: "none", color: "#7a7d84", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
          >
            ← Choose a different mode
          </button>

          {mode === "pomodoro" && (
            <ConfigBlock title="How many cycles?" hint={`${POMODORO_FOCUS_MINUTES} min focus + ${POMODORO_BREAK_MINUTES} min break, per cycle.`}>
              <Stepper value={cycles} min={POMODORO_MIN_CYCLES} max={POMODORO_MAX_CYCLES} onChange={setCycles} suffix="cycles" />
              <p style={{ color: "#5b5e66", fontSize: 12, marginTop: 10 }}>
                {cycles} cycles ≈ {pomodoroMinutes(cycles)} min of focus time, plus {cycles - 1} automatic {POMODORO_BREAK_MINUTES}-min breaks.
              </p>
            </ConfigBlock>
          )}

          {mode === "exam_cram" && (
            <ConfigBlock title="How long is the cram?" hint="Break Gates are locked to Hard difficulty in this mode — no easy exit.">
              <PresetRow
                options={[120, 150, 180, 210, 240]}
                selected={craMinutes}
                onSelect={setCramMinutes}
                format={(m) => `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1)} hr`}
              />
              <p style={{ color: "#5b5e66", fontSize: 11, marginTop: 10 }}>
                {EXAM_CRAM_MIN_MINUTES / 60}–{EXAM_CRAM_MAX_MINUTES / 60} hours.
              </p>
            </ConfigBlock>
          )}

          {mode === "all_nighter" && (
            <ConfigBlock title="How long is the haul?" hint={`Mandatory Lounge checkpoints every ${ALL_NIGHTER_CHECKPOINT_MINUTES} minutes — can't be skipped.`}>
              <PresetRow options={[240, 300, 360, 480]} selected={nighterMinutes} onSelect={setNighterMinutes} format={(m) => `${m / 60} hr`} />
            </ConfigBlock>
          )}

          {mode === "group_study" && (
            <ConfigBlock title="Which group?" hint="Dead Man's Switch is on for the whole session — the group is told if you break early.">
              {groups === null && <p style={{ color: "#7a7d84", fontSize: 13 }}>Loading your groups…</p>}
              {groups?.length === 0 && (
                <p style={{ color: "#f87171", fontSize: 13 }}>
                  You&apos;re not in a group yet — join or create one on the{" "}
                  <a href="/friends" style={{ color: "#F59E0B" }}>
                    Friends page
                  </a>{" "}
                  first.
                </p>
              )}
              {groups && groups.length > 0 && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGroupId(g.id)}
                        style={{
                          textAlign: "left",
                          background: groupId === g.id ? "rgba(59,130,246,0.12)" : "#101012",
                          border: `1px solid ${groupId === g.id ? "#3B82F6" : "#26262b"}`,
                          color: "#fff",
                          padding: "12px 16px",
                          borderRadius: 12,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {g.name} <span style={{ color: "#7a7d84", fontWeight: 400 }}>· {g.members.length} members</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <p style={{ color: "#9a9da4", fontSize: 12, marginBottom: 8 }}>Duration</p>
                    <PresetRow options={[25, 45, 60, 90, 120]} selected={customMinutes} onSelect={setCustomMinutes} format={(m) => (m < 60 ? `${m} min` : `${m / 60} hr`)} />
                  </div>
                </>
              )}
            </ConfigBlock>
          )}

          {mode === "deep_focus" && (
            <ConfigBlock title="Fixed at 90 minutes." hint="The research-backed deep work window — not adjustable. Break Gates are still available if you need one.">
              <p style={{ color: "#9a9da4", fontSize: 13, margin: 0 }}>
                One task, one fixed window. Request a Break the same way Custom does; Emergency Unblock is still there for a real emergency, and that ends the session outright.
              </p>
            </ConfigBlock>
          )}

          {mode === "custom" && (
            <ConfigBlock title="How long?" hint="Manual breaks, requested through Break Gates whenever you want one.">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {PRESET_MINUTES.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => {
                      setCustomMinutes(d.minutes);
                      setCustomInputOpen(false);
                    }}
                    style={{
                      background: !customInputOpen && customMinutes === d.minutes ? "rgba(245,158,11,0.15)" : "transparent",
                      color: !customInputOpen && customMinutes === d.minutes ? "#F59E0B" : "#9a9da4",
                      border: `1px solid ${!customInputOpen && customMinutes === d.minutes ? "rgba(245,158,11,0.5)" : "#26262b"}`,
                      padding: "10px 18px",
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  onClick={() => setCustomInputOpen(true)}
                  style={{
                    background: customInputOpen ? "rgba(245,158,11,0.15)" : "transparent",
                    color: customInputOpen ? "#F59E0B" : "#9a9da4",
                    border: `1px solid ${customInputOpen ? "rgba(245,158,11,0.5)" : "#26262b"}`,
                    padding: "10px 18px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Custom
                </button>
              </div>
              {customInputOpen && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={customInputValue}
                    onChange={(e) => {
                      setCustomInputValue(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!Number.isNaN(n) && n > 0) setCustomMinutes(n);
                    }}
                    placeholder="Minutes"
                    style={{ width: 120, background: "#101012", border: "1px solid #26262b", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", textAlign: "center" }}
                  />
                  <span style={{ color: "#7a7d84", fontSize: 13 }}>minutes</span>
                </div>
              )}
            </ConfigBlock>
          )}

          <button
            onClick={() => setConfirming(true)}
            disabled={!canContinue}
            style={{
              marginTop: 22,
              width: "100%",
              background: canContinue ? "linear-gradient(180deg, #FBBF24, #F59E0B)" : "#26262b",
              color: canContinue ? "#0a0a0a" : "#5b5e66",
              border: "none",
              padding: "16px 0",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 800,
              cursor: canContinue ? "pointer" : "default",
            }}
          >
            Continue
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {confirming && mode === "deep_focus" && <DeepFocusConfirmModal onCancel={() => setConfirming(false)} onConfirm={handleConfirmed} />}
        {confirming && mode !== "deep_focus" && mode !== null && (
          <LockConfirmModal minutes={resolvedMinutes()} onCancel={() => setConfirming(false)} onConfirm={handleConfirmed} />
        )}
      </AnimatePresence>
    </>
  );
}

function ModeCard({ mode, onClick }: { mode: (typeof ALL_MODE_CARDS)[number]; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover="hover"
      initial="rest"
      animate="rest"
      style={{
        textAlign: "left",
        background: "#0A0A0A",
        border: "1px solid #26262b",
        borderRadius: 16,
        padding: "20px 20px 18px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 30% 20%, ${mode.accent}1c, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <motion.div
        variants={{ rest: { borderColor: "#26262b" }, hover: { borderColor: `${mode.accent}88` } }}
        style={{ position: "absolute", inset: 0, borderRadius: 16, border: "1px solid transparent", pointerEvents: "none" }}
      />
      {mode.badge && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(245,158,11,0.14)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "#F59E0B",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.03em",
            padding: "4px 9px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {mode.badge}
        </span>
      )}
      <div style={{ position: "relative", fontSize: 28 }}>{mode.emoji}</div>
      <div style={{ position: "relative", color: "#fff", fontWeight: 700, fontSize: 16, marginTop: 10 }}>{mode.name}</div>
      <div style={{ position: "relative", color: "#7a7d84", fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>{mode.tagline}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ color: "#5b5e66", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{mode.typicalDuration}</span>
        {mode.requirement && <span style={{ color: "#f59e0b99", fontSize: 11, fontWeight: 600 }}>· {mode.requirement}</span>}
      </div>
    </motion.button>
  );
}

function ConfigBlock({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 800, margin: 0 }}>{title}</h3>
      <p style={{ color: "#7a7d84", fontSize: 13, marginTop: 6, marginBottom: 16 }}>{hint}</p>
      {children}
    </div>
  );
}

function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{ width: 40, height: 40, borderRadius: "50%", background: "#101012", border: "1px solid #26262b", color: "#fff", fontSize: 18, cursor: value <= min ? "default" : "pointer", opacity: value <= min ? 0.4 : 1 }}
      >
        −
      </button>
      <span style={{ color: "#fff", fontSize: 24, fontWeight: 800, minWidth: 70, textAlign: "center" }}>
        {value} {suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{ width: 40, height: 40, borderRadius: "50%", background: "#101012", border: "1px solid #26262b", color: "#fff", fontSize: 18, cursor: value >= max ? "default" : "pointer", opacity: value >= max ? 0.4 : 1 }}
      >
        +
      </button>
    </div>
  );
}

function PresetRow({ options, selected, onSelect, format }: { options: number[]; selected: number; onSelect: (v: number) => void; format: (v: number) => string }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          style={{
            background: selected === o ? "rgba(245,158,11,0.15)" : "transparent",
            color: selected === o ? "#F59E0B" : "#9a9da4",
            border: `1px solid ${selected === o ? "rgba(245,158,11,0.5)" : "#26262b"}`,
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}
