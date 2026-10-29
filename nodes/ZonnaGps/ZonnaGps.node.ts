import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type JsonObject,
} from 'n8n-workflow';
import { apiBase } from '../../lib/signature';

/**
 * ZonnaGPS node: the same operations as the Zapier and Make apps, against public API v1.
 * Each operation needs its own permission on the API key (shown in its description).
 */
export class ZonnaGps implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZonnaGPS',
		name: 'zonnaGps',
		icon: { light: 'file:zonnagps.svg', dark: 'file:zonnagps.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with ZonnaGPS vehicles, drivers, places, transport documents (DeCA) and data tables',
		defaults: { name: 'ZonnaGPS' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'zonnaGpsApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Data Table', value: 'report' },
					{ name: 'Driver', value: 'driver' },
					{ name: 'Place', value: 'place' },
					{ name: 'Transport Document (DeCA)', value: 'deca' },
					{ name: 'Vehicle', value: 'vehicle' },
				],
				default: 'vehicle',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['vehicle'] } },
				options: [
					{ name: 'Assign Driver', value: 'assignDriver', action: 'Assign a driver to a vehicle', description: 'Assign a driver to the vehicle (requires assets.assign_driver)' },
					{ name: 'Get', value: 'get', action: 'Get a vehicle', description: 'Get the vehicle details (requires assets.read)' },
					{ name: 'Get Latest Position', value: 'position', action: 'Get the latest position', description: 'Get the last known position (requires positions.latest)' },
					{ name: 'Search', value: 'search', action: 'Search vehicles', description: 'Search by license plate or name (requires assets.list)' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['driver'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a driver', description: 'Create a new driver (requires drivers.create)' },
					{ name: 'Search', value: 'search', action: 'Search drivers', description: 'Search by name or tax ID (requires drivers.list)' },
				],
				default: 'search',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['place'] } },
				options: [{ name: 'Create', value: 'create', action: 'Create a place', description: 'Save a loading or unloading place (requires places.create)' }],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['deca'] } },
				options: [{ name: 'Create Draft', value: 'createDraft', action: 'Create a transport document draft', description: 'Create a DeCA draft to review and issue in ZonnaGPS (requires deca.drafts.create)' }],
				default: 'createDraft',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['report'] } },
				options: [{ name: 'Get', value: 'get', action: 'Get a data table', description: 'Get the rows of a data table (requires reports.read)' }],
				default: 'get',
			},

			// Vehicle
			{ displayName: 'License Plate or Name', name: 'search', type: 'string', default: '', description: 'Text to search for in the license plate or vehicle name', displayOptions: { show: { resource: ['vehicle'], operation: ['search'] } } },
			{ displayName: 'Vehicle ID', name: 'assetId', type: 'number', default: 0, required: true, displayOptions: { show: { resource: ['vehicle'], operation: ['get', 'position', 'assignDriver'] } } },
			{ displayName: 'Driver ID', name: 'driverId', type: 'number', default: 0, required: true, displayOptions: { show: { resource: ['vehicle'], operation: ['assignDriver'] } } },

			// Driver
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Text to search for in the driver name', displayOptions: { show: { resource: ['driver'], operation: ['search'] } } },
			{ displayName: 'Tax ID (NIF)', name: 'nif', type: 'string', default: '', description: 'Spanish tax identification number of the driver', displayOptions: { show: { resource: ['driver'], operation: ['search', 'create'] } } },
			{ displayName: 'Name', name: 'driverName', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['driver'], operation: ['create'] } } },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '', displayOptions: { show: { resource: ['driver'], operation: ['create'] } } },

			// Place
			{ displayName: 'Name', name: 'placeName', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Address', name: 'address', type: 'string', default: '', displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Latitude', name: 'latitude', type: 'number', typeOptions: { numberPrecision: 6 }, default: 0, required: true, displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Longitude', name: 'longitude', type: 'number', typeOptions: { numberPrecision: 6 }, default: 0, required: true, displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Radius (Meters)', name: 'radius', type: 'number', default: 150, description: 'Radius around the coordinates that counts as being at the place', displayOptions: { show: { resource: ['place'] } } },

			// Transport document (DeCA)
			{
				displayName: 'Document Type',
				name: 'documentType',
				type: 'options',
				options: [
					{ name: 'Goods', value: 'deca_goods' },
					{ name: 'Passengers', value: 'deca_passengers' },
				],
				default: 'deca_goods',
				displayOptions: { show: { resource: ['deca'] } },
			},
			{ displayName: 'Service Start', name: 'serviceStartsAt', type: 'string', default: '', required: true, placeholder: 'e.g. 2026-10-20 or 2026-10-20T08:00', description: 'Date, or date and time, when the transport service starts', displayOptions: { show: { resource: ['deca'] } } },
			{ displayName: 'Driver ID', name: 'decaDriverId', type: 'number', default: 0, description: 'Optional driver to assign to the document (0 for none)', displayOptions: { show: { resource: ['deca'] } } },
			{ displayName: 'Document Data (JSON)', name: 'decaData', type: 'json', default: '{\n  "vehicle_plate": "1234ABC",\n  "origin": "Madrid",\n  "destination": "Toledo"\n}', description: 'The "data" fields of the transport document, as described in the API documentation (/api/docs)', displayOptions: { show: { resource: ['deca'] } } },

			// Data tables
			{
				displayName: 'Table',
				name: 'dataset',
				type: 'options',
				options: [
					{ name: 'Alerts', value: 'alerts' },
					{ name: 'Daily Driver Metrics', value: 'driver-daily' },
					{ name: 'Daily Vehicle Metrics', value: 'vehicle-daily' },
					{ name: 'Issued Transport Documents (DeCA)', value: 'deca' },
					{ name: 'Vehicles', value: 'vehicles' },
				],
				default: 'vehicle-daily',
				displayOptions: { show: { resource: ['report'] } },
			},
			{ displayName: 'From Date', name: 'from', type: 'string', default: '', placeholder: 'YYYY-MM-DD', description: 'First day to include (optional)', displayOptions: { show: { resource: ['report'] } } },
			{ displayName: 'To Date', name: 'to', type: 'string', default: '', placeholder: 'YYYY-MM-DD', description: 'Last day to include (optional)', displayOptions: { show: { resource: ['report'] } } },
			{ displayName: 'Return All', name: 'returnAll', type: 'boolean', description: 'Whether to return all results or only up to a given limit', default: true, displayOptions: { show: { resource: ['report'] } } },
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('zonnaGpsApi');
		const base = apiBase(credentials.baseUrl as string | undefined);

		const call = async (method: IHttpRequestMethods, path: string, qs?: IDataObject, body?: IDataObject): Promise<IDataObject> => {
			try {
				return (await this.helpers.httpRequestWithAuthentication.call(this, 'zonnaGpsApi', {
					method,
					url: `${base}${path}`,
					qs,
					body,
					json: true,
					headers: { Accept: 'application/json' },
				})) as IDataObject;
			} catch (error) {
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let result: IDataObject | IDataObject[] = {};

				if (resource === 'vehicle' && operation === 'search') {
					result = (await call('GET', '/assets', { search: this.getNodeParameter('search', i) as string, per_page: 50 })).data as IDataObject[];
				} else if (resource === 'vehicle' && operation === 'get') {
					result = (await call('GET', `/assets/${this.getNodeParameter('assetId', i) as number}`)).data as IDataObject;
				} else if (resource === 'vehicle' && operation === 'position') {
					result = ((await call('GET', `/assets/${this.getNodeParameter('assetId', i) as number}/position`)).data as IDataObject) ?? {};
				} else if (resource === 'vehicle' && operation === 'assignDriver') {
					result = (await call('PUT', `/assets/${this.getNodeParameter('assetId', i) as number}/driver`, undefined, { driver_id: this.getNodeParameter('driverId', i) as number })).data as IDataObject;
				} else if (resource === 'driver' && operation === 'search') {
					const qs: IDataObject = { per_page: 50 };
					const name = this.getNodeParameter('name', i) as string;
					const nif = this.getNodeParameter('nif', i) as string;
					if (name) qs.search = name;
					if (nif) qs.nif = nif;
					result = (await call('GET', '/drivers', qs)).data as IDataObject[];
				} else if (resource === 'driver' && operation === 'create') {
					result = (await call('POST', '/drivers', undefined, {
						name: this.getNodeParameter('driverName', i) as string,
						nif: (this.getNodeParameter('nif', i) as string) || null,
						phone: (this.getNodeParameter('phone', i) as string) || null,
					})).data as IDataObject;
				} else if (resource === 'place') {
					result = (await call('POST', '/places', undefined, {
						name: this.getNodeParameter('placeName', i) as string,
						address: (this.getNodeParameter('address', i) as string) || null,
						latitude: this.getNodeParameter('latitude', i) as number,
						longitude: this.getNodeParameter('longitude', i) as number,
						radius_meters: this.getNodeParameter('radius', i) as number,
					})).data as IDataObject;
				} else if (resource === 'deca') {
					const raw = this.getNodeParameter('decaData', i);
					let data: IDataObject;
					try {
						data = (typeof raw === 'string' ? JSON.parse(raw || '{}') : raw) as IDataObject;
					} catch {
						throw new NodeOperationError(this.getNode(), '"Document Data (JSON)" is not valid JSON', { itemIndex: i });
					}
					const type = this.getNodeParameter('documentType', i) as string;
					const driverId = this.getNodeParameter('decaDriverId', i) as number;
					result = (await call('POST', '/transport-documents', undefined, {
						mode: type === 'deca_passengers' ? 'passengers' : 'goods',
						document_type: type,
						driver_id: driverId || null,
						service_starts_at: this.getNodeParameter('serviceStartsAt', i) as string,
						data,
					})).data as IDataObject;
				} else if (resource === 'report') {
					const dataset = this.getNodeParameter('dataset', i) as string;
					const qs: IDataObject = { format: 'json', per_page: 1000, page: 1 };
					const from = this.getNodeParameter('from', i) as string;
					const to = this.getNodeParameter('to', i) as string;
					if (from) qs.from = from;
					if (to) qs.to = to;
					const all = this.getNodeParameter('returnAll', i) as boolean;
					const rows: IDataObject[] = [];
					for (;;) {
						const page = await call('GET', `/reports/${dataset}`, qs);
						rows.push(...((page.data as IDataObject[]) ?? []));
						const meta = page.meta as IDataObject;
						if (!all || !meta || (meta.current_page as number) >= (meta.last_page as number)) break;
						qs.page = (qs.page as number) + 1;
					}
					result = rows;
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${resource}/${operation}`, { itemIndex: i });
				}

				for (const row of Array.isArray(result) ? result : [result]) {
					out.push({ json: row, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// API failures arrive as HTTP errors; our own errors (e.g. unsupported operation) already carry their message.
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [out];
	}
}
