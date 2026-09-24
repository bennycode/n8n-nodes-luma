import type { INodeProperties } from 'n8n-workflow';
import { setImageContentType, uploadImage } from '../../shared/image';
import { handleLumaError } from '../../shared/postReceive';

const showOnlyForImages = {
	resource: ['image'],
};

export const imageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForImages },
		options: [
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload an image',
				description: 'Upload a JPEG or PNG to the Luma CDN for use as a cover or in descriptions',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/images/create-upload-url',
						ignoreHttpStatusErrors: true,
					},
					send: {
						preSend: [setImageContentType],
					},
					output: {
						postReceive: [handleLumaError, uploadImage],
					},
				},
			},
		],
		default: 'upload',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the image',
		displayOptions: { show: showOnlyForImages },
	},
];
