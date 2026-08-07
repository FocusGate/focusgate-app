"use client";

/** Shared by AppShell's sidebar and the Settings page's own Account section — both call
 *  the exact same "Sign out" action, so they show the exact same confirmation, rather than
 *  each having its own dialog markup that can quietly drift out of sync (which is exactly
 *  what happened before this component existed: Settings' sign-out skipped confirmation
 *  entirely). */
export default function SignOutConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;

  return (
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
      onClick={onClose}
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
            onClick={onClose}
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
            onClick={onConfirm}
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
  );
}
