// fonts.ts — loads the two brand faces via @remotion/google-fonts (not a <link> tag or a
// bare font-family string) so the headless render is guaranteed to have them ready before
// it captures a single frame. See constants.ts's FONT_DISPLAY/FONT_BODY for where the
// resulting family names are actually used.
//
// NOTE: "Geist" is a Vercel-distributed font, not something Google Fonts hosts — this is
// verified against @remotion/google-fonts's actual registry after `npm install` (see
// README's "if a font import fails to resolve" note); if @remotion/google-fonts/Geist
// doesn't exist, swap the import + FONT_BODY below for a close, definitely-available
// alternative (Inter or Manrope both read similarly).

import { loadFont as loadDisplayFont } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadBodyFont } from "@remotion/google-fonts/Geist";

export function loadFonts() {
  // Scoped to exactly the weights/subset this composition actually uses (400 for the
  // Instrument Serif wordmark; 400/700/800 for Geist's body/label/number text) — the
  // default call pulls every weight in every subset (cyrillic, vietnamese, etc.), which
  // was firing 90+ font network requests per render for weights nothing here renders.
  loadDisplayFont("normal", { weights: ["400"], subsets: ["latin"] });
  loadBodyFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });
}
