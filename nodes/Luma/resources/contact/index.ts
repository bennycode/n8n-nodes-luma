import type { INodeProperties } from 'n8n-workflow';
import { paginationProperties, sortOptions } from '../../shared/descriptions';
import { handleLumaError } from '../../shared/postReceive';

const showOnlyForContacts = {
	resource: ['contact'],
};

const showOnlyForContactGetMany = {
	show: {
		resource: ['contact'],
		operation: ['getAll'],
	},
};

export const contactGetManyQueryParameters = ['membership_status', 'query', 'sort_column', 'sort_direction'];

export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForContacts },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				description: 'Get many contacts of the calendar',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/calendars/contacts/list',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [
							handleLumaError,
							{
								type: 'rootProperty',
								properties: {
									property: 'entries',
								},
							},
						],
					},
				},
			},
		],
		default: 'getAll',
	},
	...paginationProperties(showOnlyForContactGetMany, contactGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showOnlyForContactGetMany,
		options: [
			{
				displayName: 'Membership Status',
				name: 'membership_status',
				type: 'options',
				options: [
					{ name: 'Approved', value: 'approved' },
					{ name: 'Approved, Pending Payment', value: 'approved-pending-payment' },
					{ name: 'Declined', value: 'declined' },
					{ name: 'Pending', value: 'pending' },
				],
				default: 'approved',
				description: 'Only relevant for calendars with memberships',
				routing: {
					send: {
						type: 'query',
						property: 'membership_status',
					},
				},
			},
			{
				displayName: 'Search',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Matches against names and email addresses',
				routing: {
					send: {
						type: 'query',
						property: 'query',
					},
				},
			},
			...sortOptions([
				{ name: 'Created At', value: 'created_at' },
				{ name: 'Events Approved', value: 'event_approved_count' },
				{ name: 'Events Checked In', value: 'event_checked_in_count' },
				{ name: 'Name', value: 'name' },
				{ name: 'Revenue', value: 'revenue_usd_cents' },
			]),
		],
	},
];
