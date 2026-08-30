import Link from "next/link";
import type { Metadata } from "next";
import { RavenMark } from "@/components/landing/Navbar";

export const metadata: Metadata = {
  title: "Privacy Policy — Raven",
  description: "How Raven collects, uses, and protects your data across the web app and Chrome extension.",
};

const sectionStyle: React.CSSProperties = { marginTop: 40 };
const h2Style: React.CSSProperties = { color: "#fff", fontSize: 21, fontWeight: 700, marginBottom: 12 };
const h3Style: React.CSSProperties = { color: "#e8e8ea", fontSize: 15, fontWeight: 700, marginTop: 20, marginBottom: 6 };
const pStyle: React.CSSProperties = { color: "#9a9da4", fontSize: 15, lineHeight: 1.75 };
const ulStyle: React.CSSProperties = { color: "#9a9da4", fontSize: 15, lineHeight: 1.75, paddingLeft: 20, margin: "8px 0" };
const codeStyle: React.CSSProperties = { color: "#C2660A", background: "rgba(194, 102, 10,0.1)", padding: "1px 6px", borderRadius: 4, fontSize: 13.5 };

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#fff", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif" }}>
      <header style={{ padding: "22px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <RavenMark size={22} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "0.08em", color: "#C2660A" }}>RAVEN</span>
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.01em" }}>Privacy Policy</h1>
        <p style={{ color: "#5b5e66", fontSize: 13, marginTop: 8 }}>Last updated: August 3, 2026</p>

        <p style={{ ...pStyle, marginTop: 28 }}>
          This policy covers the Raven web app and the Raven Chrome extension, which work together as one
          product. Starting a RavenLock session in either place, and the account you sign into, are shared between
          them.
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Information we collect</h2>
          <h3 style={h3Style}>Account information</h3>
          <p style={pStyle}>
            When you create a Raven account, we collect your name, email address, and password. Authentication
            is handled by Supabase; we never see or store your password in plain text.
          </p>
          <h3 style={h3Style}>Usage data</h3>
          <ul style={ulStyle}>
            <li>Focus session history — start/end times and duration of your RavenLock sessions</li>
            <li>The list of sites you&apos;ve chosen to block</li>
            <li>Streaks, feathers, and focus statistics derived from your session history</li>
            <li>Friend group membership and activity you choose to share with a group</li>
          </ul>
          <p style={pStyle}>We do not collect your general browsing history — only whether a page you visited matched your own blocked-site list, which is evaluated locally in your browser.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. How the Chrome extension uses its permissions</h2>
          <p style={pStyle}>The extension requests the minimum permissions needed to block sites and run a tamper-resistant timer:</p>
          <ul style={ulStyle}>
            <li><code style={codeStyle}>declarativeNetRequest</code> — redirects navigation to sites on your blocked list to the extension&apos;s own blocked-screen page. Matching happens entirely inside Chrome&apos;s network stack; the extension does not read or transmit the pages you visit.</li>
            <li><code style={codeStyle}>host_permissions: &lt;all_urls&gt;</code> — required by <code style={codeStyle}>declarativeNetRequest</code> so a block rule can match a site regardless of which domain you&apos;ve added to your list.</li>
            <li><code style={codeStyle}>storage</code> — saves your current session state (active/idle, time remaining, blocked domains) locally in your browser.</li>
            <li><code style={codeStyle}>alarms</code> — runs the recurring check that verifies your session&apos;s remaining time against a trusted network clock and polls for sessions started on the web dashboard.</li>
            <li><code style={codeStyle}>activeTab</code> — used incidentally by the extension UI; not used to read page content.</li>
            <li><code style={codeStyle}>incognito: spanning</code> — lets your block rules also apply in Incognito windows if you separately enable &quot;Allow in Incognito&quot; for Raven yourself in Chrome&apos;s extension settings. We never require or check for this.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. Third-party services</h2>
          <p style={pStyle}>
            We use a small number of service providers to run Raven. They process data on our behalf and are
            contractually/technically restricted to that purpose — we do not sell data to them or anyone else.
          </p>
          <ul style={ulStyle}>
            <li><strong style={{ color: "#d8d8dc" }}>Supabase</strong> — hosts our database and handles authentication. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#C2660A" }}>Supabase&apos;s privacy policy</a>.</li>
            <li><strong style={{ color: "#d8d8dc" }}>WorldTimeAPI</strong> — the Chrome extension periodically checks the current UTC time from this public API to stop a session timer from being shortened by changing your computer&apos;s clock. No account or personal information is sent with this request.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. What we don&apos;t do</h2>
          <ul style={ulStyle}>
            <li>We don&apos;t sell your data.</li>
            <li>We don&apos;t show ads or use your data for ad targeting.</li>
            <li>We don&apos;t track your browsing outside of matching it against your own blocked-site list.</li>
            <li>We don&apos;t read the content of pages you visit.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Data retention &amp; deletion</h2>
          <p style={pStyle}>
            You can permanently delete your account and all associated data (profile, sessions, blocked sites,
            feathers, group memberships) at any time from <strong style={{ color: "#d8d8dc" }}>Settings → Delete account</strong> in
            the web app.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Children&apos;s privacy</h2>
          <p style={pStyle}>Raven is intended for users 13 and older. We do not knowingly collect data from children under 13.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Changes to this policy</h2>
          <p style={pStyle}>If this policy changes, we&apos;ll update the &quot;Last updated&quot; date above. Material changes will be communicated in-app.</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Contact us</h2>
          {/* HOLD (ravenlock.pro brand pass): still the real, working support address —
              see lib/email.ts's matching note. Swap once support@ravenlock.pro actually
              exists and receives mail. */}
          <p style={pStyle}>
            Questions about this policy or your data? Email{" "}
            <a href="mailto:support@focusgate.site" style={{ color: "#C2660A" }}>support@focusgate.site</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
