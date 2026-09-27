# U2-ADR-302 · Der Produktabnahmebeweis, Branding-Achse — E2E, im echten Browser

**Datum:** 05.09.2026
**Status:** gebaut, vier Proben grün, echter Browser, echte WebCrypto, echter Datei-Rundlauf
**Status heute:** gilt, für die Branding-Achse — beide Fälle (In-Depot-Rand, Vor-Depot-Kopfzeile)
**Bezug:** das Produktabnahmekriterium (03.09.2026, wörtlich: „Am Ende möchte ich ‚mein'
Bürgerdepot haben. Als wäre nichts gewesen") · U2-ADR-300 (dieselbe A/B-Frage, Struktur-Achse —
diese Datei überträgt dieselbe Mess-Apparatur auf Branding) · U2-ADR-296 (Fall 1, In-Depot-Rand)
· U2-ADR-297 (Fall 2, Vor-Depot-Kopfzeile, Kontrast-Gate) · U2-ADR-298 (nie über Indizes
vergleichen)

---

## 1 · Warum jetzt — die Branding-Achse ist seit U2-ADR-296/297 A/B-fähig

U2-ADR-300 (Struktur-Achse) benannte Branding ausdrücklich als offene Lücke: kein Ladeweg
existierte, der denselben nativen Inhalt „nativ aus, Modul geladen" zeigen konnte. Seit
U2-ADR-296 (Fall 1) und U2-ADR-297 (Fall 2), beide am selben Tag gelandet, stimmt das nicht
mehr — Branding hat jetzt einen echten, geprüften, signierten Ladeweg über
`vorDepotKonfigurationAnwenden`.

```
A   Vivodepots eigene Marke, so wie heute (kein Branding-Modul geladen)
B   dieselbe Marke, als echtes Vor-Depot-Branding-Modul geladen

A == B  in allem, was die Bürgerin sieht
```

**Zweite Probe, die genauso zählt:** eine Fremdmarke ändert die Marke sichtbar — und nichts
sonst. Gleiche Felder, gleiche Fristen, gleiche Wege, gleiche Ausgaben.

---

## 2 · Wiederverwendete Apparatur, neue Achse

`tests/e2e/geruest-umbau-helpers.js` (aus U2-ADR-300 extrahiert, als diese Datei ein zweiter
echter Verbraucher wurde — nicht vorher, keine Abstraktion auf Vorrat) liefert die
Achse-neutrale Mess-Apparatur: Referenzdepot befüllen, PDF-Modelle/zehn Exportkanäle/echter
Datei-Rundlauf erfassen. Was diese Datei hinzufügt, ist branding-spezifisch: ein echtes,
zweistufig signiertes Vor-Depot-Bündel bauen (dieselbe SENTINEL-Form wie
`tests/branding-topbar-produkt.test.js`, hier mit echter Browser-WebCrypto statt Nodes
Polyfill) und die Kopfzeile (`getComputedStyle(.topbar)`) als vierte Messgröße mitführen.

---

## 3 · Der Beweis — vier Proben, `tests/e2e/marke-e2e-abnahme.spec.js`

- **A == B (eigenes Branding):** `VIVODEPOT_BRANDING` (`tools/vivodepot-branding-inhalt.js`,
  U2-ADR-296 — nicht selbst erfunden) über den echten, signierten Vor-Depot-Ladeweg geladen.
  Kopfzeilenfarbe/-textfarbe identisch zum nativen Zustand; die tatsächlich gerenderte
  Schriftart identisch (s. §4 zur Fallback-Ketten-Asymmetrie); PDF-Modelle, alle zehn
  Exportkanäle und das aus der Datei zurückgewonnene Depot identisch (bis auf den Eintrag in
  `data.brandingModule` selbst — s. §4).
- **Fremdmarke ändert nur die Marke:** dieselbe Fremdmarke-Fixture wie U2-ADR-296/297
  (`#8b1a2b`/`#1a3a8b`/Georgia/„Test-Institut Fremdmarke") über denselben Ladeweg. Kopfzeile
  ändert sich sichtbar (Hintergrund UND Schrift) — PDF-Modelle, Exportkanäle und der
  zurückgewonnene Depot-Inhalt bleiben unverändert.
- **Kontrast-Gegenprobe:** dieselbe kontrastschwache Fixture wie U2-ADR-297
  (`farbePrimaer:'#808080'`), über den echten signierten Ladeweg. Kopfzeile bleibt beim
  Salbei-Fallback — die gültige Schriftart (Georgia) desselben Moduls bleibt trotzdem wirksam,
  kein Rundum-Verwurf wegen eines einzelnen Farbfeldes.
- **Isolation, die wichtigste Probe:** ein Branding-Beitrag, der INNERHALB eines bereits offenen
  Depots andockt (Fall 1) — echter, signierter Einlass über `modulEinlassenGeprueft` gegen das
  offene Depot, gefolgt vom echten Wirkungs-Schritt `_moduleEinlassWirken` (derselbe, den der
  reale UI-Weg nach einem Datei-Upload ausführt, vivodepot.html:39430). Vorbedingung geprüft:
  das Bündel wird angenommen UND setzt wirklich `--vd-branding-primaer` (sonst prüfte die Probe
  nichts) — **und die Kopfzeile bleibt trotzdem unverändert am Salbei-Fallback.**

**Gemessen, nicht angenommen:** ein `branding`-Modul verlangt IMMER eine echte Signatur, auch
für Fall 1 — der erste Entwurf dieser Probe versuchte den unsignierten `modulEinlassen()`-Weg
(wie bei bereich/logikModul/textsatz) und scheiterte mit `nurGeprueft` statt `angenommen`. Eine
Marke ist eine Identitätsbehauptung, keine reine Datenmitgabe — dieselbe Härte wie beim
Vor-Depot-Weg, hier am In-Depot-Weg bestätigt, nicht neu entschieden.

**Nie über Indizes verglichen** (U2-ADR-298): jeder Vergleich geht über benannte Schlüssel
(CSS-Eigenschaftsname, Kanal-id, Modell-Name) — nie über eine Array-Position.

---

## 4 · Zwei echte, benannte Funde — beide keine Bugs, beide dokumentiert statt stillschweigend übergangen

**Fund 1: die Basis-Schriftart trägt in A eine volle CSS-Fallback-Kette, in B nur einen Namen.**
`body { font-family: var(--vd-branding-schriftart, var(--font-inter)) }` — `--font-inter` (der
native Fallback) ist selbst eine ganze Kette (`"Inter", -apple-system, "system-ui", …`), ein
Branding-Modul kann laut `brandingModulPruefen` nur EINEN Font-Namen liefern (kein CSS-Parser,
by design). Der `getComputedStyle`-STRING unterscheidet sich damit zwischen A und B, obwohl die
tatsächlich gerenderte Schrift in beiden Fällen identisch ist: Inter liegt als `@font-face`-
Base64 eingebettet vor (offline-first, nie ein Netz-Nachladen), der Fallback greift also nie
wirklich. Verglichen wird darum nur der ERSTE Eintrag der Font-Stack — benannt, keine blinde
Toleranzregel (s. Kommentar an `ersterFontName` im Testcode).

**Fund 2: `data.brandingModule` selbst unterscheidet A von B — per Konstruktion, nicht als
Fehler.** Ein geladenes Vor-Depot-Branding-Modul wird real ins Depot übernommen
(`_vorDepotModulInsDepotUebernehmen`) — seine bloße ANWESENHEIT im zurückgewonnenen Depot ist
darum immer ein Unterschied zu „kein Modul geladen", unabhängig davon, ob die Marke Vivodepots
eigene ist oder eine Fremdmarke. Das ist kein Rundlauf-Fehler; es ist die Aufzeichnung, dass ein
Modul geladen wurde. Der Datei-Rundlauf-Vergleich schließt darum genau diesen einen Schlüssel
aus (benannt, `ohneBrandingModule` im Testcode) — die eigentliche Behauptung ist enger und
bleibt scharf: der REST des Depots (Felder, Sektoren, Menschen, Institutionen, …) bleibt
unberührt.

---

## 5 · Wofür das NICHT reicht

**Nur Branding.** Sprache- und Rechtsraum-Achse bleiben offen (U2-ADR-300 §5 nennt denselben
Grund: kein Ladeweg existiert, der denselben nativen Inhalt „nativ aus, Modul geladen" zeigen
könnte — ein A-gegen-A-Vergleich wäre eine Probe, die nie rot werden könnte).

**Kein Logo geprüft.** `VIVODEPOT_BRANDING.logo` ist `null` (U2-ADR-296: ein echtes Logo ist eine
Design-Freigabe, keine Code-Messung) — diese Probe prüft darum nur Farbe/Schrift/Name, nicht den
Logo-Andockweg selbst.

**Kein `_templateAbschnitte`-Mischfall** (U2-ADR-296 §3, benannter, nicht behobener Fund: ein
Abschnitt kann native und Modul-Felder im selben Label mischen) — außerhalb dieses Baus.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
