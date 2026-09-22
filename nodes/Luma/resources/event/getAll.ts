import type { INodeProperties } from 'n8n-workflow';
import { paginationProperties, sortOptions } from '../../shared/descriptions';

const showOnlyForEventGetMany = {
	show: {
		resource: ['event'],
		operation: ['getAll'],
	},
};

export const eventGetManyQueryParameters = [
	'access',
	'after',
	'before',
	'sort_column',
	'sort_direction',
	'status',
];

export const eventGetManyDescription: INodeProperties[] = [
	...paginationProperties(showOnlyForEventGetMany, eventGetManyQueryParameters),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showOnlyForEventGetMany,
		options: [
			{
				displayName: 'Access',
				name: 'access',
				type: 'multiOptions',
				options: [
					{ name: 'Manage', value: 'manage', description: 'Events this calendar manages' },
					{
						name: 'View',
						value: 'view',
						description: 'Public events listed on the calendar but managed elsewhere',
					},
				],
				default: ['manage'],
				description: 'Which kinds of events to include',
				routing: {
					send: {
						type: 'query',
						property: 'access',
					},
				},
			},
			{
				displayName: 'After',
				name: 'after',
				type: 'dateTime',
				default: '',
				description: 'Only events starting at or after this time',
				routing: {
					send: {
						type: 'query',
						property: 'after',
					},
				},
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Only events starting before this time',
				routing: {
					send: {
						type: 'query',
						property: 'before',
					},
				},
			},
			...sortOptions([{ name: 'Start', value: 'start_at' }]),
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Approved', value: 'approved' },
					{ name: 'Pending', value: 'pending' },
				],
				default: 'approved',
				description: 'Calendar submission status of the events',
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
			},
		],
	},
];
