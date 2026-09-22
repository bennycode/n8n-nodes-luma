import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { getEvents } from './listSearch/getEvents';
import { getContactTags, getEventTags } from './loadOptions/getTags';
import { getTicketTypes } from './loadOptions/getTicketTypes';
import { calendarDescription } from './resources/calendar';
import { contactDescription } from './resources/contact';
import { eventDescription } from './resources/event';
import { guestDescription } from './resources/guest';
import { imageDescription } from './resources/image';
import { contactTagDescription, eventTagDescription } from './resources/tag';
import { ticketTypeDescription } from './resources/ticketType';
import { LUMA_BASE_URL, LUMA_CREDENTIAL_NAME } from './shared/constants';

export class Luma implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Luma',
		name: 'luma',
		icon: { light: 'file:../../icons/luma.svg', dark: 'file:../../icons/luma.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage events, guests and contacts on Luma',
		defaults: {
			name: 'Luma',
		},
		// Deliberately not a tool: the Image resource works on binary data, which AI tools cannot pass
		usableAsTool: undefined,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: LUMA_CREDENTIAL_NAME,
				required: true,
			},
		],
		requestDefaults: {
			baseURL: LUMA_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Calendar',
						value: 'calendar',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Contact Tag',
						value: 'contactTag',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Event Tag',
						value: 'eventTag',
					},
					{
						name: 'Guest',
						value: 'guest',
					},
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Ticket Type',
						value: 'ticketType',
					},
				],
				default: 'event',
			},
			...calendarDescription,
			...contactDescription,
			...contactTagDescription,
			...eventDescription,
			...eventTagDescription,
			...guestDescription,
			...imageDescription,
			...ticketTypeDescription,
		],
	};

	methods = {
		listSearch: {
			getEvents,
		},
		loadOptions: {
			getContactTags,
			getEventTags,
			getTicketTypes,
		},
	};
}
