/**
 * CLI config loader.
 *
 * Precedence (highest wins): process.env, then .env.local, then .env in cwd.
 * Zero runtime deps for this file — the SDK stays light.
 *
 * The platform CLI authenticates with the platform SECRET key
 * (dfd-platform-secret-key-…), the same one the app uses server-side as
 * DASH_PLATFORM_KEY. Public keys can't build/deploy.
 */

import fs from "node:fs";
import path from "node:path";

const DEFAULT_API = "https://api.dashfordevs.com";

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadConfig() {
  const cwd = process.cwd();
  const fromEnv = parseEnvFile(path.join(cwd, ".env"));
  const fromLocal = parseEnvFile(path.join(cwd, ".env.local"));
  const merged = { ...fromEnv, ...fromLocal, ...process.env };

  const apiKey = merged.DASH_PLATFORM_KEY || merged.PLATFORM_KEY;
  if (!apiKey) {
    throw new Error(
      "No platform key. Add DASH_PLATFORM_KEY=dfd-platform-secret-key-… to .env.local " +
        "(from Super Dashboard → your platform → Security).",
    );
  }
  if (!/^(?:dfd-)?platform-secret-key-/.test(apiKey)) {
    throw new Error(
      "DASH_PLATFORM_KEY must be a SECRET key (…-secret-key-…). Public keys can't build/deploy.",
    );
  }

  return {
    apiKey,
    apiUrl: (
      merged.DASH_PLATFORM_API_URL ||
      merged.PLATFORM_API_URL ||
      DEFAULT_API
    ).replace(/\/$/, ""),
    cwd,
    buildDir: merged.DASH_BUILD_DIR || ".next",
    publicDir: merged.DASH_PUBLIC_DIR || "public",
  };
}
