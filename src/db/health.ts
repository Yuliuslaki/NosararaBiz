import { sqliteDatabase } from "./client";

type DatabaseTableRow = {
  name: string;
};

export const REQUIRED_DATABASE_TABLES = [
  "app_config",
  "users",
  "products",
  "transactions",
  "transaction_items",
  "stock_history",
  "cash_books",
] as const;

export type RequiredDatabaseTable = (typeof REQUIRED_DATABASE_TABLES)[number];

export type DatabaseHealthResult = {
  isHealthy: boolean;
  existingTables: string[];
  missingTables: RequiredDatabaseTable[];
};

export function getDatabaseTableNames(): string[] {
  const rows = sqliteDatabase.getAllSync<DatabaseTableRow>(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '__drizzle_%'
    ORDER BY name;
  `);

  return rows.map((row) => row.name);
}

export function checkDatabaseHealth(): DatabaseHealthResult {
  const existingTables = getDatabaseTableNames();

  const missingTables = REQUIRED_DATABASE_TABLES.filter(
    (requiredTable) => !existingTables.includes(requiredTable),
  );

  return {
    isHealthy: missingTables.length === 0,
    existingTables,
    missingTables,
  };
}
