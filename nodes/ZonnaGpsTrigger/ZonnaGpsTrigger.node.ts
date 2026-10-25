import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { apiBase, verifyZonnaSignature } from '../../lib/signature';

/**
 * Trigger de ZonnaGPS: al activar el flujo suscribe la URL del webhook de n8n a los eventos elegidos
 * (POST /webhooks, permisos webhooks.create/list/delete) y guarda el secreto de firma; al
 * desactivarlo la da de baja. Cada envío se comprueba con X-Zonna-Signature antes de seguir.
 */
export class ZonnaGpsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZonnaGPS Trigger',
		name: 'zonnaGpsTrigger',
		icon: 'file:zonnagps.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Arranca el flujo con eventos de ZonnaGPS (alertas, geocercas, DeCA, sin comunicación)',
		defaults: { name: 'ZonnaGPS Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'zonnaGpsApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [
			{
				displayName: 'Eventos',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Alerta Disparada', value: 'alert.triggered' },
					{ name: 'DeCA Emitido', value: 'deca.issued' },
					{ name: 'Entrada en Geocerca', value: 'geofence.enter' },
					{ name: 'Salida De Geocerca', value: 'geofence.exit' },
					{ name: 'Vehículo Sin Comunicación', value: 'vehicle.offline' },
				],
				default: ['alert.triggered'],
			},
			{
				displayName: 'Comprobar Firma',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description: 'Whether to reject requests whose X-Zonna-Signature does not match the stored secret',
			},
			{
				displayName: 'Incluir Envíos De Prueba',
				name: 'includeTests',
				type: 'boolean',
				default: false,
				description: 'Whether to also start the workflow with the test event (test.ping) sent from Ajustes → Integraciones',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return false;
				const credentials = await this.getCredentials('zonnaGpsApi');
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'zonnaGpsApi', {
					method: 'GET',
					url: `${apiBase(credentials.baseUrl as string | undefined)}/webhooks`,
					json: true,
				})) as { data?: Array<{ id: number }> };
				const exists = (response.data ?? []).some((hook) => hook.id === staticData.webhookId);
				if (!exists) {
					delete staticData.webhookId;
					delete staticData.secret;
				}
				return exists;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('zonnaGpsApi');
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'zonnaGpsApi', {
					method: 'POST',
					url: `${apiBase(credentials.baseUrl as string | undefined)}/webhooks`,
					json: true,
					body: { url: this.getNodeWebhookUrl('default'), events: this.getNodeParameter('events') as string[], name: 'n8n' },
				})) as { data: { id: number }; secret: string };
				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = response.data.id;
				staticData.secret = response.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.webhookId) {
					const credentials = await this.getCredentials('zonnaGpsApi');
					try {
						await this.helpers.httpRequestWithAuthentication.call(this, 'zonnaGpsApi', {
							method: 'DELETE',
							url: `${apiBase(credentials.baseUrl as string | undefined)}/webhooks/${staticData.webhookId as number}`,
							json: true,
						});
					} catch {
						// Ya borrada (por ejemplo, desde Ajustes → Integraciones): no impide desactivar el flujo.
					}
				}
				delete staticData.webhookId;
				delete staticData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject() as unknown as { rawBody?: Buffer; body: IDataObject };
		const body = this.getBodyData() as IDataObject;
		const staticData = this.getWorkflowStaticData('node');

		if (this.getNodeParameter('verifySignature') as boolean) {
			const raw = request.rawBody ?? Buffer.from(JSON.stringify(body));
			const header = this.getHeaderData()['x-zonna-signature'] as string | undefined;
			if (!verifyZonnaSignature(raw, header, (staticData.secret as string) ?? '')) {
				const response = this.getResponseObject();
				response.status(401).json({ message: 'Firma no válida.' });
				return { noWebhookResponse: true };
			}
		}

		const isTest = body.test === true || body.event === 'test.ping';
		const events = this.getNodeParameter('events') as string[];
		if ((isTest && !(this.getNodeParameter('includeTests') as boolean)) || (!isTest && !events.includes(body.event as string))) {
			return { webhookResponse: { received: true, ignored: true } };
		}

		return { workflowData: [this.helpers.returnJsonArray([body])] };
	}
}
