/** Shared outer layout for every onboarding screen — centers content in the viewport
 *  below the fixed progress bar/back arrow that OnboardingFlow renders around it. */
export default function ScreenShell({ children, maxWidth = 560 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "110px 24px 60px", textAlign: "center" }}>
      <div style={{ width: "100%", maxWidth }}>{children}</div>
    </div>
  );
}

/** Shared eyebrow + headline + subtext block — every screen opens with some version of
 *  this, so it's factored out rather than re-typed 13 times with slightly different
 *  font-size/margin values that would drift out of sync. */
export function ScreenHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      {eyebrow && (
        <div style={{ color: "#b08d57", fontSize: 13, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "clamp(32px, 5vw, 44px)",
          lineHeight: 1.15,
          color: "#fff",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {subtitle && <p style={{ color: "#9a9da4", fontSize: 16, lineHeight: 1.6, marginTop: 16 }}>{subtitle}</p>}
    </div>
  );
}
