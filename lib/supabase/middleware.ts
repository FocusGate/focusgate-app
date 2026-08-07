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

  const protectedPaths = ["/dashboard", "/badges", "/stats", "/friends", "/settings", "/games"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Once signed in, /login and /signup have nothing left to do — send straight to the
  // dashboard instead of re-showing the create-account form. Signing out clears the
  // session, so this doesn't block getting back to either form afterward.
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.some((p) => request.nextUrl.pathname === p);

  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
