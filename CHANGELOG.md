# Changelog

## Unreleased

- Errors for a missing event, guest, ticket type or tag now name the identifier
  that was not found.
- Output schemas for every operation, generated from Luma's OpenAPI document by
  `npm run sync:openapi`.
- The Luma API key is marked as required on the credential.

## 0.1.0

- Initial release with Calendar, Contact, Contact Tag, Event, Event Tag, Guest, Image and Ticket Type resources.
- Luma Trigger node with signed webhook deliveries.
- Cursor based pagination for all list operations.
- Readable errors for authentication, missing resources and rate limits.
