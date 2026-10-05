# FEMZYK MARKET

**Smart products. Digital solutions. Better everyday living.**

A complete, production-oriented ecommerce platform by **FEMZYK ENTERPRISES** selling physical products,
digital downloads and web development services from a single storefront — built to scale to 10,000+ products
and to grow into marketplace, subscription and course offerings later without an architectural rewrite.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind**, a swappable SQLite data layer, and a
provider-agnostic payment core (Flutterwave / Paystack / mock).

---

## Quick start

```bash
cp .env.example .env        # review values; defaults are safe for local dev
npm install
npm run seed                # (optional) rebuild + seed data/femzyk.db deterministically
npm run dev                 # or: npm run build && npm start
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin — demo login `admin@femzykmarket.com` / `Femzyk!Admin2026`
  (change immediately in production; create additional admins with the `ADMIN` role)

The database (`data/femzyk.db`) and file storage (`data/files`, `data/uploads`) are created automatically on
first run; the schema is applied and a starter catalog is seeded idempotently. Keep `data/` out of Git.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_FILE` | Path to the SQLite file (default `data/femzyk.db`) |
| `PAYMENT_PROVIDER` | `mock` (default) \| `flutterwave` \| `paystack` |
| `FLUTTERWAVE_PUBLIC_KEY` / `FLUTTERWAVE_SECRET_KEY` | Flutterwave keys (server-side only) |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | Paystack keys (server-side only) |
| `EMAIL_API_KEY` | Transactional email provider key; without it mail is queued/logged |
| `STORAGE_ROOT` | Private directory for sold digital files (never served statically) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for SEO, sitemap & absolute URLs |

Secret keys are **never** exposed to the browser; the frontend only ever sees public keys and server-rendered state.

## What's inside

### Storefront
- Home, `/shop` with category/subcategory browsing, `/search` with suggestions, collections (bestsellers,
  new arrivals, under-$35, curated), `/digital`, `/services`, product pages with variants, specs, FAQs,
  verified-purchase reviews and honest availability.
- Cart with guest checkout, transparent totals (no hidden fees), coupons, multi-currency display
  (USD / CAD / GBP / NGN, admin-editable rates).
- Checkout → provider-hosted payment → **server-side verification** + idempotent callbacks (duplicate
  webhooks return `duplicate:true`, never double-fulfill).
- Post-purchase: order confirmation with **digital entitlements** (signed, download-limited, expirable
  links), order tracking, account area (orders, downloads, wishlist, profile, marketing opt-out),
  service project dashboards (requirements form, milestones, client/team messages).
- Real, admin-editable policy pages (about, shipping, returns, privacy, terms, cookies, digital policy,
  service terms) served from the database via `/legal/[slug]` rewrites.

### Catalog engine
- Product types: `PHYSICAL_PRODUCT`, `DIGITAL_PRODUCT`, `SERVICE`, `SERVICE_PACKAGE`,
  `DOWNLOADABLE_RESOURCE`, plus a reserved `FUTURE_SUBSCRIPTION`-ready type row.
- Variants, tags, specs, FAQs, galleries, compare-at pricing, SEO fields, scheduled publishing,
  suppliers (fulfillment is modular), low-stock thresholds, CSV export, bulk operations.
- Categories/collections are data-driven; adding a new department in the admin is reflected in the header
  navigation automatically — no code changes.

### Payments & orders
- `PaymentProvider` interface in `src/lib/payments/` — the checkout pipeline never references a provider
  directly. Verification re-checks amount + currency server-side; mismatches are recorded as payment events.
- Order state machine (`src/lib/statemachine.ts`) with separate physical / digital / service flows and
  strictly validated transitions; invalid transitions are rejected everywhere (API + admin UI).
- Shipping zones & methods with free-shipping thresholds, all admin-editable.

### Admin (`/admin`)
Dashboard (revenue, sparklines, low stock, top sellers), product editor (sections for pricing, inventory,
variants, media, digital delivery, service settings, SEO, scheduling), orders & fulfillment, review
moderation (pending / approved / rejected, verified badges), customers, collections, categories, digital
file delivery with version bumps + owner notifications, service projects (status, milestones, messaging),
suppliers, shipping, payments, coupons, support tickets, email outbox, first-party analytics, content &
policy editor, settings, and an immutable audit log of sensitive changes.

### Trust rules (baked in)
- No fake reviews — a few clearly-seeded starter reviews only, marked as such.
- No fake scarcity, countdowns or invented social proof; promotional messages are admin-set and real.
- No hidden fees; taxes/shipping/total are visible before payment.
- Honest copy tone; verified-purchase badges; genuine policy pages.

## Architecture notes

- **Data layer is isolated** (`src/lib/db.ts`, `src/lib/schema.sql`, repositories). It uses Node 22's
  built-in `node:sqlite` today with zero native dependencies; swapping to PostgreSQL later only touches this
  layer.
- Money is stored as integer cents; display conversion lives in `src/lib/money*` (pure + server).
- Auth: scrypt password hashes, session tokens in httpOnly cookies; admin routes enforce role checks
  server-side on every request.
- Analytics are first-party and privacy-respecting (`/api/events`); audit logs capture actor + before/after
  for price, stock, status, refunds, moderation and configuration changes.
- SEO: schema.org Product/Organization JSON-LD, `sitemap.ts`, `robots.ts`, semantic HTML, a11y labels,
  skip-link, keyboard-reachable flows.

## Scaling path (deliberately not built yet)

Marketplace vendors, subscriptions and courses each map onto the existing primitives (product types,
entitlements, project/requirements flows) — they are flagged in the schema and type system rather than
implemented now, per scope. The LMS, multi-language UI and vendor onboarding remain future phases.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Reset + seed the database |
| `npm run typecheck` | `tsc --noEmit` |
