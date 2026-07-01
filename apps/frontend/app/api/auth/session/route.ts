import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || ""
  const origin = request.nextUrl.origin

  const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
    headers: {
      Origin: origin,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  })

  const text = await res.text()
  const setCookies = res.headers.getSetCookie?.() || []

  try {
    const data = JSON.parse(text)
    const response = NextResponse.json(data, { status: res.status })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    for (const cookie of setCookies) {
      response.headers.append("Set-Cookie", cookie)
    }
    return response
  } catch {
    const response = new NextResponse(text, { status: res.status })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    for (const cookie of setCookies) {
      response.headers.append("Set-Cookie", cookie)
    }
    return response
  }
}
