import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { verifyAccessToken } from "./tokens.js";
import type { AuthenticatedUser } from "./types.js";

function unauthorized(response: Response) {
  response.status(401).json({ error: "Authentication required" });
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer (.+)$/i);
  if (!match) {
    unauthorized(response);
    return;
  }

  const claims = await verifyAccessToken(match[1]);
  if (!claims) {
    unauthorized(response);
    return;
  }

  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    role: AuthenticatedUser["role"];
    must_change_password: boolean;
  }>(
    `SELECT u.id, u.name, u.email, u.role, u.must_change_password
     FROM users u
     JOIN auth_sessions s ON s.user_id = u.id
     WHERE u.id = $1 AND s.id = $2
       AND u.active = true AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [claims.userId, claims.sessionId],
  );
  const user = result.rows[0];
  if (!user) {
    unauthorized(response);
    return;
  }

  request.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password,
    sessionId: claims.sessionId,
  };

  if (
    request.authUser.mustChangePassword &&
    request.path !== "/change-password"
  ) {
    response.status(403).json({ error: "Password change required" });
    return;
  }

  next();
}

export function requireRoles(...roles: AuthenticatedUser["role"][]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      response.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
