'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   publiccode.yml trägt, was openCoDE für die Aufnahme ins Softwareverzeichnis braucht (25.09.2026).

   Vivodepot fehlte im openCoDE-Softwareverzeichnis (und damit im EU-Katalog). Die eigentliche Prüfung macht der
   offizielle Parser in der CI (.github/workflows/publiccode-pruefen.yml). Diese Probe fängt die Klasse früher, statisch,
   ohne Netz und ohne YAML-Bibliothek: Standard-Fassung mindestens 0.4 (das, was openCoDE in seinen Beispielen zeigt),
   die Pflichtfelder vorhanden. Offen: `url` — openCoDE erwartet „usually the direct link to your openCode
   repository", das Original liegt auf GitHub; die Entscheidung steht aus.
   Rot-Beweis: eine gepflanzte Fassung 0.3 und ein fehlendes Pflichtfeld fallen.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATEI = path.join(__dirname, '..', 'publiccode.yml');

function pruefen(text) {
  const fehler = [];
  const oben = (k) => new RegExp('^' + k + ':', 'm').test(text);
  const v = /^publiccodeYmlVersion:\s*"?(\d+)\.(\d+)"?/m.exec(text);
  if (!v) fehler.push('publiccodeYmlVersion fehlt');
  else if (Number(v[1]) === 0 && Number(v[2]) < 4) fehler.push('publiccodeYmlVersion ' + v[1] + '.' + v[2] + ' — openCoDE zeigt 0.4');
  for (const k of ['name', 'url', 'releaseDate', 'platforms', 'categories', 'developmentStatus', 'softwareType', 'description', 'legal', 'maintenance', 'localisation']) {
    if (!oben(k)) fehler.push('Pflichtfeld fehlt: ' + k);
  }
  for (const k of ['shortDescription', 'longDescription', 'features']) {
    if (!new RegExp('^    ' + k + ':', 'm').test(text)) fehler.push('description.<sprache>.' + k + ' fehlt');
  }
  if (!/^  license:\s*\S/m.test(text)) fehler.push('legal.license fehlt');
  if (!/^  type:\s*(internal|contract|community|none)\b/m.test(text)) fehler.push('maintenance.type fehlt');
  if (/^  type:\s*(internal|contract)\b/m.test(text) && !/^  contacts:/m.test(text)) fehler.push('maintenance.contacts fehlt');
  if (!/^  localisationReady:/m.test(text) || !/^  availableLanguages:/m.test(text)) fehler.push('localisation unvollständig');
  return fehler;
}

test('[publiccode·openCoDE] Fassung ab 0.4 und alle Pflichtfelder', () => {
  assert.deepEqual(pruefen(fs.readFileSync(DATEI, 'utf8')), []);
});

test('[publiccode·openCoDE·Rot-Beweis] Fassung 0.3 und ein fehlendes Pflichtfeld fallen', () => {
  const echt = fs.readFileSync(DATEI, 'utf8');
  assert.ok(pruefen(echt.replace(/^publiccodeYmlVersion:.*$/m, 'publiccodeYmlVersion: "0.3"')).some((f) => f.includes('0.3')));
  assert.ok(pruefen(echt.replace(/^releaseDate:.*$/m, '')).some((f) => f.includes('releaseDate')));
});

test('[publiccode·openCoDE] url zeigt auf das openCoDE-Projekt', {
  todo: 'offen: openCoDE erwartet das eigene Repo, das Original liegt auf GitHub — Entscheidung steht aus',
}, () => {
  assert.match(fs.readFileSync(DATEI, 'utf8'), /^url:\s*"?https:\/\/gitlab\.opencode\.de\/vivodepot\/vivodepot"?\s*$/m);
});
