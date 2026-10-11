import type { CheckoutParams, CheckoutResult, PaymentProvider, VerifyResult } from "./index";

/**
 * Local test gateway — simulates a hosted payment page so the full flow
 * (create → redirect → callback → server verification → fulfillment) can be
 * exercised without external keys. Swap via PAYMENT_PROVIDER in production.
 */
export class MockProvider implements PaymentProvider {
  code = "mock";
  label = "FEMZYK Test Gateway";

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const url = new URL(params.successUrl);
    return {
      redirectUrl: `/checkout/gateway?ref=${encodeURIComponent(params.reference)}&amt=${params.amountCents}&cur=${params.currency}&back=${encodeURIComponent(url.pathname)}`,
    };
  }

  async verify(reference: string, providerRef?: string): Promise<VerifyResult> {
    // The mock gateway's outcome is posted by the internal gateway page to the
    // same callback endpoint real webhooks use; outcome is passed as providerRef.
    const outcome = providerRef ?? "SUCCESS";
    return {
      status: outcome === "SUCCESS" ? "SUCCESS" : outcome === "PENDING" ? "PENDING" : "FAILED",
      providerRef: `mock_${reference}`,
    };
  }
}
