import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { handleLumaError, returnSuccess } from '../nodes/Luma/shared/postReceive';

function createContext(parameters: Record<string, string> = {}): IExecuteSingleFunctions {
	const context: Partial<IExecuteSingleFunctions> = {
		getNode: () => ({
			id: 'test',
			name: 'Luma',
			type: 'n8n-nodes-luma.luma',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		// n8n returns the fallback for parameters the current operation does not define.
		getNodeParameter: ((name: string, fallback?: unknown) =>
			parameters[name] ?? fallback) as IExecuteSingleFunctions['getNodeParameter'],
	};
	return context as IExecuteSingleFunctions;
}

const ok: IN8nHttpFullResponse = { statusCode: 200, headers: {}, body: { id: 'evt-1' } };

describe('handleLumaError', () => {
	it('passes successful responses through', async () => {
		const items = [{ json: { id: 'evt-1' } }];
		expect(await handleLumaError.call(createContext(), items, ok)).toBe(items);
	});

	it('uses the API message and adds a hint for 401', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 401,
			headers: {},
			body: { message: 'You are not signed in.', code: null },
		};
		const error = await handleLumaError
			.call(createContext(), [{ json: {} }], response)
			.catch((e) => e);
		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toBe('You are not signed in.');
		expect(error.httpCode).toBe('401');
		expect(error.description).toContain('API key');
	});

	it('explains rate limits on 429', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 429,
			headers: {},
			body: { message: 'Too many requests' },
		};
		const error = await handleLumaError
			.call(createContext(), [{ json: {} }], response)
			.catch((e) => e);
		expect(error.description).toContain('200 requests per minute');
	});

	it('names the identifier that was not found on 404', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 404,
			headers: {},
			body: { message: 'Event not found.' },
		};
		const context = createContext({ event: 'evt-Ab12Cd34' });
		const error = await handleLumaError.call(context, [{ json: {} }], response).catch((e) => e);
		expect(error.message).toBe('Luma could not find "evt-Ab12Cd34"');
		// The API's own wording is kept, just moved out of the headline.
		expect(error.description).toContain('Event not found.');
		expect(error.description).toContain('Event IDs start with');
	});

	it('reports the guest identifier when that is the parameter on screen', async () => {
		const response: IN8nHttpFullResponse = { statusCode: 404, headers: {}, body: {} };
		const context = createContext({ guestId: 'gst-Zz99' });
		const error = await handleLumaError.call(context, [{ json: {} }], response).catch((e) => e);
		expect(error.message).toBe('Luma could not find "gst-Zz99"');
	});

	it('keeps the API message on 404 when no identifier is on screen', async () => {
		const response: IN8nHttpFullResponse = {
			statusCode: 404,
			headers: {},
			body: { message: 'Calendar not found.' },
		};
		const error = await handleLumaError
			.call(createContext(), [{ json: {} }], response)
			.catch((e) => e);
		expect(error.message).toBe('Calendar not found.');
	});

	it('falls back to a status message when the body has none', async () => {
		const response: IN8nHttpFullResponse = { statusCode: 502, headers: {}, body: 'Bad Gateway' };
		const error = await handleLumaError
			.call(createContext(), [{ json: {} }], response)
			.catch((e) => e);
		expect(error.message).toBe('Luma request failed with status 502');
		expect(error.description).toBeFalsy();
	});
});

describe('returnSuccess', () => {
	it('replaces empty objects and keeps real payloads', async () => {
		const result = await returnSuccess.call(
			createContext(),
			[{ json: {} }, { json: { id: 'evt-1' } }],
			ok,
		);
		expect(result.map((item) => item.json)).toEqual([{ success: true }, { id: 'evt-1' }]);
	});
});
