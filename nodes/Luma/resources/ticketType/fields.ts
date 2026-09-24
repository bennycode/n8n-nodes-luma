import type { INodeProperties } from 'n8n-workflow';

function bodyField(property: string): INodeProperties['routing'] {
	return { send: { type: 'body', property } };
}

export const ticketTypeIdField: INodeProperties = {
	displayName: 'Ticket Type ID',
	name: 'ticketTypeId',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. ttype-Ab12Cd34',
	description: 'ID of the ticket type, starts with "ttype-"',
};

export const ticketTypeKindOptions = [
	{ name: 'Free', value: 'free' },
	{
		name: 'Paid',
		value: 'paid',
		description: 'Requires a Stripe account connected to the calendar',
	},
];

/** Attributes that are required on Create but optional on Update. */
export const coreTicketTypeFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Name shown to guests, up to 30 characters',
		routing: bodyField('name'),
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: ticketTypeKindOptions,
		default: 'free',
		routing: bodyField('type'),
	},
];

/** Optional attributes shared by Create and Update, sorted by display name. */
export const optionalTicketTypeFields: INodeProperties[] = [
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		placeholder: 'e.g. usd',
		description: 'ISO 4217 currency code for paid tickets',
		routing: bodyField('currency'),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Shown under the ticket name, up to 1000 characters',
		routing: bodyField('description'),
	},
	{
		displayName: 'Flexible Price',
		name: 'is_flexible',
		type: 'boolean',
		default: false,
		description: 'Whether guests choose their own amount, at least the minimum price',
		routing: bodyField('is_flexible'),
	},
	{
		displayName: 'Hidden',
		name: 'is_hidden',
		type: 'boolean',
		default: false,
		description: 'Whether the ticket type is hidden from the public event page',
		routing: bodyField('is_hidden'),
	},
	{
		displayName: 'Max Capacity',
		name: 'max_capacity',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'How many tickets of this type can be sold. 0 means unlimited.',
		routing: {
			send: {
				type: 'body',
				property: 'max_capacity',
				value: '={{ $value > 0 ? $value : null }}',
			},
		},
	},
	{
		displayName: 'Minimum Price (Cents)',
		name: 'min_cents',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Lowest amount a guest may pay when the price is flexible',
		routing: bodyField('min_cents'),
	},
	{
		displayName: 'Price (Cents)',
		name: 'cents',
		type: 'number',
		default: 0,
		typeOptions: { minValue: 0 },
		description: 'Price in the smallest currency unit, for example 1500 for 15.00',
		routing: bodyField('cents'),
	},
	{
		displayName: 'Require Approval',
		name: 'require_approval',
		type: 'boolean',
		default: false,
		description: 'Whether registrations with this ticket need host approval',
		routing: bodyField('require_approval'),
	},
	{
		displayName: 'Valid From',
		name: 'valid_start_at',
		type: 'string',
		default: '',
		placeholder: 'e.g. 2026-09-01',
		description: 'First day the ticket can be bought, as an ISO 8601 date',
		routing: bodyField('valid_start_at'),
	},
	{
		displayName: 'Valid Until',
		name: 'valid_end_at',
		type: 'string',
		default: '',
		placeholder: 'e.g. 2026-09-30',
		description: 'Last day the ticket can be bought, as an ISO 8601 date',
		routing: bodyField('valid_end_at'),
	},
];
