import type Lenis from "lenis";

let instance: Lenis | null = null;

/** Set once by SmoothScroll.tsx when the root Lenis instance mounts. */
export function setLenisInstance(lenis: Lenis | null) {
  instance = lenis;
}

/** Lets any component (e.g. the games showcase's dot nav) drive the same smooth-scroll
 *  instance the rest of the site uses, instead of a raw `window.scrollTo`. */
export function getLenisInstance(): Lenis | null {
  return instance;
}
