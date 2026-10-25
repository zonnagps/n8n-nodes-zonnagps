# n8n-nodes-zonnagps

Nodo comunitario de [n8n](https://docs.n8n.io/integrations/community-nodes/) para ZonnaGPS.

- **Credencial «ZonnaGPS API»**: clave de API y servidor; la prueba llama a `GET /webhooks`.
- **Nodo «ZonnaGPS»**: Vehículo (buscar, obtener, última posición, asignar conductor), Conductor
  (buscar, crear), Lugar (crear), DeCA (crear borrador) y Enlace de datos (obtener tabla, todas las
  páginas). Se puede usar como herramienta de un agente de IA (`usableAsTool`).
- **Nodo «ZonnaGPS Trigger»**: elige eventos; al activar el flujo se suscribe (`POST /webhooks`) y
  guarda el secreto en los datos estáticos del flujo; al desactivarlo se da de baja. Cada envío se
  comprueba con `X-Zonna-Signature` (HMAC-SHA256 y cinco minutos de tolerancia); los `test.ping`
  solo pasan si se marca «Incluir envíos de prueba».

## Probar

```bash
npm install
npm test          # compila con tsc y ejecuta test/nodes.test.mjs (firma y descripción de los nodos)
npm pack --dry-run
```


Prueba real en un n8n propio: `npm run build && npm pack`, y en n8n
*Settings → Community nodes → Install* con el `.tgz` (o copiarlo a `~/.n8n/custom/`). La URL del webhook de n8n tiene que ser HTTPS pública en el puerto 443.

## Publicar (cuando la dueña lo apruebe)

1. Revisar con `npx @n8n/scan-community-package n8n-nodes-zonnagps` tras publicar una versión de prueba,
   o antes con el linter oficial `npx @n8n/node-cli lint`.
2. `npm publish --access public` con la cuenta npm de ZonnaGPS (el nombre debe empezar por `n8n-nodes-`
   y llevar la palabra clave `n8n-community-node-package`, ya puesta).
3. Opcional: solicitar la verificación en el *Creator Portal* de n8n para que aparezca en su buscador.

## Instalar

En n8n: *Settings → Community nodes → Install* → `n8n-nodes-zonnagps`. Necesitas una clave de API de ZonnaGPS
(en la web: Integraciones → Claves de API). Documentación de la API: https://app.zonnagps.es/api/docs

## Publicación

Cada versión se publica desde GitHub Actions (`.github/workflows/publish.yml`) al crear una etiqueta `vX.Y.Z`,
con *npm provenance* y publicación de confianza (OIDC), sin claves guardadas en el repositorio.

## Licencia

MIT
