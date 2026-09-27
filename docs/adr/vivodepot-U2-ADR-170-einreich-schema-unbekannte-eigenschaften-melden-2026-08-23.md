# U2-ADR-170: Eine unbekannte Feld-Eigenschaft wird generator-seitig gemeldet, kern-seitig abgewiesen

**Status:** Akzeptiert
**Datum:** 23.08.2026 (Nachtrag selbentags)
**Kategorie:** ARCHITEKTUR, MODUL-EINLASS
**Grundlage:** Produktentscheidung vom 23.08.2026 zum Befund aus dem Prüfstoff-Nachtrag
(Zug 4 des dortigen Messwerkzeugs) — eine im Einreich-Schema unbekannte Feld-Eigenschaft
verschwand still, weder abgewiesen noch gemeldet. Erstfassung entschied „melden, nicht sperren";
Nachtrag desselben Tages (Folgeauftrag „Die automatisierte Modulprüfung schließen", Posten 1)
verschärft auf „im Kern abweisen, im Erzeuger weiterhin melden" — s. Nachtrag unten.
- **Code-Stelle:** `vivodepot-template-generator.html` — `normalisiereFeldBefund` (generische
  Meldung, Feld- und Unterfeld-Ebene), `baueSubmission` (`paket._angeglichen`, nicht aufzählbar),
  `submissionErzeugen` (Anzeige, ohne zu sperren); `vivodepot.html` —
  `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`/`_TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL`,
  `_templateFeldZuModell` (echte Verwerfung, Nachtrag).
- **Status heute:** gilt — gebaut und belegt in `tests/schema-wirkt-nicht-nachtrag.test.js`.

---

## Der gemessene Befund

Der Prüfstoff-Nachtrag (23.08.2026) hatte gezeigt: eine erfundene Feld-Eigenschaft
(`kardinalitaet`) überlebt weder den Erzeuger noch erreicht sie je den Kern — sie verschwindet,
ohne dass irgendwo ein Wort fällt. `additionalProperties: false` steht zwar im Einreich-Schema auf
allen drei Ebenen (Template, Feld, Unterfeld), wird aber im gelebten Importweg an KEINER Stelle
geprüft: `validiereSubmission` (Generator) prüft nur das bereits normalisierte Ergebnis, in dem die
unbekannte Eigenschaft längst fehlt — ein zu spät ansetzender Check, der nichts mehr findet; der
Kern (`validateTemplate`) hat überhaupt keinen generischen Unbekannt-Schlüssel-Check.

Nachgemessen (Zug 1 dieses Auftrags): unter den 17 schema-deklarierten Feld-Eigenschaften geht
KEINE deklarierte Eigenschaft verloren — bis auf eine bereits bekannte, eigenständig geführte
Ausnahme (`provenienzPflichtig`, A345/`tools/schema-wirkung-pruefen.js`). Der eigentliche Verlust
betrifft ausschließlich Eigenschaften AUSSERHALB des Schemas — ein offener, nicht enumerierbarer
Satz, den bislang niemand sieht.

## Entscheidung

**Melden, nicht sperren — an drei Stellen, gestützt auf bestehende Muster.**

1. **Generator, generisch statt kuratiert.** `normalisiereFeldBefund` meldete bisher nur
   Eigenschaften, die jemand vorher in `NICHT_ABBILDBARE_EIGENSCHAFTEN` (A351) NAMENTLICH
   eingetragen hatte. Neu: ein generischer Durchgang meldet JEDEN Schlüssel, den `roh` trägt und
   den `_normalisiereFeldRein` nicht kennt — Feld- UND Unterfeld-Ebene, mit dem Schlüsselnamen in
   der Meldung.
2. **Die Meldung reist am Paket mit, nicht-aufzählbar.** `baueSubmission` hängt sie als
   `paket._angeglichen` an (`Object.defineProperty`, `enumerable:false`) — sichtbar für jeden
   Aufrufer, der sie will (die UI, ein Skript), unsichtbar für `JSON.stringify` (der Downloadweg)
   und für eine `additionalProperties:false`-Prüfung GEGEN das Paket selbst. `submissionErzeugen`
   zeigt sie im Ergebnis-Bereich, OHNE das Erzeugen/Herunterladen zu verhindern.
3. **Kern, nach dem Muster von A376.** `importPlanGeprueft` sammelt unbekannte Feld-/
   Unterfeld-Eigenschaften in `plan.unbekannteFeldEigenschaften` und hängt einen zusätzlichen
   Eintrag an `verworfeneFelder` — dieselbe Bauart wie `listenOhneUnterfelder`: eine SYNTHETISCHE
   Meldung, keine echte Verwerfung. `feldDefinitionen` bleibt unverändert vollständig.

**`validateTemplate` selbst bekommt KEINEN generischen Check**, entgegen dem ersten Wortlaut des
Auftrags: die Funktion ist ein binäres Passieren/Ablehnen-Gate (ein String als Ablehnungsgrund);
das Haus-Muster für „melden, nicht sperren" (A376) lebt eine Ebene höher, in `importPlanGeprueft`,
wo der Plan bereits gebaut ist und Meldungen ALS DATEN neben dem Ergebnis stehen können.

**`provenienzPflichtig` bleibt bewusst ausgenommen** vom neuen Kern-Check
(`_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL` führt es als „bekannt"): es ist kein unbekannter Schlüssel,
sondern ein schema-legaler, bereits eigenständig getrackter Fall (A345). Als Nebenwirkung
verschwand es dadurch aus der GROBEN Textpräsenz-Messung von `tools/schema-wirkung-pruefen.js`
(die Grenze steht im eigenen Kopfkommentar des Werkzeugs) — die Grundlinie dieses Werkzeugs wurde
entsprechend nachgezogen, mit einem Vermerk, dass der Befund selbst UNVERÄNDERT offen bleibt.

## Was NICHT in dieser ADR steht

**Keine erzeugte „Kontrakt-Veröffentlichung"-Faktenübersicht (Zug 3 des ursprünglichen
Auftrags).** Der Auftrag selbst stuft sie als Vorbedingung eines künftigen Verzeichnisses ein,
nicht als v1 — sie ist mit dieser ADR nicht gebaut (s. Nachtrag: sie folgt zusammen mit Posten 4
des Folgeauftrags).

---

## Nachtrag 23.08.2026 — Posten 1 des Folgeauftrags „Die automatisierte Modulprüfung schließen"

**Die Entscheidung „kein Abweisen" (oben, ursprünglich unter „Was NICHT in dieser ADR steht")
ist AUFGEHOBEN.** Produktentscheidung, selbentags: *„Es gibt keine Bestandsbündel — v1
ist nicht veröffentlicht, kein Modul ist in fremder Hand. Damit ist die scharfe Form heute
kostenlos und später teuer."* Die Prämisse, auf der die ursprüngliche Zurückhaltung beruhte
(„Wirkung auf bereits ausgelieferte Bündel"), trifft nicht zu.

**Neu:** `_templateFeldZuModell` weist ein Feld mit unbekannter Feld- ODER Unterfeld-Eigenschaft
jetzt VOLLSTÄNDIG ab (`{verworfen:true, grund:'unbekannte-eigenschaft', name}`) — derselbe Weg wie
die bestehende Verwerfung bei fehlendem `bereich`, läuft über den gewöhnlichen
`verworfeneFelder`-Kanal aus `_templateFelderUebersetzen`, kein synthetischer Zweitkanal mehr
nötig. Der frühere `plan.unbekannteFeldEigenschaften`-Meldeweg in `importPlanGeprueft` entfällt
ersatzlos — er wurde durch die echte Verwerfung überflüssig.

**Was unverändert bleibt:** die Generator-seitige Meldung (Punkte 1+2 oben) — sie ist weiterhin
„melden, nicht sperren", denn sie wirkt VOR der Einreichung, während jemand baut; wer den
Erzeuger benutzt, kommt mit einem betroffenen Bündel gar nicht erst an. `provenienzPflichtig`
bleibt aus demselben Grund wie zuvor ausgenommen (schema-legal, A345) — es wird also weiterhin
weder gemeldet noch abgewiesen.

**Für die Kontrakt-Veröffentlichung:** „Was im Schema nicht steht, kommt nicht an" ist ab jetzt
eine ZUSAGE, keine Nachlässigkeit mehr — der Satz gehört unverändert in die künftige
Faktenübersicht (Posten 4 des Folgeauftrags, zusammen mit den reservierten Kennungen).

---

*Vivodepot GmbH · 23.08.2026*
