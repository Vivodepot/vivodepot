'use strict';
/* Schema 93 (U2-ADR-482): die Staatsangehörigkeit hat eine neue Datenform ([{liste, code}]); die Stufe ändert keinen Wert.
   Gehalten: ein Bestandsdepot mit Freitext steigt auf 93, der Freitext bleibt wörtlich stehen (nie abgebildet, Bedingung der Gegenlesung B(2));
   ein gespeicherter Code bleibt unverändert; ein frisches Depot trägt 93. Gegenprobe: ein Kern vor der Stufe liegt unter 93
   und öffnet eine solche Datei darum nur lesend; das Versionstor hat seine eigene Probe). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

test('[Schema 93] ein Bestandsdepot steigt auf 93; der Freitext bleibt wörtlich, nichts wird abgebildet', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({ schemaVersion: 91, sektoren: { identity: { givenName: 'Erika', nationality: 'deutsch, türkisch' } } });
  assert.ok(d.schemaVersion >= 93, 'mindestens 93 — spätere Stufen (94: U2-ADR-479) laufen danach');
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(d.sektoren.identity.nationality, 'deutsch, türkisch');
});

test('[Schema 93] ein gespeicherter Code bleibt unverändert; ein frisches Depot trägt 93', async () => {
  const { V } = ladeKern();
  const wert = [{ liste: 'destatis-staatsangehoerigkeit', code: '000' }];
  const d = V.depotNormalisieren({ schemaVersion: 93, sektoren: { identity: { nationality: wert } } });
  assert.deepEqual(d.sektoren.identity.nationality, wert);
  await V.depotAnlegen('pw');
  assert.equal(V.getData().schemaVersion, V.SCHEMA_VERSION_AKTUELL);   // seit 94 (U2-ADR-479) nicht mehr 93; die Stufe 93 läuft darin mit
});

test('[Schema 93·Gegenprobe] der Kern vor der Stufe liegt unter 93 — er öffnet die neue Datenform nur lesend', () => {
  const repo = path.join(__dirname, '..');
  let alt;
  try { alt = execFileSync('git', ['show', 'HEAD:vivodepot.html'], { cwd: repo, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (_) { return; }
  const m = /const SCHEMA_VERSION_AKTUELL = (\d+);/.exec(alt);
  if (!m || Number(m[1]) >= 93) return;   // HEAD trägt die Stufe schon: die Gegenprobe gilt für den Stand davor
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-93-alt-'));
  try {
    fs.writeFileSync(path.join(tmp, 'vivodepot.html'), alt);
    assert.ok(ladeKern({ htmlPfad: path.join(tmp, 'vivodepot.html'), blank: true }).V.SCHEMA_VERSION_AKTUELL < 93);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
