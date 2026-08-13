# FocusGate promo video — Remotion

A 30-second, 6-scene promo composition in the brand's gold (`#F59E0B`) / black (`#0A0A0A`)
palette, built to export at both 1080×1920 (Reels/Shorts) and 1920×1080 (YouTube) from the
same source. Silent — no audio track anywhere in this composition.

## Setup

```bash
cd focusgate-remotion
npm install
```

## Preview while editing

```bash
npm run dev
```

Opens Remotion Studio — a scrubbable timeline for both compositions (`FocusGateVertical`,
`FocusGateHorizontal`) with hot reload as you edit any scene file.

## Render the final MP4s

```bash
npm run render:vertical    # -> out/focusgate-vertical.mp4   (1080x1920)
npm run render:horizontal  # -> out/focusgate-horizontal.mp4 (1920x1080)
npm run render:all         # both, one after another
```

The first render downloads a headless Chrome build (~110MB, one-time, cached after that).
30 seconds × 2 formats with the particle/glow effects took a few minutes total in testing —
expect similar on a normal machine, slower on a constrained one.

## Project structure

```
src/
  index.ts              entry point (registerRoot)
  Root.tsx               registers both <Composition>s
  FocusGateVideo.tsx     sequences all 6 scenes via <Sequence>
  constants.ts            colors, fonts, and every scene's exact frame range — the one
                           place to retime a scene or tweak the palette
  fonts.ts                 loads Geist + Instrument Serif via @remotion/google-fonts
  components/
    Background.tsx         the shared gold-glow-over-black backdrop every scene sits on
    LockIcon.tsx            the same lock mark used site-wide next to the wordmark
    FlipDigit.tsx            a single flip-clock digit card (Scene 3)
  scenes/
    Scene1Logo.tsx           0-4s   — logo + lock icon intro
    Scene2Doomscroll.tsx     4-10s  — generic social feed, red X slam, "3 hours lost"
    Scene3LockedIn.tsx       10-18s — flip clock, blocked sites, "can't quit"
    Scene4BreakGate.tsx      18-24s — math question + 30s timer, "earn your breaks"
    Scene5BadgeUnlock.tsx    24-28s — badge + gold particle burst
    Scene6CTA.tsx            28-30s — focusgate.site, "Free during beta"
```

Every scene reads its own width/height from `useVideoConfig()` and adapts — there's one
component per scene, not two (vertical/horizontal), which is what `FocusGateVideo.tsx`
registers twice at different resolutions in `Root.tsx`.

## Decisions made building this (worth knowing before you tweak it)

- **Scene 2 is a generic "social feed" mockup, not Instagram.** Avatar circle, caption
  bars, an image card, a like/comment/share row — deliberately not a recreation of any
  specific real app's UI, logo, or wordmark, to avoid a trademark/likeness issue with
  reproducing a specific real app for a promo video.
- **Silent throughout**, per spec — no audio track, no cue markers. If you add music later
  in an editor, the scene boundaries in `constants.ts`'s `SCENES` map are the exact
  timestamps to cut to.
- **The lock icon is ported from `components/landing/Navbar.tsx`'s `FocusGateMark`** (same
  path data) — this is a separate project with no access to the Next.js app's own
  components, so it's copied rather than imported. If that source SVG ever changes, this
  won't pick it up automatically.
- **The flip-clock digit (`FlipDigit.tsx`) is a simplified stand-in**, not a port of the
  real app's `FlipUnit.tsx` — the real one drives its flip animation with imperative
  framer-motion calls against live DOM refs, which doesn't translate to Remotion's
  frame-deterministic render model. Same card look, a lighter-weight flip effect.

## A render artifact you may see (and how to tell if it's actually a problem)

Every scene showed a faint, thin horizontal line about 85% of the way down the frame in
every render done while building this — including with a completely flat background (no
gradient at all), which rules out anything in this project's own CSS. That points to the
specific headless Chrome build this environment downloaded (a bleeding-edge dev channel
build, version 149.x) rather than anything in the code.

**Before assuming it's a real bug**: render one scene yourself (`npm run render:vertical`
is enough) and look at the output. If Remotion downloads a different/stable Chrome build on
your machine, it may simply not reproduce. If it does show up for you too, the fix is
forcing a specific, stable Chrome version rather than whatever the default resolves to —
see [Remotion's browser docs](https://www.remotion.dev/docs/config#setbrowserexecutable)
for pinning `Config.setBrowserExecutable(...)` to a known-good local Chrome/Chromium
install.

## What wasn't verified

The full 30-second render (both formats) was never run end-to-end in the environment this
was built in — only individual test frames (`remotion still`) and a couple of short
multi-frame clips, one per scene, to confirm each one's animation actually works. `npm run
render:all` should work the same way at full length, but hasn't been watched start to
finish.
