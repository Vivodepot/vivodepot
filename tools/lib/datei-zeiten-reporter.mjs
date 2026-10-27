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
  /* WANDUHRZEIT JE DATEI (19.10.2026, zu SUITE-DAUER-WAECHST): die Summe der obersten Tests lässt Prozessstart, Preloads und
     den Modulkopf einer Datei (require, ladeKern() vor dem ersten test()) aus. Der Läufer meldet je Datei ein test:complete auf
     Ebene 0, dessen Name der Dateipfad ist; seine Dauer ist die Wanduhrzeit des ganzen Dateiprozesses. Mit
     VD_DATEI_WANDZEIT=<datei> schreibt der Reporter je Datei { wand_ms, tests_ms } dorthin; ohne die Variable nichts.
     Probe: [Reporter·Wanduhrzeit] in der Probe der Schnellstufe. */
  const wand = {};
  for await (const e of source) {
    if (e.type === 'test:complete' && e.data && e.data.nesting === 0 && e.data.file && e.data.name
      && path.resolve(repo, e.data.name) === path.resolve(e.data.file)) {
      const rel = path.relative(repo, e.data.file);
      if (!rel.startsWith('..')) wand[rel] = Math.round(Number((e.data.details && e.data.details.duration_ms) || 0));
    }
    /* Rote Tests (30.09.2026, Wackel-Quarantäne): je Blatt-Test „datei<TAB>voller Name". Ein Elterntest, der nur
       wegen eines roten Kindes rot ist (subtestsFailed), zählt nicht; todo und skip zählen nie. */
    if (e.data && e.data.file && (e.type === 'test:start' || e.type === 'test:fail')) {
      const r = path.relative(repo, e.data.file);
      const st = stapel.get(r) || []; stapel.set(r, st);
      st[e.data.nesting] = e.data.name; st.length = e.data.nesting + 1;
      const art = e.data.details && e.data.details.error && e.data.details.error.failureType;
      if (e.type === 'test:fail' && !e.data.todo && !e.data.skip && art !== 'subtestsFailed' && !r.startsWith('..')) {
        const zeile = r + '\t' + st.join(' > ');
        rot.add(zeile);
        /* FRÜHES ROT (26.10.2026, Testkonzept Punkt 2): sofort, nicht erst am Ende — der Zugkopf liest die Datei im Takt und
           beendet die andere Seite beim ersten Rot. Probe: die Zugkopf-Probe [Zugkopf·Frührot]. */
        try { if (process.env.VD_ERSTES_ROT) fs.appendFileSync(process.env.VD_ERSTES_ROT, zeile + '\n'); } catch (_) { /* Zugabe */ }
      }
    }
    if ((e.type === 'test:pass' || e.type === 'test:fail') && e.data && e.data.nesting === 0 && e.data.file) {
      const rel = path.relative(repo, e.data.file);
      if (rel.startsWith('..')) continue;
      je[rel] = (je[rel] || 0) + Number((e.data.details && e.data.details.duration_ms) || 0);
    }
  }
  try {
    if (process.env.VD_DATEI_WANDZEIT) {
      const aus = {};
      for (const d of Object.keys(wand).sort()) aus[d] = { wand_ms: wand[d], tests_ms: Math.round(je[d] || 0) };
      fs.writeFileSync(process.env.VD_DATEI_WANDZEIT, JSON.stringify(aus, null, 1) + '\n');
    }
  } catch (_) { /* Messung ist Zugabe, nie Bedingung */ }
  try { if (process.env.VD_ROTE_DATEIEN) fs.writeFileSync(process.env.VD_ROTE_DATEIEN, [...rot].sort().join('\n') + (rot.size ? '\n' : '')); } catch (_) { /* Zugabe */ }
  try {
    const ziel = S.zeitenPfad(repo);
    if (ziel && Object.keys(je).length) {
      const gerundet = S.dateiZeitenZuordnen(je, wand);
      const tmp = ziel + '.' + process.pid + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(S.zusammenfuehren(S.zeitenLesen(ziel), gerundet), null, 1) + '\n');
      fs.renameSync(tmp, ziel);
    }
  } catch (_) { /* Messung ist Zugabe, nie Bedingung */ }
}
