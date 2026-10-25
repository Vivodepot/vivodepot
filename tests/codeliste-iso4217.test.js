'use strict';
/* Die Codeliste iso4217 (03.10.2026, Befund WAEHRUNG-FEST-EUR): eine Quelle (code-listen/iso4217.json), zwei Inline-Kopien —
   die generierte Region CODE-LISTEN im Kern (tools/build-code-listen.js) und VD_CODE_LISTEN im Studio (von Hand, darum hier
   gehalten). Die Liste trägt nur die Codes, die ausgelieferte Templates verwenden: die Weitergabe der vollständigen Liste
   ist an der Primärquelle nicht geregelt (SIX Terms of Use, abgerufen 03.10.2026; tools/code-listen-freigaben.json).
   Gegen die amtliche Liste prüft tools/codelisten-amtlich-abgleich.js --iso4217 <list-one.xml>. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');
const W = require('../tools/waehrung-fest-erheben.js');
const { iso4217Lesen, iso4217Pruefen, waehrungenImProdukt, FIXTURE } = require('../tools/codelisten-amtlich-abgleich.js');

const REPO = path.join(__dirname, '..');
const QUELLE = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', 'iso4217.json'), 'utf8'));
const FELDER = ['uri', 'version', 'kuerzel', 'lizenz'];

function abweichungen(kopie, name) {
  const m = [];
  if (!kopie) return [name + ': iso4217 fehlt'];
  for (const f of FELDER) {
    // Ohne Hinweispflicht trägt der Kern keine Lizenzzeile (Option iii); das Studio führt sie weiter.
    const soll = (f === 'lizenz' && name === 'Kern' && QUELLE.hinweispflicht === false) ? '' : QUELLE[f];
    if (kopie[f] !== soll) m.push(name + '.' + f + ': ' + JSON.stringify(kopie[f]) + ' ≠ Quelle ' + JSON.stringify(soll));
  }
  // Die Quelle heißt die Bezeichnung `anzeigeName`, der Kern führt sie als `anzeigeQuelle` (nicht aufzählbar; `anzeigeName`
  // liest dort das Sprachmodul), das Studio als `anzeige` (VD_CODE_LISTEN, wie loinc dort).
  const anzeigeVon = (d) => (d.anzeigeQuelle !== undefined ? d.anzeigeQuelle : d.anzeigeName !== undefined ? d.anzeigeName : d.anzeige);
  const codes = (l) => (l || []).map((d) => d.code + '=' + anzeigeVon(d)).join(', ');
  if (codes(kopie.daten) !== codes(QUELLE.daten)) m.push(name + '.daten: ' + codes(kopie.daten) + ' ≠ Quelle ' + codes(QUELLE.daten));
  return m;
}
const studioKopie = () => ladeGenerator().V.VD_CODE_LISTEN.iso4217;

test('[ISO 4217·Drift] Quelle, Kern und Studio tragen dieselbe Liste', () => {
  assert.equal(QUELLE.uri, 'urn:iso:std:iso:4217');
  assert.ok(QUELLE.daten.length > 0, 'die Liste trägt Codes');
  const kern = ladeKern().V.CODE_LISTEN.iso4217;
  assert.deepEqual(abweichungen(kern, 'Kern'), []);
  assert.deepEqual(abweichungen(studioKopie(), 'Studio'), []);
});

test('[ISO 4217·Drift·Rot] eine abweichende Kopie wird erkannt', () => {
  const s = studioKopie();
  assert.equal(abweichungen({ ...s, daten: [...s.daten, { code: 'JPY', anzeige: 'JPY' }] }, 'Studio').length, 1);
  assert.equal(abweichungen({ ...s, uri: 'urn:iso:4217' }, 'Studio').length, 1);
  assert.equal(abweichungen(undefined, 'Studio').length, 1);
});

test('[ISO 4217·Nur verwendete Codes] jeder Code der Liste wird von einem ausgelieferten Template verwendet', () => {
  /* Die Lizenz trägt nur weitergegebene Codes, die gebraucht werden. Verwendet heißt: ein Template-Code im Studio-Beispiel,
     eine Format-Definition (gemessen mit tools/waehrung-fest-erheben.js), ein Rechtsraum-Template (`regeln.waehrung`) oder
     die Optionen eines Währungsfelds in einem ausgelieferten Bereichs-Template bzw. dem Bürgermodul (waehrungenImProdukt,
     U2-ADR-480: EUR, USD, GBP, CHF). Die Liste selbst und Test-Fixtures zählen nicht. */
  const e = W.lauf(W.ausgelieferteDokumente());
  const verwendet = new Set(e.dokumente.flatMap((d) => d.funde)
    .filter((f) => f.art === 'template-code' || f.art === 'format-definition').map((f) => f.wert));
  for (const v of waehrungenImProdukt()) if (/^tools\//.test(v.wo)) verwendet.add(v.code);
  for (const d of QUELLE.daten) assert.ok(verwendet.has(d.code), d.code + ' steht in der Liste, aber kein Template verwendet ihn');
});

test('[ISO 4217·Amtlich] jeder Code der Liste steht in der amtlichen Liste — Rot: ein erfundener Code', () => {
  const liste = iso4217Lesen(fs.readFileSync(path.join(FIXTURE, 'list-one.xml'), 'utf8'));
  const ausListe = waehrungenImProdukt().filter((v) => v.wo === 'code-listen/iso4217.json');
  assert.equal(ausListe.length, QUELLE.daten.length, 'der Abgleich liest die Codeliste');
  assert.deepEqual(iso4217Pruefen(liste, ausListe), []);
  assert.equal(iso4217Pruefen(liste, [{ wo: 'code-listen/iso4217.json', code: 'XEU' }]).length, 1);
});

test('[ISO 4217·Template-Code] nur mit genau dieser Kennung und einem Code der Liste — sonst zählt das EUR als fest', () => {
  const zeile = (z) => '<html><script>\nconst F = [\n' + z + '\n];\n</script></html>';
  const fest = (z) => W.erheben(zeile(z), { fremdcode: [] }).fest;
  assert.equal(fest("  { feldname: 'Wert', feldtyp: 'zahl', codeSystem: 'urn:iso:std:iso:4217', codeWerte: [{ code: 'EUR', anzeige: 'Euro' }] },"), 0);
  // Rot: freie Schreibweise der Kennung.
  assert.equal(fest("  { feldname: 'Wert', feldtyp: 'zahl', codeSystem: 'ISO-4217', codeWerte: [{ code: 'EUR', anzeige: 'Euro' }] },"), 1);
  // Rot: ein Code, der nicht in der Liste steht (die Liste trägt nur verwendete Codes).
  const nichtInListe = QUELLE.daten.some((d) => d.code === 'XTS') ? 'XXX' : 'XTS';
  assert.equal(W.erheben(zeile("  { codeSystem: 'urn:iso:std:iso:4217', codeWerte: [{ code: 'EUR', anzeige: 'Euro" + "' }, { code: '" + nichtInListe + " EUR' }] },"), { fremdcode: [] }).fest, 1);
  // Positivkontrolle: ein nacktes EUR neben einem erklärten bleibt fest.
  assert.equal(fest("  { feldname: 'Wert (EUR)', feldtyp: 'zahl', codeSystem: 'urn:iso:std:iso:4217', codeWerte: [{ code: 'EUR', anzeige: 'EUR' }] },"), 2);
});

/* ── Option iii (Gegenlesung, 04.10.2026): im Gerüst nur der Code, den Namen liefert das Sprachmodul ── */
test('[ISO 4217·Gerüst] die Liste trägt als Anzeige nur den Code, und die Kern-Region trägt keine Lizenzzeile dafür', () => {
  for (const d of QUELLE.daten) assert.equal(d.anzeigeName, d.code);
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  // Die Region CODE-LISTEN (U2-ADR-494): je Liste ein Block `/* @vd-codeliste <systemId> */ codeListeAnmelden(…);`.
  const marke = '/* @vd-codeliste iso4217 */';
  const anfang = kern.indexOf(marke);
  assert.ok(anfang > 0 && kern.indexOf(marke, anfang + 1) < 0, 'Vorbedingung: der Block steht genau einmal im Kern');
  const block = kern.slice(anfang, kern.indexOf('\n});', anfang));
  assert.ok(block.includes('codeListeAnmelden("iso4217"') && !/lizenz/.test(block), 'kein lizenz-Feld im iso4217-Block');
  assert.ok(!/Euro/.test(block), 'kein Name im Gerüst');
});

async function anzeigeIn(produkt, spracheSetzen) {
  const { V } = ladeKern({ produkt });
  await V.depotAnlegen('Codeliste-Probe-2026!');
  V.akteurSelbstErklaeren('T');
  if (spracheSetzen) V.getData().textsprache = spracheSetzen;
  return V.CODE_LISTEN.iso4217.daten.find((e) => e.code === 'EUR').anzeigeName;
}

test('[ISO 4217·Anzeige] mit DE- bzw. EN-Modul erscheint der Name, in einer Sprache ohne Eintrag der Code — nie leer, nie eine Kennung', async () => {
  assert.equal(await anzeigeIn('privat-de'), 'Euro');
  assert.equal(await anzeigeIn('privat-en'), 'euro');
  const fremd = await anzeigeIn('privat-de', 'fr');
  assert.equal(fremd, 'EUR');
});

test('[ISO 4217·Anzeige·Rot] ein Sprachmodul ohne den Eintrag zeigt den Code', async () => {
  const { V } = ladeKern({ produkt: 'privat-en' });
  await V.depotAnlegen('Codeliste-Probe-2026!');
  V.akteurSelbstErklaeren('T');
  const en = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const texte = { ...en.texte }; delete texte['codeliste:iso4217/EUR.anzeige'];
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte }));
  assert.ok(r.angenommen, 'Vorbedingung: das Modul ohne den Eintrag wird angenommen');
  V._textsatzModuleAusDepotAnmelden(V.getData());
  V.getData().textsprache = 'it';
  const name = V.CODE_LISTEN.iso4217.daten.find((e) => e.code === 'EUR').anzeigeName;
  assert.equal(name, 'EUR');
  assert.ok(!/codeliste:/.test(name));
});

test('[ISO 4217·Export] eine Ausgabe trägt den Code, nie den angezeigten Namen', async () => {
  const { V } = ladeKern({ produkt: 'privat-de' });
  await V.depotAnlegen('Codeliste-Probe-2026!');
  V.akteurSelbstErklaeren('T');
  // Die Liste ist anzeigeNameEigen: der Name geht nie als coding.display hinaus (s. _codingAnzeige im Kern).
  assert.equal(V.CODE_LISTEN.iso4217.anzeigeNameEigen, true);
  const w = V.codeWertAus('iso4217', 'Euro');   // die Person wählt den angezeigten Namen
  assert.equal(typeof w, 'object');
  assert.equal(w.code, 'EUR');
  assert.equal(w.system, 'urn:iso:std:iso:4217');
  // ELSTER: die Währung aus der Format-Definition ist der Code, auch wenn das DE-Modul „Euro“ anzeigt.
  V.kernAPI.importiere('elster', JSON.stringify({ lohnsteuerbescheinigung: { lohnsteuer: '10.00' } }), { alleKonflikte: true });
  const notiz = JSON.stringify(V.getData().sektoren.finance || {});
  assert.match(notiz, /Lohnsteuer: 10\.00 EUR/);
  assert.doesNotMatch(notiz, /Euro/);
});
