import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type RemoteD1Result = {
  results?: Record<string, unknown>[];
  meta?: Record<string, unknown>;
  success?: boolean;
  errors?: Array<{ message?: string }>;
};

type RemoteD1Response = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: RemoteD1Result[];
};

function remoteD1() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID ?? process.env.D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? process.env.D1_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) return null;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const execute = async (sql: string, params: unknown[]) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({ sql, params }),
    });
    const payload = await response.json().catch(() => ({})) as RemoteD1Response;
    const result = payload.result?.[0];
    if (!response.ok || payload.success === false || result?.success === false) {
      const detail = payload.errors?.[0]?.message ?? result?.errors?.[0]?.message ?? `HTTP ${response.status}`;
      throw new Error(`Remote D1 query failed: ${detail}`);
    }
    return result ?? { results: [], meta: {} };
  };

  const database = {
    prepare(sql: string) {
      let params: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) { params = values; return statement; },
        async all() {
          const result = await execute(sql, params);
          return { results: result.results ?? [], success: true, meta: result.meta ?? {} };
        },
        async first(column?: string) {
          const row = (await execute(sql, params)).results?.[0];
          return column ? row?.[column] : row ?? null;
        },
        async run() {
          const result = await execute(sql, params);
          return { success: true, meta: result.meta ?? {} };
        },
        async raw() {
          const result = await execute(sql, params);
          const rows = result.results ?? [];
          if (!rows.length) return [];
          // Drizzle's D1 mapper expects raw() rows as value arrays. The
          // Cloudflare REST API returns keyed objects, so preserve the SQL
          // column order while converting each result row.
          const columns = Object.keys(rows[0]);
          return rows.map((row) => columns.map((column) => row[column]));
        },
      };
      return statement;
    },
  };

  return database as unknown as D1Database;
}

export function getDb() {
  try {
    if (env.DB) return drizzle(env.DB, { schema });
  } catch {
    // Vercel does not expose Cloudflare's worker bindings. The remote D1
    // adapter below is used when the documented server-only variables exist.
  }
  const database = remoteD1();
  if (database) return drizzle(database, { schema });
  throw new Error(
    "Cloudflare D1 binding `DB` is unavailable. Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN on Vercel, or deploy through the configured Sites D1 runtime."
  );
}
