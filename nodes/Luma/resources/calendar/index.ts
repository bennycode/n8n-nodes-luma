import type { INodeProperties } from 'n8n-workflow';
import { handleLumaError } from '../../shared/postReceive';

export const calendarDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the calendar',
				description: 'Get the calendar the API key belongs to',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/calendars/get',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError],
					},
				},
			},
		],
		default: 'get',
	},
];
