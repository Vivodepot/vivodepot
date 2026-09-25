# U2-ADR-267 · Ein Modul-Einlass ist unumkehrbar — und niemand sagte es vorher

**Datum:** 04.09.2026
**Status heute:** gilt
**Bezug:** Fundsachen-Erhebung 04.09.2026, Posten B4 (Auslöser) · U2-ADR-246 (Situationen werden
andockbar — das betroffene Register) · `tests/bereichs-module-einlass.test.js`/`_bereicheVerwaisteRetten`
(das Gegenbeispiel, das die Warnung begrenzt)

---

## 1 · Der Befund, gemessen

Kein einziges der zehn `EINLASS_REGISTER` kennt einen Weg zurück — geprüft per Volltextsuche
(`modulEntfernen`, `modulWiderrufen`, `data-modul-entfernen` u. ä.): kein Treffer, in keinem
Register. „Rücknahme Stufe A/B" (U2-ADR-168) ist ein Namensvetter für ein ANDERES Fach
(importierte Feld-Vorlagen, Werte leeren) — mit dem Modul-Einlass selbst hat es nichts zu tun.
**Der Einlass ist für alle zehn Register endgültig**, ohne Ausnahme.

**Was die Anwendung heute VOR dem Einlass sagt, wörtlich** (`STRINGS.moduleEinlassenErklaerung`):
„Eine Erweiterung bringt zum Beispiel andere Beschriftungen oder einen anderen Rechtsraum mit.
Sie bleibt auf diesem Gerät und wird niemandem gezeigt." — nichts zur Unumkehrbarkeit.

**Zwei Fragen, zwei getrennte Antworten** (Nachtrag, nachdem der erste Entwurf sie
vermischt hatte): der EINLASS selbst ist unumkehrbar (keine Ausnahme, s. o.) — aber ob das etwas
BEDEUTET, hängt daran, ob die Werte, die die Bürgerin später einträgt, verloren gehen könnten,
sollte das Modul je verschwinden. Das ist keine Vermutung, sondern für jedes Register einzeln
gemessen.

---

## 2 · Die zehn Register, gemessen — nicht angenommen

Von zehn Registern halten nur vier je Bürger-Werte. Der Auftrag ging von der Annahme aus, ein
Bereich (der Felder mitbringt) sei „womöglich riskanter" als ein Sprachmodul — **die Messung
dreht das um**:

| Register | hält Bürger-Werte? | Schicksal, wenn das Modul verschwindet | Warnsatz? |
|---|---|---|---|
| **situation** | ja (`data.situationen[…]`) | Wert bleibt roh im JSON stehen, aber **kein Render-Pfad findet ihn mehr** — technisch unerreichbar. Keine Rettung. | **ja — der einzige Fall** |
| bereich | ja (`data.sektoren[…]`) | **gerettet**: `_bereicheVerwaisteRetten` (vivodepot.html:34657–34761) verschiebt den Inhalt nach `bereicheVerwaist`, nichts geht verloren, kehrt bei Rückkehr des Moduls zurück | nein — ein Warnsatz hier wäre der Fehlalarm, der den Satz bei `situation` entwertet |
| wizard | ja, aber nie in einen eigenen Namensraum | schreibt über `sektorFeldSetzen`/`situationFeldSetzen` direkt ins ZIEL (`wizardZielSetzen`, vivodepot.html:39466–39487) — das Schicksal erbt sich vollständig vom Ziel-Register (nativer Sektor: nie gefährdet; angedockter Bereich: gerettet; angedockte Situation: unerreichbar wie oben) | nein — kein eigenes Risiko |
| institutionsArt | ja, indirekt (`data.institutionen[].art`) | der Rohwert bleibt **immer** sichtbar/exportfähig — nur das Label verstummt (`institutionsArtLabel` liefert `null`) | nein — kein Datenverlust |
| rechtsraum | nein direkt, stempelt einen Code in `vorsorge_instrumente[]` | der gestempelte Wert bleibt stehen; nur künftige Formvorschriften/Fristen dieser Rechtsordnung lösen nicht mehr auf | nein — Funktionsverlust, kein Datenverlust |
| format, branding, logikModul, ereignisAchse, textsatz | nein | halten überhaupt keine Bürger-Werte (rein lesend oder reine App-Beschriftung/CSS) | nein — die Frage stellt sich strukturell nicht |

**Ergebnis: genau ein Register bekommt den Satz.**

---

## 3 · Zwei Einlasswege — A gemessen, dann angehalten

**Gemessen** (erste Nachfrage: gibt es einen Punkt, an dem der Typ schon bekannt, aber
noch nichts geschrieben ist? — vor dem Klick auf „Erweiterung einlassen" kann der EINE Knopf den
Typ nicht kennen, die Datei entscheidet ihn):

- **Unsignierter Weg** (Selbst-Einlass, Hand-Datei): **ja, kostenlos.** `modDatei.onchange` parst
  die Datei bereits, um zu prüfen, ob sie ein signiertes Bündel ist
  (`providerCredentialJws`/`modulSignaturJws`); ist sie es nicht, liegt das volle, geparste
  Objekt samt `modulTyp` bereits vor `modulEinlassen(roh)` (dem Schreibweg) bereit.
- **Signierter Weg** (`modulEinlassenGeprueft`): **nein, nicht billig.** Der Inhalt steckt in
  `modulSignaturJws`, erst nach zwei sequenziellen Krypto-Prüfungen lesbar
  (vivodepot.html:25690/25695); im Erfolgsfall ruft dieselbe Funktion sofort `modulEinlassen()`
  auf — Prüfen und Schreiben in einem Zug. Einen Vorher-Punkt zu schaffen hieße, diese
  sicherheitsrelevante, vielfach aufgerufene Funktion aufzutrennen — **dieser Bau tut das nicht.**

**Danach, ein zweiter Auftrag noch am selben Tag, hat den Rahmen verschoben:** das Produktmodell
wurde klargestellt — „niemand lässt irgendwas ein. Templates werden in fertige
Produkte geladen, aber Modul und Gerüst werden provisioniert." Der Provisionierungsweg
(`vorabkonfiguration.js`, geladen beim Start, jedes Bündel über den vollen, geprüften Weg — s.
§7) ist der eigentlich vorgesehene. Der Knopf `einst-modul-einlassen`, an dem Weg A gehangen
hätte, steht damit selbst zur Disposition — ob er im ausgelieferten Produkt bleibt, ist eine
offene Frage, keine gefallene Entscheidung.

**Ergebnis: A angehalten, nicht gebaut, nicht vorbereitet.** Der Bestätigungs-Dialog vor dem
Schreiben (Titel/Knopf-Wortlaut, Verdrahtung in `modDatei.onchange`) wurde probeweise gebaut,
grün getestet — und wieder vollständig zurückgenommen, sobald der zweite Auftrag eintraf,
einschließlich der zwei STRINGS-Kennungen, die nur er brauchte. **B bleibt** — er beschreibt eine
Eigenschaft des angedockten Moduls, nicht ein Ereignis beim Einlass, und trägt unabhängig davon,
ob ein Modul je hand-eingelassen, provisioniert oder mit einer Depot-Datei mitgereist ist.

---

## 4 · Der Wortlaut

**Bestehender Ton, geprüft vor dem Bau** (nicht neu erfunden): der feste Satz „Das lässt sich
nicht rückgängig machen." schließt bereits mehrere unumkehrbare Aktionen im Haus ab
(`mappeEntfernenFrage`, `kreiseEntfernenText`, `kreiseFachEntfernenText`, `vorlagenLeerenText` —
letzteres strukturell am nächsten: „Werte werden X. Y bleibt bestehen. Das lässt sich nicht
rückgängig machen.").

**Der neue Satz** (`STRINGS.modulEinlassenUnwiederbringlichSituation`):

> „Diese Erweiterung kann eigene Felder mitbringen. Was Sie darin eintragen, ist an die
> Erweiterung gebunden — ist sie fort, kommen Sie an Ihre eigenen Eingaben nicht mehr heran. Das
> lässt sich nicht rückgängig machen."

**Nachtrag zur Formulierung (unabhängig von einer Empfehlung zu einer anderen Frage — dem
Einlass-Riegel — bestätigt):** die FOLGE zählt, nicht die TECHNIK. Derselbe Grundsatz, den die
Herkunfts-Anzeige schon fährt (nicht „ungeprüft", sondern „niemand hat geprüft, niemand steht
dafür ein"). Erste Fassung sprach von „nicht mehr erreichbar" — technisch korrekt, aber nicht die
Sprache der Bürgerin. Die zweite Fassung sagt die Folge direkt: „kommen Sie an Ihre eigenen
Eingaben nicht mehr heran." Das hält auch dann, wenn später ein Weg zurück entstünde (der
Einlass-Riegel, eine offene, andere Frage, nicht Teil dieses Baus) — die Folge (Eingaben nicht
mehr erreichbar, sobald die Erweiterung fort ist) bliebe dieselbe, unabhängig davon, WIE sie fort
ginge. Keine Zahl, keine Verfahrensangabe.

---

## 5 · Umsetzung — B, eine Quelle, ein Auftrittsort

**`_modulTypUnwiederbringlichHinweis(typ)`** ist die EINE Stelle, die entscheidet:
`typ === 'situation' ? STRINGS.modulEinlassenUnwiederbringlichSituation : null`. Kommt die
situation-Rettung (§8), wird hier auf `null` gesetzt — nirgends sonst im Code. Ein zweiter
Auftrittsort (der Bestätigungs-Dialog, §3) war vorbereitet, ist mit A zurückgenommen — der
Rückbau war vollständig, weil die Quelle von Anfang an von ihrem Auftrittsort getrennt war: nur
die Verdrahtung in `modDatei.onchange` fiel weg, `_modulTypUnwiederbringlichHinweis` selbst blieb
unverändert stehen und trägt bereits den einen verbliebenen Auftrittsort.

**Dauerhafte Modul-Zeile** (`einstellungenHTML`, `_eingelassen.map`): jedes gelistete Modul trägt
den Hinweis, wenn sein Typ ihn liefert — unabhängig vom Einlassweg (Hand, signiert, provisioniert,
s. §7).

---

## 6 · Rot-Beweis

`tests/u2-adr-267-modul-einlass-unumkehrbar.test.js`: `_modulTypUnwiederbringlichHinweis` über
alle zehn Register (nur `situation` liefert Text), keine Zahl/Verfahrensangabe im Satz, endet mit
dem Haussatz, `einstellungenHTML()` zeigt/verbirgt die Zeile korrekt (situation ja, bereich/
textsatz nein).

Vollsuite `npm test`, `npm run test:konformitaet`, `npm run test:e2e`: [wird vor dem Commit
gemeldet].

---

## 7 · Provisioniert vs. hand-eingelassen — dieselbe Antwort, gemessen

**Frage (nach der Klarstellung des Produktmodells):** hat ein provisioniertes Modul eine
andere Rücknahme-Lage als ein hand-eingelassenes?

**Gemessen: nein, keine.** `_vorDepotModulInsDepotUebernehmen` (vivodepot.html:25536) sagt es
selbst, wörtlich (Kommentar 25529–25531): „KEIN Sonderfall: derselbe `textsatzModulEinbetten()`
…, den auch ein regulär im offenen Depot angedocktes Modul nimmt — das Depot sieht danach keinen
Unterschied zwischen ‚vor' und ‚im' Depot angedockt, wie es der Bestand für jedes andere
Einlass-Register auch nicht tut." `vorDepotKonfigurationAnwenden` (vivodepot.html:25439) führt
jedes Provisionierungs-Bündel über denselben, unveränderten `modulEinlassenGeprueft`-Weg wie ein
signiertes Bündel im offenen Depot (Weg C, zweimal mit Registrierung dazwischen, s. Kommentar
dort) — dieselbe `_einbettenMitFassung`-Fassungslogik, derselbe Ziel-Slot `data.<slot>[]`, **kein
Marker, der Herkunft festhält.** Die Register-Tabelle in §2 (welcher Typ hält Bürger-Werte, welcher
hat eine Rettung) entscheidet die Rücknahme-Lage — sie liest nie, WIE ein Modul hereinkam, nur
WELCHER Typ es ist. B gilt darum unverändert für provisionierte Module, ohne eigene Zeile im Code.

---

## 8 · Nicht gebaut — die Rücknahme selbst, mit geschärftem Aufwand

**Der eigentliche Fund ist, dass die Warnung nur das Pflaster ist.** Der echte Fix für `situation`
wäre eine Rettung, wörtlicher Spiegel von `_bereicheVerwaisteRetten` — dann gäbe es nichts mehr
zu warnen, weil nichts mehr unerreichbar würde. `bereich` beweist, dass der Mechanismus trägt.
**Das ist eine Produktentscheidung, nicht in diesem Bau enthalten** — gemessen und
geschärft, nicht gebaut, auch nicht vorbereitend.

**Sieben Spiegel-Punkte, für eine spätere situation-Rettung** (Entscheidungsvorlage, kein Code):

1. **Vier neue Depot-Slots** (additive Schema-Stufe, wie U2-ADR-246s 75→76): `situationenVerwaist:
   {}` · `situationFeldDefinitionenVerwaist: []` · `situationenVerwaistIdentitaet: {}` ·
   `situationsIdentitaeten: {}` — wörtliche Namensspiegel der vier `bereich`-Pendants.
2. **Laufender Identitäts-Schnappschuss** in `_situationIndexNeuBauen`, Spiegel von
   `_sektorIndexNeuBauen` (vivodepot.html:12885–12896): für jede angedockte Situation
   `data.situationsIdentitaeten[id] = {label: s.titel, icon: s.icon}` bei JEDEM Index-Neubau
   schreiben (nicht erst beim Verwaisen — die Quelle ist dann schon weg). Eine Anpassung: `titel`
   statt `label` (Situationen nennen ihr Anzeigefeld anders als Bereiche).
3. **Neue Funktion `_situationenVerwaisteRetten(ziel)`**, Spiegel von `_bereicheVerwaisteRetten`
   (vivodepot.html:34657–34761, 105 Zeilen): `bekannt`-Menge aus `SITUATION_BY_ID` UND
   `ziel.situationsModule[]` (Depot-eigene Liste, nicht nur Laufzeit-Registry — Grund:
   vivodepot.html:34662–34676) · HINAUS: unbekannte `data.situationen[id]` nach
   `situationenVerwaist` (Spiegel 34688–34704) · Felddefinitionen: `data.situationFeldDefinitionen[]`
   mit unbekanntem `situationId` nach `situationFeldDefinitionenVerwaist` (Spiegel 34706–34738,
   Dedupe-Schlüssel `situationId`+`feldId` statt `sektorId`+`feldId`) · ZURÜCK: vorhandene Werte
   gewinnen, Rest bleibt gerettet (Spiegel 34740–34758).
4. **Ein Aufrufort**: neben `_bereicheVerwaisteRetten(ziel);` (vivodepot.html:36113, in
   `depotNormalisieren`) eine Zeile ergänzen.
5. **Lese-Funktion `situationenVerwaisteAlle()`**, Spiegel von `bereicheVerwaisteAlle()` (ab
   vivodepot.html:34779) — **WO sie angezeigt wird, ist dieselbe offene Frage wie beim
   `bereich`-Vorbild selbst** (Kommentar vivodepot.html:34768 hält die Entscheidung für offen)
   — kein Rückstand dieses Baus, dieselbe Lücke besteht schon für `bereich`.
6. **Klassifikation** der vier neuen Top-Level-Schlüssel in `VOLLEXPORT_STRUKTURELL_SCHLUESSEL`/
   `-ZURUECKHALTEN` (wie die vier `bereich`-Pendants) — **derselbe Fund, den dieser Bau bei
   U2-ADR-246 zweimal gemessen hat**: ohne diese Zeile schlägt `vollexport-schluessel-
   abdeckung.test.js` an. Der Teil, den ein Nachbauer sonst übersieht.
7. **Tests**: Spiegel von `tests/bereich-identitaet-verwaist.test.js` + der
   Verschwinden-und-Rückkehr-Probe in `tests/bereichs-module-einlass.test.js`.

**Aufwand:** kein neuer Entwurf, reine Übertragung mit zwei Namens-Anpassungen (`titel` statt
`label`, `situationId` statt `sektorId`) — realistisch in derselben Größenordnung wie dieser Bau
selbst (Kern + Migrationsstufe + Tests + ADR).

---

*Vivodepot GmbH · Berlin · 04.09.2026*
