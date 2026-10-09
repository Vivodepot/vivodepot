#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   schema-fassungen.js — jede Schema-Adresse löst auf, jede Fassung bleibt (06.10.2026, U2-ADR-488)
   ────────────────────────────────────────────────────────────────────────────
   Die Schemas der Module und des Vorlagen-Werkzeugs tragen `$id`-Adressen unter https://vivodepot.de/schemas/. Bis hierher
   lieferten sie 404 (Befund SCHEMA-ID-NICHT-AUFLOESBAR). Die `$id` bleibt, wie sie ist: sie ist eine Kennung der Daten
   (tools/marken-adressen-pruefen.js), umbenannt wird nichts. Lösbar gemacht wird die Adresse selbst.

   DIE FASSUNG STEHT NICHT IM SCHEMA, sondern im Verzeichnis docs/schema-fassungen.json. Ein Annotationsfeld im Schema
   (`x-vivodepot-…`) bricht Ajv 2020 schon in der Standard-Einstellung („strict mode: unknown keyword“) — unsere Proben
   und jeden Integrator. Die Schemas bleiben darum byte-gleich.

   Das Verzeichnis führt je Schema die Fassungen 1, 2, … mit
     blob          git-Blob der kanonischen Bytes (der Inhalt ist darüber jederzeit wiederherstellbar: git cat-file)
     shaKanon      SHA-256 der kanonischen Bytes
     shaAusgeliefert  SHA-256 von schemas/<name>/<n>.json: dieselben Bytes, nur `$id` = versionierte Adresse
   Es wird nur angehängt: ein geänderter oder gelöschter alter Eintrag ist rot (Probe, gegen das Verzeichnis am Kanon).
   Jede Byte-Änderung eines Schemas verlangt eine neue Fassung (`--eintragen`); sonst ist die Probe rot.

   Ausgeliefert (`--ordner <dir>`, über die Website-Auslieferung, wie das Register):
     schemas/<name>-schema.json   die geltende Fassung, byte-gleich mit dem Kanon (die bisherige `$id`)
     schemas/<name>/<n>.json      jede Fassung, für immer (eigene `$id`, JSON Schema 2020-12 Core § 9.1.2)
     schemas/index.json           Name, Fassung, Adresse, Prüfsumme — sonst nichts
   Aufruf:
     node tools/schema-fassungen.js                    prüfen (Exit 0 / 1), ohne Netz
     node tools/schema-fassungen.js --eintragen        neue Fassung für jedes geänderte oder neue Schema anhängen
     node tools/schema-fassungen.js --ordner <dir>     schemas/ bauen
     node tools/schema-fassungen.js --live-pruefen     jede Adresse liefert 200 und die verzeichnete Prüfsumme (Netz)
   Probe: tests/schema-fassungen.test.js, tests/mit-modul/schema-fassungen-ajv.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const VERZEICHNIS = 'docs/schema-fassungen.json';
const BASIS = 'https://vivodepot.de/schemas/';
const ID_MUSTER = /^https:\/\/vivodepot\.de\/schemas\/([a-z0-9-]+)-schema\.json$/;

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
function git(args, repo = REPO, eingabe) {
  const r = spawnSync('git', args, { cwd: repo, env: ohneGitUmgebung(), input: eingabe, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ': ' + String(r.stderr).trim());
  return r.stdout;
}

/* Alle Schemas im Repo mit `$id` unter BASIS: { name, pfad, id } — der Name ist der Teil vor „-schema.json“. */
function schemasFinden(repo = REPO) {
  const raus = [];
  const docs = path.join(repo, 'docs');
  for (const ordner of fs.readdirSync(docs, { withFileTypes: true })) {
    if (!ordner.isDirectory()) continue;
    for (const datei of fs.readdirSync(path.join(docs, ordner.name))) {
      if (!datei.endsWith('-schema.json')) continue;
      const pfad = path.posix.join('docs', ordner.name, datei);
      let id;
      try { id = JSON.parse(fs.readFileSync(path.join(repo, pfad), 'utf8')).$id; } catch { continue; }
      if (typeof id !== 'string' || !id.startsWith(BASIS)) continue;
      const m = ID_MUSTER.exec(id);
      raus.push({ name: m ? m[1] : null, pfad, id });
    }
  }
  return raus.sort((a, b) => a.pfad.localeCompare(b.pfad));
}

/* Die ausgelieferte Fassung n: dieselben Bytes, nur der Wert von `$id` ersetzt (Textersatz, damit Formatierung und
   Reihenfolge erhalten bleiben). */
function versioniert(bytes, name, n) {
  const text = bytes.toString('utf8');
  const alt = JSON.parse(text).$id;
  const neu = BASIS + name + '/' + n + '.json';
  const ersetzt = text.replace(JSON.stringify(alt), JSON.stringify(neu));
  if (ersetzt === text || JSON.parse(ersetzt).$id !== neu) throw new Error(name + ': $id nicht ersetzbar');
  return Buffer.from(ersetzt, 'utf8');
}

/* Normalisiert verglichen: gleich bis auf `$id`. */
function nurIdVerschieden(kanon, ausgeliefert) {
  const a = JSON.parse(kanon.toString('utf8')); const b = JSON.parse(ausgeliefert.toString('utf8'));
  delete a.$id; delete b.$id;
  return JSON.stringify(a) === JSON.stringify(b);
}

function verzeichnisLesen(text) {
  const v = JSON.parse(text);
  if (!v || typeof v.schemas !== 'object') throw new Error(VERZEICHNIS + ': Feld schemas fehlt');
  return v;
}

/* Befunde gegen das Repo (ohne Netz). `vorher` ist das Verzeichnis am Kanon (für „nur anhängen“) oder null. */
function pruefen({ repo = REPO, verzeichnis, vorher = null, blobLesen = (b) => git(['cat-file', 'blob', b], repo) } = {}) {
  const b = inhaltPruefen(verzeichnis);
  const schemas = schemasFinden(repo);
  const namen = new Set();
  for (const s of schemas) {
    if (!s.name) { b.push(`${s.pfad}: $id ${s.id} folgt nicht dem Muster <name>-schema.json`); continue; }
    if (namen.has(s.name)) b.push(`${s.name}: zwei Schemas mit derselben Adresse`);
    namen.add(s.name);
    const e = verzeichnis.schemas[s.name];
    if (!e || !Array.isArray(e.fassungen) || !e.fassungen.length) { b.push(`${s.name}: kein Eintrag im Verzeichnis (neues Schema ohne Fassung)`); continue; }
    const bytes = fs.readFileSync(path.join(repo, s.pfad));
    const letzte = e.fassungen[e.fassungen.length - 1];
    if (letzte.shaKanon !== sha256(bytes)) b.push(`${s.name}: Bytes geändert ohne neue Fassung (zuletzt ${letzte.n})`);
    e.fassungen.forEach((f, i) => {
      if (f.n !== i + 1) b.push(`${s.name}: Fassung an Stelle ${i + 1} heißt ${f.n}`);
      if (f.adresse !== BASIS + s.name + '/' + f.n + '.json') b.push(`${s.name}/${f.n}: Adresse ${f.adresse} passt nicht`);
      let k;
      try { k = blobLesen(f.blob); } catch { b.push(`${s.name}/${f.n}: Blob ${f.blob} nicht im Repo`); return; }
      if (sha256(k) !== f.shaKanon) b.push(`${s.name}/${f.n}: Blob passt nicht zu shaKanon`);
      const v = versioniert(k, s.name, f.n);
      if (sha256(v) !== f.shaAusgeliefert) b.push(`${s.name}/${f.n}: shaAusgeliefert passt nicht`);
      if (!nurIdVerschieden(k, v)) b.push(`${s.name}/${f.n}: ausgelieferte Fassung weicht nicht nur im $id ab`);
    });
  }
  for (const n of Object.keys(verzeichnis.schemas)) if (!namen.has(n)) b.push(`${n}: im Verzeichnis, aber kein Schema im Repo (alte Fassungen bleiben trotzdem verzeichnet)`);
  if (vorher) {
    for (const [n, e] of Object.entries(vorher.schemas)) {
      const jetzt = verzeichnis.schemas[n];
      if (!jetzt) { b.push(`${n}: Eintrag gelöscht (nur anhängen)`); continue; }
      e.fassungen.forEach((f, i) => {
        if (JSON.stringify(jetzt.fassungen[i]) !== JSON.stringify(f)) b.push(`${n}/${f.n}: alter Eintrag geändert oder gelöscht (nur anhängen)`);
      });
    }
  }
  return b;
}

/* Das Verzeichnis geht hinaus: es trägt nur Name, Fassung, Adresse und Prüfsummen (blob ist die git-Prüfsumme der
   kanonischen Bytes), keine Pfade im Repository und keine Werkzeugnamen. */
const FELDER_SCHEMA = ['adresse', 'fassungen']; const FELDER_FASSUNG = ['adresse', 'blob', 'n', 'shaAusgeliefert', 'shaKanon'];
function inhaltPruefen(verzeichnis) {
  const b = [];
  if (JSON.stringify(Object.keys(verzeichnis)) !== JSON.stringify(['schemas'])) b.push('Verzeichnis: Felder außer „schemas“');
  for (const [n, e] of Object.entries(verzeichnis.schemas)) {
    if (JSON.stringify(Object.keys(e).sort()) !== JSON.stringify(FELDER_SCHEMA)) b.push(`${n}: Felder außer ${FELDER_SCHEMA.join(', ')}`);
    if (e.adresse !== BASIS + n + '-schema.json') b.push(`${n}: Adresse ${e.adresse} passt nicht`);
    for (const f of e.fassungen || []) if (JSON.stringify(Object.keys(f).sort()) !== JSON.stringify(FELDER_FASSUNG)) b.push(`${n}/${f.n}: Felder außer ${FELDER_FASSUNG.join(', ')}`);
  }
  return b;
}

function eintragen(repo = REPO) {
  const p = path.join(repo, VERZEICHNIS);
  const v = fs.existsSync(p) ? verzeichnisLesen(fs.readFileSync(p, 'utf8')) : { schemas: {} };
  const neu = [];
  for (const s of schemasFinden(repo)) {
    if (!s.name) continue;
    const bytes = fs.readFileSync(path.join(repo, s.pfad));
    const e = v.schemas[s.name] || (v.schemas[s.name] = { adresse: s.id, fassungen: [] });
    const letzte = e.fassungen[e.fassungen.length - 1];
    if (letzte && letzte.shaKanon === sha256(bytes)) continue;
    const n = e.fassungen.length + 1;
    const blob = git(['hash-object', '-w', '--stdin'], repo, bytes).toString().trim();
    e.fassungen.push({ n, adresse: BASIS + s.name + '/' + n + '.json', blob, shaKanon: sha256(bytes), shaAusgeliefert: sha256(versioniert(bytes, s.name, n)) });
    neu.push(`${s.name}/${n}`);
  }
  const sortiert = { schemas: Object.fromEntries(Object.entries(v.schemas).sort((a, b) => a[0].localeCompare(b[0]))) };
  fs.writeFileSync(p, JSON.stringify(sortiert, null, 1) + '\n');
  return neu;
}

/* Inhalt von schemas/: { relPfad: Buffer }. */
function ordnerInhalt({ repo = REPO, verzeichnis, blobLesen = (b) => git(['cat-file', 'blob', b], repo) } = {}) {
  const raus = {}; const index = [];
  for (const [name, e] of Object.entries(verzeichnis.schemas)) {
    for (const f of e.fassungen) {
      const v = versioniert(blobLesen(f.blob), name, f.n);
      raus[`schemas/${name}/${f.n}.json`] = v;
      index.push({ name, fassung: f.n, adresse: BASIS + name + '/' + f.n + '.json', sha256: f.shaAusgeliefert });
    }
    const letzte = e.fassungen[e.fassungen.length - 1];
    raus[`schemas/${name}-schema.json`] = blobLesen(letzte.blob);
    index.push({ name, fassung: letzte.n, adresse: BASIS + name + '-schema.json', sha256: letzte.shaKanon });
  }
  raus['schemas/index.json'] = Buffer.from(JSON.stringify({ schemas: index }, null, 1) + '\n');
  return raus;
}

async function livePruefen(verzeichnis, holen = fetch) {
  const b = [];
  const inhalt = ordnerInhalt({ verzeichnis });
  for (const [rel, soll] of Object.entries(inhalt)) {
    const url = 'https://vivodepot.de/' + rel;
    try {
      const r = await holen(url, { headers: { 'cache-control': 'no-cache' } });
      if (r.status !== 200) { b.push(`${url}: ${r.status}`); continue; }
      const ist = Buffer.from(await r.arrayBuffer());
      if (sha256(ist) !== sha256(soll)) b.push(`${url}: Inhalt weicht ab`);
    } catch (err) { b.push(`${url}: ${err.message}`); }
  }
  return b;
}

module.exports = { inhaltPruefen, schemasFinden, versioniert, nurIdVerschieden, verzeichnisLesen, pruefen, eintragen, ordnerInhalt, livePruefen, VERZEICHNIS, BASIS, sha256 };

if (require.main === module) {
  const argv = process.argv.slice(2);
  (async () => {
    if (argv.includes('--eintragen')) { const n = eintragen(); console.log('[schema-fassungen] neu: ' + (n.join(', ') || 'nichts')); return 0; }
    const v = verzeichnisLesen(fs.readFileSync(path.join(REPO, VERZEICHNIS), 'utf8'));
    const i = argv.indexOf('--ordner');
    if (i >= 0) {
      const ziel = path.resolve(argv[i + 1]);
      const b = pruefen({ verzeichnis: v });
      if (b.length) { console.error('[schema-fassungen] ROT:\n  ' + b.join('\n  ')); return 1; }
      for (const [rel, inhalt] of Object.entries(ordnerInhalt({ verzeichnis: v }))) {
        fs.mkdirSync(path.dirname(path.join(ziel, rel)), { recursive: true });
        fs.writeFileSync(path.join(ziel, rel), inhalt);
        console.log(sha256(inhalt) + '  ' + rel);
      }
      return 0;
    }
    if (argv.includes('--live-pruefen')) {
      const b = await livePruefen(v);
      console.log(b.length ? '[schema-fassungen] LIVE ROT:\n  ' + b.join('\n  ') : '[schema-fassungen] live: jede Adresse 200 und Prüfsumme gleich');
      return b.length ? 1 : 0;
    }
    const b = pruefen({ verzeichnis: v });
    console.log(b.length ? '[schema-fassungen] ROT:\n  ' + b.join('\n  ') : '[schema-fassungen] grün: jedes Schema verzeichnet, jede Fassung wiederherstellbar');
    return b.length ? 1 : 0;
  })().then((c) => { process.exitCode = c; });
}
