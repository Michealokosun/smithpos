import { describe, expect, it } from "vitest";
import { canCreateRole } from "../src/auth/permissions.js";

describe("staff role provisioning", () => {
  it("allows administrators to create managers and cashiers only", () => {
    expect(canCreateRole("administrator", "manager")).toBe(true);
    expect(canCreateRole("administrator", "cashier")).toBe(true);
    expect(canCreateRole("administrator", "administrator")).toBe(false);
  });

  it("limits managers to creating cashiers", () => {
    expect(canCreateRole("manager", "cashier")).toBe(true);
    expect(canCreateRole("manager", "manager")).toBe(false);
    expect(canCreateRole("cashier", "cashier")).toBe(false);
  });
});
