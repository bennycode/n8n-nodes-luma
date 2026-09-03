# Luma node implementation plan

Declarative community node for the Luma API (https://public-api.luma.com,
OpenAPI at /openapi.json), scaffolded with `npm create @n8n/node` and laid out
like the `GithubIssues` example: one folder per resource, shared helpers, list
search and load option methods next to the node class.

## Decisions

- **Declarative style.** Every operation is one request whose parameters map
  onto the query string or JSON body. Post-receive hooks handle errors and
  unwrap list envelopes.
- **API key credential.** Luma authenticates with an `x-luma-api-key` header.
  The credential test calls `/v1/users/get-self`.
- **Cursor pagination through a helper.** n8n's generic pagination replaces the
  whole query string on follow-up requests, so `cursorPagination()` repeats each
  operation's query parameters from `$request.qs` and adds `pagination_cursor`.
  A test checks that no filter parameter is forgotten.
- **Readable errors.** All requests set `ignoreHttpStatusErrors` and run
  `handleLumaError`, which surfaces Luma's `message` and adds hints for 401,
  403, 404 and 429 (rate limit: 200/min calendar keys, 500/min org keys).
- **Empty write responses** become `{ success: true }`.
- **Scope of v1.** Calendar (get), Contact (get many), Event (create, get, get
  many, update), Guest (add, get, get many, send invites, update status),
  Ticket Type (create, get, get many, update, delete), Contact Tag and Event
  Tag (create, get many, update, delete, apply, unapply), Image (upload), and a
  webhook trigger. The API has 67 endpoints; coupons, hosts, memberships and
  organizations are left for later.

## Steps

- [x] Study the OpenAPI spec: auth, pagination, error format, rate limits
- [x] Scaffold package with `@n8n/create-node`
- [x] Credential with header auth and test request
- [x] Shared constants, pagination helper, error handling, transport
- [x] Event resource locator with list search
- [x] Event: create, get, get many, update
- [x] Guest: add, get, get many, send invites, update status (ticket types via load options)
- [x] Calendar: get. Contact: get many
- [x] Node class, codex metadata, light and dark icons, output schema
- [x] Unit tests: pagination helper, error handling, description integrity
- [x] Build, lint and tests green
- [ ] Manual check with a real API key in `npm run dev`
- [x] Ticket Type resource (create, get, get many, update, delete)
- [x] Event Tag and Contact Tag resources (create, get many, update, delete, apply, unapply)
- [x] Image upload (create upload URL, then PUT the binary, return the CDN URL)
- [x] Test that every routed URL and method exists in the OpenAPI spec (`test/fixtures/luma-paths.json`)
- [x] Luma Trigger node using `/v2/webhooks`, verifying `Webhook-Signature` (HMAC-SHA256 over `<t>.<body>`)
- [ ] Optional: publish to npm with `npm run release`
