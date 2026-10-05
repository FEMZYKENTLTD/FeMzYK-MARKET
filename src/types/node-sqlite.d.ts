/**
 * Minimal ambient types for Node's built-in `node:sqlite` module
 * (available in Node 22+, experimental). Kept deliberately loose so the
 * data layer stays swappable for PostgreSQL later.
 */
declare module "node:sqlite" {
  export interface StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): any;
    all(...params: unknown[]): any[];
  }
  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}
