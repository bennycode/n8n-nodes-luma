import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { LUMA_CREDENTIAL_NAME, PAGE_SIZE } from '../Luma/shared/constants';
import { lumaApiRequest } from '../Luma/shared/transport';
import {
	normalizeEventTypes,
	sameEventTypes,
	WEBHOOK_EVENT_OPTIONS,
} from '../Luma/shared/webhooks';
import { verifyLumaSignature } from './signature';

type LumaWebhook = {
	id: string;
	url: string;
	event_types: string[];
	status: 'active' | 'paused';
	secret: string;
};

type WebhookListResponse = {
	entries: LumaWebhook[];
	has_more: boolean;
	next_cursor?: string;
};

/** Upper bound for the webhook listing loop, so a misbehaving API cannot keep us busy forever. */
const MAX_WEBHOOK_PAGES = 20;

function toStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((entry): entry is string => typeof entry === 'string')
		: [];
}

async function findWebhookByUrl(
	this: IHookFunctions,
	url: string,
): Promise<LumaWebhook | undefined> {
	let cursor: string | undefined;
	for (let page = 0; page < MAX_WEBHOOK_PAGES; page++) {
		const response: WebhookListResponse = await lumaApiRequest.call(
			this,
			'GET',
			'/v1/webhooks/list',
			{
				pagination_limit: PAGE_SIZE,
				pagination_cursor: cursor,
			},
		);
		const match = response.entries.find((webhook) => webhook.url === url);
		if (match) return match;
		if (!response.has_more || !response.next_cursor) return undefined;
		cursor = response.next_cursor;
	}
	return undefined;
}

export class LumaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Luma Trigger',
		name: 'lumaTrigger',
		icon: { light: 'file:../../icons/luma.svg', dark: 'file:../../icons/luma.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when something happens on Luma',
		defaults: {
			name: 'Luma Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: LUMA_CREDENTIAL_NAME,
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: WEBHOOK_EVENT_OPTIONS,
				default: [],
				required: true,
				description: 'Which Luma events start the workflow',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) return false;
				const webhookData = this.getWorkflowStaticData('node');
				const eventTypes = normalizeEventTypes(toStringArray(this.getNodeParameter('events')));

				const existing = await findWebhookByUrl.call(this, webhookUrl);
				if (!existing) return false;

				if (existing.status !== 'active' || !sameEventTypes(existing.event_types, eventTypes)) {
					// Luma allows one registration per URL, so bring the existing one in line instead of adding another
					await lumaApiRequest.call(
						this,
						'POST',
						'/v2/webhooks/update',
						{},
						{
							id: existing.id,
							event_types: eventTypes,
							status: 'active',
						},
					);
				}

				webhookData.webhookId = existing.id;
				webhookData.webhookSecret = existing.secret;
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const eventTypes = normalizeEventTypes(toStringArray(this.getNodeParameter('events')));

				const response: LumaWebhook = await lumaApiRequest.call(
					this,
					'POST',
					'/v2/webhooks/create',
					{},
					{
						url: webhookUrl,
						event_types: eventTypes,
					},
				);

				if (!response.id || !response.secret) return false;
				webhookData.webhookId = response.id;
				webhookData.webhookSecret = response.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (typeof webhookData.webhookId !== 'string') return true;

				try {
					await lumaApiRequest.call(
						this,
						'POST',
						'/v1/webhooks/delete',
						{},
						{ id: webhookData.webhookId },
					);
				} catch (error) {
					this.logger.warn(`Could not delete Luma webhook ${webhookData.webhookId}`, {
						error: error instanceof Error ? error.message : String(error),
					});
					return false;
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').webhookSecret;
		const headers = this.getHeaderData();

		const isValid =
			typeof secret === 'string' &&
			verifyLumaSignature({
				secret,
				rawBody: request.rawBody ?? '',
				signatureHeader: headers['webhook-signature'],
			});

		if (!isValid) {
			this.getResponseObject().status(401).send('Invalid signature').end();
			return { noWebhookResponse: true };
		}

		const body: IDataObject = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
