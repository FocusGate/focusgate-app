import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && /^https?:\/\//.test(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Supabase isn't configured yet (.env.local still has placeholders) — let everything through
  // instead of crashing every request in middleware.
  if (!isConfigured()) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A Server Action's POST lands on whatever page it was *called from* — SignupForm calls
  // sendWelcomeEmail() (lib/email.ts) while still rendering /signup, an instant after
  // signUp() has already created a real session. That POST would otherwise get caught by
  // the isAuthPath redirect below (user is truthy, pathname is "/signup") and get answered
  // with a 307 to /dashboard instead of ever reaching the action — which is exactly what
  // "An unexpected response was received from the server" means: the client sent a
  // Server-Action-formatted request expecting an RSC action-response stream back and got a
  // plain redirect instead. Confirmed live (a fresh Server Action, the first ever added to
  // this codebase, reproduced this deterministically from /signup). Redirects are a
  // page-navigation concern; a Server Action call is never one, regardless of which path it
  // happens to POST to, so it's exempted from both redirect checks below by the same
  // `next-action` header Next.js itself sets on every such request.
  const isServerAction = request.headers.has("next-action");

  const protectedPaths = ["/dashboard", "/badges", "/stats", "/friends", "/settings", "/games"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && isProtected && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Once signed in, /login and /signup have nothing left to do — send straight to the
  // dashboard instead of re-showing the create-account form. Signing out clears the
  // session, so this doesn't block getting back to either form afterward.
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.some((p) => request.nextUrl.pathname === p);

  if (user && isAuthPath && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
