import type { INodeProperties } from 'n8n-workflow';
import { eventSelect, guestIdentifier } from '../../shared/descriptions';

const showOnlyForGuestGet = {
	resource: ['guest'],
	operation: ['get'],
};

export const guestGetDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: { show: showOnlyForGuestGet },
	},
	{
		...guestIdentifier,
		displayOptions: { show: showOnlyForGuestGet },
		routing: {
			send: {
				type: 'query',
				property: 'id',
			},
		},
	},
];
