import type { INodeProperties } from 'n8n-workflow';
import { handleLumaError, returnSuccess } from '../../shared/postReceive';
import { eventCreateDescription } from './create';
import { eventGetDescription } from './get';
import { eventGetManyDescription } from './getAll';
import { eventUpdateDescription } from './update';

const showOnlyForEvents = {
	resource: ['event'],
};

export const eventDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForEvents },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an event',
				description: 'Create an event on the calendar',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/create',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an event',
				description: 'Get an event by ID',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/events/get',
						qs: {
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
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many events',
				description: 'Get many events of the calendar',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/calendars/events/list',
						arrayFormat: 'repeat',
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
				action: 'Update an event',
				description: 'Update an event',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/update',
						body: {
							event_id: '={{ $parameter.event }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError, returnSuccess],
					},
				},
			},
		],
		default: 'get',
	},
	...eventCreateDescription,
	...eventGetDescription,
	...eventGetManyDescription,
	...eventUpdateDescription,
];
