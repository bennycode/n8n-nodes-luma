import type { INodePropertyOptions } from 'n8n-workflow';

export const LUMA_BASE_URL = 'https://public-api.luma.com';

export const LUMA_CREDENTIAL_NAME = 'lumaApi';

/**
 * Page size requested while returning all results. Luma enforces its own
 * maximum and simply returns fewer entries; the cursor loop keeps going until
 * `has_more` is false, so the exact cap does not matter for correctness.
 */
export const PAGE_SIZE = 100;

export const SORT_DIRECTION_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Ascending', value: 'asc' },
	{ name: 'Ascending, Nulls Last', value: 'asc nulls last' },
	{ name: 'Descending', value: 'desc' },
	{ name: 'Descending, Nulls Last', value: 'desc nulls last' },
];

export const GUEST_APPROVAL_STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Approved', value: 'approved' },
	{ name: 'Declined', value: 'declined' },
	{ name: 'Invited', value: 'invited' },
	{ name: 'Pending Approval', value: 'pending_approval' },
	{ name: 'Session', value: 'session' },
	{ name: 'Waitlist', value: 'waitlist' },
];

export const EVENT_VISIBILITY_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Members Only', value: 'members-only' },
	{ name: 'Private', value: 'private' },
	{ name: 'Public', value: 'public' },
];

export const LOCATION_VISIBILITY_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Guests Only',
		value: 'guests-only',
		description: 'Only approved guests see the exact address',
	},
	{ name: 'Public', value: 'public' },
];

export const WAITLIST_STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Disabled', value: 'disabled' },
	{ name: 'Enabled', value: 'enabled' },
];
