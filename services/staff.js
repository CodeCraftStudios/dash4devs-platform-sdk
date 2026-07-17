/**
 * Staff — the platform's own operators (the people who run it).
 *
 * The directory that feeds assignee pickers, and the surface the Team module manages.
 * Creating/updating requires a SECRET key; the front end's server action decides who's
 * allowed to call it.
 */

export class StaffModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * Staff on this platform.
   *
   * @param {Object} [query]
   * @param {boolean} [query.includeInactive] Include deactivated operators.
   * @returns {Promise<{staff: object[]}>}
   */
  async list(query = {}) {
    const qs = query.includeInactive ? "?include_inactive=true" : "";
    return this.client._fetch(`/api/platform/staff${qs}`);
  }

  /** Invite/create an operator. `password` is optional (a temp until they set one). */
  async create({ email, first_name, last_name, role, password } = {}) {
    return this.client._fetch("/api/platform/staff", {
      method: "POST",
      body: JSON.stringify({ email, first_name, last_name, role, password }),
    });
  }

  /** Update role, active state or name. Email is not editable. */
  async update(id, patch = {}) {
    return this.client._fetch(`/api/platform/staff/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }
}
