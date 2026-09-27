# Priorisierung und Nachweis bei Schwachstellen

**Stand:** 29.07.2026 · **Entscheiderin:** Geschäftsführung · **Schließt:** ENISA-Frage 3.4 und 3.5

---

## Warum eine eigene Skala

CVSS misst gegen ein Server-Modell: Netzzugriff, Rechteausweitung, Verfügbarkeit eines
Dienstes. Vivodepot hat keinen Dienst, keinen Netzzugriff und keine Konten. Eine hohe
CVSS-Zahl kann hier gegenstandslos sein, eine niedrige existenzbedrohend. Die Einstufung
richtet sich deshalb nach dem, was das Produkt tatsächlich zusagt.

## Die vier Stufen

**Kritisch — Reaktion sofort, Korrektur binnen 7 Tagen.**
Die Vertraulichkeit der Depot-Datei ist gebrochen oder umgehbar: Fehler in Schlüsselableitung,
AES-GCM-Verwendung oder Salt-Behandlung; ein geheimer Schlüssel wird auslesbar; die
Signaturprüfung institutioneller Vorlagen ist umgehbar; die Anwendung sendet Daten nach außen.
Jeder dieser Fälle widerspricht einer öffentlich gemachten Zusage.

**Hoch — Reaktion binnen 24 Stunden, Korrektur binnen 30 Tagen.**
Stiller Datenverlust oder stille Datenverfälschung; Provenienz wird falsch gestempelt; ein
Prüf-Gate blockiert nicht mehr, was es blockieren soll; eine eingebettete Bibliothek trägt
eine ausnutzbare Schwachstelle auf einem im Produkt erreichbaren Pfad.

**Mittel — Korrektur im nächsten Release.**
Fehlverhalten mit sichtbarer Wirkung, das weder Vertraulichkeit noch Datenbestand berührt;
Schwachstelle in einer Bibliothek auf einem im Produkt nicht erreichbaren Pfad.

**Niedrig — nach Aufwand, mindestens dokumentiert.**
Härtung ohne konkreten Angriffsweg; Befunde in Werkzeugen und Tests, die nicht ausgeliefert
werden.

## Ein Sonderfall bleibt außerhalb der Skala

Ein OSV-Fund blockiert unabhängig von der Stufe den Commit. Diese Null-Toleranz ist bei zwei
Abhängigkeiten tragfähig und wird nicht aufgeweicht; die Stufe entscheidet dann nur noch über
Meldepflicht und Kommunikation, nicht über die Frage, ob korrigiert wird.

## Register

Jede eingegangene Meldung wird in `docs/cra/schwachstellen-register.md` erfasst, auch die
abgelehnte: Eingangsdatum, Melderin oder Melder, Stufe, Begründung der Stufe, Status,
Datum der Korrektur, Datum der Veröffentlichung. Ein Register, das nur Treffer führt, kann
nicht belegen, dass abgelehnt wurde und warum.

## Nachweis der Behebung

Die im Haus geübte Methode wird auf Schwachstellen angewandt: **Zu jeder Korrektur gehört eine
Probe, die vor der Korrektur rot ist.** Ohne sie ist nicht belegt, dass die Korrektur den
gemeldeten Weg trifft und nicht bloß ein benachbartes Symptom.

Der Nachweis besteht aus drei Zeilen im Register: Dateiname der Probe, Commit vor der
Korrektur mit rotem Ergebnis, Commit nach der Korrektur mit grünem Ergebnis.

## Anschluss an die Meldepflicht

Stufe kritisch oder hoch **und** Anhaltspunkte für aktive Ausnutzung: sofort in den Meldeprozess
nach CRA Art. 14 (Frühwarnung an das BSI). Die 24-Stunden-Frist läuft ab Kenntnis, nicht ab Einstufung —
die Einstufung folgt der Frühwarnung, sie geht ihr nicht voraus.
