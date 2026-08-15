"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrentUserContext } from "@/contexts/CurrentUserContext";
import { checkAndUnlockFeathers, getFeatherProgress, getUserFeathers, type FeatherProgress } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { getFeatherIcon, TIER_META, TIER_ORDER, isValidTier, type BadgeTier } from "@/components/app/featherIcons";
import { spawnConfetti } from "@/lib/particles";
import { FeatherFall } from "@/components/celebrations/FeatherFall";
import FeatherModal, { type FeatherModalData } from "@/components/app/feathers/FeatherModal";
import type { FeatherCardData } from "@/components/app/feathers/FeatherCard";
import GoldenQuillCard from "@/components/app/feathers/GoldenQuillCard";
import TwoRowFeatherShowcase, { type ShowcaseFeather } from "@/components/feathers/TwoRowFeatherShowcase";

type UserFeather = { feather_id: string; unlocked_at: string; feathers: FeatherCardData };

// Louder the rarer the tier — "more dramatic unlock animations than Common and Rare" is the
// actual ask. Every tier gets a FeatherFall; only Legendary (the Golden Quill) also keeps
// the old gold-particle-glow burst layered on top, per an explicit "biggest celebration
// moment in the app" ask — every other tier dropped the particle burst entirely.
const FEATHER_FALL_COUNT: Record<BadgeTier, number> = {
  common: 8,
  rare: 10,
  epic: 12,
  mythic: 16,
  legendary: 45,
};
const LEGENDARY_PARTICLE_BURST = { count: 170, distance: 400 };

// How long the feather-drift-down beat plays before the particle burst fires — matches
// the celebration overlay's own feather transition duration below.
const DRIFT_MS = 650;

export default function FeathersPage() {
  const { user } = useCurrentUserContext();
  const [allFeathers, setAllFeathers] = useState<FeatherCardData[]>([]);
  const [unlockedAtById, setUnlockedAtById] = useState<Map<string, string>>(new Map());
  const [progressById, setProgressById] = useState<Map<string, FeatherProgress>>(new Map());
  const [celebrating, setCelebrating] = useState<FeatherCardData | null>(null);
  const [selectedFeather, setSelectedFeather] = useState<FeatherCardData | null>(null);
  const [fallActive, setFallActive] = useState(false);
  const celebrateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      // Catches any feather that became earnable since the last session completed —
      // e.g. Distraction Slayer's counter is updated by the extension in the background,
      // not tied to a session-complete event, so it needs this page's own visit to notice.
      await checkAndUnlockFeathers(user.id).catch(() => {});

      const supabase = createClient();
      const [{ data: catalog }, unlocked, progress] = await Promise.all([
        supabase.from("feathers").select("*"),
        getUserFeathers(user.id) as Promise<UserFeather[]>,
        getFeatherProgress(user.id),
      ]);

      setAllFeathers((catalog as FeatherCardData[]) ?? []);
      const atById = new Map(unlocked.map((u) => [u.feather_id, u.unlocked_at]));
      setUnlockedAtById(atById);
      setProgressById(new Map(progress.map((p) => [p.feather.id, p])));

      const seenKey = `rv-seen-feathers-${user.id}`;
      const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) ?? "[]"));
      const newlyUnlocked = unlocked.map((u) => u.feathers).find((f) => f && !seen.has(f.id));
      if (newlyUnlocked) {
        setCelebrating(newlyUnlocked);
      }
      localStorage.setItem(seenKey, JSON.stringify(Array.from(atById.keys())));
    })();
  }, [user]);

  useEffect(() => {
    if (!celebrating) return;
    // The feather settles into place first, THEN FeatherFall fires — a floating-down beat
    // before the fall, not both at once.
    const tier = isValidTier(celebrating.rarity) ? celebrating.rarity : "common";
    const timer = setTimeout(() => {
      setFallActive(true);
      // Golden Quill only: the old gold-particle glow burst, layered on top of FeatherFall
      // rather than replaced by it, for the single biggest celebration moment in the app.
      if (tier === "legendary" && celebrateRef.current) {
        spawnConfetti(celebrateRef.current, {
          count: LEGENDARY_PARTICLE_BURST.count,
          distance: LEGENDARY_PARTICLE_BURST.distance,
          colors: [TIER_META.legendary.glow, "#ffffff", getFeatherIcon("legendary").color],
        });
      }
    }, DRIFT_MS);
    return () => clearTimeout(timer);
  }, [celebrating]);

  const modalData: FeatherModalData | null = useMemo(() => {
    if (!selectedFeather) return null;
    const unlockedAt = unlockedAtById.get(selectedFeather.id);
    const progress = progressById.get(selectedFeather.id);
    return {
      ...selectedFeather,
      unlocked: !!unlockedAt,
      unlockedAt,
      progress: progress && !progress.unlocked ? { current: progress.current, target: progress.target } : undefined,
    };
  }, [selectedFeather, unlockedAtById, progressById]);

  if (!user) return null;

  const nonLegendary = allFeathers.filter((f) => f.rarity !== "legendary");
  const legendary = allFeathers.find((f) => f.rarity === "legendary");
  const legendaryUnlockedAt = legendary ? unlockedAtById.get(legendary.id) : undefined;
  const legendaryProgress = legendary ? progressById.get(legendary.id) : undefined;

  const showcaseItems: ShowcaseFeather[] = nonLegendary.map((f) => {
    const tier: BadgeTier = isValidTier(f.rarity) ? f.rarity : "common";
    const progress = progressById.get(f.id);
    return {
      ...f,
      tier,
      unlocked: unlockedAtById.has(f.id),
      unlockedAt: unlockedAtById.get(f.id),
      progress: progress && !progress.unlocked ? { current: progress.current, target: progress.target } : undefined,
    };
  });

  const celebratingTier = celebrating && isValidTier(celebrating.rarity) ? celebrating.rarity : "common";

  return (
    <>
      <FeatherFall
        active={fallActive}
        count={FEATHER_FALL_COUNT[celebratingTier]}
        slow={celebratingTier === "legendary"}
        includeQuills={celebratingTier === "legendary"}
        onDone={() => setFallActive(false)}
      />

      <AnimatePresence>
        {celebrating && (
          <motion.div
            key="celebration"
            ref={celebrateRef}
            onClick={() => setCelebrating(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(6,6,6,0.92)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              cursor: "pointer",
            }}
          >
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.2em",
                color: TIER_META[celebratingTier].glow,
                textTransform: "uppercase",
              }}
            >
              {`${TIER_META[celebratingTier].label} feather earned`}
            </motion.span>
            {/* The feather itself drifts down from above and settles — replaces the old
                pop-and-rotate entrance. The particle burst (spawnConfetti, above) is timed
                to fire only once this has finished, not simultaneously. */}
            <motion.div
              initial={{ y: -140, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: DRIFT_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: `drop-shadow(0 0 30px ${getFeatherIcon(celebratingTier).color}aa)` }}
            >
              {getFeatherIcon(celebratingTier).svg}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DRIFT_MS / 1000 + 0.05, duration: 0.4 }}
              style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 32, color: "#fff" }}
            >
              {celebrating.name}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DRIFT_MS / 1000 + 0.15, duration: 0.4 }}
              style={{ color: "#9a9da4", fontSize: 15, maxWidth: "40ch", textAlign: "center" }}
            >
              {celebrating.description}
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: DRIFT_MS / 1000 + 0.4, duration: 0.4 }}
              style={{ color: "#5b5e66", fontSize: 13, marginTop: 12 }}
            >
              Tap anywhere to dismiss
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <FeatherModal feather={modalData} onClose={() => setSelectedFeather(null)} />

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Feathers</h1>
      <p style={{ color: "#9a9da4", marginTop: 6 }}>
        {unlockedAtById.size} of {allFeathers.length} earned
      </p>

      <div style={{ marginTop: 36 }}>
        <TwoRowFeatherShowcase items={showcaseItems} onSelect={(item) => setSelectedFeather(item)} />
      </div>

      {legendary && (
        <div style={{ marginTop: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: TIER_META.legendary.glow, margin: 0 }}>
              Legendary
            </h2>
            <span style={{ color: "#5b5e66", fontSize: 12 }}>{legendaryUnlockedAt ? "1/1" : "0/1"}</span>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, ${TIER_META.legendary.glow}66, transparent)`, marginTop: 12, marginBottom: 20 }} />
          <div style={{ maxWidth: 460 }}>
            <GoldenQuillCard
              feather={legendary}
              unlocked={!!legendaryUnlockedAt}
              unlockedAt={legendaryUnlockedAt}
              progress={legendaryProgress && !legendaryProgress.unlocked ? { current: legendaryProgress.current, target: legendaryProgress.target } : undefined}
              onClick={() => setSelectedFeather(legendary)}
            />
          </div>
        </div>
      )}
    </>
  );
}
