import { animate } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type SpawnOptions = {
  count?: number;
  colors?: string[];
  distance?: number;
  duration?: number;
  size?: [number, number];
};

/** Bursts small gold dots outward from the center of `container` and cleans up after itself. */
export function spawnParticles(container: HTMLElement, opts: SpawnOptions = {}) {
  const count = opts.count ?? 10;
  const colors = opts.colors ?? ["#F59E0B", "#FCD34D", "#FDE68A"];
  const distance = opts.distance ?? 90;
  const duration = opts.duration ?? 0.8;
  const [minSize, maxSize] = opts.size ?? [3, 6];

  const rect = container.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = distance * (0.6 + Math.random() * 0.5);
    const size = minSize + Math.random() * (maxSize - minSize);
    const color = colors[i % colors.length];

    const dot = document.createElement("span");
    dot.style.position = "absolute";
    dot.style.left = `${cx}px`;
    dot.style.top = `${cy}px`;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.borderRadius = "50%";
    dot.style.background = color;
    dot.style.boxShadow = `0 0 6px ${color}`;
    dot.style.pointerEvents = "none";
    dot.style.zIndex = "50";
    container.appendChild(dot);

    animate(
      dot,
      { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - dist * 0.3, opacity: 0 },
      { duration, ease: EASE_OUT, onComplete: () => dot.remove() }
    );
  }
}

/** Full confetti explosion (more particles, wider spread, longer fall) for session-complete moments. */
export function spawnConfetti(container: HTMLElement, opts: SpawnOptions = {}) {
  spawnParticles(container, {
    count: opts.count ?? 60,
    colors: opts.colors ?? ["#F59E0B", "#FCD34D", "#FDE68A", "#ffffff"],
    distance: opts.distance ?? 260,
    duration: opts.duration ?? 1.4,
    size: opts.size ?? [4, 9],
  });
}
