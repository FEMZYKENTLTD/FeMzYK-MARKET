import { insert } from "./db";

/**
 * Transactional email layer.
 * Emails are rendered from templates and queued in `email_outbox`. When an
 * EMAIL_API_KEY/provider is configured, the queue is delivered; otherwise
 * messages are stored for inspection (visible in the admin dashboard).
 * Marketing emails respect unsubscribe; we never spam.
 */

type TemplateData = Record<string, string | number | undefined>;

const TEMPLATES: Record<string, (d: TemplateData) => { subject: string; body: string }> = {
  welcome: (d) => ({
    subject: "Welcome to FEMZYK MARKET",
    body: `Hi ${d.name || "there"},\n\nThanks for creating a FEMZYK MARKET account. You can now track orders, access digital purchases and manage your projects in one place.\n\n— The FEMZYK Team`,
  }),
  order_confirmation: (d) => ({
    subject: `Order ${d.orderNumber} confirmed`,
    body: `Hi ${d.name || "there"},\n\nThank you for your order. We've received order ${d.orderNumber} for ${d.total}.\n\nWe'll email you when it ships. You can track it any time from the Track Order page.\n\n— The FEMZYK Team`,
  }),
  payment_failed: (d) => ({
    subject: `Payment could not be completed (${d.orderNumber})`,
    body: `Hi ${d.name || "there"},\n\nYour payment could not be completed. No order has been confirmed and no charge was made.\n\nYou can try again from your cart, or contact us if you'd like help.\n\n— The FEMZYK Team`,
  }),
  shipping_confirmation: (d) => ({
    subject: `Your order ${d.orderNumber} is on its way`,
    body: `Hi ${d.name || "there"},\n\nGood news — order ${d.orderNumber} has shipped.\n${d.tracking ? `Tracking: ${d.tracking}` : ""}\nEstimated delivery: ${d.estimate || "see your order details"}.\n\n— The FEMZYK Team`,
  }),
  delivery_notification: (d) => ({
    subject: `Order ${d.orderNumber} delivered`,
    body: `Hi ${d.name || "there"},\n\nYour order ${d.orderNumber} has been delivered. We hope everything arrived in perfect shape.\n\nIf anything isn't right, just reply or visit our Help Center.\n\n— The FEMZYK Team`,
  }),
  digital_delivery: (d) => ({
    subject: `Your download is ready (${d.orderNumber})`,
    body: `Hi ${d.name || "there"},\n\nYour digital purchase is ready. Sign in to your account and open Downloads to access your files securely.\n\nOrder: ${d.orderNumber}\n\n— The FEMZYK Team`,
  }),
  digital_update: (d) => ({
    subject: `${d.productName} has been updated`,
    body: `Hi ${d.name || "there"},\n\nA product you purchased — ${d.productName} — has a new version available (${d.version}). Your download has been updated at no extra cost in your Downloads area.\n\n— The FEMZYK Team`,
  }),
  service_confirmation: (d) => ({
    subject: `Your project has been received (${d.reference})`,
    body: `Hi ${d.name || "there"},\n\nThanks for choosing FEMZYK Web Development. Your project ${d.reference} has been created.\n\nNext step: share your requirements from your Services dashboard so we can get started.\n\n— The FEMZYK Team`,
  }),
  service_status: (d) => ({
    subject: `Project ${d.reference}: ${d.status}`,
    body: `Hi ${d.name || "there"},\n\nYour project ${d.reference} status is now: ${d.status}.\n\nYou can view details and messages in your Services dashboard.\n\n— The FEMZYK Team`,
  }),
  support_received: (d) => ({
    subject: `Support request received (${d.reference})`,
    body: `Hi ${d.name || "there"},\n\nYour support request ${d.reference} has been saved. Keep this reference and use the Help Center at ${d.helpUrl || "/help"} with the same email address to view or reply to your request.\n\nThis message is queued in the FEMZYK outbox; it is not an email receipt unless a delivery provider has been configured and verified.\n\n— The FEMZYK Team`,
  }),
  support_reply: (d) => ({
    subject: `Re: ${d.subject} (${d.reference})`,
    body: `Hi ${d.name || "there"},\n\nThe FEMZYK team replied to your request ${d.reference}:\n\n${d.reply || "Please check the Help Center to view the reply."}\n\nOpen ${d.helpUrl || "/help"} with the same reference and email address to continue the conversation.\n\n— The FEMZYK Team`,
  }),
  password_reset: (d) => ({
    subject: "Reset your FEMZYK MARKET password",
    body: `Hi,\n\nWe received a request to reset your password. Use this code within 1 hour: ${d.code}\n\nIf you didn't request this, you can safely ignore this email.\n\n— The FEMZYK Team`,
  }),
};

export function sendEmail(to: string, template: string, data: TemplateData = {}): void {
  const t = TEMPLATES[template];
  const { subject, body } = t
    ? t(data)
    : { subject: (data.subject as string) || "FEMZYK MARKET", body: (data.body as string) || "" };
  // Outbox queueing is not delivery. No live transport is currently wired in.
  insert(
    "INSERT INTO email_outbox (to_email, template, subject, body_md, status, provider) VALUES (?, ?, ?, ?, 'queued', 'manual-outbox')",
    to,
    template,
    subject,
    body
  );
  if (process.env.NODE_ENV !== "production") {
    console.log(`[email:queued-not-sent:${template}] to=${to} subject="${subject}"`);
  }
}
