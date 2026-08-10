"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, posthog } from "@/lib/posthog";

/** Fires a $pageview on every client-side route change. Split out from the provider below
 *  and wrapped in its own Suspense boundary because useSearchParams() requires one in the
 *  App Router — without it, every page using this provider would opt into the same
 *  requirement for no reason of its own. */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    if (searchParams && searchParams.toString()) url += `?${searchParams.toString()}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/** Wraps the whole app in app/layout.tsx. Initializes PostHog once on mount (client-only —
 *  posthog-js reaches for `window` immediately, so this can never run during SSR) and tracks
 *  pageviews on every route change thereafter. */
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
