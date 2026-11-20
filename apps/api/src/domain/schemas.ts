import { z } from "zod";

export const uuidSchema = z.uuid();
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase());
export const minorAmountSchema = z.bigint().nonnegative();

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  parentId: uuidSchema.nullable().optional(),
  active: z.boolean().default(true),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  categoryId: uuidSchema.nullable().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  taxBasisPoints: z.number().int().nonnegative().max(100000).default(0),
  active: z.boolean().default(true),
});

export const productVariantSchema = z.object({
  productId: uuidSchema,
  sku: z.string().trim().min(1).max(100),
  barcode: z.string().trim().min(1).max(100).nullable().optional(),
  name: z.string().trim().max(200).nullable().optional(),
  unitPriceMinor: minorAmountSchema,
  costPriceMinor: minorAmountSchema.default(0n),
  trackInventory: z.boolean().default(true),
  active: z.boolean().default(true),
});

export const inventoryAdjustmentSchema = z.object({
  variantId: uuidSchema,
  quantityDelta: z
    .number()
    .int()
    .refine((value) => value !== 0),
  reason: z.string().trim().min(1).max(500),
  referenceType: z.string().trim().max(100).nullable().optional(),
  referenceId: uuidSchema.nullable().optional(),
});

export const purchaseReceiptSchema = z.object({
  supplierId: uuidSchema,
  reference: z.string().trim().max(100).nullable().optional(),
  status: z.enum(["draft", "received", "void"]).default("draft"),
  receivedAt: z.iso.datetime().nullable().optional(),
});

export const saleSchema = z.object({
  saleNumber: z.string().trim().min(1).max(100),
  currencyCode: currencyCodeSchema.default("USD"),
  cashierId: uuidSchema.nullable().optional(),
});

export const paymentSchema = z.object({
  method: z.enum(["cash", "card", "gift_card", "other"]),
  amountMinor: minorAmountSchema,
  reference: z.string().trim().max(200).nullable().optional(),
});
