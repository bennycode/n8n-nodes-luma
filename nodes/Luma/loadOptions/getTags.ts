import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { lumaApiRequest } from '../shared/transport';

type Tag = {
	id: string;
	name: string;
	color: string;
};

type TagListResponse = {
	entries: Tag[];
};

async function listTags(this: ILoadOptionsFunctions, kind: 'contact' | 'event'): Promise<INodePropertyOptions[]> {
	const response: TagListResponse = await lumaApiRequest.call(this, 'GET', `/v1/calendars/${kind}-tags/list`);
	return response.entries
		.map((tag) => ({ name: tag.name, value: tag.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getContactTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return await listTags.call(this, 'contact');
}

export async function getEventTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return await listTags.call(this, 'event');
}
