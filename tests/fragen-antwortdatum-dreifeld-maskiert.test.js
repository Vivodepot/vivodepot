'use strict';
/* Das Antwortdatum einer offenen Frage („Fragen am Eintrag“, U2-ADR-523) steht als Dreifeld wie jedes Datum (Zielbild S4).
   Gebaut wird es mit demselben Bauer wie die übrigen Dreifelder (_datumDreifeldHTML), ohne eigene Variante. Diese Probe hält
   fest: Beschriftung und Wert mit "<" und '"' kommen im Dialog nur maskiert an. Rot-Beweis: derselbe Dialog aus einer Kopie des
   Kerns, in der die Beschriftung roh in das Attribut läuft, trägt das rohe Markup. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const BOESE = '"><img src=x onerror="alert(1)">';
const PW = 'Antwortdatum-Probe-2026!';

function rohesMarkup(html) {
  return /<img\b/i.test(html) ? ['<img> als Element'] : [];
}

/* Die Beschriftung kommt aus dem Textsatz und ist zur Laufzeit unveränderlich. Darum trägt eine Kopie des Kerns den bösen Text
   an genau dieser Stelle: einmal mit der Maskierung des Kerns, einmal roh (Rot-Beweis). */
const MIT = "' aria-label=\"' + escapeAttr(STRINGS.fragenFeldAntwortAm) + '\"', DATUM_JAHR_MIN_WEIT";
async function dialogMitBoeserBeschriftung(maskiert) {
  const kern = fs.readFileSync(KERN, 'utf8');
  assert.equal(kern.split(MIT).length, 2, 'Vorbedingung: die Stelle steht genau einmal im Kern');
  const text = JSON.stringify(BOESE);
  const tmp = path.join(os.tmpdir(), 'fragen-antwortdatum-' + (maskiert ? 'mit' : 'ohne') + '-' + process.pid + '.html');
  fs.writeFileSync(tmp, kern.replace(MIT, "' aria-label=\"' + " + (maskiert ? 'escapeAttr(' + text + ')' : text) + " + '\"', DATUM_JAHR_MIN_WEIT"));
  try {
    const { V } = ladeKern({ htmlPfad: tmp, backen: true });
    await V.depotAnlegen(PW);
    V.akteurSelbstErklaeren('Testerin');
    const bank = V.institutionHinzufuegen({ name: 'Bank', art: 'bank' });
    V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts' }, frage: 'Offene Frage', an: { ref: bank }, gestellt: '2026-11-06' });
    return V._fragenDialogHTML('finance', 'accounts');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

test('[Fragen·Antwortdatum] derselbe Bauer wie die übrigen Dreifelder, keine Variante', () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  assert.equal((kern.match(/function _datumDreifeldHTML\(/g) || []).length, 1, 'genau ein Dreifeld-Bauer');
  assert.ok(kern.includes("_datumDreifeldHTML('data-frage-antwort-am=\"1\"'"), 'das Antwortdatum nutzt ihn');
  assert.ok(!/<input type="date"[^>]*data-frage-antwort-am/.test(kern), 'kein Datumsfeld des Browsers mehr');
});

test('[Fragen·Antwortdatum] Beschriftung und Wert mit "<" und \'"\' stehen nur maskiert im Dialog', async () => {
  const html = await dialogMitBoeserBeschriftung(true);
  assert.ok(html.includes('data-frage-antwort-am="1"'), 'Vorbedingung: das Dreifeld steht im Dialog');
  assert.deepEqual(rohesMarkup(html), []);
  assert.ok(html.includes('&quot;&gt;&lt;img'), 'die Beschriftung steht maskiert im Attribut');
  const { V } = ladeKern();
  const feld = V._datumDreifeldHTML('data-frage-antwort-am="1"', ' aria-label="x"', '1900-01-01', '2100-12-31', BOESE, false);
  assert.deepEqual(rohesMarkup(feld), [], 'ein Wert mit Markup erscheint als Text');
});

test('[Fragen·Antwortdatum·Rot-Beweis] ohne Maskierung der Beschriftung kommt das Markup roh an', async () => {
  assert.deepEqual(rohesMarkup(await dialogMitBoeserBeschriftung(false)), ['<img> als Element']);
});
