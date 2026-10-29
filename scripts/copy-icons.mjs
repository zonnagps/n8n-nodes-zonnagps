// Copies the SVG icons next to the compiled nodes and credential (n8n looks for them beside the .js).
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

for (const dir of ['nodes/ZonnaGps', 'nodes/ZonnaGpsTrigger', 'credentials']) {
  mkdirSync(`dist/${dir}`, { recursive: true });
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    copyFileSync(`${dir}/${file}`, `dist/${dir}/${file}`);
  }
}
