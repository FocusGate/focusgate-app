"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrentUserContext } from "@/contexts/CurrentUserContext";
import { checkAndUnlockBadges, getBadgeProgress, getUserBadges, type BadgeProgress } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { getBadgeIcon, TIER_META, TIER_ORDER, isValidTier, type BadgeTier } from "@/components/app/badgeIcons";
import { spawnConfetti } from "@/lib/particles";
import BadgeModal, { type BadgeModalData } from "@/components/app/badges/BadgeModal";
import BadgeCard, { type BadgeCardData } from "@/components/app/badges/BadgeCard";
import LegendaryBadgeCard from "@/components/app/badges/LegendaryBadgeCard";

type UserBadge = { badge_id: string; unlocked_at: string; badges: BadgeCardData };

// Louder confetti the rarer the tier — "more dramatic unlock animations than Common and
// Rare" is the actual ask; this is that, scaled off the same spawnConfetti() everything
// else already uses rather than a bespoke effect per tier.
const CELEBRATION_BURST: Record<BadgeTier, { count: number; distance: number }> = {
  common: { count: 60, distance: 220 },
  rare: { count: 75, distance: 250 },
  epic: { count: 95, distance: 290 },
  mythic: { count: 130, distance: 340 },
  legendary: { count: 170, distance: 400 },
};

export default function BadgesPage() {
  const { user } = useCurrentUserContext();
  const [allBadges, setAllBadges] = useState<BadgeCardData[]>([]);
  const [unlockedAtById, setUnlockedAtById] = useState<Map<string, string>>(new Map());
  const [progressById, setProgressById] = useState<Map<string, BadgeProgress>>(new Map());
  const [celebrating, setCelebrating] = useState<BadgeCardData | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeCardData | null>(null);
  const celebrateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      // Catches any badge that became earnable since the last session completed —
      // e.g. Distraction Slayer's counter is updated by the extension in the background,
      // not tied to a session-complete event, so it needs this page's own visit to notice.
      await checkAndUnlockBadges(user.id).catch(() => {});

      const supabase = createClient();
      const [{ data: catalog }, unlocked, progress] = await Promise.all([
        supabase.from("badges").select("*"),
        getUserBadges(user.id) as Promise<UserBadge[]>,
        getBadgeProgress(user.id),
      ]);

      setAllBadges((catalog as BadgeCardData[]) ?? []);
      const atById = new Map(unlocked.map((u) => [u.badge_id, u.unlocked_at]));
      setUnlockedAtById(atById);
      setProgressById(new Map(progress.map((p) => [p.badge.id, p])));

      const seenKey = `fg-seen-badges-${user.id}`;
      const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) ?? "[]"));
      const newlyUnlocked = unlocked.map((u) => u.badges).find((b) => b && !seen.has(b.id));
      if (newlyUnlocked) {
        setCelebrating(newlyUnlocked);
      }
      localStorage.setItem(seenKey, JSON.stringify(Array.from(atById.keys())));
    })();
  }, [user]);

  useEffect(() => {
    if (celebrating && celebrateRef.current) {
      const tier = isValidTier(celebrating.rarity) ? celebrating.rarity : "common";
      const burst = CELEBRATION_BURST[tier];
      spawnConfetti(celebrateRef.current, {
        count: burst.count,
        distance: burst.distance,
        colors: tier === "mythic" || tier === "legendary" ? [TIER_META[tier].glow, "#ffffff", getBadgeIcon(celebrating.name).color] : undefined,
      });
    }
  }, [celebrating]);

  const modalData: BadgeModalData | null = useMemo(() => {
    if (!selectedBadge) return null;
    const unlockedAt = unlockedAtById.get(selectedBadge.id);
    const progress = progressById.get(selectedBadge.id);
    return {
      ...selectedBadge,
      unlocked: !!unlockedAt,
      unlockedAt,
      progress: progress && !progress.unlocked ? { current: progress.current, target: progress.target } : undefined,
    };
  }, [selectedBadge, unlockedAtById, progressById]);

  if (!user) return null;

  const tiers = TIER_ORDER.map((tier) => ({
    tier,
    meta: TIER_META[tier],
    badges: allBadges.filter((b) => b.rarity === tier),
  })).filter((t) => t.badges.length > 0);

  return (
    <>
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
                color: TIER_META[isValidTier(celebrating.rarity) ? celebrating.rarity : "common"].glow,
                textTransform: "uppercase",
              }}
            >
              {isValidTier(celebrating.rarity) ? `${TIER_META[celebrating.rarity].label} badge unlocked` : "Badge unlocked"}
            </motion.span>
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              style={{ filter: `drop-shadow(0 0 30px ${getBadgeIcon(celebrating.name).color}aa)` }}
            >
              {getBadgeIcon(celebrating.name).svg}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              style={{ fontFamily: "'Geist', sans-serif", fontWeight: 800, fontSize: 32, color: "#fff" }}
            >
              {celebrating.name}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              style={{ color: "#9a9da4", fontSize: 15, maxWidth: "40ch", textAlign: "center" }}
            >
              {celebrating.description}
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              style={{ color: "#5b5e66", fontSize: 13, marginTop: 12 }}
            >
              Tap anywhere to dismiss
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <BadgeModal badge={modalData} onClose={() => setSelectedBadge(null)} />

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Badges</h1>
      <p style={{ color: "#9a9da4", marginTop: 6 }}>
        {unlockedAtById.size} of {allBadges.length} unlocked
      </p>

      {tiers.map(({ tier, meta, badges }) => {
        const unlockedInTier = badges.filter((b) => unlockedAtById.has(b.id)).length;
        return (
          <div key={tier} style={{ marginTop: 44 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: meta.glow, margin: 0 }}>
                {meta.label}
              </h2>
              <span style={{ color: "#5b5e66", fontSize: 12 }}>
                {unlockedInTier}/{badges.length}
              </span>
            </div>
            <div style={{ height: 1, background: `linear-gradient(90deg, ${meta.glow}66, transparent)`, marginTop: 12, marginBottom: 20 }} />

            {tier === "legendary" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18, maxWidth: 460 }}>
                {badges.map((badge) => (
                  <LegendaryBadgeCard
                    key={badge.id}
                    badge={badge}
                    unlocked={unlockedAtById.has(badge.id)}
                    unlockedAt={unlockedAtById.get(badge.id)}
                    progress={(() => {
                      const p = progressById.get(badge.id);
                      return p && !p.unlocked ? { current: p.current, target: p.target } : undefined;
                    })()}
                    onClick={() => setSelectedBadge(badge)}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(${tier === "mythic" ? 230 : 200}px, 1fr))`,
                  gap: 18,
                }}
              >
                {badges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    unlocked={unlockedAtById.has(badge.id)}
                    unlockedAt={unlockedAtById.get(badge.id)}
                    progress={(() => {
                      const p = progressById.get(badge.id);
                      return p && !p.unlocked ? { current: p.current, target: p.target } : undefined;
                    })()}
                    onClick={() => setSelectedBadge(badge)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
