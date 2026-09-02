import type { IExecuteSingleFunctions, IN8nHttpFullResponse } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { handleLumaError, returnSuccess } from '../nodes/Luma/shared/postReceive';

function createContext(): IExecuteSingleFunctions {
	const context: Partial<IExecuteSingleFunctions> = {
		getNode: () => ({
			id: 'test',
			name: 'Luma',
			type: 'n8n-nodes-luma.luma',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
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
		const error = await handleLumaError.call(createContext(), [{ json: {} }], response).catch((e) => e);
		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toBe('You are not signed in.');
		expect(error.httpCode).toBe('401');
		expect(error.description).toContain('API key');
	});

	it('explains rate limits on 429', async () => {
		const response: IN8nHttpFullResponse = { statusCode: 429, headers: {}, body: { message: 'Too many requests' } };
		const error = await handleLumaError.call(createContext(), [{ json: {} }], response).catch((e) => e);
		expect(error.description).toContain('200 requests per minute');
	});

	it('falls back to a status message when the body has none', async () => {
		const response: IN8nHttpFullResponse = { statusCode: 502, headers: {}, body: 'Bad Gateway' };
		const error = await handleLumaError.call(createContext(), [{ json: {} }], response).catch((e) => e);
		expect(error.message).toBe('Luma request failed with status 502');
		expect(error.description).toBeFalsy();
	});
});

describe('returnSuccess', () => {
	it('replaces empty objects and keeps real payloads', async () => {
		const result = await returnSuccess.call(createContext(), [{ json: {} }, { json: { id: 'evt-1' } }], ok);
		expect(result.map((item) => item.json)).toEqual([{ success: true }, { id: 'evt-1' }]);
	});
});
