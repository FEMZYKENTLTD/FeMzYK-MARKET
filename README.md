# FEMZYK MARKET

FEMZYK MARKET is an existing Next.js storefront and operations app for physical products, private digital downloads, and web-development services. It includes customer accounts, guest checkout, an admin console, support tickets, service-project workspaces, and payment-provider adapters. This repository is a working platform foundation—not a declaration that the business, catalog, policies, or payment setup is launch-ready.

**Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS 4, and Node.js 22's built-in SQLite API.

## Local development

```bash
cp .env.example .env
npm ci
npm run dev
```

Open <http://localhost:3000>. In development only, the seed creates a local admin account (`admin@femzykmarket.com` / `Femzyk!Admin2026`) and a sample catalog. Never reuse that password or development database in production. On a first production boot, set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` instead; production requires a valid email and a unique password of at least 20 characters. Initial-admin variables only apply while the database has no admin account.

The app initializes its SQLite schema and starter records on first access. `DATABASE_FILE` and `STORAGE_ROOT` must point to persistent, private storage when self-hosting. SQLite and local disk storage are not automatically durable on ephemeral serverless filesystems.

> **Important:** Production starter products are drafts, starter categories are hidden, extra currencies are disabled until configured, and sample shipping methods are inactive. A one-time production safety migration also hides known legacy sample listings/categories/FAQs, excludes their reviews, disables placeholder shipping methods, and removes the known development exchange-rate defaults. It preserves the underlying records. Existing policy pages and administrator-edited data are not overwritten automatically: back up and review them, along with the full public site, before launch. Verify every product, price, image, inventory quantity, service promise, business identity, and policy before publishing. There are no seeded or public fake reviews. Do not add testimonials, ratings, or purchase counts unless they are genuine and eligible for publication.

## Environment

See [`.env.example`](.env.example) for the full template.

| Variable | Purpose |
| --- | --- |
| `DATABASE_FILE` | SQLite database path; back it up and keep it on persistent storage. |
| `STORAGE_ROOT` | Private location for digital deliverables and uploads; persist and back it up. |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS site origin in production; used for payment return URLs and SEO. |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | One-time first-admin bootstrap when no admin exists. Use a unique secret and remove bootstrap values after setup. |
| `PAYMENT_PROVIDER` | `mock` for local development only, or `flutterwave` / `paystack` with server-side credentials. Production fails closed if a live provider is not configured. |
| `FLUTTERWAVE_SECRET_KEY` / `FLUTTERWAVE_WEBHOOK_HASH` | Server-side Flutterwave API and webhook verification secrets. |
| `PAYSTACK_SECRET_KEY` | Server-side Paystack API and webhook verification secret. |
| `SUPPORT_EMAIL` / `BUSINESS_ADDRESS` | Optional contact defaults; confirm and maintain the actual business values in settings. |

Keep payment secrets on the server. Do not expose them through `NEXT_PUBLIC_*` variables or client code. Configure provider webhooks to the app's `/api/payments/webhook` endpoint and test in the provider's sandbox before processing live charges.

## Platform areas

- **Storefront:** database-driven categories and products, search and filters, product/service pages, a guest-capable cart, account pages, order tracking, and reviews limited to approved verified purchases.
- **Checkout and payments:** server-side pricing, stock reservation and rollback, provider-hosted checkout, signed webhook checks, and server-side payment verification. The mock gateway is available only in non-production environments.
- **Physical products:** shipping methods and destination coverage are admin-configurable. Seeded shipping methods are inactive; activate only methods whose rates, zones, and delivery details have been verified. Checkout will not invent a shipping price when no method is configured.
- **Digital products:** digital items stay unavailable until an active delivery file is uploaded. Files are stored privately and served through purchase entitlements with download limits; upload real, licensed deliverables in Admin → Digital Files before publishing.
- **Services/projects:** service packages are catalog-managed; paid projects have client requirements, messages, milestones, and private files. Confirm package scopes, exclusions, revision limits, and timing before offering them.
- **Admin:** manage products, categories, orders, shipping, settings, digital files, support conversations, service projects, content, and audit events.
- **Policies and support:** policy pages are database-backed and editable, but starter copy must be reviewed and replaced with business-approved terms. The email outbox records queued events; it does **not** send email. Newsletter signup is disabled until delivery and unsubscribe handling are integrated.

## Production setup checklist

This codebase is not production-ready until the business completes and verifies these steps:

1. Deploy with Node.js 22, a persistent SQLite database, a persistent private file store, HTTPS, backups, restore testing, and monitoring. For multi-instance or serverless deployment, design and validate a shared durable database and object-storage adapter first.
2. Set the canonical domain and bootstrap the initial admin. Sign in, rotate the password, protect the account, and remove the one-time bootstrap environment values.
3. Choose Flutterwave or Paystack, enter live server-side credentials, set webhook verification secrets, and test successful, failed, delayed, and duplicate payment events in sandbox before switching to live mode.
4. Review the sample catalog. Confirm prices, descriptions, photos and image rights, variants, SKUs, stock levels, suppliers, and publishing status. Hide or archive anything not actually for sale.
5. Upload each licensed digital deliverable and test private downloads, entitlements, expiration, and download limits.
6. Verify service packages, scope, dependencies, exclusions, delivery estimates, and revisions. Confirm support ownership and the guest project-access journey.
7. Configure and activate only verified shipping zones and methods. Confirm taxes with a qualified adviser and set destination rates in Admin → Settings; rates default to zero and are not a tax calculation service.
8. Replace/approve the business identity, contact details, shipping, return, privacy, cookie, terms, digital-product, and service policies. Connect a real transactional email provider and implement consent/unsubscribe handling before promising email delivery or marketing subscriptions.
9. Exercise physical, digital, and service purchase journeys from mobile and desktop, including guest checkout, provider redirects, payment callbacks, support lookup, order tracking, downloads, and project-file access. Establish monitoring and an incident-response contact.

## Data and security notes

- Money is stored as integer minor units; totals, shipping, and configured tax are recalculated server-side.
- Authentication uses password hashes and HTTP-only session cookies. Admin APIs enforce roles on the server.
- Digital and project files are intended to stay outside the public web root and require entitlement or project access checks.
- The SQLite layer uses SQLite-specific SQL; moving to Postgres would require a deliberate data-layer migration, not just changing one setting.
- Sample supplier records are illustrative. Supplier information and fulfillment integrations need verification before use.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the local development server. |
| `npm run build` | Create an optimized production build. |
| `npm start` | Serve the production build. |
| `npm run typecheck` | Run TypeScript checking. |
| `npm run seed` | **Destructive:** deletes the configured SQLite database and its WAL/SHM sidecars; the app creates a fresh database on next start. Never run against a database you need to preserve. |
