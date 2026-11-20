import type { Role } from "../domain/models.js";

export function canCreateRole(creatorRole: Role, targetRole: Role): boolean {
  if (creatorRole === "administrator") {
    return targetRole === "manager" || targetRole === "cashier";
  }
  return creatorRole === "manager" && targetRole === "cashier";
}
