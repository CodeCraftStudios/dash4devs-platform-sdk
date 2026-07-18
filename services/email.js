/**
 * Email — send transactional email through the platform's OWN Resend account.
 *
 *   await dash.email.send({
 *     to: "client@example.com",
 *     subject: "Your invite",
 *     html: "<p>Welcome…</p>",
 *   });
 *
 * SERVER-SIDE ONLY: the endpoint is secret-key + module gated, so this must run
 * from server code (the secret key can't send from a browser). The platform's
 * Resend API key + verified from-address live in the platform config on the
 * backend — never here — so `from`/`replyTo` are optional and default to the
 * platform's configured sender.
 */

export class EmailModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * @param {Object} opts
   * @param {string|string[]} opts.to         Recipient(s).
   * @param {string} opts.subject
   * @param {string} [opts.html]              HTML body (provide html or text).
   * @param {string} [opts.text]              Plain-text body.
   * @param {string} [opts.from]              Override the platform's default sender.
   * @param {string} [opts.replyTo]           Reply-To address.
   * @param {string|string[]} [opts.cc]
   * @param {string|string[]} [opts.bcc]
   * @returns {Promise<{ ok: boolean, id: string }>} Resend message id.
   */
  async send(opts = {}) {
    const { to, subject, html, text, from, replyTo, cc, bcc } = opts;
    if (!to) throw new Error("email.send: 'to' is required");
    if (!subject) throw new Error("email.send: 'subject' is required");
    if (!html && !text) throw new Error("email.send: provide 'html' or 'text'");

    return this.client._fetch("/api/platform/email/send", {
      method: "POST",
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        from,
        reply_to: replyTo,
        cc,
        bcc,
      }),
    });
  }
}
