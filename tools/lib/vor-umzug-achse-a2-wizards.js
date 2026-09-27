'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vor-Umzug-Golden-Master — Achse a2-wizards (U2-ADR-346)
   ────────────────────────────────────────────────────────────────────────
   Eigene Datei statt eines weiteren Eintrags in tools/lib/vor-umzug-achsen.js
   selbst (Absprache mit cb, 07.09.2026) — minimale Berührung der gemeinsamen
   Registerdatei.

   „immer" — die FÜNF migrierten Wizards (gebwiz/anamwiz/pflwiz/heirwiz/
   umzwiz, U2-ADR-346 §1) tragen ihren vollen Wortlaut unabhängig vom Depot:
   Assistenten-Kopf (titel/einleitung/abschluss.toast) + Schritt-Texte
   (frage/hilfetext/feld.label, über die geteilte `textwerteAusSchritten` aus
   vor-umzug-textwerte.js — dieselbe Extraktionstiefe wie A3, kein zweiter,
   abweichender Zähl-Umfang).

   pvwiz/kiwiz sind AUSDRÜCKLICH NICHT Teil dieser Achse — sie bleiben nativ
   (U2-ADR-346 §4, Allow-List `WIZARD_BUENDEL_VERBOTENE_IDS`) und laufen über
   den `dokumente`-Weg, den A3 bereits prüft (pvwiz-Schritte stehen schon in
   `immerWerteA3`).

   „depot" — GIBT ES FÜR DIESE ACHSE NICHT, absichtlich, nicht übersehen:
   die fünf Wizards sind reine EINGABE-Flüsse (sie schreiben in Sektor-Felder,
   `ziel: {sektor, ...}`), keine Dokument-Generatoren wie PV_MODUL/KI_MODUL.
   Es gibt keine `modulDokumentAbschnitte`-artige Funktion, die aus Depotdaten
   bedingten Wortlaut zusammensetzt — die einzige depot-abhängige Ausgabe
   dieser Wizards ist der SEKTOR, in den sie schreiben, und dessen Rendering
   ist Gegenstand einer anderen Achse (renderSektor), nicht dieser. Die Frage
   „stimmt der ausgelieferte Text mit dem Vor-Zustand überein" ist für Wizards
   darum vollständig mit `immerWerteA2` beantwortet — kein zweiter, künstlich
   angehängter „depot"-Zweig ohne echten Gegenstand.

   `A2_DEPOT_FIXTUREN` bleibt darum ein leeres Array; `depotErgebnisA2`
   liefert `{}`. tools/dokument-vor-umzug-fixture-ziehen.js läuft damit
   unverändert durch (die Schleife über `depotFixturen` iteriert einfach
   nichts) — kein Sonderfall im geteilten Erzeuger nötig.
   ════════════════════════════════════════════════════════════════════════ */
const { textwerteAusSchritten } = require('./vor-umzug-textwerte');

const WIZARD_IDS_A2 = Object.freeze(['gebwiz', 'anamwiz', 'pflwiz', 'heirwiz', 'umzwiz']);

function textwerteAusWizardKopf(w) {
  const werte = [];
  if (w.titel) werte.push(w.titel);
  if (w.einleitung) werte.push(w.einleitung);
  if (w.abschluss && typeof w.abschluss === 'object' && w.abschluss.toast) werte.push(w.abschluss.toast);
  return werte;
}

/* „immer" — Achse a2-wizards. */
function immerWerteA2(V) {
  const werte = [];
  for (const id of WIZARD_IDS_A2) {
    const w = V.WIZARDS.find((x) => x.id === id);
    if (!w) continue;
    werte.push(...textwerteAusWizardKopf(w));
    werte.push(...textwerteAusSchritten(w.schritte));
  }
  return werte;
}

/* „depot" — absichtlich leer, s. Kopf-Kommentar. */
function depotErgebnisA2() {
  return {};
}

const A2_DEPOT_FIXTUREN = [];

module.exports = {
  beschreibung: 'U2-ADR-346 — fünf WIZARDS (gebwiz/anamwiz/pflwiz/heirwiz/umzwiz, 216 native ' +
    'Zeilen) hinter BUERGERMODUL_BUENDEL materialisiert. pvwiz/kiwiz bleiben nativ (dokumente-Weg, ' +
    'schon in A3 geprüft). Reine „immer"-Achse — kein depot-abhängiger Generator vorhanden, s. ' +
    'Kopf-Kommentar in tools/lib/vor-umzug-achse-a2-wizards.js für die Begründung.',
  immerWerte: immerWerteA2,
  depotFixturen: A2_DEPOT_FIXTUREN,
  depotErgebnis: depotErgebnisA2,
};
