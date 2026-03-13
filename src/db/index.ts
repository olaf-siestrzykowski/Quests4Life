import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expo = SQLite.openDatabaseSync('habitual.db', { enableChangeListener: true });

export const db = drizzle(expo, { schema });

export type DB = typeof db;

// Resolved immediately on native; web overrides this in index.web.ts
export const dbReadyPromise: Promise<void> = Promise.resolve();
