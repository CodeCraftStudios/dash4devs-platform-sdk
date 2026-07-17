/**
 * Portal — how a platform's own customers sign in.
 *
 * The token is scoped to ONE platform: it carries the platform id and is rejected
 * if replayed against another, even though every platform shares one backend.
 */

export class PortalModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * Sign a customer in. On success the token is stored on the client, so
   * subsequent calls are made as that customer.
   *
   * @returns {Promise<{token: string, customer: object}>}
   */
  async login(email, password) {
    const result = await this.client._fetch("/api/platform/portal/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (result?.token) {
      this.client.setToken(result.token);
    }
    return result;
  }

  /** The signed-in customer, or a 401 if there is no valid token. */
  async me() {
    return this.client._fetch("/api/platform/portal/me");
  }

  logout() {
    this.client.setToken(null);
  }
}
