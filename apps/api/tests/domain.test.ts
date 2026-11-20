import { describe, expect, it } from "vitest";
import {
  categorySchema,
  inventoryAdjustmentSchema,
  productVariantSchema,
  supplierSchema,
} from "../src/domain/schemas.js";

describe("core domain schemas", () => {
  it("accepts a valid category and supplier", () => {
    expect(categorySchema.parse({ name: "  Drinks  " }).name).toBe("Drinks");
    expect(
      supplierSchema.parse({
        name: "Example Supply",
        email: "orders@example.com",
      }).email,
    ).toBe("orders@example.com");
  });

  it("requires integer minor-unit amounts for variants", () => {
    expect(() =>
      productVariantSchema.parse({
        productId: "3f26cb0d-fd5e-4f57-9e5e-dc79b31cc99d",
        sku: "DRINK-001",
        unitPriceMinor: 1299n,
      }),
    ).not.toThrow();
    expect(() =>
      productVariantSchema.parse({
        productId: "3f26cb0d-fd5e-4f57-9e5e-dc79b31cc99d",
        sku: "DRINK-001",
        unitPriceMinor: 12.99,
      }),
    ).toThrow();
  });

  it("rejects an inventory adjustment with zero quantity", () => {
    expect(() =>
      inventoryAdjustmentSchema.parse({
        variantId: "3f26cb0d-fd5e-4f57-9e5e-dc79b31cc99d",
        quantityDelta: 0,
        reason: "Cycle count",
      }),
    ).toThrow();
  });
});
