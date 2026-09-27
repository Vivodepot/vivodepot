# U2-ADR-137: Das Schema-Sensibel-Flag ist eine Voreinstellung, keine Sperre — die Bürgerin entscheidet an beiden Stellen

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** ARCHITEKTUR / DATENSCHUTZ
**Grundlage:** interner Auftrag „Sensibel-Freigabe" (11.08.2026), Produktentscheidung
vom 11.08.: „Selbstverständlich müssen Nutzer entscheiden, welche Daten sie
rausgeben wollen. Sonst macht das Ganze überhaupt keinen Sinn." **Berührte Befundkennung: K3
(Anschluss).**
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `feldSensibelUeberschreibung` (neu), `feldSensibelMarkiert`
  (umdefiniert: liest jetzt die Überschreibung), `feldIstSensibel` (Überschreibung gewinnt vor
  Schema-Default), `sensibelFeldSetzen` (schreibt jetzt explizite `true`/`false`-Überschreibung
  statt additiv-only), `sensibelFeldUmschalten` (dreht den EFFEKTIVEN Zustand um),
  `sensibelKnopfHTML` (zeigt `feldIstSensibel`, nicht mehr nur `feldSensibelMarkiert`),
  `flowExportUebersicht` (`schemaFest` entfällt, alle zurückgehaltenen Felder sind Kandidaten,
  neues `.export-schema-badge`-Kennzeichen).
- **Sprint-Commits:** `6135893`+`d44708a`+`6e6bbbd` (Zug 1 + zwei WCAG-Kontrast-Nachzüge),
  `21eae06` (Zug 2), `3fa38ce` (Zug 3).
- **ADR-Bezug:** U2-ADR-024 §1 (Opt-in-Exportauswahl — bleibt unangetastet), U2-ADR-126 (Schema-
  Sensibel Default Zurückhalten — die 97+ Feld-Einstufungen selbst bleiben unverändert, dieser
  ADR ändert NUR ihre Überschreibbarkeit), U2-ADR-012 §4 (Sensibel-Knopf an der Feldzeile),
  U2-ADR-120 (Übergabe-Protokoll).
**Status heute:** gilt — Beleg `tests/sensibel-freigabe-zug1.test.js#[Sensibel-Freigabe·Zug1]
eine explizite Freigabe an einem schema-sensiblen Feld schlägt die Voreinstellung —
feldIstSensibel wird false`.

---

## Kontext — der Befund an zwei Stellen

`feldIstSensibel` lieferte `true`, sobald `feld.sensibel` (Schema-Flag) gesetzt war — die
Nutzer-Markierung konnte nur HINZUFÜGEN, nie zurücknehmen. Zwei sichtbare Folgen:

**Am Feld:** `sensibelKnopfHTML` zeigte nur `feldSensibelMarkiert` (die eigene Markierung), nicht
den effektiven Zustand. Bei den 97+ Feldern mit Schema-Flag (U2-ADR-126) stand damit ein LEERES
Kästchen neben einem Feld, das beim Herausgeben tatsächlich zurückgehalten wurde — dieselbe
S13-Klasse wie andernorts im Projekt: die Oberfläche behauptete einen Zustand, der nicht stimmte.

**Im Herausgabedialog:** `flowExportUebersicht` teilte in `kandidaten` (ankreuzbar) und
`schemaFest` (nicht ankreuzbar) unter dem Satz „Besonders geschützte Angaben bleiben
grundsätzlich außen vor:". Die Bürgerin kam an diese Felder an KEINER der beiden Stellen heran.

**Und es gab keine Entscheidung dazu.** Die Sperre stand als Quelltext-Kommentar
(„NICHT per Häkchen umschaltbar") — **kein ADR trug sie.** U2-ADR-126 entschied, WELCHE 97+
Felder das Schema-Flag tragen (eine inhaltliche Einordnung, DSGVO-Gruppen A/B/C), nicht, dass
dieses Flag unüberschreibbar sein muss — die beiden Fragen wurden nie auseinandergehalten.

## Entscheidung — Voreinstellung, keine Sperre

**Das Schema-Flag ist der VORGABE-Wert eines Schalters, den die Bürgerin in BEIDE Richtungen
überschreiben kann.** Wer sein Depot der eigenen Klinik, Bank oder Behörde gibt, muss genau die
Felder freigeben können, um die es dabei geht — ein Export ohne die Diagnosen ist für eine Klinik
wertlos, und die Bürgerin versteht nicht, warum sie ihn nicht bekommt.

**Der Schutz liegt darin, dass nichts vorausgewählt ist und jede Freigabe sichtbar bleibt — nicht
darin, dass sie unmöglich ist** (U2-ADR-024 §1 bleibt hier tragend, unverändert).

### 1 — Datenmodell: explizite Überschreibung statt additiv-only

`data.sensibelFelder[sektorId][feldId]` trägt jetzt `true` (zusätzlich als sensibel markiert),
`false` (ausdrücklich freigegeben — überschreibt ein Schema-Flag) oder ist ABWESEND (keine eigene
Entscheidung, Schema-Vorgabe gilt). `feldIstSensibel` liest die Überschreibung zuerst; nur ohne
sie gilt `feld.sensibel`. Rückwärtskompatibel: ein Bestandsdepot unter dem alten additiv-only-
Modell kennt nur `true`-Einträge, deren Bedeutung unverändert bleibt — kein Migrationsbedarf.

### 2 — Der Schalter am Feld zeigt den effektiven Zustand

`sensibelKnopfHTML` spiegelt `feldIstSensibel` (Schema-Vorgabe ODER Bürger-Entscheidung), nicht
mehr nur die eigene Markierung. Ein schema-sensibles Feld ohne eigene Entscheidung zeigt GESETZT,
nicht leer. Abwählen ist an JEDEM Feld möglich — an einem schema-sensiblen Feld ist das eine
FREIGABE und wird als bewusste Entscheidung gespeichert, nicht als „unmarkiert". Kein Warnton,
keine Rückfrage: die Zielgruppe wird nicht gefragt, ob sie es wirklich will, sie hat geklickt.

### 3 — Der Herausgabedialog kennt keine unerreichbare Gruppe mehr

`schemaFest` entfällt. Schema-sensible Felder stehen bei den Kandidaten, ankreuzbar wie jedes
andere zurückgehaltene Feld — als „besonders geschützt" gekennzeichnet (Sichtbarkeit bleibt, die
Sperre nicht). Opt-in bleibt unverändert: auch ein schema-sensibles Feld startet unangekreuzt.
„Alles auswählen" schließt sie jetzt mit ein, weil sie in derselben ankreuzbaren Liste stehen —
**das ist die eine Stelle dieses Auftrags, die als offene Frage stehen bleibt:**
ob das gewollt ist oder ein zweiter Schnellweg ohne die besonders geschützten Felder eingeführt
werden soll, ist hier nicht entschieden.

### 4 — Die Freigabe bleibt sichtbar

Der Herausgabevermerk (U2-ADR-120, `uebergabeProtokoll.umfang`) ist bereits vollständig freies
Textfeld, von der Bürgerin selbst eingetragen, ohne Filterung oder Kürzung — eine bewusst
freigegebene Angabe kann darin wortgetreu erscheinen. Keine automatische Herleitung aus der
Export-Auswahl gebaut (wäre ein neues Feature, vom Auftrag nicht verlangt).

## Was NICHT Teil dieser Entscheidung ist

**Keine der 97+ Feld-Einstufungen ändert sich.** U2-ADR-126s Zuordnung (welches Feld welche
DSGVO-Gruppe trägt) bleibt vollständig gültig — dieser ADR ändert nur, dass die Einstufung ein
überschreibbarer Default ist, nicht mehr eine Sperre.

**Kein Warnton, keine Rückfrage, keine Bestätigungsstufe vor einer Freigabe.**

**Opt-in bleibt unangetastet** — nichts ist vorausgewählt, Ankreuzen heißt mitgeben.

## Verifikation

Regel 18, beide Richtungen real geprüft (Auftragsvorgabe: „eine Probe, die rot wird, wenn ein
schema-sensibles Feld NICHT freigegeben werden kann — und eine, die rot wird, wenn eines OHNE
Freigabe in einem Export landet"): `tests/sensibel-freigabe-zug1.test.js` beweist die Freigabe
selbst (Überschreibung schlägt das Schema-Flag, übersteht Speichern/Laden, ist rücknehmbar);
`tests/sensibel-freigabe-zug2.test.js`s echter Rundlauf beweist BEIDE Richtungen am selben Feld
in einem Test — ohne Ankreuzen bleibt der Wert draußen, angekreuzt landet er im Export, danach
ist die persistente Markierung wieder leer (ephemer). `tests/fix-a64-sensibel-knopf.test.js` auf
das neue Verhalten umgestellt — die alte Probe bewachte exakt den jetzt behobenen Fehler. W-13
(`tools/w13-ausgabeweg-ohne-sensibel-pruefen.js`) bleibt grün und wirksam — geprüft, dass er
nicht stumm wurde.

**Zwei WCAG-Kontrast-Funde, in derselben Kette entdeckt und behoben:** der `.sensibel-marker`
(„sensibel"-Wortmarke) erschien vor diesem Auftrag praktisch nie (nur an von der Bürgerin selbst
markierten Feldern) — mit Zug 1 zeigt er sich an 173+ Feldern standardmäßig, und zwei latente
Kontrast-Bugs wurden dadurch erstmals sichtbar: `--gold` erreichte selbst bei voller Deckkraft
nur 4,45:1 auf `--cream` (Pflicht 4,5:1), und `--salbei-dunkel` blieb im Nachtmodus bewusst dunkel
(dokumentierte Doppelrolle Fläche/Text), stand aber nicht in der Liste der Text-Verwendungen, die
dort aufgehellt werden — 2,71:1 statt 4,5:1. Beide behoben (`d44708a`, `6e6bbbd`); das neue
`.export-schema-badge`-Kennzeichen wurde von Anfang an korrekt eingetragen, nicht nachgezogen.
`.autoritativ-marker` teilt denselben Aufbau und vermutlich denselben Nachtmodus-Fehler, ist aber
in keiner gemessenen Sicht belegt — nicht mitgezogen, im Bericht vermerkt.

Browser-Abnahme, echter Klickweg: ein schema-sensibles Feld (`identitaet.nationalitaet`) zeigt den
Schalter GESETZT ohne eigene Entscheidung; im Herausgabedialog ist es unangekreuzt und trägt das
„besonders geschützt"-Kennzeichen (Bildbeleg im Bericht); Klick am Feld-Schalter gibt es frei
(`aria-pressed` kippt); ein echter Klartext-Export (`vollExportJSON`) enthält den Wert danach.
Volle Suite plus Konformität gegen Zug 0 — Zahlen im Bericht.
