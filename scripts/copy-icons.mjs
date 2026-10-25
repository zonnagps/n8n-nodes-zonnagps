// Copia los iconos SVG junto a los nodos compilados (n8n los busca al lado del .node.js).
import { copyFileSync, mkdirSync } from 'node:fs';

for (const node of ['ZonnaGps', 'ZonnaGpsTrigger']) {
  mkdirSync(`dist/nodes/${node}`, { recursive: true });
  copyFileSync('nodes/zonnagps.svg', `dist/nodes/${node}/zonnagps.svg`);
}
mkdirSync('dist/credentials', { recursive: true });
copyFileSync('nodes/zonnagps.svg', 'dist/credentials/zonnagps.svg');
