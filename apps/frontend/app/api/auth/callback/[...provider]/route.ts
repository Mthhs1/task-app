import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const ORIGIN = "http://localhost:3000"

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string[] }> }) {
  const { provider } = await params
  const providerPath = provider.join("/")
  const search = request.nextUrl.search
  const cookie = request.headers.get("cookie") || ""

  const res = await fetch(`${BACKEND_URL}/api/auth/callback/${providerPath}${search}`, {
    headers: {
      Origin: ORIGIN,
      ...(cookie ? { cookie } : {}),
    },
    redirect: "manual",
  })

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location")
    if (location) {
      const response = NextResponse.redirect(new URL(location, request.url))
      const cookies = res.headers.getSetCookie()
      for (const cookie of cookies) {
        response.headers.append("Set-Cookie", cookie)
      }
      return response
    }
  }

  const text = await res.text()
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status })
  } catch {
    return new NextResponse(text, { status: res.status })
  }
}
