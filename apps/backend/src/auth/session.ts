import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "http";

export async function getSession(headers: IncomingHttpHeaders) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  return session;
}
