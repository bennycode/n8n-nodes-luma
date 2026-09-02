import type { INodeProperties } from 'n8n-workflow';
import { eventSelect, guestIdentifier } from '../../shared/descriptions';

const showOnlyForGuestUpdateStatus = {
	resource: ['guest'],
	operation: ['updateStatus'],
};

export const guestUpdateStatusDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: { show: showOnlyForGuestUpdateStatus },
	},
	{
		...guestIdentifier,
		displayOptions: { show: showOnlyForGuestUpdateStatus },
		routing: {
			send: {
				type: 'body',
				property: 'guest_id',
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Approved', value: 'approved', description: 'Guest is going' },
			{ name: 'Declined', value: 'declined' },
			{ name: 'Pending Approval', value: 'pending_approval' },
			{ name: 'Waitlist', value: 'waitlist' },
		],
		default: 'approved',
		required: true,
		displayOptions: { show: showOnlyForGuestUpdateStatus },
		routing: {
			send: {
				type: 'body',
				property: 'status',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: showOnlyForGuestUpdateStatus },
		options: [
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'Personal note for the status email, up to 200 characters. Cannot be combined with Send Email disabled.',
				routing: {
					send: {
						type: 'body',
						property: 'message',
					},
				},
			},
			{
				displayName: 'Refund',
				name: 'should_refund',
				type: 'boolean',
				default: false,
				description: 'Whether to refund a paying guest who is moved out of the approved status',
				routing: {
					send: {
						type: 'body',
						property: 'should_refund',
					},
				},
			},
			{
				displayName: 'Send Email',
				name: 'send_email',
				type: 'boolean',
				default: true,
				description: 'Whether Luma should email the guest about the status change',
				routing: {
					send: {
						type: 'body',
						property: 'send_email',
					},
				},
			},
		],
	},
];
