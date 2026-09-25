# U2-ADR-352 (E1, Teil 1) · RECHTSRAUM_KATALOG ist real ins Bündel umgezogen — die Einlass-Reservierung für "DE" bleibt unangetastet

**Datum:** 07.09.2026
**Status:** gebaut, Regression grün (43/43 bestehende Rechtsraum-Kataog-Proben + Steuerzeichen-Test), A==B-Gate steht noch aus (läuft im vollen pre-push)
**Status heute:** gilt
**Bezug:** U2-ADR-121 (RECHTSRAUM_KATALOG, ursprünglicher Bau, geschützter Zugriff über `_rechtsraumKatalogLesen`) · U2-ADR-285 (Einlass-Reservierung für "DE" — **NICHT Gegenstand dieses ADR, s. §1**) · U2-ADR-345 (STANDARD_VORLAGEN, dieselbe Bauform, wörtliches Vorbild) · U2-ADR-341/341b, U2-ADR-346 (A1/A2, dieselbe Kampagne, andere Bauform, s. §2)

---

## 1 · Was dieser ADR NICHT ist — vorweg, weil der Auftrag drei Teile hatte

Der Auftrag ("Rechtsraum DE aus dem Gerüst — der Teil, der sofort geht", die Messung eines parallelen Strangs
`e1-de-rechtsraum-im-geruest-messung-2026-09-07.md`) benannte drei Zuschnitte:

1. `RECHTSRAUM_KATALOG` hinter das Bündel — **gebaut, dieser ADR**.
2. Der Einlass-Riegel für "DE" soll für einen geprüften Weg fallen — **NICHT gebaut**.
3. Ein Rot-Beweis, dass ein DE-Modul angenommen wird — **NICHT gebaut**, folgt aus 2.

**U2-ADR-285 §5 sagt wörtlich:** "Keine Aufhebung der Reservierung — für JEDEN Weg, den eine
Bürgerin oder ein fremder Anbieter TATSÄCHLICH erreichen kann (Einstellungen → Module →
Einlassen), bleiben „DE" und 'de' AUSNAHMSLOS abgelehnt, UNVERÄNDERT." Das ist eine explizite
Produktentscheidung, keine veraltete technische Einschränkung — und §4
nennt den Grund, warum sie ohne weiteren Schritt bestehen bleiben MUSS: die Aufhebung setzt ein
echtes TA-Zertifikat voraus (`_RECHTSRAUM_GERUEST_MODUL_CERTS`, heute leer), dessen Ausstellung
den TA-Anker-Schlüssel braucht — ein eigener Akt außerhalb dieses Commits, nicht etwas, das
dieser Commit tut oder tun darf. Ohne echtes Zertifikat bliebe nur ein Test-Schlüssel in Produktionscode
(von §3 ausdrücklich ausgeschlossen) oder das Entfernen der Prüfung selbst — beides hebt die
Reservierung faktisch auf, die §5 ausdrücklich NICHT aufgehoben haben will.

Nach Rückfrage bestätigt: Teil 2/3 ist als eigener, noch offener
Posten (mit der Signatur-Zeremonie) zurückgestellt — dieser ADR baut ausschließlich Teil 1.

## 2 · Die Bauform — STANDARD_VORLAGEN, nicht WIZARDS/SITUATIONEN

Anders als A1 (SITUATIONEN, U2-ADR-341b) und A2 (fünf WIZARDS, U2-ADR-346) ist
`RECHTSRAUM_KATALOG` **ein** Objekt, das komplett umzieht — kein Array benannter Einträge,
von denen manche nativ bleiben und manche wandern (kein Erlaubnislisten-Problem). Die passende
Vorlage ist darum U2-ADR-345s `STANDARD_VORLAGEN`-Weg
(`_dokumentModuleUndVorlagenAusBuendelMaterialisieren`): kein Docking-Parameter wie bei
`buergermodulBuendelAnwenden(buendel)`, sondern ein einziger Materialisierungsschritt, der
direkt aus der globalen `BUERGERMODUL_BUENDEL`-Konstante liest.

```js
let RECHTSRAUM_KATALOG = Object.freeze({});
function _rechtsraumKatalogAusBuendelMaterialisieren() {
  const rk = (BUERGERMODUL_BUENDEL && typeof BUERGERMODUL_BUENDEL.rechtsraumKatalog === 'object'
    && BUERGERMODUL_BUENDEL.rechtsraumKatalog) || {};
  RECHTSRAUM_KATALOG = Object.freeze(JSON.parse(JSON.stringify(rk)));
  return { typen: Object.keys(RECHTSRAUM_KATALOG).length };
}
const _RECHTSRAUM_KATALOG_MATERIALISIERT = _rechtsraumKatalogAusBuendelMaterialisieren();
```

GRACEFUL, NICHT HART (U2-ADR-304/310/312-Muster): ein fehlendes Bündel liefert ein leeres
Objekt, kein Fehler. `_rechtsraumKatalogLesen`/`_rechtsraumTypBekannt` sind bereits auf
"unbekannter Typ → `undefined`, keine Exception" ausgelegt (U2-ADR-121, geschützter Zugriff) —
derselbe getragene Boot-Zustand wie SITUATIONEN/WIZARDS ohne Bündel, kein neuer Sonderfall.

Kein temporärer Klon nötig (anders als bei WIZARDS/SITUATIONEN): gemessen, `RECHTSRAUM_KATALOG`
hat keinen `_textsatzAufXAnwenden`-Aufruf irgendwo im Kern — jedes Feld ist bereits deutscher
Klartext, keine Textsatz-Injektion, die ein leerer Katalog-Klon hätte umgehen müssen.

## 3 · Der Vorbefund: `wortlaut` ist in jedem DE-Eintrag bereits heute `null`

**Gemessen, nicht durch diesen Umzug verursacht.** `RECHTSRAUM_KATALOG.<typ>.DE.wortlaut` war
für `vorsorgevollmacht`/`betreuungsverfuegung`/`patientenverfuegung` als
`_standardVorlage(id)` deklariert — aber `RECHTSRAUM_KATALOG` steht im Quelltext an Zeile
~24343, `STANDARD_VORLAGEN` materialisiert erst an Zeile ~41019
(`_dokumentModuleUndVorlagenAusBuendelMaterialisieren`). Zum Konstruktionszeitpunkt von
`RECHTSRAUM_KATALOG` ist `STANDARD_VORLAGEN` noch der leere native Platzhalter (`[]`) —
`_standardVorlage(id)` liefert darum in JEDEM Fall `null`, seit dem Tag, an dem
`STANDARD_VORLAGEN` selbst bundle-materialisiert wurde (U2-ADR-345), unabhängig von diesem
ADR. Direkt am geladenen Kern gemessen, vor UND nach diesem Umzug identisch:
`V.RECHTSRAUM_KATALOG.patientenverfuegung.DE.wortlaut === null`.

**Byte-genau übertragen, nicht repariert.** Diese Migration überträgt den beobachtbaren
Zustand — inklusive des `null` — unverändert. Ihn zu reparieren wäre eine Werteänderung
(genau der Wortlaut würde erscheinen), nicht ein Struktur-Umzug; die A==B-Pflicht dieses ADR
verlangt „aussieht und funktioniert wie vorher", nicht „funktioniert besser als vorher".

**Was der Vorbefund bedeutet, nicht nur dass er besteht:** ein Rechtsraum-Eintrag ohne
Wortlaut ist ein Feld, das aussieht, als trüge es etwas — `_rechtsraumKatalogLesen(typ, 'DE',
'wortlaut')` liefert `null` für jeden Aufrufer, der einen amtlichen Vorlagentext erwartet
(betroffen: `vorsorgevollmacht`, `betreuungsverfuegung`, `patientenverfuegung` — `ki-verfuegung`/
`testament`/`ehegattennotvertretung` tragen `wortlaut: null` ABSICHTLICH, kein Bug, s.
Kommentare am nativen Bestand: Forschungssynthese ohne signiertes Basistemplate bzw. U2-ADR-070s
leerer Korpus). Ob ein realer Aufrufer diesen Wert heute überhaupt liest, ist mit dieser
Messung nicht beantwortet — die drei betroffenen Typen sind die, für die es *könnte* stimmen.

**Zuschnitt der Reparatur, zur Einreihung:** klein, kein Getter nötig.
`STANDARD_VORLAGEN` ändert sich nach dem Boot nicht mehr (keine Laufzeit-Docking-Situation wie
bei `katalogOptionenAus`/U2-ADR-346 §5, die einen LIVE-Getter brauchte, weil ein Bereich zur
Laufzeit andocken kann) — ein einmaliger Nachtrag genügt: nach
`_dokumentModuleUndVorlagenAusBuendelMaterialisieren()` (derselben Stelle, an der
`STANDARD_VORLAGEN` erstmals gefüllt ist) für die drei betroffenen Typen
`RECHTSRAUM_KATALOG[typ].DE.wortlaut = _standardVorlage(typ)` setzen. Möglich, weil nur die
ÄUSSERE `RECHTSRAUM_KATALOG`-Hülle `Object.freeze`t ist (s. §2) — die `DE`-Unterobjekte sind
reine `JSON.parse`-Ergebnisse, beschreibbar. Eine Konstruktionsreihenfolge-Umstellung ist NICHT
nötig — die MATERIALISIERUNG selbst bleibt an ihrer Stelle, nur ein Nachtrag-Schritt kommt an
STANDARD_VORLAGENs eigener Materialisierungsstelle dazu. Nicht Teil dieses ADR — eigener Posten,
wird eingereiht.

## 4 · Werkzeug

`tools/rechtsraum-katalog-ins-buendel-schreiben.js` — liest `V.RECHTSRAUM_KATALOG` über den
echten Ladeweg, verifiziert die sechs erwarteten Instrumententypen (wirft bei Abweichung, statt
eine unbekannte Form stumm mitzunehmen), schreibt das Objekt unter dem neuen Bündel-Schlüssel
`rechtsraumKatalog` und leert den nativen Block. Eigener, korrigierter Fund beim Bau: der
wörtlich aus `wizards-ins-buendel-schreiben.js` übernommene Anker
(`html.slice(stringEnde, stringEnde+2) !== ');'`) hätte hier IMMER geworfen —
`jsSingleQuoteStringEnde` liefert die Position des schließenden Anführungszeichens SELBST, die
Probe muss darum bei `stringEnde+1` beginnen. Am echten Bündel nachgemessen und korrigiert
(`html.slice(se,se+2)` lieferte `')`, nie `);`), nicht blind übernommen — ob derselbe Fehler im
Original schon einmal zuschlug oder dort aus anderen Gründen nie auf diesem Pfad lief, ist mit
dieser Messung nicht beantwortet.

## 5 · Beleg

**Regression, gezielt gefahren (nicht der volle Suite-Lauf — Gate-Disziplin, mehrere Sitzungen
bauen dieselbe Nacht):** 43/43 grün — alle sechs bestehenden RECHTSRAUM_KATALOG-Testdateien
(`rechtsraum-katalog-zweck`, `-instrument-stempel`, `-keller-fundament`, `a481-rechtsraum-gb-beleg`,
`typ-menge-offen-pruefen`) sowie `keine-rohen-steuerzeichen` (der C1-Fund vom Rebase auf U2-ADR-346
hatte gezeigt, dass ein Bündel-Merge das treffen kann — hier vorsorglich mitgeprüft, 0 Funde). Die
GB-Rechtsraum-Andock-Probe (`a481`) bestätigt: die Reservierung für DE bleibt unberührt — sie
prüft einen ANDEREN Rechtsraum (GB) über den bestehenden, unveränderten Weg.

**Gegen 56s zeitgleich gelandeten Wizard-Riegel (U2-ADR-250-Nachtrag, „Lücke 2") geprüft, nach
dem Rebase:** `tests/wizards-modul-andockbar.test.js`, 60/60 grün — kein struktureller Konflikt
zwischen den beiden Zügen, obwohl beide `vivodepot.html` an unterschiedlichen Stellen anfassen.

**A==B (Ausstehend bei Abfassung dieses ADR, läuft im vollen pre-push-Gate):** die byte-genaue
Nativauslieferungs-Probe (`tests/e2e/nativ-auslieferung-a-b-abnahme.spec.js`) — kein bekannter
Grund zur Annahme eines Bruchs (RECHTSRAUM_KATALOG ist reine Struktur-Datenverschiebung, kein
Sichtwechsel), aber ungemessen bis zum Gate-Lauf selbst.

### Zwei eigene Funde beim ersten Gate-Versuch, beide vor dem Landen behoben

**Eine zweite, unabsichtliche Textduplikation (dieselbe Klasse wie §3, ein zweiter Fall in
derselben Nacht):** `ki-verfuegung.DE.herkunft`/`.formvorschriften.hinweis` waren nativ LIVE
Referenzen auf `KI_KORPUS.herkunft`/`KI_KORPUS.formhinweis` (`herkunft: KI_KORPUS.herkunft`),
keine eigenen Werte — EINE Quelle. Der erste Bau-Versuch schnappschottete `V.RECHTSRAUM_KATALOG`
naiv (`JSON.parse(JSON.stringify(...))`), löste die Referenz zum Erfassungszeitpunkt auf und
schrieb den amtlichen „§ 2247 BGB"-Text ein zweites Mal, literal, in den Bündel-Quelltext —
`tools/bgb-verweise-pruefen.js` fing es sofort (+2 gegenüber der Grundlinie). Behoben: der
Erzeuger schreibt beide Felder als `null` ins Bündel, der Kern-Materialisierer setzt sie nach
dem Bau aus der weiterhin LIVEN `KI_KORPUS`-Referenz wieder ein — Identität geprüft
(`RECHTSRAUM_KATALOG['ki-verfuegung'].DE.herkunft === KI_KORPUS.herkunft`), nicht nur behauptet.

**Drei weitere Anker der §7/§8-Klasse aus U2-ADR-346** (roher Quelltext statt gelesener
Struktur, hier: `const RECHTSRAUM_KATALOG = Object.freeze({` → `let ... Object.freeze({});`):
zwei Mutations-Fixturen in `tools/waechter-register.js` (`bgb-verweis-erfunden`,
`typ-schalter-ohne-default`) und der Pflanz-Anker in `tests/bgb-verweise-pruefen.test.js`
selbst — alle drei fanden nach dem Umzug 0x statt 1x, nachgezogen und rot-bewiesen
(`waechter-selbsttest.test.js` 23/23, `bgb-verweise-pruefen.test.js` grün).

## 6 · Was noch fehlt, benannt

- Die `wortlaut:null`-Reparatur (§3) — eigener, kleiner Posten, nicht dieser ADR.
- Teil 2/3 des ursprünglichen Auftrags (Einlass-Riegel für "DE") — ist eine Produktentscheidung,
  gebunden an die Zertifikats-Ausstellung/Signatur-Zeremonie (U2-ADR-285 §4), nicht dieser ADR.
- Die übrigen vier Fundorte deutschen Rechts aus der Messung des parallelen Strangs (`TEXTSATZ_EINGEBAUT`,
  `BAUSTEINE`, die drei `.steps`-Skelette — bereits bundle-gespeist über den `dokumente`-Weg,
  nur nicht über den Rechtsraum-Vertrag) — außerhalb dieses Zuschnitts, s. dessen Bericht §4.
