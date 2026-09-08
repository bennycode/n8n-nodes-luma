import type { ILoadOptionsFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { getEvents } from '../nodes/Luma/listSearch/getEvents';
import { getContactTags, getEventTags } from '../nodes/Luma/loadOptions/getTags';
import { getTicketTypes } from '../nodes/Luma/loadOptions/getTicketTypes';

type Call = { url: string; qs: Record<string, unknown> };

/**
 * Stubs the authenticated request helper the transport uses and records what
 * each method asked Luma for, so the tests can assert the query as well as the
 * mapped result.
 */
function createContext(response: unknown, currentParameters: Record<string, unknown> = {}) {
	const calls: Call[] = [];
	const httpRequestWithAuthentication = vi.fn(
		async (_credential: string, options: IHttpRequestOptions) => {
			calls.push({ url: options.url, qs: (options.qs ?? {}) as Record<string, unknown> });
			return response;
		},
	);

	const context = {
		helpers: { httpRequestWithAuthentication },
		getCurrentNodeParameter: (name: string) => currentParameters[name],
	} as unknown as ILoadOptionsFunctions;

	return { context, calls };
}

describe('getEvents', () => {
	const entries = [
		{ id: 'evt-1', name: 'Berlin Meetup', start_at: '2026-05-01T18:00:00Z', url: 'https://lu.ma/a' },
		{ id: 'evt-2', name: 'Vienna Workshop', start_at: '2026-06-02T18:00:00Z', url: 'https://lu.ma/b' },
	];

	it('lists newest first and labels entries with their date', async () => {
		const { context, calls } = createContext({ entries, has_more: false });
		const result = await getEvents.call(context);

		expect(calls[0].url).toBe('https://public-api.luma.com/v1/calendars/events/list');
		expect(calls[0].qs).toMatchObject({ sort_column: 'start_at', sort_direction: 'desc' });
		expect(result.results).toEqual([
			{ name: 'Berlin Meetup (2026-05-01)', value: 'evt-1', url: 'https://lu.ma/a' },
			{ name: 'Vienna Workshop (2026-06-02)', value: 'evt-2', url: 'https://lu.ma/b' },
		]);
	});

	it('filters case-insensitively because Luma has no server-side search', async () => {
		const { context, calls } = createContext({ entries, has_more: false });
		const result = await getEvents.call(context, 'VIENNA');

		expect(result.results.map((item) => item.value)).toEqual(['evt-2']);
		// The filter must not be forwarded as a query parameter Luma would ignore.
		expect(calls[0].qs).not.toHaveProperty('query');
	});

	it('ignores surrounding whitespace in the filter', async () => {
		const { context } = createContext({ entries, has_more: false });
		const result = await getEvents.call(context, '  berlin  ');
		expect(result.results.map((item) => item.value)).toEqual(['evt-1']);
	});

	it('passes the cursor through and reports the next one only while more remain', async () => {
		const more = createContext({ entries, has_more: true, next_cursor: 'cur-2' });
		const first = await getEvents.call(more.context, undefined, 'cur-1');
		expect(more.calls[0].qs.pagination_cursor).toBe('cur-1');
		expect(first.paginationToken).toBe('cur-2');

		const last = createContext({ entries, has_more: false, next_cursor: 'cur-3' });
		const final = await getEvents.call(last.context);
		expect(final.paginationToken).toBeUndefined();
	});
});

describe('tag load options', () => {
	const entries = [
		{ id: 'tag-2', name: 'Speakers', color: 'blue' },
		{ id: 'tag-1', name: 'Attendees', color: 'red' },
	];

	it('sorts contact tags by name', async () => {
		const { context, calls } = createContext({ entries });
		const result = await getContactTags.call(context);

		expect(calls[0].url).toBe('https://public-api.luma.com/v1/calendars/contact-tags/list');
		expect(result).toEqual([
			{ name: 'Attendees', value: 'tag-1' },
			{ name: 'Speakers', value: 'tag-2' },
		]);
	});

	it('reads event tags from the event endpoint', async () => {
		const { context, calls } = createContext({ entries });
		await getEventTags.call(context);
		expect(calls[0].url).toBe('https://public-api.luma.com/v1/calendars/event-tags/list');
	});
});

describe('getTicketTypes', () => {
	const entries = [
		{ id: 'ttype-1', name: 'General', type: 'free', is_hidden: false },
		{ id: 'ttype-2', name: 'VIP', type: 'paid', is_hidden: true },
	];

	it('returns nothing until an event is selected', async () => {
		const { context, calls } = createContext({ entries });
		expect(await getTicketTypes.call(context)).toEqual([]);
		expect(calls).toHaveLength(0);
	});

	it('requests hidden types for the selected event and labels them', async () => {
		const { context, calls } = createContext({ entries }, { event: 'evt-1' });
		const result = await getTicketTypes.call(context);

		expect(calls[0].qs).toEqual({ event_id: 'evt-1', include_hidden: true });
		expect(result).toEqual([
			{ name: 'General (free)', value: 'ttype-1' },
			{ name: 'VIP (paid, hidden)', value: 'ttype-2' },
		]);
	});
});
