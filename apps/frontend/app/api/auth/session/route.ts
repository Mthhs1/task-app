import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") || ""
  const origin = request.nextUrl.origin

  const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
    headers: {
      Origin: origin,
      ...(cookie ? { cookie } : {}),
    },
  })

  const text = await res.text()
  const cookies = res.headers.getSetCookie()

  try {
    const data = JSON.parse(text)
    const response = NextResponse.json(data, { status: res.status })
    for (const cookie of cookies) {
      response.headers.append("Set-Cookie", cookie)
    }
    return response
  } catch {
    const response = new NextResponse(text, { status: res.status })
    for (const cookie of cookies) {
      response.headers.append("Set-Cookie", cookie)
    }
    return response
  }
}
