# Unterstützungszeitraum und Produktende

**Stand:** 29.07.2026, Zusage nachgezogen 15.09.2026 (Produktentscheidung: ab jeder Fassung statt ab v1.0) · **Grundlage:** ADR-034 · **Schließt:** ENISA-Frage 4.2

---

## Zusage

Jede ausgelieferte Fassung von Vivodepot erhält **mindestens fünf Jahre**
Sicherheitsaktualisierungen, gerechnet ab dem Tag, an dem diese Fassung herauskommt. Jede
ausgelieferte Aktualisierung bleibt danach **mindestens zehn Jahre** abrufbar.

Das ist eine **Mindestzusage**. Sie läuft je Fassung, nicht einmal ab dem v1.0-Tag: Wer eine
spätere Fassung bekommt, ist genauso lange abgedeckt wie wer die erste bekam. Das Datum, ab
dem der Zeitraum einer Fassung läuft, steht in ihrer Versionsnote.

## Was Unterstützung je Auslieferungsvariante bedeutet

**Datei-Variante.** Die ausgelieferte HTML-Datei bleibt bewusst eingefroren; sie holt sich
nichts nach. Unterstützung heißt hier: Für jede sicherheitsrelevante Korrektur wird eine
neue Datei bereitgestellt, ihr SHA-256 veröffentlicht, und der Anlass in der Versionsnote
benannt. Der Umstieg ist ein bewusster Schritt der Halterin.

**Gehostete PWA.** Aktualisiert sich über den Service Worker. Zusätzlich ein von der Nutzerin
ausgelöster, datenfreier Versions-Check und eine optionale Sicherheitsupdate-Mail mit
getrennter Einwilligung.

**Institutionelle White-Label-Fassungen.** Es gilt dieselbe Regel: die Frist läuft je Fassung
ab deren Auslieferung. Was darüber hinaus vereinbart wird, gehört in den Vertrag, nicht in
dieses Dokument.

## Produktende

Ein Ende der Unterstützung wird **zwölf Monate im Voraus** angekündigt: auf der Webseite, in
der Versionsnote und gegenüber Institutionen-Partnern schriftlich. Die Ankündigung nennt das
Datum, ab dem keine Sicherheitsaktualisierungen mehr erscheinen, und den Stand, auf dem das
Produkt endet.

**Das Ende der Unterstützung beendet nicht die Benutzbarkeit.** Die Depot-Datei liegt beim
Bürger, die Anwendung braucht keinen Dienst, und der Quellcode steht unter EUPL-1.2. Nach
dem Ende bleibt die Datei lesbar, entschlüsselbar und exportierbar, und jeder Dritte darf die
Anwendung weiterführen. Das ist der Unterschied zu einem Dienst, der abgeschaltet wird, und
es ist die Antwort auf die Frage, die eine Beschaffungsstelle hinter der Support-Frage
eigentlich stellt.

## Textbaustein für `SECURITY.md`, README und Verträge

> **Unterstützungszeitraum.** Jede Fassung von Vivodepot erhält mindestens fünf Jahre
> Sicherheitsaktualisierungen ab dem Tag, an dem sie herauskommt; jede Aktualisierung bleibt
> mindestens zehn Jahre abrufbar. Ein Ende der Unterstützung wird zwölf Monate im Voraus
> angekündigt. Da die Anwendung offline arbeitet, ohne Dienst auskommt und unter EUPL-1.2
> steht, bleiben Depot-Dateien auch nach dem Ende der Unterstützung lesbar und exportierbar,
> und die Anwendung darf von Dritten weitergeführt werden.

Der Baustein ist ohne Änderung übernehmbar. Er gehört an drei Stellen: `SECURITY.md`
(neuer Abschnitt vor „Unterstützte Versionen"), README (Abschnitt „Was Sie erwarten können")
und in jeden Institutionen-Vertrag.
