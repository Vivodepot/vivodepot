# U2-ADR-173: Notfall-Widerruf — ein schmaler, schneller Weg für die Sperrliste, getrennt vom Feature-Release

**Status:** Akzeptiert
**Datum:** 25.08.2026
**Kategorie:** SICHERHEIT, PROZESS
**Status heute:** gilt — Werkzeug (`tools/widerruf-notfall-veroeffentlichen.js`) und sieben Tests
liegen in diesem Commit bereits vor, nicht erst als Ankündigung.

**Grundlage:** U2-ADR-009 (Vivodepot greift nie selbst auf eine URL zu — absolut, geprüft),
U2-ADR-172 (die Zwischenstufe, deren kaskadierender Widerruf über dieselbe Sperrliste läuft),
`tools/build-widerrufsliste.js` (A405 Zug 2 — die Sperrliste des Kerns wird bereits generiert in
die Lese-App gespiegelt, mit `--check`-Gate).

**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html:4180` (`WIDERRUFS_LISTE`, fest eingebettetes Array; Zeile
  nachgezogen am 01.09.2026 — Zeilen verschieben sich mit jedem Zug, ursprünglich ~3834).
- **Betroffener gemeinsamer Weg:** `tools/build-widerrufsliste.js` (Spiegelung Kern → Lese-App),
  `sw.js` (`CACHE`-Version, steuert die Service-Worker-Aktualisierungsprüfung).
- **Spec-Bezug:** löst die in U2-ADR-172 offen benannte Lücke „Verteilung eines Widerrufs an
  bereits ausgelieferte Depots" teilweise — für Depots, die über eine gehostete, service-worker-
  fähige Instanz laufen. Für rein offline verwendete, heruntergeladene Kopien bleibt die Lücke
  bestehen (s. u.).

**Kein ADR wird abgelöst.** U2-ADR-009 bleibt unangetastet — dieses ADR fügt keinen Netzzugriff
im Kern hinzu und ändert daran nichts.

---

## Kontext

Ein kompromittierter Anbieter-Schlüssel wird über die Sperrliste geprüft — aber die Sperrliste
selbst ist Teil derselben, im Kern eingebetteten Datei wie jedes andere Feature. Eine Aktualisierung
läuft heute durch denselben Weg wie eine Funktionsänderung: volle Prüfung, Dokumentation, Freigabe.
Für einen akuten Fall (Stunden zählen, nicht Wochen) ist dieser Weg zu langsam — nicht weil die
Prüfung selbst lange dauert, sondern weil der gesamte Vorlauf (Auftrag, Abstimmung, Bericht) für
eine einzelne, dringende Änderung unverhältnismäßig ist.

**Was dieses ADR NICHT lösen kann und nicht versucht:** U2-ADR-009 verbietet dem Kern jeden
eigenen Netzzugriff, absolut und geprüft. Der einzige technisch mögliche Verteilweg für eine neue
Sperrliste bleibt eine neue Kern-Fassung, die über die bestehende Service-Worker-
Aktualisierungsprüfung (`registration.update()`) an bereits installierte, gehostete Instanzen
gelangt. Das gilt nur für Bürgerinnen, die die Anwendung online — und sei es selten — erneut
aufrufen. Rein offline verwendete, heruntergeladene Dateien erreicht kein Widerruf, durch keinen
technischen Weg. Das ist der bewusste Preis des Offline-Versprechens, keine Lücke dieses ADR.

## Entscheidung

**Ein eigener, schmaler Weg — nur für Sperrlisten-Einträge, sonst nichts:**

1. Ein dediziertes Werkzeug fügt genau einen oder mehrere Thumbprints der Sperrliste hinzu — keine
   andere Änderung an `vivodepot.html` in derselben Ausführung.
2. Es hebt `SCHALEN_STAND` und `sw.js`s `CACHE` im Lockstep an (wie jede reguläre Änderung) und
   ruft `tools/build-widerrufsliste.js`, damit die Lese-App-Spiegelung nicht driftet.
3. **Anzeigen vor dem Schreiben, mit Bestätigung** — derselbe Grundsatz wie bei der
   Anker-Zeremonie: der einzutragende Thumbprint (und, falls bekannt, die betroffene
   Anbieter-Kennung) steht im Klartext, bevor irgendetwas geschrieben wird. Ein falsch
   eingetragener Widerruf sperrt Bürgerinnen grundlos aus — das ist der eine fehleranfällige
   Handgriff dieses Wegs.
4. **Kein Hook-Bypass, keine Sonderregel für Tests.** Die volle Suite läuft wie bei jeder anderen
   Änderung — die Beschleunigung liegt im strukturierten, einzweckigen Werkzeug und im Wegfall des
   sonst üblichen Vorlaufs (Auftrag, Abstimmung, Bericht VOR dem Bau), nicht im Auslassen von
   Prüfungen.
5. **Kein Netzzugriff, keine Ausnahme von U2-ADR-009.** Der Weg endet an einer geänderten Datei und
   dem normalen Commit-/Push-Vorgang — die Auslieferung läuft ausschließlich über den bestehenden
   Service-Worker-Mechanismus.

## Verworfene Alternativen

- **Der Kern holt die Sperrliste selbst per Fetch nach.** Verworfen ohne Abwägung — widerspricht
  U2-ADR-009 unmittelbar, dem zentralen, geprüften Vertrauensversprechen des Produkts.
- **Denselben vollen Feature-Release-Prozess beibehalten.** Verworfen: löst das Zeitproblem nicht,
  das dieses ADR beheben soll.
- **Hook-Bypass (`--no-verify`) für Notfälle erlauben.** Verworfen: eine Sperrliste, die ohne
  Prüfung ausgeliefert wird, ist genau die Art Fehlerquelle, gegen die die Sperrliste selbst
  schützen soll.

## Was offen bleibt

**Die Informationsverfahren für Bürgerinnen, die eine neue Fassung nicht automatisch erreicht**
(Website-Hinweis, gezielte Ansprache bekannter Käuferinnen von Pro-Modulen) sind ein eigener,
getrennt zu entwerfender Gegenstand — kein technischer Verteilweg, sondern Kommunikation außerhalb
der Anwendung.

**Wer außer der üblichen Bedienperson darf oder kann das Werkzeug im Ernstfall ausführen — keine
Regel hier, bewusst nicht entschieden.** Ein Weg, der ausdrücklich für "Stunden zählen, nicht
Wochen" gebaut ist, braucht eine Aussage dazu, ob es eine Vertretung gibt (Bus-Faktor) — oder eine
bewusste, dokumentierte Entscheidung, dass es keine gibt. Das ist keine technische Frage, gehört
nicht in dieses Werkzeug, sondern in eine eigene Entscheidung.

**Kein Frische-/Alters-Konzept für die Sperrliste selbst.** Anders als z. B. IEEE 1609.2 (V2X-
Zertifikatswiderruf, `nextCrl`-Feld: eine überfällige Sperrliste macht ein Zertifikat aktiv
"dubious", statt es stillschweigend als geprüft zu behandeln) trägt `WIDERRUFS_LISTE` keine
Alters-Information — eine sechs Monate alte, nie aktualisierte Liste wird identisch zu einer
frischen behandelt, ohne dass die Prüfung selbst das bemerkt. Das ist dieselbe Lücke, die oben
schon als "Verteilung erreicht nicht jede Bürgerin" benannt ist, nur von der anderen Seite
betrachtet: nicht nur "kommt eine neue Liste an", sondern "weiß die Prüfung, wie alt ihre eigene
Liste ist". [Wahrscheinlich eine sinnvolle Ergänzung — nicht geprüft, ob und wo Vergleichbares
(ETSI/ITU-T X.509 CRL/OCSP) näher läge; keine marktbreite Standardsuche gemacht.] Nicht Gegenstand
dieses ADR, hier nur benannt.

## Nachtrag (Reichweite präzisiert durch U2-ADR-186, 2026-09-01)

Dieses ADR beschreibt den schnellen Weg, einen Widerruf in `WIDERRUFS_LISTE` einzutragen und über
den Service-Worker zu **neuen** Kern-Fassungen zu verteilen. Es sagt nichts darüber, ob ein
Bestandsdepot, das ein inzwischen widerrufenes Modul bereits eingelassen hat, dieses Modul beim
Öffnen weiter zeigt. U2-ADR-186 misst das nach: der Ladeweg fragt `WIDERRUFS_LISTE` nicht. Ein
Notfall-Widerruf über diesen Weg wirkt darum auf **neue Einlässe**, nicht auf bereits eingelassene
Module in bestehenden Depots — dieselbe Grenze, die dieses ADR selbst schon unter „Was offen
bleibt" für die Software-Verteilung beschreibt, gilt symmetrisch auch für die Depot-Daten. Kein
Ablösen, nur eine benannte Grenze.
