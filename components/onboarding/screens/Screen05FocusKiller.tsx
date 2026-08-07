import ScreenShell, { ScreenHeading } from "@/components/onboarding/ScreenShell";
import OptionCard from "@/components/onboarding/OptionCard";

const OPTIONS = [
  { value: "doomscrolling", icon: "📱", label: "Doomscrolling (TikTok, Reels, Shorts)" },
  { value: "youtube", icon: "▶️", label: "YouTube & Video Bingeing" },
  { value: "social-feeds", icon: "🌐", label: "Social Feeds (Instagram, Reddit, X)" },
  { value: "group-chats", icon: "💬", label: "Group Chats & Discord" },
];

export default function Screen05FocusKiller({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <ScreenShell>
      <ScreenHeading eyebrow="Quick question" title="What kills your focus the most?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {OPTIONS.map((opt) => (
          <OptionCard key={opt.value} icon={opt.icon} label={opt.label} selected={value === opt.value} onSelect={() => onSelect(opt.value)} />
        ))}
      </div>
    </ScreenShell>
  );
}
