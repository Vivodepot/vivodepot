'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 3 · Migrationsstufe 63 → 64 — EINE Stufe für ZWEI Umbauten
   ────────────────────────────────────────────────────────────────────────
   Auftrag „Die Bereichsliste wird ein andockbares Register" (Zug 3) plus
   Nachtrag „M1-generisch wird mitgebaut" (17.08.2026).

   TEIL A — Bürgerdaten gehen nicht verloren, auch nicht, wenn ein
   Bereichsmodul wegfällt, widerrufen wird oder abläuft (U2-ADR-050,
   Rettungsfeld-Muster: UMZUG, keine Löschung). Geprüft in BEIDE Richtungen —
   hinaus und zurück —, denn erst die Rückkehr macht aus „Rettung" eine
   Zusicherung.

   TEIL B — Gültigkeit als Eigenschaft JEDES Feldwerts, auch eines
   angedockten. Die Zusicherung, die dabei gilt: **ein Feld ohne
   Gültigkeitsangabe verhält sich wie vor dem Umbau.** Wer nie eine
   Gültigkeit setzt, merkt von M1-generisch nichts.

   AUSDRÜCKLICH NICHT GEBAUT und darum hier auch nicht geprüft: die
   Überführung der 19 bestehenden Datumsfelder aus A138. Sie fasst
   Bürgerdaten an und ist eine eigene Produktentscheidung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const HEUTE = '2026-08-17';

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

/* ══ TEIL A · Bereichsdaten überleben ihren Bereich ═════════════════════ */

test('[Zug 3·A] die Stufe legt beide Slots an und hebt die Version', () => {
  const { V } = ladeKern();
  const alt = Object.assign(V.leeresDepot(), { schemaVersion: 63 });
  delete alt.bereicheVerwaist; delete alt.feldGueltigkeit;
  const neu = V.depotNormalisieren(alt);
  /* 64 → 65: der Lauf endet nicht mehr bei dieser Stufe. M1 Zug 5/Zug 2 (18.08.2026) hängt
     die Umzugs-Stufe direkt dahinter, und ein Depot durchläuft beide in einem Lauf. Geprüft
     wird darum die AKTUELLE Version, nicht die Nummer dieser einen Stufe — sonst wäre die
     Probe bei jeder Folgestufe wieder rot, ohne dass an dieser hier etwas falsch wäre. */
  assert.equal(neu.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'die Stufe hebt die Version');
  assert.deepEqual(neu.bereicheVerwaist, {}, 'Rettungsslot angelegt und LEER — additiv heisst additiv');
  assert.deepEqual(neu.feldGueltigkeit, {}, 'Gültigkeits-Slot angelegt und LEER');
});

test('[Zug 3·A·Rot] ein unbekannter Bereich verliert seine Daten NICHT — sie wandern', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren['ein-fremder-bereich'] = { irgendein_feld: 'ein Wert der Bürgerin', zweites: '2026-01-01' };
  V._bereicheVerwaisteRetten(d);
  assert.ok(!d.sektoren['ein-fremder-bereich'], 'der unbekannte Bereich steht nicht mehr in data.sektoren');
  assert.deepEqual(d.bereicheVerwaist['ein-fremder-bereich'],
    { irgendein_feld: 'ein Wert der Bürgerin', zweites: '2026-01-01' },
    'VOLLSTÄNDIG gerettet, kein Feld verloren');
});

test('[Zug 3·A] und sie kommen zurück, sobald der Bereich wieder bekannt ist', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  // Ein BEKANNTER Bereich liegt im Rettungsslot — der Fall „Modul kehrt zurück".
  d.bereicheVerwaist['wohnen'] = { ein_geretteter_wert: 'kam zurück' };
  V._bereicheVerwaisteRetten(d);
  assert.equal(d.sektoren.wohnen.ein_geretteter_wert, 'kam zurück', 'zurück in den Bereich');
  assert.ok(!d.bereicheVerwaist['wohnen'], 'der Rettungsslot ist danach leer geräumt');
});

test('[Zug 3·A] beim Zurückwandern GEWINNT der vorhandene Wert — die Bürgerin war schneller', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren.wohnen = { feld_a: 'in der Zwischenzeit selbst eingetragen' };
  d.bereicheVerwaist['wohnen'] = { feld_a: 'alter Wert aus dem Modul', feld_b: 'unbelegt, wandert' };
  V._bereicheVerwaisteRetten(d);
  assert.equal(d.sektoren.wohnen.feld_a, 'in der Zwischenzeit selbst eingetragen',
    'ein zurückkehrendes Modul überschreibt nichts');
  assert.equal(d.sektoren.wohnen.feld_b, 'unbelegt, wandert', 'unbelegte Schlüssel werden gefüllt');
  assert.deepEqual(d.bereicheVerwaist['wohnen'], { feld_a: 'alter Wert aus dem Modul' },
    'der verdrängte Wert wird NICHT verworfen, er bleibt liegen — auch das ist Umzug');
});

test('[Zug 3·A·Gegenprobe] ein LEERER unbekannter Bereich erzeugt keinen Rettungseintrag', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren['leerer-fremder'] = { a: '', b: null, c: [] };
  V._bereicheVerwaisteRetten(d);
  assert.deepEqual(d.bereicheVerwaist, {},
    'ein Rettungsslot voller leerer Hüllen sähe nach geretteten Daten aus und wäre keiner');
  assert.ok(!d.sektoren['leerer-fremder'], 'die leere Hülle ist trotzdem weg');
});

test('[Zug 3·A] bekannte Bereiche werden NICHT angefasst', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren.gesundheit = { blutgruppe: '0 negativ' };
  V._bereicheVerwaisteRetten(d);
  assert.equal(d.sektoren.gesundheit.blutgruppe, '0 negativ');
  assert.deepEqual(d.bereicheVerwaist, {});
});

test('[Zug 3·A] zweimal laufen ändert nichts mehr (idempotent)', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren['fremd'] = { x: 'wert' };
  V._bereicheVerwaisteRetten(d);
  const nachEinem = JSON.stringify(d);
  V._bereicheVerwaisteRetten(d);
  assert.equal(JSON.stringify(d), nachEinem, 'ein zweiter Lauf ist wirkungslos');
});

/* ══ TEIL B · M1 generisch ══════════════════════════════════════════════ */

test('[Zug 3·B] ein Feld OHNE Gültigkeitsangabe verhält sich wie vor dem Umbau', () => {
  const V = frisch();
  assert.equal(V.feldGueltigkeitLesen('gesundheit', 'blutgruppe'), null, 'nichts gesetzt → nichts gelesen');
  assert.equal(V.feldGiltAm('gesundheit', 'blutgruppe', HEUTE), true,
    '„unbekannt" heisst „wie bisher", nicht „ungültig" — das ist die Zusicherung aus Zug 3');
});

test('[Zug 3·B] ein ANGEDOCKTES Feld trägt Gültigkeit — genau dafür ist der Umbau da', () => {
  const V = frisch();
  const d = V.getData();
  // Ein Feld, wie es eine eingewanderte Vorlage einbringt — kein eingebautes.
  d.feldDefinitionen = [{ sektorId: 'wohnen', feldId: 'tpl_bescheinigung', typ: 'datum', label: 'Bescheinigung' }];
  d.sektoren.wohnen = { tpl_bescheinigung: '2026-09-30' };
  V.setData(d);
  V.feldGueltigkeitSetzen('wohnen', 'tpl_bescheinigung', '2026-01-01', '2026-09-30');
  assert.deepEqual(V.feldGueltigkeitLesen('wohnen', 'tpl_bescheinigung'), { von: '2026-01-01', bis: '2026-09-30' });
  assert.equal(V.feldGiltAm('wohnen', 'tpl_bescheinigung', '2026-06-01'), true, 'innerhalb');
  assert.equal(V.feldGiltAm('wohnen', 'tpl_bescheinigung', '2025-12-31'), false, 'davor');
  assert.equal(V.feldGiltAm('wohnen', 'tpl_bescheinigung', '2026-10-01'), false, 'danach');
});

test('[Zug 3·B] es gibt KEINE Liste erlaubter Felder — der Schlüssel ist der Feldschlüssel selbst', () => {
  const V = frisch();
  // Ein frei erfundener Feldname, den niemand je registriert hat.
  V.feldGueltigkeitSetzen('bildung', 'ein_nie_dagewesenes_feld', '2020-01-01', null);
  assert.deepEqual(V.feldGueltigkeitLesen('bildung', 'ein_nie_dagewesenes_feld'), { von: '2020-01-01', bis: null },
    'kein Register dazwischen — genau die Nachpflege-Stelle, die sieben Tage lang hinterherlief');
});

test('[Zug 3·B·Rot] ein unbrauchbares Datum wird verworfen, nicht gespeichert', () => {
  const V = frisch();
  assert.equal(V.feldGueltigkeitSetzen('wohnen', 'feld', 'irgendwann', 'demnächst'), null);
  assert.equal(V.feldGueltigkeitLesen('wohnen', 'feld'), null, 'nichts Halbes im Depot');
  assert.deepEqual(V.getData().feldGueltigkeit, {}, 'auch kein leerer Bereichs-Eintrag als Rest');
});

test('[Zug 3·B] Zurücknehmen räumt auf — kein leerer Eintrag bleibt liegen', () => {
  const V = frisch();
  V.feldGueltigkeitSetzen('wohnen', 'feld', '2026-01-01', null);
  assert.ok(V.getData().feldGueltigkeit.wohnen, 'Vorbedingung: der Eintrag existiert');
  V.feldGueltigkeitSetzen('wohnen', 'feld', null, null);
  assert.deepEqual(V.getData().feldGueltigkeit, {},
    'ein {} an dieser Stelle sähe im Export wie eine gesetzte, aber leere Gültigkeit aus');
});

/* ÜBERHOLT AM 18.08.2026, und darum umgeschrieben statt gelöscht: Diese Probe hielt fest,
   dass 63→64 eine MARKE ist und keine Überführung — richtig für diese Stufe, und sie ist es
   geblieben. Die Überführung war ausdrücklich als eigene Produktentscheidung
   ausgewiesen (U2-ADR-144 §4); sie ist am 18.08.2026 gefallen und liegt als eigene Stufe
   64→65 dahinter (M1 Zug 5/Zug 2). Was hier bleibt, ist die Aussage über DIESE Stufe: sie
   allein schreibt keinen Wert um. Geprüft wird sie deshalb an einem Feld OHNE die Marke —
   an einem markierten würde die Folgestufe im selben Lauf sofort zugreifen, und die Probe
   spräche über zwei Stufen statt über eine. */
test('[Zug 3·B] die Stufe 63→64 selbst überführt KEINEN Bestandswert', () => {
  const { V } = ladeKern();
  const alt = Object.assign(V.leeresDepot(), { schemaVersion: 63 });
  alt.sektoren.identitaet = { geburtsdatum: '1990-05-04' };
  delete alt.feldGueltigkeit;
  const neu = V.depotNormalisieren(alt);
  assert.equal(neu.sektoren.identity.birthDate, '1990-05-04', 'der Wert steht unverändert da');
  assert.deepEqual(neu.feldGueltigkeit, {},
    'die Stufe ist eine MARKE, keine Umschreibung — sie fasst kein unmarkiertes Feld an');
});

/* ══ ZUG 4 · Der Fremdschlüssel — Definition und Wert reisen gemeinsam ══ */

test('[Zug 4·Rot] eine Definition mit unbekanntem Bereich verschwindet nicht still — sie wandert', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [
    { sektorId: 'ein-verschwundener-bereich', feldId: 'tpl_x', typ: 'text', label: 'Zählpunkt' },
    { sektorId: 'wohnen', feldId: 'tpl_y', typ: 'text', label: 'Bleibt' },
  ];
  d.sektoren['ein-verschwundener-bereich'] = { tpl_x: 'ein Wert der Bürgerin' };
  V._bereicheVerwaisteRetten(d);
  assert.deepEqual(d.feldDefinitionen.map(x => x.sektorId), ['wohnen'], 'nur die gültige bleibt');
  assert.equal(d.feldDefinitionenVerwaist.length, 1, 'die andere ist gerettet, nicht gelöscht');
  assert.equal(d.feldDefinitionenVerwaist[0].label, 'Zählpunkt',
    'mit ihrer Beschriftung — der Wert allein wäre gerettet und trotzdem unlesbar');
  assert.equal(d.bereicheVerwaist['ein-verschwundener-bereich'].tpl_x, 'ein Wert der Bürgerin',
    'Definition und Wert liegen beide im Rettungsslot');
});

test('[Zug 4] beide kommen gemeinsam zurück, wenn der Bereich wieder bekannt ist', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionenVerwaist = [{ sektorId: 'wohnen', feldId: 'tpl_x', typ: 'text', label: 'Zählpunkt' }];
  d.bereicheVerwaist['wohnen'] = { tpl_x: 'ein Wert der Bürgerin' };
  V._bereicheVerwaisteRetten(d);
  assert.equal(d.feldDefinitionen.length, 1, 'die Definition ist zurück');
  assert.equal(d.sektoren.wohnen.tpl_x, 'ein Wert der Bürgerin', 'und ihr Wert auch');
  assert.deepEqual(d.feldDefinitionenVerwaist, [], 'der Slot ist geräumt');
});

test('[Zug 4·Gegenprobe] eine inzwischen gleichnamige Definition wird NICHT verdoppelt', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: 'wohnen', feldId: 'tpl_x', typ: 'zahl', label: 'Die neue' }];
  d.feldDefinitionenVerwaist = [{ sektorId: 'wohnen', feldId: 'tpl_x', typ: 'text', label: 'Die alte' }];
  V._bereicheVerwaisteRetten(d);
  assert.equal(d.feldDefinitionen.length, 1, 'zwei Definitionen auf EINEM Wert-Slot wären der Fehler');
  assert.equal(d.feldDefinitionen[0].label, 'Die neue', 'die vorhandene gewinnt');
  assert.equal(d.feldDefinitionenVerwaist.length, 1, 'die alte bleibt gerettet liegen, statt verworfen zu werden');
});

/* ══ Die gemeinsame Prüfung, die der Nachtrag verlangt ══════════════════ */

test('[Zug 3] EINE Stufe trägt beide Umbauten — an einem Depot, in einem Lauf', () => {
  const { V } = ladeKern();
  const alt = Object.assign(V.leeresDepot(), { schemaVersion: 63 });
  delete alt.bereicheVerwaist; delete alt.feldGueltigkeit;
  alt.sektoren['ein-abgelaufenes-modul'] = { wichtiger_wert: 'darf nicht verschwinden' };
  const neu = V.depotNormalisieren(alt);
  // 64 → aktuell: dass 63→64 EINE Stufe für beide Umbauten ist, zeigen die zwei Zusicherungen
  // darunter — nicht die Endnummer der Kette (M1 Zug 5/Zug 2 hängt seit dem 18.08.2026 dahinter).
  assert.equal(neu.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'eine Stufe, nicht zwei');
  assert.equal(neu.bereicheVerwaist['ein-abgelaufenes-modul'].wichtiger_wert, 'darf nicht verschwinden');
  assert.deepEqual(neu.feldGueltigkeit, {});
  assert.equal(V.feldGiltAm('gesundheit', 'blutgruppe', HEUTE, neu), true, 'und alles Übrige wie bisher');
});
