'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 1 · Besteht der aufwärtskompatible Weg?  (Antwort an CC, 21.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   SP Bau hat drei der fünf Fragen als EINE erkannt — Prüfstein 3, Prüfstein 5
   und Frage 5 haben dieselbe Form: **ein Schlüssel, der heute eine Dimension
   trägt, müsste zwei tragen.** Gemessen wird, OB der Weg besteht, nicht wie er
   gegangen wird. Kein Bau.

   DIE ANTWORT, an allen drei Stellen: **er besteht** — mit je einer benannten
   Bedingung. Die Entscheidung muss damit heute nicht fallen.

   ZWEI MESSMODELLE MUSSTEN DABEI GESCHÄRFT WERDEN, und beide Male hätte die
   erste Zahl das Gegenteil gesagt:

   (1) Der Roh-Zähler für `data.feldGueltigkeit[` traf auch KOMMENTARE — die
       Kommentare dieses Hauses zitieren Code. 21 gemeldet, 14 tatsächlich.
   (2) Auch 14 war noch irreführend: sie liegen ganz überwiegend INNERHALB der
       Tür und ihres Schreibers. Erst die Zählung je umgebender Funktion zeigt,
       dass AUSSERHALB nur zwei Stellen stehen — eine davon eine alte
       Migrationsstufe. Eine Zahl ohne ihren Ort hätte „geht nicht" gesagt, wo
       „geht" richtig ist.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/aufwaertskompatibel-messen.js');

function mess() {
  const { V } = ladeKern();
  return M.messen(V);
}

/* ══ a · Der Feldwert ═════════════════════════════════════════════════════ */

test('[Zug1·a·Positivkontrolle] die Bestandsform wird unverändert gelesen', () => {
  /* Ohne sie ist „aufwärtskompatibel" behauptet, nicht gemessen — die Auflage des Auftrags. */
  const m = mess();
  assert.equal(m.a.alt.eingetragen, true);
  assert.equal(m.a.alt.wertText, m.a.einzeln, 'der einzelne Wert wird unverändert angezeigt');
  assert.equal(m.a.alt.aufDemBlatt, m.a.einzeln, 'und steht unverändert auf dem Blatt');
});

test('[Zug1·a] die zweite Form am selben Schlüssel bricht nichts — sie ist nur unformatiert', () => {
  /* GEMESSEN: `feldEingetragen` verzweigt auf die FORM des Wertes (`Array.isArray`), nicht auf
     die Feldart — eine Liste an einem `text`-Feld gilt darum schon heute als eingetragen und
     erreicht das Blatt. Angezeigt wird sie über den `String(roh)`-Ausgang, also ohne die
     Listen-Form des Hauses. **Das ist kein Bruch, sondern eine Verbreiterung an EINER Stelle** —
     kein zweiter Lesepfad. */
  const m = mess();
  assert.equal(m.a.formgetrieben, true,
    '`feldEingetragen` verzweigt nicht mehr auf die Form — dann wäre die Aussage neu zu messen');
  assert.equal(m.a.neu.eingetragen, true, 'die Liste gilt als eingetragen');
  assert.ok(m.a.neu.aufDemBlatt && m.a.neu.aufDemBlatt.includes('HU-98765'),
    'der zweite Wert erreicht das Blatt gar nicht: ' + JSON.stringify(m.a.neu.aufDemBlatt));
  assert.notEqual(m.a.neu.wertText, 'DE-12345, HU-98765',
    'die Liste wird bereits in der Hausform angezeigt — dann ist die Verbreiterung schon gebaut');
});

/* ══ b · Der Textsatz-Schlüssel ═══════════════════════════════════════════ */

test('[Zug1·b·DER BEFUND] die Registry wird ABGELEITET — ein Schlüsselwechsel bewegt keinen gespeicherten Wert', () => {
  /* Das ist die teure Frage, und sie fällt weg: `_TEXTSATZ_MODUL_REGISTRY` wird bei jedem Laden
     aus `data.textsatzModule[]` neu gebaut. Der Schlüssel steckt NICHT im Depot-Format — anders
     als der Auftrag vermutete. Gemessen mit Positivkontrolle: mit Depot kommt der Modultext,
     mit leerem Depot der eingebaute. */
  const m = mess();
  assert.equal(m.b.abgeleitet, true,
    'die Registry überlebt ein leeres Depot — dann ist sie doch gespeichert und der Befund kippt');
});

test('[Zug1·b] gespeichert ist die SPRACHE, ein aktiver Rechtsraum hat gar keinen Slot', () => {
  const m = mess();
  assert.equal(m.b.depotHatTextsprache, true, '`data.textsprache` ist die eine gespeicherte Dimension');
  assert.equal(m.b.depotHatRechtsraumSlot, false,
    'es gibt jetzt einen `rechtsraum`-Slot — dann ist die zweite Dimension bereits gebaut');
  assert.equal(m.b.rechtsraumModuleSlot, true, 'die MODULE haben ihren Slot — nur die Auswahl fehlt');
});

/* GEGENPROBE, UMGEDREHT statt gelöscht (04.09.2026, U2-ADR-254, Auftrag) — dieser Test war
   ein Kanarienvogel: seine eigene Fehlermeldung sagte „es gibt jetzt Aufrufer mit einem variablen
   Rechtsraum — dann ist die Auswahl schon gebaut". Genau das ist jetzt wahr. `katalogAufrufe`
   zählt den Roh-Text `_rechtsraumKatalogLesen\(` (tools/aufwaertskompatibel-messen.js:121) — das
   trifft auch die Funktionsdefinition selbst, darum 6, nicht 5 echte Aufrufe. Von den fünf ECHTEN
   Aufrufstellen bleiben drei bewusst literal (Katalog-Metadaten über den deutschen `typ` selbst,
   U2-ADR-254 Befund 2 — sie SOLLEN nicht variieren); zwei sind seit U2-ADR-254 variabel
   (Stempelstelle + Lesepfad der Ehegattennotvertretungsfrist) — die Definitionszeile trägt selbst
   kein literales 'DE', zählt also nie mit. Die funktionale Probe, dass der variable Wert auch
   wirklich eine andere Berechnung auslöst (nicht nur ankommt), steht in
   tests/u2-adr-254-rechtsraum-vorbelegung.test.js — hier bleibt nur die Literal-Zählung. */
test('[Zug1·b·GEGENPROBE] drei von fünf ECHTEN Aufrufen bleiben bewusst literal, zwei sind seit U2-ADR-254 variabel', () => {
  const m = mess();
  assert.equal(m.b.katalogAufrufe, 6, 'die Zahl der Roh-Treffer (5 Aufrufe + 1 Definitionszeile) hat sich verändert — Messmodell neu prüfen: ' + m.b.katalogAufrufe);
  assert.equal(m.b.davonMitDeLiteral, 3,
    'erwartet: drei Katalog-Metadaten-Stellen bleiben literal DE, zwei sind variabel (U2-ADR-254), die Definitionszeile zählt nie mit: '
    + m.b.davonMitDeLiteral + ' von ' + m.b.katalogAufrufe);
});

/* ══ c · Der Gültigkeits-Eintrag ══════════════════════════════════════════ */

test('[Zug1·c·Positivkontrolle] zwei Bestandseinträge alter Form werden getrennt gelesen', () => {
  const m = mess();
  assert.equal(m.c.paarGetrennt, true,
    'die Bestandsform wird nicht mehr unverändert gelesen — dann trägt die ganze Messung nicht');
});

test('[Zug1·c·DAS MESSMODELL] ausserhalb der zwei Türen stehen genau zwei Stellen', () => {
  /* Die Zahl allein hätte „geht nicht" gesagt. Je Funktion gezählt: `feldGueltigkeitSetzen` und
     `feldGueltigkeitLesen` sind die Türen selbst; draussen stehen `feldAlsGeprueft` (das den
     Haken an DENSELBEN Eintrag hängt und die Werte ohnehin durch die Tür liest) und
     `_zug3TrennenAuswahl57` — eine alte Migrationsstufe, die naturgemäss roh schreibt. */
  const m = mess();
  assert.deepEqual(m.c.ausserhalb.slice().sort(), ['_zug3TrennenAuswahl57', 'feldAlsGeprueft'],
    'die Stellen ausserhalb der Türen haben sich verändert: ' + m.c.ausserhalb.join(', ')
    + ' — jede neue davon müsste einen Gruppen-Schlüssel selbst kennen und wäre ein zweiter Lesepfad');
  assert.ok(m.c.durchDieTuer >= 10, 'die Tür wird kaum benutzt — dann ist sie keine');
});

test('[Zug1·Ergebnis] an allen drei Stellen bewegt die Bestandsform sich nicht', () => {
  /* Die eine Frage des Auftrags, in einer Probe: „ohne dass ein einziger Bestandswert umzieht". */
  const m = mess();
  assert.equal(m.a.alt.wertText, m.a.einzeln, 'a · der einzelne Feldwert');
  assert.equal(m.b.abgeleitet, true, 'b · die Registry ist gar nicht gespeichert');
  assert.equal(m.c.paarGetrennt, true, 'c · die getrennten Gültigkeits-Einträge');
});
