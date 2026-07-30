import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import { DATABASE_NAME } from "../constants/app";
import * as schema from "./schema";

export const sqliteDatabase = openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});
sqliteDatabase.execSync(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export const database = drizzle(sqliteDatabase, {
  schema,
});
