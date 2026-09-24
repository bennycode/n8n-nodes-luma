import type { INodeProperties } from 'n8n-workflow';
import { GUEST_APPROVAL_STATUS_OPTIONS } from '../../shared/constants';
import { eventSelect, paginationProperties, sortOptions } from '../../shared/descriptions';

const showOnlyForGuestGetMany = {
	show: {
		resource: ['guest'],
		operation: ['getAll'],
	},
};

export const guestGetManyQueryParameters = [
	'approval_status',
	'event_id',
	'sort_column',
	'sort_direction',
];

export const guestGetManyDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: showOnlyForGuestGetMany,
	},
	...paginationProperties(showOnlyForGuestGetMany, guestGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showOnlyForGuestGetMany,
		options: [
			{
				displayName: 'Approval Status',
				name: 'approval_status',
				type: 'options',
				options: GUEST_APPROVAL_STATUS_OPTIONS,
				default: 'approved',
				routing: {
					send: {
						type: 'query',
						property: 'approval_status',
					},
				},
			},
			...sortOptions([
				{ name: 'Checked In At', value: 'checked_in_at' },
				{ name: 'Created At', value: 'created_at' },
				{ name: 'Email', value: 'email' },
				{ name: 'Name', value: 'name' },
				{ name: 'Registered At', value: 'registered_at' },
			]),
		],
	},
];
