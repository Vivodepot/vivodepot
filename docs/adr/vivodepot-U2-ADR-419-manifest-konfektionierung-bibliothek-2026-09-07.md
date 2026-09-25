# U2-ADR-419 (Nummer beim Landen zu bestätigen) · Manifest-Konfektionierung — Bibliothek + Wächter (Block D)

**Status:** gebaut, Wächter grün gegen synthetische Eingabe. Öffnet den Kanal, beweist ihn
noch nicht — s. Abschnitt „Was dieser Zug NICHT zeigt" unten, das ist der wichtigste Satz
dieser ADR.
**Status heute:** gilt für die Bibliothek und ihren Wächter, nicht für eine ausgelieferte
Produktkette.
**Betrifft:** `tools/lib/manifest-konfektionieren.js`, `tools/lib/manifest-achsen-erlaubnis.js`,
`tests/manifest-konfektionieren.test.js`. Berührt `vivodepot.html` NICHT.
**Umnummeriert (17.09.2026):** stand ursprünglich (07.09.2026) unter U2-ADR-347 — dieselbe Nummer
war unabhängig auch an „Die SITUATIONEN der Lese-App sind eine erzeugte Kopie mit Prüfung"
vergeben, echte Kollision, kein Nachtrag/keine Variante. Entscheidung, welche Datei wandert: die
mit den weniger tragenden Verweisen (6 gegen 9, gemessen gegen den echten Bestand). Der Inhalt
dieser ADR ist unverändert, nur die Nummer und ihre `herkunft:`-Zeilen sind nachgezogen.

---

## Der Auftrag

Das Baukasten-Produktkonzept sieht ein **Manifest** vor: ein Zeiger-Dokument, das vor der
Auslieferung je Achse festlegt, welches Modul gilt (Gerüst + gewählte Fachmodule zu einem
Produkt zusammenzieht), ohne selbst Inhalt zu tragen. Das Manifest ist ein reines
Build-/Vertriebs-Artefakt — es berührt die Laufzeit-Oberfläche der ausgelieferten Bürger-App
nicht und reist nie in ein Depot. Diese ADR baut den Kern-Mechanismus: die Bibliothek, die aus
einem Manifest + einem Modul-Bestand ein Bündel konfektioniert, und den Wächter, der die
zentrale Zusicherung des Konzepts prüft: „zweimal aus demselben Manifest konfektioniert ⇒
byte-gleiches Ergebnis".

## Format — Zeiger, kein Inhalt

Ein Manifest trägt `manifestVersion`, `manifestId`, `erzeugt`, einen Gerüst-Verweis
(`geruest.kanonCommit`/`kanonVersion`) und je Achse GENAU EINEN Verweis auf ein Modul:
`{herkunft, moduleVersion}`, plus ein typ-eigenes Kennfeld. Templates (additiv, außerhalb der
Achsen-Logik, weil ein Template mehrere Achsen gleichzeitig sein kann) stehen als eigene Liste.
Der tatsächliche Modul-Inhalt liegt nie im Manifest selbst — genau das macht es klein,
vergleichbar und diff-fähig, ohne die referenzierten Module zu laden.

## Zwei getrennte Register — unterschiedliche Wachstumsrate, unterschiedlicher Pfleger

**Achsen-Erlaubnis** zählt Achsen und Sorten Funktionswert, NIE Instanzen — dieselbe Form wie
eine Motoren-Erlaubnisliste (ein Modul, das sich eine neue Achse ausdenkt, hat keinen
Teilerfolg verdient; eine neue Achse ist eine Produktentscheidung, kein Bau-Detail). Bleibt von
Hand gepflegt, ändert sich selten.

**Modul-Register** bildet `(typ, herkunft, moduleVersion) → sha256` ab und wächst automatisch
bei jeder neuen Modul-Fassung — niemand gibt einen Eintrag frei, sonst entstünde derselbe
Flaschenhals wieder, den eine Konfektionierung ohne Einzelfall-Einreichung gerade vermeiden
soll.

`tools/lib/manifest-achsen-erlaubnis.js` liefert eine BEISPIEL-Erlaubnisliste (gespiegelt aus
den bestehenden elf Einlass-Register-Typen des Kerns), ausdrücklich nicht als Festlegung — ob
die Manifest-Ebene dieselben Typ-Namen wie das Einlass-Register führt (z. B. „Sprache" vs.
„Textsatz", „Marke" vs. „Branding") ist eine offene Produktfrage, keine Bauentscheidung dieser
ADR.

## Der Wächter — Abnahme, nicht Behauptung

`modulAufloesen` ist der Reproduzierbarkeits-Riegel selbst, kein Extra-Check daneben: jede
Auflösung eines Manifest-Zeigers vergleicht den ECHTEN Hash des Modul-Inhalts (kanonisch
serialisiert — Objekt-Schlüssel rekursiv sortiert, damit zufällige Konstruktions-Reihenfolge
den Hash nicht verfälscht) gegen den im Modul-Register hinterlegten. Weicht er ab, wird
geworfen — nie eine „aktuelle" Fassung stillschweigend gezogen.

```yaml
konformitaet:
  - aussage: >-
      Derselbe Aufruf, zweimal, aus demselben Manifest und demselben Modul-Bestand, liefert
      byte-identisches Ergebnis (Hash UND Roh-Text).
    zustand: erfuellt
    herkunft: U2-ADR-419 (07.09.2026)
    pruefung:
      - tests/manifest-konfektionieren.test.js
        "[Manifest·D2·Positivkontrolle] zweimal konfektioniert aus demselben Manifest + Bestand — byte-gleich"

  - aussage: >-
      Ändert sich ein Modul-Inhalt, ohne dass moduleVersion hochgezählt und das Register neu
      signiert wurde, bricht die Konfektionierung ab statt eine andere Fassung stillschweigend
      zu ziehen.
    zustand: erfuellt
    herkunft: U2-ADR-419 (07.09.2026)
    pruefung:
      - tests/manifest-konfektionieren.test.js
        "[Manifest·D2·Negativkontrolle] ein verändertes Modul-Byte OHNE moduleVersion-Sprung bricht den Bau ab"

  - aussage: >-
      Ein Achsentyp, der nicht in der Achsen-Erlaubnisliste steht, wird benannt verworfen — das
      ganze Manifest fällt.
    zustand: erfuellt
    herkunft: U2-ADR-419 (07.09.2026)
    pruefung:
      - tests/manifest-konfektionieren.test.js
        "[Manifest·Rot-Beweis] eine unbekannte Achse wird benannt verworfen, das ganze Manifest fällt"

  - aussage: >-
      Eine (typ,herkunft,moduleVersion)-Kombination, die nicht im Modul-Register steht, wird
      abgewiesen statt stillschweigend übergangen.
    zustand: erfuellt
    herkunft: U2-ADR-419 (07.09.2026)
    pruefung:
      - tests/manifest-konfektionieren.test.js
        "[Manifest·Rot-Beweis] eine unregistrierte (typ,herkunft,moduleVersion)-Kombination wird abgewiesen"

  - aussage: >-
      Zwei Manifeste lassen sich auf Feldebene vergleichen, ohne die referenzierten Module zu
      laden.
    zustand: erfuellt
    herkunft: U2-ADR-419 (07.09.2026)
    pruefung:
      - tests/manifest-konfektionieren.test.js
        "[Manifest·Diff] vergleicht Achsen-Zeiger ohne die referenzierten Module zu laden"
```

## Was dieser Zug NICHT zeigt — der wichtigste Satz dieser ADR

**Dieser Zug öffnet den Kanal, er beweist ihn nicht.** Die elf Tests laufen gegen einen
SYNTHETISCHEN Modul-Bestand und ein synthetisches Register, von Hand im Test aufgebaut — sie
zeigen, dass die BIBLIOTHEK aus einem gegebenen Manifest byte-gleich konfektioniert. Sie zeigen
NICHT, dass ein ausgeliefertes Produkt auf diesem Weg entsteht. Drei Stücke fehlen dafür noch,
bewusst außerhalb dieser ADR:

1. **Kein Signier-Werkzeug**, das ein echtes Modul-Register befüllt — die Registrierung eines
   Moduls fällt laut Konzept als Nebenprodukt einer Signier-Zeremonie an (Kette
   Anker → Ausgabestelle → Kunde, wie sie `tools/basistemplate-neu-signieren.js` heute schon für
   eine einzelne Achse geht), diese Zeremonie existiert für ein Manifest-Modul-Register noch
   nicht.
2. **Kein Schreibpfad**, der aus `konfektionierenAusManifest`s Rückgabe (Bündel + Hash) eine
   tatsächlich ausgelieferte Datei macht — die Funktion selbst schreibt bewusst nichts auf
   Platte („Daten, kein Bauskript" gilt für den ganzen Mechanismus, nicht nur das Manifest
   selbst).
3. **Keine Anbindung an einen echten Modul-Bestand** — `modulBestand`/`modulRegister` kommen
   heute nur als Testfixtur, nicht aus einem gepflegten, realen Anbieter-Bestand.

Solange diese drei Stücke fehlen, bleibt die Aussage „gleiches Manifest, gleiches Produkt" für
ein tatsächlich ausgeliefertes Produkt **nicht grün** — nur für die Bibliothek, die dafür
gebraucht wird.
