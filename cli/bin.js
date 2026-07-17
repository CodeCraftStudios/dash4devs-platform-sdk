#!/usr/bin/env node
/**
 * dash4devs platform CLI.
 *
 *   dash4devs build     Build the Next.js app + upload static assets to the CDN
 *   dash4devs deploy    Alias for build (activates by default)
 *   dash4devs status    Show the active deployment for this platform
 *
 * Auth: reads DASH_PLATFORM_KEY from env (falls back to .env.local / .env).
 * Must be a platform SECRET key (dfd-platform-secret-key-…).
 */

// Node process warnings print mid-line and garble the progress bars.
process.removeAllListeners("warning");
process.on("warning", () => {});

import { run as runBuild } from "./commands/build.js";
import { run as runStatus } from "./commands/status.js";
import { printError } from "./ui.js";

const COMMANDS = {
  build: runBuild,
  deploy: runBuild, // alias — activates by default
  status: runStatus,
};

async function main() {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(`
Usage: dash4devs <command> [options]

Commands:
  build                 Build Next.js and upload static assets to the CDN
  deploy                Build + activate in one step
  status                Show the active deployment for this platform

Build options:
  --skip-build          Upload the existing .next without rebuilding
  --dry-run             Diff against the CDN but don't upload or activate
  --no-activate         Upload but don't flip the active deploy

Environment:
  DASH_PLATFORM_KEY     Secret key (dfd-platform-secret-key-…) for your platform
  DASH_PLATFORM_API_URL Override API URL (default: https://api.dashfordevs.com)
`);
    process.exit(0);
  }

  const handler = COMMANDS[cmd];
  if (!handler) {
    printError(`Unknown command: ${cmd}`);
    process.exit(1);
  }

  try {
    await handler(rest);
  } catch (err) {
    printError(err.message || String(err));
    if (process.env.DASH_DEBUG) console.error(err);
    process.exit(1);
  }
}

main();
