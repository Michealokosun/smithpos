import type { Role } from "../domain/models.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  sessionId: string;
}

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}
