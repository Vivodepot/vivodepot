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
  const rot = new Set();
  const stapel = new Map();
  const repo = process.cwd();
  for await (const e of source) {
    /* Rote Tests (30.09.2026, Wackel-Quarantäne): je Blatt-Test „datei<TAB>voller Name". Ein Elterntest, der nur
       wegen eines roten Kindes rot ist (subtestsFailed), zählt nicht; todo und skip zählen nie. */
    if (e.data && e.data.file && (e.type === 'test:start' || e.type === 'test:fail')) {
      const r = path.relative(repo, e.data.file);
      const st = stapel.get(r) || []; stapel.set(r, st);
      st[e.data.nesting] = e.data.name; st.length = e.data.nesting + 1;
      const art = e.data.details && e.data.details.error && e.data.details.error.failureType;
      if (e.type === 'test:fail' && !e.data.todo && !e.data.skip && art !== 'subtestsFailed' && !r.startsWith('..')) rot.add(r + '\t' + st.join(' > '));
    }
    if ((e.type === 'test:pass' || e.type === 'test:fail') && e.data && e.data.nesting === 0 && e.data.file) {
      const rel = path.relative(repo, e.data.file);
      if (rel.startsWith('..')) continue;
      je[rel] = (je[rel] || 0) + Number((e.data.details && e.data.details.duration_ms) || 0);
    }
  }
  try { if (process.env.VD_ROTE_DATEIEN) fs.writeFileSync(process.env.VD_ROTE_DATEIEN, [...rot].sort().join('\n') + (rot.size ? '\n' : '')); } catch (_) { /* Zugabe */ }
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
