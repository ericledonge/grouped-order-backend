import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { createTestDatabase, applySchema } from "../tests/helpers/test-db.js";
import { createAuth } from "../src/infrastructure/auth/auth.js";
import { createSessionMiddleware } from "../src/infrastructure/auth/auth.middleware.js";
import { createAuthRoutes } from "../src/infrastructure/http/routes/auth.routes.js";
import { createApp } from "../src/app.js";

const { db } = createTestDatabase();
await applySchema(db);

const auth = createAuth(db, {
  trustedOrigins: ["http://localhost:5173"],
  secret: "e2e-test-secret-at-least-32-characters-long!!",
  baseURL: "http://localhost:3000",
});

async function seedAdmin() {
  await auth.api.signUpEmail({
    body: {
      name: "Admin E2E",
      email: "admin@e2e.test",
      password: "password123",
    },
  });
  await db.run(
    sql`UPDATE user SET role = 'admin' WHERE email = 'admin@e2e.test'`,
  );
}

await seedAdmin();

const app = createApp({
  db,
  sessionMiddleware: createSessionMiddleware(auth),
  authRouteHandler: createAuthRoutes(auth),
  corsOrigins: ["http://localhost:5173"],
});

// Reset endpoint: clear all data and re-seed admin
app.post("/api/e2e/reset", async (c) => {
  const tables = [
    "wish",
    "basket",
    '"order"',
    "deposit_point",
    "session",
    "account",
    "verification",
    "user",
  ];
  for (const table of tables) {
    await db.run(sql.raw(`DELETE FROM ${table}`));
  }
  await seedAdmin();
  return c.json({ status: "reset" });
});

const port = Number(process.env.E2E_BACKEND_PORT) || 3000;

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`E2E backend running on http://0.0.0.0:${info.port}`);
});
