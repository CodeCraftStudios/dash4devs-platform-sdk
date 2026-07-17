/**
 * Auth — a platform has TWO audiences, and the token says which.
 *
 *   staff     PlatformUser     → runs the platform (admin dashboard)
 *   customer  PlatformCustomer → is served by it (client portal)
 *
 * They are separate tables on the backend, not one table with a flag, so a customer
 * token can never authenticate as staff.
 */

export class AuthModule {
  constructor(client) {
    this.client = client;
  }

  /** Staff sign-in. Returns a token with `aud: "staff"`. */
  async staffLogin(email, password) {
    return this.client._fetch("/api/platform/auth/staff/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  /** Customer sign-in. Returns a token with `aud: "customer"`. */
  async customerLogin(email, password) {
    return this.client._fetch("/api/platform/auth/customer/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * One form, two audiences: try staff, fall back to customer.
   *
   * The caller never has to ask "which kind of account is this?" — and neither does
   * the person signing in. A failure in either path returns the same message, so
   * this can't be used to discover which emails are staff.
   */
  async login(email, password) {
    try {
      return await this.staffLogin(email, password);
    } catch (error) {
      if (error.status !== 401) throw error;
      return this.customerLogin(email, password);
    }
  }

  /**
   * Resolve a token to its subject.
   *
   * This is the ONLY trustworthy way to answer "who is this, and are they still
   * allowed in". Anything that changed since the token was minted — deactivated,
   * deleted, role changed — shows up here. Decoding the JWT body yourself and
   * believing it would keep honouring sessions the platform already revoked.
   */
  async me(token) {
    return this.client._fetch("/api/platform/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
