# U2-ADR-341 · Optionen aus einer Situation gehören hinter die Bündel-Anwendung, nicht in ein Literal davor

**Datum:** 06.09.2026
**Status:** gebaut, drei Rot-Beweise geführt — die erzeugende Seite (Bündel-Inhalt, permanentes
Leeren des nativen Blocks) ist NICHT Teil dieses ADR, s. §6
**Status heute:** gilt für die eine gelöste Stelle (`geburt_kind_kv`); die Kette ist der
benannte Ort für A2–A5
**Bezug:** U2-ADR-319/320 (Bereichs-Umzug, die Vorlage) · U2-ADR-306/308 (Situation/Wizard-
Ersetzen) · U2-ADR-330/332 (Anlass: der Umzug von SITUATIONEN ins Bündel, A1)

---

## 1 · Der Fund

Beim Vorbereiten des SITUATIONEN-Umzugs (426 native Zeilen sollen ins Bündel wandern, wie zuvor
bei SEKTOREN) fiel ein einzelnes Feld auf:

```js
{ feld: { id: 'geburt_kind_kv', typ: 'auswahl',
    optionen: _situationFeldOptionen('geburt', 'geburt_kind_kv') } },
```

**Dieser Aufruf steht innerhalb des `WIZARDS`-Literals, ausgewertet beim Skript-PARSE — lange
bevor `buergermodulBuendelAnwenden` läuft (rund 9000 Zeilen später).** Ein natives Literal, das
beim Parsen ein anderes natives Literal auflöst, ist eine Mine: sie liegt still, bis jemand das
andere Literal bewegt. Würde `SITUATIONEN` geleert (der eigentliche Umzug), fände
`SITUATIONEN.find(s => s.id === 'geburt')` nichts, und `_situationFeldOptionen` würfe beim
PARSEN — der Kern stürbe beim Laden, vor jedem Depot, vor jedem Test.

**Ein Getter allein löst das nicht.** Gemessen: `_textsatzFeldFuellen` prüft
`Array.isArray(feld.optionen)` SYNCHRON, innerhalb derselben Konstruktions-Anweisung, für jedes
Options-Feld. Jeder Lesezugriff — auch eine reine Formprüfung — löst einen Getter aus. Die Mine
liegt nicht im Literal, sie liegt im geteilten Textsatz-Mechanismus, der jedes Options-Feld beim
Bau anfasst.

**Eine verwandte, ältere, bereits dokumentierte Ausprägung derselben Klasse existiert für
SEKTOR-Katalogfelder:** der Kommentar über dem Bündel-Aufruf (`_katalogOptionen`, achtfach in
`WIZARDS`) hält seit U2-ADR-304 fest, dass ein Bündel, das Katalog-Optionen ändert, die
Assistenten nicht erreicht — heute folgenlos, weil der Bündel-Inhalt den nativen Bestand nur
reasserted. **Diese Stelle ist von diesem ADR NICHT gelöst** — eigener Gegenstand, eigene
Entscheidung, wie der bestehende Kommentar selbst sagt.

## 2 · Die Entscheidung: Verweis statt Wert, materialisiert hinter der Kette

Drei Wege wurden erwogen und verworfen, bevor der vierte trug:

```
D1  Optionen statisch duplizieren        RAUS — stille Drift zwischen Situation und
                                          Wizard, dieselbe Klasse, die der Tag reparierte.
D2  Der geteilte Textsatz-Mechanismus    RAUS — trifft JEDES Options-Feld im Kern,
    lernt, Getter zu überspringen        nicht nur diesen einen Fall.
D3  Bündel-Anwendung vor WIZARDS ziehen  RAUS — verschiebt Bestehendes, hängt vermutlich
                                          an einem Teil der 9000 Zeilen davor; Entwirren
                                          statt Verschieben.
D4′ Verweis + einmalige                  GEBAUT.
    Materialisierung nach der Kette
```

**Das Feld trägt den Verweis, nicht das Ergebnis:**

```js
feld: { id: 'geburt_kind_kv', typ: 'auswahl',
  optionenAus: { situation: 'geburt', feld: 'geburt_kind_kv' } }
```

**Ein einmaliger Materialisierungs-Durchlauf** (`_wizardOptionenAusMaterialisieren`) läuft direkt
NACH `buergermodulBuendelAnwenden` und schreibt `feld.optionen` echt hinein, bevor irgendein
Konsument liest:

```js
const _BUERGERMODUL_BUENDEL_BERICHT = buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL);
const _WIZARD_OPTIONEN_AUS_MATERIALISIERT = _wizardOptionenAusMaterialisieren();
```

**Warum das trägt, wo D2 und D3 es nicht taten:** kein Konsument der 35 `.optionen`-Lesestellen
im Kern ändert sich — sie lesen `.optionen` wie heute, nur ist es zum Zeitpunkt ihres ersten
echten Lesens (immer nach dem Boot) bereits ein echtes Array. Nichts Geteiltes wird angefasst,
nichts Bestehendes verschoben — ein neuer, kleiner Schritt hängt hinten an einer bereits
laufenden Kette.

## 3 · Zwei Auflagen — beide bewachen die Annahme, statt ihr zu glauben

**Auflage 1 — `optionen` bleibt ABWESEND, nicht `[]`.** Ein fehlender Schlüssel liefert
`undefined` an jeden verfrühten Leser, laut und sofort. Ein leerer Platzhalter würde ein stilles
Auswahlfeld rendern, das nie auffällt — dieselbe Bauform, die den ganzen Tag über als Fehler
gefunden wurde: eine Bedingung, die niemand bewacht.

**Auflage 2 — der Durchlauf zählt seine Ausbeute und wirft, wenn er nichts findet.**
`_wizardOptionenAusMaterialisieren` unterscheidet zwei Zählungen:

```
gefunden        Felder mit optionenAus, unabhaengig vom Ergebnis
materialisiert  davon: die Situation existierte, Optionen wurden geschrieben
```

`gefunden === 0` wirft — ein Durchlauf, der nichts findet, darf nicht grün aussehen, sonst liefe
ein künftig umbenanntes `optionenAus` stillschweigend leer durch. Eine WIRKLICH fehlende
Situation (leeres Bündel, Rot-Beweis 2) ist dagegen ein legitimer Boot-Zustand: `feld.optionen`
wird `[]`, gezählt als `gefunden`, nicht als `materialisiert` — der Kern lädt, meldet leer,
stirbt nicht. `_situationFeldOptionen` selbst bleibt hart (wirft bei fehlender Situation) — das
ist für direkte Aufrufer richtig, die eine existierende Situation voraussetzen dürfen. Der
Materialisierungs-Durchlauf prüft darum VOR dem Aufruf, statt den Wurf zu fangen.

## 4 · Drei Rot-Beweise, alle real geführt (nicht simuliert am Stück, sondern am echten Kern)

```
1  Nativer Block geleert, das ECHTE 'geburt' vollstaendig im vertrauenswuerdigen,
   eingebetteten Buendel  ->  WIZARDS traegt die Optionen VOLLSTAENDIG,
   BYTE-GLEICH zur Baseline vor jeder Aenderung. Bestanden.

2  Nativer Block geleert, Buendel OHNE situationen-Schluessel
   ->  der Kern LAEDT. feld.optionen === []. Kein Sturz. Bestanden.

3  Der Materialisierungs-Durchlauf ausgebaut
   ->  feld.optionen === undefined, Array.isArray === false — die Abwesenheit
   ist LAUT und unmittelbar messbar, kein stiller Fehlzustand. Bestanden.
```

Rot-Beweis 1 brauchte eine zweite Runde: die erste scheiterte an einem Doppel-Escaping-Fehler in
der PROBE selbst (ein eingebetteter Wortlaut mit Anführungszeichen, für die JS-String-Ebene nicht
zusätzlich escaped) — ein Fund über das Werkzeug der Probe, nicht über den Kern, korrigiert vor
dem eigentlichen Ergebnis.

## 5 · `_situationAusBuendelErzeugen` — das fehlende Gegenstück, gebaut nach derselben Vorlage

Damit Rot-Beweis 1 überhaupt real geführt werden konnte (nicht nur simuliert), musste eine
Situation aus dem Bündel NEU ENTSTEHEN können — `buergermodulSituationErsetzen` allein kann das
nicht, es gleicht nur BESTEHENDE Einträge an. Gebaut, wörtlicher Spiegel von
`_bereichAusBuendelErzeugen` (U2-ADR-319), mit einer gemessenen, dokumentierten Abweichung:

**Bereiche erzeugen ein LEERES Skelett** (`felder: []`), weil `buergermodulSektorErsetzen` mit
`darfErzeugen` neue Feld-Objekte anlegen darf. **`buergermodulSituationErsetzen` hat keine solche
Eskalation** — es gleicht ausschließlich Einträge an, die `_erstePartieErlaubteIdsFuerSituation`
aus vorhandenen `feld.id`s ableitet. Ein leeres Skelett ergäbe eine leere Erlaubnisliste, und
jede nachfolgende Anwendung würde alles verwerfen. `_situationAusBuendelErzeugen`s Skelett trägt
darum den vollen Bloecke-Inhalt aus dem vertrauenswürdigen Bündel von Anfang an; der
nachfolgende `Ersetzen`-Aufruf gleicht denselben Inhalt nur noch einmal an (no-op im
Regelbetrieb, derselbe Codepfad wie jede Bündel-Reassertion).

Wie bei Bereichen ist die Erzeugung an die Objekt-Identität des eingebetteten Bündels gebunden
(`ausEingebettetemBuendel`) — ein citizen-hochgeladenes Bündel kann keine neue Situation anlegen,
nur bestehende angleichen. Geprüft: eine simulierte, NICHT-identische Bündel-Referenz wird
korrekt mit `unbekannte-situation` verworfen.

## 6 · Was hier NICHT entschieden oder gebaut ist

- **Der Erzeuger** (`tools/buergermodul-erzeugen.js`) schreibt `situationen` heute als
  Berichtsfeld (`situationsDefinitionen`), nicht als Bündel-INHALT. Damit das eingebettete
  `BUERGERMODUL_BUENDEL` in `vivodepot.html` echten Situations-Inhalt trägt, muss der Erzeuger
  das ändern — eigener Schritt, eigenes Gate.
- **Der native 426-Zeilen-Block bleibt bestehen.** Diese ADR beweist, dass sein Leeren
  funktionieren WÜRDE (Rot-Beweise 1/2/3), ohne ihn permanent zu leeren — das bleibt der
  eigentliche Umzugs-Commit, mit A==B gegen `37038011` als Abnahme.
- **Die acht `_katalogOptionen`-Stellen** (SEKTOR-Katalogfelder in WIZARDS, s. §1) sind
  derselben Klasse, aber nicht dieser ADR — heute folgenlos, weil das Bündel den nativen Bestand
  nur reasserted. Wird das je genutzt, um Katalog-Optionen wirklich zu ändern, gilt dieselbe
  Kette-Regel (§7).

## 7 · Der Satz, der über diesen Zug hinausgeht

> **Alles, was auf den zusammengesetzten Bestand angewiesen ist, gehört hinter die
> Bündel-Anwendung (`buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)` und was direkt danach
> folgt) — und nicht in ein Literal davor.**

Diese Zeile ist ab jetzt die KETTE, namentlich: der benannte Ort für alles, was den vollständigen
Bestand braucht. A2 (WIZARDS selbst), A3, A4, A5 stoßen auf dieselbe Frage bei jedem Feld, dessen
Inhalt aus einer anderen, noch nicht boot-zeit-verfügbaren Quelle stammt — dann gibt es einen
benannten Platz, an dem der Materialisierungs-Schritt andockt, statt einer neuen Erfindung je Fall.
