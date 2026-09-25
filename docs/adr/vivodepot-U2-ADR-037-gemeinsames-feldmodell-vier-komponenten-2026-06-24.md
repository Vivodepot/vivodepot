# U2-ADR-037 — Gemeinsames selbst-beschreibendes Feld-Modell über die vier Komponenten

**Datum:** 24.06.2026
**Status:** Akzeptiert · 24.06.2026. · Umgesetzt (Stufen 0–3 + Invarianten), 24.06.2026 — s. Umsetzungs-Vermerk am Ende.
**Nummer:** U2-ADR-037 (verifiziert 24.06.: höchste belegte in `docs/adr/` ist U2-ADR-036).
**Typ:** Grundsatz-Entscheidung. Kein Bau-Auftrag — der folgt gestuft, nachdem dieser ADR steht.
**Bezug:** Vier-Komponenten-Architektur (Architektur-Konzept v1.0, 22.05.); Pipeline-Befund + Differenztabelle (24.06.); Daten-Verbleib (22.05.); U2-ADR-006 (Andock-Vorkehrung `codes:{}`).
**Begriffe:** „Komponente“ bezeichnet die vier Software-Artefakte (1 Bürger-App, 2 Lese-App, 3 VC-Issuer, 4 Template-Generator — Bau-Reihenfolge). „Säule“ ist im Projekt dem Geschäftsmodell (Umsatz-Säulen) vorbehalten und wird für die Architektur nicht verwendet.
**Status heute:** gilt — Format aktiv (`docs/template-generator/field-model-schema.json`, `tpl_`-Präfix-Pattern; `data.feldDefinitionen[]` in `vivodepot.html:15112`/`:21391`), Invarianten `tests/feldmodell-invarianten.test.js`.

---

## Kontext

Die Produktvision: Die Template-Schicht ist der allgemeine Erweiterungs-Mechanismus der App. Neue Themen (Energie als erster Pilot, später Immigration, Anerkennung ausländischer Abschlüsse, Länder-Lokalisierung) kommen über Templates herein, ohne dass der App-Kern für jeden Fall einen vordefinierten Slot tragen muss.

Read-only-Befunde vom 24.06. haben belegt: Die vier Komponenten sprechen heute drei nicht-deckungsgleiche Feld-Sprachen. Der Generator (Komponente 4) erzeugt Feld-Definitionen; der VC-Issuer (Komponente 3) verwirft sie und signiert nur Anbieter-Vertrauen; die Bürger-App (Komponente 1) und die Lese-App (Komponente 2) erwarten Werte für bestehende Katalog-Felder. Das selbst-beschreibende Feld-Modell existiert nur auf der Erzeuger-Seite und wird unterwegs abgeschnitten.

## Entscheidung

**1. Ein gemeinsames, selbst-beschreibendes Feld-Modell über alle vier Komponenten.** Dieselbe Feld-Definition (Typ, Label, Platzierung, Code-System, Versions-Marke) wird vom Generator erzeugt, vom VC-Issuer durchgereicht und signiert, von Bürger-App und Lese-App gelesen und gerendert. Die Definition reist als Daten — nicht als Code — und lebt im Depot, damit ein eingewandertes Feld auch dann anzeigbar bleibt, wenn das Template widerrufen ist (Daten-Verbleib auf Render-Ebene).

**2. Das Format ist erweiterbar, nicht allumfassend.** Es bildet nicht jede denkbare zukünftige Struktur ab. Es definiert, *wie* neue Typen später hinzukommen, ohne Bestehendes zu brechen. Ein Empfänger, der einen Typ nicht kennt, überspringt ihn sauber statt zu scheitern.

**3. Drei Fundament-Anforderungen ab Tag eins (nicht nachrüstbar — „der Keller"):**
   - **Versions-Marke pro Feld.** Jedes eingewanderte Feld trägt, nach welcher Schema-Version es zu lesen ist. Ohne sie ist Daten-Verbleib in fünf Jahren nicht einlösbar; nachträglich nicht herstellbar.
   - **Stabile Slot-IDs statt freier Labels.** Felder und Bereiche werden über technische IDs (`feldId`, `sektorId`) adressiert, nicht über Mensch-Text-Labels. Nachträgliche Einführung erzwingt Neuverschlüsselung aller Daten.
   - **Typ-System mit Platz für unbekannte Typen.** Das Typ-Vokabular ist offen; unbekannte Typen werden übersprungen, nicht abgelehnt. Das ist die Andockstelle, an der `ref`, `liste`, `mehrfachauswahl` später eintreten.

**4. Erster Implementierungs-Schritt: die flache Teilmenge.** Implementiert werden zunächst die flachen Feldtypen (text/textarea, zahl, datum, auswahl, jaNein, codierte Felder). Das deckt Energie als ersten realen Piloten vollständig ab. `ref` (Referenzen), `liste` (verschachtelte Strukturen) und `mehrfachauswahl` erhalten im Format einen dokumentierten, reservierten Platz, werden aber erst implementiert, wenn ein realer Anwendungsfall sie verlangt.

**5. Ehrliche Benennung.** Solange Referenzen und Listen nicht implementiert sind, wird der Mechanismus nicht als vollständige Erfüllung von „beliebige neue Themen" dargestellt, sondern als erweiterbares Fundament mit flacher erster Stufe. Nach innen und außen.

## Drift-Bereinigung (ausdrücklicher Teil dieser Entscheidung)

- **Die Spezifikation vom 29.05. ist an diesem Punkt überholt.** Energie ist **kein festes Modul**. Energie ist ein Themenfeld, das über die Template-Schicht andockt. Die Spec-Aussage „Modul Energie und Erzeugung" wird durch diesen ADR ersetzt.
- Die stille Auswahl-Entscheidung vom 06.06. („Energie als eigenes Template") wird durch diesen ADR formalisiert und in den dokumentierten Stand gehoben.
- Energie-Verortung: Template über das gemeinsame Feld-Modell, flache Felder (Solar/MaStR, Speicher, Ladesäule, Zählpunkt, SMGW). Erster Pilot der Pipeline, nicht Anlass ihres Baus.
- **Umgesetzt 24.06. (mit der Freigabe):** `docs/spec/vivodepot-elf-bereiche-definition-2026-05-29.md` angeglichen — dieser ADR **ersetzt die Energie-Modul-Aussage und die Säule-Nummerierung der 29.05.-Spec** (Energie-Modul → Energie als Themenfeld über die Template-Schicht; Säule 1–4 → Komponente, korrigierte Zählung).

## Konsequenzen

**Positiv:** Ein Format, einmal richtig gebaut, trägt alle vier Komponenten und jeden späteren Themenfall. Die Erzeuger-Hälfte (Generator-Submission-Schema) existiert bereits und liefert die Vorlage. Krypto ist nicht betroffen (Block-Pin unberührt, dynamische Felder fahren mit der Voll-Objekt-Verschlüsselung mit).

**Last:** Drei Komponenten müssen auf dasselbe Modell gezogen werden — Issuer (Definitionen durchreichen statt verwerfen), Bürger-App und Lese-App (Definitionen rendern), plus ein Übersetzer für die Vokabular-Differenzen (feldname→feldId, bereich-Label→sektorId, Code-System-Namen). Das ist ein eigener Bau-Block, kein Sprint.

**Risiko, bewusst getragen:** Die flache Teilmenge bedient zunächst nicht die referenz- und listenreichen Bereiche (Menschen, Kinder, Mappe) per Template. Das ist akzeptiert, weil Energie sie nicht braucht und das Format sie später ohne Bruch aufnimmt.

## Offen (nach Freigabe dieses ADR)

- Gestufter Bau-Auftrag, Komponente für Komponente, auf Basis der Differenztabelle vom 24.06.
- Das genaue Platzierungs-Modell beim Rendern (Sektion/Reihenfolge eines dynamischen Felds) — offene read-only-Vertiefung.
- ADR-Nummer verifiziert und vergeben: **U2-ADR-037**.
- ~~Säule-/Komponente-Nummerierung angleichen~~ — **erledigt 24.06.:** Architektur durchgängig „Komponente“ (1 Bürger-App, 2 Lese-App, 3 VC-Issuer, 4 Template-Generator); „Säule“ bleibt dem Geschäftsmodell (Umsatz-Säulen) vorbehalten.

## Umsetzungs-Vermerk (Stufen 0–3 + Invarianten, 24.06.2026)

Der gestufte Bau ist umgesetzt. Die folgenden Punkte ergänzen diesen ADR um Entscheidungen, die erst im Bau entstanden:

- **Stufe 0 — Format.** `docs/template-generator/field-model-schema.json` + `field-model.md` (Vertrag, Übersetzer-Regeln, Speicherform `data.feldDefinitionen[]`, Schema 22→23).
- **Stufe 1 — VC-Issuer.** Definitionen werden ins `credentialSubject.template` durchgereicht statt verworfen.
- **Stufe 2 — Empfang (Bürger-App).** Vokabular-Übersetzer an der `felderAusClaims`-Grenze (feldname→`tpl_`-feldId, bereich-Label→`sektorId`, Code-System-Name→Registry-systemId), additive Aufnahme in `data.feldDefinitionen[]`.
- **Stufe 3 — Render.** Eingewanderte Felder rendern als eigene, inhaltlich benannte Abschnitte am Bereich-Ende im Kern-Look (`feldZeileHTML`); unbekannte Typen werden übersprungen, die Definition bleibt im Depot.

**Entscheidungen über den ursprünglichen ADR hinaus (im Bau gefällt, hier festgehalten):**

1. **Namensraum-Härtung.** Jede Template-`feldId` trägt den reservierten Präfix `tpl_` (verbindlich im Schema, `pattern: ^tpl_[a-z0-9_]+$`). Da Template-Felder und Kern-Felder denselben Wert-Slot `data.sektoren[sektorId][feldId]` teilen, macht der Präfix eine Kollision mit einem Kern-Feld **strukturell unmöglich**; eine zweite Schicht (`_feldDef`) verwirft zusätzlich jede `feldId`, die doch ein Kern-Feld trifft. Verworfene erscheinen namentlich in der Import-Vorschau, der Wert-Slot bleibt unangetastet.
2. **Slug-Kollision → `id-kollision`.** Mappen zwei `feldname`s auf dieselbe `tpl_`-feldId, wird die zweite an der Übersetzer-Grenze verworfen und in der Vorschau **als Template-Fehler** benannt („zwei Felder mit gleichem Namen“) — kein stiller Verlust, kein geteilter Slot. Erste gewinnt.
3. **Übersetzer registry-getrieben.** Code-System-Namen werden gegen die angedockte `@vd-codeliste`-Registry (per Kürzel/URI) aufgelöst — kein klinisches Vokabular in der Kern-Logik hartkodiert (andock-code-Invariante gewahrt). Ein mehrdeutiger Oberbegriff (ein Kürzel, das sich mehrere Listen teilen) bleibt bewusst unaufgelöst → das Feld wird Textfeld.
4. **Inhaltsverzeichnis — konsistente Variante.** Template-Abschnitte bekommen einen Anker, erscheinen im Verzeichnis und zählen zur Drei-Schwelle wie Kern-Abschnitte („auffindbar, nicht versteckt“).

**Invarianten als stehende Tests** (`tests/feldmodell-invarianten.test.js`): (1) Daten-Verbleib über den Krypto-Rundlauf — ein Template-Feld ist nach simuliertem Template-Widerruf in einer **frischen** Instanz allein aus dem Depot rendierbar; (2) Krypto/Provenienz feldId-agnostisch (Voll-Objekt-Verschlüsselung, Block-Pin unberührt); (3) der U2-ADR-036-Selbstauskunft-Guard hält feldId-agnostisch auch für dynamische Felder (selbst erfasst → nie verifiziert-stämmig; signiert-stämmig → erkannt).

Damit sind die beiden offenen Punkte oben — **gestufter Bau** und **Platzierungs-Modell** — eingelöst. Offen bleibt die Spiegelung in der Lese-App (Komponente 2) und Energie als erster realer Pilot.
