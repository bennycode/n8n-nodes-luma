import type { INodePropertyOptions } from 'n8n-workflow';

export const ALL_WEBHOOK_EVENTS = '*';

/** Webhook event types Luma can deliver, sorted by display name. */
export const WEBHOOK_EVENT_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'All Events',
		value: ALL_WEBHOOK_EVENTS,
		description: 'Every event type, including ones added later',
	},
	{ name: 'Calendar Event Added', value: 'calendar.event.added' },
	{ name: 'Calendar Event Submitted', value: 'calendar.event.submitted' },
	{ name: 'Calendar Person Subscribed', value: 'calendar.person.subscribed' },
	{ name: 'Calendar Person Unsubscribed', value: 'calendar.person.unsubscribed' },
	{ name: 'Event Canceled', value: 'event.canceled' },
	{ name: 'Event Created', value: 'event.created' },
	{ name: 'Event Updated', value: 'event.updated' },
	{ name: 'Guest Refunded', value: 'guest.refunded' },
	{ name: 'Guest Registered', value: 'guest.registered' },
	{ name: 'Guest Updated', value: 'guest.updated' },
	{ name: 'Ticket Registered', value: 'ticket.registered' },
];

/** "All Events" replaces any other selection, and the order does not matter to Luma. */
export function normalizeEventTypes(eventTypes: string[]): string[] {
	if (eventTypes.includes(ALL_WEBHOOK_EVENTS)) {
		return [ALL_WEBHOOK_EVENTS];
	}
	return [...new Set(eventTypes)].sort();
}

export function sameEventTypes(a: string[], b: string[]): boolean {
	const left = normalizeEventTypes(a);
	const right = normalizeEventTypes(b);
	return left.length === right.length && left.every((value, index) => value === right[index]);
}
