'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vor-Umzug-Golden-Master — Achse a4-standard-vorlagen (U2-ADR-345)
   ────────────────────────────────────────────────────────────────────────
   Eigene Datei statt Eintrag in tools/lib/vor-umzug-textwerte.js (Form von
   cb/df geklärt, 07.09.2026): jede Achse bringt ihre eigene Extraktion mit,
   die gemeinsame Datei bleibt bei a3 stehen, statt mit jeder neuen Achse zu
   wachsen. Registriert in tools/lib/vor-umzug-achsen.js, ein Eintrag.

   ABGRENZUNG ZU a3-dokumentmodule: a3 deckt PV_MODUL/KI_MODUL/VOLLMACHT_MODUL/
   BETREUUNG_MODUL bereits ab (abschnitte + Depot-getriebene Generator-Ausgabe).
   U2-ADR-345 hat dieselben vier Module NICHT inhaltlich verändert (nur ihren
   Speicherort — Bündel statt natives Literal, s. ADR); ein zweiter Vergleich
   derselben vier Module wäre dieselbe Probe zweimal. Was U2-ADR-345 NEU in
   den Vergleich bringt, ist STANDARD_VORLAGEN — das deckt a3 nirgends ab.

   WAS HIER NICHT VERGLICHEN WIRD, UND WARUM: `templateJws` (die treuhand-
   signierte Nutzlast) ist kein amtlicher WORTLAUT, sondern eine kryptografische
   Signatur über ihn — ein Golden-Master-Vergleich des Blobs selbst prüfte nur,
   ob das Byte-für-Byte gleiche Zeichenkette drinsteht, nicht ob der Wortlaut
   stimmt (das übernimmt `tests/trust-basistemplate-signatur.test.js`, eigener
   Zweck). Verglichen werden die MENSCHENLESBAREN Textwerte: `name`, `wortlaut`,
   die drei Felder aus `wortlautQuelle`/`wortlautQuelleBroschuere`, sowie jedes
   `felder[].feldname`.

   DIE VERGLEICHSEINHEIT IST DER ABSATZ, NICHT DAS DOKUMENT (Nachtrag,
   12.09.2026, echter Fund am A558-Lauf): `wortlaut` wurde ursprünglich als
   EIN Wert je Vorlage verglichen — dann kann der Prüfer eine geänderte Zeile
   nicht von einem gelöschten Dokument unterscheiden, beide melden „verloren".
   Am A558-Lauf traf das zu: eine einzige geänderte Klausel (Vorsorgevollmacht-
   Schenkungen, Entscheidung 07.09.2026) machte den GESAMTEN Wortlaut-
   String zu einer neuen Zeichenkette, und der Prüfer meldete den kompletten
   alten Text als „verloren" — obwohl fast jeder Absatz darin unverändert war.
   Eine benannte Ausnahme für die ganze Vorlage wäre der teuerste Fehler
   gewesen: sie hätte dieses Sicherheitsnetz für die wichtigsten Rechtstexte
   des Produkts DAUERHAFT stumm geschaltet, für jede künftige Änderung, nicht
   nur die heutige. Die Einheit ist darum GENAUSO klein wie die kleinste
   zulässige Änderung — ein Absatz (`\n\s*\n`-getrennt, dieselbe Zerlegung wie
   `tools/lib/absaetze.js`, kein Nachbau) —, und NUR die Absätze, die eine
   ausdrückliche, benannte Entscheidung tatsächlich geändert hat, dürfen als
   Ausnahme eingetragen werden (s. `ABSATZ_AUSNAHMEN` unten). Ein Absatz, der
   ersatzlos VERSCHWINDET (nicht nur umformuliert wird), bleibt ungeschützt rot
   — genau der Fall, für den dieses Netz gebaut ist.

   DER HISTORISCHE BELEG (37038011) BLEIBT STEHEN. Ihn auf einen neueren Commit
   nachzuziehen wäre derselbe Fehler wie eine Charakterisierungs-Grundlinie am
   Tag des Umbaus selbst neu einzufrieren — der Prüfer bewachte dann nur noch
   „seit gestern nichts geändert" und nichts davor.

   DEPOT-UNABHÄNGIG: STANDARD_VORLAGEN trägt keine Depot-getriebene Auswahl-
   Logik (anders als die vier Dokumentmodule) — derselbe Text für jedes Depot,
   jede Bürgerin. `depotFixturen` bleibt darum leer; `depotErgebnis` existiert
   nur, damit der Erzeuger (`tools/dokument-vor-umzug-fixture-ziehen.js`) den
   Registereintrag ohne Sonderfall lesen kann — er wird bei leerem
   `depotFixturen` nie aufgerufen. */

const { absaetzeErheben } = require('./absaetze.js');

function immerWerteA4StandardVorlagen(V) {
  const werte = [];
  for (const v of V.STANDARD_VORLAGEN) {
    if (v.name) werte.push(v.name);
    // Absatzweise, NICHT der ganze String (s. Kopf-Kommentar) — sonst macht eine einzelne
    // geänderte Klausel den kompletten Wortlaut zu einem einzigen "verlorenen" Riesenfund.
    if (v.wortlaut) werte.push(...absaetzeErheben(v.wortlaut));
    if (v.wortlautQuelle) {
      if (v.wortlautQuelle.behoerde) werte.push(v.wortlautQuelle.behoerde);
      if (v.wortlautQuelle.titel) werte.push(v.wortlautQuelle.titel);
      if (v.wortlautQuelle.lizenz) werte.push(v.wortlautQuelle.lizenz);
    }
    if (v.wortlautQuelleBroschuere) {
      if (v.wortlautQuelleBroschuere.behoerde) werte.push(v.wortlautQuelleBroschuere.behoerde);
      if (v.wortlautQuelleBroschuere.titel) werte.push(v.wortlautQuelleBroschuere.titel);
      if (v.wortlautQuelleBroschuere.url) werte.push(v.wortlautQuelleBroschuere.url);
    }
    for (const f of (v.felder || [])) {
      if (f.feldname) werte.push(f.feldname);
    }
  }
  return werte;
}

/* Ein Absatz, der die Absatzgrenze wechselt (Umsortierung, Zusammenführung mehrerer
   Absätze zu einem), aber wörtlich UNVERÄNDERT bleibt, ist keine Textlücke — nur eine
   andere Gliederung. Real beobachtet (A558, 12.09.2026): "anderer Person: …" stand vorher
   als eigener Absatz, ist jetzt Teil eines größer zusammengefassten — der reine
   Absatz-Vergleich meldet ihn als "verloren", obwohl er wortgleich weiterlebt. Gefiltert
   wird darum GEGEN DEN VOLLTEXT ALLER aktuellen Vorlagen (nicht nur die eigene) — was hier
   übrig bleibt, ist NICHT mehr irgendwo als Text vorhanden, keine Frage der Gliederung
   mehr. Dieselbe Unterscheidung wie in tools/basistemplate-zeremonie-automat.js
   (`geaenderteAbsaetze`s Teilstring-Filter) — kein Nachbau desselben Gedankens, nur eine
   eigene, kleinere Anwendung (dort: alt vs. neu EINES Dokuments; hier: verloren vs. der
   GESAMTE aktuelle Bestand, weil die Fixture selbst nicht dokumentweise gegliedert ist). */
function nurEchteVerluste(verlorene, V) {
  const voll = (V.STANDARD_VORLAGEN || []).map((v) => String(v.wortlaut || '')).join('\n\n');
  return verlorene.filter((w) => !voll.includes(w));
}

/* Nie aufgerufen (s. Kopfkommentar, DEPOT-UNABHÄNGIG) — existiert nur für den
   Registervertrag (tools/lib/vor-umzug-achsen.js erwartet je Achse eine
   Funktion an dieser Stelle). */
function depotErgebnisA4StandardVorlagen() {
  return {};
}

const A4_STANDARD_VORLAGEN_DEPOT_FIXTUREN = [];

module.exports = {
  immerWerteA4StandardVorlagen,
  depotErgebnisA4StandardVorlagen,
  A4_STANDARD_VORLAGEN_DEPOT_FIXTUREN,
  nurEchteVerluste,
};
