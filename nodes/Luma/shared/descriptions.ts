import type { IDisplayOptions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { PAGE_SIZE, SORT_DIRECTION_OPTIONS } from './constants';
import { cursorPagination } from './pagination';

export const eventSelect: INodeProperties = {
	displayName: 'Event',
	name: 'event',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The event to work with',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select an event...',
			typeOptions: {
				searchListMethod: 'getEvents',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. evt-Ab12Cd34Ef56',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^evt-[A-Za-z0-9]+$',
						errorMessage: 'Luma event IDs start with "evt-"',
					},
				},
			],
		},
	],
};

export const guestIdentifier: INodeProperties = {
	displayName: 'Guest',
	name: 'guestId',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. gst-Ab12Cd34 or name@email.com',
	description:
		'Guest ID (starts with "gst-"), guest key (starts with "g-"), ticket key, or the guest\'s email address',
};

/**
 * "Return All" and "Limit" for a cursor paginated list endpoint.
 * `queryParameters` lists every query parameter the operation may send so the
 * pagination loop can repeat them on follow-up requests.
 */
export function paginationProperties(
	displayOptions: IDisplayOptions,
	queryParameters: string[],
): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions,
			routing: {
				send: {
					paginate: '={{ $value }}',
					type: 'query',
					property: 'pagination_limit',
					value: `={{ $value ? ${PAGE_SIZE} : undefined }}`,
				},
				operations: {
					pagination: cursorPagination([...queryParameters, 'pagination_limit']),
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			description: 'Max number of results to return',
			typeOptions: {
				minValue: 1,
			},
			displayOptions: {
				...displayOptions,
				show: {
					...displayOptions.show,
					returnAll: [false],
				},
			},
			routing: {
				send: {
					type: 'query',
					property: 'pagination_limit',
				},
				output: {
					maxResults: '={{ $value }}',
				},
			},
		},
	];
}

/** Sort Column and Sort Direction entries for a "Filters" or "Options" collection. */
export function sortOptions(columns: INodePropertyOptions[]): INodeProperties[] {
	return [
		{
			displayName: 'Sort Column',
			name: 'sort_column',
			type: 'options',
			options: columns,
			default: String(columns[0].value),
			routing: {
				send: {
					type: 'query',
					property: 'sort_column',
				},
			},
		},
		{
			displayName: 'Sort Direction',
			name: 'sort_direction',
			type: 'options',
			options: SORT_DIRECTION_OPTIONS,
			default: 'asc',
			routing: {
				send: {
					type: 'query',
					property: 'sort_direction',
				},
			},
		},
	];
}
