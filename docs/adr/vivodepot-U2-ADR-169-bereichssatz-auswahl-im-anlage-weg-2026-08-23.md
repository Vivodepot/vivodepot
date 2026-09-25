# U2-ADR-169: Der Bereichssatz bekommt seinen ersten Aufrufer — Auswahl im Anker-Anlage-Dialog

**Status:** überholt (24.08.2026) — s. Nachtrag am Ende. Der Mechanismus (U2-ADR-160) bleibt,
diese ADR beschreibt nur noch, WARUM die hier getroffene Platzierung wieder entfernt wurde.
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, ANLAGE-WEG
**Grundlage:** Produktentscheidung vom 23.08.2026 — der Bereichssatz-Mechanismus aus
U2-ADR-160 (Schnitt Glied 2, Etappe 2g) sollte eine Oberfläche bekommen; vor dem Bau erst messen,
wo im bestehenden Anlage-Weg eine Auswahl sicher sitzt, statt den naheliegendsten Ort zu raten.
- **Code-Stelle:** `vivodepot.html` — `_bereichssatzAuswahlHTML`/`_bereichssatzAuswahlLesen`
  (neu), `_depotIdentitaetUndPasswortAbfragen` (Einbettung, `sub:false` und
  `opts.bereichssatzAuswahl` gleichzeitig nötig), `flowDepotAnlegen`/
  `flowEigenesDepotAusSubWunsch` (setzen das Flag), `_ankerAusIdentitaetFinalisieren` →
  `_depotAusPasswortFinalisieren` → `depotAnlegen` (Durchreichen), drei neue STRINGS.
- **Status heute:** überholt, KEIN Nachfolger — diese Platzierung wurde zurückgenommen, nicht ersetzt: `flowDepotAnlegen`/`flowEigenesDepotAusSubWunsch` setzen das Flag nicht mehr; `_bereichssatzAuswahlHTML`/`_bereichssatzAuswahlLesen` bleiben im Kern stehen, unverändert korrekt (belegt in `tests/bereichssatz-auswahl-anlage.test.js`), nur ohne Aufrufer in diesen beiden Dialogen. Der Bereichssatz-MECHANISMUS selbst (U2-ADR-160) bleibt unverändert bestehen — nur die hier beschriebene UI-Platzierung ist entfallen, s. Status-Feld oben.
  *(Nachtrag 29.08.2026, ADR-Lücken-Prüfung: geprüft, ob ein Nachfolger existiert — keiner gefunden, die Zurücknahme war bereits am Dateikopf klar, hier nur ausdrücklich nachgetragen.)*

---

## Der gemessene Befund

U2-ADR-160 hatte den Mechanismus (`depotAnlegen(password, {bereichssatz})`) gebaut, aber
ausdrücklich OHNE Aufrufer — bis heute rief ihn niemand mit einer echten Auswahl auf. Vor dem Bau
einer Oberfläche wurde gemessen, wie ein Depot heute tatsächlich entsteht: zwei getrennte Wege.
Weg A (Setup-first, der weitaus häufigere): die Bürgerin betritt über die Startseite eine
passwortlose Vorschau (`vorschauDepotErzeugen`, IMMER alle zwölf Bereiche) und kann darin bereits
Daten eintragen, bevor sie ein Passwort setzt — das Passwort-Setzen selbst läuft über
`flowPasswortSetzen`, ein bewusst reibungsarmes Modal OHNE Namensfelder, gedacht für Panik-Momente
(D1/D2/D3-Eintritte). Weg B (ausdrückliches Anlegen, seltener, aber der einzige Kaltstart-Pfad):
`flowDepotAnlegen` fragt Vorname/Nachname/Passwort in einem Dialog ab, BEVOR ein Depot existiert.

Nur Weg B bietet einen Moment, in dem eine Auswahl VOR jeder Dateneingabe sicher sitzt. Eine
Auswahl in `flowPasswortSetzen` einzubauen, hätte bedeutet, sie in genau den Momenten zu zeigen,
für die dieses Modal bewusst reibungsarm gehalten wird — und hätte nichts an der Tatsache
geändert, dass in diesem Moment ggf. schon Vorschau-Daten in gerade den Bereichen stehen, die
abgewählt würden.

## Entscheidung

**Der Anker-Anlage-Dialog bekommt die Auswahl, Sub-Depots und das Panik-Passwort-Modal nicht.**
`_bereichssatzAuswahlHTML()` rendert alle zwölf eingebauten Sektoren als vorausgewählte
Checkboxen unter einem eingeklappten `<details>` — Niedrigschwelligkeit zuerst: wer nichts
abwählt, bekommt exakt das heutige Verhalten (`bereichssatz: null`, alle zwölf).

**Die Auflage "darf ein bestehendes Depot nicht verändern" ist gelöst durch Vorauswahl + Sperre,
nicht durch einen Rückweg.** Existiert beim Öffnen des Dialogs bereits eine befüllte Vorschau
(`imVorschau()`, z. B. weil ein anderer Kern-Wächter — "kein Listen-Eintrag vor dem Akteur" —
mitten in der Vorschau auf `flowDepotAnlegen()` verweist), wird jeder Bereich mit vorhandenen
Daten (`sektorHatDaten`) vorausgewählt UND als `disabled` gerendert: abwählbar ist nur, was noch
leer ist. Ein Rückweg-Mechanismus (Daten aus einem abgewählten, aber befüllten Bereich retten)
war für DIESEN Anlass nie nötig und ist darum nicht gebaut — `_bereicheVerwaisteRetten`
(U2-ADR-050) liefe ohnehin erst beim nächsten Öffnen einer Datei, nicht bei der Erst-Anlage im
Speicher, wäre also kein tragfähiger Ersatz gewesen.

**`_bereichssatzAuswahlLesen()` liefert `null` statt einer Liste aller zwölf**, wenn niemand
abgewählt hat — dieselbe Bedeutung, die `depotAnlegen`/`bereicheAlle` für "kein Bereichssatz
gesetzt" bereits kennen, statt eine zweite, gleichwertige Form einzuführen.

## Was NICHT in dieser ADR steht

**Keine Möglichkeit, den Bereichssatz nach der Anlage zu ändern.** Der Erklärungstext im Dialog
sagt das ausdrücklich ("eine spätere Änderung ist heute nicht vorgesehen") — ein nachträgliches
Erweitern oder Verengen des Bereichssatzes eines bestehenden Depots ist ein eigener, hier nicht
gebauter Bau.

**Keine Auswahl für Sub-Depots.** Sub-Depots laufen über einen eigenen Mechanismus
(`subDepotAnlegen`), niemals über `depotAnlegen` — der Bereichssatz betrifft strukturell nur
Anker-Depots.

---

## Nachtrag (24.08.2026) — ENTFALLEN, CW-ROLLE-2

**Der Befund:** In einer Testrunde wirkte die Auswahl beim Anlegen „doppelt" — ein Anlass war
gerade schon gewählt. Geprüft, nicht angenommen: der bereichssatz-MECHANISMUS (U2-ADR-160)
kommt vom Kanzlei-/Institutions-Fall dort selbst genannt („ein Kanzlei-Depot, das gesundheit gar
nicht führt") — eine gewöhnliche Bürgerin, die ihr eigenes Depot anlegt, hat nie einen Grund,
vorab einen der zwölf Bereiche abzuwählen. Diese ADR hatte die Auswahl aber in den EINZIGEN,
UNIVERSELLEN Anlage-Weg gelegt, den jede Bürgerin durchläuft — nicht, weil die Modulstruktur das
verlangte, sondern weil zum Zeitpunkt dieser ADR kein eigener Kanzlei-/Institutions-Anlage-Weg
existierte, an den die Auswahl stattdessen hätte gehen können.

**Produktentscheidung (24.08.2026):** Mechanismus bleibt unangetastet (U2-ADR-160), die
Auswahl-Oberfläche bleibt im Kern stehen — nur der Aufrufer in `flowDepotAnlegen`/
`flowEigenesDepotAusSubWunsch` ist entfernt. Kein Datenverlust, keine Migration: ein Depot ohne
Auswahl verhält sich exakt wie vor dieser ADR (`bereichssatz: null`, alle zwölf). Bereit für
einen künftigen, eigenen Kanzlei-/Institutions-Anlage-Weg, der die Auswahl an der richtigen
Stelle wieder aufgreifen kann.

---

*Vivodepot GmbH · 23.08.2026*
