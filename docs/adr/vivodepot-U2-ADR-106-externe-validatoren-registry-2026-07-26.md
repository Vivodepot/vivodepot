# U2-ADR-106: Ein Ort für externe Autoritäten — Validator-Registry und Zusagen-Wächter

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** PRÜF-ARCHITEKTUR, KONFORMITÄT
**Linie:** U2
**U2-Bezug:** U2-ADR-105 (der Anlass) · U2-ADR-099 (Prüfstand, Klausel-Bindung) ·
operating-manual §7.5 (kein Wächter ohne gekoppelte Probe), §3.5b (Positiv- und Negativkontrolle)
**Anker:** Bilanz Achse 6 · Messung `dataabsentreason-validator-messung-2026-07-26.md`
**Status heute:** gilt — Beleg `tests/konformitaet/externe-validatoren.mjs`, `tests/zusagen-in-kommentaren.test.js`.

---

## Kontext

Am 26.07.2026 erzeugte das Produkt ein ungültiges FHIR-Bundle — `Procedure` ohne das
Pflichtfeld `performed[x]` —, während die Konformitäts-Suite **22/0 grün** stand. Gefunden hat es
eine gezielte Einzelmessung, nicht die Architektur. Die Suite prüfte Krypto-Vektoren,
Offline-Garantie, `extractable:false` und WCAG — aber nichts gegen die echten FHIR-Profile.

Erschwerend: der Kopf von `tests/fhir-ips.test.js` **behauptete**, die echte Profil-Validierung
laufe in `tests/fhir-ips-validator.test.js` und in CI. Die Datei existierte nie; in den vier
Workflows kam weder `validator_cli` noch `org.hl7.fhir` vor. **Weil der Satz es behauptete, hat
niemand nachgesehen.** Eine falsche Zusage im Kommentar ist teurer als gar keine: sie beendet die
Frage.

## Entscheidung

### 1 — Die Registry ist die Lieferung, nicht der eine Validator

`tests/konformitaet/externe-validatoren.mjs`, eingehängt in `npm run test:konformitaet` **und** in
`.github/workflows/konformitaet.yml`. Der Schritt liest `VALIDATOREN` — je Eintrag: welche
**Autorität** urteilt, **was** sie prüft, **wie** sie gerufen wird, **welche Artefakte** ihr
vorgelegt werden, **wie** ein Urteil gelesen wird, und mit welcher **gepinnten Version**.

Ein zweiter externer Prüfer ist damit ein Registry-Eintrag, kein Umbau. Erster Eintrag: der
offizielle HL7-FHIR-Validator (`org.hl7.fhir.core`) gegen `hl7.fhir.uv.ips#2.0.0` und
`hl7.fhir.eu.eps#1.0.0-ballot`.

### 2 — Geprüft wird, was das Produkt heute ausgibt

Die Bundles werden bei **jedem Lauf vom echten Generator erzeugt**, nie aus abgelegten Dateien
gelesen. Eine Fixture altert und prüft am Ende sich selbst.

**Jeder Fall trägt seine Erwartung.** Der Auftrag listete „leeres Depot" als gültig zu erwartenden
Fall — der Validator hat das beim ersten Lauf widerlegt, und die Widerlegung ist die interessantere
Aussage: `Patient.name` und `Patient.birthDate` sind in `Patient-uv-ips` **min=1**. Ein
Patientenkurzbrief ohne Patient ist keiner; das ist die Grenze des Formats, kein Generator-Fehler.
Der Fall bleibt darum als `erwartet: 'ungueltig'` in der Registry und **pinnt diese Grenze**, statt
still zu verschwinden.

### 3 — Ein übersprungener Validator zählt nie als grün

| Lage | Verhalten |
|---|---|
| **CI**, Werkzeug fehlt | **rot.** Ein Validator, der fehlen darf, ist keiner |
| **lokal**, Werkzeug fehlt | Lauf geht weiter, weist „UNGEMESSEN" sichtbar aus, die Prüfungen gehen auf `skip` — **nicht** auf `pass` |
| Werkzeug da | normal geprüft |

`t.skip()` statt eines stillen `return`: übersprungen erscheint in der Zusammenfassung als
`skipped`, nicht als `pass`. Die Konformitäts-Zahl zählt es damit nicht als bestanden.

### 4 — Die CI-Beschaffung, gemessen statt geraten

| Frage | Messung (26.07.2026) |
|---|---|
| Java | `actions/setup-java` (Temurin 21) — **keine** Annahme über das Runner-Image. Lokal führte genau so eine Annahme zur Fehldiagnose „kein Java", obwohl zwei JDKs installiert waren (Homebrew verlinkt `openjdk` nicht in den PATH) |
| Validator-Jar | 178 MB, **gepinnter** Release-Tag `6.9.12` (HTTP 200 belegt), nicht `latest` — sonst wandert der Prüfer unter uns weg und ein roter Lauf hätte zwei mögliche Ursachen |
| FHIR-Pakete | 21 Pakete transitiv; `~/.fhir/packages` über `actions/cache` |
| Terminologie-Server | **nicht nötig.** `-tx n/a` liefert dasselbe Urteil — **und** die ValueSet-Negativkontrolle greift weiterhin aus den lokalen Terminologie-Paketen. Ohne diese Messung wäre `-tx n/a` eine Abkürzung gewesen, die den Prüfer schwächt |
| Laufzeit | ~15 s je Bundle bei warmem Cache |

### 5 — Zusagen-Wächter

`tests/zusagen-in-kommentaren.test.js` prüft Kommentare in Kern, Lese-App und `tests/` auf
behauptete **Dateipfade** und **CI-Schritte**. Findet er eine Behauptung ohne Deckung, wird er rot.
Er hätte den Fall vom 26.07. sofort gefangen.

**Verlängerung von §7.5:** dort gilt „kein Prohibitions-Wächter ohne gekoppelte Probe". Hier: keine
behauptete Datei ohne die Datei.

**Seine Grenze steht im Kopf der Datei**, sonst behauptete er selbst mehr, als er hält: er prüft
Pfade, nicht ob die genannte Datei tut, was der Kommentar von ihr sagt.

### 6 — Vierter Ziel-Typ: Entscheidung (Nachtrag 02.08.2026, Posten 20/23/25)

Dieselbe Grundfrage — „stimmt eine Behauptung noch mit ihrem Ziel überein?" — gilt auch für
interne Entscheidungsdokumente: behauptet eines eine geltende Regel, oder wurde sie durch ein
anderes Dokument abgelöst, ohne dass beide Seiten das vermerken? Zwei echte Funde (Zug 0,
02.08.2026) belegen genau die zwei Fehlerarten: ein toter „Ersetzt:"-Verweis
(internes Entscheidungsdokument vom 31.07.2026, nicht Teil dieses Repos) und eine unvermerkte Ablösung
(`U2-ADR-089-Nachtrag` §3, in diesem Repo).

Das Feldpaar-Kriterium: ein ablösendes Dokument trägt `**Ersetzt:** <Datei>` (oder
`unbekannt`/`keine`, benannt+gezählt wie `AUSSERHALB_DES_REPOS`), das abgelöste Dokument trägt
symmetrisch `**Ersetzt durch:** <Datei>` zurück. Geprüft wird nur, was das Feldpaar TRÄGT —
Bestandsschutz für Alt-Dokumente ohne das Feld. `entscheidungsAktualitaetPruefen`
(`tools/entscheidungen-kern.js`) ist die reine Prüf-Funktion, `tools/entscheidungen-abloese-pruefen.js`
der CLI-Wrapper (ohne Argument gegen die Repo-Fixture `tests/fixtures/entscheidungen-beispiel/`,
mit `--verzeichnis <pfad>` gegen einen echten Bestand interner Entscheidungsdokumente).

## Konsequenzen

Der Wächter fand beim ersten Lauf **14 Fundstellen** von `docs/spec/Templates-Backlog.md` in Kern
und Lese-App. Die Datei **existiert** — als internes Arbeitsdokument außerhalb des Repos, weil
interne Arbeitsdokumente nach stehender Regel nie ins Repo gehören. Der Kommentar behauptet also nichts
Falsches, schreibt aber einen repo-relativen Pfad, dem im Repo niemand folgen kann.

**Nicht entschieden:** die Auflösung wäre entweder eine Kommentar-Änderung an 14 Stellen im
Produkt (dieser Auftrag ändert keinen Produktcode) oder eine Regel, wie auf Dokumente außerhalb des
Repos verwiesen wird. Der Fall steht als **benannte, datierte, gezählte** Ausnahme in
`AUSSERHALB_DES_REPOS` — die Länge der Liste ist mit-assertiert, sie kann nicht still wachsen.

Ungemessen: ob die Paket-Beschaffung in CI beim **ersten** Lauf (kalter Cache) innerhalb der
üblichen Laufzeit bleibt — lokal wurden die Pakete aus einem bereits gefüllten Cache geladen.

## Konformität

```konformitaet
aussage:  Jedes vom echten Generator erzeugte FHIR-Bundle trägt vor dem offiziellen
          HL7-Validator das für seinen Fall erwartete Urteil — einschließlich der
          gemessenen Grenze, dass ein Depot ohne Patientendaten kein gültiges IPS ergibt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/konformitaet/externe-validatoren.mjs#[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil
```

```konformitaet
aussage:  Ein absichtlich beschädigtes Erzeugnis wird vom externen Validator abgelehnt —
          ohne diese Kontrolle wäre jeder grüne Lauf vakuum-grün.
zustand:  geprüft
herkunft: invariante
pruefung: tests/konformitaet/externe-validatoren.mjs#[Extern·Negativprobe] ein absichtlich kaputtes Erzeugnis wird ABGELEHNT
```

```konformitaet
aussage:  Kein Kommentar in Kern, Lese-App oder tests/ behauptet eine Datei, die es nicht
          gibt; Ausnahmen für Dokumente außerhalb des Repos sind benannt, datiert und gezählt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/zusagen-in-kommentaren.test.js#u2-106-kein-kommentar-behauptet-eine-datei-die-es-nicht-gibt
```

```konformitaet
aussage:  Jede als „läuft in CI" geführte Prüfung kommt in einem Workflow tatsächlich vor.
zustand:  geprüft
herkunft: invariante
pruefung: tests/zusagen-in-kommentaren.test.js#u2-106-jede-behauptete-ci-pruefung-steht-in-einem-workflow
```

```konformitaet
aussage:  Ein internes Entscheidungsdokument, das ein anderes per „Ersetzt:" ablöst, verweist auf
          ein tatsächlich existierendes Ziel — und dieses Ziel trägt seinerseits einen passenden
          „Ersetzt durch:"-Rückverweis. Sonderwerte „unbekannt"/„keine" sind benannt+gezählt
          ausgenommen; Dokumente ganz ohne das Feldpaar bleiben ungeprüft (Bestandsschutz).
zustand:  geprüft
herkunft: invariante
pruefung: tests/zusagen-in-kommentaren.test.js#u2-106-entscheidungen-abgeloest-oder-vermerkt
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
