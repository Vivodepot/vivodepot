'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-465 Nachtrag (05.11.2026) — Datum des Antrags, Feld für die Unterschrift, ja/nein als Code
   ────────────────────────────────────────────────────────────────────────
   Ein Leistungsschema verlangt ein Datum als Zeitpunkt (xs:dateTime), ein Element für die Unterschrift (xs:anyType, Pflicht)
   und bei ja/nein-Fragen die Codes einer Codeliste statt true/false. Zusicherungen:
     · Die Ableitung `heute` setzt das Datum des Geräts; ein Modul nennt nur die Regel, kein Feld, kein Datum.
     · Der Datumsteil `zeitpunkt` macht aus JJJJ-MM-TT den Zeitpunkt JJJJ-MM-TTT00:00:00, an `heute` und an einem Feld.
     · `leer` schreibt ein leeres Element, das bei der Stelle ausgefüllt wird. Die Datei entsteht nur, wenn die Person den
       Hinweis gesehen hat (`leerGesehen`); sonst keine Datei und der Grund ist benannt — nie still leer.
     · `werte: { ja, nein }` an `abgeleitet` und an einer ja/nein-Frage schreibt den Code statt true/false.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const CODES = Object.freeze({ ja: '002', nein: '001' });
const MODUL = Object.freeze({
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-antrag-datum', richtung: 'export', schreiber: 'xml@1',
  sektor: 'identity', label: 'Probe Antrag', quelle: 'antrag',
  zuordnung: [
    { feld: 'familyName', ziel: 'G1.F1' },
    { feld: 'birthDate', teil: 'zeitpunkt', ziel: 'G1.F2' },
    { abgeleitet: { regel: 'nichtLeer', feld: 'email', werte: CODES }, ziel: 'G1.F3' },
    { antrag: { id: 'umzug', frage: 'Ist ein Umzug geplant?', typ: 'janein', pflicht: true, werte: CODES }, ziel: 'G1.F4' },
    { abgeleitet: { regel: 'heute', teil: 'zeitpunkt' }, ziel: 'G2.F5' },
    { leer: { beschriftung: 'Unterschrift' }, ziel: 'G2.F6' },
  ],
});
const element = (xml, name) => { const m = new RegExp('<' + name + '>([^<]*)</' + name + '>').exec(xml); return m ? m[1] : null; };
const leeresElement = (xml, name) => new RegExp('<' + name + '\\s*/>|<' + name + '></' + name + '>').test(xml);

async function depot({ email = 'a@example.org' } = {}) {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
  if (email) V.sektorFeldSetzen('identity', 'email', email);
  return V;
}
function bauen(kanal, extra) {
  const o = Object.assign({ antrag: { umzug: false }, leerGesehen: true, _antragGruende: [], _unabgebildet: [] }, extra || {});
  return { xml: kanal.baue(o), gruende: o._antragGruende };
}
const heuteIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

test('[Antrag·Datum] `heute` mit `zeitpunkt` setzt das Datum des Geräts als Zeitpunkt; `zeitpunkt` an einem Feld ebenso', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  assert.ok(kanal, 'das Modul ergibt einen Kanal: ' + JSON.stringify(V.formatModulPruefen(MODUL).verworfene || V.formatModulPruefen(MODUL).grund));
  const { xml, gruende } = bauen(kanal, { sensibel: true });
  assert.deepEqual(gruende, []);
  assert.equal(element(xml, 'F5'), heuteIso() + 'T00:00:00');
  assert.equal(element(xml, 'F2'), '1964-08-12T00:00:00');
});

test('[Antrag·Codes] ja/nein mit `werte` schreibt den Code, an `abgeleitet` und an der ja/nein-Frage', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  assert.equal(element(bauen(kanal).xml, 'F3'), '002', 'E-Mail geführt: ja');
  assert.equal(element(bauen(kanal).xml, 'F4'), '001', 'kein Umzug: nein');
  assert.equal(element(bauen(kanal, { antrag: { umzug: true } }).xml, 'F4'), '002');
  const ohne = await depot({ email: '' });
  assert.equal(element(bauen(ohne.formatModulZuExportKanal(MODUL)).xml, 'F3'), '001', 'E-Mail leer: nein');
  // Die Frage bleibt für die Person eine ja/nein-Frage: die Codes gehen nicht in den Schritt.
  assert.deepEqual(kanal.antragsfragen.find((f) => f.id === 'umzug'), { id: 'umzug', frage: 'Ist ein Umzug geplant?', typ: 'janein', pflicht: true });
});

test('[Antrag·leer] das leere Element steht in der Datei, wenn die Person den Hinweis gesehen hat; das Feld liegt am Kanal', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  assert.deepEqual(kanal.leerFelder, [{ beschriftung: 'Unterschrift' }]);
  const { xml } = bauen(kanal);
  assert.ok(leeresElement(xml, 'F6'), 'leeres Element F6 in ' + xml);
  assert.ok(xml.indexOf('<F5>') < xml.indexOf('<F6'), 'Folge der Zuordnung');
});

test('[Antrag·leer·Rot-Beweis] ohne `leerGesehen` keine Datei, der Grund ist benannt — nie still leer', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  const r = bauen(kanal, { leerGesehen: undefined });
  assert.equal(r.xml, null);
  assert.deepEqual(r.gruende, [{ leer: 'Unterschrift', grund: 'leer-ungesehen' }]);
});

test('[Antrag·Prüfung·Rot-Beweis] heute mit Feld, Codes ohne ja/nein, Codes an einer Auswahl-Regel im Vorschlag, leer ohne Beschriftung werden abgewiesen', async () => {
  const V = await depot();
  const mit = (z, extra) => Object.assign({}, MODUL, { zuordnung: [{ feld: 'familyName', ziel: 'G1.F1' }, z] }, extra || {});
  const grund = (m) => { const r = V.formatModulPruefen(m); return r.gueltig ? (r.verworfene[0] || {}).grund : r.grund; };
  assert.equal(grund(mit({ abgeleitet: { regel: 'heute', feld: 'email' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet', 'heute nennt kein Feld');
  assert.equal(grund(mit({ abgeleitet: { regel: 'heute', teil: 'irgendwann' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet', 'teil aus der Liste');
  assert.equal(grund(mit({ abgeleitet: { regel: 'nichtLeer', feld: 'email', teil: 'zeitpunkt' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet', 'teil nur an heute');
  assert.equal(grund(mit({ abgeleitet: { regel: 'nichtLeer', feld: 'email', werte: { ja: '2' } }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet', 'werte genau ja und nein');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'janein', werte: { ja: '2', nein: '1', vielleicht: '3' } }, ziel: 'G1.F2' })), 'zuordnung-antrag');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'janein', vorschlag: { regel: 'heute' } }, ziel: 'G1.F2' })), 'zuordnung-antrag', 'heute ist kein ja/nein-Vorschlag');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'janein', vorschlag: { regel: 'nichtLeer', feld: 'email', werte: CODES } }, ziel: 'G1.F2' })), 'zuordnung-antrag', 'ein Vorschlag bleibt ja/nein');
  assert.equal(grund(mit({ leer: {}, ziel: 'G1.F2' })), 'zuordnung-leerfeld');
  assert.equal(grund(mit({ leer: { beschriftung: 'Unterschrift' }, feld: 'email', ziel: 'G1.F2' })), 'zuordnung-leerfeld', 'leer steht allein');
  assert.equal(grund(mit({ leer: { beschriftung: 'Unterschrift' }, ziel: 'G1.F2' }, { richtung: 'import', leser: 'xml@1' })), 'nur-ausgabe');
});
