/**
 * Server-only entry point.
 *
 *   import { createPlatformClient } from "dash4devs-platform/server";
 *   const dash = createPlatformClient();   // reads DASH_PLATFORM_KEY
 *
 * Importing this from a client component throws at module load, so a secret key
 * can't be dragged into a browser bundle by an accidental import.
 */

import { PlatformClient } from "./index.js";

if (typeof window !== "undefined") {
  throw new Error(
    "\n\n🚨 dash4devs-platform/server was imported in the browser.\n\n" +
      "This module carries your SECRET platform key. Import it only from server code —\n" +
      "route handlers, server components, or getServerSideProps.\n" +
      "For the browser, construct PlatformClient with a PUBLIC key instead.\n"
  );
}

/**
 * @param {Object} [options]
 * @param {string} [options.key]     Defaults to process.env.DASH_PLATFORM_KEY
 * @param {string} [options.baseURL] Defaults to process.env.DASH_PLATFORM_API_URL
 */
export function createPlatformClient({ key, baseURL } = {}) {
  const resolvedKey = key || process.env.DASH_PLATFORM_KEY;
  if (!resolvedKey) {
    throw new Error(
      "No platform key. Set DASH_PLATFORM_KEY (NOT NEXT_PUBLIC_*) or pass { key }."
    );
  }
  return new PlatformClient({
    key: resolvedKey,
    baseURL:
      baseURL || process.env.DASH_PLATFORM_API_URL || "https://api.dashfordevs.com",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Maintenance gate
//
// getMaintenanceStatus() is meant to sit in your root layout (or middleware) and
// decide, per request, whether to render the site or <MaintenancePage/>. It caches
// the probe in-process with a deliberately ASYMMETRIC TTL:
//
//   • "up"   is cached longer  (default 15s) — the happy path shouldn't ping the
//     backend on every single request.
//   • "down" is cached briefly (default 3s)  — THIS is the invalidation that
//     matters: the moment the backend recovers (or the operator flips maintenance
//     off), the stale "down" must expire fast so the site comes back on its own.
//     A long TTL here would leave every visitor stuck on "be right back" for
//     minutes after you're already healthy.
//
// The probe itself is fetched with cache:"no-store", so neither Next's data cache
// nor a CDN can pin a stale pong underneath this layer. Call clearMaintenanceCache()
// (or pass { force:true }) to invalidate immediately — e.g. right after you toggle
// maintenance, so you don't wait out even the short TTL.
// ─────────────────────────────────────────────────────────────────────────────

let _healthCache = null; // { at:number, value:object }

/**
 * @param {Object}  [options]
 * @param {number}  [options.upTtlMs=15000]   Cache a healthy result this long.
 * @param {number}  [options.downTtlMs=3000]  Cache a down/maintenance result this
 *                                            long — keep it short so recovery isn't sticky.
 * @param {number}  [options.timeoutMs=2500]  Probe timeout.
 * @param {boolean} [options.force=false]     Ignore the cache for this call.
 * @param {string}  [options.key]             Overrides DASH_PLATFORM_KEY.
 * @param {string}  [options.baseURL]         Overrides DASH_PLATFORM_API_URL.
 */
export async function getMaintenanceStatus(options = {}) {
  const {
    upTtlMs = 15_000,
    downTtlMs = 3_000,
    timeoutMs = 2_500,
    force = false,
    ...clientOptions
  } = options;

  const now = Date.now();
  if (!force && _healthCache) {
    const ttl = _healthCache.value.ok ? upTtlMs : downTtlMs;
    if (now - _healthCache.at < ttl) return _healthCache.value;
  }

  let value;
  try {
    const client = createPlatformClient(clientOptions);
    value = await client.checkHealth({ timeoutMs });
  } catch (err) {
    // No key configured, etc. Fail OPEN: a setup gap must not black out every
    // page. The site's real SDK calls will surface the underlying error.
    value = {
      ok: true,
      reachable: false,
      maintenance: false,
      reason: "no_client",
      message: null,
      until: null,
    };
  }

  _healthCache = { at: now, value };
  return value;
}

/** Drop the cached probe so the next getMaintenanceStatus() re-checks live. */
export function clearMaintenanceCache() {
  _healthCache = null;
}

export { PlatformClient };
