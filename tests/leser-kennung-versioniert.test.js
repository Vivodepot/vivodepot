'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   F1 · B1 · B2 — die Leser-Kennungen tragen ihre Version, und es gibt zwei neue
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „Restliste bis v1", Posten 5. Grundlage ist der Bericht
   „Leser-Zuschnitt und Größe" vom 20.08.2026 und die Auflage aus U2-ADR-151:
   „Wird der dritte Leser gebaut, werden `json` und `vcard-erste` IM SELBEN ZUG
   mit umbenannt. Danach ist es teuer."

   Der dritte und der vierte Leser entstehen hier — also ist die Auflage jetzt
   fällig, und sie ist eingelöst.

   WARUM DAS ÜBERHAUPT ZÄHLT: die Leser-Kennung reist in Bürgerdateien
   (`formatModule` ist Depot- UND Vollexport-Schlüssel). Ohne Version könnte ein
   Modul nie sagen, WELCHE Lesart es meinte; ohne Rückweg wäre die Umbenennung
   ein Bruch an einer Datei, die allein beim Bürger liegt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

function modul(zusatz) {
  const V = zusatz && zusatz.V;
  return Object.assign({
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'kammer-x', richtung: 'import',
    sektor: 'housing', label: 'Kammer X', leser: 'json@1',
    zuordnung: [{ feld: 'ownedOrRented', ziel: 'typ' }],
  }, zusatz && zusatz.m, V ? {} : {});
}

/* ══ F1 · die Version und ihr Rückweg ════════════════════════════════════ */

test('[F1] die fünf Leser tragen eine Version — keine nackte Kennung mehr', () => {
  const V = frisch();
  const namen = Object.keys(V.FORMAT_LESER).sort();
  assert.deepEqual(namen, ['csv@1', 'json@1', 'sd-jwt@1', 'vcard-erste@1', 'xml@1']);
  for (const n of namen) assert.match(n, /@\d+$/, n + ' trägt keine Version');
});

test('[F1] die ALTE Kennung wird weiter aufgelöst — der Rückweg aus U2-ADR-151', () => {
  const V = frisch();
  assert.equal(V.leserAufloesen('json'), V.FORMAT_LESER['json@1']);
  assert.equal(V.leserAufloesen('vcard-erste'), V.FORMAT_LESER['vcard-erste@1']);
  assert.equal(V.leserKennungHeute('json'), 'json@1');
  assert.equal(V.leserKennungHeute('vcard-erste'), 'vcard-erste@1');
});

test('[F1·Rot] eine erfundene Kennung löst NICHT auf — die Tabelle bleibt abgeschlossen', () => {
  const V = frisch();
  for (const k of ['quatsch', 'json@9', 'eval', 'constructor', '', null, 42]) {
    assert.equal(V.leserAufloesen(k), null, JSON.stringify(k) + ' darf nichts auflösen');
  }
});

test('[F1] ein Bestandsmodul mit ALTER Kennung bleibt gültig — und wird versioniert gespeichert', () => {
  const V = frisch();
  const g = V.formatModulPruefen(modul({ m: { leser: 'json' } }));
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
  assert.equal(g.kanal.leser, 'json@1', 'gelesen wurde die alte Form, gespeichert wird die heutige');
});

test('[F1] die Migrationsstufe 69 → 70 zieht gespeicherte Module nach — und nur die auflösbaren', () => {
  const V = frisch();
  const d = Object.assign(V.leeresDepot(), { schemaVersion: 69 });
  d.formatModule = [
    { format: 'a', leser: 'json' },
    { format: 'b', leser: 'vcard-erste' },
    { format: 'c', leser: 'xml@1' },
    { format: 'd', leser: 'ein-fremder-leser' },
  ];
  V.depotNormalisieren(d);
  /* `>=` und nicht `===`: die Leiter wächst weiter (Schema 71 = Empfängerkreise, U2-ADR-156).
     Diese Probe gehört der Stufe 69 → 70, nicht dem jeweils letzten Stand — ein `===` hätte
     nur gesagt, dass seit dem Bau keine Stufe dazukam. Die Stufe selbst belegen die zwei
     Zusicherungen darunter. */
  assert.ok(d.schemaVersion >= 70, 'die Stufe ist gelaufen');
  assert.deepEqual(d.formatModule.map((m) => m.leser),
    ['json@1', 'vcard-erste@1', 'xml@1', 'ein-fremder-leser'],
    'eine unbekannte Kennung bleibt stehen — sie ist ein Befund für den Einlassweg, kein Anlass zum Überschreiben');
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 70, 'und sie liegt nicht über dem aktuellen Stand');
});

test('[F1·Gegenprobe] ein zweiter Lauf ändert nichts mehr (idempotent)', () => {
  const V = frisch();
  const d = Object.assign(V.leeresDepot(), { schemaVersion: 69 });
  d.formatModule = [{ format: 'a', leser: 'json' }];
  V.depotNormalisieren(d);
  const nachEins = JSON.stringify(d.formatModule);
  V.depotNormalisieren(d);
  assert.equal(JSON.stringify(d.formatModule), nachEins);
});

test('[F1] ein AUSGABE-Modul braucht keinen Leser mehr — die Anforderung hatte keinen Gegenstand', () => {
  /* Der Fund aus dem Bericht vom 20.08.: `formatModulPruefen` verlangte `leser` unbedingt,
     ohne Rücksicht auf `richtung` — ein reines Ausgabemodul musste einen Leser nennen, den es
     nie benutzt, und in keiner ADR und keinem Beschluss stand, warum. Die Prüfung wird hier
     WEITER, nicht enger: ein Bestandsmodul mit `leser` bleibt gültig. */
  const V = frisch();
  const ohne = modul({ m: { richtung: 'export', leser: undefined, zuordnung: [{ feld: 'ownedOrRented', ziel: 'typ' }] } });
  delete ohne.leser;
  assert.equal(V.formatModulPruefen(ohne).gueltig, true, 'Ausgabe ohne Leser ist gültig');
  const mit = modul({ m: { richtung: 'export' } });
  assert.equal(V.formatModulPruefen(mit).gueltig, true, 'Ausgabe MIT Leser bleibt gültig');
});

test('[F1·Rot] ein EINLESE-Modul ohne Leser bleibt ungültig — dort liest jemand', () => {
  const V = frisch();
  const ohne = modul({});
  delete ohne.leser;
  const g = V.formatModulPruefen(ohne);
  assert.equal(g.gueltig, false);
  assert.equal(g.grund, 'leser');
});

/* ══ B1 · der XML-Leser ══════════════════════════════════════════════════ */

const XML = '<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022"><Kopf ref="7">'
  + '<Nr>4711</Nr></Kopf><Pos><B>a</B></Pos><Pos><B>b</B></Pos><Misch>Text<K>x</K></Misch></Document>';

test('[B1] ein XML-Baum wird über denselben Pfad adressiert wie ein JSON-Dokument', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['xml@1'].lies(XML);
  assert.equal(V._formatPfadLesen(o, 'Kopf.Nr'), '4711', 'ein Blatt ist sein Text');
  assert.equal(V._formatPfadLesen(o, '#name'), 'Document', 'die Wurzel ist am Namen erkennbar');
  assert.equal(V._formatPfadLesen(o, 'Kopf.@ref'), '7', 'Attribute unter @');
  assert.equal(V._formatPfadLesen(o, 'Misch.#text'), 'Text', 'gemischter Text unter #text');
});

test('[B1] mehrere gleichnamige Elemente werden eine Liste — dieselbe Wiederholungsregel wie überall', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['xml@1'].lies(XML);
  const pos = V._formatPfadLesen(o, 'Pos');
  assert.ok(Array.isArray(pos), 'zwei <Pos> ergeben ein Array');
  assert.equal(pos.length, 2);
  assert.equal(pos[0].B, 'a');
  assert.equal(pos[1].B, 'b');
});

test('[B1] Namensraum-Präfixe fallen weg — die Zusage, die parseXML ohnehin einlöst', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['xml@1'].lies('<ns:Wurzel xmlns:ns="urn:x"><ns:Kind>7</ns:Kind></ns:Wurzel>');
  assert.equal(o['#name'], 'Wurzel');
  assert.equal(o.Kind, '7');
});

test('[B1·Rot] was kein XML ist, liefert null — kein halb gelesener Baum', () => {
  const V = frisch();
  for (const t of ['', '   ', '{"a":1}', 'Hallo Welt']) {
    assert.equal(V.FORMAT_LESER['xml@1'].lies(t), null, JSON.stringify(t) + ' ist kein XML');
  }
});

test('[B1] die zwei bestehenden XML-Wege sind unberührt — der Leser kam DANEBEN', () => {
  const V = frisch();
  assert.equal(typeof V.parseCamt053, 'function');
  assert.equal(typeof V.parseXMeld, 'function');
  const camt = V.parseCamt053('<Document><BkToCstmrStmt><Stmt><Acct><Id><IBAN>DE02120300000000202051</IBAN></Id></Acct></Stmt></BkToCstmrStmt></Document>');
  assert.ok(camt && typeof camt === 'object', 'der eingebaute CAMT-Weg liest weiter');
});

/* ══ B2 · der CSV-Leser ══════════════════════════════════════════════════ */

test('[B2] die erste Datenzeile liegt flach, alle Zeilen unter #zeilen', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['csv@1'].lies('Name;Ort\nAnna;Köln\nBert;Bonn\n');
  assert.equal(o.Name, 'Anna');
  assert.equal(o.Ort, 'Köln');
  assert.equal(o['#zeilen'].length, 2);
  assert.equal(o['#zeilen'][1].Ort, 'Bonn');
});

test('[B2] das Trennzeichen wird erkannt, nicht geraten', () => {
  const V = frisch();
  for (const [text, ort] of [['a,b\n1,Köln\n', 'Köln'], ['a;b\n1;Köln\n', 'Köln'],
                             ['a\tb\n1\tKöln\n', 'Köln'], ['a|b\n1|Köln\n', 'Köln']]) {
    const o = V.FORMAT_LESER['csv@1'].lies(text);
    assert.equal(o.b, ort, 'Trennzeichen in ' + JSON.stringify(text) + ' nicht erkannt');
  }
});

test('[B2] Anführungszeichen tragen: Trennzeichen, Zeilenumbruch und doppelte Anführungszeichen im Feld', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['csv@1'].lies('Name;Bemerkung\n"Meier; Anna";"Zeile 1\nZeile 2"\n');
  assert.equal(o.Name, 'Meier; Anna', 'ein Trennzeichen im Feld trennt nicht');
  assert.equal(o.Bemerkung, 'Zeile 1\nZeile 2', 'ein Zeilenumbruch im Feld beendet die Zeile nicht');
  const q = V.FORMAT_LESER['csv@1'].lies('a\n"er sagte ""ja"""\n');
  assert.equal(q.a, 'er sagte "ja"');
});

test('[B2] doppelte Spaltennamen überschreiben sich NICHT', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['csv@1'].lies('Nr;Nr\n1;2\n');
  assert.equal(o.Nr, '1');
  assert.equal(o['Nr#2'], '2', 'die zweite Spalte bekommt einen Zusatz — ein stiller Verlust wäre das Gegenteil');
});

test('[B2] eine BOM landet nicht im ersten Spaltennamen', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['csv@1'].lies('﻿Name;Ort\nAnna;Köln\n');
  assert.equal(o.Name, 'Anna', 'ohne BOM-Behandlung hiesse die Spalte "\\uFEFFName"');
});

test('[B2] ein Kodierungs-Verdacht wird GESAGT, nicht geraten und nicht verschwiegen', () => {
  const V = frisch();
  const o = V.FORMAT_LESER['csv@1'].lies('Name;Ort\nAnna;KÃ¶ln\n');
  assert.equal(o['#kodierungVerdacht'], true, 'die typische Mojibake-Folge wird benannt');
  const sauber = V.FORMAT_LESER['csv@1'].lies('Name;Ort\nAnna;Köln\n');
  assert.equal(sauber['#kodierungVerdacht'], undefined, 'und sonst steht dort nichts');
});

test('[B2·Rot] eine Kopfzeile allein ist keine Auskunft', () => {
  const V = frisch();
  for (const t of ['', '   ', 'Name;Ort\n', 'Name;Ort']) {
    assert.equal(V.FORMAT_LESER['csv@1'].lies(t), null, JSON.stringify(t) + ' darf nichts liefern');
  }
});

/* ══ Beide neuen Leser im echten Modul-Weg ═══════════════════════════════ */

test('[B1·B2] ein Modul kann beide Leser nennen — der Einlassweg nimmt sie an', () => {
  const V = frisch();
  for (const leser of ['xml@1', 'csv@1']) {
    const g = V.formatModulPruefen(modul({ m: { leser } }));
    assert.equal(g.gueltig, true, leser + ' abgelehnt: ' + g.grund);
    assert.equal(g.kanal.leser, leser);
  }
});

test('[B1] ein XML-Modul liest eine echte Datei über den gebauten Kanal', () => {
  const V = frisch();
  const kanal = V.formatModulZuImportKanal(modul({ m: {
    leser: 'xml@1', quelle: 'Kopf',
    erkennen: [{ pfad: '#name', gleich: 'Document' }],
    zuordnung: [{ feld: 'ownedOrRented', ziel: 'Nr' }],
  } }));
  assert.ok(kanal, 'der Kanal entsteht');
  assert.equal(kanal.erkennen(XML), true, 'am Wurzelelement erkannt');
  const plan = kanal.parse(XML);
  assert.ok(plan && Array.isArray(plan.felder), 'der Plan entsteht');
  const treffer = plan.felder.find((f) => f.feldId === 'ownedOrRented');
  assert.ok(treffer, 'das zugeordnete Feld steht im Plan: ' + JSON.stringify(plan));
  assert.equal(treffer.wert, '4711', 'der Wert kommt aus dem XML-Baum, über den Pfad');
  assert.equal(treffer.sektorId, 'housing');
});
