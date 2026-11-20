import { Router } from "express";
import { pool } from "../db/pool.js";
import { hashPassword } from "./password.js";
import { canCreateRole } from "./permissions.js";
import { createUserSchema } from "./schemas.js";
import { requireAuth, requireRoles } from "./middleware.js";

export const userRouter = Router();

userRouter.use(requireAuth, requireRoles("administrator", "manager"));

userRouter.get("/", async (_request, response) => {
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    must_change_password: boolean;
    created_at: Date;
  }>(
    `SELECT id, name, email, role, active, must_change_password, created_at
     FROM users ORDER BY name`,
  );
  response.status(200).json({
    users: result.rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      mustChangePassword: user.must_change_password,
      createdAt: user.created_at,
    })),
  });
});

userRouter.post("/", async (request, response) => {
  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error:
        "Provide a name, valid email, password of at least 12 characters, and role",
    });
    return;
  }

  const creatorRole = request.authUser!.role;
  if (!canCreateRole(creatorRole, parsed.data.role)) {
    response.status(403).json({ error: "You cannot create that account role" });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  try {
    const result = await pool.query<{
      id: string;
      name: string;
      email: string;
      role: string;
      active: boolean;
      must_change_password: boolean;
      created_at: Date;
    }>(
      `INSERT INTO users (name, email, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, active, must_change_password, created_at`,
      [parsed.data.name, parsed.data.email, passwordHash, parsed.data.role],
    );
    const user = result.rows[0];
    response.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        mustChangePassword: user.must_change_password,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      response
        .status(409)
        .json({ error: "An account with that email already exists" });
      return;
    }
    throw error;
  }
});
