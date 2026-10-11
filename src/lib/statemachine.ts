/**
 * Controlled state machines. Invalid transitions are rejected so an order can
 * never be marked paid/fulfilled by accident.
 */

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAYMENT_PROCESSING", "PAID", "FULFILLMENT_PENDING", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_PROCESSING: ["PAID", "FULFILLMENT_PENDING", "PAYMENT_FAILED", "CANCELLED"],
  PAID: ["FULFILLMENT_PENDING", "CANCELLED", "REFUNDED"],
  FULFILLMENT_PENDING: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["IN_TRANSIT", "DELIVERED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "PAID", "FULFILLMENT_PENDING", "CANCELLED"],
};

export const DIGITAL_ORDER_FLOW = [
  "PAYMENT_PENDING",
  "PAID",
  "ACCESS_GRANTED",
  "DOWNLOAD_AVAILABLE",
  "COMPLETED",
  "REFUNDED",
];

export const PROJECT_TRANSITIONS: Record<string, string[]> = {
  INQUIRY: ["PAYMENT_PENDING", "PAID", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["REQUIREMENTS_PENDING", "CANCELLED", "REFUNDED"],
  REQUIREMENTS_PENDING: ["REQUIREMENTS_RECEIVED", "CANCELLED"],
  REQUIREMENTS_RECEIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["CLIENT_REVIEW", "CANCELLED"],
  CLIENT_REVIEW: ["COMPLETED", "REVISION_REQUESTED"],
  REVISION_REQUESTED: ["IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(machine: Record<string, string[]>, from: string, to: string): boolean {
  return (machine[from] ?? []).includes(to);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_PROCESSING: "Payment processing",
  PAID: "Paid",
  FULFILLMENT_PENDING: "Preparing your order",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PAYMENT_FAILED: "Payment failed",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  INQUIRY: "Inquiry received",
  PAYMENT_PENDING: "Payment pending",
  PAID: "Paid",
  REQUIREMENTS_PENDING: "Waiting for requirements",
  REQUIREMENTS_RECEIVED: "Requirements received",
  IN_PROGRESS: "In progress",
  CLIENT_REVIEW: "Ready for your review",
  REVISION_REQUESTED: "Revision requested",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
