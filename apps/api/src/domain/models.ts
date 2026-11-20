export type Role = "administrator" | "manager" | "cashier";
export type SaleStatus =
  "held" | "completed" | "cancelled" | "returned" | "partial_return";
export type PaymentMethod = "cash" | "card" | "gift_card" | "other";
export type PurchaseReceiptStatus = "draft" | "received" | "void";

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  taxBasisPoints: number;
  active: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  name: string | null;
  unitPriceMinor: bigint;
  costPriceMinor: bigint;
  trackInventory: boolean;
  active: boolean;
}

export interface InventoryBalance {
  variantId: string;
  quantity: number;
}

export interface InventoryMovement {
  id: string;
  variantId: string;
  quantityDelta: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface PurchaseReceipt {
  id: string;
  supplierId: string;
  reference: string | null;
  status: PurchaseReceiptStatus;
  receivedAt: Date | null;
  createdBy: string | null;
}

export interface PurchaseReceiptItem {
  id: string;
  receiptId: string;
  variantId: string;
  quantity: number;
  unitCostMinor: bigint;
}

export interface Sale {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  currencyCode: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  cashierId: string | null;
  completedAt: Date | null;
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
}

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amountMinor: bigint;
  reference: string | null;
  receivedAt: Date;
}

export interface Refund {
  id: string;
  saleId: string;
  amountMinor: bigint;
  reason: string | null;
  refundedBy: string | null;
  refundedAt: Date;
}
