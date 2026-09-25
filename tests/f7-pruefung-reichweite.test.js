'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — F7 Zug1 (Auftrag F7/K7, 09.08.2026): die Prüfung erreicht mehr
   als einen Aufrufer.
   ────────────────────────────────────────────────────────────────────────
   Befund: `feldValidieren` hatte GENAU EINEN produktiven Aufrufer
   (`wizardSchrittSetzen`). Der generische Sektor-/Situations-Speicherpfad
   (`_faltContainer`) prüfte nur Datumsfelder (`_datumEingabePlausibel`),
   sonst nichts — ein Wert, der über den Assistenten beanstandet wird, lief
   über das Formular kommentarlos hinein.

   Wie beim Datums-Pfad (s. tests/datum-plausibilitaet.test.js #15/16, Kommentar
   dort): `_faltContainer` selbst ist im Node-Harness NICHT prüfbar
   (querySelectorAll liefert immer [], s. load-kern.js makeEl()) — geprüft wird
   die REINE Funktion `_feldEingabePlausibel(inp, v)` mit einem Plain-Object
   als `inp` (dieselbe reflektierte-Property-Form, die ein echtes <input>/
   <select> im Browser trägt: .dataset.typ, .min/.max, .maxLength, .options).
   Die Verdrahtung in `_faltContainer` selbst braucht Browser-Abnahme (Zug 3).

   Die Prüfung BLOCKIERT NICHT die Navigation — sie lässt den ungültigen Wert
   im Formularfeld auf den zuletzt gespeicherten Stand zurückspringen (exakt
   dasselbe Muster wie beim bestehenden Datums-Zweig) und meldet per Toast,
   statt zu werfen oder zu sperren.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ── _feldEingabePlausibel: zahl ──────────────────────────────────────── */

test('[F7·1] _feldEingabePlausibel: zahl — Bereichsgrenzen aus min/max-Attributen (String, wie das reale DOM sie liefert)', () => {
  const { V } = ladeKern();
  const inp = { dataset: { typ: 'zahl' }, min: '0', max: '150' };
  assert.equal(V._feldEingabePlausibel(inp, '42').ok, true);
  assert.equal(V._feldEingabePlausibel(inp, '200').ok, false, 'oberhalb max');
  assert.equal(V._feldEingabePlausibel(inp, '-1').ok, false, 'unterhalb min');
  assert.equal(V._feldEingabePlausibel(inp, 'abc').ok, false, 'keine Zahl');
});

test('[F7·2] _feldEingabePlausibel: zahl ohne min/max-Attribute prüft nur, ob es überhaupt eine Zahl ist', () => {
  const { V } = ladeKern();
  const inp = { dataset: { typ: 'zahl' }, min: '', max: '' };
  assert.equal(V._feldEingabePlausibel(inp, '999999').ok, true);
  assert.equal(V._feldEingabePlausibel(inp, 'nix').ok, false);
});

/* ── _feldEingabePlausibel: auswahl ───────────────────────────────────── */

test('[F7·3] _feldEingabePlausibel: auswahl — nur ein Wert aus den gerenderten <option>-Werten ist plausibel', () => {
  const { V } = ladeKern();
  const inp = { dataset: { typ: 'auswahl' }, options: [{ value: '' }, { value: 'a' }, { value: 'b' }] };
  assert.equal(V._feldEingabePlausibel(inp, 'a').ok, true);
  assert.equal(V._feldEingabePlausibel(inp, 'c').ok, false, 'kein gerendertes Optionen-Element');
});

/* ── _feldEingabePlausibel: text (Länge) ──────────────────────────────── */

test('[F7·4] _feldEingabePlausibel: text — maxLength aus dem realen Input-Property (nativ -1, wenn kein maxlength gesetzt)', () => {
  const { V } = ladeKern();
  const mitGrenze = { dataset: { typ: 'text' }, maxLength: 5 };
  assert.equal(V._feldEingabePlausibel(mitGrenze, '123456').ok, false, 'über der Länge');
  assert.equal(V._feldEingabePlausibel(mitGrenze, '123').ok, true);
  const ohneGrenze = { dataset: { typ: 'text' }, maxLength: -1 };
  assert.equal(V._feldEingabePlausibel(ohneGrenze, 'beliebig lang, ganz ohne Attribut').ok, true, 'kein maxlength-Attribut → -1, keine Grenze');
});

test('[F7·5] _feldEingabePlausibel: unbekannter/fehlender data-typ (z. B. Ref-/Chip-Felder, die eigene Pfade haben) meldet immer ok', () => {
  const { V } = ladeKern();
  assert.equal(V._feldEingabePlausibel({ dataset: {} }, 'irgendwas').ok, true);
});

/* ── Rotmachbarkeit: der Wert dieser Probe hängt daran, dass sie den echten Aufrufer trifft ── */

test('[F7·Rotmachbarkeit] _feldEingabePlausibel prüft dieselbe Kern-Funktion wie der Wizard-Pfad (feldValidieren) — kein zweiter Erkenner', () => {
  const { V } = ladeKern();
  const wizardUrteil = V.feldValidieren({ typ: 'zahl', min: 0, max: 10 }, '99');
  const generischesUrteil = V._feldEingabePlausibel({ dataset: { typ: 'zahl' }, min: '0', max: '10' }, '99');
  assert.equal(wizardUrteil.ok, generischesUrteil.ok);
  assert.equal(wizardUrteil.grund, generischesUrteil.grund);
});

/* ── Normalisierung: Telefon/E-Mail/IBAN ──────────────────────────────── */

test('[F7·6] _feldWertNormalisiert: E-Mail — Leerraum entfernt, klein geschrieben', () => {
  const { V } = ladeKern();
  assert.equal(V._feldWertNormalisiert('email', ' Maria.Mustermann@Example.DE '), 'maria.mustermann@example.de');
});

test('[F7·7] _feldWertNormalisiert: Telefon — mehrfacher Leerraum auf ein Leerzeichen zusammengezogen, sonst unverändert', () => {
  const { V } = ladeKern();
  assert.equal(V._feldWertNormalisiert('tel', '0151   12345678'), '0151 12345678');
  assert.equal(V._feldWertNormalisiert('tel', '+49 (0)151 12345678'), '+49 (0)151 12345678', 'Klammern/Zeichen bleiben, nur Leerraum wird geglättet');
});

test('[F7·8] _feldWertNormalisiert: IBAN — Leerraum geglättet, Großbuchstaben (ISO 13616)', () => {
  const { V } = ladeKern();
  assert.equal(V._feldWertNormalisiert('iban', 'de89  3704 0044 0532 0130 00'), 'DE89 3704 0044 0532 0130 00');
});

test('[F7·9] _feldWertNormalisiert: unbekannter/kein eingabetyp bleibt unverändert (rücknehmbar heißt auch: nur wo ein Format wirklich feststeht)', () => {
  const { V } = ladeKern();
  assert.equal(V._feldWertNormalisiert('', '  Text  Bleibt  '), '  Text  Bleibt  ');
  assert.equal(V._feldWertNormalisiert(undefined, 'x'), 'x');
});

test('[F7·10] _feldWertNormalisiert: leerer/Nicht-String-Wert wird unverändert durchgereicht (kein Wurf)', () => {
  const { V } = ladeKern();
  assert.equal(V._feldWertNormalisiert('email', ''), '');
  assert.equal(V._feldWertNormalisiert('email', undefined), undefined);
});

/* ── feldInputHTML trägt jetzt den Normalisierungs-Hinweis fürs DOM ───── */

test('[F7·11] feldInputHTML: ein Feld mit eingabeTyp trägt data-eingabetyp im gerenderten Input (Grundlage für die Normalisierung im Formular)', () => {
  const { V } = ladeKern();
  const feldTel = { id: 'telefon', label: 'Telefon', typ: 'text', eingabeTyp: 'tel' };
  assert.match(V.feldInputHTML(feldTel, ''), /data-eingabetyp="tel"/);
  const feldOhne = { id: 'x', label: 'X', typ: 'text' };
  assert.ok(!V.feldInputHTML(feldOhne, '').includes('data-eingabetyp'), 'Felder ohne eingabeTyp tragen kein leeres Attribut');
});

test('[F7·12] feldInputHTML: das IBAN-Feld (Listen-Unterfeld von "konten") trägt jetzt eingabeTyp "iban" (bisher gar keinen Marker)', () => {
  const { V } = ladeKern();
  const kontenFeld = V.SEKTOR_BY_ID.finance.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'accounts');
  assert.ok(kontenFeld, '"accounts" existiert weiterhin unter finance');
  const ibanFeld = (kontenFeld.unterFelder || []).find(f => f.id === 'iban');
  assert.ok(ibanFeld, 'IBAN ist weiterhin ein Unterfeld von "accounts"');
  assert.equal(ibanFeld.eingabeTyp, 'iban');
  assert.match(V.feldInputHTML(ibanFeld, ''), /data-eingabetyp="iban"/);
});

/* ── Listen-Unterfelder: dieselbe Prüfung erreicht jetzt auch den dritten Schreibweg ── */

test('[F7·13] _listenEintragPruefen: prüft jetzt jeden Unterfeld-Typ über feldValidieren, nicht mehr nur pflicht/datum', () => {
  const { V } = ladeKern();
  const feldMitZahl = {
    unterFelder: [
      { id: 'anzahl', typ: 'zahl', min: 0, max: 10 },
    ],
  };
  const zuGross = V._listenEintragPruefen('x', 'y', feldMitZahl, { anzahl: '99' }, -1);
  assert.equal(zuGross.ok, false);
  assert.equal(zuGross.grund, 'max');
  const passt = V._listenEintragPruefen('x', 'y', feldMitZahl, { anzahl: '5' }, -1);
  assert.equal(passt.ok, true);
});

test('[F7·14] _listenEintragPruefen: ausgeblendete (sichtbarWenn) Unterfelder werden weiterhin NICHT geprüft', () => {
  const { V } = ladeKern();
  const feld = {
    unterFelder: [
      { id: 'schalter', typ: 'auswahl', optionen: [{ wert: 'ja' }, { wert: 'nein' }] },
      { id: 'nur_bei_ja', typ: 'zahl', min: 0, max: 10, sichtbarWenn: { feld: 'schalter', wert: 'ja' } },
    ],
  };
  const eintrag = { schalter: 'nein', nur_bei_ja: '999' };
  const p = V._listenEintragPruefen('x', 'y', feld, eintrag, -1);
  assert.equal(p.ok, true, 'nur_bei_ja ist bei schalter=nein unsichtbar und bleibt ungeprüft, obwohl "999" ungültig wäre');
});

/* ── Normalisierung im Listen-Eintrag-Pfad (IBAN lebt NUR hier, als Unterfeld von "konten") ── */

test('[F7·15] liesEintragAusWerten: IBAN wird beim Auslesen normalisiert (Leerraum geglättet, Großbuchstaben)', () => {
  const { V } = ladeKern();
  const kontenFeld = V.SEKTOR_BY_ID.finance.sektionen.flatMap(s => s.felder || []).find(f => f.id === 'accounts');
  const eintrag = V.liesEintragAusWerten(kontenFeld, { institution: 'Sparkasse', accountType: 'Girokonto', iban: 'de89  3704 0044 0532 0130 00' });
  assert.equal(eintrag.iban, 'DE89 3704 0044 0532 0130 00');
});

/* ── Ansage vor dem Herausgeben (F7 Zug1) ─────────────────────────────── */

test('[F7·16] exportUnstimmigeFelder: sauberes Depot meldet nichts', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'gender', 'w');
  assert.deepEqual(V.exportUnstimmigeFelder(null), []);
});

test('[F7·17] exportUnstimmigeFelder: ein Wert außerhalb der Optionen (z. B. aus einem alten Import-Weg) wird gemeldet, nicht gesperrt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  // sektorFeldSetzen selbst prüft nicht (das ist genau der F7-Befund) — ein Weg, der ohne
  // Prüfung schreibt, existiert also real, nicht nur hypothetisch.
  V.sektorFeldSetzen('identity', 'gender', 'unbekannter-wert-von-irgendwo');
  const funde = V.exportUnstimmigeFelder(null);
  assert.equal(funde.length, 1);
  assert.equal(funde[0].feld, 'gender');
  assert.equal(funde[0].grund, 'auswahl');
});

test('[F7·18] exportUnstimmigeFelder: sektorId grenzt auf einen Bereich ein', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'gender', 'unbekannter-wert');
  assert.equal(V.exportUnstimmigeFelder('identity').length, 1);
  assert.equal(V.exportUnstimmigeFelder('finance').length, 0, 'anderer Bereich bleibt unberührt');
});

test('[F7·19] flowExportUebersicht: die Ansage blockiert den Fortfahren-Knopf NICHT — primaerLabel bleibt exportAuswahlFortfahren', () => {
  const { V } = ladeKern();
  // Reine Verdrahtungsprobe (kein Browser-DOM nötig): ui.modal wird mit unverändertem
  // primaerLabel aufgerufen, unabhängig davon, ob unstimmige Felder gefunden wurden.
  let gesehenesModal = null;
  const echtesModal = V.ui.modal;
  V.ui.modal = (opt) => { gesehenesModal = opt; return () => {}; };
  try {
    V.flowExportUebersicht({ sektorId: null, titel: 'Test', aufFortfahren: () => {} });
  } finally {
    V.ui.modal = echtesModal;
  }
  assert.equal(gesehenesModal.primaerLabel, V.STRINGS.exportAuswahlFortfahren, 'kein Sperr-Zustand, keine Verweigerung');
});
