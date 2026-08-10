"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, signUp } from "@/lib/supabase";
import { sendWelcomeEmail } from "@/lib/email";
import { FocusGateMark } from "@/components/landing/Navbar";
import { clearOnboardingState, computeTargetISODate, loadOnboardingState } from "@/lib/onboarding";

/** Email + password signup. OTP is disabled for now (the Supabase project doesn't have
 *  passwordless signups enabled yet) — this is the only signup path until it's added back. */
export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set once signUp() succeeds but returns no session — i.e. the Supabase project
  // requires email confirmation, so there's a real account but no way in yet.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  // Goals/timeframe captured on Screens 11-12 of onboarding, carried through to signUp()
  // below — not shown as form fields here, just handed off silently.
  const [goals, setGoals] = useState<string[]>([]);
  const [goalTimeframeWeeks, setGoalTimeframeWeeks] = useState(0);

  // Prefill from the 14-screen onboarding flow if the visitor arrived from there — hydrated
  // post-mount (not a lazy useState initializer) to avoid an SSR/client mismatch.
  useEffect(() => {
    const saved = loadOnboardingState();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from localStorage on mount
    if (saved.answers.name) setName(saved.answers.name);
    if (saved.answers.email) setEmail(saved.answers.email);
    if (saved.answers.goals.length) setGoals(saved.answers.goals);
    if (saved.answers.goalTimeframeWeeks) setGoalTimeframeWeeks(saved.answers.goalTimeframeWeeks);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const goalTargetDate = goalTimeframeWeeks ? computeTargetISODate(goalTimeframeWeeks) : null;
      const data = await signUp(email, password, name, goals, goalTargetDate);
      if (data.session && data.user) {
        posthog.identify(data.user.id, {
          email: data.user.email ?? email,
          name,
        });
        posthog.capture("account_created", {
          goal_count: goals.length,
          has_goal_timeframe: Boolean(goalTimeframeWeeks),
        });
        clearOnboardingState();
        // Awaited rather than fire-and-forget, simply so signup can't return/redirect
        // before this Server Action's own round trip is done — sendWelcomeEmail already
        // swallows its own Resend-level failures internally (see lib/email.ts's deliver()),
        // so this never blocks on an email *failure*, only on the request itself completing.
        await sendWelcomeEmail(email, name);
        router.push("/dashboard");
      } else {
        setAwaitingConfirmation(true);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not create your account. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#060606",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 40 }}>
            <FocusGateMark />
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 25, color: "#b08d57" }}>FocusGate</span>
          </Link>

          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B, #b08d57)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 0 30px rgba(245,158,11,0.4)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 20 20" fill="#0a0a0a">
              <path d="M2.94 6.94a.75.75 0 011.06 0L10 12.94l6-6a.75.75 0 111.06 1.06l-6.53 6.53a.75.75 0 01-1.06 0L2.94 8a.75.75 0 010-1.06z" />
            </svg>
          </div>

          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Check your email</h1>
          <p style={{ color: "#9a9da4", fontSize: 14, lineHeight: 1.6 }}>
            We sent a confirmation link to <span style={{ color: "#fff" }}>{email}</span>. Click it to activate your
            account, then sign in below.
          </p>

          <Link href="/login" style={{ display: "inline-block", marginTop: 26, color: "#b08d57", fontWeight: 600, fontSize: 14 }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060606",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 40 }}>
          <FocusGateMark />
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 25, color: "#b08d57" }}>FocusGate</span>
        </Link>

        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>Create your account</h1>
        <p style={{ color: "#9a9da4", fontSize: 14, textAlign: "center", marginBottom: 30 }}>Free during beta. No credit card needed.</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="text" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input
            type="email"
            required
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={submitStyle}>
            {loading ? "Creating account…" : "Get early access →"}
          </button>
        </form>

        <p style={{ color: "#7a7d84", fontSize: 14, textAlign: "center", marginTop: 24 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#b08d57", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#101012",
  border: "1px solid #26262b",
  color: "#fff",
  padding: "14px 16px",
  borderRadius: 12,
  fontSize: 15,
  outline: "none",
};

const submitStyle: React.CSSProperties = {
  background: "#F59E0B",
  color: "#0a0a0a",
  border: "none",
  padding: "14px",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 6,
};
