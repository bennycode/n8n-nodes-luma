import type { INodeProperties } from 'n8n-workflow';
import {
	EVENT_VISIBILITY_OPTIONS,
	LOCATION_VISIBILITY_OPTIONS,
	WAITLIST_STATUS_OPTIONS,
} from '../../shared/constants';

function bodyField(property: string): INodeProperties['routing'] {
	return { send: { type: 'body', property } };
}

/** Optional event attributes shared by Create and Update, sorted by display name. */
export const optionalEventFields: INodeProperties[] = [
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Street address of the venue. Leave empty for online events.',
		routing: {
			request: {
				body: {
					geo_address_json: {
						type: 'manual',
						address: '={{ $value }}',
					},
				},
			},
		},
	},
	{
		displayName: 'Allow Multiple Tickets',
		name: 'can_register_for_multiple_tickets',
		type: 'boolean',
		default: false,
		description: 'Whether a guest may register for more than one ticket',
		routing: bodyField('can_register_for_multiple_tickets'),
	},
	{
		displayName: 'Cover Image URL',
		name: 'cover_url',
		type: 'string',
		default: '',
		description: 'URL of the cover image',
		routing: bodyField('cover_url'),
	},
	{
		displayName: 'Description',
		name: 'description_md',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description:
			'Event description in Markdown. Images must be hosted on the Luma CDN. YouTube, Vimeo and Loom URLs on their own line are embedded.',
		routing: bodyField('description_md'),
	},
	{
		displayName: 'End',
		name: 'end_at',
		type: 'dateTime',
		default: '',
		description: 'When the event ends',
		routing: bodyField('end_at'),
	},
	{
		displayName: 'Location Visibility',
		name: 'location_visibility',
		type: 'options',
		options: LOCATION_VISIBILITY_OPTIONS,
		default: 'public',
		routing: bodyField('location_visibility'),
	},
	{
		displayName: 'Max Capacity',
		name: 'max_capacity',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description:
			'Registration closes, or the waitlist opens, once this many guests are approved. 0 means unlimited.',
		routing: {
			send: {
				type: 'body',
				property: 'max_capacity',
				value: '={{ $value > 0 ? $value : null }}',
			},
		},
	},
	{
		displayName: 'Meeting URL',
		name: 'meeting_url',
		type: 'string',
		default: '',
		description: 'Video call link for online events',
		routing: bodyField('meeting_url'),
	},
	{
		displayName: 'Registration Open',
		name: 'registration_open',
		type: 'boolean',
		default: true,
		description: 'Whether guests can currently register',
		routing: bodyField('registration_open'),
	},
	{
		displayName: 'Reminders Disabled',
		name: 'reminders_disabled',
		type: 'boolean',
		default: false,
		description: 'Whether Luma should skip sending reminder emails to guests',
		routing: bodyField('reminders_disabled'),
	},
	{
		displayName: 'Show Guest List',
		name: 'show_guest_list',
		type: 'boolean',
		default: true,
		description: 'Whether the guest list is visible on the event page',
		routing: bodyField('show_guest_list'),
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		default: '',
		description: 'Custom URL slug, so the event lives at lu.ma/&lt;slug&gt;',
		routing: bodyField('slug'),
	},
	{
		displayName: 'Visibility',
		name: 'visibility',
		type: 'options',
		options: EVENT_VISIBILITY_OPTIONS,
		default: 'public',
		routing: bodyField('visibility'),
	},
	{
		displayName: 'Waitlist Status',
		name: 'waitlist_status',
		type: 'options',
		options: WAITLIST_STATUS_OPTIONS,
		default: 'disabled',
		routing: bodyField('waitlist_status'),
	},
];

/** Attributes that are required on Create but optional on Update. */
export const coreEventFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Title of the event',
		routing: bodyField('name'),
	},
	{
		displayName: 'Start',
		name: 'start_at',
		type: 'dateTime',
		default: '',
		description: 'When the event starts',
		routing: bodyField('start_at'),
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: '',
		placeholder: 'e.g. Europe/Berlin',
		description: 'IANA timezone name the event is displayed in',
		routing: bodyField('timezone'),
	},
];

export function sortByDisplayName(properties: INodeProperties[]): INodeProperties[] {
	return [...properties].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
