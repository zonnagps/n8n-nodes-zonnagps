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
 * ZonnaGPS Trigger: on activation it subscribes the n8n webhook URL to the selected events
 * (POST /webhooks, permissions webhooks.create/list/delete) and stores the signing secret; on
 * deactivation it unsubscribes. Every delivery is checked against X-Zonna-Signature first.
 */
export class ZonnaGpsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZonnaGPS Trigger',
		name: 'zonnaGpsTrigger',
		icon: { light: 'file:zonnagps.svg', dark: 'file:zonnagps.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow on ZonnaGPS events (alerts, geofences, transport documents, offline vehicles)',
		defaults: { name: 'ZonnaGPS Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'zonnaGpsApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Alert Triggered', value: 'alert.triggered' },
					{ name: 'Geofence Entered', value: 'geofence.enter' },
					{ name: 'Geofence Exited', value: 'geofence.exit' },
					{ name: 'Transport Document (DeCA) Issued', value: 'deca.issued' },
					{ name: 'Vehicle Offline', value: 'vehicle.offline' },
				],
				default: ['alert.triggered'],
				description: 'Events that start the workflow',
			},
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description: 'Whether to reject requests whose X-Zonna-Signature does not match the stored secret',
			},
			{
				displayName: 'Include Test Events',
				name: 'includeTests',
				type: 'boolean',
				default: false,
				description: 'Whether to also start the workflow with the test event (test.ping) sent from Settings → Integrations in ZonnaGPS',
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
					} catch (error) {
						// Already deleted (e.g. from Settings → Integrations): it must not block deactivating the workflow.
						this.logger.warn(`ZonnaGPS: could not delete webhook ${staticData.webhookId as number}: ${(error as Error).message}`);
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
				response.status(401).json({ message: 'Invalid signature' });
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
