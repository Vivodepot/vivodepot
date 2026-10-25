'use strict';
/* Befund FACH-OBERSTE-EINHEITEN-UNGEFILTERT (20.10.2026, HOCH): Das Fach eines Empfängerkreises bekommt aus dem Zuschnitt
   (empfaengerZuschnittModell) nur die NAMEN der Einheiten und öffnet damit die vollen Einheiten des Depots. Seit 20ded8121
   prüfte _empfaengerFaecherFuerSchreibweg den Wert nur bei Bereichsfeldern (Name mit Punkt). Eine oberste Einheit ging
   ungeprüft durch: Der Zuschnitt eines Kreises, der nur einen Bereich sehen darf, trägt `menschen` und `situationen` leer
   und `sektoren` nur mit den gezeigten Bereichen. Das Fach öffnete trotzdem das ganze Personen-Register, alle Situationen und
   die Liste aller Bereiche. Gemessen am Kern von 20ded8121.
   Jetzt nimmt das Fach eine Einheit nur, wenn ihr Wert im Zuschnitt gleich dem vollen Wert im Depot ist, für jeden Namen. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'Fach-Einheiten-Inhaberin-2026!';
const PW_FACH = 'Fach-Einheiten-Kreis-2026!';
const w = (o) => JSON.stringify(o);
const KERN = path.join(__dirname, '..', 'vivodepot.html');
const VERGLEICH_ZEILE = "        .filter((e) => _kanonischJSON(e.wert) === voll.get(e.name) || (FACH_DEFINITIONSEINHEITEN.includes(e.name) && voll.has(e.name)))\n";

function fuellen(d) {
  d.sektoren.identity = { givenName: 'Anna', familyName: 'Muster' };
  d.sektoren.finance = { taxSoftware: 'MARKER-EINHEIT-STEUER' };
  d.sektoren.health = { bloodType: 'MARKER-EINHEIT-BLUT' };
  d.menschen = (d.menschen || []).concat([{ id: 'p-marker', vorname: 'MARKER-EINHEIT-MENSCH', nachname: 'Beispiel' }]);
  d.situationen = Object.assign({}, d.situationen, { 'marker-situation': { notiz: 'MARKER-EINHEIT-SITUATION' } });
}

async function fachOeffnen(opts) {
  const { V } = ladeKern(opts);
  await V.depotAnlegen(PW);
  const d = V.getData();
  fuellen(d);
  V.setData(d);
  await V.empfaengerkreisSetzen({ name: 'Steuerberatung', bausteine: ['bereich:finance'] });
  const kreis = V.empfaengerkreiseListe()[0];
  const zuschnitt = V.empfaengerZuschnittModell(kreis);
  await V.empfaengerkreisFachEinrichten(kreis, PW_FACH);
  const datei = JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
  const { V: F } = ladeKern(opts);
  await F.depotLaden(JSON.parse(JSON.stringify(datei)), PW_FACH);
  return { V, zuschnitt, fach: F.getData() };
}

const leer = (x) => x === undefined || x === null || x === '' || (Array.isArray(x) && x.length === 0)
  || (typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 0);

test('[Fach·Oberste-Einheit] das Fach eines Kreises mit einem Bereich trägt das Personen-Register nicht', async () => {
  const { zuschnitt, fach } = await fachOeffnen();
  assert.doesNotMatch(w(zuschnitt), /MARKER-EINHEIT-MENSCH/, 'Vorbedingung: der Zuschnitt trägt die Person nicht');
  assert.match(w(fach), /MARKER-EINHEIT-STEUER/, 'Positivkontrolle: das Fach trägt den markierten Bereich');
  assert.doesNotMatch(w(fach), /MARKER-EINHEIT-MENSCH/, 'das Fach trägt das Personen-Register');
});

test('[Fach·Oberste-Einheit] das Fach trägt keine Situation, die der Zuschnitt nicht trägt', async () => {
  const { zuschnitt, fach } = await fachOeffnen();
  assert.doesNotMatch(w(zuschnitt), /MARKER-EINHEIT-SITUATION/, 'Vorbedingung');
  assert.doesNotMatch(w(fach), /MARKER-EINHEIT-SITUATION/, 'das Fach trägt die Situationen');
});

test('[Fach·Oberste-Einheit] das Fach nennt keinen Bereich, den der Zuschnitt nicht zeigt', async () => {
  const { zuschnitt, fach } = await fachOeffnen();
  assert.ok(!Object.keys(zuschnitt.sektoren || {}).includes('health'), 'Vorbedingung: der Zuschnitt zeigt Gesundheit nicht');
  assert.ok(!Object.keys(fach.sektoren || {}).includes('health'), 'das Fach nennt den Bereich Gesundheit');
});

test('[Fach·Oberste-Einheit·Klasse] jede nicht leere oberste Angabe im Fach steht gleich im Zuschnitt', async () => {
  const { zuschnitt, fach } = await fachOeffnen();
  // Die Definitionseinheiten, die das Fach ganz öffnen darf, liest die Probe aus dem Kern selbst (eine Liste, kein Abschreiben).
  const def = /const FACH_DEFINITIONSEINHEITEN = Object\.freeze\(\[([^\]]*)\]\)/.exec(fs.readFileSync(KERN, 'utf8'));
  assert.ok(def, 'die Liste der Definitionseinheiten steht im Kern');
  const erlaubt = def[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
  const mehr = Object.keys(fach).filter((k) => k !== 'sektoren' && !erlaubt.includes(k) && !leer(fach[k]) && w(fach[k]) !== w(zuschnitt[k]));
  assert.deepEqual(mehr, [], 'das Fach trägt oberste Angaben, die der Zuschnitt so nicht trägt');
});

test('[Fach·Oberste-Einheit·Rot-Beweis] ohne den Vergleich jeder Einheit trägt das Fach das Personen-Register', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(VERGLEICH_ZEILE).length, 2, 'der Vergleich steht nicht mehr an seinem Ort — die Probe muss nachgezogen werden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fach-einheiten-'));
  try {
    const ohne = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(ohne, html.replace(VERGLEICH_ZEILE, ''));
    const { fach } = await fachOeffnen({ htmlPfad: ohne, backen: true });
    assert.match(w(fach), /MARKER-EINHEIT-MENSCH/, 'ohne den Vergleich öffnet das Fach das Personen-Register — die Probe sieht den Befund');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Die Ausnahme FACH_DEFINITIONSEINHEITEN gilt nur, solange die Einheit keine Bürgerdaten trägt. Die Mitschrift ab Werk geht nur dort
   ins Fach, wo der Zuschnitt sie nennt: bei einem Bereich, den das Produkt mitbringt (Pro mit Berufsmodul). Die Probe füllt dort jedes
   Textfeld jedes Bereichs, das Personen-Register und die Situationen mit Marken und verlangt: die Mitschrift im Fach trägt keine Marke
   und ist dieselbe wie in einem leeren Depot desselben Produkts. */
const MODUL_BEREICH = 'pro-kanzlei';
let _pro = null;
function proHtml() {
  if (_pro) return _pro;
  const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
  const { PRODUKT_ZUSCHNITTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  const z = PRODUKT_ZUSCHNITTE.find((x) => x.slug === 'pro-de-kanzlei');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'fach-definitionseinheit-'));
  process.once('exit', () => fs.rmSync(ziel, { recursive: true, force: true }));
  const r = konfektionieren({ ziel, slug: 'pro-de-kanzlei', modulauswahl: [], unsignierteModulDateien: modulDateienFuer(z),
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n' });
  _pro = path.join(r.ordner, 'vivodepot.html');
  return _pro;
}

test('[Fach·Definitionseinheit] die Mitschrift ab Werk im Fach trägt keine Bürgerdaten', async () => {
  const { kernAus } = require('./produkt-html-erzeugen.js');
  const html = proHtml();
  const leerDepot = kernAus(html).V;
  await leerDepot.depotAnlegen(PW);
  const ohne = leerDepot.getData().abWerkMitschrift;
  const { V } = kernAus(html);
  await V.depotAnlegen(PW);
  const d = V.getData();
  let n = 0;
  for (const sid of Object.keys(V.SEKTOR_BY_ID).concat([MODUL_BEREICH])) {
    const s = V._sektorAusKatalog(sid);
    const wert = Object.assign({}, d.sektoren[sid]);
    for (const sek of (s && s.sektionen) || []) for (const f of sek.felder || []) {
      if (f.typ === 'text' || f.typ === 'textarea') wert[f.id] = 'MARKER-BUERGER-' + (n++);
    }
    d.sektoren[sid] = wert;
  }
  fuellen(d);
  V.setData(d);
  assert.ok(n >= 20, 'Vorbedingung: die Probe füllt Textfelder in den Bereichen (' + n + ')');
  await V.empfaengerkreisSetzen({ name: 'Vertretung', bausteine: ['bereich:' + MODUL_BEREICH] });
  const kreis = V.empfaengerkreiseListe()[0];
  assert.ok(V.empfaengerZuschnittModell(kreis).abWerkMitschrift, 'Vorbedingung: der Zuschnitt nennt die Mitschrift');
  await V.empfaengerkreisFachEinrichten(kreis, PW_FACH);
  const datei = JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
  const F = kernAus(html).V;
  await F.depotLaden(datei, PW_FACH);
  const fach = F.getData();
  assert.match(w(fach.sektoren[MODUL_BEREICH] || {}), /MARKER-BUERGER-/, 'Positivkontrolle: das Fach trägt den Bereich des Berufsmoduls');
  assert.ok(fach.abWerkMitschrift && w(fach.abWerkMitschrift).length > 100, 'Positivkontrolle: das Fach trägt die Mitschrift');
  assert.doesNotMatch(w(fach.abWerkMitschrift), /MARKER-/, 'die Mitschrift im Fach trägt eine Angabe aus dem Depot');
  assert.equal(w(fach.abWerkMitschrift), w(ohne), 'die Mitschrift im Fach hängt vom Inhalt des Depots ab');
});

/* Der Wächter gegen die Klasse: tools/ausgabe-listen-senken-pruefen.js verlangt von jeder Fach-Senke, dass sie den vollen Wert
   zerlegt und keine Einheit am Namen vorbei ungeprüft lässt. */
const SENKEN = require('../tools/ausgabe-listen-senken-pruefen.js');

test('[Ausgabe-Senken · Fach · Einheiten] das Fach vergleicht jede Einheit mit dem vollen Wert', () => {
  assert.ok([].concat(SENKEN.FACH_SENKEN._empfaengerFaecherFuerSchreibweg).includes('tests/fach-ganze-einheiten.test.js'), 'die Probe steht beim Fach im Wächter');
  assert.deepEqual(SENKEN.pruefen(fs.readFileSync(KERN, 'utf8')).probleme, []);
});

test('[Ausgabe-Senken · Fach · Einheiten · Rot-Beweis] eine Namensweiche oder ein fehlender voller Zerfall ist rot', () => {
  const html = fs.readFileSync(KERN, 'utf8');
  const weiche = VERGLEICH_ZEILE.replace('.filter((e) => ', ".filter((e) => e.name.indexOf('.') < 0 || ");
  const r1 = SENKEN.pruefen(html.replace(VERGLEICH_ZEILE, weiche));
  assert.ok(r1.probleme.some((p) => p.includes('am Namen vorbei')), 'rot bei Namensweiche: ' + r1.probleme.join(' | '));
  const ZERFALL = 'new Map(_zerfallEinheiten(quelle).map(';
  assert.equal(html.split(ZERFALL).length, 2, 'Vorbedingung: der volle Zerfall steht an seinem Ort');
  const r2 = SENKEN.pruefen(html.replace(ZERFALL, 'new Map(_zerfallEinheiten(zuschnitt).map('));
  assert.ok(r2.probleme.some((p) => p.includes('nicht mit dem vollen Wert')), 'rot ohne vollen Zerfall: ' + r2.probleme.join(' | '));
});
