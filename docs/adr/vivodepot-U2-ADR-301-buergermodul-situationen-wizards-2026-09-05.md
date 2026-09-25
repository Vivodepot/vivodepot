# U2-ADR-301 · Der Erzeuger um Situationen und Assistenten erweitert — und ein Riegel gefunden, der bei Sektoren nicht steht

**Nachtrag 05.09.2026 (U2-ADR-305, Korrektur):** §3 unten behauptet, ein Modul könne
strukturell KEINE eigene Situation anlegen. Das ist FALSCH und am echten Prüfer widerlegt — ein
Modul DARF eine eigene Situation anlegen (freie ID, mit/ohne `bloecke`, mit `{quelle,feld}`).
Was es nicht darf: ihr ein EIGENES Feld-Objekt geben. Die Fehlerquelle: die Sonde unten trug ein
Feld-Objekt und maß damit die FELD-Sperre, nicht eine Situations-Sperre. Der
Assistenten-Befund (§4) bleibt unverändert richtig. Details, vier neue Gegenproben und der
korrigierte Wortlaut: U2-ADR-305.

**Datum:** 05.09.2026
**Status:** gebaut, 9 neue Proben grün, 53/53 Regression grün
**Status heute:** gilt — §3 durch U2-ADR-305 korrigiert (s. Nachtrag oben), Rückweg-Fidelity für
beide Register bleibt bewiesen; kein Ersatz-Ladeweg (kein A/B über
`renderSituation`/`renderWizard`), weil keiner existiert — echter, gemessener Grund, nicht diese
ADR
**Bezug:** U2-ADR-291 (Erzeuger, `tools/buergermodul-erzeugen.js`) · U2-ADR-292/299 (Struktur-
Achse, Sektoren) · U2-ADR-243 §Kontext (der ursprüngliche Fund: „kein angedocktes Modul kann
selbst eine Situation anlegen oder ihr ein eigenes Feld geben") · U2-ADR-246 (Situationen
werden andockbar) · U2-ADR-250 (Assistenten werden andockbar)

---

## 1 · Der Auftrag

Das Struktur-Bündel (`tools/buergermodul/vd-privat.json`) trägt heute nur `bereiche` — keine
Situationen, keine Assistenten. Auftrag: den Erzeuger um beide Register erweitern, dann dieselbe
A/B-Haltung darüberziehen wie bei Sektoren (U2-ADR-292/299). Ausdrücklich NICHT Teil dieses
Auftrags: `bereichsModulPruefen` (andere Sitzung) und die Bündel-Einbettung in die Datei (andere
Sitzung).

**Gemessen vor dem Bau, nicht angenommen:** für Sektoren gibt es `buergermodulSektorErsetzen` —
eine echte Erste-Partei-Zone, die den nativen Bestand ersetzt und ein `renderSektor`-A/B
erlaubt. **Für Situationen und Assistenten gibt es kein Gegenstück.** Kein
`buergermodulSituationErsetzen`, kein `buergermodulWizardErsetzen`. Ein renderSituation/
renderWizard-A/B wie bei U2-ADR-299 ist darum HEUTE nicht baubar — nicht, weil es hier
unterlassen wurde, sondern weil die Funktion, die es bräuchte, nicht existiert und ihr Bau
außerhalb dieses Auftrags liegt (kein Ersatz-Ladeweg zu bauen war ausdrücklich nicht verlangt).

**NACHTRAG U2-ADR-308 (05.09.2026):** `buergermodulSituationErsetzen` existiert jetzt — die
Situations-Hälfte dieser Lücke ist geschlossen, echtes `renderSituation`-A/B inklusive
(`todesfall-uebernahme` benannt ausgenommen, eigener Grund dort). `buergermodulWizardErsetzen`
bleibt offen, eigener Auftrag.

**Was heute geht, und was diese ADR liefert:** Rückweg-Fidelity der Erzeuger-Extraktion —
wörtlicher Spiegel des bestehenden `feldDefinitionen`/`rueckweg`-Musters, jetzt auf Situationen
und Assistenten übertragen.

---

## 2 · Umsetzung

Zwei neue Sammel-Funktionen in `tools/buergermodul-erzeugen.js`, wörtlicher Spiegel von
`feldDefinitionenSammeln`:

- **`situationsEintraegeSammeln(SITUATIONEN)`** — sammelt nur EIGENE Felder
  (`eintrag.feld` ein OBJEKT), keine Querverweise (`{quelle, feld: 'kennung'}`, `feld` ein
  STRING). 84 eigene Felder gefunden, über alle 10 nativen Situationen.
- **`wizardsSchritteSammeln(WIZARDS)`** — sammelt jeden Schritt mit `feld` UND `frage`
  zusammen (s. §3, Riegel bei Assistenten). 78 Schritte über alle 7 nativen Assistenten.

Beide fließen in `baueBuergermodul()`s Ergebnis (`situationsDefinitionen`,
`wizardsDefinitionen`) mit derselben Rückweg-Prüfung wie `feldDefinitionen` (Kennung vorhanden,
kein `tpl_`-Präfix) — 0 Abweichungen bei beiden, gemessen gegen `304ac4a5`/v570.

---

## 3 · Der gemessene Riegel — NUR eigene Situations-FELDER, nicht Situationen selbst

**KORRIGIERT durch U2-ADR-305 (05.09.2026) — s. Nachtrag ganz oben.** Diese Sektion behauptete
ursprünglich, ein Modul könne strukturell KEINE eigene Situation anlegen. Das war falsch, am
echten Prüfer widerlegt (gegen fünf Fälle gemessen). Der folgende Text ist die
korrigierte Fassung.

**Ein Modul DARF eine eigene Situation anlegen** — freie ID, mit oder ohne `bloecke`, mit
`{quelle,feld}`-Querverweisen: läuft alles durch `situationsModulPruefen`. **Was es nicht darf:
ihr ein EIGENES Feld-Objekt (`{feld:{id,...}}`) geben** — das kommt ausschließlich über die
signierte Vorlage.

Gemessen mit einer VÖLLIG UNRESERVIERTEN, frei erfundenen Situations-ID
(`voellig-unreserviert-x9`), gegen fünf Fälle, damit kein Ergebnis zufällig an der Reservierung
statt am geprüften Merkmal hängt:

```
freie ID, GAR KEIN bloecke         → ANGENOMMEN
freie ID, bloecke: []              → ANGENOMMEN
freie ID, nur {quelle,feld}        → ANGENOMMEN
freie ID, EIGENES Feld-Objekt      → ABGELEHNT, grund: 'bloecke'
RESERVIERTE ID (geburt)            → ABGELEHNT, grund: 'reserviert'
```

Der Grund für die eine echte Ablehnung steht wörtlich im Kern-Kommentar über
`situationsModulPruefen`: „NUR {quelle, feld}-Züge sind hier erlaubt — ein eigenes Feld
({feld:{...}}) kommt ausschließlich über die signierte Vorlage." Der Kommentar beschreibt die
ERLAUBTEN EINTRAGS-FORMEN innerhalb von `bloecke` — nicht, ob eine Situation selbst anlegbar
ist. Die ursprüngliche Sonde trug ein Feld-Objekt und maß damit die Feld-Sperre — richtig
gemessen, aber falsch als Situations-Sperre gelesen, weil `if (roh.bloecke !== undefined)`
(vivodepot.html:13784) ein fehlendes `bloecke` bereits vorher als `[]` durchlässt, bevor die
Feld-Prüfung überhaupt greift.

**Bei Assistenten war der Befund von Anfang an richtig, unverändert.** Ein Schritt mit eigenem
Feld und unreservierter ID wird angenommen — der einzige Riegel dort ist die ID-Reservierung,
dieselbe Klasse wie bei Sektoren.

**Das ist damit auch kein Widerspruch zu U2-ADR-243 §Kontext** — dessen Aussage („kein
angedocktes Modul kann selbst eine Situation anlegen oder ihr ein eigenes Feld geben") wird
durch diese Messung für die erste Hälfte (Situation anlegen) korrigiert, für die zweite
(eigenes Feld) bestätigt. U2-ADR-305 trägt die vollständige Korrektur.

---

## 4 · Zwei Auflagen aus dem Bestand, bestätigt statt neu gefunden

- **`wizardsModulPruefen` verlangt für jeden Schritt `s.feld` UND `s.frage`.** `frage` ist bei
  Assistenten STRUKTUR, nicht Sprache — anders als ein Sektor-Feld-Label (das separat aus dem
  Textsatz-Modul nachgefüllt wird) muss `frage` mit dem Schritt mitreisen, sonst weist der echte
  Prüfer den ganzen Schritt zurück (`grund: 'schritte'`). Rot-Beweis geführt: ein Schritt ohne
  `frage`, sonst identisch, wird verworfen. `wizardsSchritteSammeln` sammelt `frage` darum
  ausdrücklich MIT, keine Text/Struktur-Trennung wie bei Sektor-Feldern.
- **`exporte[].label` ist ein Getter auf `STRINGS`, kein Textsatz-Schlüssel** — geprüft, aber
  nicht direkt getroffen: `exporte` lebt an SEKTOR-Definitionen (`SEKTOREN[i].exporte`), nicht an
  Situationen/Assistenten. Die bestehende `funktionswerteSuchen`-Behandlung (Getter zählen nicht
  als Funktionswert, `JSON.stringify` löst sie zur Aufrufzeit auf) gilt unverändert für alles,
  was diese ADR sammelt — dieselbe, bereits bewiesene Behandlung, kein neuer Mechanismus nötig.

---

## 5 · Rot-Beweis

`tests/buergermodul-situationen-wizards-u2-adr-301.test.js`, 9 Proben:

- Extraktion nimmt nur eigene Felder, keine Querverweise (an der Quelle `geburt` geprüft, die
  nachweislich beide Sorten trägt).
- Jeder Assistenten-Schritt trägt `feld` UND `frage`.
- `baueBuergermodul()` liefert beide neuen Definitionslisten, Rückweg ohne Abweichung.
- Rot-Beweis: eine gepflanzte `tpl_`-Kennung wird von der Rückweg-Prüfung gefunden.
- Der Riegel selbst: unreservierte Situations-ID + eigenes Feld → `bloecke`, nicht `reserviert`.
- Gegenprobe: derselbe Zug als Querverweis → angenommen.
- Gegenprobe: unreservierte Assistenten-ID + eigener Schritt → angenommen (Riegel dort ist nur
  Reservierung).
- Rot-Beweis: Assistenten-Schritt ohne `frage` → verworfen.
- Grenze, als Wächter geschrieben: `buergermodulSituationErsetzen`/`buergermodulWizardErsetzen`
  existieren heute nicht — schlägt diese Zeile künftig an, ist das die gute Nachricht, dass ein
  echtes A/B jetzt möglich wäre.

**Regression:** 53/53 (inklusive `buergermodul-ab-parity-u2-adr-299`,
`buergermodul-sektor-ersetzen`, `buergermodul-schnitt`, `rot-beweis-pflicht`).

---

## 6 · Was das NICHT ist

Kein neuer Kern-Ladeweg, keine Änderung an `bereichsModulPruefen`, `situationsModulPruefen`
oder `wizardsModulPruefen` selbst, keine Bündel-Einbettung — ausdrücklich außerhalb dieses
Auftrags, anderen Sitzungen zugewiesen. Kein `renderSituation`/`renderWizard`-A/B — dafür fehlt
die Erste-Partei-Zone, die es bräuchte, und sie zu bauen war nicht verlangt.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
