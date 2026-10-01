'use strict';
/* Kein Standardname ohne Registerzeile mit Prüfer (30.09.2026).
   Der Exportweg der Verwaltungsdaten hieß „XÖV (Verwaltung)“, ohne dass ein XÖV-Standard seine Daten
   trägt; die Rollencode-Liste belegte den KoSIT-Namensraum urn:xoev-de. Beides ist umgestellt
   (Verwaltungs-Stammdaten, urn:vivodepot:codeliste:rollencode). Diese Datei hält die Klasse:
   tools/standardnamen-pruefen.js gegen tools/standardnamen-grundlinie.json, dazu das Rückwärtslesen
   der alten Kennungen (Format-Kürzel XOEV, alte Rollencode-URI). */
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
