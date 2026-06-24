import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "better-auth.session_token"

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value
  const { pathname } = request.nextUrl

  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isPublicPath =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"

  if (isPublicPath) {
    return NextResponse.next()
  }

  if (isAuthPage) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
