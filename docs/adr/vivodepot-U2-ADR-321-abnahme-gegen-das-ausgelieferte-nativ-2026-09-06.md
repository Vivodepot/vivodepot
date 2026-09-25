# U2-ADR-321 · Die Abnahme gegen das AUSGELIEFERTE Nativ — A==B gegen einen eingefrorenen Commit statt gegen den eigenen Arbeitsbaum

**Datum:** 06.09.2026
**Status:** gebaut, fünf Proben grün (eine Hauptprobe, vier rote Gegenproben), echter Browser,
echte WebCrypto, echte Datei
**Status heute:** gilt. Trägt über den Schnitt hinweg — sie fragt nicht, WOHER der Kanon seinen
Bestand nimmt, sondern nur, ob die Bürgerin dasselbe bekommt.
**Bezug:** das Produktabnahmekriterium (03.09.2026, wörtlich: „Am Ende möchte ich ‚mein'
Bürgerdepot haben. Als wäre nichts gewesen." · „Es darf absolut keinen klitzekleinen Unterschied
geben zwischen dem jetzigen Bürgerdepot und dem morgigen." · „Die xShare-Komponenten müssen genau
so funktionieren.") · Ergänzung 06.09.2026 („Du musst einfach dafür sorgen, dass es so ist, wie es
vorher war." und, stehend, „Achtung: natürlich keine Fehler mit übernehmen.") · U2-ADR-300
(E2E-Abnahme, Apparatur übernommen) · U2-ADR-302 (Branding-Achse, zweiter Verbraucher derselben
Apparatur) · U2-ADR-299 (Kern-Seite) · U2-ADR-276 (Golden Master — Wege und der Griff
„deterministisch MACHEN statt auslassen") · U2-ADR-298 (nie über Indizes vergleichen) ·
U2-ADR-212 (der Commit, der die A-Seite ist) · U2-ADR-047 (SHL-Provider) · U2-ADR-246/250/251
(die neuen Einlass-Register) · U2-ADR-266 (Verschlüsselungs-Hinweis nach dem Datei-Sichern)

---

## 1 · Warum die A-Seite von außen kommen muss

U2-ADR-300 vergleicht A und B **im selben Arbeitsbaum**: A ist „nativ an", B ist „Modul geladen".
Das ist ein starker Beweis, solange es ein „nativ an" gibt.

**Mit dem Schnitt verschwindet es.** Wird der native Bestand aus `vivodepot.html` entfernt, kann
keine Probe im Arbeitsbaum mehr sagen, ob der Kanon noch dasselbe liefert wie das, was
Testerinnen **tatsächlich geöffnet haben**. Ein Vergleich gegen den eigenen Baum wäre ab dann eine
Selbstreferenz: er zeigte, dass der Kanon sich selbst gleicht, nie, dass er dem Ausgelieferten
gleicht.

**Diese Datei holt die A-Seite darum aus der Git-Historie** — byte-geprüft, aus dem Commit, der
ausgeliefert wurde.

---

## 2 · Die A-Seite, benannt statt behauptet

```
Commit      37038011  (02.09.2026, U2-ADR-212)
Standzahl   SCHALEN_STAND v501 · BUILD_DATUM 2026-09-02
Groesse     4 406 277 Bytes
sha256      644819f9744587d90fbbd50d1022649250f9c899ae21c8d35566e038ccf2e100
```

**Der Auslieferungs-Beleg der iOS-Test-Seite hängt vollständig an diesem einen Commit** —
nachgemessen am 06.09.2026, und zwar für **alle drei** Dateien, nicht nur den Kern:

```
vivodepot.html        644819f9744587d9…   == 37038011
vivodepot-lesen.html  936b62d8aa4a54f8…   == 37038011
sw.js                 446ce20e5753e4e2…   == 37038011
```

Die Probe nimmt trotzdem den **Commit**, nicht den Beleg: er liegt im Repo, überlebt jeden
Rechnerwechsel und läuft in CI. **Größe, Prüfsumme, Standzahl und Build-Datum sind Bedingung des
Laufs** — weicht eines ab, bricht die Probe, statt still etwas anderes zu messen.

---

## 3 · „Identisch" heißt hier „identisch bis auf diese benannten Änderungen"

Zwischen v501 und dem Kanon liegen **rund 75 Landungen an `vivodepot.html`**. Ohne
die ABSICHTLICHEN Änderungen zu kennen, unterschieden sich A und B **aus zwei Gründen
gleichzeitig** — Absicht und Fehler — und keiner wäre vom anderen zu trennen.

**Eine Commit-Liste beantwortet das nicht.** Sie sagt, wer etwas geändert hat, nicht was sich am
Bestand geändert hat. Ein Commit kann drei Felder anfassen und keines inhaltlich verändern; ein
anderer benennt in einer Zeile ein Label um.

**Darum ein Werkzeug, das den BESTAND selbst fragt:**
`tools/nativ-bestand-aenderungen-erheben.js` lädt beide Stände über den echten Kern-Ladeweg
(`tests/load-kern.js`, `KERN_HTML_PATH` — je Stand ein eigener Kindprozess) und vergleicht alle
sechs Register, die ein Bürgermodul führt. Funktionswerte (`verborgenWenn`) reisen als
`«fn:<Quelltext>»` mit, statt in `JSON.stringify` lautlos zu verschwinden.

**Ergebnis 37038011 → Kanon, gemessen:**

```
42 benannte Aenderungen
   bereiche          1   + identitaet·person·familienname_zuerst  (checkbox, neu)
   textsatz         41   38 neue Texte, 3 geaenderte
   situationen       0
   wizards           0
   ereignisAchse     0
   institutionsArt   0

KEIN entferntes Feld · KEINE Umbenennung
```

**Das ist die inhaltliche Aussage hinter 75 Landungen.** Und weil nichts entfernt und nichts
umbenannt wurde, kann jede Abweichung, die die Probe findet, nur aus dem Umbau kommen — genau die
Trennung, um die es geht.

### Zweimal gemessen, über den Schnitt hinweg — die unabhängige Gegenprobe

Dieselbe Erhebung lief **vor** dem Schnitt (`debcb406`, v582) und **danach** (`f1a2ab5b`, v583,
U2-ADR-320 — der native Bereichsbestand verlässt die Datei). Verglichen wurden nicht die Summen,
sondern die **Stellen-Listen**, zeichenweise:

```
37038011 -> debcb406   42 Stellen
37038011 -> f1a2ab5b   42 Stellen
Listen identisch: ja · nur vorher: keine · nur nachher: keine
```

**Der Schnitt hat am geladenen Bestand nichts verändert.** Das ist eine unabhängige Bestätigung:
diese Erhebung liest beide Zustände durch den echten Kern-Ladeweg und kennt die Maßstäbe nicht,
gegen die der Schnitt selbst gemessen wurde.

### Der Befund, der beim Bau der Positivkontrolle anfiel — und der hierher gehört

Ein erster Entwurf der Positivkontrolle mutierte die **native** `SEKTOREN`-Feldliste in
`vivodepot.html`: Kennung geändert, danach sogar `typ` geändert. **Der geladene Bestand blieb
beide Male unverändert** — während eine Änderung an `SCHALEN_STAND` in derselben Datei sofort
durchschlug und der mutierte Text nachweislich in der ausgeführten Quelle stand.

**Die Ursache:** seit U2-ADR-319 baut der Kanon seine Bereiche aus `BUERGERMODUL_BUENDEL`, dem im
Kern eingebetteten Bündel. **Der native Bestand daneben war für die geladenen Bereiche schon vor
dem Schnitt wirkungslos.** Der Schnitt hat toten Text entfernt, kein Verhalten.

Das ist kein Nebenbefund, sondern der Grund, warum die Hauptprobe (§4) über den Schnitt hinweg
unverändert grün bleibt — **und es ist keine Tautologie:** die A-Seite (v501) führt **kein**
`BUERGERMODUL_BUENDEL` (gemessen: null Vorkommen) und baut ihre Bereiche aus dem nativen Literal.
Verglichen wird nativ gegen Bündel, nicht Bündel gegen Bündel.

Das Werkzeug hat eine eigene Positivkontrolle (`tools/nativ-bestand-aenderungen-erheben.test.js`):
dieselbe `vivodepot.html` gegen eine Kopie mit **genau einer** eingebauten Änderung. Ihr Anker
sitzt seit dem Befund oben **im eingebetteten Bündel, nicht im nativen Literal**, und sie prüft ihn
**zweifach: einmal auf Eindeutigkeit im Text, einmal auf Wirkung im Ergebnis**. Ein Anker, der zwar
sitzt, aber nichts bewegt, sähe sonst aus wie eine bestandene Probe — genau der Fall, der hier
zuerst eintrat. Ohne sie färbte ein Vergleicher, der immer „keine
Änderung" sagt, in jedem Lauf grün — die gefährlichste denkbare Ausgabe eines solchen Werkzeugs.

---

## 4 · Was gemessen wird — und das Ergebnis

**`tests/e2e/nativ-auslieferung-a-b-abnahme.spec.js`**, Apparatur aus U2-ADR-300 übernommen
(`tests/e2e/geruest-umbau-helpers.js`), kein zweiter Apparat:

```
A   file:// auf die eingefrorene v501 aus 37038011
B   der Kanon SO WIE ER IST — kein Modul-Ersatz, kein buergermodulSektorErsetzen
```

**B ist bewusst der ungeschminkte Kanon.** Vor dem Schnitt ist das der native Bestand, nach dem
Schnitt das eingebettete Bündel als einzige Quelle. Genau darum trägt dieselbe Probe über den
Schnitt hinweg.

Gemessen werden **vier Wege**: die vier PDF-Modelle, alle zehn Exportkanäle, **xShare/SHL** (§5)
und ein echter Datei-Rundlauf (Sichern → Schließen → Öffnen, echte Bytes, echtes Passwort).

**Ergebnis:**

```
PDF-Modelle       identisch
zehn Exportkanaele identisch
xShare (SHL)      identisch — bis in den JWE-Chiffretext
Datei-Rundlauf    identisch bis auf SECHS Stellen, alle ZUWACHS
```

**Die sechs Stellen, jede mit ihrem Grund** (im Code als `ERWARTETE_ABWEICHUNGEN`, alles daneben
ist ein Befund):

| Stelle | Grund |
|---|---|
| `schemaVersion` | 75 → 79, absichtliche Fortschreibung, außerhalb der sechs Bestandsregister |
| `logikModule` | Erbschein-Vorbereitungsauszug, im Kanon eingebautes Logikmodul; v501 kannte das Register nicht |
| `ereignisAchseModule` | neues, hier leeres Einlass-Register (U2-ADR-251) |
| `situationsModule` | neues, hier leeres Einlass-Register (U2-ADR-246) |
| `situationFeldDefinitionen` | neues, hier leeres Register (U2-ADR-246/250) |
| `wizardsModule` | neues, hier leeres Einlass-Register (U2-ADR-250) |

**Alle sechs sind Zuwachs. Kein Feld, kein Wert, kein Inhalt des ausgelieferten Standes fehlt auf
der Kanon-Seite.** Das ist die eigentliche Aussage: „als wäre nichts gewesen" heißt nicht
„bit-gleich", sondern **nichts ist weg**.

**Ein leerer Vergleich ist kein bestandener Vergleich.** Wären beide Seiten leer, fände der
Pfad-Vergleich nichts und die Probe färbte grün, ohne etwas geprüft zu haben. Darum weist sie
zuerst nach, dass wirklich gemessen wurde: zehn Kanäle je Seite, ein gefülltes `vollDepotModell`,
und auf beiden Seiten ein echter JWE-Chiffretext.

---

## 5 · xShare wird VOLLSTÄNDIG gedeckt — vorgeben statt maskieren

`EXPORT_FORMATE` führt zehn Kanäle. **Der SHL-Provider (U2-ADR-047) ist keiner davon** — ohne einen
eigenen Block bliebe er ungemessen, und die Abnahme behauptete mehr, als sie prüft. Er ist damit
**der elfte Ausgabeweg**, nicht ein Sonderfall.

Ein erster Entwurf wollte nur die deterministische Hälfte messen (URI-Bau aus festen Teilen,
Präfix, Frist, Label) und den Rest als offene Lücke benennen. **Das wurde am 06.09.2026 verworfen**
— „alles so sein soll, wie es vorher war", kein Vorabverzicht. Beide Hindernisse sind vorgegeben
statt weggelassen, derselbe Griff wie beim Golden Master (U2-ADR-276):

1. **Zufall und Uhrzeit.** `shlProviderPayload` zieht je Aufruf einen frischen 256-Bit-Schlüssel
   und einen frischen JWE-IV aus `crypto.getRandomValues`, die Ablauffrist aus `Date.now()`. Beide
   Quellen werden **für die Dauer des Aufrufs** durch feste Folgen ersetzt und danach
   zurückgegeben. Verglichen wird damit die **volle Nutzlast** — Schlüssel, `flag`, `label`, `exp`
   **und der echte JWE-Chiffretext** — plus das `shlUriBauen`-Ergebnis. Nichts ist beschnitten.
   Das ist der Unterschied zwischen „xShare funktioniert" und „xShare wird aufgerufen".
2. **Der autoritative Mappe-Eintrag**, den `shlProviderPayload` verlangt und den das geteilte
   Referenzdepot heute nicht führt: eingetragen, mit festem Inhalt, auf beiden Seiten identisch —
   **in dieser Spec, nicht in `tests/fixtures/referenzdepot.js`.** Dieselbe Fixture trägt die
   eingefrorenen Grundlinien des Node-Golden-Masters und die Abnahmen U2-ADR-300/302; ein
   zusätzlicher Eintrag dort verschöbe fremde Baselines. **Prüfstoff, den nur eine Probe braucht,
   gehört zu dieser Probe.**

Der rote Beweis dazu ist die vierte Gegenprobe (§6). Sie greift **den Inhalt des autoritativen
Original-Eintrags** an — das, was xShare tatsächlich hinausgibt: ändert er sich, muss der
JWE-Chiffretext sich ändern, und genau dort sähe ein Empfänger den Unterschied.

**Der erste Versuch dafür griff daneben, und der Grund gehört hierher:** die Gegenprobe wollte
`STRINGS.shlLabel` verfälschen — die Beschriftung, die der Provider ohne ausdrückliche Vorgabe
nimmt. Der Kern wehrt das ab, mit eigenem Wortlaut: *„STRINGS ist unveränderlich — ein Text gehört
in den Textsatz, nicht in eine Zuweisung zur Laufzeit."* **Der Riegel ist richtig und bleibt**;
die Gegenprobe ist eine Ebene tiefer gerückt, statt ihn aufzuweichen.

---

## 6 · Vier rote Gegenproben — ohne sie prüft die Hauptprobe nichts

Alle vier greifen am **echten Bestand der geladenen Seite** an, nicht am gemessenen Ergebnis; eine
Verfälschung des Messwerts bewiese nichts. Jede prüft ihren Anker und **wirft**, wenn er nicht
sitzt: eine Gegenprobe, die wegen eines verfehlten Ankers nichts verändert, färbte grün und wäre
gefährlicher als gar keine.

```
feldWeglassen      identitaet·person·vorname aus SEKTOREN entfernt
feldUmbenennen     identitaet·person·nachname -> nachname_umbenannt
sektionenTauschen  die ersten zwei Sektionen von identitaet vertauscht
xshareInhalt       der Inhalt des autoritativen Original-Eintrags veraendert
                   (der xShare-Weg: anderer Klartext -> anderer JWE-Chiffretext)
```

Alle vier färben rot.

---

## 7 · Zwei Befunde an der geteilten Apparatur — und warum dort jetzt drei Zeilen stehen

`tests/e2e/geruest-umbau-helpers.js` trägt U2-ADR-300 und -302. Drei Änderungen, alle
rückwärtskompatibel, beide bestehenden Verbraucher danach grün gefahren:

**a) `oeffneApp(page, { url })`** — optionaler Pfad, Vorgabe unverändert die Kern-Datei im
Arbeitsbaum. Ohne ihn ließe sich eine eingefrorene A-Seite nicht laden.

**b) Wettlauf über beide Schließ-Ausgänge.** `dateiRundlaufDurchfuehren` wartete blind auf `#m-ok`.
**Gemessen: der Kanon fragt beim Schließen zurück, v501 schließt ohne Rückfrage direkt auf
`#w-anlass`.** Der erste Lauf lief darum in einen 300-Sekunden-Timeout.

**c) Ausdrücklich sichern, bevor geschlossen wird** (`depotPersistieren({ ueberschreiben: true })`,
derselbe Weg, den der Sichern-Knopf ruft). **Das ist der wichtigste Fund des Tages und sieht wie
ein Testdetail aus: v501 sichert beim Schließen nicht.** Die FSA-Attrappe fing auf der A-Seite
darum nur die Bytes aus dem *Anlegen* auf — ein leeres Depot —, und der Rundlauf verglich einen
gefüllten gegen einen leeren Zustand. **Ohne diese Zeile misst der Rundlauf nicht den Datei-Weg,
sondern den Unterschied zweier Schließ-Dialoge.**

**Das Rückfrage-Verhalten des Kanons bleibt.** Ein stiller Verlust ungesicherter Änderungen ist ein
Fehler, kein Merkmal — „natürlich keine Fehler mit übernehmen". Diese Abweichung ist keine, die zu
heilen wäre: **sie muss bleiben.** Verbesserte Datensicherheit gegenüber dem Ausgelieferten,
ausdrücklich gewollt.

Dazu gehört (d): nach dem Sichern räumt der Rundlauf einen Einmal-Hinweis ab — im Kanon der
Verschlüsselungs-Hinweis nach dem ersten Datei-Sichern (U2-ADR-266), den v501 noch nicht kennt und
der sonst den folgenden Klick abfängt. Abgeräumt wird nur an den festen Griffen; bleibt etwas
stehen, scheitert der nächste Klick hörbar.

---

## 8 · Das Muster, das über diesen Zug hinausgeht: eine Probe, die ihrem eigenen Anker misstraut

**Ein Anker, der sitzt, aber nichts bewegt, sieht aus wie eine bestandene Probe.** Er ist eindeutig
im Text, er wird gefunden, die Ersetzung greift — und das Ergebnis ändert sich trotzdem nicht, weil
die Stelle für das Gemessene keine Rolle mehr spielt. Ein Prüfer, der nur die Eindeutigkeit prüft,
meldet dann grün und hat nichts geprüft. Genau das trat hier ein (§3), und es ist dieselbe Klasse
wie ein verfehlter Anker, der still leer liefert — nur schwerer zu sehen, weil alles vorher stimmt.

**Die Regel, die daraus folgt und die jede Positivkontrolle im Repo tragen sollte:**

> Eine Mutation ist zweifach zu prüfen — **einmal auf Eindeutigkeit in der Quelle, einmal auf
> Wirkung im Ergebnis.** Bewegt sie nichts, ist die Probe blind, nicht bestanden.

Die Positivkontrolle dieses Zuges tut beides: sie besteht auf genau einem Treffer im Text UND auf
genau einer gemeldeten Änderung im Ergebnis, an der erwarteten Stelle, in keinem anderen Register.

---

## 9 · Zwei Randbefunde beim Landen — festgehalten, nicht repariert

**a) Ein Wächter, der über das Dateisystem läuft statt über den Index, misst in einem geteilten
Arbeitsbaum die Reste fremder Sitzungen.** Das Gate dieses Zuges lief rot an einer Datei, die
weder im Kanon steht noch getrackt ist: eine ungetrackte, namentlich ignorierte Alt-Apparatur mit
einer git-Aufrufstelle ohne `GIT_*`-Stripping. Der Wächter (U2-ADR-232) prüft das Richtige am
falschen Gegenstand — er läuft über `tests/`, `tools/`, `scripts/` auf der Platte und kann nicht
unterscheiden, was zum Repo gehört und was nur darin liegt. **Nicht in diesem Zug repariert**
(eigener Posten); gelandet wurde stattdessen aus einem eigenen Arbeitsbaum, in dem die fremden
Reste nicht liegen. Eine fremde, ignorierte Datei zu verschieben, um ein eigenes Gate zu lösen,
wäre der falsche Preis: Git merkt ihr Fehlen nicht, und wer sie benutzt, bricht stillschweigend.

**b) Die E2E-Suite ist nach dem Bereichs-Schnitt nicht mehr vollständig grün — an einer Stelle,
die nicht zu diesem Zug gehört.** `[U2-ADR-313 · Probe 3] Depot OHNE Bündel` läuft seit
U2-ADR-320 in einen Timeout: die Probe baut eine Variante der Datei mit entferntem Bündel und
erwartet, dass die App „leer, aber bedienbar" bleibt — seit der native Bereichsbestand fort ist,
hat eine Datei ohne Bündel überhaupt keine Bereiche mehr, und die Seitenleiste bleibt leer.
**Kontrolliert, nicht vermutet:** die Probe fällt auch mit der unveränderten Kanon-Fassung von
`tests/e2e/helpers.js`. **Gemeldet, nicht repariert** — die Zahl neben A423 nennt diesen Fehlschlag
ausdrücklich, statt „289 bestanden" zu behaupten.

**Zwei Messungen dazu, auf Nachfrage, ohne Entscheidung und ohne Änderung:**

```
1  Absturz oder nur leer?   NUR LEER, sauber.
   Startschirm erreicht · Depot anlegen laeuft durch
   Konsolenfehler []  ·  Seitenfehler []  ·  SEKTOREN 0  ·  Seitenleiste 0

2  Erholt sie sich?         NEIN.
   modulEinlassen(<echtes Buendel>, data)
     angenommen false · grund "leer"
     ALLE DREIZEHN Kennungen verworfen, jede mit grund "reserviert"
   danach: SEKTOREN 0 · Seitenleiste 0 · [data-wizard-start] 0
```

**Der Riegel reserviert Kennungen, die seit dem Schnitt niemand mehr belegt** — eine Sperre, die auf
genau dem steht, was entfernt wurde. Damit ist es kein Testfix, sondern ein Kern-Befund; die Ursache
ist inzwischen bestimmt und einer eigenen Sitzung zugewiesen.

**Nicht geglättet:** in der Variante ist `BUERGERMODUL_BUENDEL` als Konstante noch **definiert**,
nur geleert — `ohneBuendel()` entfernt sie nicht. Und gemessen ist **nur** der Bürgerweg
`modulEinlassen`; ob ein anderer Weg anders ausginge, ist offen und wurde nicht gemessen.

**Das Werkzeug dazu liegt bewusst außerhalb des Repos** (Scratchpad dieser Sitzung,
`ohne-buendel-messen.js`) — begründet und hier gezählt: es ist kein stehender Wächter, sondern eine
Einmal-Erhebung, und eine Datei in `tests/e2e/` hätte genau die Gesamtzahl verschoben, die derselbe
Zug gerade gegen einen Volllauf nachzieht.

---

## 10 · Grenzen, benannt statt verschwiegen

- **Ein Referenzdepot, nicht alle Depots.** Gemessen wird der Fixture-Inhalt aus
  `tests/fixtures/referenzdepot.js` plus der xShare-Prüfstoff. Ein Feld, das dort keinen Wert
  trägt, kann in keinem Ausgabeweg auffallen.
- **Chromium.** Für Safari existiert in dieser Umgebung kein Playwright-Weg; der Speicherweg ohne
  Datei-Picker hat eine eigene Firefox-Konfiguration und ist hier nicht mitgemessen.
- **Die Lese-App und `sw.js` sind an der A-Seite byte-geprüft (§2), aber nicht funktional
  A/B-verglichen.** Diese Probe deckt die Bürger-App. Für die anderen beiden Komponenten wäre das
  eine eigene Probe auf der Cross-Component-Ebene.
- **Der Wert der Probe hängt an der Ausnahmeliste.** Sie zu verlängern, ohne den Grund zu prüfen,
  hebt die Abnahme auf. Sie ist darum im Code kommentiert, nicht nur aufgezählt.

---

## 11 · Nachtrag 06.09.2026 · Die Reichweite der Zusicherung (U2-ADR-332)

Am Tag nach dieser Abnahme fiel im Kanon eine Regal-Karte weg: ein Pro-Template, das gestern eine
Karte hatte, hatte heute keine — `element(s) not found`. Zugleich meldete **diese** Probe vier
unerklärte Abweichungen. **Sie hatten nichts miteinander zu tun.** Die vier waren neue
Bürgermodul-Felder aus U2-ADR-326/330 (s. dort §6); die verschwundene Karte war unter ihnen **nicht**.

Das ist unabhängig nachgemessen worden und ist keine Schwäche der Probe, sondern ihre Reichweite —
die hier gefehlt hat:

> **Die Zusicherung gilt für DATENWEGE, nicht für das, was die Bürgerin auf dem Bildschirm sieht.**

Gemessen werden PDF-Modelle, zehn Exportkanäle, der xShare-Weg und der Datei-Rundlauf. **Gerendertes
Markup wird nicht gemessen.** Eine Karte, ein Knopf, ein ganzer Abschnitt kann aus der Oberfläche
verschwinden, ohne dass diese Probe es bemerken könnte — sie sieht das DOM strukturell nicht.

**Eine Zusicherung, deren Reichweite nicht dabeisteht, wird für mehr gehalten, als sie ist.** Genau
das ist an diesem Morgen passiert, auf beiden Seiten der Übergabe. Der Satz gehört darum in jede
Berufung auf diese Abnahme.

Was die Oberfläche deckt, sind die E2E-Proben und die Regal-Invariante aus U2-ADR-332 — nicht diese
Datei. Die zwei Ebenen ersetzen einander nicht.
