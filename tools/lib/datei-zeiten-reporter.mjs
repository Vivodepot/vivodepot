/* Zusätzlicher node --test-Reporter (28.09.2026): summiert je Testdatei die Dauer ihrer obersten Tests und
   arbeitet sie am Ende in die Zeiten-Datei ein (tools/lib/suite-stufen.js). Gibt selbst nichts aus — die
   Ausgabe der Suite bleibt die des spec-Reporters. Ein Fehler hier darf den Lauf nie beeinflussen. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require_ = createRequire(import.meta.url);
const S = require_('./suite-stufen.js');

export default async function* dateiZeitenReporter(source) {
  const je = {};
  const repo = process.cwd();
  for await (const e of source) {
    if ((e.type === 'test:pass' || e.type === 'test:fail') && e.data && e.data.nesting === 0 && e.data.file) {
      const rel = path.relative(repo, e.data.file);
      if (rel.startsWith('..')) continue;
      je[rel] = (je[rel] || 0) + Number((e.data.details && e.data.details.duration_ms) || 0);
    }
  }
  try {
    const ziel = S.zeitenPfad(repo);
    if (ziel && Object.keys(je).length) {
      const gerundet = Object.fromEntries(Object.entries(je).map(([k, v]) => [k, Math.round(v)]));
      const tmp = ziel + '.' + process.pid + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(S.zusammenfuehren(S.zeitenLesen(ziel), gerundet), null, 1) + '\n');
      fs.renameSync(tmp, ziel);
    }
  } catch (_) { /* Messung ist Zugabe, nie Bedingung */ }
}
