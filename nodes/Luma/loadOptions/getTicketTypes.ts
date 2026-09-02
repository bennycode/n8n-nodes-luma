import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { lumaApiRequest } from '../shared/transport';

type TicketType = {
	id: string;
	name: string;
	type: 'free' | 'paid';
	is_hidden: boolean;
};

type TicketTypeListResponse = {
	entries: TicketType[];
};

export async function getTicketTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const eventId = this.getCurrentNodeParameter('event', { extractValue: true });
	if (typeof eventId !== 'string' || eventId === '') {
		return [];
	}

	const response: TicketTypeListResponse = await lumaApiRequest.call(this, 'GET', '/v1/events/ticket-types/list', {
		event_id: eventId,
		include_hidden: true,
	});

	return response.entries.map((ticketType) => ({
		name: `${ticketType.name} (${ticketType.type}${ticketType.is_hidden ? ', hidden' : ''})`,
		value: ticketType.id,
	}));
}
