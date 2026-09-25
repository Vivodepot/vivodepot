# U2-ADR-326 · Das Auszugs-Tor wird generisch — und `zugang-zum-recht` bekommt seinen zweiten Zweck

**Datum:** 06.09.2026
**Status:** gebaut, vierzehn Proben grün (fünf am Tor, sechs am Ab-Werk-Einlass, drei in der Lese-App),
dazu die bestehende Erbschein-Abnahme unverändert grün
**Status heute:** gilt. Der Kern kennt keine Template-Kennung mehr.
**Bezug:** „Wir bauen nichts statisch. Wir bauen Gerüst und Modul." (06.09.2026) ·
„die Stelle, die Templates anzeigt, muss eine nicht definierte Anzahl anzeigen!" (06.09.2026) ·
U2-ADR-288 (Erbschein ab Werk eingelassen — Bauart übernommen) · U2-ADR-287/295 (die zwei
Pro-Templates, s. §7) · U2-ADR-292/319/320 (Bürgermodul, eingebettetes Bündel, Schnitt) ·
U2-ADR-037 (Definition und Wert wohnen getrennt) · U2-ADR-047 (SHL/xShare) · U2-ADR-282
(die Aufrufstelle ist die Grenze, kein Nachweis am Modul)

---

## 0 · Wozu dieses Template da ist — und wozu nicht

**Dieses Template zeigt das VOR-SAMMELN: die Bürgerin hält die Angaben bereit, die eine
Rechtsantragstelle erfragt, in DEREN Abschnitts-Struktur — nicht in unserer.** Es erzeugt keinen
Antrag und reicht nichts ein.

Der Anlass ist ein Geschäftsmodell-Beispiel, kein Rechtsprodukt (06.09.2026): die
Verwaltung beginnt, quelloffen anschlussfähig zu werden, und Vivodepot zeigt daran, **dass das
Vor-Sammeln bei uns stattfinden kann**. Deshalb ist „es gibt kein publiziertes Schema" (§13) hier
keine Blockade: **wir müssen nicht in ihrem Format einreichen, wir müssen in ihrer Struktur
sammeln** — und die steckt in ihrem Formular, nicht in einem Schema.

**Wer den Auszug für einen unvollständigen Antrag hält, liest ihn falsch.** Was er deckt und was
nicht, steht in §13 mit Zählung.

---

## 1 · Der Befund: der Kern konnte genau EINEN Auszug zeigen

```
vivodepot.html, Torwaechter
  if (bereichRolle(sektorId,'erbscheinAuszugSektion') === sek.id
      && _modulOderVorlage('erbschein-vorbereitung'))          <- die KENNUNG stand im Code
    html += erbscheinAuszugSektionHTML();
```

Die **Rolle** war längst Daten (`tools/buergermodul/vd-privat.json`), die **Kennung** daneben nicht.
Ein zweites Template hätte eine zweite hartkodierte Zeile gebraucht — genau das Statische, das die
Vorgabe oben ausschließt. **Die Lese-App ging den generischen Weg
(`logikModulAbschnitteHTML`) längst; der Kern hinkte hinterher, nicht umgekehrt.**

## 2 · Die Entscheidung: das Tor wird modulgetrieben

```
if (bereichRolle(sektorId, 'auszugSektion') === sek.id)
  html += logikModulAuszugKartenHTML(sektorId);
```

**Die Rolle heißt jetzt nach ihrer Funktion, nicht nach ihrem ersten Fall.** Gerendert wird je
eingelassenem, GEPRÜFTEM Logikmodul, dessen `sektor` passt und das ein Kärtchen mitbringt.

**Die Kärtchen-Texte reisen als TEXTSATZ-KENNUNGEN im Bündel, nicht als Klartext**
(`dokAusgabe.karte.hinweisKennung`/`knopfKennung`). Klartext im Bündel wäre ein Wortlaut, den kein
Sprachmodul mehr erreichen kann — dieselbe Trennung wie überall: Struktur im Modul, Text im Satz.
Eine Kennung, die der Satz nicht führt, liefert Leerstring und kann nichts anderes erreichen als
STRINGS-eigene Schlüssel.

**Der Erbschein-Auszug bleibt zeichengleich.** Bewiesen, nicht behauptet: die erste Probe vergleicht
die Ausgabe des generischen Tors mit dem HTML, das der frühere feste Renderer erzeugte.

## 3 · Unbestimmte Anzahl, bestimmte Reihenfolge

**Keine Obergrenze im Code:** kein `slice`, kein `[0]`, kein Sonderfall für „genau eines".
**Keine Obergrenze im Layout — gemessen, nicht angenommen:** die Kärtchen-Klasse hat im CSS-Kopf
**null** Regeln. Die Kärtchen sind schlichte Block-Elemente und stapeln; es gibt kein Raster, das
bei vier bricht. Ein künftiger Template-Ort erbt von hier keine Fessel.

**Die Probe fährt zwanzig, nicht drei.** Drei beweisen nicht, dass es keine Grenze gibt — nur, dass
sie über drei liegt.

**Sortiert wird nach der Modul-KENNUNG, nicht nach der Einlass-Reihenfolge.** Sonst sähe dieselbe
Bürgerin nach einem erneuten Einlass eine andere Seite, ohne dass sich etwas geändert hat. Die
Probe fährt dieselbe Menge in umgekehrter Einlass-Reihenfolge und verlangt dieselbe Seite.
**Und die Kennung ist über Aktualisierungen stabil** — gemessen: `logikModulEinbetten` trifft über
`m.id === neu.id`; die Kennung IST die Identität, an der eine Aktualisierung ansetzt, ein Modul mit
anderer Kennung wäre ein anderes.

## 4 · Nur Geprüftes rendert — und der leere Fall rendert nichts

Eingelassen heißt: **Fremdstoff aus einer Depot-Datei.** Bis hierhin schützte die hartkodierte
Kennung nebenbei mit; jetzt trägt allein `logikModulPruefen`. Zwei rote Beweise:

- ein Modul mit passendem `sektor`, dessen Prüfung fehlschlägt, rendert **nichts** — kein Kärtchen,
  keine leere Hülle, keine halbe;
- ohne Auszug rendert das Tor **nichts** — keine Überschrift ohne Inhalt, kein Hinweis.

## 5 · `zugang-zum-recht` ist eine Template-FAMILIE, nicht ein Template

Der Erbschein-Vorbereitungsauszug **ist** das `zugang-zum-recht`-Template (05.09.2026).
Dieser Zug fügt seinen **zweiten Zweck** hinzu: den Beratungshilfe-Vorbereitungsauszug. Beide sind
eigene Logikmodule derselben Familie — nur so bleibt die Byte-Gleichheit des Erbscheins erhalten
und trägt das generische Tor beide nebeneinander.

Der Ab-Werk-Einlass ist derselbe wie in U2-ADR-288, nur über eine **Liste** statt über eine Funktion
je Modul (`AB_WERK_AUSZUG_BUNDLE_TEXTE`). **Ein drittes Template kostet dort eine Zeile.**

**Die Migrationsstufe filtert auf genau eine Kennung**, und das ist keine Feinheit: liefe sie über
alle Ab-Werk-Bündel, bekäme eine Bürgerin, die einen früher nachgelieferten Auszug **selbst
entfernt** hat, ihn beim nächsten Versionssprung wieder. Das wäre ein Zurückdrehen ihrer
Entscheidung. Eigener roter Beweis.

## 6 · Die Felder gehören ins Bürgermodul — und warum das der stärkere Weg ist

**Produktentscheidung:** braucht ein Template neue Felder, gehören sie ins Bürgermodul, nicht
in einen template-eigenen Speicher. **Gemessen, warum das auch technisch die stärkere Antwort ist:**

Der Kern sagt es selbst (`vivodepot.html`, Bereichs-Kommentar): *„Ein angedockter Bereich bringt
KEINE Sektionen und keine Felder mit. Seine Felder kommen auf demselben Weg wie alle angedockten
Felder — `data.feldDefinitionen[]`. **Zwei Wege für Felder wären zwei Stellen, an denen die
Sensibel-Prüfung verschieden ausfallen kann.**"*

Der Fremdweg (`data.feldDefinitionen[]`) verlangt das Pflicht-Präfix `tpl_`, verwirft
Kern-Kollisionen namentlich und trennt Definition von Wert. Er ist für **fremde Herausgeber** gebaut
und darum der **schwächere** — für unsere eigenen Felder ist das Bürgermodul der Ort, an dem alle
Riegel greifen.

**Vier neue Felder** in `vermoegen#einkommen-wohnsituation` — der Sektion, die ausweislich ihres
eigenen Kommentars für genau diesen Anlass gebaut wurde. Alle vier sensibel, alle als **Beträge**,
nicht als Einkommens-ARTEN:
`einkommen_netto_monat` · `unterhalt_verpflichtungen` · `haushalt_weitere_einkommen` ·
`belastungen_monatlich`

**Zwei neue Unterfelder** an `verwaltung.verwaltung_vorgaenge`, beide sensibel:
`gegenseite` · `beratung_bisher`. **An DEN Vorgang, nicht an die Bürgerin** — ein Mensch kann
mehrere Angelegenheiten haben, jede mit eigener Gegenseite; als Top-Level-Felder wären sie beim
zweiten Vorgang falsch.

**Die fünfte Angabe wurde nicht gebaut, weil es sie gibt.** „Worum es geht", „welche Stelle",
„Aktenzeichen", „seit wann" führt `verwaltung_vorgaenge` bereits; der Auszug ruft sie über
`listenfeldAlle` ab. Ein Beratungshilfe-Antrag ist dieselbe Klasse wie der Rentenantrag, den der
Hinweis dieses Feldes nennt.

**Beschreibend, nicht belehrend:** der Antrag fragt nach einer früheren Beratung, weil eine zweite
Beratungshilfe für dieselbe Angelegenheit ausgeschlossen ist. Das ist der **Grund** für das Feld,
nicht sein Beschriftungstext — ein Hinweis, der die Rechtsfolge behauptet, wäre ein Wortlaut mit
Rechtsfolge und bräuchte eine Quelle.

## 7 · Zwei Befunde beim Bau

**a) `listenfeldAlle` fehlte in der Lese-App — gefunden, aber nicht als Erster.**

Beim Bau verschwand der Beratungshilfe-Auszug in der Lese-App wortlos. Gemessen gegen die damalige
Zweigbasis: `LOGIK_DATEN_TYPEN_LESEN` kannte den Typ nicht, und die Lese-App verwirft bei
unbekanntem `datenSchema`-Typ **das ganze Modul**, nicht den einen Eintrag — womit auch
`pro-notar-kanzleivertretung` (U2-ADR-287) und `pro-geschaeftsfuehrerin-notfallmappe` (U2-ADR-295)
beim Empfänger nie ankamen.

**Der Befund war zu diesem Zeitpunkt bereits behoben, nur nicht auf der Basis, gegen die dieser Zug
maß: U2-ADR-325 hatte ihn eine Stunde zuvor gelandet** — und besser, als dieser Zug ihn repariert
hatte: die Typliste kommt dort **aus einer Quelle** (`tools/build-logik-typen.js`, Gate im
pre-commit), statt ein zweites Mal danebengepflegt zu werden, und der Erzeuger prüft zusätzlich,
dass die Lese-App zu jedem Kern-Typ auch einen Lese-Zweig hat. **Die hiesige Reparatur ist beim
Rebase ersatzlos entfallen; die Probe des Beratungshilfe-Auszugs in der Lese-App ist gegen die
gelandete Fassung grün.** Festgehalten bleibt der Vorgang, weil er zeigt, woran ein zweiter
Messpunkt hängt: **gegen eine veraltete Basis gemessen, wird aus einem behobenen Fehler ein
Befund.**

**b) Der Erreichbarkeits-Kommentar an `zugang-zum-recht` war überholt.** Er verwies auf die Tür
„Was möchten Sie hinterlegen?" auf der Startseite; die ist seit dem 04.08.2026 dort entfernt, die
Ansicht zog ins Depot. Heutiger Stand, gemessen: die Lage erscheint in der Bestandsauswahl im Depot
und in der Suche, **nie** als Willkommens-Kachel (die tragen nur `sorte:'ereignis'`).
**Keine Kachel gebaut** — der ursprüngliche Grund gilt unverändert, und eine Startseiten-Kachel wäre
eine Gestaltungsentscheidung, keine Bauentscheidung.

## 8 · Zwei benannte Grenzen

### xShare trägt keine Auszüge — und das darf sich nicht nebenbei ändern

```
xShare/SHL traegt AUSSCHLIESSLICH autoritative Original-Eintraege der Mappe.
Ein Auszug ist keiner.
Wer einen in die Mappe legt, macht ihn teilbar — das ist eine Produktentscheidung,
keine Bauentscheidung.
```

**Gemessen am Code:** `shlProviderPayload(mappeId)` liest ausschließlich `mappeEintrag(mappeId)` und
verlangt einen autoritativen Original-Eintrag; im Funktionskörper kommt weder `data.sektoren` noch
`logikModul` vor. **Dieser Zug lässt xShare unberührt: es verlässt nichts das Depot, was es vorher
nicht auch verlassen hätte.** Und die zehn Exportkanäle tragen die neuen Angaben ebenfalls nicht —
sie sind fachlich geschlüsselt (FHIR-IPS, XÖV, EDCI, SD-JWT-VC, vCard, ICS) und kennen
`vermoegen`/`verwaltung_vorgaenge` nicht.

### `sensibelErlaubt` ist eine Aussage des Moduls über sich selbst

Die Sensibel-Schranke verlangt **je datenSchema-Eintrag** ein ausdrückliches `sensibelErlaubt: true`.
**Das ist stärker als eine Prüfung hinterher: die Erlaubnis ist eine Aussage des Moduls über sich
selbst, kein Urteil des Kerns über das Modul.** Ein Auszug, der es nicht benennt, kommt an die
Felder gar nicht heran — darum sitzt die Schranke dort und nicht am Ausgabeweg.

Gemessen, dass die Rückhaltung greift: sechs Markierungswerte ins Depot, dann die Wege zweimal
gebaut — `vollDepotModell` und `bereichVollModell(vermoegen)` tragen sie mit `sensibel: true`, ohne
`sensibel` **keine einzige**. In der Lese-App eigener roter Beweis über alle sechs.

## 9 · Bestandsdepot: es geht auf, als wäre nichts gewesen

Sechs neue Felder ändern den Bestand **jeder** Bürgerin, auch derer, die nie einen Antrag stellt.
Gemessen am echten öffentlichen Beispieldepot (Schema 75):

```
kein Wurf · Schema 75 -> 80 · die sechs neuen Felder LEER · beide Auszuege nachgeliefert
vier bestehende Werte aendern sich (Gueltigkeits-Felder ziehen in feldGueltigkeit)
GEGENPROBE gegen den Kanon OHNE diesen Zug: dieselben vier aendern sich dort auch, 75 -> 79
```

**Also eine bestehende Wanderung, nicht diese.** Dieser Zug fügt genau eine Stufe und einen Auszug
hinzu.

## 10 · Der Verschub der eingefrorenen Aufnahmen — benannt, nicht versteckt

Zwei eingefrorene Aufnahmen verschieben sich mit diesem Zug, beide **rein additiv**:

```
tests/fixtures/golden-master-ausgabewege-baseline.json
  + Eigenes Einkommen (netto, monatlich)          1.850
  + Unterhaltsverpflichtungen                     Tochter Mia, 420 EUR monatlich
  + Einkommen weiterer Personen im Haushalt       2.100
  KEINE bestehende Zeile bewegt sich.

tests/fixtures/render-aufnahme/
  vermoegen (leer + befuellt)   die vier neuen Felder, das Auszugs-Kaertchen
  verwaltung (befuellt)         die zwei neuen Unterfelder am Vorgang
  vorsorge                      UNVERAENDERT — die Erbschein-Karte steht, wo sie stand
```

**Die Regel im Kopf von `golden-master-ausgabewege.test.js` verlangte dafür einen EIGENEN Commit,
„NIE im selben Commit wie ein Umbau" — und ist mit dem heutigen Gate unerfüllbar geworden.** Die
Baseline lässt sich erst nach der Änderung aufnehmen; ein Bau-Commit ohne sie ist an genau dieser
Probe rot, und das pre-commit-Gate lässt ihn nicht entstehen. Der einzige Weg zu zwei Commits führte
über `--no-verify`, also am Gate vorbei. **Eine Konvention, die nur brechen kann, wer sie liest, ist
keine mehr** — sie hätte die nächste Sitzung zu genau der Bewegung eingeladen, gegen die das Gate
gebaut ist.

**Der Regeltext ist darum in diesem Zug korrigiert, mit Datum und Grund daneben.** Geblieben ist die
Auflage: der Verschub muss sichtbar, benannt und begründet sein — er steht jetzt als eigener
Abschnitt in der Commit-Nachricht und hier, statt als eigener Commit.

## 11 · Zwei Fehler, die erst der ZWEITE Auszug sichtbar machte

Beide waren im Kern angelegt, solange es genau EIN eingelassenes Logikmodul gab — und beide traten
in dem Moment auf, in dem ein zweites dazukam:

- **Die Regal-Karte erschien im falschen Bereich.** `logikModuleAlsKarten()` filterte nicht nach
  dem rendernden Bereich; das fiel nicht auf, weil die Heimat des einzigen Moduls zufällig der
  Bereich war, der das Regal rendert. Der Beratungshilfe-Auszug (Heimat `vermoegen`) erschien damit
  im Vorsorge-Regal. **Behoben:** die Karte gehört in das Regal ihres eigenen Bereichs.
- **Die Herkunft blieb leer.** `modulKarteHerkunft` las ausschließlich `_MODUL_KARTE[id]` — eine
  Liste im Kern. Ein Modul ohne Eintrag rendert einen leeren `<span class="regal-herkunft">`,
  sichtbar als Loch in der Karte. **Behoben mit einem Rückfall auf die Angabe des Moduls selbst** —
  ein Eintrag je Template im Kern wäre genau das, was dieser Zug abschafft.

**Beide sind derselbe Befund in klein:** was für genau einen Fall gebaut ist, sieht richtig aus, bis
es einen zweiten gibt.

## 12 · Was ein Feld im Bürgermodul heute kostet — ein Befund, kein Anhang

Sechs Felder hinzuzufügen ließ **fünfundzwanzig Proben** rot laufen. Sie fallen in fünf Klassen:

| | |
|---|---|
| **A** | Zahlen (448→454, 266→270, 182→184, 38→39 Migrations-Sprünge) |
| **B** | erzeugte Artefakte (Struktur-Bündel, EN-Modul) |
| **C** | eingefrorene Aufnahmen (Golden Master, Render, Referenzdepot-Abdeckung) |
| **D** | Grundlinien (sensibel-Liste, tote STRINGS, Fixture-Felder, Wächter W-1/2/11 …) |
| **E** | die Gleichheits-Probe gegen den eingefrorenen nativen Bestand (§ oben) |

**Die meisten dieser Maßstäbe prüfen Gleichheit, nicht Vollständigkeit.** Das ist richtig für einen
Umbau, der nichts verändern soll — und falsch für eine Ergänzung, die genau das darf. Ein Template
soll das Modul um spezifische Inhalte ergänzen (Produktentscheidung, 06.09.2026); wenn jede
Ergänzung fünfundzwanzig rote Proben kostet, hält der Nächste es für seinen Fehler statt für eine
Eigenschaft des Hauses.

**Zweimal an einem Tag, an zwei unabhängigen Stellen, musste dieselbe Entscheidung einzeln fallen:**
die Probe gegen den eingefrorenen nativen Bestand (§ oben) und der Migrationsbeleg gegen den
eingefrorenen Referenzdepot-Export. Beide prüften Gleichheit, obwohl sie **Verlust** meinen. Beide
prüfen jetzt Enthaltensein plus eine benannte Zuwachsliste — **und zwar dieselbe**:
`tools/bestand-zuwachs-seit-einfrieren.js`, eine Quelle mit zwei Sichten (Feld-Stellen im Bestand,
Feld-Wege im Export). Zwei Aufzählungen drifteten, und die eine deckte dann, was die andere längst
nicht mehr kennt — dieselbe Bauform wie `DATEISATZ` und die Logik-Typliste.

**Die Frage, die eine eigene Erhebung beantworten muss — nicht dieser Zug:**

> **Welche der eingefrorenen Maßstäbe prüfen Gleichheit, obwohl sie Vollständigkeit meinen — und
> welche meinen wirklich Gleichheit?**

**Nicht alle gehören umgestellt.** Der Gegenbeweis steht in diesem Zug selbst: die Zahlen-Probe der
eingefrorenen Fixture (13/266/182) bleibt eine Gleichheits-Probe, weil sie die **Fixture**
beschreibt und nicht den Bestand — ein eingefrorener Maßstab, dessen Zahlen wandern, ist keiner.
**Die Erhebung muss trennen, nicht pauschal lockern.**

---

## 13 · Grenzen, benannt statt verschwiegen

- **Abdeckung, gezählt gegen die interne Abschnitts-Erhebung vom 30.08.2026** (sie führt die
  A2J-Abschnitte „Abschnitt für Abschnitt" auf; ihre Vollzähligkeit ist ihre Aussage, nicht meine
  Nachmessung):

  | A2J-Abschnitt | im Auszug |
  |---|---|
  | `finanzielleAngaben` | **teilweise** — Einkommen, Haushaltseinkommen, Unterhalt, Belastungen, Wohnkosten, Vermögen. NICHT: Kinder-Finanzen, Partner-Finanzen als eigene Posten |
  | `rechtsproblem` | **teilweise** — Gegenseite und Vorgangsart. NICHT: Rechtsgebiet, Beschreibung, Ziel |
  | `anwaltlicheVertretung` | **teilweise** — ob und durch wen beraten wurde. NICHT: Kontaktdaten |
  | `persoenlicheDaten` | **nicht im Auszug** — die Angaben stehen im Depot (`identitaet`), der Auszug führt sie heute nicht mit |
  | `grundvoraussetzung` | **nicht gedeckt, bewusst** — reine Eignungsfragen für genau diesen Antrag, keine dauerhafte Tatsache; sie gehören in die Vorlagen-eigene Wizard-Logik |
  | `weitereAngaben` | **nicht gedeckt, bewusst** — Freitext der Vorlage selbst |

  **Drei von sechs Abschnitten berührt, keiner davon vollständig; zwei bewusst ausgelassen; einer
  (`persoenlicheDaten`) liegt im Depot und wäre der billigste nächste Schritt.** Das ist ein
  Ausschnitt, und er ist hier benannt statt behauptet.
- **Der Beratungshilfe-Antrag ist damit nicht vollständig abgebildet.** Es fehlen weiterhin: die
  Kontostände (führt Vivodepot bewusst nicht) sowie eine strukturierte Aufstellung der
  Werbungskosten. Der Auszug weist beides als Lücke aus, statt zu raten.
- **Die Andockstelle, benannt statt behauptet.** Drei Fragen waren offen; alle drei sind am
  06.09.2026 beantwortet:
  **Transport** — derselbe Satz Ausgabewege wie überall, unabhängig vom Empfänger; kein Sonderweg
  für die Justizverwaltung. Auszug zum Lesen, Datei zum Weitergeben, die zehn Kanäle daneben.
  **Identität und Signatur** — Vivodepot GmbH, vorerst intern. Keine erfundene `templateJws`, keine
  fremde Signaturerwartung: **wir bauen ein Angebot zum Andocken, keine beauftragte Schnittstelle.**
  **Schema** — es gibt keines zum Andocken. Die Gegenseite (`a2j-rechtsantragstelle`, MIT, BMJV /
  DigitalService) ist quelloffen, aber **eine komplette Anwendung, kein isolierter Feldsatz und kein
  publiziertes Formularschema** (erhoben am 30.08.2026, intern abgelegt); die Formularlogik steckt
  im React-Code. Der Auszug bleibt darum eine lokale, schema-inspirierte Datei ohne feste Kopplung —
  dieselbe Formulierung, die der Kern für den Erbschein-XML schon führt: *„lose angelehnt, keine
  amtliche XJustiz-Konformität"*. Kommt später ein Format, ist es ein Nachtrag, kein Umbau.
- **Eine ältere interne Einordnung widerspricht zwei Feldern dieses Zuges — und wurde ergänzt statt
  überholt.** Die Feldvorschlags-Erhebung vom 30.08.2026 verwirft `rechtsproblem` (darin: Gegenseite)
  und `anwaltlicheVertretung` als „fallspezifisch, ändert sich pro Fall". **Das Kriterium ist am
  Bestand widerlegt:** `verwaltung_vorgaenge` führt mit `aktenzeichen` bereits eine gleich
  fallspezifische Angabe. Der Test ist nicht „ändert es sich pro Fall", sondern **„bleibt es im
  Depot, wenn der Fall durch ist"** — bei einem Rechtsstreit mit seiner Gegenseite: ja. Die
  Einordnung bleibt richtig für TOP-LEVEL-Felder über die Bürgerin; gebaut sind beide als
  **Unterfelder am Vorgang**, und dort ist „pro Fall verschieden" die Bauform. Die Erhebung trägt
  seit dem 06.09.2026 einen Nachtrag mit genau diesem Inhalt — ein Dokument, dem widersprochen wurde,
  ohne dass es davon weiß, schickt die nächste Sitzung in dieselbe Frage.
- **Der Ort, an dem Templates künftig als Verzeichnis erscheinen, ist nicht Teil dieses Zuges.** Das
  Tor rendert dort, wo eine Sektion die Rolle `auszugSektion` trägt; ein künftiger Ort ist eine
  Sektion mit dieser Rolle und braucht keine Änderung hier. Damit ein Verzeichnis Name, Herkunft und
  Stand aus dem Template selbst lesen kann statt aus einer Liste im Kern, reichen sie seit diesem
  Zug durch die geprüfte Form hindurch (`herkunft`, `moduleVersion`, `eingelassenAm`).
