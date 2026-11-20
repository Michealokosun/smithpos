import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const rootEnvPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
  ".env",
);

dotenv.config({ path: rootEnvPath });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
