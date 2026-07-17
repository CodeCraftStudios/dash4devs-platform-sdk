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
      "Content-Type": "application/json",
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
}

export default PlatformClient;
