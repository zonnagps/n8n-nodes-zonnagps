// Copia los iconos SVG junto a los nodos y la credencial compilados (n8n los busca al lado del .js).
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

for (const dir of ['nodes/ZonnaGps', 'nodes/ZonnaGpsTrigger', 'credentials']) {
  mkdirSync(`dist/${dir}`, { recursive: true });
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    copyFileSync(`${dir}/${file}`, `dist/${dir}/${file}`);
  }
}
