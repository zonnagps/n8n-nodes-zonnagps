import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

/** Clave de API de ZonnaGPS (Ajustes → Integraciones del mapa). La prueba usa el permiso webhooks.list. */
export class ZonnaGpsApi implements ICredentialType {
	name = 'zonnaGpsApi';

	displayName = 'ZonnaGPS API';

	documentationUrl = 'https://app.zonnagps.es/api/docs';

	icon = 'file:zonnagps.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Clave de API',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Créala en ZonnaGPS: Ajustes → Integraciones → Nueva clave',
		},
		{
			displayName: 'Servidor',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.zonnagps.es',
			description: 'Para el entorno de pruebas: https://pruebas.app.zonnagps.es',
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
