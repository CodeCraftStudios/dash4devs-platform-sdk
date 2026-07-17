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

export { PlatformClient };
