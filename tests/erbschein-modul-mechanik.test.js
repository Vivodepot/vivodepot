'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 1, Teil 1 — zwei additive Erweiterungen der geteilten Modul-Ausgabe-
   schicht (dokumentHTML/MODUL_BLOCK_HANDLER), Vorbedingung für den
   Erbschein-Vorbereitungsauszug (Auftrag 27.08.2026):

   1. Ein neuer Blocktyp `frageAntwortOderLuecke` — anders als jeder
      bestehende Blocktyp gibt er bei fehlendem Wert NICHT `[]` zurück,
      sondern eine sichtbare Lücken-Zeile. Alle sechs bestehenden Module
      (PV/VM/BV/Testament/SRV/KI) verlangen amtlichen Wortlaut, bei dem eine
      unbeantwortete Frage schweigt — ein Wegweiser-Auszug muss das
      Gegenteil zeigen (Auftrag: „offene Lücken sichtbar als Lücke, nicht
      stillschweigend ausgelassen").

   2. `dokAusgabe.unterschrift: false` ersetzt den sonst immer gerenderten
      Unterschriften-Block durch `dokAusgabe.unterschriftErsatzHinweis` —
      der Erbschein-Auszug ist nicht zu unterschreiben (§ 2356 BGB verlangt
      die eidesstattliche Versicherung persönlich vor Gericht/Notar).
      Ohne das Flag (alle sechs Bestandsmodule) bleibt das Verhalten exakt
      wie vorher — s. K8-Byte-Gleichheit, die dieser Test nicht anfassen darf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

// Siebtes-Register-Auftrag, Zug 1 (27.08.2026): Erbschein ist seither ein echtes Fremdmodul,
// keine feste VORSORGE_MODULE-Verdrahtung mehr — jeder Test unten, der dokumentHTML/
// renderSektor/flowErbscheinXmlSichern gegen das Modul braucht, muss das Bundle erst einlassen.
// Dieselbe Bundle-Datei wie tests/siebtes-register-erbschein-byte-gleichheit.test.js — EINE
// Quelle, kein zweites, leicht abweichendes Test-Bundle.
const ERBSCHEIN_BUNDLE_TEXT = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8');
function erbscheinEinlassen(V) {
  // U2-ADR-288 (05.09.2026): depotAnlegen() seedet das Bundle seither selbst ab Werk — geleert,
  // damit dieser manuelle Einlass ein echter Erst-Einlass bleibt (sonst "aeltere-fassung").
  V.getData().logikModule = [];
  const ergebnis = V.modulEinlassen(ERBSCHEIN_BUNDLE_TEXT, V.getData(), null, null);
  assert.equal(ergebnis.angenommen, true, 'Vorbedingung: das Bundle muss angenommen werden');
}

test('[Erbschein-Mechanik] frageAntwortOderLuecke: vorhandener Wert wird formatiert angezeigt', async () => {
  const { V } = await ladeKern();
  const blk = { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' };
  const ctx = { d: { x: 'ja' } };
  const zeilen = V.MODUL_BLOCK_HANDLER.frageAntwortOderLuecke(blk, ctx);
  assert.deepEqual(zeilen, ['Frage? ja']);
});

test('[Erbschein-Mechanik] frageAntwortOderLuecke: fehlender Wert bleibt SICHTBAR (keine leere Zeile, kein Verschwinden)', async () => {
  const { V } = await ladeKern();
  const blk = { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' };
  const ctx = { d: {} };
  const zeilen = V.MODUL_BLOCK_HANDLER.frageAntwortOderLuecke(blk, ctx);
  assert.deepEqual(zeilen, ['Frage? — nicht erfasst —']);
});

test('[Erbschein-Mechanik] frageAntwortOderLuecke: formatWert wandelt den Rohwert (z. B. Auswahl-Code → Label)', async () => {
  const { V } = await ladeKern();
  const blk = { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —',
    formatWert: (w) => (w === 'j' ? 'Ja' : w) };
  const zeilen = V.MODUL_BLOCK_HANDLER.frageAntwortOderLuecke(blk, { d: { x: 'j' } });
  assert.deepEqual(zeilen, ['Frage? Ja']);
});

test('[Erbschein-Mechanik] frageAntwortOderLuecke: leerer String zählt als Lücke, nicht als Antwort', async () => {
  const { V } = await ladeKern();
  const blk = { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' };
  const zeilen = V.MODUL_BLOCK_HANDLER.frageAntwortOderLuecke(blk, { d: { x: '' } });
  assert.deepEqual(zeilen, ['Frage? — nicht erfasst —']);
});

test('[Erbschein-Mechanik] frageAntwortOderLuecke: leeres Array (z. B. keine Kinder eingetragen) zählt als Lücke', async () => {
  const { V } = await ladeKern();
  const blk = { typ: 'frageAntwortOderLuecke', feldId: 'namen', frage: 'Kinder?', luecke: '— nicht erfasst —',
    formatWert: (arr) => arr.join(', ') };
  const zeilen = V.MODUL_BLOCK_HANDLER.frageAntwortOderLuecke(blk, { d: { namen: [] } });
  assert.deepEqual(zeilen, ['Kinder? — nicht erfasst —']);
});

test('[Erbschein-Mechanik] frageAntwortOderLuecke: befülltes Array wird über formatWert zusammengefasst', async () => {
  const { V } = await ladeKern();
  const blk = { typ: 'frageAntwortOderLuecke', feldId: 'namen', frage: 'Kinder?', luecke: '— nicht erfasst —',
    formatWert: (arr) => arr.join(', ') };
  const zeilen = V.MODUL_BLOCK_HANDLER.frageAntwortOderLuecke(blk, { d: { namen: ['Anna', 'Ben'] } });
  assert.deepEqual(zeilen, ['Kinder? Anna, Ben']);
});

test('[Erbschein-Mechanik] dokSignaturHTML: unterschrift:false liefert den Ersatzhinweis statt des Signatur-Blocks', async () => {
  const { V } = await ladeKern();
  const da = { unterschrift: false, unterschriftErsatzHinweis: 'Diese Angaben ersetzen keine eidesstattliche Versicherung.' };
  const html = V.dokSignaturHTML(da);
  assert.ok(!html.includes('Ort, Datum, Unterschrift'), 'kein Unterschriften-Block, wenn unterschrift:false');
  assert.ok(html.includes('Diese Angaben ersetzen keine eidesstattliche Versicherung.'),
    'der Ersatzhinweis muss stattdessen erscheinen');
});

test('[Erbschein-Mechanik] dokSignaturHTML: OHNE das Flag bleibt der Unterschriften-Block wie bisher (Bestandsschutz)', async () => {
  const { V } = await ladeKern();
  const da = { unterschriftZeilen: ['Unterschrift'] };
  const html = V.dokSignaturHTML(da);
  assert.ok(html.includes('Ort, Datum, Unterschrift'), 'Bestandsverhalten ohne das Flag bleibt unverändert');
  assert.ok(html.includes('Unterschrift:'), 'die Unterschriftszeilen selbst bleiben erhalten');
});

/* ── Zug 1, Teil 2 — die Datenaggregation des Erbschein-Moduls ────────────────────────────── */

async function leeresDepot(V) {
  await V.depotAnlegen('Erbschein-Daten-2026!');
  return V.getData();
}

test('[Erbschein-Daten] leeres Depot: jedes Feld bleibt ungesetzt (keine Erfindung)', async () => {
  const { V } = await ladeKern();
  await leeresDepot(V);
  const d = V._erbscheinSektorDaten();
  assert.equal(d.staatsangehoerigkeit, undefined);
  assert.equal(d.lebensmittelpunkt, undefined);
  assert.equal(d.testament_form, undefined);
  assert.equal(d.familienstand, undefined);
  assert.deepEqual(d.kinder_namen, []);
  assert.deepEqual(d.testament_bedachte_namen, []);
  assert.deepEqual(d.erben_namen, []);
});

test('[Erbschein-Daten] volles Depot: jedes Feld liest den echten Depot-Wert', async () => {
  const { V } = await ladeKern();
  const d0 = await leeresDepot(V);
  const kindId = V.personHinzufuegen({ name: 'Tochter Beispiel' });
  const erbeId = V.personHinzufuegen({ name: 'Neffe Beispiel' });
  const bedachtId = V.personHinzufuegen({ name: 'Freundin Beispiel' });
  d0.sektoren.identity = Object.assign({}, d0.sektoren.identity, {
    nationality: 'deutsch', streetAddress: 'Musterweg 1', postcodeCity: '80331 München',
    maritalStatus: 'verh',
  });
  // U2-ADR-248: `childrenAndDependants` lebt im Sektor 'people', nicht 'identity'.
  d0.sektoren['people'] = Object.assign({}, d0.sektoren['people'], {
    childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, type: 'leiblich' }],
  });
  d0.sektoren.advanceCare = Object.assign({}, d0.sektoren.advanceCare, {
    provisionInstruments: [
      { id: 't1', instrument: 'will', form: 'beurkundet', personsNamedInTheWill: [{ ref: bedachtId }] },
    ],
    heirsBriefOverview: [{ ref: erbeId }],
  });
  V.setData(d0);
  const d = V._erbscheinSektorDaten();
  assert.equal(d.staatsangehoerigkeit, 'deutsch');
  assert.equal(d.lebensmittelpunkt, 'Musterweg 1, 80331 München');
  assert.equal(d.testament_form, 'beurkundet');
  assert.equal(d.familienstand, 'verh');
  assert.deepEqual(d.kinder_namen, ['Tochter Beispiel']);
  assert.deepEqual(d.testament_bedachte_namen, ['Freundin Beispiel']);
  assert.deepEqual(d.erben_namen, ['Neffe Beispiel']);
});

/* ── Zug 1, Teil 3 — die Regal-Karte darf nicht lügen ──────────────────────────────────────
   Ein Auszug-Modul ohne `listeId`/`instrumentTyp` (kein Instrument, das man "hat" oder "nicht
   hat") fiele sonst durch modulKarteStatus()s bestehende Zweige auf `hatRecord = false` →
   "keine" — das behauptet fälschlich, im Depot fehle etwas, obwohl der Auszug immer erzeugbar
   ist. `immerVerfuegbar:true` ist der Fluchtweg aus dieser Falschaussage. */
test('[Erbschein-Regal] modulKarteStatus: ein immerVerfuegbar-Modul zeigt NICHT "keine"', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Erbschein-Regal-2026!');
  const status = V.modulKarteStatus({ id: '_test', sektor: 'vorsorge', immerVerfuegbar: true });
  assert.notEqual(status, 'keine');
});

test('[Erbschein-Regal] modulKarteStatus: Bestandsmodule (kein immerVerfuegbar) bleiben unverändert bei "keine"', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('Erbschein-Regal-2026!');
  const status = V.modulKarteStatus(V.VORSORGE_MODUL_BY_ID['sorgerechtsverfuegung']);
  assert.equal(status, 'keine');
});

test('[Erbschein-Daten] Testament ohne form-Angabe: testament_form bleibt Lücke, kein Absturz', async () => {
  const { V } = await ladeKern();
  const d0 = await leeresDepot(V);
  d0.sektoren.advanceCare = Object.assign({}, d0.sektoren.advanceCare, {
    provisionInstruments: [{ id: 't1', instrument: 'will' }],
  });
  V.setData(d0);
  const d = V._erbscheinSektorDaten();
  assert.equal(d.testament_form, undefined);
});

/* ── Zug 1b (Auftrag-Nachtrag 27.08.2026) — maschinenlesbare Zusatzausgabe ────────────────
   Lokale, schema-inspirierte XML-Struktur, KEINE feste Kopplung an das externe XJustiz-Schema
   (Freigabe nach dem geklärten Auftragswiderspruch, s. Zug-0-Erhebung Abschnitt 4).
   U2-ADR-248-Korrektur (04.09.2026): _erbscheinSektorDaten() ist ein ZWEITER, separat verdrahteter
   Lesepfad neben datenSchemaLesen (PDF/HTML) — kein gemeinsamer Code. Beide waren bis 04.09.2026
   am selben Sektor-Fehler ('identitaet' statt 'meine-menschen' für `kinder`) gleichermaßen falsch,
   was wie „ein Lesepfad" aussah. tests/vorlagen-sprache-interpreter.test.js#[Daten] hält beide seither
   explizit gleich, mit echten Werten geprüft, nicht nur gegeneinander. */

test('[Erbschein-XML] leeres Depot: jedes Feld erfasst="nein", jede Liste ein leeres Element', async () => {
  const { V } = await ladeKern();
  await leeresDepot(V);
  const xml = V.erbscheinAuszugXML();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<erbscheinVorbereitung xmlns="urn:vivodepot:erbschein-vorbereitung:v1">/);
  assert.match(xml, /<staatsangehoerigkeit erfasst="nein"><\/staatsangehoerigkeit>/);
  assert.match(xml, /<lebensmittelpunkt erfasst="nein"><\/lebensmittelpunkt>/);
  assert.match(xml, /<testamentForm erfasst="nein"><\/testamentForm>/);
  assert.match(xml, /<grundeigentum erfasst="nein"><\/grundeigentum>/);
  assert.match(xml, /<unternehmen erfasst="nein"><\/unternehmen>/);
  assert.match(xml, /<bankVerlangt erfasst="nein"><\/bankVerlangt>/);
  assert.match(xml, /<familienstand erfasst="nein"><\/familienstand>/);
  assert.match(xml, /<kinder\/>/);
  assert.match(xml, /<testamentBedachte\/>/);
  assert.match(xml, /<erben\/>/);
  assert.match(xml, /keine amtliche XJustiz-Konformität/, 'die Grenze steht auch in der Datei selbst, nicht nur im Code-Kommentar');
});

test('[Erbschein-XML] volles Depot: Rohwerte (Codes), nicht die deutschen PDF-Labels', async () => {
  const { V } = await ladeKern();
  const d0 = await leeresDepot(V);
  const kindId = V.personHinzufuegen({ name: 'Tochter Beispiel' });
  d0.sektoren.identity = Object.assign({}, d0.sektoren.identity, {
    nationality: 'deutsch', maritalStatus: 'verh',
  });
  d0.sektoren['people'] = Object.assign({}, d0.sektoren['people'], {
    childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, type: 'leiblich' }],
  });
  d0.sektoren.advanceCare = Object.assign({}, d0.sektoren.advanceCare, {
    provisionInstruments: [{ id: 't1', instrument: 'will', form: 'beurkundet' }],
  });
  V.setData(d0);
  const xml = V.erbscheinAuszugXML();
  assert.match(xml, /<staatsangehoerigkeit erfasst="ja">deutsch<\/staatsangehoerigkeit>/);
  // Roh-Code 'beurkundet', NICHT das PDF-Label "notariell beurkundet" — die XML-Ausgabe ist für
  // maschinelle Weiterverarbeitung gedacht, nicht zum Lesen.
  assert.match(xml, /<testamentForm erfasst="ja">beurkundet<\/testamentForm>/);
  assert.match(xml, /<familienstand erfasst="ja">verh<\/familienstand>/);
  assert.match(xml, /<kinder><person>Tochter Beispiel<\/person><\/kinder>/);
});

test('[Erbschein-XML] Namen mit XML-Sonderzeichen werden escaped, keine kaputte Struktur', async () => {
  const { V } = await ladeKern();
  const d0 = await leeresDepot(V);
  const kindId = V.personHinzufuegen({ name: 'Anna & Bert <Test>' });
  d0.sektoren['people'] = Object.assign({}, d0.sektoren['people'], {
    childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, type: 'leiblich' }],
  });
  V.setData(d0);
  const xml = V.erbscheinAuszugXML();
  assert.match(xml, /<person>Anna &amp; Bert &lt;Test&gt;<\/person>/);
  assert.ok(!xml.includes('<Test>'), 'ein roher spitzer Klammer-Wert darf die XML-Struktur nicht durchbrechen');
});

test('[Erbschein-XML] flowErbscheinXmlSichern läuft ohne Absturz durch (kein jsPDF nötig, reiner Text)', async () => {
  const { V } = await ladeKern();
  await leeresDepot(V);
  erbscheinEinlassen(V);
  const weg = await V.flowErbscheinXmlSichern();
  assert.equal(typeof weg, 'string', 'liefert einen der bekannten dateiAusgeben-Ergebniswerte');
});

/* ── die Sektion selbst — Sprungziel + Knopf (regal-sprungziele.test.js prüft nur, dass der
   Anker existiert; hier: dass die Sektion wirklich den Knopf trägt, der ihn öffnet) ──────── */

test('[Erbschein-Sektion] renderSektor(vorsorge) trägt den Anker UND den Öffnen-Knopf — NACH Einlass', async () => {
  const { V, document } = ladeKern();
  await leeresDepot(V);
  erbscheinEinlassen(V);
  V.renderSektor('advanceCare');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /id="sek-erbschein-vorbereitung"/, 'der Sprung-Anker der Regal-Karte fehlt');
  assert.match(html, /data-erbschein-dokument/, 'der Öffnen-Knopf fehlt — die K8-Schleife hätte nichts zu verdrahten');
  assert.match(html, /data-erbschein-xml/, 'der XML-Sichern-Knopf (Zug 1b) fehlt');
});

test('[Erbschein-Sektion·Gegenprobe] OHNE Einlass zeigt die Sektion nur den Anker, keinen Knopf', async () => {
  // Schema 87 (21.09.2026): der Erbschein-Auszug ist Saat des PRODUKTS (Template im Rezept), nicht des Kerns. Der Standard-Testkern ist ein
  // gebackenes privat-de und kennt ihn ab Werk; „ohne Einlass" heißt darum: weder im Depot noch in der Ab-Werk-Saat. Die Aussage dieses
  // Tests bleibt unverändert: der Knopf hängt am Registry-Eintrag, nicht an fester Verdrahtung.
  const { V, document } = ladeKern();
  await leeresDepot(V);
  V._abWerkLogikModule = [];
  V.getData().logikModule = [];
  V.renderSektor('advanceCare');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /id="sek-erbschein-vorbereitung"/, 'der Anker bleibt (Sprungziel-Wächter braucht ihn immer)');
  assert.doesNotMatch(html, /data-erbschein-dokument/, 'ohne Einlass darf kein Öffnen-Knopf erscheinen — sonst wäre Erbschein weiterhin fest verdrahtet');
});

/* ── Zug 2 (Auftrag 27.08.2026) — Rot-Beleg, jetzt gegen das echte Bundle ───────────────
   Die frühere Positiv-/Negativ-Probe hier ist ENTFALLEN, nicht daneben weitergeführt: sie prüfte
   dokumentHTML('erbschein-vorbereitung') gegen die damals fest verdrahtete ERBSCHEIN_MODUL.
   Dieselbe Prüfung — strenger, denn byte-genau statt Teilstring — läuft jetzt in
   tests/siebtes-register-erbschein-byte-gleichheit.test.js, gegen das ECHTE, eingelassene
   .json-Bundle (Siebtes-Register-Auftrag, Zug 2: "ein Testdepot dockt das Erbschein-Modul über
   den regulären Fremdmodul-Einlass an, nicht über eine feste Kern-Verdrahtung"). */
