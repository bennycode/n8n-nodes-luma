import type { INodeProperties } from 'n8n-workflow';
import { eventSelect } from '../../shared/descriptions';
import { guestsCollection } from './shared';

const showOnlyForGuestSendInvites = {
	resource: ['guest'],
	operation: ['sendInvites'],
};

export const guestSendInvitesDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: { show: showOnlyForGuestSendInvites },
	},
	{
		...guestsCollection,
		displayOptions: { show: showOnlyForGuestSendInvites },
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Personal note included in the invitation email',
		displayOptions: { show: showOnlyForGuestSendInvites },
		routing: {
			send: {
				type: 'body',
				property: 'message',
				value: '={{ $value || null }}',
			},
		},
	},
];
