# U2-ADR-312 · SEKTOREN leer, ohne Sturz — WIZARDS bindet auf Lesezeit, nicht auf Auswertungszeit

**Datum:** 05.09.2026
**Status heute:** gilt
**Bezug:** U2-ADR-304 (die Landkarte — welche zehn Stellen umfallen, wenn `SEKTOREN` quelltextlich
leer ist, in einer eigenen Sitzung gemessen) · U2-ADR-292/299/303 (`buergermodulSektorErsetzen`,
`buergermodulBuendelAnwenden` — der Laufzeit-Ladeweg, der laut ADR-304 für dieses eine Konstrukt
strukturell zu spät kommt) · U2-ADR-311 (derselbe Getter-Kunstgriff, dort für Objekt-Identität)

---

## 1 · Der Befund, den dieser ADR schließt

U2-ADR-304 maß, nicht behob: mit `SEKTOREN` quelltextlich leer (Array-Literal durch `[]` ersetzt)
bricht die Skript-AUSWERTUNG selbst ab, an genau zehn Stellen, alle in `const WIZARDS`
(`vivodepot.html:16206`) — acht über `_katalogOptionen(sektorId, feldId)`, die `optionen:
_katalogOptionen(...)` als FESTE Eigenschaft banden, zwei über den `pvwiz`-Guard
(`pv_vollmacht_besprochen`/`pv_betreuung_besprochen`), der `feld = _feldDef('vorsorge', feldId)`
ebenso bei der `.map()`-Konstruktion auflöste. Beide Muster lösen ihre Katalog-/Feld-Referenz bei
der KONSTRUKTION auf, nicht beim späteren Lesen — der bestehende Laufzeit-Ladeweg
(`buergermodulSektorErsetzen`/`buergermodulBuendelAnwenden`) kommt für dieses eine Konstrukt darum
strukturell zu spät: er läuft aus `depotAnlegen()`, lange NACH der Skript-Auswertung, die aber
bereits vorher abgestürzt ist.

ADR-304 nannte zwei gangbare Richtungen (§6), ohne zu entscheiden. Dieser ADR entscheidet und baut
Richtung 1: **`WIZARDS`s Katalog-Auflösung auf AUFRUFZEIT verschieben.**

---

## 2 · Die Entscheidung — zwei Teile

**Teil 1 — alle zehn Stellen auf Lesezeit verschoben.** Die acht `_katalogOptionen`-Aufrufe sind
jetzt `get optionen() { return _katalogOptionen(...); }` statt `optionen: _katalogOptionen(...)` —
derselbe Kunstgriff, den U2-ADR-311 für zwei dieser acht Stellen bereits aus einem ANDEREN Grund
(Objekt-Identität statt Konstruktions-Absturz) eingeführt hatte. Der `pvwiz`-Guard folgt demselben
Muster, aber verteilt auf drei abgeleitete Eigenschaften (`get feld()`, `get frage()`, `get
hilfetext()`), da `frage`/`hilfetext` selbst aus `feld.label`/`feld.hint` folgen und nicht
unabhängig lesbar sein dürfen, ohne `feld` ein zweites Mal aufzulösen.

**Teil 2 — `_katalogOptionen` selbst unterscheidet zwei Zustände, ohne Kennzeichen, ohne
Modus-Parameter:**

```
Bereich fehlt GANZ   (kein Struktur-Bündel geladen)   → Betriebszustand   → [] statt Wurf
Bereich BEFÜLLT,     dieses EINE Feld fehlt darin      → echter Tippfehler → Wurf, wie bisher
```

Der Zustand selbst trägt die Antwort. `_feldDef` unterscheidet diese zwei Fälle NICHT — sie liefert
in beiden `undefined` (`if (!sek) return undefined;` bzw. ein `.find()` ohne Treffer). Die
Unterscheidung steht darum in `_katalogOptionen` selbst, direkt gegen `SEKTOR_BY_ID[sektorId]`:

```js
function _katalogOptionen(sektorId, feldId, erlaubteWerte) {
  if (!SEKTOR_BY_ID[sektorId]) return [];
  const def = _feldDef(sektorId, feldId);
  if (!def || !def.optionen) throw new Error(`_katalogOptionen: kein Katalogfeld ${sektorId}.${feldId} mit optionen gefunden`);
  return erlaubteWerte ? def.optionen.filter((o) => erlaubteWerte.includes(o.wert)) : def.optionen;
}
```

Der `pvwiz`-Guard prüft dieselbe Bedingung (`!SEKTOR_BY_ID.vorsorge`) vor seinem eigenen Wurf und
liefert `null` statt eines Fehlers, wenn der Bereich ganz fehlt — geworfen wird weiterhin, wenn
`vorsorge` befüllt ist, aber genau dieses Feld darin nicht existiert.

---

## 3 · Der Beweis

**`tests/sektoren-leer-ueberlebt.test.js`** (neu, fünf Proben, Kunstgriff wie
`tests/inline-texte-ratsche.test.js`: `KERN_HTML_PATH` auf eine verworfene Kopie mit
quelltextlich geleertem `SEKTOREN`, Arbeitsbaum unangetastet):

1. **Der Kern bootet mit leerem `SEKTOREN`** — `V.WIZARDS.length === 7`, alle sieben Assistenten
   werden weiterhin gebaut, die Auswertung bricht nicht mehr ab (ADR-304 §3 ist geschlossen).
2. **`_katalogOptionen` liefert `[]`**, wenn der Bereich ganz fehlt (`identitaet.familienstand`
   über `heirwiz`).
3. **`pvwiz` liefert `feld: null`** für beide „besprochen"-Schritte, wenn `vorsorge` ganz fehlt —
   kein Wurf.
4. **`[Optionslabel·ROT]` — der Rot-Beweis, ohne den Teil 2 eine Aufweichung wäre, keine
   Unterscheidung:** ein befüllter Bereich (`identitaet`, echter Kern, echtes Bündel) mit einer
   ERFUNDENEN Feld-Kennung wirft weiterhin — ein echter Tippfehler verschwindet nicht lautlos.
5. **Die Gegenprobe dazu:** derselbe befüllte Bereich mit einer ECHTEN Kennung
   (`identitaet.familienstand`) liefert den echten, nicht-leeren Katalog.

Zusätzlich: die bestehenden 45 Proben aus U2-ADR-292/299/311
(`buergermodul-sektor-ersetzen`/`buergermodul-aufrufer`/`pvwiz-inhalt-besprochen`/
`textsatz-vollstaendigkeit-optionslabel`/`erste-partei-zone`) bleiben unverändert grün — der
Struktur-Achse-Ladeweg MIT geladenem Bündel bleibt byte-identisch, wie U2-ADR-300 es fordert.

---

## 4 · Was das NICHT zeigt — ausdrücklich, wie schon in ADR-304 §5

- **Kein Renderpfad geprüft** (`renderSektor`, Wizard-Schritt-Rendering) — mit `feld: null` bei den
  `pvwiz`-Schritten ist ein rendernder Zugriff auf `schritt.feld.typ` ungeprüft. Ein Guard
  (`schritt.feld && schritt.feld.id`) existiert bereits an EINER zentralen Stelle
  (`_textsatzAufWizardsAnwenden`, `vivodepot.html:10934`), aber nicht notwendig überall, wo ein
  Schritt gerendert wird. Bewusst ausgelassen — DOM-lastig, bräuchte Playwright, war nicht der
  Gegenstand dieses Baus (Konstruktion überlebt, nicht: jede Interaktion mit einem leeren Bereich
  ist pixelgenau geprüft).
- **Kein echter Wizard-Durchlauf** ohne geladenes Bündel — dieselbe Grenze wie ADR-304 §5.
- **Der native `SEKTOREN`-Bestand selbst ist an dieser Stelle noch nicht aus der Datei entfernt.**
  Dieser ADR macht das ENTFERNEN GEFAHRLOS (der Kern stürzt nicht mehr ab, wenn es passiert) — er
  entfernt den Bestand nicht. Das ist der nächste, eigene Schritt, mit eigenem Beweis (Datei wird
  dabei kaum kleiner, der Inhalt zieht ins Bündel um, verschwindet nicht — Auflage).

---

## 5 · Zusammenarbeit

Eine eigene Sitzung: die vollständige Landkarte (U2-ADR-304) — alle zehn Stellen benannt,
mit Zeilennummern, bevor hier eine einzige angefasst wurde. Eine weitere Sitzung: die Betriebszustand-vs-
Tippfehler-Unterscheidung ohne Kennzeichen, und die drei Proben, die sie beweisen statt behaupten.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
