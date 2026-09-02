import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { PAGE_SIZE } from '../shared/constants';
import { lumaApiRequest } from '../shared/transport';

type EventEntry = {
	id: string;
	name: string;
	start_at: string;
	url: string;
};

type EventListResponse = {
	entries: EventEntry[];
	has_more: boolean;
	next_cursor?: string;
};

/**
 * Luma has no server-side name search for events, so the filter is applied to
 * each page returned by the API. Newest events come first.
 */
export async function getEvents(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const response: EventListResponse = await lumaApiRequest.call(this, 'GET', '/v1/calendars/events/list', {
		pagination_limit: PAGE_SIZE,
		pagination_cursor: paginationToken,
		sort_column: 'start_at',
		sort_direction: 'desc',
	});

	const needle = filter?.trim().toLowerCase() ?? '';
	const entries = needle
		? response.entries.filter((entry) => entry.name.toLowerCase().includes(needle))
		: response.entries;

	const results: INodeListSearchItems[] = entries.map((entry) => ({
		name: `${entry.name} (${entry.start_at.slice(0, 10)})`,
		value: entry.id,
		url: entry.url,
	}));

	return {
		results,
		paginationToken: response.has_more ? response.next_cursor : undefined,
	};
}
