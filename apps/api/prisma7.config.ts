import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured in the .env file.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed-organizations.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});