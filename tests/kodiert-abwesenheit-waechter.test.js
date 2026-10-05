'use strict';
/* Klassenwächter: Abwesenheitsproben auf kodiertem Inhalt sind still grün.
   Eine Probe „X steht NICHT in der Ausgabe“ auf einem base64url-kodierten Text (JWE, kompaktes SD-JWT, Umschlag) prüft
   nichts: der Klartext kommt dort nie vor. Gefunden am 01.10.2026 (U2-ADR-457), danach im Bestand: drei Proben suchten
   Feldwerte im rohen JWE-Text der Antwort. Sie suchen jetzt im lesbaren Teil (tests/helfer/jwe-lesbar.js), die
   SD-JWT-Proben im entpackten Inhalt (tests/helfer/sdjwt-entpacken.js).

   Der Wächter findet Negativ-Suchen (includes(…) false, not.toContain, indexOf(…) -1, doesNotMatch) auf Variablen, deren
   Name nach kodiertem Inhalt aussieht, ohne einen Entpack-Helfer auf derselben Zeile. Er urteilt nicht über Kodierung —
   er hält fest, dass jede solche Stelle einmal angesehen und begründet ist. Neue Stellen sind rot, bis sie entpacken oder
   mit Grund in der Grundlinie stehen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { jweLesbarerTeil } = require('./helfer/jwe-lesbar.js');
const { lesbar } = require('./helfer/sdjwt-entpacken.js');

const NEG = /\.includes\([^)]*\)\s*,\s*false|\.includes\([^)]*\)\)\.toBe\(false\)|not\.toContain\(|indexOf\([^)]*\)\s*,\s*-1|doesNotMatch\(/;
const SUBJ = /\b(roh|umschlag|jwe|chiffrat|serialisierung|kompakt|ciphertext|ct)\b/;
const ENTPACKT = /lesbar\(|jweLesbarerTeil\(|entpackt\(|entferneChiffrate\(|ohneChiffrate\(/;

// Angesehen am 01.10.2026: Klartext, kein kodierter Inhalt — darum trägt die Suche.
const GRUNDLINIE = new Map([
  ['tests/e2e/lese-app-englisch.spec.js', 'Klartext-Kopf der Depotdatei; geprüft wird gerade, dass dort kein Sprachhinweis steht'],
  ['tests/export-sensibel-subkontext-bereich.test.js', 'roh = JSON.stringify(vollExportJSON) — Klartext-JSON'],
  ['tests/fixtures/persona-p8.js', 'roh = JSON.stringify(d.sektoren) — entschlüsselte Daten'],
  ['tests/m1-gueltigkeit-aufloesung-rohwert.test.js', 'sucht im Quelltext des Kerns, nicht in einer Ausgabe'],
  ['tests/modul-app-signieren-und-packen.test.js', 'roh = die Merkdatei im Klartext'],
  ['tests/schema-88-personenregister-englisch.test.js', 'roh = JSON.stringify(d.menschen) — entschlüsselte Daten'],
  ['tests/uebergabe-protokoll.test.js', 'Klartext-Gerüst des Umschlags (Leck-Probe); die entschlüsselten Daten prüft die Zeile davor'],
]);

function funde(wurzel) {
  const raus = [];
  (function lauf(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) lauf(p);
      else if (/\.(js|mjs)$/.test(e.name)) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((z, i) => {
          if (NEG.test(z) && SUBJ.test(z) && !ENTPACKT.test(z)) raus.push({ datei: path.relative(path.join(wurzel, '..'), p), zeile: i + 1 });
        });
      }
    }
  })(wurzel);
  return raus;
}
const SELBST = 'tests/kodiert-abwesenheit-waechter.test.js';

test('[Kodiert·Abwesenheit] jede Negativ-Suche auf einem kodiert benannten Inhalt entpackt vorher oder steht mit Grund in der Grundlinie', () => {
  const neu = funde(path.join(__dirname)).filter((f) => f.datei !== SELBST && !GRUNDLINIE.has(f.datei));
  assert.deepEqual(neu.map((f) => f.datei + ':' + f.zeile), []);
});

test('[Kodiert·Abwesenheit·Grundlinie] jede Zeile der Grundlinie trifft noch — sie kann nur schrumpfen', () => {
  const dateien = new Set(funde(path.join(__dirname)).map((f) => f.datei));
  assert.deepEqual([...GRUNDLINIE.keys()].filter((d) => !dateien.has(d)), []);
});

test('[Kodiert·Abwesenheit·Rot-Beweis] die rohe Suche ist blind, die entpackte findet den Namen', () => {
  // JWE: ein Name in apu steht nicht im rohen Text, aber im lesbaren Teil.
  const kopf = Buffer.from(JSON.stringify({ alg: 'ECDH-ES', enc: 'A256GCM', apu: Buffer.from('Hedwig').toString('base64url') })).toString('base64url');
  const jwe = kopf + '..iv.ct.tag';
  assert.equal(jwe.includes('Hedwig'), false, 'die rohe Suche ist blind');
  assert.equal(jweLesbarerTeil(jwe).includes('Hedwig'), true);
  // SD-JWT: ein Claim in einer Offenlegung.
  const d = Buffer.from(JSON.stringify(['s', 'given_name', 'Erika'])).toString('base64url');
  const sd = Buffer.from('{"alg":"Ed25519"}').toString('base64url') + '.' + Buffer.from('{"_sd":[]}').toString('base64url') + '.sig~' + d + '~';
  assert.equal(sd.includes('Erika'), false, 'die rohe Suche ist blind');
  assert.equal(lesbar(sd).includes('Erika'), true);
  // Und der Wächter findet eine neue, blinde Stelle.
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'kodiert-'));
  try {
    fs.mkdirSync(path.join(tmp, 'tests'));
    fs.writeFileSync(path.join(tmp, 'tests', 'probe.test.js'), "assert.equal(jwe.includes('Hedwig'), false);\n");
    assert.deepEqual(funde(path.join(tmp, 'tests')).map((f) => f.datei), ['tests/probe.test.js']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
