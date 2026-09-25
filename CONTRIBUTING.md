# Mitwirken bei Vivodepot

## Wie Beiträge aufgenommen werden

Beiträge sind willkommen: Fehlermeldungen, Verbesserungen und neue Module. Der Kern bleibt bewusst
schlank. Themen gehören in Module, darum passt nicht jeder Vorschlag in den Kern, aber fast jeder
als Modul. Jeder Pull Request wird vor der Aufnahme geprüft; wie, steht unten unter „Zur Prüfebene".

## Einen Fehler melden

Über ein [Issue](../../issues/new/choose) mit der Vorlage „Fehlermeldung". Browser,
Betriebssystem und die Schritte zum Nachstellen helfen am meisten.

**Nie eine Depot-Datei oder echte Daten an ein Issue anhängen.** Ein Depot ist verschlüsselt,
aber ein öffentliches Issue ist der falsche Ort dafür — auch verschlüsselt.

**Sicherheitslücken gehören nicht in ein öffentliches Issue.** Siehe [`SECURITY.md`](SECURITY.md).

## Einen Vorschlag machen

Ebenfalls über ein Issue, Vorlage „Vorschlag". Beschreiben, welches Problem der Vorschlag löst —
nicht nur, welche Lösung er vorschlägt.

## Einen Pull Request einreichen

Ein Pull Request braucht:

- eine kurze Beschreibung, was sich ändert und warum,
- bei einer Verhaltensänderung: eine Beschreibung, wie sie sich nachvollziehen lässt (Schritte,
  erwartetes Ergebnis).

**Zur Prüfebene:** Der größte Teil der Proben liegt in `tests/` bei, ein kleinerer Teil bleibt
intern — [`docs/pruefebene.md`](docs/pruefebene.md) beschreibt, wie geprüft wird. Ein eingereichter
Beitrag läuft vor der Annahme zusätzlich gegen die vollständige interne Suite; das ist Teil der Prüfung durch die Maintainerin,
nicht etwas, das die einreichende Person selbst vorab belegen kann.

Kein Pull Request wird allein wegen seines Umfangs abgelehnt — aber ein kleinerer, begründeter
Schnitt ist leichter zu prüfen als ein großer.

## Für einen anderen Rechtsraum oder eine andere Sprache

Vivodepot folgt dem Grundsatz „enable, don't deliver" ([`PRINCIPLES.md`](PRINCIPLES.md)): Das
Projekt baut und liefert nicht selbst Inhalte für jeden Rechtsraum, sondern will es anderen
möglich machen — ohne den Kern-Mechanismus zu forken.

Wer das Repository klont und für ein anderes Land oder eine andere Sprache anpassen will, findet
die Anleitung in [`docs/JURISDICTIONS.md`](docs/JURISDICTIONS.md) (englisch): fünf Schichten mit
fünf verschiedenen Ständen, was heute allein und ohne Änderung am Kern möglich ist (ein
Rechtsraum-Modul, Schicht 1; seit 17.08.2026 auch ein `textsatz`-Modul für Schicht 2–4, siehe unten),
und was dafür noch niemand gebaut hat (vor allem: ein Umschalter in der Oberfläche, mit dem eine
Bürgerin die Sprache tatsächlich wählen könnte). Das Dokument ist eine Karte dessen, was
existiert, was nicht existiert und wo die Grenzen liegen, damit sich Arbeit planen lässt, statt
Lücken einzeln zu entdecken.

Vor einem größeren Beitrag in diese Richtung lohnt das Gespräch mit der Maintainerin: mehrere
Grundsatzfragen sind dort ausdrücklich noch nicht entschieden.

## Lizenz der Beiträge

Das Projekt steht unter [EUPL-1.2](LICENSE). Wer beiträgt, stimmt zu, dass der Beitrag unter
derselben Lizenz steht.

## Was hier nicht hineingehört

Die internen Arbeitsregeln des Projekts sind kein Inhalt dieses Dokuments — sie gelten für die
Entwicklung, nicht für die Mitwirkung von außen.
