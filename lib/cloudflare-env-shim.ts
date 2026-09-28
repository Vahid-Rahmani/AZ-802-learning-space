import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/**
 * Vercel does not provide Cloudflare's `cloudflare:workers` virtual module.
 * The application still guards these bindings at runtime, so this empty
 * adapter keeps the API bundle portable while Cloudflare deployments keep
 * using the real virtual module.
 */
export const env = {} as {
  DB?: D1Database;
  EVIDENCE?: R2Bucket;
};
