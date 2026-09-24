import { NodeApiError, type IHookFunctions, type INode } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { toLumaError } from '../nodes/Luma/shared/errors';
import { lumaApiRequest } from '../nodes/Luma/shared/transport';

const node: INode = {
	id: '1',
	name: 'Luma Trigger',
	type: 'n8n-nodes-luma.lumaTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/** What n8n's request helper throws when Luma answers with an error body. */
function n8nWrapped(statusCode: number, message: string): NodeApiError {
	return new NodeApiError(node, { message, code: null }, { httpCode: String(statusCode) });
}

function createContext(failure: unknown) {
	const httpRequestWithAuthentication = vi.fn(async () => {
		throw failure;
	});
	return {
		getNode: () => node,
		helpers: { httpRequestWithAuthentication },
	} as unknown as IHookFunctions;
}

describe('toLumaError', () => {
	it("leads with Luma's message instead of the generic status text", () => {
		const error = toLumaError(node, n8nWrapped(400, 'URL can’t point to internal services.'));
		expect(error.message).toBe('URL can’t point to internal services.');
		expect(error.httpCode).toBe('400');
		expect(error.description).toContain('Luma rejected the request');
	});

	it('adds the credential hint for 401', () => {
		const error = toLumaError(node, n8nWrapped(401, 'You are not signed in.'));
		expect(error.message).toBe('You are not signed in.');
		expect(error.description).toContain('API key in your Luma credential');
	});

	it('reads the message from the raw response when it is only in the cause', () => {
		const raw = Object.assign(new Error('Request failed with status code 429'), {
			response: { status: 429, data: { message: 'Too many requests', code: null } },
		});
		const wrapped = new NodeApiError(node, {}, { message: 'Generic' });
		wrapped.cause = raw;
		const error = toLumaError(node, wrapped);
		expect(error.message).toBe('Too many requests');
		expect(error.httpCode).toBe('429');
		expect(error.description).toContain('200 requests per minute');
	});

	it('does not wrap an error it already produced', () => {
		const once = toLumaError(node, n8nWrapped(404, 'Not found.'));
		expect(toLumaError(node, once)).toBe(once);
	});

	it('keeps unknown errors readable', () => {
		const error = toLumaError(node, new Error('socket hang up'));
		expect(error.message).toBe('socket hang up');
		expect(error.httpCode).toBeNull();
		expect(error.description).toBeUndefined();
	});
});

describe('lumaApiRequest', () => {
	it("rethrows failures with Luma's message", async () => {
		const context = createContext(n8nWrapped(400, 'URL can’t point to internal services.'));
		await expect(
			lumaApiRequest.call(context, 'POST', '/v2/webhooks/create', {}, { url: 'http://localhost' }),
		).rejects.toMatchObject({
			message: 'URL can’t point to internal services.',
			httpCode: '400',
		});
	});
});
