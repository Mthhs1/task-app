import { type FastifyRequest, type FastifyReply } from "fastify"
import { auth } from "../auth/auth.js"
import { fromNodeHeaders } from "better-auth/node"

async function forwardResponse(reply: FastifyReply, res: Response) {
    reply.code(res.status)

    const setCookies = res.headers.getSetCookie?.() || []
    for (const cookie of setCookies) {
        reply.raw.appendHeader("Set-Cookie", cookie)
    }

    res.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") {
            reply.header(key, value)
        }
    })

    const text = await res.text()
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

export async function signInEmail(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const { email, password } = request.body as {
        email: string
        password: string
    }
    const res = await auth.api.signInEmail({
        body: { email, password },
        headers: fromNodeHeaders(request.headers),
        asResponse: true,
    })
    return forwardResponse(reply, res)
}

export async function signUpEmail(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const { name, email, password } = request.body as {
        name: string
        email: string
        password: string
    }
    const res = await auth.api.signUpEmail({
        body: { name, email, password },
        headers: fromNodeHeaders(request.headers),
        asResponse: true,
    })
    return forwardResponse(reply, res)
}

export async function signInSocial(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const { provider, callbackURL } = request.body as {
        provider: string
        callbackURL: string
    }
    const res = await auth.api.signInSocial({
        body: { provider, callbackURL },
        headers: fromNodeHeaders(request.headers),
        asResponse: true,
    })

    return forwardResponse(reply, res)
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
    const headers = fromNodeHeaders(request.headers)

    // Explicitly revoke the session from the database before signing out
    const session = await auth.api.getSession({ headers })
    if (session?.session?.token) {
        await auth.api.revokeSession({
            headers,
            body: { token: session.session.token },
        })
    }

    const res = await auth.api.signOut({
        headers,
        asResponse: true,
    })

    return forwardResponse(reply, res)
}

export async function getSession(request: FastifyRequest, reply: FastifyReply) {
    const res = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
        asResponse: true,
    })
    return forwardResponse(reply, res)
}

export async function authDispatcher(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    const { action } = request.body as { action: string }

    switch (action) {
        case "sign-in-email":
            return signInEmail(request, reply)
        case "sign-up-email":
            return signUpEmail(request, reply)
        case "sign-in-social":
            return signInSocial(request, reply)
        case "logout":
            return logout(request, reply)
        default:
            return reply
                .status(400)
                .send({ message: `Invalid action: ${action}` })
    }
}
