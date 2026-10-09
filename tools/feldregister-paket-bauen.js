#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   feldregister-paket-bauen.js — das Feldregister als npm-Paket @vivodepot/feldregister
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-NNN (06.10.2026). Entscheidung der Produktverantwortung vom 03.10.2026: npm-Paket, CC0. Das Konto `vivodepot`
   gehört der Produktverantwortung; der Scope @vivodepot ist damit ihrer.

   DIESES WERKZEUG VERÖFFENTLICHT NICHT. Es baut den Paketordner und prüft ihn. `npm publish` führt die Kontoinhaberin
   selbst aus, mit Zwei-Faktor-Anmeldung — kein Token, keine Anmeldung, kein Aufruf von `npm publish` hier oder in einer
   Probe. Ein veröffentlichtes Paket ist eine Einbahnstraße: eine Fassung lässt sich nicht ersetzen, nur zurückziehen.

   NUR DATEN, KEIN CODE. Das Paket trägt feldregister.json, feldregister.jsonld, das Schema, den CC0-Rechtstext und ein
   README. Kein `main` mit Code, keine `scripts` (kein install-Skript, das bei Dritten liefe), keine Abhängigkeiten.
   `files` ist abschließend; die Probe hält `npm pack --dry-run` gegen genau diese Liste.

   DIE VERSION SAGT, WAS SICH GEÄNDERT HAT (semver für Daten), gezählt gegen die zuletzt veröffentlichte Liste:
     MAJOR  eine Kennung fehlt oder bedeutet anderes (ihr Bereich ändert sich) — nach v1 nie; das
            Werkzeug bricht dann ab, statt eine Major-Fassung zu bauen.
     MINOR  neue Kennung oder geänderter Status/Nachfolger.
     PATCH  nur Beschriftungen.
   Ohne Änderung bricht es ab: es gibt nichts zu veröffentlichen. Ohne vorige Fassung: 1.0.0.

   Aufruf:
     node tools/feldregister-paket-bauen.js --ausgabe <ordner>
         [--register <ordner mit feldregister.json und feldregister.jsonld>]   sonst frisch aus dem Katalog gebaut
         [--vorige <feldregister.json der zuletzt veröffentlichten Fassung> --vorige-version <x.y.z>]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { bauen } = require('./feldregister-bauen.js');
const { SCHEMA_JSONLD_DATEI } = require('./lib/feldregister-adressen.js');

const REPO = path.join(__dirname, '..');
const PAKET_NAME = '@vivodepot/feldregister';
const SCHEMA_QUELLE = path.join(REPO, 'docs', 'feldregister', 'feldregister-schema.json');
const LIZENZ_QUELLE = path.join(REPO, 'tools', 'feldregister-paket', 'LICENSE-CC0-1.0.txt');
const README_QUELLE = path.join(REPO, 'tools', 'feldregister-paket', 'README.md');
/* Der Rechtstext, wie von creativecommons.org/publicdomain/zero/1.0/legalcode.txt am 06.10.2026 geladen. */
const LIZENZ_SHA256 = 'a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499';
const DATEIEN = Object.freeze(['LICENSE', 'README.md', 'feldregister.json', SCHEMA_JSONLD_DATEI, 'feldregister.schema.json', 'package.json']);

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

/** Was hat sich gegen die vorige Liste geändert? Reine Funktion über zwei geparste feldregister.json. */
function aenderungen(vorige, jetzt) {
  const alt = new Map(vorige.felder.map((f) => [f.kennung, f]));
  const neu = new Map(jetzt.felder.map((f) => [f.kennung, f]));
  const a = { entfernt: [], bereichGeaendert: [], neu: [], statusGeaendert: [], beschriftungGeaendert: [] };
  for (const [k, f] of alt) {
    const n = neu.get(k);
    if (!n) { a.entfernt.push(k); continue; }
    if (n.bereich !== f.bereich) a.bereichGeaendert.push(k);
    if (n.status !== f.status || (n.nachfolger || null) !== (f.nachfolger || null)) a.statusGeaendert.push(k);
    if (n.label.de !== f.label.de || n.label.en !== f.label.en) a.beschriftungGeaendert.push(k);
  }
  for (const k of neu.keys()) if (!alt.has(k)) a.neu.push(k);
  return a;
}

function naechsteVersion(vorigeVersion, a) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(vorigeVersion || '');
  if (!m) throw new Error('feldregister-paket-bauen: --vorige-version erwartet x.y.z, bekam "' + vorigeVersion + '".');
  const [ma, mi, pa] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a.entfernt.length || a.bereichGeaendert.length) {
    throw new Error('feldregister-paket-bauen: ' + (a.entfernt.length + a.bereichGeaendert.length) + ' Kennungen fehlen oder '
      + 'bedeuten anderes (z. B. ' + a.entfernt.concat(a.bereichGeaendert).slice(0, 3).join(', ') + ') — eine Kennung ändert sich '
      + 'nicht; deaktivieren statt löschen (U2-ADR-409 Punkt 10). Kein Paket gebaut.');
  }
  if (a.neu.length || a.statusGeaendert.length) return ma + '.' + (mi + 1) + '.0';
  if (a.beschriftungGeaendert.length) return ma + '.' + mi + '.' + (pa + 1);
  throw new Error('feldregister-paket-bauen: keine Änderung gegen die vorige Fassung ' + vorigeVersion + ' — nichts zu veröffentlichen.');
}

function packageJson(version, register) {
  return JSON.stringify({
    name: PAKET_NAME,
    version,
    description: 'Vivodepot field register: permanent identifiers for personal data fields, with German and English labels (CC0).',
    keywords: ['vivodepot', 'field-register', 'skos', 'json-ld', 'identifiers', 'cc0'],
    homepage: 'https://register.vivodepot.de/',
    license: 'CC0-1.0',
    author: register.herausgeber,
    repository: { type: 'git', url: 'git+https://github.com/vivodepot/vivodepot.git' },
    exports: {
      '.': './feldregister.json',
      './feldregister.json': './feldregister.json',
      './feldregister.jsonld': './' + SCHEMA_JSONLD_DATEI,
      './feldregister.schema.json': './feldregister.schema.json',
      './package.json': './package.json',
    },
    files: DATEIEN.filter((d) => d !== 'package.json'),
    publishConfig: { access: 'public' },
  }, null, 2) + '\n';
}

/* Die Vorlage liegt als Doku-Datei neben dem Rechtstext; hier werden nur die Werte eingesetzt. Ein unbekannter
   Platzhalter bricht ab. */
function readme(version, register) {
  const werte = {
    anzahl: String(register.anzahl), kern: register.fassung.kern, quellenhinweis: register.herkunft.quellenhinweis,
    herausgeber: register.herausgeber, version,
  };
  const text = fs.readFileSync(README_QUELLE, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in werte)) throw new Error('feldregister-paket-bauen: unbekannter Platzhalter {{' + k + '}} in ' + README_QUELLE);
    return werte[k];
  });
  return text;
}

function paketBauen({ ausgabe, registerOrdner = null, vorige = null, vorigeVersion = null, artefakt = null }) {
  if (!ausgabe) throw new Error('feldregister-paket-bauen: --ausgabe fehlt.');
  if (fs.existsSync(ausgabe) && fs.readdirSync(ausgabe).length) throw new Error(ausgabe + ' ist nicht leer — kein Mischen mit einem älteren Bau.');
  let jsonText; let jsonldText;
  if (registerOrdner) {
    jsonText = fs.readFileSync(path.join(registerOrdner, 'feldregister.json'), 'utf8');
    jsonldText = fs.readFileSync(path.join(registerOrdner, SCHEMA_JSONLD_DATEI), 'utf8');
  } else {
    const a = artefakt || bauen({});
    jsonText = a.json; jsonldText = a.jsonld;
  }
  const register = JSON.parse(jsonText);
  const lizenz = fs.readFileSync(LIZENZ_QUELLE);
  if (sha256(lizenz) !== LIZENZ_SHA256) throw new Error('feldregister-paket-bauen: ' + LIZENZ_QUELLE + ' ist nicht der CC0-Rechtstext.');
  if (!register.lizenz || register.lizenz.spdx !== 'CC0-1.0') throw new Error('feldregister-paket-bauen: feldregister.json trägt keine CC0-Lizenz.');

  let version = '1.0.0'; let diff = null;
  if (vorige) {
    diff = aenderungen(JSON.parse(fs.readFileSync(vorige, 'utf8')), register);
    version = naechsteVersion(vorigeVersion, diff);
  }
  fs.mkdirSync(ausgabe, { recursive: true });
  const inhalt = {
    'LICENSE': lizenz,
    'README.md': readme(version, register),
    'feldregister.json': jsonText,
    [SCHEMA_JSONLD_DATEI]: jsonldText,
    'feldregister.schema.json': fs.readFileSync(SCHEMA_QUELLE),
    'package.json': packageJson(version, register),
  };
  for (const d of DATEIEN) fs.writeFileSync(path.join(ausgabe, d), inhalt[d]);
  return { version, aenderungen: diff, dateien: DATEIEN.slice(), anzahl: register.anzahl, kern: register.fassung.kern };
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return (i >= 0 && argv[i + 1]) ? path.resolve(argv[i + 1]) : null; };
  const vv = argv.indexOf('--vorige-version');
  const r = paketBauen({
    ausgabe: wert('--ausgabe'), registerOrdner: wert('--register'), vorige: wert('--vorige'),
    vorigeVersion: vv >= 0 ? argv[vv + 1] : null,
  });
  console.log('feldregister-paket-bauen: ' + PAKET_NAME + '@' + r.version + ' · ' + r.anzahl + ' Kennungen · Kern ' + r.kern);
  if (r.aenderungen) {
    for (const [k, v] of Object.entries(r.aenderungen)) if (v.length) console.log('  ' + k + ': ' + v.length);
  }
  console.log('  Prüfen:        npm pack --dry-run ' + wert('--ausgabe'));
  console.log('  Veröffentlichen (nur die Kontoinhaberin, mit 2FA): npm publish ' + wert('--ausgabe'));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { paketBauen, aenderungen, naechsteVersion, packageJson, readme, README_QUELLE, PAKET_NAME, DATEIEN, LIZENZ_SHA256, SCHEMA_QUELLE, LIZENZ_QUELLE };
