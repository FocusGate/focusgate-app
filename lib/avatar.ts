/** Deterministic colored-circle-with-initial avatars — no photo upload, no storage bucket. */

const PALETTE = ["#F59E0B", "#b08d57", "#0EA5E9", "#22c55e", "#a855f7", "#ef4444", "#14b8a6", "#f472b6"];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(seed: string): string {
  return PALETTE[hashString(seed) % PALETTE.length];
}

export function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}
