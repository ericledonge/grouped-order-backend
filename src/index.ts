import "dotenv/config";
import { serve } from "@hono/node-server";
import { createDatabase } from "./infrastructure/db/index.js";
import { createAuth } from "./infrastructure/auth/auth.js";
import { createSessionMiddleware } from "./infrastructure/auth/auth.middleware.js";
import { createAuthRoutes } from "./infrastructure/http/routes/auth.routes.js";
import { createApp } from "./app.js";

const db = createDatabase(process.env.DATABASE_URL!, process.env.DATABASE_AUTH_TOKEN);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

const auth = createAuth(db, {
  trustedOrigins: allowedOrigins,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

const app = createApp({
  db,
  sessionMiddleware: createSessionMiddleware(auth),
  authRouteHandler: createAuthRoutes(auth),
  corsOrigins: allowedOrigins,
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Server is running on http://0.0.0.0:${info.port}`);
});
