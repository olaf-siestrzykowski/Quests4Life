import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

/**
 * On web, expo-sqlite uses a WASM worker. openDatabaseSync times out if
 * called before the worker has finished initialising.
 * Fix: open async first (which waits for the worker to be ready),
 * then open sync (which drizzle's expo adapter requires).
 */
export const dbReadyPromise: Promise<void> = SQLite.openDatabaseAsync('habitual.db')
  .then(() => {
    const expo = SQLite.openDatabaseSync('habitual.db');
    _db = drizzle(expo, { schema });
  });

export const db = new Proxy({} as DB, {
  get(_, prop) {
    if (!_db) throw new Error('DB not ready — await dbReadyPromise first');
    return (_db as any)[prop];
  },
});
