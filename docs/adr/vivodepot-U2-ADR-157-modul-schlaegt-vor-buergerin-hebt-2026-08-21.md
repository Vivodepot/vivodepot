# U2-ADR-157: Ein Modul schlägt vor, die Bürgerin hebt

**Status:** Akzeptiert
**Datum:** 21.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, VERTRAUEN
**Grundlage:** Produktentscheidung vom 21.08.2026
(internes Entscheidungsdokument vom 21.08.2026, Posten 2) und der Auftrag
interner Arbeitsauftrag vom 21.08.2026. Berührt A389 (angedockte Bereiche und
Felder), A383 (die Entkopplung von Blatt und Angehörigen-Cache), U2-ADR-037 (das gemeinsame
Feldmodell).
- **Code-Stelle:** `vivodepot.html` — `_templateDefAlsFeld` (`blattVorschlag` reist mit),
  `blattVorschlagPruefen`, `blattVorschlaege`, `blattFeldHeben`/`-Senken`,
  `blattGehobeneEintraege`, `_blattVorschlagZeileHTML`, `blattVorschlagVerdrahten`,
  `crossRefFeldUndRoh` (der Rückfall auf `_angedockteFeldDef`), Migrationsstufe 71 → 72.
- **ADR-Bezug:** U2-ADR-062 (die Angehörigen-Sicht), U2-ADR-037 (Feldmodell), U2-ADR-104/A44
  (geschlossene Wertelisten mit namentlicher Verwerfung).
- **Status heute:** gilt — gebaut und belegt in `tests/blatt-vorschlag-und-heben.test.js`
  (14 Proben, drei Mutations-Rot-Belege) und in der gedrehten Probe
  `tests/angehoerigen-sicht-modulfeld.test.js`.

---

## Kontext

**Das Angehörigen-Blatt ist der Ort mit der geringsten Kontrolle durch die Bürgerin.** Jemand
liest es in einer Lage, in der sie nicht widersprechen kann — im Krankenhaus, im Heim, nach ihrem
Tod. Drei Sperren hielten bisher jedes fremde Feld davon fern.

**Die Sperre kostet aber genau den Inhalt, für den das Blatt da ist.** Was ein Pflegeheim
mitbrächte — Ernährungsform, Mobilität, Kontinenz, Wundversorgung, Hilfsmittel, Bezugsperson —
wäre auf dem Pflegeheim-Blatt das Nützlichste.

## Entscheidung

**Ein Modul darf ein Feld für ein Angehörigen-Blatt VORSCHLAGEN. Sichtbar wird es erst, wenn die
Bürgerin es selbst dorthin hebt.** Dieselbe Linie wie beim Gültigkeitsbeginn: vorschlagen, nie
setzen. **Die Institution bestimmt nicht, was ein Angehöriger im Ernstfall sieht.**

## Die drei Sperren, gemessen vor dem Bau

| Sperre | Befund |
|---|---|
| `_ANG_SITUATIONEN` eingefroren | **trägt** — `push` wirft (`Object.isFrozen` = true) |
| `_ANG_CACHE_ERLAUBT` | **trägt inhaltlich, aber die Einfrierung ist keine** — `Object.freeze` auf einem `Set` verhindert `add()` NICHT; gemessen wuchs das Set von 75 auf 76. Kein Weg im Produkt ruft `add`, also kein Loch heute — **aber die Sperre ist eine Absichtserklärung, kein Riegel.** Eigene Registerzeile |
| `akutZeileHTML` | **trägt nicht so, wie gedacht:** der Wert kam durch, die Beschriftung nicht — gerendert wurde `tpl_ernaehrungsform`. **Und mehr als die Beschriftung fehlte:** ohne Definition rendert die Zeile mit `{typ:'text'}`, ein Datum stand als `2026-12-01` statt `01.12.2026` |

**Der Rückfall auf die angedockte Definition ist damit der eigentliche Bauteil, nicht das Heben** —
über `_angedockteFeldDef`, also über dieselbe EINE Auflösung, die `kennungFeldDef` schon benutzt.

## Die Form

**Der Vorschlag** ist eine Angabe an der Modul-Definition (`blattVorschlag`), geprüft gegen die
**geschlossene Werteliste der bestehenden fünf Blätter**; ein erfundenes Blatt wird **namentlich
verworfen**. Ein Modul ERGÄNZT, es erweitert die Bühne nicht.

**Ein Vorschlag ändert nichts.** Kein Eintrag auf einem Blatt, kein Hinweis für eine
Vertrauensperson, keine Zeile in einer Ausgabe.

**Das Heben** steht in `data.blattFelder` — einem EIGENEN Schlüssel, nicht an der Definition.
**Die Definition gehört dem Modul, das Heben der Bürgerin;** stünde beides an derselben Stelle,
überschriebe die nächste Lieferung des Anbieters ihre Entscheidung.

**Der Ort ist gemessen, nicht erfunden:** ein angedocktes Feld wird an genau einer Stelle
gerendert — in seinem Bereich. Dort steht ihr Wert, dort gehört die Frage hin. **Der Anbietername
steht im Satz:** sie hebt nicht ein Feld, sie folgt dem Vorschlag von jemandem. **Kein
Sammelschalter** — jeder Knopf hebt genau ein Feld.

**Das Gehobene erscheint in einem eigenen Abschnitt am Ende des Blattes** („Von Ihnen
dazugenommen"), nicht zwischen die eingebauten Blöcke gemischt: wer das Blatt liest, soll sehen,
was zum Blatt gehört und was dazugenommen wurde. **`_ANG_SITUATIONEN` bleibt eingefroren** — das
Gehobene entsteht beim Rendern, nicht in der Registry.

## Was das Heben NICHT tut

**Es weitet den Angehörigen-Cache nicht.** Was ohne Depot-Passwort sichtbar ist, ist seit A383
eine eigene Frage mit einer eigenen Liste, und sie bleibt es. Eigene Probe.

## Zug 3 — wenn das Modul geht

**Gebaut ist die vorsichtigere der zwei vertretbaren Formen: das Feld verschwindet vom Blatt.**
Die Marke der Bürgerin bleibt stehen — kommt das Modul zurück, ist das Feld wieder da, ohne dass
sie erneut hebt.

**Die andere Form** (eingefrorene Kopie: der Wert bleibt auf dem Blatt, auch ohne Modul) ist
vertretbar und liegt als Vorlage vor — Entscheidung offen. **Umschalten ist billiger als eine
Waise auf einem Notfallblatt.**

## Die Zusicherung, die diese ADR trägt

**Ein Modul, das ein Blatt-Feld ohne Zutun der Bürgerin sichtbar macht, macht eine Probe rot.**
Belegt durch Mutation: wird die Hebung im Code übergangen, fallen drei Proben.

---

*Vivodepot GmbH · 21.08.2026*
