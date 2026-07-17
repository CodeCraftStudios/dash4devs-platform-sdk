/**
 * Records — a platform's custom entities.
 *
 * Record values are ENCRYPTED at rest. A field can only be filtered or searched if
 * its record type marked it `filterable` / `searchable` in the Super Dashboard,
 * which mirrors that value into a plaintext column. Filtering on anything else
 * returns a 400 telling you so, rather than silently matching nothing.
 */

export class RecordsModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * List records of a type.
   *
   * @param {string} type  The record type key, e.g. "repair_ticket"
   * @param {Object} [query]
   * @param {string} [query.status]    Workflow status
   * @param {string} [query.customer]  Customer id
   * @param {string} [query.search]    Matches fields marked searchable
   * @param {string} [query.sort]      created_at | updated_at | status (prefix "-" to reverse)
   * @param {number} [query.limit=50]
   * @param {number} [query.offset=0]
   * Any other key is treated as a data-field filter and must be `filterable`.
   *
   * @example
   * const { records, total } = await dash.records.list("repair_ticket", {
   *   status: "open",
   *   sort: "-created_at",
   * });
   */
  async list(type, query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.client._fetch(
      `/api/platform/records/${encodeURIComponent(type)}${qs ? `?${qs}` : ""}`
    );
  }

  async get(type, id) {
    return this.client._fetch(
      `/api/platform/records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`
    );
  }

  /**
   * Create a record. Requires a secret key — public keys are read-only.
   *
   * @param {string} type
   * @param {Object} payload
   * @param {Object} payload.data       Validated against the record type's schema
   * @param {string} [payload.status]
   * @param {string} [payload.customer] Customer id
   */
  async create(type, { data, status, customer } = {}) {
    return this.client._fetch(`/api/platform/records/${encodeURIComponent(type)}`, {
      method: "POST",
      body: JSON.stringify({ data, status, customer }),
    });
  }

  /**
   * Update a record. `data` is MERGED, not replaced — sending one field will not
   * wipe the others.
   */
  async update(type, id, { data, status } = {}) {
    return this.client._fetch(
      `/api/platform/records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ data, status }) }
    );
  }

  async delete(type, id) {
    return this.client._fetch(
      `/api/platform/records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  }
}
