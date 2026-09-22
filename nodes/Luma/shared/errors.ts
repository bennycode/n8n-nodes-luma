import { NodeApiError, type INode, type JsonObject } from 'n8n-workflow';

/** Hints shown under Luma's own message for the errors users run into most. */
export const DESCRIPTIONS_BY_STATUS: Record<number, string> = {
	400: 'Luma rejected the request. Check the values you entered against the Luma API documentation.',
	401: 'Check that the API key in your Luma credential is valid and has not been revoked.',
	403: 'The API key does not have access to this calendar or event.',
	404: 'Check the ID. Event IDs start with "evt-" and guest IDs with "gst-".',
	429: 'Luma allows 200 requests per minute for calendar API keys and 500 for organization keys. Use the batching settings under Options to space out requests.',
};

/** Luma's error bodies look like `{ message, code }`. */
export function readApiMessage(body: unknown): string | undefined {
	if (typeof body === 'object' && body !== null && 'message' in body) {
		const { message } = body;
		return typeof message === 'string' && message.length > 0 ? message : undefined;
	}
	return undefined;
}

function readStatusCode(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const candidates: unknown[] = [];
	if ('httpCode' in error) candidates.push(error.httpCode);
	if ('statusCode' in error) candidates.push(error.statusCode);
	if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
		const cause = error.cause as Record<string, unknown>;
		candidates.push(cause.statusCode, cause.httpCode);
		if (typeof cause.response === 'object' && cause.response !== null) {
			candidates.push((cause.response as Record<string, unknown>).status);
		}
	}
	for (const candidate of candidates) {
		const parsed = Number(candidate);
		if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) return parsed;
	}
	return undefined;
}

/**
 * Finds Luma's message in an error thrown by `httpRequestWithAuthentication`.
 * n8n wraps the failed response in a `NodeApiError` whose `description` carries
 * the body's `message`, with the raw response reachable through `cause`.
 */
function readLumaMessage(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
		const cause = error.cause as Record<string, unknown>;
		const response = cause.response as Record<string, unknown> | undefined;
		const fromResponse =
			readApiMessage(response?.data) ??
			readApiMessage(response?.body) ??
			readApiMessage(cause.error) ??
			readApiMessage(cause);
		if (fromResponse) return fromResponse;
	}
	if ('description' in error && typeof error.description === 'string' && error.description !== '') {
		return error.description;
	}
	return undefined;
}

/**
 * Rethrows a failed request from the trigger, list search or load options as
 * an error that leads with Luma's own message instead of n8n's generic
 * "Bad request - please check your parameters".
 */
export function toLumaError(node: INode, error: unknown): NodeApiError {
	if (error instanceof NodeApiError && error.context.lumaHandled === true) {
		return error;
	}
	const statusCode = readStatusCode(error);
	const apiMessage = readLumaMessage(error);
	const fallback = error instanceof Error ? error.message : String(error);
	const errorBody: JsonObject = {
		statusCode: statusCode ?? null,
		message: apiMessage ?? fallback,
	};
	const wrapped = new NodeApiError(node, errorBody, {
		message: apiMessage ?? fallback,
		description: statusCode === undefined ? undefined : DESCRIPTIONS_BY_STATUS[statusCode],
		httpCode: statusCode === undefined ? undefined : String(statusCode),
	});
	wrapped.context.lumaHandled = true;
	return wrapped;
}
