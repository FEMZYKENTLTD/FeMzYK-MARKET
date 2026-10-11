import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Data access layer.
 * Uses Node's built-in SQLite driver in dev/self-hosted mode. The rest of the
 * app only talks to the repository functions in src/lib/repo*, so swapping in
 * PostgreSQL (or any relational DB) later is a contained change.
 */

let _db: DatabaseSync | null = null;

const PRODUCTION_SAMPLE_DATA_MIGRATION = "2026-10-production-sample-data-safety";
const SAMPLE_PRODUCT_SLUGS = [
  "femzyk-lumora-candle-warmer",
  "femzyk-nova-dog-grooming-kit",
  "femzyk-rover-travel-organizer",
  "femzyk-neatspace-organization-set",
  "femzyk-slow-morning-ceramic-set",
  "femzyk-creator-desk-kit",
  "femzyk-pressmate-manual-juicer",
  "femzyk-createbox-diy-craft-kit",
  "femzyk-modern-cat-home",
  "femzyk-business-creator-template-bundle",
  "complete-beginners-guide-to-building-websites",
  "python-programming-for-complete-beginners",
  "business-website-development",
  "landing-page-development",
  "website-maintenance-care",
];
const SAMPLE_CATEGORY_SLUGS = [
  "home", "home-fragrance", "organization", "decor", "cleaning", "everyday-home",
  "pets", "dogs", "cats", "grooming", "pet-travel", "feeding", "pet-accessories",
  "kitchen", "kitchen-tools", "drinkware", "food-preparation", "storage",
  "desk-work", "desk-organization", "workspace", "productivity", "desk-accessories",
  "lifestyle", "everyday-essentials", "personal-lifestyle", "travel",
  "gifts", "gifts-for-her", "gifts-for-him", "home-gifts", "pet-gifts", "digital-gifts",
  "digital", "guides", "templates", "business-resources", "programming", "web-development",
  "design-resources", "educational-resources", "web-dev-services", "websites", "landing-pages",
  "business-websites", "web-applications", "backend-development", "api-integration", "maintenance",
  "custom-development",
];

function migrateProductionSampleData(db: DatabaseSync): void {
  if (process.env.NODE_ENV !== "production") return;

  db.exec("CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
  if (db.prepare("SELECT id FROM app_migrations WHERE id = ?").get(PRODUCTION_SAMPLE_DATA_MIGRATION)) return;

  const placeholders = (values: string[]) => values.map(() => "?").join(",");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `UPDATE products SET status = 'draft', is_featured = 0, is_bestseller = 0, is_new = 0,
         compare_at_cents = NULL, sales_count = 0
       WHERE slug IN (${placeholders(SAMPLE_PRODUCT_SLUGS)})`
    ).run(...SAMPLE_PRODUCT_SLUGS);
    db.prepare(
      `UPDATE reviews SET is_seed = 1
       WHERE product_id IN (SELECT id FROM products WHERE slug IN (${placeholders(SAMPLE_PRODUCT_SLUGS)}))`
    ).run(...SAMPLE_PRODUCT_SLUGS);
    db.prepare(
      `UPDATE categories SET is_active = 0,
         image = CASE WHEN image LIKE '/images/%' THEN NULL ELSE image END
       WHERE slug IN (${placeholders(SAMPLE_CATEGORY_SLUGS)})`
    ).run(...SAMPLE_CATEGORY_SLUGS);
    db.prepare("UPDATE shipping_methods SET is_active = 0 WHERE LOWER(name) LIKE '%verify before enabling%'").run();

    const rateRow = db.prepare("SELECT value_json FROM site_settings WHERE key = 'currency_rates'").get() as { value_json?: string } | undefined;
    if (rateRow?.value_json) {
      try {
        const rates = JSON.parse(rateRow.value_json);
        if (rates?.USD === 1 && rates?.CAD === 1.36 && rates?.GBP === 0.79 && rates?.NGN === 1550 && Object.keys(rates).length === 4) {
          db.prepare("UPDATE site_settings SET value_json = ? WHERE key = 'currency_rates'").run(JSON.stringify({ USD: 1 }));
        }
      } catch { /* leave a malformed setting for the admin to review */ }
    }

    const heroRow = db.prepare("SELECT value_json FROM site_settings WHERE key = 'home_hero'").get() as { value_json?: string } | undefined;
    if (heroRow?.value_json) {
      try {
        const hero = JSON.parse(heroRow.value_json);
        if (hero?.title === "Smart products. Digital solutions. Better everyday living." &&
            hero?.subtitle === "Discover thoughtfully selected products, useful digital resources and practical web solutions designed to make work and everyday life better.") {
          db.prepare("UPDATE site_settings SET value_json = ? WHERE key = 'home_hero'").run(JSON.stringify({
            title: "FEMZYK MARKET",
            subtitle: "Store and business information is being prepared. Please check back soon.",
          }));
        }
      } catch { /* leave a malformed setting for the admin to review */ }
    }

    const siteRow = db.prepare("SELECT value_json FROM site_settings WHERE key = 'site'").get() as { value_json?: string } | undefined;
    if (siteRow?.value_json) {
      try {
        const site = JSON.parse(siteRow.value_json);
        if (site?.businessName === "FEMZYK ENTERPRISES") {
          site.businessName = "FEMZYK MARKET";
          db.prepare("UPDATE site_settings SET value_json = ? WHERE key = 'site'").run(JSON.stringify(site));
        }
      } catch { /* leave a malformed setting for the admin to review */ }
    }

    // Older starter FAQ rows may include unverified payment, delivery, refund, or service claims.
    db.prepare(`UPDATE faq_items SET is_active = 0 WHERE question IN (
      'Which payment methods do you accept?', 'Is checkout secure?', 'Can I check out without an account?',
      'Where do you ship?', 'How fast is delivery?', 'Can I track my order?', 'What is your return policy?',
      'How do I receive digital products?', 'What if a digital product is updated?',
      'How do web development services work?', 'What if I need something custom?'
    )`).run();

    db.prepare("INSERT INTO app_migrations (id) VALUES (?)").run(PRODUCTION_SAMPLE_DATA_MIGRATION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function schemaSql(): string {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8");
}

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const file = process.env.DATABASE_FILE || "data/femzyk.db";
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const db = new DatabaseSync(abs);
  db.exec(schemaSql());
  // Idempotent lightweight migrations
  try {
    db.exec("ALTER TABLE cart_items ADD COLUMN meta_json TEXT DEFAULT '{}'");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE support_tickets ADD COLUMN assigned_to TEXT");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN cart_id INTEGER REFERENCES carts(id) ON DELETE SET NULL");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN cart_restored INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE orders ADD COLUMN confirmation_token TEXT");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product ON reviews(user_id, product_id) WHERE user_id IS NOT NULL");
  } catch {
    /* legacy duplicates may need manual cleanup before adding this constraint */
  }
  migrateProductionSampleData(db);
  _db = db;
  // Lazy-seed on first boot so the store never runs empty. Admin provisioning
  // also runs for an existing database that has no admin account.
  try {
    const seed = require("./seed");
    const row = db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number };
    if (row.c === 0) seed.runSeed(db);
    seed.ensureInitialAdmin(db);
  } catch (e) {
    console.error("[db] initialization error:", e);
  }
  return db;
}

/** Run a function inside a transaction. */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/** node:sqlite returns null-prototype objects; normalize to plain objects so
 *  rows can be serialized across the server/client boundary. */
function plain<T>(row: any): T {
  if (row == null) return row;
  const out: any = {};
  for (const k of Object.keys(row)) out[k] = row[k];
  return out;
}

export function q<T = any>(sql: string, ...params: any[]): T[] {
  return (getDb().prepare(sql).all(...params) as any[]).map(plain) as T[];
}

export function q1<T = any>(sql: string, ...params: any[]): T | undefined {
  const row = getDb().prepare(sql).get(...params);
  return row === undefined ? undefined : plain<T>(row);
}

export function run(sql: string, ...params: any[]) {
  return getDb().prepare(sql).run(...params);
}

export function insert(sql: string, ...params: any[]): number {
  const r = getDb().prepare(sql).run(...params);
  return Number(r.lastInsertRowid);
}

/** Generate a public id, e.g. order numbers. */
export function refNumber(prefix: string): string {
  const c = require("node:crypto") as typeof import("node:crypto");
  return `${prefix}-${c.randomBytes(12).toString("hex").toUpperCase()}`;
}

export function randomToken(bytes = 24): string {
  const c = require("node:crypto") as typeof import("node:crypto");
  return c.randomBytes(bytes).toString("base64url");
}
