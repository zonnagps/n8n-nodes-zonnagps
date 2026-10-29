import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

/** ZonnaGPS API key (Settings → Integrations). The credential test needs the webhooks.list permission. */
export class ZonnaGpsApi implements ICredentialType {
	name = 'zonnaGpsApi';

	displayName = 'ZonnaGPS API';

	documentationUrl = 'https://app.zonnagps.es/api/docs';

	icon = 'file:zonnagps.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create it in ZonnaGPS: Settings → Integrations → New key',
		},
		{
			displayName: 'Server URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.zonnagps.es',
			description: 'ZonnaGPS server address. Use https://pruebas.app.zonnagps.es for the staging environment.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/public/v1',
			url: '/webhooks',
		},
	};
}
