'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vor-Umzug-Golden-Master — Achse a1-situationen (U2-ADR-341/341b)
   ────────────────────────────────────────────────────────────────────────
   Eigene Datei statt eines weiteren Eintrags in tools/lib/vor-umzug-achsen.js
   selbst (Absprache mit cb, 07.09.2026) — minimale Berührung der gemeinsamen
   Registerdatei, auch wenn andere Achsen gleichzeitig ihre Zeile ergänzen.

   „immer" — SITUATIONEN trägt seit U2-ADR-341/341b KEIN natives Array mehr
   (`let SITUATIONEN = Object.freeze(_textsatzAufSituationenAnwenden([]))`),
   der volle Bestand kommt aus BUERGERMODUL_BUENDEL. Geprüft wird der Wortlaut,
   der UNABHÄNGIG von Depotdaten feststeht: Situations-Titel/-Einführung/
   -Hinweise, Block-Titel, und die inline eigenen Felder (nicht die Bereichs-
   Referenzen — die sind SEKTOREN-Eigentum, dort schon geprüft).

   „depot" — anders als bei den Dokumentmodulen (A3) gibt es hier keine
   strukturierte Generator-Ausgabe, nur den echten gerenderten Baum
   (`renderSituation`, DOM-Text). Verglichen wird darum das rohe `innerHTML`
   je Situation, nicht eine Liste von Einzeltexten — dieselbe „byte-genau"-
   Kultur wie die A==B-Proben in tests/e2e/nativ-sichten-a-b-abnahme.spec.js,
   nur hier als Golden-Master gegen einen echten Vor-Zustand statt gegen den
   eigenen letzten Commit.

   NICHT ABGEDECKT (gehört ins ADR, nicht nur hierher): die Fixtures liefern
   nur `sektoren`/`menschen` (dieselbe Signatur wie A3 — cb hat sie bestätigt),
   keine `situationen`-eigenen Depotdaten. Die eigenen Felder rendern darum
   mit LEEREN Werten — geprüft ist die SEKTOR-Referenz-Interpolation
   (Namen/Daten aus den Sektoren), nicht das Zusammenspiel mit eigens
   eingetragenen Situations-Antworten.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('path');

function textwerteAusFeld(feld) {
  const werte = [];
  if (!feld || typeof feld !== 'object') return werte;
  if (feld.label) werte.push(feld.label);
  if (feld.hint) werte.push(feld.hint);
  if (feld.beispiel) werte.push(feld.beispiel);
  if (Array.isArray(feld.optionen)) {
    for (const o of feld.optionen) if (o && o.label) werte.push(o.label);
  }
  for (const uf of (Array.isArray(feld.unterFelder) ? feld.unterFelder : [])) {
    werte.push(...textwerteAusFeld(uf));
  }
  return werte;
}

/* „immer" — der volle SITUATIONEN-Wortlaut, unabhängig vom Depot. */
function immerWerteA1(V) {
  const werte = [];
  for (const sit of V.SITUATIONEN) {
    if (sit.titel) werte.push(sit.titel);
    if (sit.einfuehrung) werte.push(sit.einfuehrung);
    if (Array.isArray(sit.hinweise)) for (const h of sit.hinweise) if (h) werte.push(h);
    for (const blk of (Array.isArray(sit.bloecke) ? sit.bloecke : [])) {
      if (blk.titel) werte.push(blk.titel);
      for (const e of (Array.isArray(blk.eintraege) ? blk.eintraege : [])) {
        // Nur die EIGENEN Felder ({feld: object}) — {quelle, feld: string} zeigt
        // auf ein Bereichsfeld, dessen Text SEKTOREN gehört (dort schon geprüft,
        // s. Kopf-Kommentar).
        if (e && e.feld && typeof e.feld === 'object') werte.push(...textwerteAusFeld(e.feld));
      }
    }
  }
  return werte;
}

/* „depot" — jede Situation über den ECHTEN Ladeweg gerendert (renderSituation),
   rohes innerHTML je Situations-Id.

   Braucht `document`, das die gemeinsame Signatur `depotErgebnis(V, sektoren,
   menschen, vmZeilenId)` nicht mitgibt (A3 kam ohne aus — reine Datenfunktion,
   kein DOM). Ein zweiter, eigener ladeKern()-Aufruf holt sich sein eigenes
   document/V-Paar aus DEMSELBEN `KERN_HTML_PATH` (tools/dokument-vor-umzug-
   fixture-ziehen.js hält die Umgebungsvariable während des ganzen Zugs
   gesetzt) — der übergebene `V` wird für diese Achse darum NICHT verwendet,
   bewusst, nicht übersehen. */
function depotErgebnisA1(V, depotSektoren, depotMenschen, _vmZeilenId, schemaVersion) {
  const { ladeKern } = require(path.join(__dirname, '..', '..', 'tests', 'load-kern.js'));
  const { V: frischeV, document: frischesDocument } = ladeKern();

  const { depotUeberLadeweg } = require('./vor-umzug-textwerte');
  frischeV.setData(depotUeberLadeweg(frischeV, depotSektoren, depotMenschen, schemaVersion));

  const ergebnis = {};
  for (const sit of frischeV.SITUATIONEN) {
    frischeV.renderSituation(sit.id);
    ergebnis[sit.id] = frischesDocument.getElementById('content').innerHTML;
  }
  return ergebnis;
}

/* Dieselben zwei Depot-Fixtures wie A3 (tests/fixtures/vor-umzug-depot-*.json)
   — kein dritter Satz, die Fixture trägt bereits echte Sektor-/Menschen-Daten,
   die A1 genauso braucht. */
const A1_DEPOT_FIXTUREN = [
  { name: 'marlene-hoffmann', datei: 'vor-umzug-depot-marlene-hoffmann.json', vmZeilenId: undefined,
    beschreibung: 'nur skalare Sektor-Felder — deckt Namens-/Datums-/Adress-Interpolation in ' +
      'Bereichs-Referenz-Einträgen ab, keine situationseigenen Depotdaten' },
  { name: 'instrumente-breit', datei: 'vor-umzug-depot-instrumente-breit-anton-reindl.json', vmZeilenId: 'zeile-vv',
    beschreibung: 'breiterer Sektor-Datensatz (mehr Bereiche gefüllt) — deckt mehr Bereichs-' +
      'Referenz-Zweige ab als die schmale Fixture' },
];

module.exports = {
  beschreibung: 'U2-ADR-341/341b — SITUATIONEN (10 Situationen, 156 Einträge) hinter ' +
    'BUERGERMODUL_BUENDEL materialisiert. „depot" vergleicht rohes renderSituation()-innerHTML ' +
    '(byte-genau je Situation), nicht strukturierte Einzeltexte wie bei A3 — Situationen haben ' +
    'keine Generator-Funktion, nur den echten Render-Baum.',
  immerWerte: immerWerteA1,
  depotFixturen: A1_DEPOT_FIXTUREN,
  depotErgebnis: depotErgebnisA1,
};
