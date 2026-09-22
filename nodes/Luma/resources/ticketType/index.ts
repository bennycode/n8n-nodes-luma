import type { INodeProperties } from 'n8n-workflow';
import { eventSelect } from '../../shared/descriptions';
import { handleLumaError, returnSuccess } from '../../shared/postReceive';
import { sortByDisplayName } from '../event/fields';
import { coreTicketTypeFields, optionalTicketTypeFields, ticketTypeIdField } from './fields';

const showOnlyForTicketTypes = {
	resource: ['ticketType'],
};

const showFor = (operation: string) => ({
	show: {
		resource: ['ticketType'],
		operation: [operation],
	},
});

const ticketTypeIdInBody = {
	event_ticket_type_id: '={{ $parameter.ticketTypeId }}',
};

export const ticketTypeDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForTicketTypes },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a ticket type',
				description: 'Create a ticket type for an event',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/ticket-types/create',
						body: {
							event_id: '={{ $parameter.event }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a ticket type',
				description: 'Delete a ticket type that has no sold tickets',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/ticket-types/delete',
						body: ticketTypeIdInBody,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError, returnSuccess],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a ticket type',
				description: 'Get a ticket type by ID',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/events/ticket-types/get',
						qs: {
							event_ticket_type_id: '={{ $parameter.ticketTypeId }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many ticket types',
				description: 'Get many ticket types of an event',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/events/ticket-types/list',
						qs: {
							event_id: '={{ $parameter.event }}',
						},
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
			{
				name: 'Update',
				value: 'update',
				action: 'Update a ticket type',
				description: 'Update a ticket type',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/ticket-types/update',
						body: ticketTypeIdInBody,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError],
					},
				},
			},
		],
		default: 'getAll',
	},

	// Create
	{
		...eventSelect,
		displayOptions: showFor('create'),
	},
	...coreTicketTypeFields.map((field) => ({
		...field,
		required: true,
		displayOptions: showFor('create'),
	})),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor('create'),
		options: optionalTicketTypeFields,
	},

	// Delete, Get
	{
		...ticketTypeIdField,
		displayOptions: {
			show: {
				resource: ['ticketType'],
				operation: ['delete', 'get'],
			},
		},
	},

	// Get Many
	{
		...eventSelect,
		displayOptions: showFor('getAll'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: showFor('getAll'),
		options: [
			{
				displayName: 'Include Hidden',
				name: 'include_hidden',
				type: 'boolean',
				default: false,
				description: 'Whether to include ticket types hidden from the event page',
				routing: {
					send: {
						type: 'query',
						property: 'include_hidden',
					},
				},
			},
		],
	},

	// Update
	{
		...ticketTypeIdField,
		displayOptions: showFor('update'),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor('update'),
		options: sortByDisplayName([...coreTicketTypeFields, ...optionalTicketTypeFields]),
	},
];
