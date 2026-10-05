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
  _db = db;
  // Lazy-seed on first boot so the store never runs empty.
  try {
    const row = db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number };
    if (row.c === 0) {
      // Seed module registers itself synchronously.
      require("./seed").runSeed(db);
    }
  } catch (e) {
    console.error("[db] seed error:", e);
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
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${t}${r}`;
}

export function randomToken(bytes = 24): string {
  const c = require("node:crypto") as typeof import("node:crypto");
  return c.randomBytes(bytes).toString("base64url");
}
