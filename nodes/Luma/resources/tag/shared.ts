import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { handleLumaError, returnSuccess } from '../../shared/postReceive';

export type TagKind = 'contact' | 'event';

const TAG_COLOR_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Barney', value: 'barney' },
	{ name: 'Blue', value: 'blue' },
	{ name: 'Cranberry', value: 'cranberry' },
	{ name: 'Green', value: 'green' },
	{ name: 'Orange', value: 'orange' },
	{ name: 'Purple', value: 'purple' },
	{ name: 'Red', value: 'red' },
	{ name: 'Yellow', value: 'yellow' },
];

/** Turns a comma separated string into a trimmed list, dropping empty entries. */
export const COMMA_LIST_EXPRESSION = '={{ String($value).split(",").map((entry) => entry.trim()).filter(Boolean) }}';

function bodyField(property: string): INodeProperties['routing'] {
	return { send: { type: 'body', property } };
}

/**
 * Contact tags and event tags share the same API shape under
 * `/v1/calendars/<kind>-tags/`. Only the targets of Apply and Unapply differ.
 */
export function buildTagDescription(kind: TagKind): INodeProperties[] {
	const resource = `${kind}Tag`;
	const label = kind === 'contact' ? 'contact' : 'event';
	const basePath = `/v1/calendars/${kind}-tags`;
	const loadOptionsMethod = kind === 'contact' ? 'getContactTags' : 'getEventTags';

	const showFor = (...operations: string[]) => ({
		show: {
			resource: [resource],
			operation: operations,
		},
	});

	const tagSelect = (name: string, property: string, description: string): INodeProperties => ({
		displayName: 'Tag Name or ID',
		name,
		type: 'options',
		typeOptions: { loadOptionsMethod },
		default: '',
		required: true,
		description: `${description}. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.`,
		routing: bodyField(property),
	});

	const applyTargets: INodeProperties[] =
		kind === 'event'
			? [
					{
						displayName: 'Event IDs',
						name: 'eventIds',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'e.g. evt-Ab12Cd34, evt-Ef56Gh78',
						description: 'Comma-separated IDs of the events on this calendar',
						displayOptions: showFor('apply', 'unapply'),
						routing: {
							send: {
								type: 'body',
								property: 'event_ids',
								value: COMMA_LIST_EXPRESSION,
							},
						},
					},
				]
			: [
					{
						displayName: 'Identify Contacts By',
						name: 'identifyBy',
						type: 'options',
						options: [
							{ name: 'Email', value: 'emails' },
							{ name: 'User ID', value: 'userIds' },
						],
						default: 'emails',
						displayOptions: showFor('apply', 'unapply'),
					},
					{
						displayName: 'Emails',
						name: 'emails',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'name@email.com, other@email.com',
						description: 'Comma-separated email addresses of existing contacts',
						displayOptions: {
							show: {
								...showFor('apply', 'unapply').show,
								identifyBy: ['emails'],
							},
						},
						routing: {
							send: {
								type: 'body',
								property: 'emails',
								value: COMMA_LIST_EXPRESSION,
							},
						},
					},
					{
						displayName: 'User IDs',
						name: 'userIds',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'e.g. usr-Ab12Cd34, usr-Ef56Gh78',
						description: 'Comma-separated Luma user IDs of existing contacts',
						displayOptions: {
							show: {
								...showFor('apply', 'unapply').show,
								identifyBy: ['userIds'],
							},
						},
						routing: {
							send: {
								type: 'body',
								property: 'user_ids',
								value: COMMA_LIST_EXPRESSION,
							},
						},
					},
				];

	const writeRouting = (path: string, success = true) => ({
		request: {
			method: 'POST' as const,
			url: `${basePath}/${path}`,
			ignoreHttpStatusErrors: true,
		},
		output: {
			postReceive: success ? [handleLumaError, returnSuccess] : [handleLumaError],
		},
	});

	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource] } },
			options: [
				{
					name: 'Apply',
					value: 'apply',
					action: `Apply a ${label} tag`,
					description: `Add the tag to ${label}s that are already on the calendar`,
					routing: writeRouting('apply', false),
				},
				{
					name: 'Create',
					value: 'create',
					action: `Create a ${label} tag`,
					description: `Create a ${label} tag on the calendar`,
					routing: writeRouting('create', false),
				},
				{
					name: 'Delete',
					value: 'delete',
					action: `Delete a ${label} tag`,
					description: `Delete a ${label} tag from the calendar`,
					routing: writeRouting('delete'),
				},
				{
					name: 'Get Many',
					value: 'getAll',
					action: `Get many ${label} tags`,
					description: `Get many ${label} tags of the calendar`,
					routing: {
						request: {
							method: 'GET',
							url: `${basePath}/list`,
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
					name: 'Unapply',
					value: 'unapply',
					action: `Remove a ${label} tag`,
					description: `Remove the tag from ${label}s on the calendar`,
					routing: writeRouting('unapply', false),
				},
				{
					name: 'Update',
					value: 'update',
					action: `Update a ${label} tag`,
					description: `Rename or recolor a ${label} tag`,
					routing: writeRouting('update'),
				},
			],
			default: 'getAll',
		},

		// Apply, Unapply
		{
			...tagSelect('tag', 'tag', 'The tag to apply or remove'),
			displayOptions: showFor('apply', 'unapply'),
		},
		...applyTargets,

		// Create
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			required: true,
			displayOptions: showFor('create'),
			routing: bodyField('name'),
		},
		{
			displayName: 'Color',
			name: 'color',
			type: 'options',
			options: TAG_COLOR_OPTIONS,
			default: 'blue',
			displayOptions: showFor('create'),
			routing: bodyField('color'),
		},

		// Delete, Update
		{
			...tagSelect('tagId', 'tag_id', 'The tag to change'),
			displayOptions: showFor('delete', 'update'),
		},
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: showFor('update'),
			options: [
				{
					displayName: 'Color',
					name: 'color',
					type: 'options',
					options: TAG_COLOR_OPTIONS,
					default: 'blue',
					routing: bodyField('color'),
				},
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					routing: bodyField('name'),
				},
			],
		},
	];
}
