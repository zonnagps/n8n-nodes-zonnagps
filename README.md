# n8n-nodes-zonnagps

This is an [n8n community node](https://docs.n8n.io/integrations/community-nodes/) for
ZonnaGPS, a fleet management platform (GPS tracking, drivers and digital
transport documents).

It lets you read and update your ZonnaGPS fleet from n8n workflows, and start workflows when
something happens in your fleet (alerts, geofence entries and exits, issued transport documents,
vehicles that stop reporting).

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) ·
[Trigger](#trigger) · [AI agent tool](#use-as-an-ai-agent-tool) · [Compatibility](#compatibility) ·
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in
the n8n community nodes documentation. In n8n, go to **Settings → Community Nodes → Install** and
enter `n8n-nodes-zonnagps`.

## Credentials

The **ZonnaGPS API** credential needs:

- **API Key**: create it in ZonnaGPS under **Settings → Integrations → New key**. Give the key the
  permissions for the operations you plan to use (each operation lists the permission it requires).
- **Server URL**: `https://app.zonnagps.es` (default). Use `https://pruebas.app.zonnagps.es` for the
  staging environment.

The key is sent as a `Bearer` token. Testing the credential calls `GET /webhooks`, so the key needs
the `webhooks.list` permission for the test to pass.

## Operations

**ZonnaGPS** node:

| Resource | Operation | Required permission |
| --- | --- | --- |
| Vehicle | Search (by license plate or name) | `assets.list` |
| Vehicle | Get | `assets.read` |
| Vehicle | Get Latest Position | `positions.latest` |
| Vehicle | Assign Driver | `assets.assign_driver` |
| Driver | Search (by name or tax ID) | `drivers.list` |
| Driver | Create | `drivers.create` |
| Place | Create (loading or unloading place with coordinates and radius) | `places.create` |
| Transport Document (DeCA) | Create Draft (goods or passengers; reviewed and issued in ZonnaGPS) | `deca.drafts.create` |
| Data Table | Get (alerts, daily driver/vehicle metrics, issued documents, vehicles; optional date range, all pages) | `reports.read` |

The DeCA (*Documento de Control Administrativo*) is the digital transport document required for road
transport in Spain. The node only creates drafts; they are reviewed and issued in ZonnaGPS. The fields
accepted in **Document Data (JSON)** are described in the [API documentation](https://app.zonnagps.es/api/docs).

## Trigger

The **ZonnaGPS Trigger** node starts a workflow on these events:

- Alert Triggered (`alert.triggered`)
- Geofence Entered (`geofence.enter`)
- Geofence Exited (`geofence.exit`)
- Transport Document (DeCA) Issued (`deca.issued`)
- Vehicle Offline (`vehicle.offline`)

When the workflow is activated, the node subscribes the n8n webhook URL to the selected events
(`POST /webhooks`) and stores the signing secret in the workflow static data. When the workflow is
deactivated, the subscription is deleted. The API key needs the `webhooks.create`, `webhooks.list`
and `webhooks.delete` permissions.

### Signature verification

With **Verify Signature** enabled (default), every request must carry a valid `X-Zonna-Signature`
header (`t=<unix timestamp>,v1=<hex>`): an HMAC-SHA256 of `<t>.<raw body>` with the stored secret,
compared in constant time and with a five-minute tolerance on the timestamp. Requests that fail
are rejected with HTTP 401.

Test events (`test.ping`, sent from **Settings → Integrations** in ZonnaGPS) only start the workflow
when **Include Test Events** is enabled.

Your n8n instance must be reachable over public HTTPS (port 443) for ZonnaGPS to deliver webhooks.

## Use as an AI agent tool

The ZonnaGPS node is marked as `usableAsTool`, so it can be connected as a tool to the n8n AI Agent
node. For example, an agent can look up a vehicle by license plate, get its latest position or
prepare a transport document draft from a delivery note. On self-hosted n8n versions that require
it, set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` to use community nodes as tools.

## Compatibility

- Built against `n8n-workflow` 2.x (n8n nodes API version 1).
- Requires Node.js 20 or later.

## Development

```bash
npm ci
npm test          # builds with tsc and runs the offline tests in test/nodes.test.mjs
npm pack --dry-run
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [ZonnaGPS API documentation](https://app.zonnagps.es/api/docs)

## License

[MIT](LICENSE)
