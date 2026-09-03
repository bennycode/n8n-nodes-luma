import {
	NodeOperationError,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

function getBinaryPropertyName(context: IExecuteSingleFunctions): string {
	const value = context.getNodeParameter('binaryPropertyName', 'data');
	return typeof value === 'string' && value !== '' ? value : 'data';
}

/** Tells Luma which content type the upload will have, taken from the binary data. */
export async function setImageContentType(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const binary = this.helpers.assertBinaryData(getBinaryPropertyName(this));
	if (!SUPPORTED_IMAGE_TYPES.includes(binary.mimeType)) {
		throw new NodeOperationError(
			this.getNode(),
			`Luma accepts JPEG and PNG images, but the binary data is "${binary.mimeType}"`,
		);
	}

	return { ...requestOptions, body: { content_type: binary.mimeType } };
}

/**
 * Luma answers with a pre-signed `upload_url` and the final `file_url`. This
 * PUTs the binary data to the upload URL so the caller gets a usable file URL
 * in one step.
 */
export async function uploadImage(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const { upload_url: uploadUrl, file_url: fileUrl } = items[0]?.json ?? {};
	if (typeof uploadUrl !== 'string' || typeof fileUrl !== 'string') {
		throw new NodeOperationError(this.getNode(), 'Luma did not return an upload URL');
	}

	const propertyName = getBinaryPropertyName(this);
	const binary = this.helpers.assertBinaryData(propertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(propertyName);

	await this.helpers.httpRequest({
		method: 'PUT',
		url: uploadUrl,
		body: buffer,
		headers: { 'Content-Type': binary.mimeType },
	});

	return [
		{
			json: {
				file_url: fileUrl,
				content_type: binary.mimeType,
				file_name: binary.fileName ?? null,
				size: buffer.length,
			},
		},
	];
}
