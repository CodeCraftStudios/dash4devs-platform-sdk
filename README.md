# dash4devs-platform

Private SDK for **Dash4Devs white-label platforms**. Not the public `dash4devs` SDK,
and not for public distribution — this ships from a private repo, never npm.

```bash
npm install github:CodeCraftStudios/dash4devs-platform-sdk
```

## Keys

Platform keys have their own namespace — they are **not** storefront `pk_`/`sk_` keys:

```
dfd-platform-secret-key-live-<random>    server-side only, read + write
dfd-platform-public-key-live-<random>    browser-safe, READ-ONLY, origin-locked
```

Issue them in **Super Dashboard → Whitelabel → your platform → Security**. The value is
shown once. A leaked key is revoked there, and the platform can be suspended outright —
which kills every key at once.

## Server usage

```js
// app/lib/dash.js
import { createPlatformClient } from "dash4devs-platform/server";

export const dash = createPlatformClient();   // reads DASH_PLATFORM_KEY
```

```bash
# .env  — NOT NEXT_PUBLIC_*, or it lands in the browser bundle
DASH_PLATFORM_KEY=dfd-platform-secret-key-live-…
```

```js
const { records, total } = await dash.records.list("repair_ticket", {
  status: "open",
  sort: "-created_at",
});

await dash.records.create("repair_ticket", {
  data: { serial_number: "A1B2", priority: "high" },
  customer: "pcust__…",
});
```

## Browser usage

Use a **public** key and give it an allowed origin. Public keys are read-only — any
write returns `secret_key_required`, so mutations go through your own route handlers.

```js
import { PlatformClient } from "dash4devs-platform";

const dash = new PlatformClient({
  key: process.env.NEXT_PUBLIC_DASH_PLATFORM_KEY, // public key only
});
```

Constructing the client with a **secret** key in a browser throws immediately, and so
does putting one in a `NEXT_PUBLIC_*` variable. That's deliberate: a secret key in a
bundle bypasses the origin allowlist and can write.

## Records are encrypted

Record values are encrypted at rest — Postgres stores ciphertext. A field is only
filterable or searchable if its record type says so in the Super Dashboard, which
mirrors that value into a plaintext column.

```js
// works — `priority` is marked filterable
await dash.records.list("repair_ticket", { priority: "high" });

// 400 field_not_filterable — `customer_ssn` is encrypted, and stays that way
await dash.records.list("repair_ticket", { customer_ssn: "123-45-6789" });
```

The error names the filterable fields rather than silently returning nothing.

`update()` **merges** `data` — sending one field will not wipe the rest.

## Portal auth

```js
const { token, customer } = await dash.portal.login(email, password);
const me = await dash.portal.me();
```

The token is scoped to one platform: it carries the platform id and is rejected if
replayed against another, even though every platform shares one backend.

## Test mode

A platform starts in **test mode**, which relaxes origin + HTTPS enforcement so you can
build against `http://localhost` before it has a domain. It relaxes nothing else — the
key still has to be valid, the platform active, and the module granted.

Flip to live on the Security tab. Going live is refused if a public key has no allowed
origin, since it would otherwise start failing everywhere the moment you switch.

## What exists today

| Module | Status |
|---|---|
| `records` | ✅ live |
| `customers` | ✅ live |
| `portal` | ✅ live |
| forms, invoices, calendar, reports, integrations | ⛔ not built — no SDK method ships until the endpoint does |

That last row is the rule: a method that calls a route which doesn't exist is worse than
no method at all.
