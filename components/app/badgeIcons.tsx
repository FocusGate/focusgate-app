// Per-badge icon + accent color. Deliberately independent of `rarity` — the tier (common/
// rare/epic/mythic/legendary) drives the card's glow/border via TIER_META below; this file
// is just "what does the badge look like." Shared by the dashboard Badges page and the
// landing page's badge carousel so both stay in sync automatically.

const ICONS: Record<string, { color: string; svg: React.ReactNode }> = {
  "First Lock": {
    color: "#0EA5E9",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="11" y="21" width="26" height="19" rx="3" fill="#0EA5E9" />
        <path d="M16 21v-4a8 8 0 0 1 16 0v4" stroke="#0EA5E9" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="29" r="2.6" fill="#000" />
      </svg>
    ),
  },
  "Early Riser": {
    color: "#F59E0B",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M14 30a10 10 0 0 1 20 0" fill="#F59E0B" />
        <line x1="8" y1="30" x2="40" y2="30" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <line x1="24" y1="14" x2="24" y2="8" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <line x1="15" y1="17" x2="11" y2="12" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <line x1="33" y1="17" x2="37" y2="12" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  "Clean Slate": {
    color: "#94A3B8",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="12" y="9" width="24" height="32" rx="3" stroke="#94A3B8" strokeWidth="2.6" fill="none" />
        <rect x="18" y="6" width="12" height="7" rx="2" fill="#94A3B8" />
        <path d="M17 24l5 5 10-11" stroke="#CBD5E1" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Weekend Warrior": {
    color: "#38BDF8",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="12" width="32" height="26" rx="3" stroke="#38BDF8" strokeWidth="2.4" fill="none" />
        <line x1="8" y1="19" x2="40" y2="19" stroke="#38BDF8" strokeWidth="2.4" />
        <line x1="15" y1="8" x2="15" y2="15" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="33" y1="8" x2="33" y2="15" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="27" y="24" width="7" height="7" rx="1.5" fill="#38BDF8" />
        <rect x="27" y="24" width="7" height="7" rx="1.5" fill="#7DD3FC" opacity="0.6" transform="translate(-13,6)" />
      </svg>
    ),
  },
  "On Fire": {
    color: "#8B5CF6",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M10 40V26l4-6v20z" fill="#F97316" />
        <path d="M20 40V18l4-7v29z" fill="#FB923C" />
        <path d="M30 40V12l4 3c2 4 0 8-2 11 3 1 4 4 2 8 0 3-2 5-4 6z" fill="#EF4444" />
      </svg>
    ),
  },
  "Deep Worker": {
    color: "#14B8A6",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="15" stroke="#0f766e" strokeWidth="2.4" />
        <circle cx="24" cy="24" r="9" stroke="#14B8A6" strokeWidth="3" />
        <circle cx="24" cy="24" r="3.4" fill="#5eead4" />
      </svg>
    ),
  },
  "Gate Keeper": {
    color: "#3B82F6",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="9" y="10" width="6" height="28" rx="1.5" fill="#3B82F6" />
        <rect x="33" y="10" width="6" height="28" rx="1.5" fill="#3B82F6" />
        <rect x="15" y="21" width="18" height="6" rx="1.5" fill="#60A5FA" />
        <circle cx="24" cy="24" r="2.4" fill="#0a0a0a" />
      </svg>
    ),
  },
  "No Excuses": {
    color: "#3B82F6",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 6l14 5v10c0 10-6 17-14 21-8-4-14-11-14-21V11z" fill="#3B82F6" opacity="0.9" />
        <path d="M17 24l5 5 10-11" stroke="#0a0a0a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Unstoppable: {
    color: "#F97316",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M8 34l2-16 7 9 7-13 7 13 7-9 2 16z" fill="#F59E0B" />
        <rect x="8" y="34" width="32" height="4" rx="1" fill="#D97706" />
      </svg>
    ),
  },
  "Distraction Slayer": {
    color: "#A855F7",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="13" stroke="#A855F7" strokeWidth="2.6" />
        <line x1="24" y1="4" x2="24" y2="12" stroke="#A855F7" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="24" y1="36" x2="24" y2="44" stroke="#A855F7" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="4" y1="24" x2="12" y2="24" stroke="#A855F7" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="36" y1="24" x2="44" y2="24" stroke="#A855F7" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="24" cy="24" r="2.6" fill="#A855F7" />
      </svg>
    ),
  },
  "Iron Focus": {
    color: "#A855F7",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M14 12h20v8a10 10 0 0 1-20 0z" fill="#C084FC" />
        <path d="M14 14H8a6 6 0 0 0 6 6M34 14h6a6 6 0 0 1-6 6" stroke="#A855F7" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <rect x="21" y="30" width="6" height="7" fill="#A855F7" />
        <rect x="14" y="37" width="20" height="4" rx="1.5" fill="#A855F7" />
      </svg>
    ),
  },
  "Century Club": {
    color: "#C084FC",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="16" fill="#C084FC" opacity="0.18" stroke="#C084FC" strokeWidth="2.4" />
        <text x="24" y="29" textAnchor="middle" fontSize="13" fontWeight="800" fill="#C084FC" fontFamily="system-ui, sans-serif">
          100
        </text>
      </svg>
    ),
  },
  Untouchable: {
    color: "#FB7185",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 5l16 6v10c0 11-7 18.5-16 22-9-3.5-16-11-16-22V11z" fill="#FB7185" opacity="0.92" />
        <path d="M24 15l4.5 9h-9z" fill="#0a0a0a" opacity="0.55" />
      </svg>
    ),
  },
  "The Regulator": {
    color: "#F43F5E",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="26" r="15" stroke="#F43F5E" strokeWidth="2.6" fill="none" />
        <line x1="24" y1="26" x2="24" y2="16" stroke="#FB7185" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="24" y1="26" x2="31" y2="29" stroke="#FB7185" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="18" y1="6" x2="14" y2="10" stroke="#F43F5E" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="30" y1="6" x2="34" y2="10" stroke="#F43F5E" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="24" cy="26" r="2.2" fill="#F43F5E" />
      </svg>
    ),
  },
  "FocusGate Legend": {
    color: "#F59E0B",
    svg: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="badge-gem" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F59E0B" />
            <stop offset="0.5" stopColor="#ffffff" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
        <path d="M14 12h20l6 8-16 20L8 20z" fill="url(#badge-gem)" opacity="0.92" />
      </svg>
    ),
  },
};

const FALLBACK = {
  color: "#334155",
  svg: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="11" y="21" width="26" height="19" rx="3" fill="#334155" />
      <path d="M16 21v-4a8 8 0 0 1 16 0v4" stroke="#334155" strokeWidth="3.4" fill="none" />
    </svg>
  ),
};

export function getBadgeIcon(name: string) {
  return ICONS[name] ?? FALLBACK;
}

// ---------- tier metadata ----------

export type BadgeTier = "common" | "rare" | "epic" | "mythic" | "legendary";

export const TIER_ORDER: BadgeTier[] = ["common", "rare", "epic", "mythic", "legendary"];

export const TIER_META: Record<BadgeTier, { label: string; glow: string; glowSoft: string }> = {
  common: { label: "Common", glow: "#64748B", glowSoft: "rgba(100,116,139,0.16)" }, // blue-grey
  rare: { label: "Rare", glow: "#3B82F6", glowSoft: "rgba(59,130,246,0.18)" }, // blue
  epic: { label: "Epic", glow: "#A855F7", glowSoft: "rgba(168,85,247,0.2)" }, // purple
  mythic: { label: "Mythic", glow: "#FB7185", glowSoft: "rgba(251,113,133,0.24)" }, // coral/red — rarer, louder
  legendary: { label: "Legendary", glow: "#F59E0B", glowSoft: "rgba(245,158,11,0.28)" }, // animated gold
};

export function isValidTier(rarity: string): rarity is BadgeTier {
  return (TIER_ORDER as string[]).includes(rarity);
}
