import type { INodeProperties } from 'n8n-workflow';
import { eventSelect } from '../../shared/descriptions';
import { coreEventFields, optionalEventFields, sortByDisplayName } from './fields';

const showOnlyForEventUpdate = {
	resource: ['event'],
	operation: ['update'],
};

export const eventUpdateDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: { show: showOnlyForEventUpdate },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForEventUpdate },
		options: sortByDisplayName([
			...coreEventFields,
			...optionalEventFields,
			{
				displayName: 'Suppress Notifications',
				name: 'suppress_notifications',
				type: 'boolean',
				default: false,
				description: 'Whether to skip emailing guests about the change',
				routing: {
					send: {
						type: 'body',
						property: 'suppress_notifications',
					},
				},
			},
		]),
	},
];
