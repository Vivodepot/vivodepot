'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   bestand-zuwachs-seit-einfrieren.js — EINE Liste, zwei Sichten (U2-ADR-326)
   ────────────────────────────────────────────────────────────────────────────
   Zwei eingefrorene Maßstäbe prüfen heute GLEICHHEIT, obwohl sie VERLUST meinen:
     · tests/buergermodul-bereich-erzeugen-u2-adr-319.test.js  — der eingefrorene
       native Bereichsbestand (Stand debcb406)
     · tests/paket0-migrationsbeleg-referenzdepot.test.js      — der eingefrorene
       Export des Referenzdepots
   Beide dürfen einen Verlust nie durchlassen — und beide müssen einen ZUWACHS
   erlauben, sonst verbietet der Umbau-Beweis jede spätere Ergänzung. Ein Template
   ergänzt das Bürgermodul um Felder (Produktentscheidung, 06.09.2026);
   eine Gleichheits-Probe verbietet genau das.

   EINE QUELLE, NICHT ZWEI LISTEN. Bekäme jede Probe ihre eigene Aufzählung,
   drifteten sie — und die eine deckte dann, was die andere längst nicht mehr
   kennt. Dieselbe Bauform wie `scripts/ausgeliefertes-dateiset.js` (DATEISATZ)
   und `tools/build-logik-typen.js`: eine Liste, mehrere Sichten darauf.

   DIE LISTE IST DER PREIS FÜR DIE LOCKERUNG, NICHT IHRE BEGLEITUNG. Ein Feld,
   das weder eingefroren noch hier benannt ist, färbt beide Proben rot. Und ein
   Eintrag, der in KEINER der beiden Proben mehr auftaucht, färbt ebenfalls rot —
   eine Liste, die Totes führt, deckt beim nächsten Mal etwas, das niemand geprüft
   hat.

   NEU-EINFRIEREN KÜRZT DIESE LISTE ABSICHTLICH NICHT. Eine Grundlinie bleibt
   stehen, wo sie eingefroren wurde — sie wandert nicht mit, wenn die andere neu
   eingefroren wird. Ein Eintrag, der gegenüber der einen Grundlinie längst
   Bestand geworden ist, bleibt gegenüber der anderen, unverändert stehenden
   Grundlinie weiterhin unbenannter Zuwachs. Ein Werkzeug, das beim
   Neu-Einfrieren kürzte, nähme der stehengebliebenen Grundlinie genau die
   Nennung, die ihre eigene Vorwärts-Prüfung noch braucht — der Name dieser
   Datei verspricht ein Kürzen, das Verhalten tut es zu Recht nicht.

   `art` unterscheidet zwei Sorten Zuwachs, weil die Proben sie verschieden sehen:
     'feld'  — eine neue Feld- oder Unterfeld-KENNUNG im Bestand.
     'zeile' — ein bestehendes LISTENFELD, dessen Prüfstoff im Referenzdepot um
               eine Zeile gewachsen ist. Die eingefrorenen Zeilen müssen dabei
               unverändert vorne stehen; nur hinten darf etwas dazukommen.
   ════════════════════════════════════════════════════════════════════════════ */

// Ein Eintrag verlässt diese Liste nicht dadurch, dass er irgendwo zu Bestand geworden ist —
// nur dadurch, dass er gegenüber JEDER Grundlinie, die diese Liste bedient, kein unbenannter
// Zuwachs mehr wäre. Solange auch nur eine von ihnen unverändert steht, ist die Nennung hier
// ihr Beleg. Wer das prüfen will, prüft vor dem Kürzen gegen beide Verbraucher einzeln.
const ZUWACHS = Object.freeze([
  // U2-ADR-326 — die vier wirtschaftlichen Felder des Beratungshilfe-Auszugs.
  { bereich: 'vermoegen', sektion: 'einkommen-wohnsituation', feld: 'einkommen_netto_monat', unterfeld: null, art: 'feld', adr: 'U2-ADR-326' },
  { bereich: 'vermoegen', sektion: 'einkommen-wohnsituation', feld: 'unterhalt_verpflichtungen', unterfeld: null, art: 'feld', adr: 'U2-ADR-326' },
  { bereich: 'vermoegen', sektion: 'einkommen-wohnsituation', feld: 'haushalt_weitere_einkommen', unterfeld: null, art: 'feld', adr: 'U2-ADR-326' },
  { bereich: 'vermoegen', sektion: 'einkommen-wohnsituation', feld: 'belastungen_monatlich', unterfeld: null, art: 'feld', adr: 'U2-ADR-326' },
  // U2-ADR-326 — die zwei Unterfelder AM VORGANG (nicht an der Bürgerin).
  { bereich: 'verwaltung', sektion: 'bundid-vorgaenge', feld: 'verwaltung_vorgaenge', unterfeld: 'gegenseite', art: 'feld', adr: 'U2-ADR-326' },
  { bereich: 'verwaltung', sektion: 'bundid-vorgaenge', feld: 'verwaltung_vorgaenge', unterfeld: 'beratung_bisher', art: 'feld', adr: 'U2-ADR-326' },
  /* U2-ADR-326 — der Prüfstoff selbst: das Referenzdepot führt seither eine dritte Vorgangs-Zeile
     (Beratungshilfe-Antrag), damit die zwei neuen Unterfelder überhaupt in einem Ausgabeweg
     gemessen werden. Die zwei bestehenden Zeilen bleiben unverändert vorne stehen. */
  { bereich: 'verwaltung', sektion: 'bundid-vorgaenge', feld: 'verwaltung_vorgaenge', unterfeld: null, art: 'zeile', adr: 'U2-ADR-326' },
  /* ZVR-Abschrift (Auftrag, 13.09.2026) — Bundesrat 10.07.2026, § 78a Abs. 3 BNotO,
     wirksam ab 01.10.2026: das Zentrale Vorsorgeregister nimmt ab dann nicht nur den Hinweis,
     sondern den TEXT selbst. Drei Unterfelder an `vorsorge_instrumente`, vor dem Einfrieren
     ergänzt, weil ein Bereichsmodul danach nur noch den GANZEN Bereich tauschen könnte
     (U2-ADR-348) — s. tests/zvr-abschrift-felder.test.js. */
  { bereich: 'vorsorge', sektion: 'meine-vorsorge', feld: 'vorsorge_instrumente', unterfeld: 'zvr_abschrift', art: 'feld', adr: 'U2-ADR-410' },
  { bereich: 'vorsorge', sektion: 'meine-vorsorge', feld: 'vorsorge_instrumente', unterfeld: 'zvr_abschrift_datum', art: 'feld', adr: 'U2-ADR-410' },
  { bereich: 'vorsorge', sektion: 'meine-vorsorge', feld: 'vorsorge_instrumente', unterfeld: 'zvr_abschrift_stelle', art: 'feld', adr: 'U2-ADR-410' },
  /* Private Sachversicherungen strukturiert, P-Konto-Merkmal (U2-ADR-424, 20.09.2026): ein neues
     Listenfeld mit sechs Unterfeldern und ein siebtes Unterfeld an den Konten — gemessen an den
     acht Stellen, die die U2-ADR-320-Ratsche als unbenannt meldete, nicht aus der ADR abgeleitet. */
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: null, art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: 'insuranceType', art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: 'insurer', art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: 'insurancePolicyNumber', art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: 'insuranceContactPerson', art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: 'insuranceTerminationMethod', art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'privateInsurancePolicies', unterfeld: 'note', art: 'feld', adr: 'U2-ADR-424' },
  { bereich: 'finanzen', sektion: 'konten-steuern-vorsorge', feld: 'accounts', unterfeld: 'garnishmentProtection', art: 'feld', adr: 'U2-ADR-424' },
]);

// Sicht 1 — der eingefrorene BEREICHSBESTAND: benannte Feld-Stellen, nie Array-Positionen.
function stellenImBestand() {
  return ZUWACHS.filter((z) => z.art === 'feld')
    .map((z) => z.bereich + '#' + z.sektion + '.' + z.feld + (z.unterfeld ? '/' + z.unterfeld : ''));
}

// Sicht 2 — der eingefrorene REFERENZDEPOT-EXPORT: dort wohnen Werte unter `sektoren[bereich][feld]`.
// Ein Unterfeld hat dort keinen eigenen Schlüssel — es steckt in den Zeilen seines Trägerfelds und
// wird über dessen 'zeile'-Eintrag mitgedeckt.
function neueFelderImExport() {
  return ZUWACHS.filter((z) => z.art === 'feld' && !z.unterfeld).map((z) => z.bereich + '.' + z.feld);
}
function gewachseneListenImExport() {
  return ZUWACHS.filter((z) => z.art === 'zeile').map((z) => z.bereich + '.' + z.feld);
}

module.exports = { ZUWACHS, stellenImBestand, neueFelderImExport, gewachseneListenImExport };
