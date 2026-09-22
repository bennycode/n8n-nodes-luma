# n8n-nodes-luma

This is an n8n community node. It lets you manage events, guests and contacts on [Luma](https://luma.com/) in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Trigger](#trigger)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Development](#development)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- Calendar
  - **Get** the calendar the API key belongs to
- Contact
  - **Get Many** contacts, with search, membership status and sorting filters
- Contact Tag and Event Tag
  - **Create**, **Get Many**, **Update** and **Delete** tags
  - **Apply** and **Unapply** a tag to contacts (by email or user ID) or to events
- Event
  - **Create** an event
  - **Get** an event by ID or from a searchable list
  - **Get Many** events, filtered by date range, submission status, access and sort order
  - **Update** an event
- Guest
  - **Add** guests to an event, optionally with a ticket type and approval status
  - **Get** a guest by ID, guest key, ticket key or email
  - **Get Many** guests of an event, filtered by approval status and sort order
  - **Send Invites** so guests can accept an invitation
  - **Update Status** to approve, decline or waitlist a guest
- Image
  - **Upload** a JPEG or PNG from a binary field to the Luma CDN and get back its URL
- Ticket Type
  - **Create**, **Get**, **Get Many**, **Update** and **Delete** ticket types of an event

## Trigger

The **Luma Trigger** node registers a webhook on your calendar and starts the workflow for the selected event types, such as `guest.registered` or `event.updated`. Pick **All Events** to receive every type.

Luma signs each delivery with HMAC-SHA256 over `<timestamp>.<body>` using the webhook secret it hands out on registration. The trigger checks that signature and rejects deliveries older than five minutes, so forged or replayed requests never start the workflow. Luma retries failed deliveries three times.

If a webhook for the same URL already exists, the trigger reuses it and updates its event types instead of registering a second one.

## Credentials

Create an API key in your Luma calendar under Settings > Options > API, then paste it into a **Luma API** credential in n8n. The credential test calls the "get self" endpoint.

Calendar API keys are limited to 200 requests per minute, organization keys to 500. When the limit is hit the node fails with a message that says so. Use the node's batching settings under Options to space requests out.

## Compatibility

Built and tested against n8n 1.x with `n8nNodesApiVersion` 1.

## Usage

**Return All** on list operations follows Luma's cursor pagination until the API reports there is nothing more. **Limit** requests a single page; Luma enforces its own maximum page size, so very large limits may return fewer items than asked for.

Dates are ISO 8601 strings. Timezones are IANA names such as `Europe/Berlin`.

Write operations that Luma answers with an empty body return `{ "success": true }`.

### Images

Luma only accepts cover images and description images hosted on its own CDN. Use **Image > Upload** with a binary field first, then pass the returned `file_url` to the event's **Cover Image URL** field or reference it in Markdown.

## Development

```bash
npm install
npm run dev     # starts n8n on http://localhost:5678 with this node linked
npm run build   # compiles to dist/
npm run lint    # community node lint rules
npm run lint:memory  # memory-safety rules, see below
npm run format       # format with Prettier
npm test        # unit tests
npm run sync:openapi  # regenerate everything derived from Luma's OpenAPI spec
```

Prettier runs on staged files through a [lefthook](https://lefthook.dev) pre-commit hook.
`npm install` sets the hook up; if your npm blocks install scripts, run `npx lefthook install` once.

`CHANGELOG.md` is generated from commit messages when `npm run release` runs, so it is never
edited by hand. Write commit subjects that read well in a changelog.

### Keeping up with the Luma API

`npm run sync:openapi` downloads <https://public-api.luma.com/openapi.json> and
rewrites the two things this repository derives from it: the output schemas
under `nodes/Luma/__schema__/v1.0.0/`, and `test/fixtures/luma-paths.json`,
which lists every documented endpoint with the query and body parameters it
accepts. It reads the built node to learn which endpoint belongs to which
resource and operation, so run `npm run build` first.

The fixture is what lets `test/description.test.ts` prove offline that the node
only calls endpoints and parameters Luma actually documents. Run the sync after
adding an operation, and whenever Luma ships API changes; the tests fail if an
operation has no schema.

### Memory lint

`npm run lint:memory` runs four extra ESLint rules from `lint/memory/` that
flag the code shapes behind most out-of-memory crashes in community nodes:
module-level collections that grow across executions, `Promise.all` over every
input item, whole files or binary items loaded into a Buffer, and timers or
listeners registered in `trigger()` without a matching cleanup in
`closeFunction`. They are heuristics, so a hit means "look here", not "this
leaks".

The rules live in a separate config (`eslint.memory.config.mjs`) because
`eslint.config.mjs` has to stay at the `@n8n/node-cli` default for the package
to keep its n8n Cloud eligibility. Justified exceptions go into that config as
per-file overrides with a comment, not as inline disable comments, since the
default lint does not know these rules.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Luma API reference](https://docs.luma.com/reference/getting-started-with-your-api)
- [Luma OpenAPI specification](https://public-api.luma.com/openapi.json)
