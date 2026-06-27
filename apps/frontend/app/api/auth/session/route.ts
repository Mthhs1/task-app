import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const ORIGIN = "http://localhost:3000"

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") || ""

  const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
    headers: {
      Origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
  })

  const data = await res.json()

  const response = NextResponse.json(data, { status: res.status })
  const cookies = res.headers.getSetCookie()
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie)
  }

  return response
}
