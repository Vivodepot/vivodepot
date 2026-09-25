'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   M1 · Züge 2–4 — die Eingabe, der Vorschlag, der Schreibweg
   NEUGESTALTET 24.08.2026 (Entscheidung „Gültigkeit hinterlegen — Neugestaltung,
   nicht nur Sichtbarkeitsfilter", CW-5/-8/-15/-16/-22/-30).
   ────────────────────────────────────────────────────────────────────────────
   IMMER MÖGLICH, NICHT IMMER SICHTBAR. Keine Liste entscheidet, an welchem
   Feld eine Gültigkeit hinterlegt werden darf — Typ und Marke sind das
   Kriterium. Vier Fälle statt eines einzigen Sichtbarkeits-Filters:

     Fall 1 `laeuftAb` — Feld trägt „gültig bis" im eigenen Namen. „gilt ab"
                          VERSCHMILZT mit dem Feld (s. m1-gueltigkeit-vier-faelle.test.js).
     Fall 2 `giltAb` — Feld trägt seinen Wert bereits als `von`. Nur `bis`
                          bleibt als eingebettete Zusatzangabe (nurBis, spiegel-
                          bildlich zu Fall 1).
     Fall 3 `frist` — keine Gültigkeit, eigene Form (_fristHinweisFuerFeld),
                          hier ausdrücklich nichts.
     Fall 4 keine Marke — nichts gesetzt: kein Block, kein Angebot. Löst
                          CW-5/-8 (Geburtsdatum, Trennungsdatum).

   VORSCHLAGEN, NIE SETZEN. Ohne Bestätigung entsteht kein Eintrag im Depot.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}
const DATUMSFELD = (id, label) => ({ id, typ: 'datum', label: label || id });

/* ══ Rot 1 · MIT Marke: offen und mit Vorschlag ════════════════════════════ */

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `ausweis_gueltig` ist mit diesem Glied in
// die Liste `ausweis` gewandert und trägt seither keine Marke mehr im Feld-Katalog — der
// Marken-Mechanismus dieser Datei (M1 Zug 1-6) demonstriert sich darum nicht mehr an ihm,
// sondern an `reisepass_gueltig` (unverändert, dieselbe Marke `laeuftAb`, dieselbe Regel
// `ausweisdauer`, s. tests/m1-gueltigkeit-ausweisdokumente.test.js).
test('[M1·Rot] ein Feld MIT Marke zeigt die Eingabe OFFEN', () => {
  const V = frisch();
  const h = V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil', DATUMSFELD('passportValidUntil'), true, true);
  assert.ok(h.includes('ist-offen'), 'offen, nicht zugeklappt');
  assert.ok(!h.includes('<details'), 'und ohne Aufklapp-Zeile');
  assert.ok(h.includes('data-gueltig-von="mobility.passportValidUntil"'));
  /* M1 Zug 5/Zug 1 (der Umzug): wo die Marke sitzt, gibt es KEIN zweites `bis` — das Feld
     selbst ist seit dem Umzug der Träger des `bis` (`feldRohwertSetzen`). Ein zweites
     Eingabefeld daneben zeigte denselben Wert doppelt. */
  assert.equal(h.includes('data-gueltig-bis="mobility.passportValidUntil"'), false,
    'kein zweites bis-Eingabefeld — das Feld „Reisepass — gültig bis" IST das bis');
});

// Neugestaltung 24.08.2026 (Entscheidung „Gültigkeit hinterlegen — Fall 4"): das frühere
// zugeklappte Angebot an JEDEM Datumsfeld ohne Marke ist abgeschafft — genau das war der
// bezugslose Block, den CW-5/-8 (Geburtsdatum, Trennungsdatum) meldeten. Ohne Marke
// UND ohne gesetzten Wert erscheint jetzt gar nichts, nicht einmal zugeklappt.
test('[M1] ein Feld OHNE Marke und OHNE gesetzten Wert zeigt gar nichts — Fall 4', () => {
  const V = frisch();
  const h = V.feldGueltigkeitZeileHTML('identity', 'birthDate', DATUMSFELD('birthDate'), true, true);
  assert.equal(h, '', 'kein Block, kein Aufklapp-Angebot — löst CW-5/-8');
});

test('[M1] trägt ein Feld OHNE Marke bereits einen Wert, bleibt er offen sichtbar — nicht versteckt', () => {
  const V = frisch();
  V.feldGueltigkeitSetzen('identity', 'birthDate', null, '2030-03-02');
  const h = V.feldGueltigkeitZeileHTML('identity', 'birthDate', DATUMSFELD('birthDate'), true, true);
  assert.ok(h.includes('ist-offen'), 'eine gesetzte Angabe zu verstecken wäre schlimmer als Fall 4 an sich');
  assert.ok(!h.includes('<details'), 'keine zugeklappte Form mehr — die ist ganz entfallen');
  assert.ok(h.includes('data-gueltig-bis="identity.birthDate"'), 'weiterhin editierbar');
});

test('[M1·Rot] das Geburtsdatum zeigt KEINE offene Gültigkeit — der Fall, der den Zug begründet', () => {
  const V = frisch();
  const h = V.feldGueltigkeitZeileHTML('identity', 'birthDate', DATUMSFELD('birthDate'), true, true);
  assert.equal(/ist-offen/.test(h), false);
  assert.equal(V.feldHatMarke('identity', 'birthDate', 'laeuftAb'), false);
});

/* ══ Rot 2 · der Vorschlag ═════════════════════════════════════════════════ */

test('[M1·Rot] wo die Marke sitzt, steht ein Vorschlagswert — berechnet, nicht geraten', () => {
  const V = frisch();
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { birthDate: '1990-05-04' });
  d.sektoren.mobility = Object.assign({}, d.sektoren.mobility, { passportIssuedOn: '2020-03-02' });
  V.setData(d);
  // Bei Ausstellung 29 Jahre alt → zehn Jahre (§ 5 Abs. 1 PassG).
  assert.equal(V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil'), '2030-03-02');
  const h = V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil', DATUMSFELD('passportValidUntil'), true, true);
  assert.ok(h.includes('data-gueltig-vorschlag-wert="2030-03-02"'), 'und er steht am Knopf');
});

test('[M1·Rot] unter 24 bei Ausstellung: sechs Jahre statt zehn', () => {
  const V = frisch();
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { birthDate: '2005-01-10' });
  d.sektoren.mobility = Object.assign({}, d.sektoren.mobility, { passportIssuedOn: '2024-06-01' });
  V.setData(d);
  assert.equal(V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil'), '2030-06-01');
});

test('[M1] ein Feld mit Marke OHNE Rechnung bekommt KEINEN erfundenen Vorschlag', () => {
  const V = frisch();
  assert.equal(V.feldGueltigkeitVorschlag('education', 'employmentContractFixedTerm'), '',
    'leer ist hier die richtige Antwort, nicht eine geratene Frist');
  const h = V.feldGueltigkeitZeileHTML('education', 'employmentContractFixedTerm',
    DATUMSFELD('employmentContractFixedTerm'), true, true);
  assert.ok(h.includes('ist-offen'), 'die Eingabe steht trotzdem offen');
  assert.ok(!h.includes('data-gueltig-vorschlag'), 'nur ohne Vorschlags-Knopf');
});

test('[M1·Rot] ein Vorschlag OHNE Bestätigung hinterlässt KEINEN Eintrag im Depot', () => {
  const V = frisch();
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { birthDate: '1990-05-04' });
  d.sektoren.mobility = Object.assign({}, d.sektoren.mobility, { passportIssuedOn: '2020-03-02' });
  V.setData(d);
  // Den Vorschlag lesen und die Zeile rendern — beides sind Lesevorgänge.
  V.feldGueltigkeitVorschlag('mobility', 'passportValidUntil');
  V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil', DATUMSFELD('passportValidUntil'), true, true);
  assert.equal(V.feldGueltigkeitLesen('mobility', 'passportValidUntil'), null,
    'vorschlagen, nie setzen');
  assert.deepEqual(Object.keys(V.getData().feldGueltigkeit || {}), []);
});

/* ══ Rot 3 · ein Modul bringt die Marke mit, und der Vorschlag erscheint ═══ */

test('[M1·Rot] ein Modul bringt die Marke mit — die Eingabe steht offen', () => {
  const V = frisch();
  const d = V.getData();
  d.feldDefinitionen = [{ sektorId: 'verwaltung', feldId: 'tpl_lizenz_gueltig', typ: 'datum',
    label: 'Lizenz gültig bis', marken: ['laeuftAb'] }];
  V.setData(d);
  const h = V.feldGueltigkeitZeileHTML('verwaltung', 'tpl_lizenz_gueltig',
    DATUMSFELD('tpl_lizenz_gueltig'), true, true);
  assert.ok(h.includes('ist-offen'), 'das angedockte Feld verhält sich wie ein eingebautes');
});

/* ══ Rot 4 · der Schreibweg, und was ohne ihn bleibt ═══════════════════════ */

test('[M1·Rot] die Bürgerin trägt an einem Feld OHNE Marke eine Gültigkeit ein — und sie erzeugt einen Prüftermin', () => {
  const V = frisch();
  assert.equal(V.feldHatMarke('identity', 'birthDate', 'laeuftAb'), false, 'Vorbedingung: keine Marke');
  assert.equal(V.prueftermineFelder(new Date('2026-08-18')).length, 0, 'Vorbedingung: noch kein Termin');
  V.feldGueltigkeitSetzen('identity', 'birthDate', null, '2027-01-31');
  const termine = V.prueftermineFelder(new Date('2026-08-18'));
  assert.equal(termine.length, 1, 'die Marke entscheidet über die SICHTBARKEIT, nicht über die Möglichkeit');
  assert.equal(termine[0].sektorId, 'identity');
});

test('[M1·Rot] ein Feld ohne Gültigkeitsangabe verhält sich wie vor dem Umbau', () => {
  const V = frisch();
  assert.equal(V.feldGiltAm('mobility', 'passportValidUntil', '2026-08-18'), true,
    '„unbekannt" heisst „wie bisher", nicht „ungültig"');
  assert.equal(V.prueftermineFelder(new Date('2026-08-18')).length, 0, 'und erzeugt keine Zeile');
});

/* ══ Die Zusicherung: keine Liste ══════════════════════════════════════════ */

test('[M1] keine Liste entscheidet — das Kriterium ist Typ und Marke, keine Feld-Ids', () => {
  const { V, src } = ladeKern();
  const rumpf = src.slice(src.indexOf('function feldGueltigkeitZeileHTML'),
    src.indexOf('// „Ausdrücklich keine" (Auftrag 12.08.2026) — Bedienzeile'));
  assert.ok(rumpf.includes("feld.typ !== 'datum'"), 'der Typ entscheidet');
  assert.ok(rumpf.includes("feldHatMarke("), 'und die Marke');
  assert.ok(!/ERLAUBTE_FELDER|GUELTIGKEIT_FELDER|FELD_ALLOWLIST/.test(rumpf), 'nirgends eine Feldliste');
  assert.equal(typeof V.feldGueltigkeitZeileHTML, 'function');
});

test('[M1] im Lesemodus erscheint sie nur, wenn etwas GESETZT ist', () => {
  const V = frisch();
  assert.equal(V.feldGueltigkeitZeileHTML('identity', 'birthDate', DATUMSFELD('birthDate'), false), '',
    'nichts gesetzt, kein Bedienelement — dieselbe Grenze wie bei „Ausdrücklich keine"');
  V.feldGueltigkeitSetzen('identity', 'birthDate', null, '2030-03-02');
  const h = V.feldGueltigkeitZeileHTML('identity', 'birthDate', DATUMSFELD('birthDate'), false);
  assert.ok(h.includes('2030-03-02'), 'gesetzt: die Aussage steht');
  assert.ok(!h.includes('<input'), 'aber kein Eingabefeld');
});

/* ══ M1 Zug 5 / Zug 1 — der Umzug: das Feld IST das „bis" ══════════════════ */

test('[M1·Zug5·Rot] an einem markierten Feld steht das `bis` genau EINMAL — am Feld selbst', () => {
  const V = frisch();
  const f = V.feldDefFuer('mobility', 'passportValidUntil');
  V.feldGueltigkeitSetzen('mobility', 'passportValidUntil', null, '2030-03-02');
  // Die ganze Feldzeile, nicht nur die Gültigkeits-Zeile: hier wäre eine Doppelung sichtbar.
  const zeile = V.feldZeileHTML(f, V.feldRohwert('mobility', 'passportValidUntil'), 'mobility', true, true);
  assert.equal((zeile.match(/2030-03-02/g) || []).length, 1,
    'der Wert erscheint genau einmal — vor dem Umzug wären es zwei Eingaben mit demselben Datum');
  assert.ok(zeile.includes('data-edit="passportValidUntil"'), 'und zwar am Feld selbst');
  assert.equal(zeile.includes('data-gueltig-bis='), false, 'kein zweites bis-Eingabefeld');
});

test('[M1·Zug5·Rot] im Lesemodus zeigt ein markiertes Feld OHNE `von` keine leere Gültigkeits-Zeile', () => {
  const V = frisch();
  V.feldGueltigkeitSetzen('mobility', 'passportValidUntil', null, '2030-03-02');
  const h = V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil',
    V.feldDefFuer('mobility', 'passportValidUntil'), false);
  assert.equal(h, '', 'nichts zu sagen, was das Feld nicht schon sagt — keine leere Zeile');
  V.feldGueltigkeitSetzen('mobility', 'passportValidUntil', '2020-03-02', '2030-03-02');
  const h2 = V.feldGueltigkeitZeileHTML('mobility', 'passportValidUntil',
    V.feldDefFuer('mobility', 'passportValidUntil'), false);
  assert.ok(h2.includes('2020-03-02'), 'ein gesetztes `von` steht weiterhin');
  assert.equal(h2.includes('2030-03-02'), false, 'das `bis` steht am Feld, nicht zweimal');
});

test('[M1] ein Feld, das kein Datum tragen kann und keine Marke hat, bekommt gar keine Zeile', () => {
  const V = frisch();
  assert.equal(V.feldGueltigkeitZeileHTML('identity', 'givenName', { id: 'givenName', typ: 'text', label: 'Vorname' }, true, true), '');
});
