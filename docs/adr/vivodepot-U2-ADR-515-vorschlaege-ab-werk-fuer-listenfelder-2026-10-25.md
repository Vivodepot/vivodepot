# U2-ADR-515: Vorschläge ab Werk für Listenfelder — vorgeschlagen, nie eingetragen

**Status:** Angenommen (25.10.2026)
**Datum:** 25.10.2026
**Kategorie:** BEREICHE, PRO
**Linie:** U2
**Status heute:** gilt — die Probe zu den Vorschlägen ab Werk hält es; sie bleibt mit den übrigen Pro-Proben drinnen.
**Bezug:** Pro-Spezifikation, Posten E14 („Vorbefüllte Listen im Fahrplan der ersten Tage, DE und EN“) · U2-ADR-243 (Pro-Feldsatz) ·
U2-ADR-467 (Anschrift-Vorschlag mit „Übernehmen“, dieselbe Haltung) · U2-ADR-428 (Deutsch ist ein Sprachmodul)

## Frage

Der Pro-Bereich „Kontakte und Vertretung“ führt vier Listen „Erste Schritte …“ (wenn die Inhaberin verhindert ist, im Todesfall, wenn
kein Ende absehbar ist, bei Verkauf oder Übergabe). Ausgeliefert wurden sie leer. Ein geprüfter Fahrplan mit den üblichen ersten
Schritten soll mitkommen, in DE und EN. Darf das Produkt dafür Einträge in die Datei schreiben?

## Entscheidung

1. **Vorschlag, kein Eintrag.** Ein Listenfeld darf `vorschlaegeAbWerk: <n>` tragen, die Zahl der vorgeschlagenen Einträge. Solange die
   Liste leer ist, zeigt der Kern die Vorschläge über dem ersten Eintrag, als Hinweis, mit dem Knopf „Vorgeschlagene Schritte
   übernehmen“. Erst der Knopf legt sie als Einträge an; danach ändert oder streicht die Person jeden wie einen eigenen.
2. **Nie überschreiben, nie ungefragt.** Übernommen wird nur in eine leere Liste. Eine Liste mit Einträgen zeigt keinen Vorschlag.
   Beim Anlegen eines Depots entsteht nichts. Darum braucht eine ältere Datei keine Migration, und die Person hält einen Vorschlag
   nie für eine eigene Angabe.
3. **Die Texte stehen im Sprachmodul.** Je vorgeschlagenem Unterfeld eine Kennung der neuen Textart `vorschlag`,
   `<bereich>.<feld>/<unterfeld>.vorschlag`, mit einer Zeile je Vorschlag in der Reihenfolge der Vorschläge. Die Art wird nur beim
   Zeichnen gelesen (wie `weitererEintrag`), nie auf den Knoten gefüllt. Passt die Zahl der Zeilen eines Unterfelds nicht zu `n`,
   zeigt der Kern keinen Vorschlag. Eine Kennung je Eintrag (`vorschlag<i>`) ist mit der Kennungsform des Textsatzes nicht möglich:
   die Art besteht nur aus Buchstaben.
4. **Nur ab Werk.** Ein Bereich aus einer fremden Datei verliert `vorschlaegeAbWerk` beim Einlass, wie jede Eigenschaft außerhalb der
   geschlossenen Liste.
5. **Inhalt geprüft.** Die Vorschläge im Fahrplan der ersten Tage hat die Rechtsraum-Prüfung und danach eine unabhängige Prüfung, die
   den Text nicht geschrieben hat, an den zitierten Vorschriften gelesen. Sie sind rechtsformneutral und fragen nach keinem
   Zugangsgeheimnis.

## Folgen

- Die Fähigkeit gilt für alle Produkte. Heute tragen sie nur die vier Pro-Listen.
- Die Probe dazu baut die Pro-Produkte und bleibt darum drinnen, wie die übrigen Pro-Proben. Sie hält in pro-de und pro-en: jede
  leere Liste zeigt genau ihre Vorschläge, das Übernehmen legt genau diese an, ein zweites Übernehmen und eine Liste mit eigenem
  Eintrag bleiben unberührt; dazu der Rot-Beweis ohne die Leer-Bedingung und ein Klassenwächter über alle Bereichs-Templates
  (Zeilenzahl in DE und EN, dieselben Unterfelder, kein „Notfall“ oder „Ausfall“).
- Die Lese-App zeigt Vorschläge nicht; sie hat keine Eingabe.

## Grenzen

- Ein Vorschlag sagt, was üblich ist, nicht, was im Einzelfall rechtlich geboten ist.
- Weitere Listen mit Vorschlägen brauchen eigene Inhaltsprüfung, bevor sie `vorschlaegeAbWerk` bekommen.
