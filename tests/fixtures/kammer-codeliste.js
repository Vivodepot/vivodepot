'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Prüfstoff: eine Kammervorlage mit eigener Werte-Liste zu einem GEFÜHRTEN
   Codesystem (A378, 20.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER PRÜFSTOFF, DER BIS HEUTE FEHLTE. Weder `anwalts-feldsatz.js` noch
   `arztbogen-radiologie.js` trägt ein Codesystem; ein Modul mit Codeliste lief
   nirgends durch. Das ist zugleich die Lücke, die der Bericht zu Auftrag 6
   offenlässt.

   EIGENE WERTE, KEIN EIGENES SYSTEM — und das ist gemessen, nicht gewählt:
   `validateTemplate` prüft die HERKUNFT einer mitgebrachten Codeliste
   (U2-ADR-040-Nachtrag 4b) gegen `_GEFUEHRTE_TERMINOLOGIE_URIS()`. Eine Kammer
   kann darum KEINE frei erfundene Liste mitbringen — sie kann eine eigene
   Werte-Auswahl zu einem der sechs geführten Systeme liefern. Der Auftrag
   sprach von „eigener Codeliste"; der Weg gibt „eigene Werte zu geführtem
   System" her, und danach ist dieser Prüfstoff gebaut.

   ER IST KEIN DEPOT und trägt keinen einzigen Wert — nur Feld- und
   Code-Beschreibungen einer erfundenen Ärztekammer.
   ════════════════════════════════════════════════════════════════════════════ */

// Das geführte System, zu dem die Kammer eigene Werte liefert.
const SNOMED_URI = 'http://snomed.info/sct';

/* Die Felder, in der Schreibweise des Erzeugers (`feldname`/`feldtyp`/`bereich`) — sie laufen
   über `felderAngleichungen`, nicht von Hand gesetzt. */
const KAMMER_FELDER = Object.freeze([
  { feldname: 'Bekannte Allergien (Kammer-Auswahl)', feldtyp: 'mehrfachauswahl', bereich: 'health',
    codeSystem: SNOMED_URI,
    codeWerte: [
      { code: '91936005', anzeige: 'Allergie gegen Penicillin' },
      { code: '29449006', anzeige: 'Allergie gegen Jod' },
      { code: '418689008', anzeige: 'Allergie gegen Gräserpollen' },
    ] },
  { feldname: 'Untersuchungsgrund', feldtyp: 'text', bereich: 'health' },
]);

/* Die mitgebrachte Codeliste — eigene Werte, geführtes System. Die `uri` MUSS auf eine
   geführte Terminologie zeigen, sonst weist `validateTemplate` die Vorlage benannt ab. */
const KAMMER_CODELISTE = Object.freeze({
  systemId: 'tpl_kammer_allergene',
  uri: SNOMED_URI,
  version: '2026-08',
  kuerzel: 'SNOMED',
  lizenz: 'SNOMED CT, Affiliate-Lizenz der Ärztekammer',
  eintraege: [
    { code: '91936005', anzeige: 'Allergie gegen Penicillin' },
    { code: '29449006', anzeige: 'Allergie gegen Jod' },
    { code: '418689008', anzeige: 'Allergie gegen Gräserpollen' },
  ],
});

/* Ein System, das wir NICHT führen — der Prüfstoff für den Fall, den der Auftrag als
   gefährlichsten benennt: er sieht aus wie ein Treffer und ist keiner. */
const FREMDES_SYSTEM_URI = 'http://kammer-example.invalid/allergene';

module.exports = { KAMMER_FELDER, KAMMER_CODELISTE, SNOMED_URI, FREMDES_SYSTEM_URI };
