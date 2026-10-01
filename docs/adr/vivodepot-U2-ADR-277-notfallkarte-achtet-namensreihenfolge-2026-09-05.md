# U2-ADR-277: Die Notfallkarte achtet `displayFamilyNameFirst` — die eine Stelle, die U2-ADR-256 ausließ

**Status:** Angenommen — Fehlerbehebung, folgt aus der bestehenden Einstellung „Familienname zuerst anzeigen“ (U2-ADR-256); nachgetragen am 28.09.2026 (bis dahin nie gelandet), keine neue Entscheidung
**Datum:** 05.09.2026
**Kategorie:** KORREKTHEIT, PRODUKTFEHLER
**Linie:** U2
**U2-Bezug:** Schließt eine Lücke, die U2-ADR-256 (Namens-Anzeigereihenfolge kommt vom Menschen)
offen ließ — dort wurden 21 Kompositionsstellen in `vivodepot.html` durch `identitaetAnzeigename()`
ersetzt, die Notfallkarte war eine 22., die dabei nicht gefunden wurde. Ändert an U2-ADR-256s
Entscheidung selbst nichts.
**Status heute:** gilt — Beleg `tests/notfallkarte.test.js#[U2-ADR-277]`,
`tests/notfallkarte.test.js#[U2-ADR-277·Gegenprobe]`.

---

## Kontext

`identity.displayFamilyNameFirst` ist ein Feld, das eine Bürgerin **bewusst setzt**, damit ihr Name
überall in der Anwendung in der für sie richtigen Reihenfolge erscheint (Chinesisch, Japanisch,
Koreanisch, Ungarisch: Nachname zuerst). U2-ADR-256 hat diese Einstellung an 21 Stellen im Kern und
einer eigenen Kopie in `vivodepot-lesen.html` durchgesetzt. `notfallKartenMeta()` — die Funktion,
die den Namen für die gedruckte/als PDF erzeugte Notfallkarte liefert — komponierte weiterhin fest
`[givenName, familyName, secondLastName]` und ignorierte das Feld.

**Das ist kein Umbau-Rest, sondern ein Produktfehler:** Die Notfallkarte ist das eine Dokument, das
eine **fremde Person unter Druck** liest. Eine falsche Namensreihenfolge dort ist kein
Schönheitsfehler — die Auflage dazu war eindeutig: keine bekannten Fehler ungefixt mit in die
Migration nehmen.

## Was genau gemessen wurde (Umfang, damit hier niemand nachmessen muss)

**Diese Entscheidung stammt vom 05.09.2026 (Kanon `f2acbd4e`, SCHALEN_STAND v544) — gefällt, aber
nie gelandet, und zwölf Tage lang eine offene Übergabe geblieben** (Fund einer
ADR-Nummernlücken-Erhebung, 17.09.2026). Am heutigen Kanon (`dceab851`) nachgemessen, vor dem Bau:

- **Der Fehler besteht unverändert.** `notfallKartenMeta()` komponiert weiterhin
  `[ident.givenName, ident.familyName, ident.secondLastName].filter(Boolean).join(' ')`, ohne
  `identity.displayFamilyNameFirst` zu prüfen.
- **`identitaetAnzeigename(` kommt in `vivodepot.html` heute 23-mal vor** — 1 Definition + 22
  Aufrufer (vor diesem Fix: 21, wie am 05.09. gemessen — U2-ADR-256s eigene Umstellung ist seither
  unverändert). `notfallKartenMeta()` war die einzige fehlende Kompositionsstelle.
- **Feld- und Sektor-Kennungen haben sich seit dem 05.09. verschoben** (Englisch-Vereinheitlichung,
  U2-ADR-359/U2-ADR-367 u. a.): der Sektor heißt heute `identity` statt `identitaet`, die Felder
  `givenName`/`familyName`/`secondLastName`/`displayFamilyNameFirst` statt
  `vorname`/`nachname`/`nachname2`/`familienname_zuerst`. `identitaetAnzeigename()` selbst wurde
  bereits auf die neuen Kennungen umgestellt (Teil derselben Umbenennung) — der ursprüngliche
  05.09.-Patch trug noch die alten Kennungen und ist damit BYTEWEISE veraltet; der FUND und die
  ENTSCHEIDUNG bleiben unverändert gültig, nur der Wortlaut der Zeile ist heute ein anderer.
- **`vivodepot-lesen.html`** trägt weiterhin ihre eigene Kopie der Funktion (bewusst getrennt, kein
  Laufzeit-Modul geteilt) — unauffällig, kein Fund dort.
- **Der Vorlagen-Generator, `vivodepot-vc-issuer.html`,
  `vivodepot-schluessel-teilen.html`: weiterhin null Treffer.** Diese drei Dateien komponieren an
  keiner Stelle einen Anzeigenamen.
- **Die live Notfall-Ansicht** (`renderNotfall()`/`notfallKernModell()`) komponiert weiterhin
  keinen zusammengesetzten Namen — sie zeigt Vor-/Nachname als getrennte Zeilen mit eigenem Label.
  Nicht betroffen.
- **Die Lese-App hat weiterhin keinen Notfallkarten-Erzeuger** — der betroffene Ausgabeweg
  existiert dort nicht.

**Ergebnis: die gedruckte/als PDF erzeugte Notfallkarte war und ist die einzige verbliebene
Stelle.**

## Die Entscheidung

**`notfallKartenMeta()` ruft jetzt `identitaetAnzeigename(ident)` statt den Namen selbst
zusammenzusetzen.** Eine Zeile, keine weitere Datei betroffen.

`meta.name` läuft ausschließlich in die Fußzeile der Karte, die bereits über
`doc.splitTextToSize(...)` umbricht (`zeichneNotfallkarte`) — dieselben Zeichen in anderer
Reihenfolge ändern die Gesamtlänge nicht, kein Umbau der Fußzeilen-Gestaltung nötig oder
vorgenommen.

**Bewusst NICHT Teil dieser ADR:** keine weitere Kompositionsstelle wurde „bei der Gelegenheit"
verallgemeinert oder mitgezogen — eine Zeile, ein Wächter, ein ADR.

## Der Wächter

`tests/notfallkarte.test.js` — zwei neue Proben, die die **Wirkung** prüfen, nicht den Wortlaut der
behobenen Zeile:

- `[U2-ADR-277]`: mit gesetztem `identity.displayFamilyNameFirst` liefert `notfallKartenMeta()` den
  Namen in Nachname-zuerst-Reihenfolge (`'Zhang Wei'` für Vorname „Wei", Nachname „Zhang").
- `[U2-ADR-277·Gegenprobe]`: ohne das Feld bleibt die Karte bytegleich zur alten Formel
  (`'Maria García López'`) — dieselbe Auflage wie bei U2-ADR-256 selbst, bestehende Depots dürfen
  sich nicht bewegen.

Ein künftiger Umbau, der die Einstellung an dieser Stelle wieder ignoriert — mit welcher
Formulierung auch immer — macht diese Probe rot, weil sie das tatsächliche Ergebnis prüft, nicht
den Aufruf `identitaetAnzeigename(` im Quelltext.

## Belege

```konformitaet
aussage:  notfallKartenMeta() setzt den Namen nach identity.displayFamilyNameFirst zusammen (Nachname zuerst, wenn gesetzt).
zustand:  geprüft
pruefung: tests/notfallkarte.test.js#[U2-ADR-277] notfallKartenMeta achtet displayFamilyNameFirst — dieselbe Einstellung, die überall sonst gilt
```

```konformitaet
aussage:  Ohne gesetztes identity.displayFamilyNameFirst bleibt notfallKartenMeta() bytegleich zur bisherigen Formel.
zustand:  geprüft
pruefung: tests/notfallkarte.test.js#[U2-ADR-277·Gegenprobe] ohne displayFamilyNameFirst bleibt die Karte bytegleich zur alten Formel
```

---

*Vivodepot GmbH · Berlin · 05.09.2026 · nachgetragen 17.09.2026 (der Stand lag zwölf Tage
unerreichbar in einem inzwischen gelöschten Wegwerf-Arbeitsbaum, außerhalb des Kanons als Patch
gerettet — gegen den heutigen Kanon neu gemessen, Feld-/Sektor-Kennungen der zwischenzeitlichen
Englisch-Vereinheitlichung angeglichen, Entscheidung unverändert)*
