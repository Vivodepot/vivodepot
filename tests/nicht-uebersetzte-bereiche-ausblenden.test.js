'use strict';
/* Nicht übersetzte Bereiche und Situationen: ausblenden, nie verlieren (U2-ADR-423).
   In einer teilübersetzten Sprache verschwindet ein Bereich aus der Anwahl, wenn seine Bezeichnungen nicht alle übersetzt sind UND nichts darin steht.
   Mit Daten bleibt er sichtbar; der Umschalter „Nicht übersetzte Bereiche zeigen" bringt ihn zurück; Export, Herausgabe und Notfall lesen weiter alle
   Bereiche; Deutsch und Englisch blenden nie etwas aus. Kern und Lese-App im selben Zug; Rot-Beweise an einer Kopie des Quelltexts. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const DE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
const bezeichnungen = (bereich) => Object.keys(DE).filter((k) => !k.startsWith('strings:') && !/\.(hint|beispiel)$/.test(k) && (k.startsWith(bereich + '.') || k.startsWith(bereich + '#')));
/* Ein teilübersetztes Modul: alle Bezeichnungen von `identity`, sonst nichts (Hinweise und Beispiele fehlen absichtlich). */
const modul = () => ({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: Object.fromEntries(bezeichnungen('identity').map((k) => [k, 'T:' + k])) });
const depot = (extra) => Object.assign({ schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [], textsatzModule: [modul()], textsprache: 'xx' }, extra || {});
const ersterFeldName = (bereich) => bereich.sektionen.flatMap((s) => s.felder).find((f) => f.typ === 'text' || f.typ === 'textarea').id;

function kernOeffnen(V, extra) {
  const d = Object.assign(V.leeresDepot(), depot(extra));
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
  return d;
}
function lesenOeffnen(L, extra) {
  const d = depot(extra);
  L.setData(d);
  L._textsatzModuleAusDepotAnmelden(d);
  return d;
}
const ids = (bereiche) => bereiche.map((s) => s.id);
const kernIds = (V) => V.bereicheNachClusterSichtbar().flatMap((g) => g.bereiche.map((s) => s.id));

/* ── Kern ─────────────────────────────────────────────────────────────────── */
test('[Ausblenden·Kern] übersetzt heißt: alle Bezeichnungen da; Hinweise und Beispiele zählen nicht', () => {
  const { V } = ladeKern();
  kernOeffnen(V);
  assert.equal(V.bereichUebersetzt('identity'), true, 'alle Bezeichnungen von identity sind im Modul, Hinweise und Beispiele fehlen');
  assert.equal(V.bereichUebersetzt('mobility'), false);
});

test('[Ausblenden·Kern] ohne Daten wird der nicht übersetzte Bereich ausgeblendet, der übersetzte bleibt; Export liest weiter alle', () => {
  const { V } = ladeKern();
  kernOeffnen(V);
  const sichtbar = kernIds(V);
  assert.ok(sichtbar.includes('identity'), 'übersetzt: bleibt');
  assert.ok(!sichtbar.includes('mobility'), 'nicht übersetzt und leer: weg');
  assert.ok(V.bereicheAlle().some((s) => s.id === 'mobility'), 'bereicheAlle (Export, Herausgabe, Notfall) bleibt unberührt');
});

test('[Ausblenden·Kern] mit Daten bleibt der Bereich sichtbar', () => {
  const { V } = ladeKern();
  const mob = ladeKern().V.bereicheAlle().find((s) => s.id === 'mobility');
  kernOeffnen(V, { sektoren: { mobility: { [ersterFeldName(mob)]: 'etwas' } } });
  assert.ok(kernIds(V).includes('mobility'), 'Daten stehen darin: nie ausgeblendet');
});

test('[Ausblenden·Kern] der Umschalter bringt ihn zurück, und wieder aus', () => {
  const { V } = ladeKern();
  kernOeffnen(V);
  V.nichtUebersetzteZeigenSetzen(true);
  assert.ok(kernIds(V).includes('mobility'));
  V.nichtUebersetzteZeigenSetzen(false);
  assert.ok(!kernIds(V).includes('mobility'));
});

test('[Ausblenden·Kern] Deutsch und Englisch blenden nichts aus', () => {
  for (const sprache of ['de', 'en']) {
    const { V } = ladeKern();
    kernOeffnen(V, { textsprache: sprache, textsatzModule: [] });
    assert.equal(kernIds(V).length, V.bereicheAlle().length, sprache);
  }
});

test('[Ausblenden·Kern] Situation ohne Blattinhalt und ohne Übersetzung ist weg, mit Inhalt oder Umschalter da; Anlass-Kachel folgt ihr', () => {
  const { V } = ladeKern();
  kernOeffnen(V);
  const id = V.situationenAlle()[0].id;
  assert.equal(V.situationUebersetzt(id), false);
  assert.equal(V._situationSichtbarInAuswahl(id), false, 'kein Blattinhalt: ausgeblendet');
  assert.equal(V._anlassSichtbar({ id }), false, 'die Anlass-Kachel führt in dieses Blatt und verschwindet mit ihm');
  V.nichtUebersetzteZeigenSetzen(true);
  assert.equal(V._situationSichtbarInAuswahl(id), true);
  V.nichtUebersetzteZeigenSetzen(false);
  const mitInhalt = V.getData();
  mitInhalt.sektoren.identity = Object.assign(mitInhalt.sektoren.identity || {}, { givenName: 'Ada' });
  assert.equal(V._situationSichtbarInAuswahl(id), true, 'steht im Blatt etwas, bleibt es sichtbar');
});

test('[Ausblenden·Kern·Rot-Beweis] wird die Datenprüfung umgangen, verschwindet ein Bereich mit Daten', () => {
  const ziel = "  return sektorHatDaten(s, (data && data.sektoren && data.sektoren[s.id]) || {});\n}\nfunction _situationSichtbarInAuswahl";
  assert.ok(KERN.includes(ziel), 'Mutationsstelle fehlt');
  const tmp = path.join(os.tmpdir(), 'kern-ausblenden-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(ziel, '  return false;\n}\nfunction _situationSichtbarInAuswahl'));
  const alt = process.env.KERN_HTML_PATH;
  const laden = require.resolve('./load-kern.js');
  process.env.KERN_HTML_PATH = tmp;
  delete require.cache[laden];
  try {
    const { V } = require(laden).ladeKern({ backen: true });
    const mob = V.bereicheAlle().find((s) => s.id === 'mobility');
    kernOeffnen(V, { sektoren: { mobility: { [ersterFeldName(mob)]: 'etwas' } } });
    assert.ok(!kernIds(V).includes('mobility'), 'die Mutation greift: ohne Datenprüfung fällt der Bereich mit Daten heraus, der Test oben wäre rot');
  } finally {
    if (alt === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = alt;
    delete require.cache[laden];
    fs.unlinkSync(tmp);
  }
});

/* ── Lese-App ─────────────────────────────────────────────────────────────── */
test('[Ausblenden·Lese-App] ohne Daten weg, mit Daten da, Umschalter zeigt, Deutsch und Englisch nie', () => {
  const { V: L } = ladeLesen();
  lesenOeffnen(L);
  assert.ok(ids(L.bereicheSichtbarLesen()).includes('identity'));
  assert.ok(!ids(L.bereicheSichtbarLesen()).includes('mobility'), 'nicht übersetzt und leer');
  L.nichtUebersetzteZeigenSetzenLesen(true);
  assert.ok(ids(L.bereicheSichtbarLesen()).includes('mobility'), 'Umschalter');
  L.nichtUebersetzteZeigenSetzenLesen(false);
  const mob = L.SEKTOR_BY_ID.mobility;
  lesenOeffnen(L, { sektoren: { mobility: { [ersterFeldName(mob)]: 'etwas' } } });
  assert.ok(ids(L.bereicheSichtbarLesen()).includes('mobility'), 'Daten stehen darin');
  for (const sprache of ['de', 'en']) {
    lesenOeffnen(L, { textsprache: sprache, textsatzModule: [] });
    assert.equal(L.bereicheSichtbarLesen().length, L.SEKTOR_BY_ID && Object.keys(L.SEKTOR_BY_ID).length, sprache);
  }
});

test('[Ausblenden·Lese-App·Rot-Beweis] wird die Datenprüfung umgangen, verschwindet ein Bereich mit Daten', () => {
  const ziel = "bereichUebersetztLesen(s) || _bereichHatDatenLesen(s));";
  assert.ok(LESEN.includes(ziel), 'Mutationsstelle fehlt');
  const tmp = path.join(os.tmpdir(), 'lesen-ausblenden-' + process.pid + '.html');
  fs.writeFileSync(tmp, LESEN.replace(ziel, 'bereichUebersetztLesen(s));'));
  const laden = require.resolve('./load-lesen.js');
  const alt = process.env.LESEN_HTML_PATH;
  process.env.LESEN_HTML_PATH = tmp;
  delete require.cache[laden];
  try {
    const { V: L } = require(laden).ladeLesen();
    const mob = L.SEKTOR_BY_ID.mobility;
    lesenOeffnen(L, { sektoren: { mobility: { [ersterFeldName(mob)]: 'etwas' } } });
    assert.ok(!ids(L.bereicheSichtbarLesen()).includes('mobility'), 'die Mutation greift');
  } finally {
    if (alt === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = alt;
    delete require.cache[laden];
    fs.unlinkSync(tmp);
  }
});
