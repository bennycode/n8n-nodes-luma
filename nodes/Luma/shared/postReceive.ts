import {
	NodeApiError,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type JsonObject,
} from 'n8n-workflow';

const DESCRIPTIONS_BY_STATUS: Record<number, string> = {
	401: 'Check that the API key in your Luma credential is valid and has not been revoked.',
	403: 'The API key does not have access to this calendar or event.',
	404: 'Check the ID. Event IDs start with "evt-" and guest IDs with "gst-".',
	429: 'Luma allows 200 requests per minute for calendar API keys and 500 for organization keys. Use the batching settings under Options to space out requests.',
};

/**
 * Identifier parameters, in the order they should be reported. Only one of
 * these is on screen for any given operation; the rest resolve to the fallback.
 */
const IDENTIFIER_PARAMETERS = ['event', 'guestId', 'ticketTypeId', 'tagId', 'tag'] as const;

/**
 * The identifier the failing request was about, so a 404 can name it. Reading a
 * parameter that the current operation does not define returns the fallback,
 * and `extractValue` unwraps resourceLocator values to the bare ID.
 */
function findIdentifier(context: IExecuteSingleFunctions): string | undefined {
	for (const parameter of IDENTIFIER_PARAMETERS) {
		const value = context.getNodeParameter(parameter, '', { extractValue: true });
		if (typeof value === 'string' && value !== '') {
			return value;
		}
	}
	return undefined;
}

function readApiMessage(body: unknown): string | undefined {
	if (typeof body === 'object' && body !== null && 'message' in body) {
		const { message } = body;
		return typeof message === 'string' && message.length > 0 ? message : undefined;
	}
	return undefined;
}

/**
 * Turns Luma's `{ message, code }` error bodies into readable errors. Requests
 * using this handler must set `ignoreHttpStatusErrors: true`, otherwise n8n
 * throws its generic error before this function runs.
 */
export async function handleLumaError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) {
		return items;
	}

	const apiMessage = readApiMessage(response.body);
	const errorBody: JsonObject = {
		statusCode: response.statusCode,
		message: apiMessage ?? null,
	};

	const identifier = response.statusCode === 404 ? findIdentifier(this) : undefined;
	const hint = DESCRIPTIONS_BY_STATUS[response.statusCode];

	// Naming the identifier is more useful than Luma's generic "not found", so it
	// takes over the message and the API's own wording moves into the description.
	throw new NodeApiError(this.getNode(), errorBody, {
		message: identifier
			? `Luma could not find "${identifier}"`
			: (apiMessage ?? `Luma request failed with status ${response.statusCode}`),
		description: [identifier ? apiMessage : undefined, hint].filter(Boolean).join(' ') || undefined,
		httpCode: String(response.statusCode),
	});
}

/** Luma answers write operations with an empty object. Return something useful instead. */
export async function returnSuccess(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.map((item) =>
		Object.keys(item.json).length === 0 ? { ...item, json: { success: true } } : item,
	);
}
