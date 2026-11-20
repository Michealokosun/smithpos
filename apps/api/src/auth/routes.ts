import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { Router, type Request, type Response } from "express";
import { pool } from "../db/pool.js";
import { changePasswordSchema, loginSchema } from "./schemas.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "./tokens.js";
import { requireAuth } from "./middleware.js";

const refreshCookieName = "pos_refresh";
const dummyPasswordHash = `scrypt$32768$8$1$${"00".repeat(16)}$${"00".repeat(64)}`;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again later." },
});

function cookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ("none" as const) : ("lax" as const),
    path: "/api/auth",
  };
}

function trustedOrigin(request: Request, response: Response): boolean {
  try {
    const origin = request.get("origin");
    const referer = request.get("referer");
    const requestOrigin = origin ?? (referer ? new URL(referer).origin : null);
    const configuredOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

    if (!requestOrigin) {
      response.status(403).json({ error: "Origin is required" });
      return false;
    }

    if (new URL(requestOrigin).origin !== new URL(configuredOrigin).origin) {
      response.status(403).json({ error: "Untrusted request origin" });
      return false;
    }
  } catch {
    response.status(403).json({ error: "Invalid request origin" });
    return false;
  }
  return true;
}

function readRefreshCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${refreshCookieName}=`));
  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(refreshCookieName.length + 1));
  } catch {
    return null;
  }
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(refreshCookieName, cookieOptions());
}

function setRefreshCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie(refreshCookieName, token, {
    ...cookieOptions(),
    expires: expiresAt,
  });
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  must_change_password: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password,
  };
}

export const authRouter = Router();

authRouter.post("/login", loginLimiter, async (request, response) => {
  if (!trustedOrigin(request, response)) return;
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Email or password is invalid" });
    return;
  }

  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    password_hash: string;
    must_change_password: boolean;
  }>(
    `SELECT id, name, email, role, active, password_hash, must_change_password
     FROM users WHERE lower(email) = $1`,
    [parsed.data.email],
  );
  const user = result.rows[0];
  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user?.password_hash ?? dummyPasswordHash,
  );

  if (!user || !user.active || !passwordMatches) {
    response.status(401).json({ error: "Email or password is incorrect" });
    return;
  }

  const refreshToken = createRefreshToken();
  const sessionId = randomUUID();
  const session = await pool.query<{ id: string; expires_at: Date }>(
    `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3, now() + interval '1 day')
     RETURNING id, expires_at`,
    [sessionId, user.id, hashRefreshToken(refreshToken)],
  );
  const accessToken = await createAccessToken(user.id, session.rows[0].id);

  setRefreshCookie(response, refreshToken, session.rows[0].expires_at);
  response.status(200).json({ accessToken, user: publicUser(user) });
});

authRouter.post("/refresh", async (request, response) => {
  if (!trustedOrigin(request, response)) return;
  const oldToken = readRefreshCookie(request);
  if (!oldToken) {
    response.status(401).json({ error: "Session expired. Sign in again." });
    return;
  }

  const client = await pool.connect();
  let user:
    | {
        id: string;
        name: string;
        email: string;
        role: string;
        must_change_password: boolean;
        session_id: string;
        expires_at: Date;
      }
    | undefined;
  const nextRefreshToken = createRefreshToken();

  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      name: string;
      email: string;
      role: string;
      must_change_password: boolean;
      session_id: string;
      expires_at: Date;
    }>(
      `SELECT u.id, u.name, u.email, u.role, u.must_change_password,
              s.id AS session_id, s.expires_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.active = true
       FOR UPDATE OF s`,
      [hashRefreshToken(oldToken)],
    );
    user = result.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      response.status(401).json({ error: "Session expired. Sign in again." });
      return;
    }

    await client.query(
      `UPDATE auth_sessions
       SET refresh_token_hash = $1, last_used_at = now()
       WHERE id = $2`,
      [hashRefreshToken(nextRefreshToken), user.session_id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!user) {
    response.status(401).json({ error: "Session expired. Sign in again." });
    return;
  }
  const accessToken = await createAccessToken(user.id, user.session_id);
  setRefreshCookie(response, nextRefreshToken, user.expires_at);
  response.status(200).json({ accessToken, user: publicUser(user) });
});

authRouter.post("/logout", async (request, response) => {
  if (!trustedOrigin(request, response)) return;
  const refreshToken = readRefreshCookie(request);
  if (refreshToken) {
    await pool.query(
      `UPDATE auth_sessions SET revoked_at = now()
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
      [hashRefreshToken(refreshToken)],
    );
  }
  clearRefreshCookie(response);
  response.status(204).end();
});

authRouter.get("/me", requireAuth, (request, response) => {
  const user = request.authUser!;
  response.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

authRouter.post("/change-password", requireAuth, async (request, response) => {
  const parsed = changePasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "Password must be at least 12 characters and different",
    });
    return;
  }

  const user = request.authUser!;
  const current = await pool.query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [user.id],
  );
  if (
    !current.rows[0] ||
    !(await verifyPassword(
      parsed.data.currentPassword,
      current.rows[0].password_hash,
    ))
  ) {
    response.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await pool.query(
    `UPDATE users
     SET password_hash = $1, must_change_password = false, updated_at = now()
     WHERE id = $2`,
    [passwordHash, user.id],
  );
  await pool.query(
    `UPDATE auth_sessions SET revoked_at = now()
     WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL`,
    [user.id, user.sessionId],
  );

  response.status(200).json({ message: "Password changed successfully" });
});
