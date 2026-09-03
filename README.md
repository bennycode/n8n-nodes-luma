# n8n-nodes-luma

This is an n8n community node. It lets you manage events, guests and contacts on [Luma](https://luma.com/) in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
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
npm test        # unit tests
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Luma API reference](https://docs.luma.com/reference/getting-started-with-your-api)
- [Luma OpenAPI specification](https://public-api.luma.com/openapi.json)
