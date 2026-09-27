'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A445 · Der Gültigkeitsbeginn — Zug 0 misst, Zug 1 baut die eine fehlende Frage
   ────────────────────────────────────────────────────────────────────────────
   ENTSCHIEDEN am 21.08.2026: „Gültigkeitsbeginn bauen." Das
   Entscheidungsblatt sagt: *„Im Depot steht, bis wann etwas gilt, nicht ab wann.
   … es gibt nichts nachzuziehen, die Lücke ist leer."*

   ZUG 0 HAT DAS GEPRÜFT, STATT ES ZU GLAUBEN (`tools/gueltigkeitsbeginn-messen.js`,
   sieben Stationen, jede mit Positivkontrolle):

     1 SPEICHER `data.feldGueltigkeit[…].von` STEHT
     2 SCHREIBWEG `_gueltigSchreiben(…, 'von', …)` STEHT
     3 EINGABE ein „gilt ab"-Feld an JEDEM Datumsfeld STEHT
     4 LESEWEG `feldGueltigkeitLesen` STEHT
     5 ANTWORT `feldGiltAm` — davor/innerhalb/danach STEHT
     6 AUFRUFER fragt das im Produkt je jemand? **NEIN**
     7 AUSGABE reist in den Export STEHT

   DIE LÜCKE WAR NICHT LEER — SIE WAR EINE EINZIGE FEHLENDE FRAGE. Sechs von
   sieben Stationen standen seit dem 18.08.; `feldGiltAm` hatte im ganzen Kern
   genau EIN Vorkommen, und das war seine eigene Definition. Die Bürgerin konnte
   ein „gilt ab" in der Zukunft eintragen, und nichts sagte ihr, dass die Sache
   noch nicht gilt.

   ZUG 1 BAUT DARUM ZWEI DINGE, und nicht mehr:
     · Station 6 — die Feldzeile FRAGT jetzt (`feldGiltAm` bekommt seinen ersten
       Aufrufer im Produkt) und sagt „gilt noch nicht", wenn der Beginn in der
       Zukunft liegt.
     · die Marke `giltAb` — der Zwilling von `laeuftAb`, damit ein Feld, dessen
       WERT ein Anfang ist, ihn auch als Anfang ablegen kann.

   WAS AUSDRÜCKLICH NICHT GEBAUT IST: kein Bestandsfeld ist umgemarkt worden.
   `finance.companyPensionAgreedStartDate` („vereinbarter Rentenbeginn") trägt heute
   `laeuftAb` — ein Anfang, abgelegt als Ende. Das UMZUMARKEN verschiebt gespeicherte
   Werte von `.bis` nach `.von` und ist damit eine Migration; sie gehört in den
   gemeinsamen Schnitt mit A286, und davor hält CC an und meldet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/gueltigkeitsbeginn-messen.js');

const BEREICH = 'wohnen';
function mitFeldern(V) {
  const d = V.leeresDepot();
  d.feldDefinitionen = [
    { sektorId: BEREICH, feldId: 'tpl_mietbeginn', typ: 'datum', label: 'Mietbeginn', marken: ['giltAb'] },
    { sektorId: BEREICH, feldId: 'tpl_mietende', typ: 'datum', label: 'Mietende', marken: ['laeuftAb'] },
    { sektorId: BEREICH, feldId: 'tpl_ohne', typ: 'datum', label: 'Ohne Marke' },
  ];
  V.setData(d);
  return d;
}

/* ══ Zug 0 · der Befund, der den Zuschnitt bestimmt ═══════════════════════ */

test('[A445·Zug 0] jede der sieben Stationen hat eine tragende Positivkontrolle', () => {
  const { V } = ladeKern();
  const m = M.messen(V);
  for (const s of m.stationen) {
    assert.ok(!s.kontrolle.startsWith('ROT'),
      s.station + ': ' + s.kontrolle + ' — ohne sie misst diese Datei den Messweg, nicht den Gegenstand');
  }
});

test('[A445·Zug 0·DER BEFUND] sechs Stationen standen schon; leer war allein die Frage', () => {
  const { V } = ladeKern();
  const m = M.messen(V);
  const von = (nr) => m.stationen.find((s) => s.station.startsWith(nr));
  for (const nr of ['1', '2', '3', '4', '5', '7']) {
    assert.ok(von(nr).befund.startsWith('JA'),
      'Station ' + nr + ' steht NICHT: ' + von(nr).befund + ' — dann ist der Zuschnitt dieses Postens neu zu messen');
  }
});

/* ══ Zug 1 · Station 6 — die Anwendung fragt ══════════════════════════════ */

test('[A445·Rot-Beweis] ein Beginn in der Zukunft sagt „gilt noch nicht"', () => {
  const { V } = ladeKern();
  mitFeldern(V);
  V.feldGueltigkeitSetzen(BEREICH, 'tpl_ohne', '2099-01-01', '2099-12-31');
  const html = V.feldGueltigkeitZeileHTML(BEREICH, 'tpl_ohne', { typ: 'datum' }, false, false);
  assert.ok(html.includes(V.STRINGS.gueltigkeitNochNicht),
    'die Zeile schweigt über einen Beginn in der Zukunft — genau der Zustand vor A445');
});

test('[A445] eine laufende und eine abgelaufene Angabe bekommen den Hinweis NICHT', () => {
  /* Ohne diese Gegenprobe wäre „der Hinweis steht" auch dann grün, wenn er immer stünde.
     Und das ABGELAUFENE bekommt hier bewusst keinen zweiten Ablauf-Text: dafür stehen das
     Prüfblatt und die Feld-Beschriftung. */
  const { V } = ladeKern();
  mitFeldern(V);
  V.feldGueltigkeitSetzen(BEREICH, 'tpl_ohne', '2020-01-01', '2099-12-31');
  assert.ok(!V.feldGueltigkeitZeileHTML(BEREICH, 'tpl_ohne', { typ: 'datum' }, false, false)
    .includes(V.STRINGS.gueltigkeitNochNicht), 'laufend');
  V.feldGueltigkeitSetzen(BEREICH, 'tpl_ohne', '2020-01-01', '2021-12-31');
  assert.ok(!V.feldGueltigkeitZeileHTML(BEREICH, 'tpl_ohne', { typ: 'datum' }, false, false)
    .includes(V.STRINGS.gueltigkeitNochNicht), 'abgelaufen');
});

test('[A445] die Entscheidung fällt in `feldGiltAm`, nicht in der Zeile', () => {
  /* Die Zeile liest nur ab, WELCHES Ende der Grund ist. Wäre die Entscheidung dort nachgerechnet,
     gäbe es zwei Stellen, an denen ein Datum ausgewertet wird — und im nächsten Umbau zwei
     Wahrheiten. */
  const { V } = ladeKern();
  mitFeldern(V);
  V.feldGueltigkeitSetzen(BEREICH, 'tpl_ohne', '2099-01-01', null);
  assert.equal(V.feldGiltAm(BEREICH, 'tpl_ohne', new Date()), false,
    'die Antwort selbst muss `false` sein — sonst zeigt die Zeile einen Hinweis ohne Deckung');
});

/* ══ Zug 1 · die Marke `giltAb` ═══════════════════════════════════════════ */

test('[A445·Rot-Beweis] ein `giltAb`-Feld legt seinen Wert als ANFANG ab, nicht als Ende', () => {
  const { V } = ladeKern();
  mitFeldern(V);
  assert.equal(V.feldRohwertSetzen(BEREICH, 'tpl_mietbeginn', '2027-05-01'), true, 'der Wert wird umgeleitet');
  assert.deepEqual(V.feldGueltigkeitLesen(BEREICH, 'tpl_mietbeginn'), { von: '2027-05-01', bis: null });
  assert.equal(V.feldRohwert(BEREICH, 'tpl_mietbeginn'), '2027-05-01', 'und kommt über denselben Weg zurück');
  assert.equal(V.feldGiltAm(BEREICH, 'tpl_mietbeginn', '2026-06-01'), false, 'davor gilt es nicht');
  assert.equal(V.feldGiltAm(BEREICH, 'tpl_mietbeginn', '2027-06-01'), true, 'danach gilt es');
});

test('[A445] der Zwilling `laeuftAb` verhält sich unverändert', () => {
  const { V } = ladeKern();
  mitFeldern(V);
  V.feldRohwertSetzen(BEREICH, 'tpl_mietende', '2030-04-30');
  assert.deepEqual(V.feldGueltigkeitLesen(BEREICH, 'tpl_mietende'), { von: null, bis: '2030-04-30' });
});

test('[A445·die Zusicherung] ein Feld OHNE Marke verhält sich wie vor dem Umbau', () => {
  /* „Ein Feld ohne Gültigkeitsangabe verhält sich wie heute. Rot-Beleg je erhaltenem
     Verhalten." — die Auflage des Auftrags, wörtlich. */
  const { V } = ladeKern();
  const d = mitFeldern(V);
  assert.equal(V.feldRohwertSetzen(BEREICH, 'tpl_ohne', '2026-01-01'), false,
    'ein Feld ohne Marke darf NICHT umgeleitet werden');
  assert.equal(V.feldGueltigkeitLesen(BEREICH, 'tpl_ohne'), null, 'und legt nichts in der Gültigkeit ab');
  d.sektoren[BEREICH] = { tpl_ohne: '2026-01-01' };
  V.setData(d);
  assert.equal(V.feldRohwert(BEREICH, 'tpl_ohne'), '2026-01-01', 'sein Wert kommt unverändert aus dem Bereich');
  assert.equal(V.feldGiltAm(BEREICH, 'tpl_ohne', '1999-01-01'), true,
    'unbekannt heisst „wie bisher", nicht „ungültig" — auch für einen Tag weit vor allem');
});

test('[A445] beide Marken zugleich: `laeuftAb` gewinnt, es entstehen keine zwei Wahrheiten', () => {
  /* Ein Feld trägt EINEN Wert. Ginge er an beide Schlüssel, stünde dasselbe Datum als Anfang
     UND als Ende — und `feldGiltAm` läse eine Gültigkeit, die an ihrem eigenen Tag beginnt
     und endet. Das ältere, im Bestand gefahrene Verhalten gewinnt. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: BEREICH, feldId: 'tpl_beides', typ: 'datum', label: 'Beides', marken: ['giltAb', 'laeuftAb'] }];
  V.setData(d);
  V.feldRohwertSetzen(BEREICH, 'tpl_beides', '2028-01-01');
  assert.deepEqual(V.feldGueltigkeitLesen(BEREICH, 'tpl_beides'), { von: null, bis: '2028-01-01' });
});

/* ══ Zug 2 (Schnitt Glied 1, 22.08.2026) — die sieben Anfänge, sechs additiv umgemarkt ═══ */

test('[A445·Zug2] fünf klare Anfänge tragen jetzt `giltAb`', () => {
  /* Sieben Anfänge waren erhoben (Teil-B-Nachtrag, 21.08.): `finance.companyPensionAgreedStartDate` trug
     bereits `laeuftAb` (ein Anfang, abgelegt als Ende), die übrigen sechs trugen GAR KEINE Marke
     — additiv nachrüstbar, ohne dass ein Bestandswert seinen Platz wechselt (der Lesepfad fällt
     zurück auf den Bereichswert, solange `feldGueltigkeit` leer ist). Zwei weitere Fälle blieben
     ausdrücklich UNENTSCHIEDEN (`finance.privatePensionProvisionAgreed`, `verwaltung.verwaltung_vorgaenge/
     datum` — „beides genannt") und sind hier NICHT angefasst.

     Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): zwei der sechs additiv markierten Felder
     (`identitaet.ausweis_ausgestellt`, `identitaet.aufenthaltstitel_ausgestellt`) sind seither
     Listen-Unterfelder — ein Unterfeld trägt hier keine eigene Marke (dieselbe Grenze wie beim
     Wegfall von `laeuftAb`, s. m1-umzug-gueltigkeit.test.js). Von sechs auf vier bleiben.

     NACHTRAG 23.08.2026 (Auftrag „Die Feld-Remarkierung"): `finance.companyPensionAgreedStartDate` ist jetzt
     das FÜNFTE — die hier ursprünglich angehaltene Migration (s. vormals „Zug2·angehalten",
     jetzt „Zug2·nachgezogen" unten) ist gefahren. Vier additiv + eins migriert = fünf. */
  const { V } = ladeKern();
  const m = M.messen(V);
  const erwartet = [
    'finance.companyPensionAgreedStartDate', 'mobility.passportIssuedOn', 'people.childrenAndDependants/validSince',
    'people.maintenanceObligationsAnd/start', 'advanceCare.provisionInstruments/appointedSince',
  ];
  assert.deepEqual(m.marken.giltAb.slice().sort(), erwartet.slice().sort());
});

test('[A445·Zug2·nachgezogen] `finance.companyPensionAgreedStartDate` trägt jetzt `giltAb` — die hier angehaltene Migration ist gefahren', () => {
  /* NACHTRAG 23.08.2026 (Auftrag „Die Feld-Remarkierung"): genau die hier beschriebene, „am Ende
     des Schnitts" geplante Migration ist NIE gefahren — Glied 6/der Schema-Bump 73→74 (die
     gemeinsame Stufe am Ende des Schnitts) berührte diesen Fall nicht (s. Kommentar am Bump in
     `depotNormalisieren`, Aufzählung aller sechs Glieder, `bav_rentenbeginn` fehlt darin). A445/
     A448 blieben deshalb auf „läuft" stehen. Jetzt nachgeholt, als eigene Stufe (Schema 74→75,
     `_feldRemarkierungMigrieren`-Kommentar in `depotNormalisieren`): der Marken-Flip UND der
     physische `.bis`→`.von`-Umzug laufen ATOMAR in derselben Migration — exakt wie hier
     verlangt. Rot-Beleg/Migrationsprobe: `tests/feld-remarkierung-bav-rentenbeginn.test.js`. */
  const { V } = ladeKern();
  const m = M.messen(V);
  assert.ok(m.marken.giltAb.includes('finance.companyPensionAgreedStartDate'),
    'die Migration ist gefahren — der Flip steht jetzt bei giltAb');
  assert.ok(!m.marken.laeuftAb.includes('finance.companyPensionAgreedStartDate'),
    'und nicht mehr bei seinem alten, falschen Platz');
});

test('[A445·Zug2·Rot-Beweis] reisepass_ausgestellt in der Zukunft sagt „gilt noch nicht"', async () => {
  /* Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `identitaet.ausweis_ausgestellt` gibt es als
     Flachfeld nicht mehr (jetzt Listen-Unterfeld `ausweis/ausgestellt`, ohne eigene Marke, s.
     oben) — `mobility.passportIssuedOn` ist das einzige verbleibende `giltAb`-Flachfeld
     dieser Familie und belegt den Rot-Beweis jetzt an seiner Stelle. */
  const { V } = ladeKern();
  await V.depotAnlegen('a445-zug2-pw');
  V.akteurSelbstErklaeren('Prüfung');
  const heute = new Date('2026-08-22T10:00:00Z');
  V.sektorFeldSetzen('mobility', 'passportIssuedOn', '2099-01-01');
  assert.equal(V.feldGiltAm('mobility', 'passportIssuedOn', heute), false,
    'ein Ausstellungsdatum in der Zukunft gilt noch nicht');
});

/* [A445·Zug2] Der zweite Schreibweg (bearbeitungSpeichern/_faltContainer) bekam denselben
   Zwilling-Fix wie sektorFeldSetzen (s. Kommentar an `_umzieht` im Kern). NICHT hier per
   Node-Probe geprüft — der DOM-Stub dieses Harnisses liefert `c.querySelectorAll('[data-edit]')`
   leer zurück (empirisch geprüft), er kann `_faltContainer` also nicht auslösen. Bewiesen in
   Playwright statt hier: `tests/e2e/a320-gueltigkeit-schreibweg.spec.js`,
   „[Schnitt Glied1·Rot] ein giltAb-Feld schreibt seinen Wert ebenfalls an den Zielort". */

test('[A445·Zug2·Gegenprobe] ein Bestandswert ohne feldGueltigkeit-Eintrag bleibt lesbar (additiver Fallback)', async () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  // Simuliert einen ALTEN Bestandswert: direkt im Bereich, VOR dieser Umstellung geschrieben —
  // kein feldGueltigkeit-Eintrag existiert für ihn.
  d.sektoren.identity = { ausweis_ausgestellt: '2015-05-01' };
  V.setData(d);
  assert.equal(V.feldRohwert('identity', 'ausweis_ausgestellt'), '2015-05-01',
    'der alte Bestandswert bleibt lesbar, obwohl das Feld jetzt giltAb trägt');
});
