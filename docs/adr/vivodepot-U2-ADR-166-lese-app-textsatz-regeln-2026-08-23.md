# U2-ADR-166: Die Lese-App trägt die Textsatz-Regeln — und nur die zwei, die auch der Kern anwendet

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, PARITÄT
**Grundlage:** Laufzettel „Nacht 22./23.08.2026", Posten 8 — löst A479 (v1: ja, Produktentscheidung 22.08.2026, Bündel 2). Baut auf U2-ADR-141 (Textsatz-Module erreichen die Lese-Seite)
und der Parität-Entscheidung (internes Entscheidungsdokument vom 19.08.2026)
("die Lese-App zeigt, was die Anwendung ihr zeigen will").
- **Code-Stelle:** `vivodepot-lesen.html` — `TEXTSATZ_REGELN_EINGEBAUT`/`_ERLAUBT`/`_FORM`,
  `_textsatzRegelnPruefen`, `textsatzModulPruefen` (erweitert), `_textsatzModuleAusDepotAnmelden`
  (erweitert), `textsatzRegeln`, `textsatzSchreibrichtungAnwenden`,
  `textsatzSprachkennungAnwenden` (alle vier neu) — verdrahtet im EINEN Trichter
  `_foldVollmachtenLesen`.
- **Status heute:** gilt — gebaut und belegt in `tests/a479-lese-app-textsatz-regeln.test.js`
  (8 Proben).

---

## Der gemessene Befund — und wie er von der Registerzeile abweicht

Die ARBEITSLISTE-Zeile A479 nannte sechs Regeln als fehlend: Schreibrichtung, Datumsformat,
Dezimal- und Tausendertrenner, Währung, Sprachkennung. **Gemessen gegen den heutigen Kern (nicht
die Zeile übernommen): der Kern selbst WENDET nur zwei davon tatsächlich an.**
`textsatzSchreibrichtungAnwenden`/`textsatzSprachkennungAnwenden` setzen `dir`/`lang` am
Dokument. Die anderen vier (`datumsformat`, `dezimaltrenner`, `tausendertrenner`, `waehrung`)
werden von `_textsatzRegelnPruefen` geprüft und in `textsatzRegeln()` gespeichert — aber an
KEINER Stelle im Kern gelesen. `_datumDeutsch` im Kern ist so hart auf `TT.MM.JJJJ` verdrahtet
wie die entsprechende Lese-App-Funktion.

**Die ECHTE Parität-Lücke waren darum nur die zwei wirksamen Regeln.** Die anderen vier fehlen
in der Lese-App genauso wie im Kern — das ist keine Lücke, die diese Anwendung allein schließen
könnte, ohne eine Formatierung zu erfinden, die der Kern selbst nicht hat. Ein Rot-Beweis
(`tests/a479-lese-app-textsatz-regeln.test.js`, „Vorbedingung") hält die Kern-seitige Abwesenheit
fest — bricht er künftig, weil der Kern eine der vier doch anwendet, gehört die Lese-App an
derselben Stelle nachgezogen.

## Entscheidung

**Wörtlicher Spiegel der Kern-Mechanik**, wie bei den bisherigen Andockwegen (U2-ADR-141):
eigene Konstanten (`TEXTSATZ_REGELN_EINGEBAUT`/`_ERLAUBT`/`_FORM`), derselbe Prüfer
(`_textsatzRegelnPruefen`, byte-identisch), `textsatzModulPruefen` liefert jetzt zusätzlich
`regeln` (dieselbe Form wie im Kern, ohne das dortige `rechtsraum`-Feld — die Lese-App kennt die
Rechtsraum-Achse im Textsatz-Schlüssel noch nicht, s. „Was NICHT in dieser ADR steht").

**Getrennte Registry statt Umbau der bestehenden:** `_TEXTSATZ_MODUL_REGELN[sprache]` liegt
NEBEN `_TEXTSATZ_MODUL_REGISTRY[sprache]` (Texte) — additiv, keine Umformung der bestehenden
Text-Registry.

**Verdrahtet am EINEN Trichter** (`_foldVollmachtenLesen`, „alle vier Stellen, an denen ein
entschlüsseltes Depot in `data` landet, laufen hier hindurch"), direkt nach
`_textsatzModuleAusDepotAnmelden(obj)` — dieselbe Reihenfolge wie im Kern bei `depotLaden`.

## Nebenwirkung: die bestehende Parität-Messung zieht nach

`tools/andere-anwendungen-messen.js` erkennt Regeln-Parität strukturell (Anwesenheit von
`_textsatzRegelnPruefen` im Quelltext). Mit dem Bau meldet sie jetzt korrekt `weichtAb: false`
für die Lese-App; `tests/andere-anwendungen-befunde.test.js` ist entsprechend nachgezogen — die
verbleibende, unveränderte Lücke bei Vorlagen-Erzeuger und VC-Issuer bleibt „leichter" (sie
zeigen kein fremdes Depot an), unverändert seit dem 22.08.

## Was NICHT in dieser ADR steht

**Kein Bau der vier wirkungslosen Regeln** (Datumsformat, Dezimal-/Tausendertrenner, Währung) —
weder im Kern noch in der Lese-App. Das wäre eine neue Formatierungs-Fähigkeit, keine
Paritäts-Nachziehung, und liegt außerhalb dieses Postens.

**Keine Rechtsraum-Achse im Textsatz-Schlüssel der Lese-App** (Schnitt Glied 4, A469, nur im
Kern gebaut) — ein anderer, eigener Befund, nicht Gegenstand von A479.

**A5.3 (Wächter-Parität mit Vorlagen-Erzeuger, VC-Issuer, Schlüssel-Teilen)** bleibt unentschieden,
offene Frage — diese ADR entscheidet nur den Lese-App-Teil, der bereits
„v1: ja" trug.

---

*Vivodepot GmbH · 23.08.2026*
