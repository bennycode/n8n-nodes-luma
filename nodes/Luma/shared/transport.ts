import type {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { LUMA_BASE_URL, LUMA_CREDENTIAL_NAME } from './constants';

/** Authenticated request helper for code paths outside declarative routing. */
export async function lumaApiRequest(
	this: ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		method,
		qs,
		url: `${LUMA_BASE_URL}${endpoint}`,
		json: true,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, LUMA_CREDENTIAL_NAME, options);
}
