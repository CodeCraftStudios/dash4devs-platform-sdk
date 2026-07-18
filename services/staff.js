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

  /**
   * Invite/create an operator. Omit `password` to send an INVITE: the response
   * includes `invite_token`, which you turn into an accept link and email. With a
   * password, the account is usable immediately.
   *
   * @returns {Promise<{staff: object, invite_token?: string}>}
   */
  async create({ email, first_name, last_name, role, password } = {}) {
    return this.client._fetch("/api/platform/staff", {
      method: "POST",
      body: JSON.stringify({ email, first_name, last_name, role, password }),
    });
  }

  /**
   * Accept an invite: the invited operator sets their own password. No session
   * required — the signed token is the proof. Moves them from Invites to Members.
   */
  async accept({ token, password } = {}) {
    return this.client._fetch("/api/platform/staff/accept", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  /** Update role, active state, name or email. */
  async update(id, patch = {}) {
    return this.client._fetch(`/api/platform/staff/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  /** Revoke a PENDING invite (deletes the account). Fails for accepted members —
   *  disable those instead. */
  async remove(id) {
    return this.client._fetch(`/api/platform/staff/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}
