import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { db } from "../db/client.js";
import { env } from "../env.js";
import * as schema from "../db/schema/index.js";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.CORS_ORIGIN],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [organization()],
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
  },
});
