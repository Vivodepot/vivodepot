# U2-ADR-138: Ein Dokument kann eine Listen-ZEILE referenzieren, nicht nur ein Listen-FELD — zeilenId, kein Raten

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** DATENMODELL
**Grundlage:** interner Auftrag „M3 – Eintrag-Bezug" (11.08.2026, Weg B),
Nachtauftrag vom 11.08.: der schwerste Posten sei Nummer 3 — er löse zwei halbe
Befunde und tausche ein Datenmodell aus, mit Migration.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `_dokumentFelderNormalisieren` (zeilenId optional),
  `dokumentFelder` (löst die EINE Zeile auf, nicht mehr die ganze Liste),
  `_vorsorgeInstrumentZeileFuerStandardTyp` + `_standardDokumentFelderMitZeile` (Diskriminant-
  Auflösung bei Neuanlage), `dokumentAusStandard`/`dokumentAusErkennung`/`erkennungAblehnen`
  (alle drei Erzeugungswege nutzen dieselbe Auflösung), `dokumenteFuerEintrag` (Rückrichtung,
  berechnet), `depotNormalisieren` Schema 58→59 (Migration bestehender Referenzen).
- **ADR-Bezug:** U2-ADR-071-Nachtrag (stabile Zeilen-id, Grundlage dieses ADRs), U2-ADR-050
  (Rettungsfeld-Muster — hier auf „mehrdeutige Zeile" angewandt statt „entfallenes Feld"),
  U2-ADR-118 (C7, `instrumentDokumentNachtragen` — einer der drei Erzeugungswege, die dieser
  ADR erweitert), U2-ADR-096 (die geteilte Liste `vorsorge_instrumente`, deren Diskriminant
  `typ` diesen ADR trägt).
**Status heute:** gilt — Beleg `tests/m3-eintrag-bezug-zug1.test.js#[M3·Zug1] Migration 58→59:
ZWEI Zeilen, kein Diskriminant-Treffer → KEIN Raten, Referenz bleibt feld-basiert`.

---

## Der Befund

`doc.felder[]` referenzierte bislang ausschließlich `{sektorId, feldId}` — ein FELD, nicht eine
Zeile. Für ein Skalarfeld (`identitaet.ausweis_gueltig`) ist das eindeutig. Für ein Listenfeld
(`vorsorge.vorsorge_instrumente`, 17 Listenfelder insgesamt im Schema) ist es das NICHT: die
Referenz sagt „irgendwo in dieser Liste", nicht „diese Zeile".

**Gemessen (Zug 0), nicht angenommen:** der `standardDokumente`-Katalog trägt heute 14
Feld-Vorverknüpfungen. Sieben zeigen auf ein Feld ohne Liste (eindeutig, unverändert). Die
ÜBRIGEN SIEBEN zeigen ALLE auf dieselbe Liste — `vorsorge.vorsorge_instrumente`
(Vorsorgevollmacht, Patientenverfügung, Testament, Betreuungsverfügung, Sorgerechtsverfügung,
KI-Verfügung, Bankvollmacht). Kein anderes Listenfeld ist betroffen. Das ist der gesamte
Umfang des Befunds — kein Datenwust über 17 Listen, sondern EIN konzentrierter Fall.

## Entscheidung — zeilenId, WO eindeutig auflösbar, sonst Rettungsfeld

`doc.felder[]`-Einträge tragen jetzt optional `zeilenId` — die stabile, migrationsfeste
Listen-Zeilen-id (U2-ADR-071-Nachtrag, `uuidV4()` bei Zeilenanlage). Zwei Wege dorthin,
BEIDE ohne Raten:

**1 — Diskriminant (bei Neuanlage, alle drei Erzeugungswege):** `standardDokumente[].typ`
(z. B. `'testament'`) deckt sich 1:1 mit dem `typ`-Unterfeld der `vorsorge_instrumente`-Zeile
— EINE dokumentierte Ausnahme: `'bankvollmacht'` ist zeilenintern `typ='vorsorgevollmacht'` +
`art='bank'`. Kein Raten: der Diskriminant ist keine Heuristik, sondern derselbe Wert, den der
Katalog-Eintrag selbst schon trägt. `dokumentAusStandard` (Panel-Übernahme + C7/Weg-3 via
`_dokumentTypRegistrieren`), `dokumentAusErkennung` (Vorschlag annehmen) und
`erkennungAblehnen` (dünner Ablehn-Datensatz) nutzen alle `_standardDokumentFelderMitZeile` —
EIN Weg, keine drei Varianten derselben Regel.

**2 — Einzeiler (nur Migration bestehender Referenzen, Schema 58→59):** trägt die Ziel-Liste
HEUTE genau eine Zeile, ist die Referenz ebenfalls eindeutig — der Auftrag erlaubt das
ausdrücklich, weil eine einzige Zeile keine Wahl offenlässt.

**Sonst: unverändert feld-basiert.** 0 Zeilen, ≥2 Zeilen ohne Diskriminant-Treffer — die
Referenz bleibt, wie sie heute ist. Das Dokument bleibt GENAUSO auffindbar wie vor diesem ADR
(Rettungsfeld-Prinzip, U2-ADR-050). Keine Warnung, kein Modal, keine erzwungene Zuordnung —
die Bürgerin kann eine Zeile später selbst zuweisen (Zug 3/4, noch offen), wird aber nie dazu
gedrängt.

## Rückrichtung — berechnet, nicht gespeichert

`dokumenteFuerEintrag(sektorId, feldId, zeilenId)` scannt `data.dokumente[]` nach passenden
`felder[]`-Einträgen — dieselbe Bauform wie `personReferenzStellen`. KEINE zweite, gespeicherte
Rückrichtung: zwei gespeicherte Richtungen sind zwei Stände, die auseinanderlaufen können.

## Migration (Schema 58→59)

Additiv, idempotent, verlustfrei — dasselbe Muster wie jede Stufe in `depotNormalisieren`.
Läuft über JEDE bestehende `felder[]`-Referenz ohne `zeilenId`: Diskriminant-Versuch zuerst,
sonst Einzeiler-Regel, sonst unverändert. Eine Referenz, die schon `zeilenId` trägt, wird nicht
erneut angefasst — ein zweiter Lauf verändert nichts mehr (Regel 18, real geprüft).

## Was NICHT Teil dieser Entscheidung ist

**Keine UI-Änderung.** Die Feld-Verknüpfungs-Checkbox im Dokument-Panel
(`[data-doku-feld]`) schreibt weiterhin feld-basiert — sie zeigt eine Checkbox PRO FELD, nicht
pro Zeile, und das ändert dieser Zug nicht (wäre eine eigene UI-Erweiterung, hier nicht
verlangt).

**Kein genereller Diskriminant-Mechanismus.** `_vorsorgeInstrumentZeileFuerStandardTyp` ist
bewusst NUR für `vorsorge_instrumente` gebaut (Zug-0-Messung: die einzige betroffene Liste,
kein zweiter Aufrufer heute) — kein generisches Framework für „jede Liste mit Diskriminant".

**Adresse/Partei-Felder am Dokument, W-8-Gegenprüfung, Browser-Abnahme mit Mehrfach-Zeilen-
Szenario** bleiben offen (Zug 2ff., s. Bericht — vom Auftrag ausdrücklich als möglicherweise
unvollständig bei Nachtende akzeptiert).

## Verifikation

Regel 18 (rot⇄grün, real geprüft), `tests/m3-eintrag-bezug-zug1.test.js`, 22 Proben: Zug-0-Zahlen
gepinnt (14/7/7), Normalisierung/Auflösung (inkl. verwaister Zeile, Konsequenz-8-Muster),
Diskriminant an allen drei Erzeugungswegen (inkl. Bankvollmacht-Sonderfall, inkl. „keine
passende Zeile → kein Raten"), Migration (Diskriminant, Einzeiler, Mehrzeiler-ohne-Raten,
Fremd-Liste außerhalb vorsorge_instrumente, Idempotenz-Erhalt, echter Doppellauf, Leerliste),
Rückrichtung (Treffer, Nicht-Treffer an falscher Zeile, defensiv ohne Depot). Volle Suite
3450/3450 grün, kein einziger Regressions-Fund. `tests/fixtures/migrations-stufen.js` trägt den
Schema-59-Sprung (`geprueftIn`, Schema-Governance-Guard grün).
