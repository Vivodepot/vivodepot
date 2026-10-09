'use strict';
/* Befund MITSCHRIFT-AB-WERK-NACH-POSITION (05.10.2026). Die Mitschrift (`abWerkMitschrift`) steht in der Datei. Der Kern nahm sie dort,
   wo das Produkt keine eigene Ab-Werk-Konstante trägt (Gerüst), als Ab-Werk-Saat, und Situationen und Wizards der Mitschrift immer —
   allein weil sie an dieser Stelle standen. Jetzt gilt ein Eintrag nur nach INHALT als ab Werk (_mitschriftNachInhalt → _abWerkGleich):
   Rezept-Fingerabdruck oder, beim Öffnen, eine früher ausgelieferte Fassung (Entscheidung A: alte echte Dateien bleiben unmarkiert).
   Bereich, Rechtsraum-Katalog und Dokumente haben noch keine Fingerabdrücke — der Befund bleibt dafür offen.
   Gegenstück in der Lese-App: tests/lese-app-vertrauen-nie-aus-datei.test.js. */
const { test, after } = require('node:test');
/* Wegwerf-Verzeichnisse der Rot-Beweise (geänderte Kern-Kopien) werden am Ende geräumt. */
const _wegwerf = [];
after(() => { for (const d of _wegwerf) fs.rmSync(d, { recursive: true, force: true }); });
const _wegwerfDir = (praefix) => { const d = fs.mkdtempSync(path.join(require('node:os').tmpdir(), praefix)); _wegwerf.push(d); return d; };
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');

const KERN_HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const V810_SITUATIONEN = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mitschrift-fruehere-fassung-v810-situationen.json'), 'utf8'));
const kopie = (x) => JSON.parse(JSON.stringify(x));

let _ms = null;
async function echteMitschrift() {
  if (!_ms) {
    const k = kernAus(produktHtml('pro-de'));
    await k.V.depotAnlegen('pw-mitschrift-kern-1');
    k.V.akteurSelbstErklaeren('M');
    _ms = kopie(k.V.ankerDaten().abWerkMitschrift);
  }
  return kopie(_ms);
}
const FREMD = Object.freeze({
  logikModul: { modulTyp: 'logikModul', id: 'untergeschoben', titel: 'Untergeschoben', sektor: 'advanceCare', herkunft: 'vivodepot', abschnitte: [] },
  situationen: { modulTyp: 'situation', moduleVersion: 1, herkunft: 'vivodepot', situationen: {
    'untergeschoben': { icon: 'star', titel: 'Untergeschoben', bloecke: [{ id: 'b', titel: 'B', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] } } },
});

async function geoeffnet(V, ms) {
  const d = { abWerkMitschrift: ms };
  await V._depotModuleAbWerkPruefen(d, true);
  return d;
}

test('[Mitschrift·Kern] echte Mitschrift bleibt Saat, ein untergeschobener Eintrag nicht — Logikmodul und Situation', async () => {
  const { V } = ladeKern({ blank: true });
  const ms = await echteMitschrift();
  ms.logikModul.push(kopie(FREMD.logikModul));
  ms.situationen.push(kopie(FREMD.situationen));
  const d = await geoeffnet(V, ms);
  const logik = V._mitschriftNachInhalt(d.abWerkMitschrift.logikModul).map((m) => m.id);
  assert.ok(logik.length >= 1 && !logik.includes('untergeschoben'), JSON.stringify(logik));
  assert.equal(V._mitschriftNachInhalt(d.abWerkMitschrift.situationen).length, d.abWerkMitschrift.situationen.length - 1);
  const saat = V._logikModulAbWerkSeed(d).map((m) => m.id);
  assert.ok(!saat.includes('untergeschoben'), 'nicht gesät: ' + JSON.stringify(saat));
  V._situationModulAbWerkSeed(d);
  assert.ok(!V._situationIndexHalter()['untergeschoben'], 'die untergeschobene Situation entsteht nicht');
  assert.equal(V.SITUATIONEN_MODUL_VERWORFEN.filter((v) => v.grund === 'mitschrift-nicht-ab-werk').length, 1, 'genau der untergeschobene wird benannt, die echten nicht');
});

test('[Mitschrift·Kern·Rot-Beweis] der alte Stand „nach Position“ sät den untergeschobenen Eintrag', async () => {
  const a = '    if (_abWerkHerkunft(m)) raus.push(m);';
  assert.equal(KERN_HTML.split(a).length, 2, 'Vorbedingung');
  const p = path.join(_wegwerfDir('mitschrift-alt-'), 'vivodepot.html');
  fs.writeFileSync(p, KERN_HTML.replace(a, '    if (true) raus.push(m);'));
  const { V } = ladeKern({ htmlPfad: p });
  const ms = await echteMitschrift();
  ms.situationen.push(kopie(FREMD.situationen));
  const d = await geoeffnet(V, ms);
  V._situationModulAbWerkSeed(d);
  assert.ok(V._situationIndexHalter()['untergeschoben'], 'der alte Stand legt sie an — genau das fängt die Probe oben');
});

/* Entscheidung A (05.10.2026): eine echte Datei aus einer früher ausgelieferten Fassung (hier: die Situationen von v810, Beleg
   der Erzeuger früherer Fassungen) bleibt ab Werk; dieselbe Nutzlast mit einem geänderten Byte nicht. */
test('[Mitschrift·Kern·frühere Fassung] echte Mitschrift von v810 ist ab Werk; ein Byte geändert nicht', async () => {
  const { V } = ladeKern({ blank: true });
  const echt = V810_SITUATIONEN();
  const manipuliert = V810_SITUATIONEN();
  const sid = Object.keys(manipuliert.situationen)[0];
  manipuliert.situationen[sid].titel += '.';
  const d = await geoeffnet(V, { situationen: [echt, manipuliert] });
  const ab = V._mitschriftNachInhalt(d.abWerkMitschrift.situationen);
  assert.equal(ab.length, 1);
  assert.equal(ab[0], d.abWerkMitschrift.situationen[0], 'die echte frühere Fassung');
});

test('[Frühere Fassung·Kern] im Fach eines Datei-Moduls zählt eine frühere Nutzlast für die Herkunft, nicht für den Schutz', async () => {
  const { V } = ladeKern({ blank: true });
  const alt = V810_SITUATIONEN();
  const d = { situationsModule: [alt], abWerkMitschrift: {} };
  await V._depotModuleAbWerkPruefen(d, true);
  assert.equal(V._abWerkHerkunft(alt), true, 'Herkunft: ab Werk, ohne Sperre und ohne Warnung');
  assert.equal(V._abWerkGleich(alt), false, 'Schutz: nur die laufende Fassung');
});

/* Der Ersatz alter Ab-Werk-Kopien (E4) bleibt auf Logikmodule beschränkt — eine frühere Textsatz- oder
   Situations-Nutzlast im Depot wird nie still ersetzt, auch wenn ihr Fingerabdruck jetzt in der Menge früherer Fassungen steht. */
test('[E4·nur Logikmodul] eine frühere Situations-Nutzlast in der Datei wird nicht ersetzt', async () => {
  const k = kernAus(produktHtml('pro-de'));
  const alt = V810_SITUATIONEN();
  const d = { logikModule: [kopie(FREMD.logikModul)], situationsModule: [alt] };   // nicht leer, sonst endete E4 vorher
  const ersetzt = await k.V._alteAbWerkKopienErsetzen(d);
  assert.deepEqual(ersetzt, []);
  assert.equal(d.situationsModule[0], alt);
  assert.equal(d.logikModule.length, 1, 'ein fremdes Logikmodul ohne frühere Fassung bleibt ebenfalls');
});

/* Wort der Gegenlesung zu ERLAUBTE_NICHT_AB_WERK_AUFRUFE (Tabelle der Ab-Werk-Rangfolge, 05.10.2026): `_mitschriftNachInhalt`
   und `modulBelegGeprueft` sind Leser bzw. Filter und säen nichts ab Werk. Gemessen am Verhalten: nach dem Aufruf ist kein fremdes
   Modul ab Werk und keine Saat gewachsen. */
function saeenNichts(V) {
  const fremd = kopie(FREMD.logikModul);
  const vorher = V._logikModulAbWerkSeed({}).length;
  V._mitschriftNachInhalt([fremd]);
  V.modulBelegGeprueft(fremd);
  return V._abWerkGleich(fremd) === false && V._logikModulAbWerkSeed({}).length === vorher;
}
test('[Ab-Werk-Aufrufer·Leser] _mitschriftNachInhalt und modulBelegGeprueft säen nichts ab Werk', () => {
  assert.equal(saeenNichts(ladeKern({ blank: true }).V), true);
});
test('[Ab-Werk-Aufrufer·Leser·Rot-Beweis] ein Filter, der ein Modul als ab Werk einträgt, fällt auf', () => {
  const a = 'function _mitschriftNachInhalt(liste, verworfen) {\n';
  assert.equal(KERN_HTML.split(a).length, 2, 'Vorbedingung');
  const p = path.join(_wegwerfDir('mitschrift-saet-'), 'vivodepot.html');
  fs.writeFileSync(p, KERN_HTML.replace(a, a + '  if (!_ABWERK_BELEGT) _ABWERK_BELEGT = new WeakSet(); for (const m of (liste || [])) if (m && typeof m === \'object\') _ABWERK_BELEGT.add(m);\n'));
  assert.equal(saeenNichts(ladeKern({ htmlPfad: p }).V), false);
});

/* Befund ABWERK-ABDRUCK-VERLUST-ZWISCHEN-FASSUNGEN (05.10.2026): ein Sprachmodul einer früher ausgelieferten Fassung im Fach der Datei ist
   nicht gesperrt (keine Warnung), seine Schutz-Kennungen übernimmt der Kern trotzdem nicht — sie kommen aus der laufenden Fassung.
   Die frühere Fassung wird mit einem geänderten Text nachgestellt, ihr Abdruck in eine Probe-Kopie der Region gesetzt. */
async function kernMitFruehererFassung(variante) {
  const roh = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8'));
  const modul = Object.assign({}, roh, { sprache: 'fr', texte: Object.assign({}, roh.texte, { 'strings:fussQuellcode.text': 'Code source (frühere Fassung)' }) });
  const { V: K0 } = ladeKern({ blank: true });
  const fp = await K0._modulRezeptFingerabdruck(kopie(modul));
  const region = 'const ABWERK_FRUEHERE_FASSUNGEN_KERN = new Set([\n';
  assert.equal(KERN_HTML.split(region).length, 2, 'Vorbedingung: die Region steht genau einmal');
  let html = KERN_HTML.replace(region, region + '  "' + fp + '",\n');
  if (variante) html = variante(html);
  const p = path.join(_wegwerfDir('frueher-'), 'vivodepot.html');
  fs.writeFileSync(p, html);
  const { V } = ladeKern({ htmlPfad: p });
  const d = { textsatzModule: [kopie(modul)], abWerkMitschrift: {} };
  await V._depotModuleAbWerkPruefen(d, true);
  V._depotModuleSperreMarkieren(d, true);
  return { V, d, m: d.textsatzModule[0] };
}
test('[Frühere Fassung·Kern·Befund] ein Sprachmodul einer früheren Fassung ist nicht gesperrt und nicht ab Werk für den Schutz', async () => {
  const { V, m } = await kernMitFruehererFassung();
  assert.equal(V._abWerkHerkunft(m), true);
  assert.equal(V._abWerkGleich(m), false);
  assert.equal(V._depotModulGesperrt('textsatzModule', m), false, 'keine Sperre, keine Warnung');
});
test('[Frühere Fassung·Kern·Befund·Rot-Beweis] ohne die frühere Fassung wäre es gesperrt', async () => {
  const a = '      else if (ABWERK_FRUEHERE_FASSUNGEN_KERN.has(fp)) {\n        _ABWERK_FRUEHER.add(m);\n        _ABWERK_FRUEHER_SCHUTZ.set(m, ABWERK_SCHUTZ_ZURUECKGEZOGEN_KERN.get(fp) || []);\n      }\n';
  assert.equal(KERN_HTML.split(a).length, 2, 'Vorbedingung');
  const { V, m } = await kernMitFruehererFassung((h) => h.replace(a, ''));
  assert.equal(V._depotModulGesperrt('textsatzModule', m), true, 'der alte Stand sperrt die echte frühere Datei — genau das fängt die Probe oben');
});
