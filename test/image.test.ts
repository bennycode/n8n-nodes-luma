import type { IExecuteSingleFunctions, IHttpRequestOptions, IN8nHttpFullResponse } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';
import { setImageContentType, uploadImage } from '../nodes/Luma/shared/image';

function createContext(mimeType: string, buffer = Buffer.from('png-bytes')) {
	const httpRequest = vi.fn().mockResolvedValue({});
	const context: Partial<IExecuteSingleFunctions> = {
		getNodeParameter: () => 'data',
		getNode: () => ({
			id: 'test',
			name: 'Luma',
			type: 'n8n-nodes-luma.luma',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		helpers: {
			assertBinaryData: () => ({ data: '', mimeType, fileName: 'cover.png' }),
			getBinaryDataBuffer: async () => buffer,
			httpRequest,
		} as unknown as IExecuteSingleFunctions['helpers'],
	};
	return { context: context as IExecuteSingleFunctions, httpRequest };
}

const response: IN8nHttpFullResponse = { statusCode: 200, headers: {}, body: {} };

describe('setImageContentType', () => {
	it('copies the binary mime type into the request body', async () => {
		const { context } = createContext('image/png');
		const options: IHttpRequestOptions = { url: '/v1/images/create-upload-url' };
		expect(await setImageContentType.call(context, options)).toEqual({
			url: '/v1/images/create-upload-url',
			body: { content_type: 'image/png' },
		});
	});

	it('rejects unsupported image types before calling Luma', async () => {
		const { context } = createContext('image/gif');
		await expect(setImageContentType.call(context, { url: '' })).rejects.toBeInstanceOf(NodeOperationError);
	});
});

describe('uploadImage', () => {
	it('PUTs the binary to the upload URL and returns the file URL', async () => {
		const { context, httpRequest } = createContext('image/png');
		const items = [{ json: { upload_url: 'https://s3.example/upload', file_url: 'https://images.lumacdn.com/x.png' } }];

		const result = await uploadImage.call(context, items, response);

		expect(httpRequest).toHaveBeenCalledWith({
			method: 'PUT',
			url: 'https://s3.example/upload',
			body: Buffer.from('png-bytes'),
			headers: { 'Content-Type': 'image/png' },
		});
		expect(result[0].json).toEqual({
			file_url: 'https://images.lumacdn.com/x.png',
			content_type: 'image/png',
			file_name: 'cover.png',
			size: 9,
		});
	});

	it('fails clearly when Luma returns no upload URL', async () => {
		const { context } = createContext('image/png');
		await expect(uploadImage.call(context, [{ json: {} }], response)).rejects.toThrow('did not return an upload URL');
	});
});
