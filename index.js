/**
 * dash4devs-platform — private SDK for Dash4Devs white-label platforms.
 *
 * Solution by CodeCraft Studios (https://www.codecraftstudios.net)
 *
 * This is NOT the public dash4devs SDK. It talks to the platform API
 * (/api/platform/*) with a dfd-platform-*-key-*, and it is distributed from a
 * private repo — never npm.
 *
 *   import { PlatformClient } from "dash4devs-platform";
 *
 *   const dash = new PlatformClient({ key: process.env.DASH_PLATFORM_KEY });
 *   const { records } = await dash.records.list("repair_ticket", { status: "open" });
 */

import { AuthModule } from "./services/auth.js";
import { RecordsModule } from "./services/records.js";
import { CustomersModule } from "./services/customers.js";
import { PortalModule } from "./services/portal.js";
import { StaffModule } from "./services/staff.js";
import { EmailModule } from "./services/email.js";
import { FilesModule } from "./services/files.js";

const KEY_PATTERN = /^dfd-platform-(public|secret)-key-(live|test)-[A-Za-z0-9_-]{20,}$/;

export class PlatformClient {
  /**
   * @param {Object} options
   * @param {string} options.key      dfd-platform-*-key-* (secret = server-side only)
   * @param {string} [options.baseURL] Override the API host (local dev)
   * @param {string} [options.token]   An existing portal JWT, if you have one
   */
  constructor({ key, baseURL = "https://api.dashfordevs.com", token = null }) {
    if (!key) {
      throw new Error("A platform key is required");
    }

    const match = KEY_PATTERN.exec(key);
    if (!match) {
      throw new Error(
        "Invalid platform key.\n\n" +
          "Expected: dfd-platform-<public|secret>-key-<live|test>-<random>\n" +
          "Note this is NOT a storefront key — pk_*/sk_* belong to the public dash4devs SDK."
      );
    }

    const [, kind, environment] = match;

    // A secret key in a browser bundle is a total compromise: it bypasses the
    // origin allowlist and can write. Fail loudly at construction rather than
    // leak quietly at runtime.
    if (kind === "secret" && typeof window !== "undefined") {
      throw new Error(
        "\n\n🚨 DASH4DEVS PLATFORM SECURITY ERROR 🚨\n\n" +
          "A SECRET platform key is being used in the browser.\n" +
          "Secret keys bypass origin checks and can write — anyone viewing your site would own this platform.\n\n" +
          "Use it only in server code (route handlers, server components, API routes).\n" +
          "For the browser, issue a PUBLIC key and give it an allowed origin.\n\n" +
          "If this key has been exposed, revoke it now:\n" +
          "Super Dashboard → Whitelabel → your platform → Security\n"
      );
    }

    // A secret key handed to NEXT_PUBLIC_* is the same leak, one build step later.
    if (typeof process !== "undefined" && process.env) {
      for (const [name, value] of Object.entries(process.env)) {
        if (
          name.startsWith("NEXT_PUBLIC_") &&
          typeof value === "string" &&
          value.startsWith("dfd-platform-secret-key-")
        ) {
          throw new Error(
            "\n\n🚨 DASH4DEVS PLATFORM SECURITY ERROR 🚨\n\n" +
              `A secret platform key is in ${name}.\n` +
              "NEXT_PUBLIC_ variables are inlined into the browser bundle.\n" +
              "Move it to a non-public variable and use it server-side only.\n"
          );
        }
      }
    }

    this.key = key;
    this.kind = kind;
    this.environment = environment;
    this.baseURL = baseURL.replace(/\/$/, "");
    this._token = token;

    this.auth = new AuthModule(this);
    this.records = new RecordsModule(this);
    this.customers = new CustomersModule(this);
    this.staff = new StaffModule(this);
    this.portal = new PortalModule(this);
    this.email = new EmailModule(this);
    this.files = new FilesModule(this);
  }

  /** Resolve a token to its subject. See services/auth.js. */
  me(token) {
    return this.auth.me(token);
  }

  /** One form, two audiences — staff first, then customer. */
  login(email, password) {
    return this.auth.login(email, password);
  }

  /** The signed-in portal customer's token, set by portal.login(). */
  setToken(token) {
    this._token = token;
  }

  get isServerSide() {
    return typeof window === "undefined";
  }

  async _fetch(path, options = {}) {
    const headers = {
      "X-Platform-Key": this.key,
      // A FormData body must NOT get an explicit Content-Type — fetch sets the
      // multipart boundary itself, and overriding it breaks the upload.
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    };

    if (this._token && !headers.Authorization) {
      headers.Authorization = `Bearer ${this._token}`;
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON body (a proxy error page, usually) — fall through to the throw.
    }

    if (!response.ok) {
      const error = new Error(
        payload?.message || `Platform API error (${response.status})`
      );
      error.status = response.status;
      error.code = payload?.error;
      error.payload = payload;

      // The 403s from the auth ladder are the ones people actually hit, so make
      // them say what to do instead of just "forbidden".
      if (payload?.error === "module_not_enabled") {
        error.message +=
          "\n→ Enable it in Super Dashboard → Whitelabel → your platform → Modules.";
      } else if (payload?.error === "origin_not_allowed") {
        error.message +=
          "\n→ Add this origin under Security, or switch the platform to test mode while developing.";
      } else if (payload?.error === "secret_key_required") {
        error.message +=
          "\n→ Public keys are read-only. Do this call from your server with a secret key.";
      }
      throw error;
    }

    return payload;
  }

  /** What this key can reach. Handy for a front end that self-configures. */
  async whoami() {
    return this._fetch("/api/platform/whoami");
  }

  /**
   * Poll /api/platform/ping and decide whether the site should render normally.
   *
   * Never throws — a maintenance gate must not itself crash the page it guards.
   * The contract is the single boolean `ok`:
   *
   *   ok: true   → serve the site normally
   *   ok: false  → show the maintenance page (operator flipped it, OR backend
   *                unreachable / 5xx / timed out)
   *
   * A 4xx (bad/expired key, wrong origin) is a *config* problem, not an outage,
   * so it does NOT gate the site — masking it behind "be right back" would hide
   * a bug the developer needs to see.
   *
   * @param {Object}  [opts]
   * @param {number}  [opts.timeoutMs=2500] Abort the probe after this long.
   * @returns {Promise<{ok:boolean, reachable:boolean, maintenance:boolean,
   *   reason:string|null, message:string|null, until:string|null}>}
   */
  async checkHealth({ timeoutMs = 2500 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseURL}/api/platform/ping`, {
        method: "GET",
        headers: { "X-Platform-Key": this.key },
        cache: "no-store",
        signal: controller.signal,
      });

      // 5xx / gateway (502/503/504) → backend is unhealthy → gate the site.
      if (res.status >= 500) {
        return {
          ok: false,
          reachable: true,
          maintenance: true,
          reason: `http_${res.status}`,
          message: null,
          until: null,
        };
      }

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        // reachable but no JSON — treat as a config/proxy oddity, not an outage.
      }

      if (!res.ok || !payload) {
        return {
          ok: true,
          reachable: true,
          maintenance: false,
          reason: `http_${res.status}`,
          message: null,
          until: null,
        };
      }

      const m = payload.maintenance || {};
      // The API already coerces, but tolerate the "True" string quirk here too.
      const inMaintenance = m.enabled === true || m.enabled === "true";
      return {
        ok: !inMaintenance,
        reachable: true,
        maintenance: inMaintenance,
        reason: inMaintenance ? "operator" : null,
        message: m.message || null,
        until: m.until || null,
      };
    } catch (err) {
      // Network failure or the abort timeout → backend is unreachable → gate.
      return {
        ok: false,
        reachable: false,
        maintenance: true,
        reason: err && err.name === "AbortError" ? "timeout" : "unreachable",
        message: null,
        until: null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export default PlatformClient;
