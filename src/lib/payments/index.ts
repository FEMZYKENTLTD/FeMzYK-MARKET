/**
 * Payment abstraction layer.
 *
 * The checkout system only talks to the PaymentProvider interface — swapping
 * or adding providers (Flutterwave, Paystack, Stripe later…) never touches
 * checkout code. Secret keys stay server-side; the frontend only ever sees
 * public data.
 */

export interface CheckoutParams {
  reference: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  redirectUrl: string;
}

export interface VerifyResult {
  status: "SUCCESS" | "FAILED" | "PENDING";
  providerRef?: string;
  amountCents?: number;
  currency?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  code: string;
  label: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /** Server-side verification — never trust frontend success messages. */
  verify(reference: string, providerRef?: string): Promise<VerifyResult>;
}

import { MockProvider } from "./mock";
import { FlutterwaveProvider } from "./flutterwave";
import { PaystackProvider } from "./paystack";

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  const code = configured || (process.env.NODE_ENV === "production" ? "" : "mock");

  // Never silently downgrade a live deployment to a simulated payment gateway.
  if (process.env.NODE_ENV === "production" && (!code || code === "mock")) {
    throw new Error("A live payment provider must be configured before checkout can be enabled.");
  }
  if (code === "mock") return new MockProvider();
  if (code === "flutterwave") {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) throw new Error("Flutterwave is selected but its server secret is not configured.");
    return new FlutterwaveProvider();
  }
  if (code === "paystack") {
    if (!process.env.PAYSTACK_SECRET_KEY) throw new Error("Paystack is selected but its server secret is not configured.");
    return new PaystackProvider();
  }
  throw new Error("Unsupported payment provider. Choose flutterwave or paystack.");
}

export function providerLabel(code: string): string {
  switch (code) {
    case "flutterwave":
      return "Flutterwave";
    case "paystack":
      return "Paystack";
    default:
      return "FEMZYK Test Gateway";
  }
}
