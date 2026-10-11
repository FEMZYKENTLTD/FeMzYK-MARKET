import type { CheckoutParams, CheckoutResult, PaymentProvider, VerifyResult } from "./index";

/**
 * Paystack adapter — international payments for eligible businesses.
 * Requires PAYSTACK_SECRET_KEY (server-side only).
 * Docs: https://paystack.com/docs/api
 */
const API = "https://api.paystack.co";

export class PaystackProvider implements PaymentProvider {
  code = "paystack";
  label = "Paystack";

  private headers() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        email: p.customerEmail,
        amount: p.amountCents,
        currency: p.currency,
        reference: p.reference,
        callback_url: p.successUrl,
        metadata: { customer_name: p.customerName },
      }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== true) {
      throw new Error("Paystack checkout could not be started. Please try again.");
    }
    return { redirectUrl: json.data.authorization_url };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: this.headers(),
    });
    const json = await res.json();
    const d = json?.data;
    if (!res.ok || json.status !== true || !d) return { status: "FAILED" };
    return {
      status: d.status === "success" ? "SUCCESS" : ["pending", "ongoing", "processing", "queued"].includes(String(d.status).toLowerCase()) ? "PENDING" : "FAILED",
      providerRef: String(d.reference ?? ""),
      amountCents: d.amount,
      currency: d.currency,
      raw: d,
    };
  }
}
