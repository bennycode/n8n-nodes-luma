import type { INodeProperties } from 'n8n-workflow';
import { eventSelect } from '../../shared/descriptions';

export const eventGetDescription: INodeProperties[] = [
	{
		...eventSelect,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['get'],
			},
		},
	},
];
