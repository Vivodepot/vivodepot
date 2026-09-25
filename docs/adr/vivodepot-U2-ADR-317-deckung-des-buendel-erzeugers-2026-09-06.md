# U2-ADR-317: Die Deckung des Bündel-Erzeugers — acht Verweise waren gemeint, hundertneun sind es

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `tests/erzeuger-deckung-wizards-katalog.test.js`

- **Status heute:** gilt — jeder Katalogverweis aus `WIZARDS` und jeder feldbezogene Verweis
  **innerhalb** des Bündels ist gegen beide Träger geprüft, mit Rot-Beweisen für beide Klassen.
  **Die Regenerierung bleibt aus**, wie verlangt; die Deckung kommt ohne sie aus.

---

## Der Anlass, und warum er still war

Fehlt **ein** Feld in einem sonst befüllten Bereich, dessen `WIZARDS`-Katalogverweis noch
besteht, wirft der Boot-Lauf — **und dreizehn Seitenleisten-Labels zeigen „undefined".** Das
`catch` ist inzwischen laut (U2-ADR-313), die Ursache lag aber eine Ebene tiefer.

**Seit dem Umbau kann der Bündel-Erzeuger nicht mehr gegen den nativen Bestand gegenprüfen** —
die Regenerierung ist bewusst aus, ihr Gegenstand existiert nicht mehr. Gedeckt war **eine
Stichprobe** (`familienstand`). Die übrigen liefen ungeprüft: ein stiller Tippfehler bei einem
davon fiele durch keine Probe, sondern erst live in genau diesen Ausfall.

## Was gemessen wurde — und die Zahl war größer als der Auftrag

Der Auftrag nannte acht WIZARDS-Felder, mit dem ausdrücklichen Zusatz, die Zahl selbst zu
zählen. **Acht stimmt.** Selbst gezogen aus dem `WIZARDS`-Literal (Zeilen 16238–16564), samt
der 6-zu-2-Aufteilung:

```
meine-menschen.gebwiz_kind_art        ohne Filter
sozialversicherung.pflegegrad         ohne Filter
sozialversicherung.pflegegeld         ohne Filter
vorsorge.pflege_vorsorge_geprueft     ohne Filter
identitaet.familienstand              MIT Filter ['verh','elp']
identitaet.heirat_namenswahl          ohne Filter
identitaet.gueterstand                ohne Filter
identitaet.steuerklasse               MIT Filter ['III','IV','IV_faktor','V','VI']
```

**Aber es sind nicht acht Verweise dieser Klasse, sondern hundertneun.** Das Bündel enthält
selbst Verweise auf Feld-Kennungen, die auflösen müssen:

```
sichtbarWenn.feld        87
zusammenfassungFelder    12
verweisKontextFeld        2
```

**Alle lösen heute auf. Keiner war geprüft.**

### Die zweite Klasse ist die leisere

Ein fehlender **Katalogverweis** wirft: `_katalogOptionen: kein Katalogfeld …`. Laut, sofort,
beim Boot.

Ein fehlender **`sichtbarWenn`-Verweis** wirft **nicht**. Die Bedingung ist dann schlicht nie
erfüllt — **das Feld bleibt unsichtbar, dauerhaft, ohne Meldung.** Ein Feld umzubenennen, ohne
die Verweise nachzuziehen, sähe aus wie ein Feld, das es eben nicht gibt.

**Und die gefilterten Katalogverweise sind die dritte, noch leisere Sorte:**
`_katalogOptionen(sek, feld, ['verh','elp'])` wirft nicht, wenn `verh` fehlt — es liefert eine
Option weniger. **Ein Assistenten-Schritt mit halbem Angebot, ohne dass irgendetwas anschlägt.**

## Die Entscheidung

**Die Liste wird aus der QUELLE gezogen, nicht gepflegt.** Wer einen neunten Katalogverweis in
`WIZARDS` einbaut, ist automatisch gedeckt. Eine gepflegte Liste wäre genau der Wächter, der den
nächsten Fall nicht kennt — dieselbe Lehre wie bei der Rechtsraum-Ratsche (U2-ADR-307).

**Beide Träger, nicht einer.** Die Prüfung läuft gegen `tools/vd-privat-struktur-bundle.json`
**und** gegen das im Kern eingebettete `BUERGERMODUL_BUENDEL` — 87s Form aus U2-ADR-310 Probe 3.
Ausgeliefert wird das eingebettete; die Platte allein zu prüfen genügte nicht.

**Ohne die Regenerierung.** Sie bleibt aus, wie verlangt. Die Deckung kommt aus dem Vergleich
zweier vorhandener Träger, nicht aus einer wiederhergestellten Erzeugung.

## Was bewiesen ist

```
Verweise aus der Quelle       ≥ 8, keiner doppelt
Platte                        jeder Verweis findet sein Feld MIT Optionen
Eingebettetes Bündel          dasselbe, eigener Träger
Filterwerte                   jeder existiert wirklich (≥ 2 gefilterte Verweise)
Verweise im Bündel            ≥ 90 gesammelt, keiner zeigt ins Leere
ROT  Feld entfernt            wird gefunden
ROT  Filterwert entfernt      wird gefunden
ROT  Blindverweis eingesetzt  wird gefunden, genau einer
Positivkontrolle              am echten Bündel findet die Prüfung KEINE Lücke
```

**Die Positivkontrolle ist nicht Zierat:** ohne sie wären die Rot-Beweise auch dann grün, wenn
die Suchfunktion *immer* `null` lieferte — dann prüften sie nichts als ihre eigene Strenge.

**Und jede Probe prüft zuerst ihre eigene Ausbeute** (`≥ 8`, `≥ 2`, `≥ 90`). Findet das Muster
nichts, weil sich der Quelltext geändert hat, schlägt sie an — statt still grün zu sein. Eine
Probe, die nichts findet, ist sonst nicht von einer zu unterscheiden, die nichts zu finden hat.

## Was ausdrücklich NICHT dazugehört

**Die Regenerierung.** Sie bleibt aus. Diese Proben ersetzen sie nicht — sie decken den
Verweis-Zusammenhang ab, nicht die Frage, ob das Bündel inhaltlich dem entspricht, was der
native Bestand einmal war. **Dieses Original ist fort**, und das ist die bewusste Folge des
Umbaus.

**Was der Ladeweg zur Laufzeit einsetzt.** Geprüft ist das Bündel, nicht das Ergebnis eines
Ersetzers. Tauscht ein Ladeweg Optionen aus und lässt dabei einen Filterwert fallen, fängt das
diese Probe nicht — sie sieht nur die Datei.

**Die übrigen Achsen des Erzeugers.** Er deckt vier; hier geprüft ist die Struktur-Achse.
**Die Frage „was prüft ihn eigentlich" ist damit für eine Achse beantwortet, nicht für alle** —
das gehört gesagt, damit die Deckung nicht für größer gehalten wird, als sie ist.
