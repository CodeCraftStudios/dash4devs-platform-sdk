/**
 * `dash4devs build` — build the Next.js app, upload changed static files to the
 * platform CDN, activate.
 *
 * Flow:
 *   1. GET /v1/cdn/status → asset prefix ({cdn}/cdn/platforms/{platform_id}).
 *   2. Bake it into the build (NEXT_PUBLIC_ASSET_PREFIX) and run `next build`.
 *   3. Scan .next/static + public/ → manifest.
 *   4. POST /v1/cdn/manifest → deploy_id + signed URLs for NEW files only.
 *   5. PUT each signed URL in parallel, POST /v1/cdn/activate → atomic flip.
 *
 * The CDN upload is an OPTIMISATION. A missing key (CI has no .env.local) or an
 * upload failure must degrade to a plain `next build`, never break the deploy.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "../config.js";
import { createApi } from "../api.js";
import { scanBuild } from "../scanner.js";
import { uploadAll } from "../uploader.js";
import { step, success, warn, printSummary, formatBytes } from "../ui.js";
import { printArt } from "../banner.js";
import chalk from "chalk";
import ora from "ora";

const PKG_VERSION = "0.1.0-alpha";

export async function run(args) {
  const skipBuild = args.includes("--skip-build");
  const dryRun = args.includes("--dry-run");
  const noActivate = args.includes("--no-activate");

  printArt();

  let cfg;
  try {
    cfg = loadConfig();
  } catch (e) {
    warn(`CDN upload disabled: ${e.message}`);
    warn("Falling back to a plain `next build` — the site ships, assets serve from origin.");
    await runNextBuild(process.cwd());
    success("Built (no CDN upload)");
    return;
  }

  const api = createApi(cfg);
  step("Auth", `key ${chalk.dim("····" + cfg.apiKey.slice(-4))} · ${cfg.apiUrl}`);

  // Resolve the asset prefix BEFORE building so build-time and runtime agree —
  // the prefix has to be inlined into the client bundle, not written afterwards.
  let assetPrefix = null;
  if (!skipBuild) {
    try {
      const status = await api.status();
      assetPrefix = status.asset_prefix || null;
    } catch (e) {
      warn(`Could not resolve the CDN asset prefix: ${e.message}`);
      warn("Building without it — assets will serve from the origin.");
    }
  }

  if (assetPrefix) {
    writeAssetPrefix(cfg.cwd, assetPrefix);
    step("Asset prefix", chalk.dim(assetPrefix));
  }

  if (!skipBuild) {
    step("Building Next.js app");
    await runNextBuild(cfg.cwd, assetPrefix);
    success(`Built ${path.join(cfg.cwd, cfg.buildDir)}`);
  } else {
    warn("Skipping build (--skip-build)");
  }

  // If the build baked in the prefix and the upload then fails, the HTML points
  // at chunks that aren't on the edge — a broken site. In that case rebuild
  // without the prefix and let the origin serve the assets.
  try {
    await uploadToEdge({ cfg, api, dryRun, noActivate });
  } catch (e) {
    warn(`CDN upload failed: ${e.message}`);
    if (assetPrefix && !skipBuild) {
      warn("That build references the edge, so rebuilding without the asset prefix.");
      clearAssetPrefix(cfg.cwd);
      await runNextBuild(cfg.cwd, null);
      success("Rebuilt without CDN — assets serve from the origin.");
    } else {
      warn("The app built fine and will deploy — assets serve from the origin.");
    }
  }
}

async function uploadToEdge({ cfg, api, dryRun, noActivate }) {
  step("Hashing static files");
  const entries = await scanBuild(cfg);
  const totalBytes = entries.reduce((n, e) => n + e.size, 0);
  success(`${entries.length} files · ${formatBytes(totalBytes)}`);

  step("Diffing against CDN");
  const spinner = ora({ text: "uploading manifest…", indent: 4 }).start();
  const manifestRes = await api.manifest({
    sdk_version: PKG_VERSION,
    next_version: readNextVersion(cfg.cwd),
    files: entries.map((e) => ({
      path: e.path,
      sha256: e.sha256,
      size: e.size,
      content_type: e.content_type,
    })),
  });
  spinner.stop();

  const { deploy_id, needs_upload, stats } = manifestRes;
  const unchanged = stats.total_files - stats.new_files;
  success(
    `${stats.new_files} new · ${unchanged} cached · ${formatBytes(stats.new_bytes)} to upload`,
  );

  if (dryRun) {
    warn("Dry run — skipping upload + activation");
    return;
  }

  if (needs_upload.length === 0) {
    success("Nothing to upload — all assets already on CDN");
  } else {
    step(`Uploading to edge (${needs_upload.length} files)`);
    const { failures } = await uploadAll({ api, entries, needsUpload: needs_upload });
    if (failures.length) {
      throw new Error(`${failures.length} uploads failed. First: ${failures[0].error}`);
    }
    success("All files uploaded");
  }

  if (noActivate) {
    warn(`Deploy ${deploy_id} uploaded but not activated (--no-activate)`);
    return;
  }

  step(`Activating ${deploy_id}`);
  const activated = await api.activate(deploy_id);
  success(`Live at ${activated.asset_prefix}`);
  writeAssetPrefix(cfg.cwd, activated.asset_prefix);

  const savedBytes = stats.total_bytes - stats.new_bytes;
  printSummary([
    chalk.bold.green("Deploy successful"),
    "",
    `${chalk.dim("deploy")}  ${activated.deploy_id}`,
    `${chalk.dim("prefix")} ${activated.asset_prefix}`,
    `${chalk.dim("saved")}  ${formatBytes(savedBytes)} via dedup`,
  ]);
}

function runNextBuild(cwd, assetPrefix) {
  return new Promise((resolve, reject) => {
    // shell: true so Node resolves the `.cmd` shims (npx.cmd, next.cmd) on
    // Windows. Harmless on POSIX.
    const env = { ...process.env };
    if (assetPrefix) env.NEXT_PUBLIC_ASSET_PREFIX = assetPrefix;
    else delete env.NEXT_PUBLIC_ASSET_PREFIX;

    const child = spawn("npx next build", { cwd, stdio: "inherit", env, shell: true });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`next build exited with code ${code}`)),
    );
    child.on("error", reject);
  });
}

function readNextVersion(cwd) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    return (
      (pkg.dependencies && pkg.dependencies.next) ||
      (pkg.devDependencies && pkg.devDependencies.next) ||
      ""
    );
  } catch {
    return "";
  }
}

function clearAssetPrefix(cwd) {
  for (const name of [".env.production", ".env.local"]) {
    const p = path.join(cwd, name);
    if (!fs.existsSync(p)) continue;
    const lines = fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .filter((l) => !l.startsWith("NEXT_PUBLIC_ASSET_PREFIX="));
    fs.writeFileSync(p, lines.join("\n"));
  }
}

function writeAssetPrefix(cwd, prefix) {
  // .env.production so `next build` sees it but `next dev` never does — dev
  // chunks are local-only and would 404 on the CDN.
  const envPath = path.join(cwd, ".env.production");
  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => !l.startsWith("NEXT_PUBLIC_ASSET_PREFIX="));
  }
  lines.push(`NEXT_PUBLIC_ASSET_PREFIX=${prefix}`);
  fs.writeFileSync(envPath, lines.join("\n"));

  const localPath = path.join(cwd, ".env.local");
  if (fs.existsSync(localPath)) {
    const localLines = fs.readFileSync(localPath, "utf8").split(/\r?\n/);
    if (localLines.some((l) => l.startsWith("NEXT_PUBLIC_ASSET_PREFIX="))) {
      fs.writeFileSync(
        localPath,
        localLines.filter((l) => !l.startsWith("NEXT_PUBLIC_ASSET_PREFIX=")).join("\n"),
      );
    }
  }
}
