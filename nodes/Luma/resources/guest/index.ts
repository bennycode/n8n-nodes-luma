import type { INodeProperties } from 'n8n-workflow';
import { handleLumaError, returnSuccess } from '../../shared/postReceive';
import { guestAddDescription } from './add';
import { guestGetDescription } from './get';
import { guestGetManyDescription } from './getAll';
import { guestSendInvitesDescription } from './sendInvites';
import { guestUpdateStatusDescription } from './updateStatus';

const showOnlyForGuests = {
	resource: ['guest'],
};

const eventIdInBody = {
	event_id: '={{ $parameter.event }}',
};

export const guestDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForGuests },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add guests to an event',
				description: 'Register guests for an event without asking them to accept',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/guests/add',
						body: eventIdInBody,
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
				action: 'Get a guest',
				description: 'Get a guest including their ticket orders',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/events/guests/get',
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
				action: 'Get many guests',
				description: 'Get many guests of an event',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/events/guests/list',
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
				name: 'Send Invites',
				value: 'sendInvites',
				action: 'Send invites to guests',
				description: 'Invite guests by email and SMS so they can accept',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/guests/send-invites',
						body: eventIdInBody,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError, returnSuccess],
					},
				},
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				action: 'Update the status of a guest',
				description: 'Approve, decline or waitlist a guest',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/events/guests/update-status',
						body: eventIdInBody,
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleLumaError, returnSuccess],
					},
				},
			},
		],
		default: 'getAll',
	},
	...guestAddDescription,
	...guestGetDescription,
	...guestGetManyDescription,
	...guestSendInvitesDescription,
	...guestUpdateStatusDescription,
];
