import type {
	IDataObject,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { LUMA_BASE_URL, LUMA_CREDENTIAL_NAME } from './constants';

/** Authenticated request helper for code paths outside declarative routing. */
export async function lumaApiRequest(
	this: ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
	body?: IDataObject,
) {
	const options: IHttpRequestOptions = {
		method,
		qs,
		body,
		url: `${LUMA_BASE_URL}${endpoint}`,
		json: true,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, LUMA_CREDENTIAL_NAME, options);
}
