import type { CheckoutParams, CheckoutResult, PaymentProvider, VerifyResult } from "./index";

/**
 * Flutterwave adapter — supports card payments in USD, GBP, CAD and more.
 * Requires FLUTTERWAVE_SECRET_KEY (server-side only).
 * Docs: https://developer.flutterwave.com
 */
const API = "https://api.flutterwave.com/v3";

export class FlutterwaveProvider implements PaymentProvider {
  code = "flutterwave";
  label = "Flutterwave";

  private headers() {
    return {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  async createCheckout(p: CheckoutParams): Promise<CheckoutResult> {
    const res = await fetch(`${API}/payments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        tx_ref: p.reference,
        amount: p.amountCents / 100,
        currency: p.currency,
        redirect_url: p.successUrl,
        customer: { email: p.customerEmail, name: p.customerName },
        customizations: {
          title: "FEMZYK MARKET",
          description: `Order ${p.reference}`,
          logo: "",
        },
      }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== "success") {
      throw new Error("Flutterwave checkout could not be started. Please try again.");
    }
    return { redirectUrl: json.data.link };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      headers: this.headers(),
    });
    const json = await res.json();
    const d = json?.data;
    if (!res.ok || json.status !== "success" || !d) return { status: "FAILED" };
    return {
      status: d.status === "successful" ? "SUCCESS" : ["pending", "ongoing", "processing"].includes(String(d.status).toLowerCase()) ? "PENDING" : "FAILED",
      providerRef: String(d.flw_ref ?? ""),
      amountCents: Math.round((d.amount ?? 0) * 100),
      currency: d.currency,
      raw: d,
    };
  }
}
