import type { INodeProperties } from 'n8n-workflow';

/** Repeatable email + name pairs, sent as the `guests` array. */
export const guestsCollection: INodeProperties = {
	displayName: 'Guests',
	name: 'guests',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Guest',
	default: {},
	required: true,
	options: [
		{
			name: 'guestValues',
			displayName: 'Guest',
			values: [
				{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					placeholder: 'name@email.com',
					default: '',
					required: true,
				},
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Ignored if the guest already has a name on Luma',
				},
			],
		},
	],
	routing: {
		send: {
			type: 'body',
			property: 'guests',
			value:
				'={{ ($value.guestValues ?? []).map((guest) => ({ email: guest.email, name: guest.name || null })) }}',
		},
	},
};
