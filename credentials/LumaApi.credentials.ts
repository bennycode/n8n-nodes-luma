import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LumaApi implements ICredentialType {
	name = 'lumaApi';

	displayName = 'Luma API';

	icon: Icon = { light: 'file:../icons/luma.svg', dark: 'file:../icons/luma.dark.svg' };

	documentationUrl = 'https://docs.luma.com/reference/getting-started-with-your-api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Generate a key under Settings > Options > API in your Luma calendar. Calendar keys allow 200 requests per minute, organization keys 500.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-luma-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://public-api.luma.com',
			url: '/v1/users/get-self',
			method: 'GET',
		},
	};
}
