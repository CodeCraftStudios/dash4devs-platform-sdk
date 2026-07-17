/**
 * Thin fetch wrapper for the platform CDN API (api.dashfordevs.com).
 *
 * Authenticated with X-Platform-Key — the SAME header the SDK uses for
 * everything else, so the CDN endpoints scope the deploy to this platform and
 * hand back a `{cdn}/cdn/platforms/{platform_id}` asset prefix.
 *
 * Errors surface as Error("<status>: <message>") for the calling command.
 */

export function createApi({ apiUrl, apiKey }) {
  async function request(method, path, body) {
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "X-Platform-Key": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "dash4devs-platform-cli",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let json = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON ok */
    }

    if (!res.ok) {
      const msg = (json && (json.message || json.error)) || res.statusText;
      const err = new Error(`${res.status}: ${msg}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  return {
    manifest: (payload) => request("POST", "/api/platform/cdn/manifest", payload),
    confirmUpload: (sha256) =>
      request("POST", "/api/platform/cdn/uploaded", { sha256 }),
    activate: (deploy_id) =>
      request("POST", "/api/platform/cdn/activate", { deploy_id }),
    status: () => request("GET", "/api/platform/cdn/status"),
  };
}
