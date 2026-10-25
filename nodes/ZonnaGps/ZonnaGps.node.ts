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
 * Nodo ZonnaGPS: las mismas operaciones que las apps de Zapier y Make, contra la API pública v1.
 * Cada operación necesita su permiso en la clave (se indica en la descripción).
 */
export class ZonnaGps implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZonnaGPS',
		name: 'zonnaGps',
		icon: { light: 'file:zonnagps.svg', dark: 'file:zonnagps.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Vehículos, conductores, lugares, DeCA y enlace de datos de ZonnaGPS',
		defaults: { name: 'ZonnaGPS' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'zonnaGpsApi', required: true }],
		properties: [
			{
				displayName: 'Recurso',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Conductor', value: 'driver' },
					{ name: 'DeCA', value: 'deca' },
					{ name: 'Informe', value: 'report' },
					{ name: 'Lugar', value: 'place' },
					{ name: 'Vehículo', value: 'vehicle' },
				],
				default: 'vehicle',
			},
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['vehicle'] } },
				options: [
					{ name: 'Buscar', value: 'search', action: 'Search vehicles', description: 'Por matrícula o nombre (assets.list)' },
					{ name: 'Obtener', value: 'get', action: 'Get a vehicle', description: 'Ficha del vehículo (assets.read)' },
					{ name: 'Última Posición', value: 'position', action: 'Get the latest position', description: 'Última posición conocida (positions.latest)' },
					{ name: 'Asignar Conductor', value: 'assignDriver', action: 'Assign a driver to a vehicle', description: 'Asigna el conductor al vehículo (assets.assign_driver)' },
				],
				default: 'search',
			},
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['driver'] } },
				options: [
					{ name: 'Buscar', value: 'search', action: 'Search drivers', description: 'Por nombre o NIF (drivers.list)' },
					{ name: 'Crear', value: 'create', action: 'Create a driver', description: 'Da de alta un conductor (drivers.create)' },
				],
				default: 'search',
			},
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['place'] } },
				options: [{ name: 'Crear', value: 'create', action: 'Create a place', description: 'Guarda un lugar de carga o descarga (places.create)' }],
				default: 'create',
			},
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['deca'] } },
				options: [{ name: 'Crear Borrador', value: 'createDraft', action: 'Create a transport document draft', description: 'Borrador de DeCA para revisar y emitir en ZonnaGPS (deca.drafts.create)' }],
				default: 'createDraft',
			},
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['report'] } },
				options: [{ name: 'Obtener Tabla', value: 'get', action: 'Get a data table', description: 'Tabla del enlace de datos (reports.read)' }],
				default: 'get',
			},

			// Vehículo
			{ displayName: 'Matrícula O Nombre', name: 'search', type: 'string', default: '', displayOptions: { show: { resource: ['vehicle'], operation: ['search'] } } },
			{ displayName: 'ID Del Vehículo', name: 'assetId', type: 'number', default: 0, required: true, displayOptions: { show: { resource: ['vehicle'], operation: ['get', 'position', 'assignDriver'] } } },
			{ displayName: 'ID Del Conductor', name: 'driverId', type: 'number', default: 0, required: true, displayOptions: { show: { resource: ['vehicle'], operation: ['assignDriver'] } } },

			// Conductor
			{ displayName: 'Nombre', name: 'name', type: 'string', default: '', displayOptions: { show: { resource: ['driver'], operation: ['search'] } } },
			{ displayName: 'NIF', name: 'nif', type: 'string', default: '', displayOptions: { show: { resource: ['driver'], operation: ['search', 'create'] } } },
			{ displayName: 'Nombre', name: 'driverName', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['driver'], operation: ['create'] } } },
			{ displayName: 'Teléfono', name: 'phone', type: 'string', default: '', displayOptions: { show: { resource: ['driver'], operation: ['create'] } } },

			// Lugar
			{ displayName: 'Nombre', name: 'placeName', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Dirección', name: 'address', type: 'string', default: '', displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Latitud', name: 'latitude', type: 'number', typeOptions: { numberPrecision: 6 }, default: 0, required: true, displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Longitud', name: 'longitude', type: 'number', typeOptions: { numberPrecision: 6 }, default: 0, required: true, displayOptions: { show: { resource: ['place'] } } },
			{ displayName: 'Radio (M)', name: 'radius', type: 'number', default: 150, displayOptions: { show: { resource: ['place'] } } },

			// DeCA
			{
				displayName: 'Tipo',
				name: 'documentType',
				type: 'options',
				options: [
					{ name: 'Mercancías', value: 'deca_goods' },
					{ name: 'Viajeros', value: 'deca_passengers' },
				],
				default: 'deca_goods',
				displayOptions: { show: { resource: ['deca'] } },
			},
			{ displayName: 'Inicio Del Servicio', name: 'serviceStartsAt', type: 'string', default: '', required: true, placeholder: '2026-10-20 o 2026-10-20T08:00', displayOptions: { show: { resource: ['deca'] } } },
			{ displayName: 'ID Del Conductor', name: 'decaDriverId', type: 'number', default: 0, displayOptions: { show: { resource: ['deca'] } } },
			{ displayName: 'Datos Del DeCA (JSON)', name: 'decaData', type: 'json', default: '{\n  "vehicle_plate": "1234ABC",\n  "origin": "Madrid",\n  "destination": "Toledo"\n}', description: 'Campos «data» según la documentación (/api/docs)', displayOptions: { show: { resource: ['deca'] } } },

			// Enlace de datos
			{
				displayName: 'Tabla',
				name: 'dataset',
				type: 'options',
				options: [
					{ name: 'Alertas', value: 'alerts' },
					{ name: 'DeCA Emitidos', value: 'deca' },
					{ name: 'Indicadores Diarios Por Conductor', value: 'driver-daily' },
					{ name: 'Indicadores Diarios Por Vehículo', value: 'vehicle-daily' },
					{ name: 'Vehículos', value: 'vehicles' },
				],
				default: 'vehicle-daily',
				displayOptions: { show: { resource: ['report'] } },
			},
			{ displayName: 'Desde', name: 'from', type: 'string', default: '', placeholder: 'AAAA-MM-DD', displayOptions: { show: { resource: ['report'] } } },
			{ displayName: 'Hasta', name: 'to', type: 'string', default: '', placeholder: 'AAAA-MM-DD', displayOptions: { show: { resource: ['report'] } } },
			{ displayName: 'Todas Las Páginas', name: 'returnAll', type: 'boolean', description: 'Whether to return all results or only up to a given limit', default: true, displayOptions: { show: { resource: ['report'] } } },
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
						throw new NodeOperationError(this.getNode(), '«Datos del DeCA» no es un JSON válido.', { itemIndex: i });
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
					throw new NodeOperationError(this.getNode(), `Operación no admitida: ${resource}/${operation}`, { itemIndex: i });
				}

				for (const row of Array.isArray(result) ? result : [result]) {
					out.push({ json: row, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// Los fallos de la API llegan como errores HTTP; los nuestros (operación no admitida) ya traen su texto.
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [out];
	}
}
