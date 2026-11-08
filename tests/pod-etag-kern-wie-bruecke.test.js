'use strict';
/* Der Kern nimmt für das Ersetzen der Kind-Datei im Pod genau die ETags an, die die Brücke annimmt (Hinweis der Gegenlesung zu
   S4-A, 06.11.2026, NIEDRIG). Die Brücke (pod/bruecke.js, etagGilt) schickt If-Match nur mit einem ETag in Anführungszeichen,
   schwach (W/"…") oder stark ("…"), mit den Zeichen aus RFC 9110 (etagc, obs-text eingeschlossen), höchstens 256 Zeichen;
   `*` und ein ETag ohne Anführungszeichen weist sie ab. Der Kern prüfte bis dahin nur „druckbares ASCII“ und ließ so `*`
   und ETags ohne Anführungszeichen durch, die die Brücke dann abwies; obs-text wies er ab, obwohl die Brücke ihn annimmt.
   Geprüft wird am Verhalten: podAblegen mit einem Kind-Ziel zum Ersetzen lehnt ein ungültiges ETag sofort ab (pod-kind) und
   öffnet bei einem gültigen die Brücke. Die Brückenseite liest das Muster aus ihrer Quelle, damit beide Seiten nicht
   auseinanderlaufen. Rot-Beweis: gegen den Kern vor diesem Wagen fallen `*`, das ETag ohne Anführungszeichen und obs-text. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KIND = 'https://kind.example/profile/card#me';
const ADRESSE = 'https://speicher.example/person/vivodepot/d/' + 'Z'.repeat(22);

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'pod', 'bruecke.js'), 'utf8');
const m = /var ETAG_MUSTER = (\/.*\/);\n/.exec(QUELLE);
assert.ok(m, 'die Brücke führt ihr ETag-Muster als ETAG_MUSTER');
const BRUECKE_MUSTER = new Function('return ' + m[1])();
assert.match(QUELLE, /function etagGilt\(etag\) \{ return typeof etag === 'string' && etag\.length <= 256 && ETAG_MUSTER\.test\(etag\); \}/,
  'Kontrolle: die Brücke prüft Länge und Muster, sonst nichts');
const brueckeNimmt = (etag) => typeof etag === 'string' && etag.length <= 256 && BRUECKE_MUSTER.test(etag);

// Ein Brückenfenster, das nie antwortet: ein gültiges ETag lässt den Auftrag offen, ein ungültiges lehnt der Kern sofort ab.
function stilleBruecke() {
  const w = { postMessage: () => {} };
  return {
    oeffnen: () => w,
    ziel: { addEventListener: () => {}, removeEventListener: () => {} },
    uhr: () => 1, uhrAus: () => {}, jetzt: () => 1000000,
  };
}
// Der Ablauf ist ein gültiger Jahreswechsel: ohne ihn wiese das Tor jede Kind-Ablage ab (Befund KIND-POD-OHNE-ABLAUF).
async function kernNimmt(V, etag) {
  const p = V.podAblegen('stelle', 'x', Object.assign(stilleBruecke(), { kind: { webid: KIND, ablauf: Date.UTC(2040, 0, 1), adresse: ADRESSE, etag } }));
  const r = await Promise.race([p.then(() => 'aufgeloest', (e) => e.message), new Promise((ok) => setImmediate(() => ok('offen')))]);
  assert.ok(r === 'offen' || r === 'pod-kind', JSON.stringify(etag) + ': unerwartet ' + r);
  return r === 'offen';
}

const FAELLE = [
  ['"E1"', true], ['W/"E1"', true], ['""', true], ['"a!#~"', true], ['"\u0080ÿ"', true],
  ['*', false], ['E1', false], ['W/E1', false], ['"a"b"', false], ['"a b"', false], ['w/"E1"', false],
  ['"E1', false], ['E1"', false], ['"Ā"', false], ['', false],
  ['"' + 'a'.repeat(254) + '"', true], ['"' + 'a'.repeat(255) + '"', false],
];

test('[Pod·ETag] Kontrolle: die Fälle trennen, was die Brücke annimmt, von dem, was sie abweist', () => {
  for (const [etag, soll] of FAELLE) assert.equal(brueckeNimmt(etag), soll, JSON.stringify(etag));
});

test('[Pod·ETag] der Kern nimmt zum Ersetzen genau die ETags an, die die Brücke annimmt', async () => {
  const { V } = ladeKern({ Blob });
  for (const [etag] of FAELLE) assert.equal(await kernNimmt(V, etag), brueckeNimmt(etag), JSON.stringify(etag));
  assert.equal(await kernNimmt(V, 42), false, 'eine Zahl ist kein ETag');
  assert.equal(await kernNimmt(V, null), false, 'beim Ersetzen fehlt kein ETag');
});
