"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, BarChart3, Users, Settings, ShieldAlert } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/badges", label: "Badges", icon: Trophy },
  { href: "/the-gates", label: "Gates", icon: ShieldAlert },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Fixed bottom tab bar, hidden on desktop via CSS (see .fg-mobile-app-nav in globals.css) —
 *  rendered unconditionally alongside the sidebar, same pattern as the marketing nav's
 *  .fg-hamburger/.fg-nav-links toggle. */
export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fg-mobile-app-nav">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="fg-mobile-app-nav-link"
            style={{ color: active ? "#F59E0B" : "#7a7d84" }}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
