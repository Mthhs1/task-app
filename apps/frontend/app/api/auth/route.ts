import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const ORIGIN = "http://localhost:3000"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const cookie = request.headers.get("cookie") || ""

  const res = await fetch(`${BACKEND_URL}/api/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })
  const cookies = res.headers.getSetCookie()
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie)
  }

  return response
}
