"use client";

import { useEffect, useRef, useState } from "react";

function drawCard(canvas: HTMLCanvasElement, { durationLabel, streak, focusScore }: { durationLabel: string; streak: number; focusScore: number }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#101012");
  bg.addColorStop(1, "#060606");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(245,158,11,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  ctx.textAlign = "center";
  ctx.fillStyle = "#b08d57";
  ctx.font = "600 30px Georgia, serif";
  ctx.fillText("FocusGate", W / 2, 90);

  ctx.fillStyle = "#F59E0B";
  ctx.font = "800 76px Arial, sans-serif";
  ctx.fillText(durationLabel, W / 2, H / 2 - 10);

  ctx.fillStyle = "#9a9da4";
  ctx.font = "600 24px Arial, sans-serif";
  ctx.fillText("Locked In session complete", W / 2, H / 2 + 40);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillText(`🔥 ${streak} day streak  ·  Focus score ${focusScore}/100`, W / 2, H / 2 + 90);
}

/** Draws a shareable branded card to an offscreen canvas and exposes it via the Web Share
 *  API (falling back to a plain download) — real Instagram posting isn't available to a
 *  regular web app, so this is the realistic scope: a card the user shares themselves.
 *  The canvas is never shown on screen — the same duration/streak/score it draws are
 *  already displayed once on SessionCompleteScreen, so a second visible copy here was
 *  just clutter. It still needs to be a real, sized, in-DOM canvas (not display:none) for
 *  toBlob() to reliably rasterize it, so it's positioned off-screen instead. */
export default function ShareCard({ durationLabel, streak, focusScore }: { durationLabel: string; streak: number; focusScore: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, { durationLabel, streak, focusScore });
  }, [durationLabel, streak, focusScore]);

  function getBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }

  async function handleShare() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("Could not generate the image.");
      const file = new File([blob], "focusgate-session.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "FocusGate", text: "Locked in and got it done." });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "focusgate-session.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // AbortError fires when the user just closes the native share sheet — not a real error.
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not share right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={280}
        aria-hidden="true"
        style={{ position: "absolute", left: -9999, top: -9999 }}
      />
      <button
        onClick={handleShare}
        disabled={busy}
        style={{
          background: "transparent",
          color: "#9a9da4",
          border: "1px solid rgba(255,255,255,0.15)",
          padding: "10px 20px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Preparing…" : "Share"}
      </button>
      {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
