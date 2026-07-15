import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function getSessionCookieName(): string {
  const isProd = process.env.NODE_ENV === "production"
  return isProd
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token"
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get(getSessionCookieName())?.value
  const { pathname } = request.nextUrl

  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isSetupUsernamePage = pathname === "/setup-username"
  const isPublicPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"

  if (isPublicPath) {
    return NextResponse.next()
  }

  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (isAuthPage) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isSetupUsernamePage) {
    return NextResponse.next()
  }

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001"
    const res = await fetch(`${backendUrl}/api/auth/session`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.user && !data.user.username) {
        return NextResponse.redirect(new URL("/setup-username", request.url))
      }
    }
  } catch {
    // If we can't check, let them through
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
