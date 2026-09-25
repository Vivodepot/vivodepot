# U2-ADR-359 · Deutsch wird ein Sprachmodul, wie Englisch — Zug 1: heben, nicht abschaffen

**Status heute:** gilt
**Datum:** 07.09.2026
**Betrifft:** `tools/textsatz-de-modul-erzeugen.js` (neu), `tools/textsatz-de-modul.json` (neu),
`tests/textsatz-de-modul-erzeugen.test.js` (neu)
**Bezug:** U2-ADR-285 (Rechtsraum/Textsatz-Reservierung für „DE"/„de"), U2-ADR-141 (Textsatz-
Andockbarkeit), `tools/textsatz-en-modul-erzeugen.js` (das gespiegelte Vorbild)

---

## 1 · Der Auftrag und seine Korrektur

Wörtlich: *„Englisch und Deutsch müssen in eigenen Modulen und mit Privat und Pro
kombinierbar sein."* Das ist die Abnahme für vier Produkte — Privat/Pro × DE/EN.

Gemessen: `tools/textsatz-en-modul.json` existierte, `tools/textsatz-de-modul.json` nicht.
Deutsch war kein Modul, sondern der eingebaute Rückfall im Kern.

**Der Auftrag wurde während des Baus korrigiert** (die ursprüngliche Vorgabe wurde widerrufen): Schritt
eins — deutschen Text aus dem Kern herausziehen — ist längst getan.
`tools/inline-texte-messen.js` zeigt 270 Felder mit praktisch keinem Inline-Text mehr (12
gesamt); die zentrale Schicht steht als `_STRINGS_EINGEBAUT` (1190 Einträge, `vivodepot.html`)
hinter dem `STRINGS`-Proxy, „Textsatz zuerst, sonst der eingebaute Satz" seit 17.08.2026 — plus
411 Optionswerte. Kein Erzeuger, der den Kern durchsucht, war nötig — nur diese bereits
zentralisierte Schicht als eigenständiges Modul sichtbar machen.

## 2 · Der Bau

`tools/textsatz-de-modul-erzeugen.js`, wörtlicher Spiegel von `tools/textsatz-en-modul-erzeugen.js`:
dieselbe Form (`modulTyp`/`sprache`/`moduleVersion`/`anbieterId`/`texte`/`regeln`), derselbe
Prüf-Weg vor dem Schreiben, dieselbe Größenkontrolle. Einziger Unterschied: das EN-Modul MISCHT
drei von Hand gepflegte Übersetzungstabellen; das DE-Modul ERFINDET NICHTS — es liest für jede
Kennung, die das EN-Modul trägt, den Wert direkt aus `TEXTSATZ_EINGEBAUT` im Kern (die eine
Lesestelle für `_STRINGS_EINGEBAUT` + Optionswerte + alles bereits Gehobene — `_stringsAusSatz`
zieht Kennungen progressiv aus `_STRINGS_EINGEBAUT` in `TEXTSATZ_EINGEBAUT` ein).

**Die Kennungsmenge ist die des EN-Moduls, nicht von `TEXTSATZ_EINGEBAUT` insgesamt** — der
benannte Rückstand (`OFFEN_JURISTISCH`, amtlicher Wortlaut mit Rechtsfolge, U2-ADR-333/338)
bleibt für BEIDE Sprachen Rückstand. Ein DE-Modul mit einer deutschen Übermenge wäre nicht
symmetrisch zu Englisch — die vier Produkte sollen dieselbe Menge zeigen.

`regeln`: `datumsformat: 'TT.MM.JJJJ'`, `dezimaltrenner: ','`, `tausendertrenner: '.'` — wörtlicher
Auszug aus `TEXTSATZ_REGELN_EINGEBAUT` im Kern, dieselben drei tatsächlich wirksamen Regeln wie
im EN-Modul (Währung bleibt ausgelassen, hängt am Rechtsraum, nicht an der Sprache).

## 3 · Der Fund beim Bauen: `sprache:'de'` ist reserviert, wörtlich wie `rechtsraum:'DE'`

**Nicht vermutet, gemessen:** `textsatzModulPruefen({ sprache: 'de', … })` liefert
`grund: 'reserviert'` — derselbe Code-Zweig, dieselbe Zeile wie bei der Rechtsraum-Reservierung
(U2-ADR-121). Das ist **kein Fehler dieses Zugs**, sondern dieselbe, bereits getroffene
ADR-285-Entscheidung, hier zum ersten Mal praktisch sichtbar: „Textsatz 'de' bleibt bewusst
schlafend … ob und wie ein echtes deutsches Textsatz-Modul je geladen wird, ist eine eigene,
spätere Entscheidung."

ADR-285 hatte für genau diesen Fall bereits einen zweiten, aufruferlosen Prüfweg gebaut —
`_textsatzModulPruefenGeruest` (identisch zu `textsatzModulPruefen`, bis auf die eine Zeile, die
`'de'` zulässt), geschützt durch eine Ratsche
(`tests/u2-adr-285-textsatz-geruest-modul.test.js`), die NUR den Kern-Quelltext
(`vivodepot.html`) auf Aufrufe scannt. Ein Aufruf aus diesem externen Tool-Skript berührt die
Ratsche nicht — geprüft, nicht angenommen (die Ratsche bleibt grün, s. Abschnitt 4).

Der Erzeuger nutzt darum `_textsatzModulPruefenGeruest` für die eigene Validierung vor dem
Schreiben. **Der Einlassweg selbst (`EINLASS_REGISTER`, Einstellungen → Module → Einlassen)
bleibt unverändert** und lehnt `'de'` weiterhin ausnahmslos ab — dieses Modul ist heute NICHT
über den normalen Bürgerinnen-Weg einlassbar. Ob/wie es das je wird, ist — wie bei Rechtsraum DE
— eine eigene, spätere Produktentscheidung, nicht Teil dieses Zugs.

## 4 · Der Wächter, der den Zug trägt

Eine Prüfung, die nur „das DE-Modul ist wohlgeformt" fragt, bewacht nichts — die vier Produkte
hängen an der **Gleichheit** der DE- und EN-Kennungsmengen, nicht an ihrer je eigenen
Vollständigkeit.

`tests/textsatz-de-modul-erzeugen.test.js`, „[DE/EN-Parität]": `Object.keys(de.texte)` ===
`Object.keys(en.texte)` als Mengen (beidseitige Differenz, nicht nur Größenvergleich — eine
gleich große, aber verschiedene Menge wäre sonst unentdeckt geblieben). **Rot-Beweis direkt
daneben:** eine Kennung aus dem DE-Modul entfernt, die Probe verlangt, dass genau sie als „nur im
EN-Modul" auffällt — nicht irgendein anderer Fehlschlag.

Zusätzlich: jeder Wortlaut (Stichprobe 50) ist wortgleich mit `TEXTSATZ_EINGEBAUT[kennung]` im
Kern, keine erfundene Kennung, Frische-Test gegen die committete `.json`, Größenkontrolle.

## 5 · Beleg

9/9 neue Proben grün, gezielt gegen den Kern gefahren:

```
Form entspricht dem Einlass-Vertrag
Gerüst-eigener Prüfweg nimmt das komplette Modul an — 0 verworfen
Normaler Einlassweg lehnt 'de' weiterhin ausnahmslos ab (unverändert)
DE/EN-Parität — dieselbe Kennungsmenge
DE/EN-Parität·Rot-Beweis — Entfernung fällt auf
jeder Wortlaut = TEXTSATZ_EINGEBAUT-Original
keine erfundenen Kennungen
Größe < 512 KB
Frische — committete .json = baueModul()
```

Kennungen bei diesem Bau: 3263 (Basis `373424f8`), identisch zur EN-Zahl an derselben Stelle —
per Konstruktion, nicht Zufall (der Wächter aus Abschnitt 4 macht jede künftige Abweichung sichtbar).

## 6 · Was ausdrücklich NICHT Teil dieses Zugs ist

**Zug 2, gefährlicher, kommt danach:** den deutschen Rückfall im Kern (`TEXTSATZ_EINGEBAUT` als
impliziter Sockel) durch ein echtes Andocken zu ersetzen, und/oder den Einlassweg für `sprache:'de'`
zu öffnen. Dieser Zug baut nur, was Zug 2 möglich macht — der Kern selbst ist unverändert; ein
Depot ohne jedes Sprachmodul zeigt weiterhin exakt denselben deutschen Text wie vorher.
