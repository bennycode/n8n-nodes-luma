import type { INodeProperties } from 'n8n-workflow';
import { coreEventFields, optionalEventFields } from './fields';

const showOnlyForEventCreate = {
	resource: ['event'],
	operation: ['create'],
};

export const eventCreateDescription: INodeProperties[] = [
	...coreEventFields.map((field) => ({
		...field,
		required: true,
		displayOptions: { show: showOnlyForEventCreate },
	})),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showOnlyForEventCreate },
		options: optionalEventFields,
	},
];
