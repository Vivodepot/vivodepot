'use strict';
/* Befund ANTWORT-DATEI-OHNE-GROESSENGRENZE (20.10.2026): „Eingegangene Antworten öffnen“ im Studio las jede gewählte Datei ganz
   mit datei.text() ein, bevor irgendetwas geprüft wurde. Eine präparierte Riesendatei, als .jwe benannt, holte der Browser
   vollständig in den Speicher und kodierte sie dann als base64url; die Empfangsseite einer Stelle hing daran. Ein Abfluss oder
   eine Ausführung folgt daraus nicht, aber die Antwort kommt per E-Mail oder Upload von außen, ist also fremde Eingabe.
   Jetzt: ANTWORT_JWE_MAX_ZEICHEN im ANTWORT-JWE-BLOCK (in Kern, Lese-App und Studio zeichengleich). Das Studio prüft datei.size
   vor dem Lesen, und antwortJweOeffnen prüft die Länge vor jeder Rechnung. Wie groß eine echte Antwort werden kann, steht am
   Block im Kommentar zu GRÖSSE. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeLesen } = require('./load-lesen.js');

const WURZEL = path.join(__dirname, '..');
const STUDIO = fs.readFileSync(path.join(WURZEL, 'vivodepot-studio.html'), 'utf8');

async function oeffneImStudio(dateien, html) {
  const { V, sandbox, document } = ladeGenerator(html ? { html } : undefined);
  const karten = [];
  const echt = sandbox.antwortKarte;
  sandbox.antwortKarte = (name, m, sig) => { karten.push({ name, m, sig }); return echt(name, m, sig); };
  const fehler = [];
  const fehlerText = sandbox.antwortFehlerText;
  sandbox.antwortFehlerText = (e) => { const t = fehlerText(e); fehler.push({ code: e && e.message, text: t }); return t; };
  document.getElementById('an-passwort').value = 'probe-groesse';
  document.getElementById('an-dateien').files = dateien;
  await V.antwortenOeffnen();
  return { V, karten, fehler };
}

function riesendatei(gelesen) {
  return { name: 'riesig.jwe', size: 2 * 1024 * 1024 * 1024, text: async () => { gelesen.push(true); return 'x'; } };
}

test('[Antwort·Größe] das Studio liest eine Datei über der Grenze nicht und sagt, warum', async () => {
  const gelesen = [];
  const { V, karten, fehler } = await oeffneImStudio([riesendatei(gelesen)]);
  assert.equal(gelesen.length, 0, 'datei.text() lief für eine Datei über ANTWORT_JWE_MAX_ZEICHEN');
  assert.equal(karten.length, 0, 'aus einer zu großen Datei wurde eine Karte');
  assert.ok(V.ANTWORT_JWE_MAX_ZEICHEN >= 8 * 1024 * 1024, 'die Grenze weist keine echte Antwort ab (etwa 1 MB bei allen Feldern)');
  assert.deepEqual(fehler.map((f) => f.code), ['jwe-zu-gross'], 'die Stelle erfährt, warum nichts geöffnet wurde');
  assert.match(fehler[0].text, /zu groß/);
});

test('[Antwort·Größe] eine Datei an der Grenze wird gelesen (die Grenze schneidet nicht zu früh)', async () => {
  const gelesen = [];
  const { V } = ladeGenerator();
  const grenze = V.ANTWORT_JWE_MAX_ZEICHEN;
  await oeffneImStudio([{ name: 'grenze.jwe', size: grenze, text: async () => { gelesen.push(true); return 'kein-jwe'; } }]);
  assert.equal(gelesen.length, 1, 'eine Datei genau an der Grenze wurde nicht gelesen');
});

test('[Antwort·Größe] antwortJweOeffnen weist einen Text über der Grenze vor jeder Rechnung ab (Lese-App und Studio)', async () => {
  const L = ladeLesen().V;
  const S = ladeGenerator().V;
  const zuLang = 'a'.repeat(L.ANTWORT_JWE_MAX_ZEICHEN + 1);
  await assert.rejects(L.antwortJweOeffnen(zuLang, { passwort: 'x' }), /jwe-zu-gross/);
  await assert.rejects(S.antwortJweOeffnen(zuLang, { passwort: 'x' }), /jwe-zu-gross/);
  await assert.rejects(L.antwortJweOeffnen('a.b.c.d.e', { passwort: 'x' }), /jwe-keine-antwort/, 'Gegenprobe: ein kurzer Text geht an die Kopfprüfung');
  // Die Lese-App erkennt eine JWE mit antwortJweKopf, bevor sie öffnet: auch dort kein split und kein Regex über einen Riesentext.
  const kopf = 'eyJ0eXAiOiJ2aXZvZGVwb3QtYW50d29ydCtqd2UiLCJlbmMiOiJBMjU2R0NNIn0';
  assert.ok(L.antwortJweKopf(kopf + '.a.b.c.d'), 'Gegenprobe: ein gültiger Kopf wird erkannt');
  assert.equal(L.antwortJweKopf(kopf + '.a.b.c.' + 'd'.repeat(L.ANTWORT_JWE_MAX_ZEICHEN)), null, 'über der Grenze erkennt antwortJweKopf nichts');
});

test('[Antwort·Größe·Rot-Beweis] ohne die Prüfung vor dem Lesen liest das Studio die Riesendatei', async () => {
  const ohne = STUDIO.replace("        if (Number(datei.size) > ANTWORT_JWE_MAX_ZEICHEN) throw new Error('jwe-zu-gross');\n", '');
  assert.notEqual(ohne, STUDIO, 'die Prüfung steht nicht mehr an ihrem Ort — die Probe muss nachgezogen werden');
  const gelesen = [];
  await oeffneImStudio([riesendatei(gelesen)], ohne);
  assert.equal(gelesen.length, 1, 'ohne die Prüfung liest das Studio die Datei — die Probe sieht den Befund');
});
