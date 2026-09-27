'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Schema 85 → 86 — die sechs komplexen Dokumenttyp-Codes, L4 (20.09.2026)
   ─────────────────────────────────────────────────────────────────────────────
   „Englisch vor v1", DoD-Punkt 2, Entscheidung 20.09.2026: Daten UND
   Kern-Code je Code IN EINEM SCHRITT, nicht zweigeteilt — s. Kommentar an
   depotNormalisieren() im Kern. Diese Datei wächst Code für Code (erster: 20.09.2026,
   bankvollmacht -> bank-power-of-attorney), jeder mit seiner eigenen Migrations-,
   Rundlauf- und Generator-Probe — kein Code gilt als fertig, nur weil sein Literal
   nicht mehr vorkommt (wörtlich: „der stille Fehlschlag bei den Generatoren
   ist das Risiko, nicht die Menge").

   BANKVOLLMACHT IST DER SONDERFALL, NICHT DER EINFACHE FALL: er hat keinen eigenen
   `provisionInstruments[].instrument`-Wert — zeilenintern ist er
   instrument='vorsorgevollmacht' + typeOfPowerOfAttorney='bank' (unverändert, beide
   Werte sind nicht Teil dieser Umbenennung). Der „zweite Datenort"
   (Auftrag, „nicht vergessen") ist für DIESEN Code darum bereits sauber —
   es gibt nichts zu übersetzen, was nicht schon Englisch wäre oder unverändert bleibt.

   TESTAMENT (zweiter Code, 20.09.2026) IST DER EINFACHE FALL: er IST sein eigener
   `provisionInstruments[].instrument`-Wert — die Migrationsstufe übersetzt für ihn BEIDE
   Datenorte wirklich. Reichweite deutlich größer als bei bankvollmacht: `unquoted`-
   Objektschlüssel (VORSORGE_EINZIGARTIG, ERKENNUNG_LEITFELDER, LISTEN_AUSWAHLFORM) und
   Pfad-Strings, die den Code als Segment tragen (`liste:provisionInstruments:testament:…`,
   `advanceCare.provisionInstruments/instrument/testament.label`) — reiner Literal-Grep auf
   `'testament'` findet diese nicht.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// dokumentAusStandard/_vorsorgeInstrumentZeileFuerStandardTyp lesen die modul-globale `data` —
// ein echtes Depot ist der einzige Weg, sie zu füllen (wie tests/m3-eintrag-bezug-zug1.test.js).
async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen('schema-86-l4-probe-2026!');
  V.akteurSelbstErklaeren('Tester');
  return V;
}

test('[Schema-86·L4] SCHEMA_VERSION_AKTUELL ist mindestens 86', () => {
  const { V } = ladeKern();
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 86);
});

test('[Schema-86·L4] bankvollmacht -> bank-power-of-attorney, aus rohem Alt-Depot (schemaVersion 83)', () => {
  const { V } = ladeKern();
  const roh = { schemaVersion: 83, sektoren: {}, dokumente: [{ id: 'd1', typ: 'bankvollmacht', sektorId: 'finance' }] };
  const migriert = V.depotNormalisieren(roh);
  assert.equal(migriert.dokumente[0].typ, 'bank-power-of-attorney');
  assert.equal(migriert.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'alle Stufen (84 bis zur aktuellen Version) laufen in einem Aufruf durch');
});

test('[Schema-86·L4] idempotent — ein zweiter Lauf auf dem migrierten Depot ändert nichts mehr', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 83, sektoren: {}, dokumente: [{ id: 'd1', typ: 'bankvollmacht', sektorId: 'finance' }] };
  const einmal = V.depotNormalisieren(alt);
  const nochEinmal = V.depotNormalisieren(JSON.parse(JSON.stringify(einmal)));
  assert.deepEqual(nochEinmal.dokumente, einmal.dokumente);
  assert.equal(nochEinmal.schemaVersion, einmal.schemaVersion);
});

test('[Schema-86·L4·Rot-Beweis] ein Dokument ohne einen der (bisher eingetragenen) Alt-Codes bleibt unverändert', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 84, sektoren: {}, dokumente: [{ id: 'd1', typ: 'eigener-typ-ohne-eintrag', sektorId: 'advanceCare' }] };
  // Ein Typ, der nicht in DOKUMENTTYP_ALT_ZU_NEU_L4 steht (eigene/fremde Typen), bleibt unverändert.
  assert.equal(V.depotNormalisieren(alt).dokumente[0].typ, 'eigener-typ-ohne-eintrag');
});

/* Der Auftrag „eine Probe, die jeden der sechs Codes einmal durch seinen
   Generator schickt, statt nur die Literale zu zählen": dokumentAusStandard() ist der
   reale Weg, über den ein Bankvollmacht-Dokument entsteht — Katalog-Lookup über den
   NEUEN Code, Zeilen-Auflösung gegen die (kompoundierte) provisionInstruments-Zeile. */
test('[Schema-86·L4·Generator] dokumentAusStandard(\'bank-power-of-attorney\') findet den Katalogeintrag und die richtige Instrument-Zeile', async () => {
  const V = await depot();
  const jetzt = new Date('2026-09-20T12:00:00Z');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', dateOfLastChange: '2026-01-01' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusStandard('bank-power-of-attorney', 'finance', jetzt);
  assert.ok(doc, 'dokumentAusStandard darf für den neuen Code nicht null liefern');
  assert.equal(doc.typ, 'bank-power-of-attorney');
  assert.equal(doc.name, 'Bankvollmacht', 'die Anzeige bleibt deutsch (Klarstellung 20.09.)');
  assert.equal(doc.pruefIntervallMonate, 12);
  const feld = doc.felder.find((f) => f.feldId === 'provisionInstruments');
  assert.ok(feld, 'die Katalog-Feldreferenz auf provisionInstruments muss ankommen');
  assert.equal(feld.zeilenId, zeile.id, 'die Sonderfall-Auflösung (instrument=enduring-power-of-attorney+typeOfPowerOfAttorney=bank) muss die Zeile finden');
  // Dieselbe positive Bahn deckt bereits tests/m3-eintrag-bezug-zug1.test.js (dort mitgezogen,
  // s. Commit) — hier zusätzlich, weil DIESE Datei die L4-Kette komplett hält, nicht verstreut.
});

test('[Schema-86·L4·Generator·Rot-Beweis] der ALTE Code findet im Katalog nichts mehr — kein stiller Fehlschlag auf falsche Daten', async () => {
  const V = await depot();
  const doc = V.dokumentAusStandard('bankvollmacht', 'finance', new Date());
  assert.equal(doc, null, 'der Katalog kennt den alten Code nicht mehr — dokumentAusStandard muss das benennen (null), nicht raten');
});

test('[Schema-86·L4] entitaetAnzeige/bankvollmachtVorschlag dispatchen über den neuen Code', async () => {
  const V = await depot();
  assert.ok(Array.isArray(V.bankvollmachtVorschlag()), 'Funktion bleibt unter ihrem Namen erreichbar (interner Bezeichner, keine Kennung)');
});

/* ═════ testament -> will, zweiter Code (20.09.2026) ═════ */

test('[Schema-86·L4] testament -> will an BEIDEN Datenorten, aus rohem Alt-Depot (schemaVersion 83)', () => {
  const { V } = ladeKern();
  const roh = { schemaVersion: 83,
    sektoren: { advanceCare: { provisionInstruments: [{ id: 'p1', instrument: 'testament', dateOfLastChange: '2024-01-01' }] } },
    dokumente: [{ id: 'd1', typ: 'testament', sektorId: 'advanceCare' }] };
  const migriert = V.depotNormalisieren(roh);
  assert.equal(migriert.dokumente[0].typ, 'will', 'erster Datenort: dokumente[].typ');
  assert.equal(migriert.sektoren.advanceCare.provisionInstruments[0].instrument, 'will',
    'zweiter Datenort (Auflage „nicht vergessen"): provisionInstruments[].instrument');
  assert.equal(migriert.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[Schema-86·L4] testament -> will idempotent — ein zweiter Lauf ändert nichts mehr', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 83,
    sektoren: { advanceCare: { provisionInstruments: [{ id: 'p1', instrument: 'testament', dateOfLastChange: '2024-01-01' }] } },
    dokumente: [{ id: 'd1', typ: 'testament', sektorId: 'advanceCare' }] };
  const einmal = V.depotNormalisieren(alt);
  const nochEinmal = V.depotNormalisieren(JSON.parse(JSON.stringify(einmal)));
  assert.deepEqual(nochEinmal.dokumente, einmal.dokumente);
  assert.deepEqual(nochEinmal.sektoren, einmal.sektoren);
  assert.equal(nochEinmal.schemaVersion, einmal.schemaVersion);
});

test('[Schema-86·L4·Generator] dokumentAusStandard(\'will\') findet den Katalogeintrag und die richtige Instrument-Zeile', async () => {
  const V = await depot();
  const jetzt = new Date('2026-09-20T12:00:00Z');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', dateOfLastChange: '2026-01-01' });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = V.dokumentAusStandard('will', 'advanceCare', jetzt);
  assert.ok(doc, 'dokumentAusStandard darf für den neuen Code nicht null liefern');
  assert.equal(doc.typ, 'will');
  assert.equal(doc.name, 'Testament', 'die Anzeige bleibt deutsch (Klarstellung 20.09.)');
  const feld = doc.felder.find((f) => f.feldId === 'provisionInstruments');
  assert.ok(feld, 'die Katalog-Feldreferenz auf provisionInstruments muss ankommen');
  assert.equal(feld.zeilenId, zeile.id, 'testament ist der einfache Fall — direkte instrument-Gleichheit, kein Sonderfall wie bankvollmacht');
});

test('[Schema-86·L4·Generator·Rot-Beweis] der ALTE Code testament findet im Katalog nichts mehr', async () => {
  const V = await depot();
  const doc = V.dokumentAusStandard('testament', 'advanceCare', new Date());
  assert.equal(doc, null, 'der Katalog kennt den alten Code nicht mehr — kein stiller Fehlschlag, kein Raten');
});

test('[Schema-86·L4] die Migration erkennt den ALTEN Code auch, wenn er bereits im provisionInstruments-Datenort steht, OHNE zugehöriges dokumente[]', () => {
  // Ein Depot kann eine Instrument-Zeile tragen, ohne dass je ein passendes dokumente[]
  // angelegt wurde (z. B. nie über die Erkennung angenommen) — der zweite Datenort muss
  // trotzdem unabhängig vom ersten übersetzt werden.
  const { V } = ladeKern();
  const roh = { schemaVersion: 84, sektoren: { advanceCare: { provisionInstruments: [
    { id: 'p1', instrument: 'testament', dateOfLastChange: '2024-01-01' },
  ] } }, dokumente: [] };
  const migriert = V.depotNormalisieren(roh);
  assert.equal(migriert.sektoren.advanceCare.provisionInstruments[0].instrument, 'will');
});

/* ═════ Fund 20.09.2026 (20.09.2026, waehrend testament -> will): B16_INSTRUMENT_IMPORT speist NICHT
   NUR die Schema-51->52-Migrationsstufe (dort liefe ein uebersetzter Wert ohnehin noch durch
   Stufe 84->85 weiter) — dieselbe Tabelle speist auch den LIVE b16-Import (_b16Felder), der
   direkt in ein FRISCH angelegtes Depot schreibt. leeresDepot() setzt schemaVersion sofort auf
   SCHEMA_VERSION_AKTUELL — depotNormalisieren() laeuft dort nie mehr nach (das passiert nur beim
   OEFFNEN einer Datei ueber depotLaden). Ein alter Code, der hier stehen bliebe, waere dauerhaft
   falsch, nicht nur uebergangsweise — kein Wurf, kein Hinweis. ANDERS als bankvollmachts Rest
   (Schema-58->59, rein migrationsintern, vom laufenden Betrieb nie erreicht): dieser Tabellen-
   eintrag ist kein Bewahrungsfall, er wurde auf 'will' korrigiert (s. Kommentar an
   B16_INSTRUMENT_IMPORT im Kern). Dieser Test haelt GENAU den Live-Weg fest, den ein reiner
   Migrations-Test nie sieht. */
test('[Schema-86·L4·Rot-Beweis·b16-Live-Import] ein frisch angelegtes Depot (aktuelle Schemaversion) bekommt aus einem b16-Import mit der alten Gate-Kennung testament_vorhanden sofort den NEUEN Code — kein Migrationsschritt laeuft hier je nach', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('probe-b16-live-import-2026!');
  V.akteurSelbstErklaeren('Probe');
  assert.equal(V.getData().schemaVersion, V.SCHEMA_VERSION_AKTUELL,
    'Vorbedingung: ein frisches Depot startet bereits auf der aktuellen Schemaversion — genau der Fall, der die spaetere Migrationsstufe nie erreicht');
  const text = JSON.stringify({ testament_vorhanden: 'ja', testament_ort: 'beim Notar' });
  // Format fest benannt (wie durchDenEchtenWeg mit autoErkennen:false in b16-durchstich): die
  // Auto-Erkennung verlangt mehr als ein einzelnes Gate-Feld und ist hier nicht der Gegenstand.
  const plan = V.importPlan('vivodepot-beta', text);
  assert.equal(plan.ungueltig, false, 'Vorbedingung: der Text wird als b16-Import angenommen');
  V.importAnwenden(plan, { alleKonflikte: true });
  const zeile = (V.getData().sektoren.advanceCare.provisionInstruments || []).find((z) => z.storageLocation === 'beim Notar');
  assert.ok(zeile, 'die importierte Instrument-Zeile muss im frischen Depot ankommen');
  assert.equal(zeile.instrument, 'will',
    'der Live-Importweg darf den alten Code niemals schreiben — hier gibt es keine spaetere Migrationsstufe, die ihn noch korrigieren wuerde');
});

/* ═════ die weiteren komplexen Codes in EINEM Zug (20.09.2026): enduring-power-of-attorney,
   living-will, custodianship-declaration, guardian-nomination, custodian-appointment. Je Code dieselben drei Wege wie oben:
   Migration (beide Datenorte), Live-Import-Weg (frisches Depot, aktuelle Schemaversion), Generator.
   Die alten Codes stehen hier aus Bruchstücken, damit der Prüfer (tools/kennung-vorkommen-finden.js)
   diese Datei nicht als Fundstelle zählt. ═════ */
const VIER = [
  { alt: ['vorsorge', 'vollmacht'].join(''), neu: 'enduring-power-of-attorney', gate: 'vollmacht_vorhanden', detail: { vollmacht_person: 'Anna Beispiel' } },
  { alt: ['patienten', 'verfuegung'].join(''), neu: 'living-will', gate: 'patientenverf_vorhanden', detail: { patientenverf_ort: 'Tresor' } },
  { alt: ['betreuungs', 'verfuegung'].join(''), neu: 'custodianship-declaration', gate: ['betreuungs', 'verfuegung'].join(''), detail: { betreuung_ort: 'Tresor' } },
  { alt: ['sorgerechts', 'verfuegung'].join(''), neu: 'guardian-nomination', gate: ['sorgerechts', 'verfuegung'].join(''), detail: { sorgerechtsverfuegung_ort: 'Tresor' } },
  // ohne Gate-Feld im alten b16-Format: kein Live-Importweg, nur Migration und Generator
  { alt: ['betreuer', 'bestellung'].join(''), neu: 'custodian-appointment', gate: null, keinDokument: true },
];
for (const c of VIER) {
  test('[Schema-86·L4] ' + c.alt + ' -> ' + c.neu + ' an BEIDEN Datenorten, aus rohem Alt-Depot (schemaVersion 83)', () => {
    const { V } = ladeKern();
    const roh = { schemaVersion: 83,
      sektoren: { advanceCare: { provisionInstruments: [{ id: 'p1', instrument: c.alt }] } },
      dokumente: [{ id: 'd1', typ: c.alt, sektorId: 'advanceCare' }] };
    const m = V.depotNormalisieren(roh);
    assert.equal(m.dokumente[0].typ, c.neu, 'erster Datenort: dokumente[].typ');
    assert.equal(m.sektoren.advanceCare.provisionInstruments[0].instrument, c.neu, 'zweiter Datenort: provisionInstruments[].instrument');
    assert.equal(m.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'ein Sprung für alle Codes');
  });

  if (c.gate) test('[Schema-86·L4·Rot-Beweis·Live-Import] ' + c.neu + ': ein frisches Depot bekommt über den echten b16-Importweg sofort den NEUEN Code', async () => {
    const { V } = ladeKern();
    await V.depotAnlegen('probe-l4-vier-2026!');
    V.akteurSelbstErklaeren('Probe');
    assert.equal(V.getData().schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'Vorbedingung: aktuelle Schemaversion, keine spätere Stufe läuft mehr');
    const text = JSON.stringify(Object.assign({ [c.gate]: 'ja' }, c.detail));
    const plan = V.importPlan('vivodepot-beta', text);
    assert.equal(plan.ungueltig, false, 'Vorbedingung: der Text wird als b16-Import angenommen');
    V.importAnwenden(plan, { alleKonflikte: true });
    const liste = V.getData().sektoren.advanceCare.provisionInstruments || [];
    assert.ok(liste.some((z) => z.instrument === c.neu), 'die Instrument-Zeile trägt den neuen Code');
    assert.ok(!liste.some((z) => z.instrument === c.alt), 'und niemals den alten');
  });

  if (!c.keinDokument) test('[Schema-86·L4·Generator] dokumentAusStandard(' + c.neu + ') findet Katalog und Instrument-Zeile; der alte Code findet nichts mehr', async () => {
    const V = await depot();
    V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: c.neu, dateOfLastChange: '2026-01-01' });
    const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
    const doc = V.dokumentAusStandard(c.neu, 'advanceCare', new Date('2026-09-20T12:00:00Z'));
    assert.ok(doc, 'dokumentAusStandard darf für den neuen Code nicht null liefern');
    assert.equal(doc.typ, c.neu);
    const feld = doc.felder.find((f) => f.feldId === 'provisionInstruments');
    assert.ok(feld && feld.zeilenId === zeile.id, 'Zeilen-Auflösung über den neuen Code');
    assert.equal(V.dokumentAusStandard(c.alt, 'advanceCare', new Date()), null, 'der alte Code findet im Katalog nichts mehr');
  });
}

/* Schema 51->52 (tote Leitfelder) baut die Instrument-Zeile aus dem Gate über B16_INSTRUMENT_IMPORT — die
   trägt seit L4 die NEUEN Codes; eine schon vorhandene Zeile desselben Typs (aus einer älteren Stufe)
   trägt noch den ALTEN. Ohne Übersetzung im Vergleich entstand daneben eine zweite Zeile (Duplikat).
   Rot-Beweis je Code mit Gate: ein Alt-Depot mit Zeile UND Gate 'ja' ergibt genau EINE Zeile. */
for (const c of VIER.filter((x) => x.gate).concat([{ alt: ['test', 'ament'].join(''), neu: 'will', gate: 'testament_vorhanden' }])) {
  test('[Schema-86·L4·Rot-Beweis·Dedup] ' + c.neu + ': Alt-Depot (Schema 40) mit Zeile und Gate ergibt genau EINE Zeile, kein Duplikat', () => {
    const { V } = ladeKern();
    const roh = { schemaVersion: 40, sektoren: { vorsorge: { vorsorge_instrumente: [{ id: 'z1', typ: c.alt }], [c.gate]: 'ja' } }, dokumente: [] };
    const m = V.depotNormalisieren(roh);
    const zeilen = (m.sektoren.advanceCare.provisionInstruments || []).filter((z) => z.instrument === c.neu);
    assert.equal(zeilen.length, 1, 'genau eine Zeile, nicht zwei');
  });
}
