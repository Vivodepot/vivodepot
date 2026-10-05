'use strict';
/* Kein Standardname ohne Registerzeile mit Prüfer (30.09.2026).
   Der Exportweg der Verwaltungsdaten hieß „XÖV (Verwaltung)“, ohne dass ein XÖV-Standard seine Daten
   trägt; die Rollencode-Liste belegte den KoSIT-Namensraum urn:xoev-de. Beides ist umgestellt
   (Verwaltungs-Stammdaten, urn:vivodepot:codeliste:rollencode). Diese Datei hält die Klasse:
   tools/standardnamen-pruefen.js gegen tools/standardnamen-grundlinie.json, dazu das Rückwärtslesen
   der alten Kennungen (Format-Kürzel XOEV, alte Rollencode-URI).
   Seit 01.10.2026 (Befund EDCI-EXPORT-NICHT-EDC-AP) auch je WEG: ein gedeckter Name gilt an einem Export oder Import nur, wenn
   eine Registerzeile mit Prüfer genau diesen Weg führt. Der Bildungs-Export hieß „EDCI/Europass“, gedeckt allein durch den
   geprüften Import echter EDC; er heißt jetzt Bildungsangaben, und die alte Kennung, das alte Kürzel EDCI und eine echte alte
   Datei werden weiter gelesen. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/standardnamen-pruefen.js');

const WEGWERF = [];
function wegwerfOrdner(praefix) { const d = fs.mkdtempSync(path.join(os.tmpdir(), praefix)); WEGWERF.push(d); return d; }
after(() => { for (const d of WEGWERF) fs.rmSync(d, { recursive: true, force: true }); });

const REPO = path.join(__dirname, '..');
const SCHUTZ = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'standardnamen-schutz.json'), 'utf8'));
// Das ausgelieferte Ab-Werk-Modul (so steht es in der Mitschrift jedes Depots), einmal mit dem alten Kürzel.
const MODUL = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'bereiche-nativ-katalog-modul.json'), 'utf8'));

function modulMitFormat(format, id) {
  const v = JSON.parse(JSON.stringify(MODUL));
  const b = Object.assign({}, v.bereiche.administration, { format, id });
  v.bereiche = { [id]: b };
  return v;
}

test('[Standardnamen] Außentexte und Ausgaben des Repos stehen auf ihrer Grundlinie', () => {
  // öffentlich fehlt ein Teil des Bestands: dort gilt der Deckel als Obergrenze (tests/helfer/nur-privat.js)
  const r = W.pruefen({ nurObergrenze: require('./helfer/nur-privat.js').istOeffentlich(path.join(__dirname, '..')) });
  assert.deepEqual(r.maengel, [], r.maengel.join('\n'));
  assert.equal(r.funde['XÖV'], undefined, 'XÖV steht nirgends mehr');
});

test('[Standardnamen·Rot-Beweis] „XÖV (Verwaltung)“ in einem Außentext fällt', () => {
  const dok = path.join(wegwerfOrdner('standardnamen-'), 'STANDARDS.md');
  fs.writeFileSync(dok, '| XÖV (Verwaltung) | `xoev-verwaltung` |\n');
  const r = W.pruefen({ extraDokumente: [dok] });
  assert.ok(r.maengel.some((m) => m.startsWith('XÖV: 1 ')), r.maengel.join('\n'));
});

test('[Standardnamen·Rot-Beweis] eine Code-Liste im Namensraum urn:xoev-de fällt, das Format-Kürzel XOEV auch', () => {
  const texte = [
    { ort: 'code-listen/x.json#uri', text: 'urn:xoev-de:vivodepot:codeliste:rollencode' },
    { ort: 'vivodepot.html#SEKTOR_FORMATE', text: 'XOEV' },
    { ort: 'kein Fund', text: 'xoev-verwaltung' },
  ];
  const f = W.zaehlen(SCHUTZ, texte, new Set());
  assert.equal(f['XÖV'].zahl, 2, JSON.stringify(f));
  assert.deepEqual(W.urteil(f, {}).filter((m) => m.startsWith('XÖV')).length, 1);
});

test('[Standardnamen] ein Name mit Registerzeile in einer Familie mit Prüfer zählt nicht; ohne Prüfer zählt er', () => {
  const dir = wegwerfOrdner('standardnamen-reg-');
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ familie: 'fhir-ig', adapter: 'hl7-fhir-validator', standards: [{ id: 'ips' }] }));
  fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify({ familie: 'xml-xsd', adapter: null, standards: [{ id: 'edc-ap' }] }));
  const gedeckt = W.gedeckteNamen(SCHUTZ, dir);
  assert.ok(gedeckt.has('IPS'));
  assert.ok(!gedeckt.has('EDCI'), 'eine Zeile ohne Adapter deckt nicht');
});

test('[Standardnamen·Ratsche] der Deckel sinkt nur: ein Ist unter dem Deckel verlangt das Senken', () => {
  assert.equal(W.urteil({ FIM: { zahl: 3, orte: ['x'] } }, { FIM: 3 }).length, 0);
  assert.match(W.urteil({ FIM: { zahl: 2, orte: ['x'] } }, { FIM: 3 })[0], /senken/);
  assert.match(W.urteil({ FIM: { zahl: 4, orte: ['x'] } }, { FIM: 3 })[0], /erlaubt 3/);
});

test('[Standardnamen·öffentlich] im öffentlichen Stand gilt der Deckel als Obergrenze: weniger ist grün, eine neue Fundstelle fällt', () => {
  assert.deepEqual(W.urteil({ 'SD-JWT VC': { zahl: 2, orte: ['STANDARDS.md'] } }, { 'SD-JWT VC': 12 }, { nurObergrenze: true }), []);
  // Rot-Beweis: auch öffentlich ist eine Fundstelle über dem Deckel rot, und ein Name ohne Eintrag ebenso
  assert.match(W.urteil({ FIM: { zahl: 4, orte: ['x'] } }, { FIM: 3 }, { nurObergrenze: true })[0], /erlaubt 3/);
  assert.match(W.urteil({ XMeld: { zahl: 1, orte: ['x'] } }, {}, { nurObergrenze: true })[0], /erlaubt 0/);
});

test('[Standardnamen·Rückwärtslesen] eine alte Vorlage mit Format-Kürzel XOEV öffnet sich unverändert und zeigt VERWALTUNG', async () => {
  const { ladeKern } = require('./load-kern.js');
  const { V, document } = ladeKern();
  const g = V.bereichsModulPruefen(modulMitFormat('XOEV', 'administration'), { abWerk: true });
  const n = V.bereichsModulPruefen(modulMitFormat('VERWALTUNG', 'administration'), { abWerk: true });
  assert.equal(g.gueltig, true, JSON.stringify(g.grund));
  assert.deepEqual(g.verworfene, n.verworfene, 'das alte Kürzel wird genauso angenommen wie das neue');
  assert.equal(g.bereiche[0].format, 'XOEV', 'gelesen wird das alte Kürzel, nichts wird umgeschrieben');
  assert.equal(V.sektorFormatLesen('XOEV'), 'VERWALTUNG');
  assert.equal(V.sektorFormatLesen('FHIR_IPS'), 'FHIR_IPS');
  await V.depotAnlegen('pw');
  V.renderSektor(Object.assign({ label: 'Verwaltung' }, g.bereiche[0], { id: 'alt-verwaltung' }));
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('VERWALTUNG') && !html.includes('XOEV'), 'angezeigt wird das neue Kürzel');
  assert.equal(V.SEKTOR_FORMATE.XOEV, undefined, 'geschrieben wird nur das neue');
});

test('[Standardnamen·Rückwärtslesen] die Lese-App liest ein Depot mit dem alten Kürzel in der Mitschrift genau wie eines mit dem neuen', () => {
  const { ladeLesen } = require('./load-lesen.js');
  const lauf = (format) => {
    const L = ladeLesen().V;
    L._bereichsModuleAusDepotAnmeldenLesen({ abWerkMitschrift: { bereich: [modulMitFormat(format, 'verwaltung-lesen')] } });
    return JSON.stringify(L.BEREICHS_MODUL_VERWORFEN_LESEN);
  };
  assert.equal(lauf('XOEV'), lauf('VERWALTUNG'), 'die Lese-App behandelt das alte Kürzel genau wie das neue');
});

test('[Standardnamen·Rückwärtslesen] die alte Rollencode-URI im Namensraum urn:xoev-de wird auf die eigene gelesen', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  assert.equal(V.kanonischesCodeSystem('urn:xoev-de:vivodepot:codeliste:rollencode'), 'urn:vivodepot:codeliste:rollencode');
  assert.equal(V.liesCodeListe('xoev-rollencode').uri, 'urn:vivodepot:codeliste:rollencode');
});

/* ── Wegebene (01.10.2026) ───────────────────────────────────────────────────────────────── */

const ZEILEN = (pruefer, ex, im) => new Map([['edc-ap', { pruefer, export: new Set(ex), import: new Set(im) }]]);
const EDCI = { namen: SCHUTZ.namen.filter((n) => n.name === 'EDCI') };

test('[Standardnamen·Wegebene·Rot-Beweis] ein Name, gedeckt nur durch einen ANDEREN Weg, fällt am Export', () => {
  const wege = [{ richtung: 'export', id: 'x-bildung', texte: ['Bildungsnachweise (EDCI/Europass-orientiert).'] }];
  const m = W.wegeMaengel(EDCI, wege, ZEILEN(true, [], ['x-extern']));
  assert.equal(m.length, 1);
  assert.match(m[0], /Export x-bildung nennt den Namen/);
});

test('[Standardnamen·Wegebene] derselbe Name am Weg, den die Registerzeile führt, fällt nicht; ohne Prüfer der Familie fällt er', () => {
  const wege = [{ richtung: 'import', id: 'x-extern', texte: ['Europass'] }];
  assert.deepEqual(W.wegeMaengel(EDCI, wege, ZEILEN(true, [], ['x-extern'])), []);
  assert.equal(W.wegeMaengel(EDCI, wege, ZEILEN(false, [], ['x-extern'])).length, 1, 'eine Registerzeile ohne Prüfer deckt nicht');
  assert.equal(W.wegeMaengel(EDCI, [{ richtung: 'export', id: 'x-extern', texte: ['Europass'] }], ZEILEN(true, [], ['x-extern'])).length, 1, 'die Richtung zählt mit');
});

test('[Standardnamen·Wegebene] die Wege kommen aus dem Kern: jeder Export und Import mit Kennung, Beschriftung und Ausgabe', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern({ backen: true });
  V.vorschauDepotErzeugen();
  const wege = W.wegeTexte(V);
  assert.equal(wege.filter((w) => w.richtung === 'export').length, V.EXPORT_FORMATE.length);
  assert.equal(wege.filter((w) => w.richtung === 'import').length, V.IMPORT_FORMATE.length);
  const bildung = wege.find((w) => w.richtung === 'export' && w.id === 'bildungsangaben');
  assert.ok(bildung && bildung.texte[3].includes('vivodepot-bildung-1'), 'die Ausgabe selbst steht unter den Texten des Wegs');
  assert.deepEqual(W.wegeMaengel(SCHUTZ, wege, W.registerWege(path.join(REPO, 'tools', 'standards-register'))), []);
});

/* Die echte alte Datei: der Bildungs-Export, wie das Produkt ihn bis v863 schrieb — eingefroren aus der Golden-Master-Aufnahme
   der Ausgabewege (tests/fixtures/golden-master-ausgabewege-baseline.json, Stand v840, Referenzdepot), nur erstelltAm statt
   des normalisierten Platzhalters. */
const ALT = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'bildungsangaben-alt-edci-1.0.json'), 'utf8');

test('[Standardnamen·Rückwärtslesen] eine echte alte Bildungsdatei (edci-1.0-vivodepot) wird erkannt und eingelesen wie eine neue', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern({ backen: true });
  assert.equal(JSON.parse(ALT).schemaVersion, 'edci-1.0-vivodepot', 'Vorbedingung: die Datei ist alt');
  const erkannt = V.IMPORT_FORMATE.filter((f) => typeof f.erkennen === 'function' && f.erkennen(ALT)).map((f) => f.id);
  assert.deepEqual(erkannt, ['bildungsangaben']);
  const felder = V.importFormatFuerId('bildungsangaben').parse(ALT).felder;
  const neu = JSON.stringify(Object.assign(JSON.parse(ALT), { schemaVersion: V.BILDUNGSANGABEN_SCHEMA }));
  assert.deepEqual(felder, V.importFormatFuerId('bildungsangaben').parse(neu).felder, 'alt und neu ergeben dieselben Felder');
  assert.ok(JSON.stringify(felder).includes('Luitpold-Gymnasium München'), 'die Werte kommen an');
});

test('[Standardnamen·Rückwärtslesen] die alte Kennung edci-bildung und das alte Kürzel EDCI werden gelesen, geschrieben wird nur das neue', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern({ backen: true });
  assert.equal(V.exportFormatFuerId('edci-bildung').id, 'bildungsangaben');
  assert.equal(V.importFormatFuerId('edci-bildung').id, 'bildungsangaben');
  assert.equal(V.importKlartextFuer('edci-bildung'), V.importKlartextFuer('bildungsangaben'));
  assert.equal(V.sektorFormatLesen('EDCI'), 'BILDUNG');
  assert.equal(V.SEKTOR_FORMATE.EDCI, undefined);
  V.vorschauDepotErzeugen();
  const aus = V.exportFormatFuerId('bildungsangaben').baue({});
  assert.equal(aus.schemaVersion, 'vivodepot-bildung-1');
  assert.doesNotMatch(JSON.stringify(aus), /EDCI|Europass|esco|ESCO/, 'die Datei nennt keinen Standard, den sie nicht spricht');
});

test('[Standardnamen·Rückwärtslesen·Rot-Beweis] die frühere Kennung bleibt reserviert: ein fremdes Formatmodul unter edci-bildung wird abgewiesen', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern({ backen: true });
  const modul = (format) => ({ modulTyp: 'format', sprache: 'de', moduleVersion: 1, format, richtung: 'import', sektor: 'education',
    label: 'Fremd', akzeptiert: '.json', leser: 'json', erkennen: [{ pfad: 'a', gleich: 'b' }], zuordnung: [] });
  assert.equal(V.formatModulPruefen(modul('edci-bildung')).grund, 'reserviert', 'die alte Kennung');
  assert.equal(V.formatModulPruefen(modul('bildungsangaben')).grund, 'reserviert', 'die neue Kennung');
  assert.notEqual(V.formatModulPruefen(modul('eigenes-bildungsformat')).grund, 'reserviert', 'Gegenprobe: ein freier Name ist nicht reserviert');
});

/* U2-ADR-465: ein Format-Modul im Repo ist unsigniert; ein fremder Namensraum darin ist ein Mangel. */
test('[Standardnamen·Namensraum] kein Modul im Repo setzt einen fremden Namensraum', () => {
  assert.deepEqual(W.modulNamensraeume(), []);
});
test('[Standardnamen·Namensraum·Rot-Beweis] ein unsigniertes Modul mit urn:xoev-de-Namensraum fällt, der eigene nicht', () => {
  const fremd = { modulTyp: 'format', format: 'probe', namensraum: 'urn:xoev-de:xfall:standard:fim-s99000001_1.0' };
  const eigen = { modulTyp: 'format', format: 'probe2', namensraum: 'urn:vivodepot:probe:1' };
  const f = W.modulNamensraeume(undefined, [{ ort: 'probe.json', wert: [fremd, eigen] }]);
  assert.deepEqual(f, ['probe.json: Format-Modul probe setzt den fremden Namensraum urn:xoev-de:xfall:standard:fim-s99000001_1.0 ohne Signatur']);
  const r = W.pruefen({ extraModule: [{ ort: 'probe.json', wert: fremd }] });
  assert.ok(r.maengel.some((m) => /fremden Namensraum/.test(m)), 'der Mangel landet im Gesamturteil');
});
