# U2-ADR-345: Die vier Dokumentmodule + STANDARD_VORLAGEN wandern ins eingebettete Bündel

**Status:** Vollzogen. `da`s U2-ADR-343 (Vollmacht-Wortlaut) stand im Arbeitsbaum
(Voraussetzung, abgesprochen am 06.09.2026), `tools/dokumentmodule-ins-buendel-schreiben.js`
ist real gegen `vivodepot.html` gelaufen: `BUERGERMODUL_BUENDEL` trägt jetzt
`dokumentModule`/`standardVorlagen`, die fünf nativen Blöcke sind geleert (`let X = null;`/
`let STANDARD_VORLAGEN = [];`), der Materialisierungs-Aufruf ist freigeschaltet und läuft beim
Laden. A==B gegen einen Vorher-Schnappschuss (echtes Depot, alle drei Instrumente + Bank-Feld
gesetzt, alle vier `*DokumentAbschnitte()`-Funktionen) bestätigt: byte-identisch.
**Status heute:** gilt. Die vier Dokumentmodule + STANDARD_VORLAGEN sind aus dem Kern
materialisiert, keine Zwischenstufe mehr.
**Betrifft:** `vivodepot.html` (`DOKUMENT_MODUL_MOTOREN_ERLAUBT` + sieben Motor-Tabellen,
`_dokumentModulAusBuendelErzeugen`, `_standardVorlageAusBuendelErzeugen`,
`_dokumentModuleUndVorlagenAusBuendelMaterialisieren`, drei `pruef`→`bedingung`-Umschreibungen),
`tools/dokumentmodule-ins-buendel-schreiben.js`, `tests/dokumentmodule-motor-tabellen-a4.test.js`

---

## Der Auftrag (A4)

`PV_MODUL`/`KI_MODUL`/`VOLLMACHT_MODUL`/`BETREUUNG_MODUL` + `STANDARD_VORLAGEN` — 345 Zeilen
nativer Bestand — verlassen den Kern, wie zuvor `SEKTOREN` (U2-ADR-319/320) und `SITUATIONEN`
(U2-ADR-341/341b). Bauform 1:1 aus jenen ADRs übernommen: Erzeuger schreibt die Achse als Inhalt
ins Bündel, `_<achse>AusBuendelErzeugen` im Kern, Anwender ruft ihn hinter der Bündel-Anwendung,
nativer Block wird geleert, A==B-Abnahme danach.

## Der Kontrakt-Block — gemessen, nicht angenommen (06.09.2026)

Sechs der acht Kontrakt-Eigenschaften eines Dokumentmoduls (`datenLesen`/`optLabel`/
`istSentinel`/`refmNamen`/`rolleLabel`/`eingangsformel`/`bezugFuer`) sind heute Funktionswerte —
ein JSON-Bündel kann keine Funktion tragen (U2-ADR-181/-146 §2). Gemessen: **16 echte
Motor-Implementierungen, nicht 4×7=28**:

```
Eigenschaft       PV                 KI                 VOLLMACHT              BETREUUNG   echte Motoren
datenLesen        _pvSektorDaten     _kiSektorDaten     _vmZeile(zeilenId)     _bvSektorDaten     4
optLabel          _pvOptLabel        _kiOptLabel        _vmOptLabel            Stub ''            3
istSentinel       _pvIstSentinel     Stub false         _vmIstSentinel         Stub false         2
refmNamen         _pvRefmNamen       _pvRefmNamen       _pvRefmNamen           _pvRefmNamen       1 (geteilt)
rolleLabel        _pvRolleLabel      Stub ''            Stub ''                Stub ''            1
eingangsformel    _pvEingangsformel  _kiEingangsformel  _vmEingangsformel(id)  _bvEingangsformel  4
bezugFuer         inline (PV_BMJ)    —                  —                      —                  1 (nur PV)
```

`refmNamen` ist heute schon EINE, von allen vier Modulen geteilte Funktion — eine Tabelle PRO
MODUL hätte sie viermal dupliziert. `optLabel`/`istSentinel`/`rolleLabel` sind bei 1-3 der vier
Module nur Stubs (`()=>''`/`()=>false`) — dieselbe Tabelle hätte sonst Einträge erfunden, die der
Kern heute nicht hat.

## Die Bauform: zwei Ebenen (U2-ADR-146)

```
1  EINE Erlaubnisliste über die MOTORNAMEN (`DOKUMENT_MODUL_MOTOREN_ERLAUBT = ['pv','ki','vm','bv']`).
   Ein unbekannter Name wird BENANNT VERWORFEN — das ganze Modul fällt, nicht nur seine Zelle
   (§3, „ein Motor, nicht zwei" — anders als bei U2-ADR-339, wo eine ungültige Zelle nur sich
   selbst kostet: ein Modul, das sich einen Motor ausdenkt, hat keinen Teilerfolg verdient).
2  SIEBEN Tabellen über die IMPLEMENTIERUNGEN je Eigenschaft. Fehlt ein BEKANNTER Motor in einer
   davon, greift der eingebaute Default (der heutige Stub) — bekannter Motor ohne Eintrag ist
   Absicht des Gerüsts, unbekannter Motor ist ein Fehler des Moduls.
```

Ein Bündel-Eintrag trägt darum `{ motor: 'pv', abschnitte: [...] }` — nie eine Funktion.
`_dokumentModulAusBuendelErzeugen(id, roh)` baut daraus das volle Kontrakt-Objekt; `abschnitte`
reist per JSON-Rundreise als Wert (defensive Kopie, dieselbe Vorsicht wie bei Situationen).

## Wo die Materialisierung andocken muss — anders als bei SITUATIONEN

`SITUATIONEN` wird VOR der Bündel-Anwendung definiert; die vier Dokumentmodule + STANDARD_VORLAGEN
dagegen erst WEIT DANACH (`buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)` läuft ~Zeile 23547,
`PV_MODUL` erst ab ~Zeile 40400). Der Materialisierungs-Schritt kann darum nicht am selben Ort wie
bei Bereich/Situation andocken — er sitzt an der einzig möglichen späteren Stelle: direkt nach
`BETREUUNG_MODUL`s eigener Definition, dem letzten der vier Module, VOR `VORSORGE_MODULE`, das
`generator: PV_MODUL` usw. beim Parsen BEIM WERT einfängt (dieselbe Mine-Klasse wie U2-ADR-341 §1,
nur an einer anderen Stelle der Kette).

**Zusätzliche Auflage, erst nach dem Rebase auf `cb`s U2-ADR-344 sichtbar:** `cb`s
`_dokumenteAusBuendelMaterialisieren()` (PV_BMJ/KI_KORPUS/VOLLMACHT_BMJ, eine andere Achse) sitzt
an GENAU DERSELBEN Stelle und liest `PV_MODUL.abschnitte`/`KI_MODUL.abschnitte` als bereits
existierende Objekte. Reihenfolge darum zwingend: **erst diese Materialisierung** (baut die vier
Module + `STANDARD_VORLAGEN` echt auf), **dann `cb`s Aufruf** (mutiert die frisch gebauten
`abschnitte` erneut — idempotent, dieselbe Quelle, dasselbe Ergebnis), **dann `VORSORGE_MODULE`**.
Verwechselt, würfe `cb`s Funktion auf `null.abschnitte`.

## Zwei Fehler, gefunden und behoben vor dem eigentlichen Umzug

**Die Verallgemeinerung, nicht nur der Einzelfall (06.09.2026):** ein Bündel trägt WERTE,
keine BEZIEHUNGEN. Funktionswert (dieser Zug, `pruef`), Getter (U2-ADR-341c, `todesfall-uebernahme.
bloecke`) und geteilte Objekt-Identität (U2-ADR-319, `ausEingebettetemBuendel`) sind drei Formen
desselben Problems — ein JSON-Schnappschuss friert einen MECHANISMUS als seinen aktuellen WERT ein
und kann den Mechanismus selbst nicht mittragen. Alle drei Formen sind an einem einzigen Abend
(06.09.2026) real aufgetreten, an drei unabhängigen Achsen.

### 1 · Drei `pruef`-Funktionswerte in `abschnitte`

`PV_MODUL` (zwei `crossRef`-Blöcke, „Ich habe eine Vorsorgevollmacht/Betreuungsverfügung
errichtet") und `VOLLMACHT_MODUL` (ein Bank-Hinweis-Block) trugen `pruef: (d) => …` —
Funktionswerte, die `JSON.stringify` beim Bündel-Schnappschuss stillschweigend verschluckt hätte.
`crossRef`s Renderer kennt bereits einen zweiten, gleichwertigen Weg (`bedingung`, ein Schema über
`bedingungAuswerten` — dieselbe Form, die die Siebtes-Register-Logikmodule seit U2-ADR-181 nutzen).
Alle drei `pruef` durch wortgleiche `bedingung`-Schemas ersetzt (`oder`/`feldGleich`/
`listeEnthaeltTyp`/`feldIn`), Verhalten gegen 68 bestehende Tests + eigene Positivkontrollen
bestätigt: byte-identisch.

### 2 · `JSON.parse` ohne Entschärfung bricht, sobald ein Wert ein eingebettetes `"` trägt

`tools/situationen-ins-buendel-schreiben.js`s Lesepfad (`html.slice(start,j)` dann direkt
`JSON.parse`) geht davon aus, das Roh-Slice sei bereits gültiges JSON. Ist es nicht:
`jsStringSicher` verdoppelt Backslashes für die JS-String-Hülle — sobald ein Wert ein eingebettetes
`"` trägt (JSON escaped es zu `\"`, `jsStringSicher` macht daraus `\\"`), sieht `JSON.parse` einen
escapten Backslash gefolgt von einem BLOSSEN `"` und beendet den JSON-String vorzeitig. Real
getroffen (Dokumentmodul-Wortlaut mit „Kind\"-artigen Anführungen): `JSON.parse` brach bei ~7 % der
echten Länge ab.

**Korrigierte erste Vermutung, noch am selben Tag:** die anfängliche Fassung dieses Befunds nahm
zusätzlich an, der `indexOf("');")`-Ende-Anker selbst fände die Stelle zu früh. Nachgemessen: das
stimmt nicht — weil `jsStringSicher` JEDEN Apostroph unbedingt escaped, kann nach dem Schreiben
kein blosses `'` mehr vor dem echten Ende stehen, und `indexOf("');")` findet darum immer dieselbe
Stelle wie ein escape-bewusster Scanner (identischer Index gemessen). Der einzige reale Fehler ist
die fehlende Entschärfung vor `JSON.parse` — die Falschannahme steht dokumentiert und
richtiggestellt in `tests/js-string-literal-escape-fund.test.js`, damit sie nicht ein zweites Mal
als Tatsache weitergegeben wird.

`situationen-ins-buendel-schreiben.js` hat denselben Entschärfungs-Fehler weiterhin (gelandet,
U2-ADR-341), traf ihn bislang nicht, weil kein Situations-Wortlaut ein eingebettetes `"` trägt —
Glück der Daten, kein Beleg, dass der Code dort richtig ist. Auf die gemeinsame Bibliothek
`tools/lib/js-string-literal.js` umgestellt (eigener kleiner Zug, vor A4 gelandet).

**Fix:** `jsStringEntsichern` (echte Umkehrung von `jsStringSicher`, EIN Durchlauf statt zwei
verketteter `replace()`, die die Reihenfolge sonst nicht sauber umkehren könnten) vor `JSON.parse`
angewandt. `stringLiteralEndeFinden` (escape-bewusster Scanner) bleibt zusätzlich in der
Bibliothek — er zieht dieselbe Grenze unabhängig von der genauen Escape-Strategie und ist damit
robuster gegen künftige Änderungen, fängt heute aber keinen zusätzlichen Fall.

## Verifikation, vor dem eigentlichen Umzug

Volle Text-Chirurgie gegen eine PROBE-Kopie (nicht die echte `vivodepot.html`) durchgespielt:
Bündel geschrieben, alle fünf nativen Blöcke geleert, Materialisierungs-Aufruf freigeschaltet.

```
PV_MODUL/KI_MODUL/VOLLMACHT_MODUL/BETREUUNG_MODUL.abschnitte   IDENTISCH zum Original
STANDARD_VORLAGEN                                              IDENTISCH zum Original
pvDokumentAbschnitte()/kiDokumentAbschnitte()/
  vollmachtDokumentAbschnitte()/betreuungDokumentAbschnitte()  BYTE-IDENTISCH (echtes Depot,
                                                                 alle drei Instrumente gesetzt)
```

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein unbekannter Motorname wird benannt verworfen — das ganze Modul fällt, nicht nur seine
      Zelle.
    zustand: erfuellt
    herkunft: U2-ADR-345 (06.09.2026)
    pruefung:
      - tests/dokumentmodule-motor-tabellen-a4.test.js
        "[A4·Rot-Beweis] ein unbekannter Motor wirft, benannt, statt still zu No-op zu werden"

  - aussage: >-
      Ein bekannter Motor ohne Eintrag in einer der sieben Tabellen bekommt den eingebauten
      Default, das Modul bleibt gültig — kein bezugFuer außer bei pv.
    zustand: erfuellt
    herkunft: U2-ADR-345 (06.09.2026)
    pruefung:
      - tests/dokumentmodule-motor-tabellen-a4.test.js
        "[A4·Rot-Beweis] Motor \"bv\" ohne Einträge in drei Tabellen bekommt den eingebauten Default, das Modul bleibt gültig"

  - aussage: >-
      Ein gültiger Motor mit vollem Kontrakt wird angenommen und ist wirksam — echte
      Kern-Funktionen, nicht nachgebaute.
    zustand: erfuellt
    herkunft: U2-ADR-345 (06.09.2026)
    pruefung:
      - tests/dokumentmodule-motor-tabellen-a4.test.js
        "[A4·Rot-Beweis] Motor \"pv\" wird angenommen, trägt bezugFuer, und die Motoren sind die echten Kern-Funktionen"

  - aussage: >-
      refmNamen ist für alle vier Motoren dieselbe geteilte Funktion — die Tabelle dupliziert sie
      nicht.
    zustand: erfuellt
    herkunft: U2-ADR-345 (06.09.2026)
    pruefung:
      - tests/dokumentmodule-motor-tabellen-a4.test.js
        "[A4] refmNamen ist für alle vier Motoren dieselbe geteilte Funktion — kein vierfaches Duplikat"

  - aussage: >-
      Die drei pruef->bedingung-Umschreibungen ändern das gerenderte Ergebnis nicht.
    zustand: erfuellt
    herkunft: U2-ADR-345 (06.09.2026)
    pruefung:
      - tests/dokumentmodule-motor-tabellen-a4.test.js
        "[A4·Positivkontrolle·PV] beide Instrument-Sätze erscheinen, wenn Vollmacht/Betreuung als Record vorliegen"
      - tests/dokumentmodule-motor-tabellen-a4.test.js
        "[A4·Positivkontrolle·Vollmacht] der Bank-Hinweis erscheint weiterhin, wenn einer der drei Vermögens-Felder gesetzt ist"
```

## Der echte Umzug — vollzogen (07.09.2026)

`da`s U2-ADR-343 (Vollmacht-Wortlaut) stand im Arbeitsbaum, `tools/dokumentmodule-ins-buendel-schreiben.js`
lief real gegen `vivodepot.html`: `BUERGERMODUL_BUENDEL` trägt jetzt `dokumentModule`/
`standardVorlagen`, die fünf nativen Blöcke sind geleert (`let X = null;`/`let STANDARD_VORLAGEN = [];`),
der Materialisierungs-Aufruf läuft beim Laden. Eigene A==B-Probe: Schnappschuss von
`pvDokumentAbschnitte()`/`kiDokumentAbschnitte()`/`vollmachtDokumentAbschnitte()`/
`betreuungDokumentAbschnitte()` gegen ein echtes Depot mit allen drei Instrumenten + Bank-Feld,
VOR und NACH dem Schreiben, byte-identisch (JSON-Vergleich, exit clean). `tests/dokumentmodule-motor-tabellen-a4.test.js`s
letzter Test wurde vom Zwischenstand-Rot-Beweis auf eine Positivkontrolle umgestellt (Materialisierung
liefert `{ dokumentModule: 4, standardVorlagen: 4 }`, alle vier Motor-Felder + STANDARD_VORLAGEN-Länge
geprüft).

**Was noch offen ist, kein Blocker für dieses Landen:** die von `cb` vorgeschlagene, unabhängige
A==B-Probe gegen einen eingefrorenen externen Commit (`tools/lib/vor-umzug-achsen.js`,
Golden-Master-Vergleich) ist eine ZUSÄTZLICHE, andere Art von Beleg als die eigene Positivkontrolle
oben — noch nicht durchgeführt. Nachgezogen werden, sobald das Register-Format mit `cb` abgestimmt
ist; kein Widerspruch zum aktuellen Stand, nur ein weiterer, unabhängiger Prüfweg, der noch aussteht.

## Benannte, befristete Ausnahme: `STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut`

**Entschieden (06.09.2026):** die Schenkungen-Abweichung, die
`da`s U2-ADR-343 aus `VOLLMACHT_MODUL.abschnitte` entfernt, steht auch in der SIGNIERTEN Quelle
(`STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut`) — dort wird sie NICHT im selben Zug korrigiert,
sondern in einer eigenen, formellen Zeremonie mit dem Treuhand-Schlüssel, zusammen mit der
Patientenverfügung, „nach den vier Achsen". Bis diese Zeremonie läuft, **gilt die heutige,
längere Fassung als der geltende, signierte Text** — kein überholter Stand, der eingefroren würde,
sondern der aktuell gültige Stand selbst. Der Bündel-Inhalt, den dieser Zug erzeugt, trägt darum
heute korrekt genau diesen Text.

**Befristung, damit niemand in vier Wochen den eingefrorenen Text für den geprüften hält:** diese
Ausnahme endet, sobald die Zeremonie läuft. Ab dann muss der Bündel-Inhalt NEU erzeugt werden —
`STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut` ändert sich, und ein Bündel, das die alte
Fassung weiterträgt, wäre ab diesem Moment der überholte Stand, den diese ADR gerade zu vermeiden
versucht.

**Kosten des Neu-Erzeugens, auf Nachfrage:** ein einzelner Werkzeuglauf, keine halbe
Bau-Etappe. `tools/dokumentmodule-ins-buendel-schreiben.js` liest `STANDARD_VORLAGEN`/die vier
Module IMMER frisch aus dem geladenen Kern — ein erneuter Aufruf nach der Zeremonie schreibt den
dann aktuellen (neuen) Wortlaut ins Bündel und leert die nativen Blöcke erneut (idempotent, kein
Sonderfall im Werkzeug nötig). Die Reihenfolge dieses Zugs bleibt darum unabhängig davon, ob die
Zeremonie vor oder nach der ersten Bündel-Erzeugung läuft — nur EIN zusätzlicher Werkzeuglauf plus
Commit, kein Umbau.

## Verallgemeinerte Lehre (auf Nachfrage, 06.09.2026): Gates messen den Arbeitsbaum, nicht den Commit

Während dieses Zugs zweimal unabhängig getroffen — einmal hier (eine unfertige A4-Testdatei lag
lose im Baum, während der zugehörige Kern-Code gestasht war, und färbte die Suite für einen
UNVERWANDTEN kleinen Commit rot), einmal beim Push (der `pre-push`-Hook las den
halbfertigen Stand eines anderen, gleichzeitig arbeitenden Worktrees).

**Die Regel:** ein Test, der für Code geschrieben ist, der im selben Arbeitsbaum noch nicht
existiert, macht das gemeinsame Gate für JEDE Sitzung rot — unabhängig davon, was gerade
gestaged oder committet werden soll. Git-Staging trennt, was in einen Commit wandert; es trennt
NICHT, was ein Test-Runner oder ein Datei-lesendes Gate zu Gesicht bekommt. Beide lesen den
kompletten Arbeitsbaum.

**Wie zu vermeiden:** Dateien, die zu einem noch nicht landefähigen Zug gehören (Test + zugehöriger
Code), gehören ENTWEDER beide in den Baum ODER beide beiseite — nie nur die Hälfte. Ein gezielter
`git stash push -u -m "<tag>" -- <pfade>` (nie bares `git stash`, der Stapel ist über alle
Worktrees geteilt) trennt sauber, solange man daran denkt, ALLE zusammengehörigen Pfade in einem
Zug zu nennen.
