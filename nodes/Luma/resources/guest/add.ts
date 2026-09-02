import type { INodeProperties } from 'n8n-workflow';
import { eventSelect } from '../../shared/descriptions';
import { guestsCollection } from './shared';

const showOnlyForGuestAdd = {
	resource: ['guest'],
	operation: ['add'],
};

export const guestAddDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: { show: showOnlyForGuestAdd },
	},
	{
		...guestsCollection,
		displayOptions: { show: showOnlyForGuestAdd },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: showOnlyForGuestAdd },
		options: [
			{
				displayName: 'Approval Status',
				name: 'approval_status',
				type: 'options',
				options: [
					{ name: 'Approved', value: 'approved', description: 'Guests are registered as going' },
					{ name: 'Pending Approval', value: 'pending_approval', description: 'Guests wait for host review' },
					{ name: 'Waitlist', value: 'waitlist' },
				],
				default: 'approved',
				description: 'Status to assign to each added guest. To send an invite the guest can accept, use the Send Invites operation instead.',
				routing: {
					send: {
						type: 'body',
						property: 'approval_status',
					},
				},
			},
			{
				displayName: 'Send Email',
				name: 'send_email',
				type: 'boolean',
				default: true,
				description: 'Whether Luma should email each added guest',
				routing: {
					send: {
						type: 'body',
						property: 'send_email',
					},
				},
			},
			{
				displayName: 'Ticket Type Name or ID',
				name: 'ticketTypeId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTicketTypes',
					loadOptionsDependsOn: ['event.value'],
				},
				default: '',
				description:
					'Ticket type to assign to each guest. Defaults to the event\'s default ticket type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: {
					request: {
						body: {
							ticket: {
								event_ticket_type_id: '={{ $value }}',
							},
						},
					},
				},
			},
		],
	},
];
