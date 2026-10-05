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
  const code = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (code === "flutterwave" && process.env.FLUTTERWAVE_SECRET_KEY) return new FlutterwaveProvider();
  if (code === "paystack" && process.env.PAYSTACK_SECRET_KEY) return new PaystackProvider();
  return new MockProvider();
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
