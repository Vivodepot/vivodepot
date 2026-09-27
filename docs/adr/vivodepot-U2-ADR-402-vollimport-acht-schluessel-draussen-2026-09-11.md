# U2-ADR-402: Vollimport — acht Schlüssel bleiben draußen, weil sie DIESER Datei gehören, nicht der Bürgerin (Nummer beim Landen zu bestätigen)

**Datum:** 2026-09-11
**Status:** Angenommen
**Status heute:** gilt — Klassifikation gebaut, Wächter grün.

## Kontext

Ein Umzug (Depot exportieren, in eine frische Datei einlesen) trug bis zu diesem Zug nur drei
der 48 Top-Level-Schlüssel eines Depots zurück (`sektoren`, `feldDefinitionen`, `menschen`) — 45
gingen still verloren, ohne Meldung. Der Fund und die Klassifikation aller 48 Schlüssel stehen
in `VOLLIMPORT_MITNEHMEN_SCHLUESSEL`/`VOLLIMPORT_DRAUSSEN_SCHLUESSEL` (`vivodepot.html`).

40 dieser Schlüssel tragen etwas über die Bürgerin — echte Feldwerte, Dokumente, Register,
Struktur, die diese Werte erst einordnet — und reisen jetzt mit, mit dem ausdrücklichen Bias
„im Zweifel mitnehmen": ein Datum zu viel ist heilbar, ein verlorenes nicht.

Acht Schlüssel bleiben davon ausgenommen. Diese Entscheidung war bislang nirgends als
Entscheidung festgehalten — nur im Code selbst begründet. Diese ADR trägt sie nach, damit sie
nicht in einem Jahr neu diskutiert werden muss, ohne dass sich das „warum" aus dem Code allein
ergibt.

## Entscheidung

Acht Schlüssel wandern beim Vollimport NICHT mit, weil sie eine Eigenschaft DIESER DATEI
beschreiben — ihrer Struktur, ihrer Krypto, ihrer Stellung in einer Verwaltungs-Hierarchie,
ihres eigenen Sitzungszustands — und keine portable Aussage über die Bürgerin:

1. **`schemaVersion`** — beschreibt die Struktur DIESER Datei. Ein frisches Zieldepot trägt
   bereits die eigene, gegebenenfalls neuere Version; eine ältere fremde zu übernehmen wäre
   falsch, nicht nur überflüssig — die Migrationskette liefe rückwärts.
2. **`kryptoVersion`** — beschreibt DIESES Datei-Kryptoschema. Muss zur tatsächlichen
   Verschlüsselung des Zieldepots passen, nicht zur Quelle; eine fremde Version zu übernehmen
   könnte die Entschlüsselungs-/Prüflogik am Ziel brechen.
3. **`verwaltungsTyp`** — laut U2-ADR-003 (Klärung 4–11) „Verwaltungs-Metadaten pro Depot":
   jedes Depot trägt seinen eigenen Typ (`eigen`/`delegiert`/`verwaltet`), der Anker ist immer
   `eigen`. Das ist die Rolle DIESER Datei in EINER Verwaltungs-Hierarchie — keine portable
   Eigenschaft der Bürgerin. Ein umgezogenes Depot beginnt als eigener Anker und bestimmt seine
   Rolle selbst; es erbt sie nicht still von der Quelldatei.
4. **`verselbststaendigungMoeglich`** — gehört untrennbar zu `verwaltungsTyp`, aus demselben
   Grund.
5. **`_letzterAnlass`** — lokale Anlass-Spur dieser Sitzung, kein Bürgerdatum.
6. **`_wiedereinstiegHinweisGezeigt`** — ob DIESES Depot den einmaligen Rückweg-Hinweis
   (U2-ADR-266) bereits zeigte. Reines UI-Zustandsflag dieser Datei.
7. **`feldGueltigkeitGerettet`** — ein überstimmter, überholter Rettungswert (U2-ADR-148). Laut
   eigenem Kommentar an `leeresDepot()` „nirgends gelesen und nirgends angezeigt"; ihn
   mitzugeben hieße, etwas Totes in eine Übergabe zu schreiben, die niemand erwartet.
8. **`abWerkMitschrift`** — reiner Produkt-Spiegel (U2-ADR-398, „das gekündigte Zimmer"), kein
   Wert über die Bürgerin. Reist bereits am Export nie mit, auch nicht mit `{sensibel:true}`;
   konsequent auch am Import nie erreichbar.

## Folgen

- Ein umgezogenes Depot erhält seine Datei-eigenen Werte (Schema-/Kryptoversion,
  Verwaltungsrolle, Sitzungszustand) frisch vom Zieldepot selbst — nicht von der Quelle.
- Die Nutzerin sieht diese Ausnahme nicht stillschweigend: die Vollimport-Meldung
  (`STRINGS.importVollNichtUebernommenLabel`) nennt drei zusammengefasste Gruppen namentlich
  (technische Versionskennzeichen, Verwaltungsrolle, Sitzungszustand) — bewusst OHNE
  `feldGueltigkeitGerettet`/`abWerkMitschrift`: beide sind reine, für die Bürgerin nie sichtbare
  Interna ohne Informationswert, ihre Nennung wäre Jargon.
- Der Wächter `tests/vollimport-schluessel-abdeckung.test.js` hält jeden Schlüssel aus
  `leeresDepot()` gegen `VOLLIMPORT_MITNEHMEN_SCHLUESSEL ∪ VOLLIMPORT_DRAUSSEN_SCHLUESSEL` und
  wird rot, sobald eine neue Kategorie in keiner der beiden Listen steht — eine neue Kategorie
  erzwingt so dieselbe bewusste Entscheidung, die diese ADR für die bestehenden acht trifft.

## Umkehrbarkeit

Sollte eine künftige Entscheidung einen dieser acht Schlüssel doch als portabel einstufen (zum
Beispiel, falls `verwaltungsTyp` einmal auch für die Bürgerin selbst sichtbar/bedeutsam werden
sollte), gehört der Schlüssel in `VOLLIMPORT_MITNEHMEN_SCHLUESSEL` — der Wächter reißt dann so
lange, bis die Klassifikation nachgezogen ist.
