"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Trophy, BarChart3, Users, Settings, LogOut, ShieldAlert } from "lucide-react";
import { signOut } from "@/lib/supabase";
import { saveKnownEmail } from "@/lib/returningUser";
import { FocusGateMark } from "@/components/landing/Navbar";
import Avatar from "@/components/app/Avatar";
import MobileNav from "@/components/app/MobileNav";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/badges", label: "Badges", icon: Trophy },
  { href: "/the-gates", label: "The Gates", icon: ShieldAlert, subtitle: "The system that keeps you locked in." },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export type AppShellUser = { name: string; email: string; streak: number } | null | undefined;

export default function AppShell({ children, user }: { children: React.ReactNode; user?: AppShellUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  async function handleSignOut() {
    if (user?.email) saveKnownEmail(user.email);
    await signOut();
    router.replace("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060606", display: "flex" }}>
      <aside
        className="fg-app-sidebar"
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "28px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
          <FocusGateMark size={24} />
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 21, color: "#b08d57" }}>FocusGate</span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: item.subtitle ? "flex-start" : "center",
                  gap: 11,
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: active ? "#F59E0B" : "#9a9da4",
                  background: active ? "rgba(245,158,11,0.1)" : "transparent",
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} style={item.subtitle ? { marginTop: 2, flexShrink: 0 } : undefined} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block" }}>{item.label}</span>
                  {item.subtitle && (
                    <span style={{ display: "block", fontSize: 10, fontWeight: 500, color: "#5b5e66", marginTop: 2, lineHeight: 1.3 }}>
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Avatar name={user.name} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 12, color: "#F59E0B" }}>🔥 {user.streak} day{user.streak === 1 ? "" : "s"}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowSignOutConfirm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#9a9da4",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      <MobileNav />

      <main
        className="fg-app-main"
        style={{
          flex: 1,
          minWidth: 0,
          padding: "36px 44px",
          color: "#fff",
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {children}
      </main>

      {showSignOutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 24,
          }}
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "#0b0b0d",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 26,
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Are you sure you want to log out?</h2>
            <p style={{ color: "#9a9da4", fontSize: 14, marginBottom: 22 }}>You&apos;ll be signed out and returned to the landing page.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#d8d8dc",
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  flex: 1,
                  background: "#b91c1c",
                  border: "none",
                  color: "#fff",
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
