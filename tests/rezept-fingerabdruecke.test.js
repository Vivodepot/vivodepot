'use strict';
/* Rezept-Fingerabdrücke (04.10.2026, Selbst-Einlass-Sperre; Entscheidung der Gegenlesung): „ab Werk“ heißt inhaltsgleich mit
   einer Nutzlast IRGENDEINES Vivodepot-Rezepts. Die Region REZEPT-FINGERABDRUECKE-KERN im Gerüst ist das Erzeugnis von
   tools/rezept-fingerabdruecke-erheben.js aus PRODUKTE/modulDateienFuer (tools/lib/vier-produkte.js) — dieselbe Quelle wie die
   Auslieferung. Geprüft wird beim Öffnen per WebCrypto im Kern; ein Feld im Modul, das einen Fingerabdruck behauptet, liest
   niemand. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const H = require('./produkt-html-erzeugen.js');
const F = require('../tools/rezept-fingerabdruecke-erheben.js');

const kern = () => fs.readFileSync(F.KERN, 'utf8');

test('[Fingerabdrücke·Drift] die Region im Kern ist genau das Erzeugnis aus den Rezepten', () => {
  assert.deepEqual(F.alteAus(kern()), F.erheben().abdruecke, 'Region und Rezepte laufen auseinander — npm run rezepte:fingerabdruecke');
  assert.equal(F.pruefen(kern()), true);
});

/* Zweiter Träger (Schutz-Wagen, 04.10.2026): die Lese-App entscheidet wie der Kern nach Inhalt. */
test('[Fingerabdrücke·Drift·Lese-App] die Region in der Lese-App ist dieselbe Menge wie im Kern', () => {
  const lese = fs.readFileSync(F.LESE, 'utf8');
  assert.deepEqual(F.alteAus(lese, F.TRAEGER.lese), F.erheben().abdruecke, 'Lese-App und Rezepte laufen auseinander — npm run rezepte:fingerabdruecke');
  assert.deepEqual(F.alteAus(lese, F.TRAEGER.lese), F.alteAus(kern()), 'Kern und Lese-App tragen verschiedene Fingerabdrücke');
});

test('[Fingerabdrücke·Drift·Lese-App·Rot-Beweis] eine Lese-App mit veralteter Region wird erkannt', () => {
  const lese = fs.readFileSync(F.LESE, 'utf8');
  const veraltet = F.regionErsetzen(lese, F.region(F.erheben().abdruecke.slice(1), F.TRAEGER.lese), F.TRAEGER.lese);
  assert.equal(F.alteAus(veraltet, F.TRAEGER.lese).length, F.erheben().abdruecke.length - 1);
  assert.notDeepEqual(F.alteAus(veraltet, F.TRAEGER.lese), F.alteAus(kern()));
});

test('[Fingerabdrücke·Träger] jedes der vier Produkte trägt dieselbe Region', () => {
  const soll = F.erheben().abdruecke;
  for (const produkt of ['privat-de', 'privat-en', 'pro-de', 'pro-en']) {
    const { V } = ladeKern({ produkt });
    assert.deepEqual([...V.REZEPT_FINGERABDRUECKE_KERN].sort(), soll, produkt);
  }
});

test('[Fingerabdrücke·Spiegel] Erzeuger und Kern rechnen gleich: kanonische Form, Einlass-Felder, SHA-256', async () => {
  const { V } = ladeKern();
  assert.deepEqual([...V._EINLASS_META_FELDER], [...F.EINLASS_META_FELDER]);
  for (const probe of [{ b: 1, a: [2, { d: null, c: 'x' }] }, { modulTyp: 'textsatz', sprache: 'zz', texte: { 'ä': 'ö' }, ungeprueft: true, anbieterId: 'y' }]) {
    assert.equal(V._kanonischJSON(probe), F.kanonischJSON(probe));
    assert.equal(await V._modulRezeptFingerabdruck(probe), F.fingerabdruck(probe));
  }
});

test('[Fingerabdrücke·Rot-Beweis] eine Mitschrift mit einem Byte Unterschied gilt nicht als ab Werk', async () => {
  const PW = 'fingerabdruck-mitschrift-pw-2026';
  const { umschlag } = await H.depotImProduktAnlegen('privat-en', PW, (V) => V.akteurSelbstErklaeren('A'));
  const unveraendert = await H.depotImProduktLaden('privat-de', JSON.parse(JSON.stringify(umschlag)), PW);
  assert.equal(unveraendert.V._abWerkGleich(unveraendert.d.abWerkMitschrift.sprache), true, 'Vorbedingung: unverändert ist sie erkannt');

  const Q = unveraendert.V;
  const d = Q.getData();
  d.abWerkMitschrift.sprache.texte['strings:fussQuellcode.text'] += 'x';
  Q.setData(d);
  const geaendert = await Q.depotSerialisieren();
  const { V } = await H.depotImProduktLaden('privat-de', JSON.parse(JSON.stringify(geaendert)), PW);
  assert.equal(V._abWerkGleich(V.getData().abWerkMitschrift.sprache), false, 'ein Byte Unterschied: nicht ab Werk');
});

test('[Fingerabdrücke·Rot-Beweis] ein Modul mit eigenem „Fingerabdruck“-Feld wird dadurch nicht ab Werk', async () => {
  const { V } = ladeKern();
  const echt = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));
  const hex = F.fingerabdruck(echt);
  assert.ok(V.REZEPT_FINGERABDRUECKE_KERN.has(hex), 'Vorbedingung: das echte Modul steht in der Region');
  const falsch = Object.assign({}, echt, { titel: 'GEAENDERT', fingerabdruck: hex, rezeptFingerabdruck: hex, sha256: hex });
  assert.notEqual(await V._modulRezeptFingerabdruck(falsch), hex);
  const PW = 'fingerabdruck-feld-pw-2026';
  await V.depotAnlegen(PW);
  const d = V.getData(); d.logikModule = [falsch]; V.setData(d);
  const u = await V.depotSerialisieren();
  const W = ladeKern({ produkt: 'pro-de' }).V;
  await W.depotLaden(JSON.parse(JSON.stringify(u)), PW);
  assert.equal(W._abWerkGleich(W.getData().logikModule[0]), false);
  assert.equal(W.gesperrteDepotModule().length, 1);
});

test('[Fingerabdrücke·Rot-Beweis] ein Kern mit veralteter oder fehlender Region fällt bei pruefen() durch — kern-ausliefern bricht ab', () => {
  const k = kern();
  const ohne = k.slice(0, k.indexOf(F.BEGIN)) + k.slice(k.indexOf(F.ENDE) + F.ENDE.length);
  assert.throws(() => F.pruefen(ohne), /fehlt im Kern/);
  const veraltet = F.regionErsetzen(k, F.region(F.erheben().abdruecke.slice(1)));
  assert.throws(() => F.pruefen(veraltet), /passt nicht zu den Rezepten/);
});

test('[Fingerabdrücke·Rot-Beweis] ein von Hand geändertes Byte in der Region bleibt rot (gebunden über die Erzeugerprüfung, nicht über die Marker-Zählung)', () => {
  const k = kern();
  const a = k.indexOf(F.BEGIN), e = k.indexOf(F.ENDE);
  const m = /[0-9a-f]{64}/.exec(k.slice(a, e));
  assert.ok(m, 'Vorbedingung: ein Fingerabdruck in der Region');
  const i = a + m.index;
  const geaendert = k.slice(0, i) + (k[i] === '0' ? '1' : '0') + k.slice(i + 1);
  assert.throws(() => F.pruefen(geaendert), /passt nicht zu den Rezepten/);
});
