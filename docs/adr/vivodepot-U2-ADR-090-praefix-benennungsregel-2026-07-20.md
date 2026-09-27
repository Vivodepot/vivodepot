# U2-ADR-090 · Präfix- und Benennungsregel für den ADR-Nummernraum

**Datum:** 20.07.2026 · korrigiert 20.07.2026 (Abschnitt 5, U2-ADR-015 — s. dort)
**Status:** Angenommen
**Status heute:** gilt — Präfix-Schema aktiv in Gebrauch (jede der 144 Dateien unter `docs/adr/`
folgt ihm); §8 Index-Vollständigkeitsprüfung bleibt laut eigenem Klausel-Feld offen, unverändert.
**Bezug:** interner Aufräumplan vom 17.07.2026 (nennt die Nummerierungs-Klärung „der eine
Knoten, an dem fast alles hängt") · Erhebung ADR-Nummernraum (20.07.2026) ·
`adr-index-u2-linie-2026-07-19.md` · `adr-gueltigkeits-liste-2026-07-19.md` ·
U2-ADR-015 (nachdokumentiert 20.07.2026, korrigiert die ursprüngliche Einordnung hier)

---

## 1 · Der Fund

Zwei ADR-Linien nummerieren unabhängig voneinander bei 1 beginnend: die alte, vor dem
Clean-Slate-Neubau entstandene Linie (internes Repo, ~115 Dateien, im Folgenden
**B16**) und die aktuelle Linie dieses Repos (`docs/adr/`, Präfix `U2-`, 89 Dateien). Im Bereich
009–088 sind die Nummern fast durchgängig doppelt belegt — „ADR-070" ohne Zusatz ist
mehrdeutig, „ADR-089" ebenso (B16-ADR-089 „Lese-Format-Versions-Stempel" vs. U2-ADR-089
„Vorsorge-Instrument-Liste", zwei völlig verschiedene Entscheidungen unter derselben Zahl).

Das Problem ist nicht die doppelte Zahl selbst, sondern die Mehrdeutigkeit der Referenz.

## 2 · Die Entscheidung: Präfixe statt Umnummerierung

**Zwei disjunkte Nummernräume, unterschieden durch Präfix:** `B16-ADR-NNN` und `U2-ADR-NNN`.
Keine bestehende Datei wird umbenannt, umnummeriert oder verschoben. `B16-ADR-070` und
`U2-ADR-070` sind ab sofort zwei verschiedene, eindeutige Namen für zwei verschiedene
Entscheidungen.

**B16 ist beendet und eingefroren.** Es entstehen keine neuen B16-Nummern. Die 18 dort noch
offenen, unentschiedenen Fragen (`adr-gueltigkeits-liste-2026-07-19.md`, Abschnitt B5) bleiben
stehen, wo der Aufräumplan sie sequenziert hat — nach der App-Fertigstellung, nicht Teil dieser
Entscheidung.

**U2 läuft aktiv weiter**, unter dem bestehenden `U2-`-Präfix (bereits durch U2-ADR-001 selbst
so festgelegt — dieser Namensraum existierte also schon vor der heutigen Präzisierung; neu ist
nur die explizite `B16-`-Gegenseite und die Auslegungsregel für Altbestand, s. u.).

**Auslegungsregel für unpräfigierte Altreferenzen:** Jede Referenz ohne Präfix in einem
Dokument, das **vor** dieser Entscheidung (20.07.2026) entstanden ist, meint B16 — die U2-Linie
ist jünger, jede unpräfigierte alte Referenz kann also nur auf B16 zeigen. Kein bestehendes
Dokument muss deshalb nachträglich angefasst werden. **Neue Referenzen, ab heute geschrieben,
tragen immer ein Präfix** — auch dann, wenn sie B16 meinen.

## 3 · Nachtrags-Suffix-Konvention (formalisiert, nicht neu erfunden)

**Ein Nachtrag trägt die Nummer des ADRs, auf das er sich bezieht, plus den Suffix
`-Nachtrag`.** Kein eigener Nummernschlitz, keine Verwechslung mit einem eigenständigen Peer.

Diese Konvention existierte bereits informell und funktionierte: `vivodepot-U2-ADR-077-nachtrag-pdf-qr-2026-07-13.md`
nennt sich selbst „Nachtrag zu U2-ADR-077", und jede der neun externen Fundstellen (sw.js,
acht Testdateien, weitere ADRs) schreibt durchgängig „U2-ADR-077-Nachtrag" oder gleichwertig —
niemals bloß „077" für diese Datei. Die Doppelbelegung U2-077 wird **nicht** umnummeriert;
der bestehende Name ist bereits eindeutig, eine Umnummerierung würde neun korrekt lesende
Fundstellen ändern, um ein Problem zu lösen, das die Benennung schon gelöst hat. Diese ADR
macht die Konvention nur explizit und auffindbar, statt sie beim nächsten Fall erneut zufällig
richtig zu treffen.

## 4 · Verworfene Alternative: dritte, durchlaufende Nummerierung + Mapping-Tabelle

Erwogen und verworfen, aus drei Gründen:

- **Übersetzungsbedarf für unveränderliche Referenzen.** Jede bestehende Referenz — auch in
  bereits veröffentlichten oder bei Dritten eingereichten Dokumenten, die nicht mehr geändert
  werden können — würde übersetzungsbedürftig. Die Präfix-Lösung braucht das nicht: keine
  bestehende Referenz wird ungültig.
- **Erzwungene Einzelentscheidung für 39 stillgelegte ADRs.** Von den 115 B16-Entscheidungen
  sind 27 durch eine U2-ADR abgelöst und 12 zurückgenommen (`adr-gueltigkeits-liste-2026-07-19.md`,
  B2/B3) — macht 39 stillgelegte Fälle, für die eine durchlaufende Nummerierung jeweils
  einzeln entscheiden müsste, ob sie überhaupt eine neue Nummer verdienen. Jede dieser 39
  Einzelentscheidungen hätte ein schlechtes Aufwand-Nutzen-Verhältnis.
- **Die Mapping-Tabelle wäre selbst ein pflegebedürftiges Dokument.** Über zwei Repos hinweg
  (`vivodepot-cleanslate`, internes Repo) müsste sie synchron gehalten werden — ein neues
  Driftrisiko, das die Präfix-Lösung strukturell nicht hat (kein Dokument, das altern kann).

## 5 · Drei Zustände, ausdrücklich benannt (damit später niemand sucht und nichts findet)

**Korrektur (20.07.2026, nachträglich):** Diese Sektion führte U2-ADR-015 ursprünglich als
unbelegte Lücke mit „Phantom-Zitaten". Das war nach dem damaligen Kenntnisstand plausibel —
die anschließende Erhebung ergab ein anderes Bild. Die Zeilen unten sind die korrigierte
Fassung; die sieben zitierenden ADRs waren nie falsch.

**U2-ADR-007 — belegt, keine Lücke.** Die für den Gesundheits-Sektor vorgesehene Nummer wurde am
29.05.2026 eingelöst, gemeinsam mit U2-ADR-005/006/008: „Gesundheits-Sektor — schlank, FHIR über
Template", Status Akzeptiert, sechs FHIR-anschlussfähig geschnittene Feldgruppen mit optionalem
Code-Slot je Eintrag (Andockfall von U2-ADR-006). Der Beschluss ist umgesetzt und im heutigen Code
nachweisbar (`blutgruppe`, `allergien`, `medikamente`, `fachaerzte`, `hauptpflegeperson` u. a. im
Sektor `gesundheit`). Der `Implementations-Verweis` in der 007-Datei selbst nennt Hashes aus der
Historie VOR dem clean-rebuild-Reset und ist dort nicht auflösbar — derselbe Altbestand, den der
Index beim U2-ADR-008-Eintrag vermerkt; er betrifft die Nachweisführung, nicht die Entscheidung.
Die Nummernvergabe-Notiz in U2-ADR-016 („007 ist für den
Gesundheits-Sektor reserviert") war und bleibt zutreffend — sie begründet, warum der
kryptoVersion-3-ADR die 016 bekam. Datei: `vivodepot-U2-ADR-007-gesundheits-sektor-2026-05-29.md`.

**U2-ADR-015 — belegt, nicht unbelegt.** Sieben akzeptierte ADRs (020, 024, 031, 061, 062,
plus sechs Cross-Referenz-Stellen im Meta-Index) zitieren „U2-ADR-015 (D43
Zwei-Ebenen-Persistenz)". Diese Zitate waren korrekt: die Entscheidung wurde am 12.06.2026
angenommen, ist in drei internen Arbeitsdokumenten vollständig beschrieben
(`cc-d43-finalisierung-2026-06-12.md`, `cc-d43-portierungs-inventar-stufe1-2026-06-12.md`,
`cc-produktiv-kanon-adr015-abgleich-2026-06-11.md`) und mit neun `d43-etappeN`-Testdateien
umgesetzt. Was fünf Wochen fehlte, war ausschließlich die kanonische Einzeldatei in
`docs/adr/` — kein unentschiedener Fall, sondern ein nie vollzogener
Veröffentlichungsschritt. Nachgetragen am 20.07.2026:
`vivodepot-U2-ADR-015-interner-verschluesselter-arbeitsstand-2026-06-12.md` (Entscheidungsdatum
12.06.2026 im Kopf der Datei festgehalten, Verschriftlichungsdatum getrennt ausgewiesen).

**U2-ADR-077 mit seinem Nachtrag.** `vivodepot-U2-ADR-077-notfall-qr-kontakte-vcard-2026-07-12.md`
ist die eigenständige Entscheidung (12.07., Commit `6014183`, ~20 externe Fundstellen ohne
Zusatz). `vivodepot-U2-ADR-077-nachtrag-pdf-qr-2026-07-13.md` ist ihr Nachtrag unter der in
Abschnitt 3 formalisierten Suffix-Regel — bleibt unter seinem heutigen Dateinamen, keine
Umnummerierung.

## 6 · Wo die Regel sichtbar wird

`docs/adr/` hatte am 20.07.2026 kein `README.md`. Vorschlag war: eine neue, kurze
`docs/adr/README.md` anlegen, die (a) die Präfix-Regel in vier Sätzen zusammenfasst, (b) auf
diese ADR für den vollen Wortlaut verweist, und (c) die drei benannten Zustände
(007/015/077-Nachtrag) als Stichworte auflistet, damit eine Suche nach „ADR-015" oder „ADR-077"
dort landet, bevor sie in `docs/adr/` selbst erfolglos bleibt.

**Nachtrag 23.07.2026: umgesetzt.** `docs/adr/README.md` ist angelegt (Commit `d2e15ef`) und
trägt alle drei Punkte. Der Vorschlag aus diesem Abschnitt ist damit erledigt; der Absatz bleibt
als Spur stehen, statt ersetzt zu werden.

## 7 · Konsequenzen

- Keine bestehende Datei in `docs/adr/` oder im ADR-Ordner des internen Repos wird umbenannt,
  verschoben oder umnummeriert.
- Ab sofort tragen neue Referenzen auf B16-Inhalte explizit `B16-` (bislang war das implizit,
  weil B16 die einzige Linie war).
- Neue Nachträge folgen der Suffix-Konvention aus Abschnitt 3, ohne weitere Entscheidung.
- Kein Schema-Bump, keine Code-Änderung — reine Dokumentations-/Konventionsentscheidung.

## 8 · Nachtrag 23.07.2026 — Index-Vollständigkeit als prüfbare Aussage

Der Anlass ist ein Fund, nicht eine Idee: Am 23.07.2026 endete `vivodepot-U2-INDEX-2026-05-29.md`
bei U2-ADR-082, während `docs/adr/` bereits bis 097 reichte. Beim Nachtragen fielen drei weitere
Lücken auf, die niemandem aufgefallen waren — die beiden Nachträge zu U2-ADR-062 und U2-ADR-077
fehlten vollständig, und der Dateiverweis von U2-ADR-015 zeigte noch auf das Finalisierungs-Paket
statt auf die in Abschnitt 5 nachgetragene kanonische Datei. Achtzehn Einträge, entstanden in
fünf Wochen, keiner davon bemerkt.

Das ist dieselbe Fehlerklasse, die diese ADR in Abschnitt 5 für U2-ADR-015 beschreibt: nicht eine
unentschiedene Frage, sondern ein nie vollzogener Schritt, den niemand vermisst, weil nichts ihn
einfordert. Der Unterschied ist, dass sie hier mechanisch messbar ist — die Prüfung liest ein
Verzeichnis und eine Textdatei, mehr braucht sie nicht.

**Die Prüfung zählt Dateien, nicht Nummern.** Damit sind Nachträge automatisch mitgemeint, ohne
dass Abschnitt 3 angefasst werden muss: Ein Nachtrag hat nach jener Regel keine eigene Nummer,
aber er ist eine eigene Datei und braucht deshalb einen eigenen Index-Eintrag (heute erfüllt für
U2-ADR-062-Nachtrag, U2-ADR-077-Nachtrag und U2-ADR-089-Nachtrag). Hätte die Aussage auf Nummern
statt Dateien gezielt, hätte sie genau die drei Fälle übersehen, deren Fehlen den Nachtrag
ausgelöst hat.

Ausgenommen sind die beiden Dateien in `docs/adr/`, die keine Entscheidung tragen: `README.md`
(Abschnitt 6) und die Index-Datei selbst.

## Konformität

```
status: offen
pruefungen:
  - adr-index-jede-datei-hat-eintrag
  - adr-index-jeder-eintrag-hat-datei
bedeutung: >
  Jede ADR-Datei unter docs/adr/ hat genau einen Index-Eintrag, und jeder
  Index-Eintrag zeigt auf eine existierende Datei. Die Prüfung gilt in beide
  Richtungen, zählt Dateien statt Nummern (Nachträge sind damit erfasst) und
  nimmt README.md sowie die Index-Datei selbst aus.
```

Status `offen` nach dem Klausel-Papier vom 23.07.2026: prüfbar, aber noch nicht geschrieben —
zählt als offene Schuld, erscheint im Bericht, blockiert nichts. Der Stand vom 23.07.2026 ist von
Hand in beide Richtungen geprüft (100 Dateien, 100 Einträge, kein Verweis ohne Datei, keine Datei
ohne Verweis); von Hand geprüft ist nicht dasselbe wie maschinell gesichert, und genau deshalb
steht hier `offen` und nicht `prüfbar`.

**Zum Zeitpunkt — bewusst nicht von einer fremden Bedingung abhängig gemacht.** Diese Prüfung
braucht keine Integritäts-Registry und keinen Prüfstand; sie liest ein Verzeichnis und eine
Textdatei. Sie an eine Bedingung zu hängen, die sie nicht braucht, machte sie ohne Gewinn später.
Vorgeschlagen ist deshalb ein eigener, früherer Termin (Richtwert 30.09.2026), gebunden allein
daran, dass der Vorsorge-Umbau geschlossen ist — vorher wird an dieser Stelle nichts gebaut. Das
Datum ist ein Vorschlag, kein Beschluss: Es setzt das Umbau-Ende voraus, das andernorts bereits
feststeht und in diesem Dokument nicht verzeichnet ist.

---

*Vivodepot GmbH · Berlin · 20.07.2026 · Abschnitt 8 nachgetragen 23.07.2026*
