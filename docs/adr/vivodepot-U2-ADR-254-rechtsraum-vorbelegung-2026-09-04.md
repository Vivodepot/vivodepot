# ADR — Rechtsraum-Vorbelegung: Vorschlagswert statt hartem DE, an zwei Stellen

**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — `_rechtsraumVorschlagswert()` und beide Aufrufstellen im Kern vorhanden,
`tests/u2-adr-254-rechtsraum-vorbelegung.test.js` grün.
**Datum:** 4. September 2026
**Entscheidung:** Zuschnitt bestätigt.
**Bezug:** U2-ADR-121 (Rechtsraum-Katalog über die Instrument-Typen, Punkt 2 + Punkt 5 + „Ausdrücklich
offen") · U2-ADR-252 (Vor-Depot-Module überleben die Anlage — macht ein Rechtsraum-Modul überhaupt
erst zuverlässig andockbar)

---

## Kontext und Problem

U2-ADR-252 hat dokumentiert, dass ein Rechtsraum-Modul korrekt andockt — Daten UND Live-Registry.
Trotzdem übergaben alle bekannten Aufrufer von `_rechtsraumKatalogLesen` hart `'DE'`. Ein
angedocktes Rechtsraum-Modul KAM AN, WIRKTE aber nirgends.

Messung vor dem Bau (Befund, nicht wiederholt hier): von fünf Aufrufern sind nur zwei echte
Instrument-Stellen. Drei (`VORSORGE_MODULE.form.paragraf` ×2, `LISTEN_AUSWAHLFORM.testament`) sind
bei Skript-Ladezeit eingefrorene Metadaten über den DEUTSCHEN `typ` selbst — nach U2-ADR-121
Punkt 3/4 bräuchte ein fremdes Pendant einen eigenen `typ`-Eintrag, keine Mutation dieser drei. Sie
bleiben bewusst `'DE'` — das ist keine Nachlässigkeit, sondern folgt aus der Zweck-Ebene des ADR.

Die zwei echten Stellen: die Stempelstelle (`listenEintragHinzufuegen`, setzt beim Anlegen eines
neuen Vorsorge-Instruments `neu.rechtsraum` fest auf `'DE'`) und ein Lesepfad
(`notvertretungAblaufText`, § 1358 BGB Ehegattennotvertretungsfrist), der ein bereits gestempeltes
`zeile.rechtsraum` ignoriert und immer `'DE'` beim Katalog abfragt.

## Entscheidung

**Bleibt vollständig innerhalb von U2-ADR-121, entscheidet nichts neu:**

U2-ADR-121 Punkt 2 hat die Architekturfrage bereits beantwortet: Rechtsraum ist eine
Instrument-Eigenschaft, kein Depot-Attribut (ein Depot-Feld als Speichermodell ist ausdrücklich
verworfen — bricht den Mehrfach-Rechtsraum-Fall/Immigration). Ein depot-/kontextabgeleiteter Wert
als bloßer **Vorschlagswert** für neue Instrumente ist dagegen ausdrücklich vorgesehen
(„höchstens ein Vorschlagswert ... keine Aussage über den Inhalt des Depots").

### 1 — `_rechtsraumVorschlagswert()` (neu, `vivodepot.html`, direkt nach `_rechtsraumKatalogLesen`)

```js
function _rechtsraumVorschlagswert() {
  const angedockt = Object.keys(_RECHTSRAUM_MODUL_REGISTRY);
  return (angedockt.length === 1) ? angedockt[0] : 'DE';
}
```

Ist GENAU EIN nicht-deutscher Rechtsraum angedockt, ist er der einzig eindeutige Vorschlag. Bei
keinem oder mehreren angedockten bleibt der bisherige `'DE'`-Pfad **unverändert** — kein Ratespiel
bei echtem Mehrfach-Rechtsraum, für den das bürgersichtbare Auswahlfeld laut U2-ADR-121 weiterhin
„Ausdrücklich offen" bleibt. Diese Fallunterscheidung erfüllt die Auflage „miss, was ohne gesetzten
Rechtsraum passiert" durch Konstruktion: der 0-Fall UND der Mehrfach-Fall nehmen beide denselben
Pfad wie vor diesem ADR.

### 2 — Stempelstelle (`listenEintragHinzufuegen`)

`neu.rechtsraum = 'DE'` → `neu.rechtsraum = _rechtsraumVorschlagswert()`. `rechtsraumAngenommen`
bleibt in jedem Fall `false` — ein Vorschlagswert ist keine Bestätigung der Bürgerin, auch nicht,
wenn er von `'DE'` abweicht. `katalogStand` fragt konsequent denselben gestempelten Rechtsraum ab
(vorher hart `'DE'`) — sonst trüge ein FR-gestempeltes Instrument einen deutschen Katalogstand.

### 3 — Lesepfad (`notvertretungAblaufText`)

Liest jetzt `zeile.rechtsraum` (Rückfall `'DE'` für Alt-Daten ohne das Feld, U2-ADR-121 Punkt 6)
statt fest `'DE'`. Ohne einen angedockten Katalogeintrag für den gestempelten Rechtsraum liefert
die Funktion `''` (Unbekannt-Skip, U2-ADR-121 Punkt 7) — **kein** Ablauf-Hinweis ist hier die
sichere Antwort, nicht die deutsche Sechs-Monats-Frist unter falscher Flagge.

### Was ausdrücklich NICHT gebaut wird

- **Kein bürgersichtbares Rechtsraum-Auswahlfeld.** Bleibt „Ausdrücklich offen" wie in U2-ADR-121 —
  die vorhandenen FR/AT/GB-Testmodule sind nach eigenem Beleg
  (`tests/a481-rechtsraum-gb-beleg.test.js`, zitiert eine Entscheidung vom 22.08.2026:
  „entschieden ist, dass UK im Gerüst MÖGLICH sein muss — nicht, dass UK gebaut wird") Beweis für
  den Andock-MECHANISMUS, kein echter zweiter Rechtsraum. Der von U2-ADR-121 selbst gesetzte
  Auslöser ist nach eigenem Maßstab nicht erreicht.
- **Kein Depot-Attribut.** U2-ADR-121 verwirft das ausdrücklich.
- **Keine Änderung an den drei statischen Katalog-Stellen** (`VORSORGE_MODULE.form.paragraf` ×2,
  `LISTEN_AUSWAHLFORM.testament`) — die beschreiben den deutschen `typ` selbst, nicht ein
  Instrument; sie zu koppeln würde die Zweck-Ebene aus U2-ADR-121 Punkt 3 unterlaufen.

## Verifikation

`tests/u2-adr-254-rechtsraum-vorbelegung.test.js`, 10/10 grün. Gruppe A: reines Zählverhalten
(0/1/2 angedockte Rechtsräume). Gruppe B: Stempelstelle end-to-end über `modulEinlassen` →
`_rechtsraumModuleAusDepotAnmelden` → `listenEintragHinzufuegen`, inklusive Katalogstand-Konsistenz.
Gruppe C — der eigentliche Rot-Beweis: ein FR-gestempeltes Ehegattennotvertretung-Instrument mit
angedocktem FR-Katalogeintrag (`fristenVorrang.monate: 3`) liefert einen **zahlenscharf anderen**
Ablauftext als dasselbe Instrument mit `rechtsraum:'DE'` (6 Monate) — der Beweis, dass der
Rechtsraum die Berechnung wirklich ändert, nicht nur ankommt. Zusätzlich: ohne FR-Katalogeintrag
liefert ein FR-gestempeltes Instrument keinen Hinweis mehr (vorher: die deutsche Frist unter
falscher Flagge) — die eigentliche Korrektur des Befunds.

## Konsequenzen

**Positiv.** Schließt die Lücke zwischen „Modul dockt an" (U2-ADR-252) und „ein neues Instrument
kann diesen Wert tatsächlich erben", ohne eine der drei von U2-ADR-121 selbst zurückgestellten
größeren Fragen (Auswahlfeld, Depot-Attribut, fremde `typ`-Katalogeinträge) mitzuentscheiden.

**Negativ / bewusst klein gehalten.** Deckt nur die zwei Stellen ab, die tatsächlich pro Instrument
arbeiten. Die übrigen ~43 BGB-Referenzen im Kern (U2-ADR-121, Kontext) laufen weiterhin außerhalb
dieses Mechanismus — bewusst, U2-ADR-121 Punkt 1: Deutschland bleibt bis auf Weiteres der einzige
ausgelieferte Katalog-Eintrag, Inhalt eines zweiten Rechtsraums bleibt „Ausdrücklich offen".
