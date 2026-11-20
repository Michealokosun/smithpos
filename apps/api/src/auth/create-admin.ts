import { randomUUID } from "node:crypto";
import readline from "node:readline";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { hashPassword } from "./password.js";

function ask(prompt: string): Promise<string> {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    terminal.question(prompt, (answer) => {
      terminal.close();
      resolve(answer.trim());
    });
  });
}

function askSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error(
      "Run this command in an interactive terminal to enter the password securely",
    );
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          process.stdin.removeListener("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          reject(new Error("Admin setup cancelled"));
          return;
        }
        if (character === "\r" || character === "\n") {
          process.stdin.removeListener("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (character >= " ") {
          value += character;
          process.stdout.write("*");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

async function createFirstAdmin() {
  const existing = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM users) AS exists",
  );
  if (existing.rows[0].exists) {
    throw new Error(
      "Users already exist; the initial administrator can only be created once",
    );
  }

  const name = await ask("Administrator name: ");
  const email = (await ask("Administrator email: ")).toLowerCase();
  const password = await askSecret("Password (12+ characters): ");
  const confirmation = await askSecret("Confirm password: ");
  const input = z
    .object({
      name: z.string().trim().min(1).max(200),
      email: z.email().max(254),
      password: z.string().min(12).max(128),
    })
    .safeParse({ name, email, password });

  if (!input.success) {
    throw new Error("Name, email, or password does not meet the requirements");
  }
  if (password !== confirmation) {
    throw new Error("Passwords do not match");
  }

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(47001329)");
    const existingAtInsert = await client.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM users) AS exists",
    );
    if (existingAtInsert.rows[0].exists) {
      throw new Error(
        "Another account was created during setup; initial administrator was not added",
      );
    }
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'administrator')`,
      [randomUUID(), input.data.name, input.data.email, passwordHash],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  console.log(`Created administrator account for ${input.data.email}`);
}

try {
  await createFirstAdmin();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin setup failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
