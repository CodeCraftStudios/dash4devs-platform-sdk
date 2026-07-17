/**
 * Customers — the people a platform serves.
 *
 * These are PLATFORM customers, not Dash4Devs organization customers: a platform's
 * client list never mixes with a storefront's shoppers. PII is encrypted at rest.
 */

export class CustomersModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * @param {Object} [query]
   * @param {number} [query.limit=50]
   * @param {number} [query.offset=0]
   */
  async list(query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.client._fetch(`/api/platform/customers${qs ? `?${qs}` : ""}`);
  }

  /**
   * Create a customer. Requires a secret key.
   *
   * Pass `password` to let them sign in to the portal later
   * (see `dash.portal.login`). Email is unique per platform.
   */
  async create({ email, first_name, last_name, phone, company, password, metadata } = {}) {
    return this.client._fetch("/api/platform/customers", {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name,
        last_name,
        phone,
        company,
        password,
        metadata,
      }),
    });
  }

  async get(id) {
    return this.client._fetch(`/api/platform/customers/${encodeURIComponent(id)}`);
  }

  /**
   * Update a customer. `metadata` is MERGED, not replaced — flipping one flag will
   * not wipe the others. Email is not editable: it's the login identity, and
   * changing it needs a verification flow rather than a PATCH.
   */
  async update(id, { first_name, last_name, phone, company, metadata, is_active } = {}) {
    return this.client._fetch(`/api/platform/customers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        first_name,
        last_name,
        phone,
        company,
        metadata,
        is_active,
      }),
    });
  }
}
