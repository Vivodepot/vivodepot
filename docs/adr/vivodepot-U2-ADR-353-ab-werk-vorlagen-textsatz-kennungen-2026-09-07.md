# U2-ADR-353 · Die zwei Ab-Werk-Vorlagen bekommen Textsatz-Kennungen — lokal, kein Präzedenzfall

**Status heute:** gilt
**Datum:** 07.09.2026
**Betrifft:** `vivodepot.html` (`TEXTSATZ_ARTEN_DOKUMENT`, `TEXTSATZ_EINGEBAUT`,
`_logikModulTexteAufloesen`, `_modulOderVorlage`), `ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT`,
`ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT`
**Anlass:** im Zuge des Baukasten-Umbaus, Auftrag im Anschluss an `a5`s Fund
(Bündel-Umzug macht hartcodierte Texte sichtbar)

---

## 1 · Der Befund

`a5` fand beim Umzug ins Bündel: die Frage- und Abschnittstexte der zwei Ab-Werk-Vorlagen
(`erbschein-vorbereitung`, `zugang-zum-recht-beratungshilfe`) sind reines hartcodiertes Deutsch.
Kein Sprachmodul konnte sie erreichen — anders als jedes andere Dokument-Modul (Patientenverfügung,
Vollmacht, Betreuungsverfügung, KI-Verfügung), das über `_textsatzAufDokumentModulAnwenden`
läuft.

**Gemessen (07.09.2026): 57 verschiedene Wortlaute, 83 Kennungs-Stellen** (Positionen mit
gleichem Wortlaut — z. B. „— nicht erfasst —" — zählen einzeln, weil jede Position später
unabhängig übersetzbar bleiben muss). `a5`s ursprüngliche Zahl (36) maß eine Teilmenge: das
Erhebungswerkzeug (`tools/textsatz-traeger-erheben.js`) kennt `luecke` und `dokAusgabe`/`h1`/
`herkunftText` u. a. nicht im Arten-Filter — geprüft von `a5` selbst, bestätigt.

## 2 · Warum nicht der bestehende Mechanismus

`_textsatzAufDokumentModulAnwenden` (der Läufer für PV_MODUL/KI_MODUL/VOLLMACHT_MODUL/
BETREUUNG_MODUL) passt strukturell auf `abschnitte[].bloecke[]` — Kennung
`dok:<id>#<abschnittIndex>/<feldId-oder-Index>.<art>`, Block-Anker `feldId` wo vorhanden, sonst
Index (`_textsatzBlockAnker`). Zwei Lücken verhindern die direkte Wiederverwendung:

- **`luecke` fehlte im Arten-Vokabular** (`TEXTSATZ_ARTEN_DOKUMENT`) — behoben, s. Abschnitt 3.
- **`dokAusgabe` (h1/herkunftText/unterschriftErsatzHinweis/fussText/toolbarHinweis) hat kein
  Vorbild.** Geprüft: `Object.keys(PV_MODUL)` enthält kein `dokAusgabe` — diese Form tragen
  ausschließlich die zwei logikModul-Vorlagen. Dazu kommt ein struktureller Unterschied: PV_MODUL
  & Co. sind eingebaute Kern-Konstanten mit EINEM Boot-Ort; die zwei Vorlagen sind
  `data.logikModule[]`-Einträge, pro Depot geladen, ohne festen Boot-Ort — `_modulOderVorlage(id)`
  baut sie bei jedem Lesen neu aus dem gespeicherten Rohdatensatz (`logikModulPruefen`).

## 3 · Die Entscheidung

**Lokal, nicht generisch — entschieden am 07.09.2026.** Aus einem Beispiel verallgemeinert man nicht: ein
Läufer, der ALLE künftigen `logikModule` generisch abdeckt, ist eine Architekturentscheidung und
ist eine Produktentscheidung, nicht diesem Zug.

1. **`luecke` in `TEXTSATZ_ARTEN_DOKUMENT` ergänzt** — das ist der generische Teil und gehört
   dazu: ein Vokabular, das den halben Knoten kennt, übersetzt den halben Knoten (bereits
   dokumentierter Grundsatz an derselben Konstante).
2. **Neue Funktion `_logikModulTexteAufloesen(bundle)`** — läuft NUR über `abschnitte[].titel`,
   `bloecke[].frage`/`.luecke`/`.texte[]` und `dokAusgabe.{h1,herkunftText,
   unterschriftErsatzHinweis,fussText,toolbarHinweis}`, mit demselben Kennungsschema
   (`dok:<id>#…`/`dok:<id>.…`) wie der bestehende Läufer — **derselbe Namensraum**, damit eine
   spätere Verallgemeinerung keine zweite Kennungswelt erzeugt. Mutiert `bundle` nicht (baut eine
   flache Kopie), aus Vorsicht, nicht aus einer Annahme über Aufrufer-Stabilität.
3. **Verdrahtet in `_modulOderVorlage`**, direkt nach `logikModulPruefen`, vor dem Bau von
   `generator`/`dokAusgabe` — betrifft ausschließlich Bundles, deren Kennungen im Satz stehen.
   Ein fremdes/drittes `logikModul` ohne registrierte Kennungen läuft unverändert durch:
   `textLesen` liefert dort überall `null`, der `||`-Rückfall greift auf den Bundle-Text selbst
   zurück — keine Verhaltensänderung für alles, was nicht diese zwei Vorlagen ist.
4. **83 `TEXTSATZ_EINGEBAUT`-Einträge** (`dok:erbschein-vorbereitung#…`,
   `dok:zugang-zum-recht-beratungshilfe#…`), Wert = der bisherige, unveränderte deutsche
   Wortlaut. Keine Verhaltensänderung, solange kein Sprachmodul eine dieser Kennungen überschreibt.

**KEIN PRÄZEDENZFALL FÜR WEITERE `logikModule`.** Sobald ein zweiter Fall auftritt, gehört
`_logikModulTexteAufloesen` durch einen generischen Läufer ersetzt (Weg A) — das ist eine
Produktentscheidung, nicht dieses ADR. Bis dahin bleibt dies die lokale, benannte
Ausnahme, kein Muster zum Nachbauen.

## 4 · Was bewusst NICHT gehoben wurde

**`format.praefix: "Testament, "`** (ein einziges Vorkommen, im Erbschein-Bundle, Block
`testament_form`) — sitzt eine Ebene tiefer als `_logikModulTexteAufloesen` greift
(`block.format.praefix`, nicht `block[art]`). Bleibt inline, benannt statt stillschweigend
übergangen — eine Erweiterung des Läufers für eine einzige Stelle stand nicht im Verhältnis.

**Die Lese-App (`vivodepot-lesen.html`) ist NICHT Teil dieses Zugs — eigenes ADR, U2-ADR-357,
mit `0b` abgesprochen** (gleicher Mechanismus, eigenständiges Stück: eigene Kern-Struktur, eigene
generierte Tabelle, kein Nachtrag zu 349). Sie führt eine eigene, byte-gespiegelte
Interpreter-Kopie (`LOGIK_BLOCK_TYPEN_LESEN`, eigenes `frageAntwortOderLuecke`, eigenes
`textLesen`) ohne eigenes `TEXTSATZ_EINGEBAUT`.

## 5 · Beleg

Kein neuer Test geschrieben (reine Kennungs-/Vokabular-Ergänzung, keine neue Fachlogik). Bestehende
Proben gezielt gegen den geänderten Kern gefahren, alle grün:

- `tests/erbschein-ab-werk-einlass.test.js` — 8/8 (u. a. „inhaltsgleich zur einzigen Quelle",
  Rot-Beweis gegen den alten Zustand)
- `tests/zugang-zum-recht-ab-werk-einlass.test.js` + `tests/lese-app-zugang-zum-recht-auszug.test.js`
  — 11/11
- `tests/pv-generator-byte-identisch.test.js` + `tests/textsatz-dokumentmodule-u2-adr-333.test.js`
  — 18/18 (bestätigt: die vier eingebauten Dokument-Module bleiben byte-gleich, keine
  Seiteneffekte durch die Vokabular-Erweiterung)

**Kein voller Suite-Lauf** (Gate-Disziplin, mehrere Sitzungen bauen parallel dieselbe Nacht,
Läufe werden einzeln freigegeben).

## 6 · Offene Anschlussfragen — benannt, nicht verschwiegen

- Lese-App-Seite (Abschnitt 4) — erledigt, U2-ADR-357.
- ADR-Nummer per zentraler Vergabe (07.09.2026): 353. Zwischenzeitlich als 350
  gewählt, dann als 353 gebaut (350/351/352 waren beim Umbenennen bereits an cb/e2/df
  vergeben) — Nummer beim Landen letztgültig aus der zentralen Vergabe übernommen, nicht
  selbst zugeteilt.
- Rückstand-Fixture (`tests/fixtures/u2-adr-322-rueckstand-ungedeckte-texte.json`): die 57 Texte
  standen dort nie (das Erhebungswerkzeug sah sie vorher gar nicht, s. Abschnitt 1) — es gibt
  nichts, was aus dieser Datei herauszunehmen wäre. Wer `tools/textsatz-traeger-erheben.js` um
  `luecke`/`dokAusgabe` ergänzt, sollte das als eigenen, benannten Zug tun (ändert die 134er-Zahl
  auf der Gegenseite, nicht Teil dieses ADR).
