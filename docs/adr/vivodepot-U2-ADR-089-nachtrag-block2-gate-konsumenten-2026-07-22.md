# U2-ADR-089-Nachtrag · Block 2 — Gate-Konsumenten auf abgeleitete Instrument-Existenz

**Datum:** 22.07.2026
**Status:** Angenommen · **Block 2 abgeschlossen** (22.07.2026). Etappen 1–4 gebaut (Suite 1522 grün, Verbatim-Block byte-identisch, kryptoVersion 3); die vier Instrument-Wizards brauchten keine Umstellung (§8).
**Bezug:** U2-ADR-089 (Vorsorge-Instrument-Liste, Block 1) · U2-ADR-064 (Vollmacht-`liste`-Record — von U2-ADR-089 revidiert) · U2-ADR-090 (Präfix- und Benennungsregel) · Verbatim-Block-Pin `8d31c678…`
**Commits:** `74e0eec` (E1) · `5a3605a` (E2) · `2ae89d1` (E3) · Etappe 4 + dieser Nachtrag folgen
**Status heute:** teilweise überholt durch U2-ADR-133 (§8 gebwiz). Zusätzlich ist §3 (Gates bleiben) durch eine spätere interne Entscheidung vom 22.07.2026 abgelöst — das ist KEIN Verweis auf eine andere ADR, sondern eine im selben Dokument festgehaltene Entscheidung (s. Kasten in §3). Im Übrigen gilt, Etappen 1–4 mechanisch geprüft (`tests/import-gate-instrument.test.js`, `tests/fix-b17-import-plan-listenfeld.test.js`).
*(Nachtrag 29.08.2026, ADR-Lücken-Prüfung: beide Nachfolger-Verweise standen bereits im Text, nur nicht im ersten Satz dieses Felds. Umformuliert, kein neuer Inhalt.)*

---

## 0 · Zur Nummer (U2-ADR-090)

Suffix `-Nachtrag` an U2-ADR-089, keine eigene Nummer: dies dokumentiert die **Umsetzung** von Block 2, den U2-ADR-089 bereits als Folge-Arbeit vorsah — kein neuer Entscheidungsstrang, sondern die beim Bau getroffenen Detail-Entscheidungen. Innerhalb der U2-Linie, also greift die Suffix-Konvention (§3 von U2-ADR-090).

## 1 · Kontext

U2-ADR-089 (Block 1) baute die geteilte Liste `vorsorge_instrumente`. Block 2 stellt die **Gate-Konsumenten** um: die Stellen, die bis dahin die vier flachen Gate-Felder (`vollmacht_vorhanden`, `testament_vorhanden`, `patientenverf_vorhanden`, `betreuungsverfuegung`) lasen und **still versagten**, sobald ein Instrument nur als Record vorlag, ohne dass das alte Gate gepflegt wurde. Genau dieser stille Ausfall war seit dem 20.07. in den Angehörigen-Blättern live (belegt: dasselbe Depot mit vorhandenem Testament zeigte einer Vertrauensperson „nicht hinterlegt").

## 2 · Die Ableitung (der gemeinsame Kern)

„Gibt es dieses Vorsorge-Instrument?" wird generisch über `instrumentTyp` abgeleitet, **Record ODER Gate**, nie über eine neue handgepflegte Liste:

- Ein Instrument-Record (`vorsorge_instrumente.some(r => r.typ === X)`) zählt als „vorhanden", auch wenn das Gate nie gesetzt wurde. **Record schlägt Gate.**
- Ohne Record zählt das Gate weiter — es trägt den Zustand **„in Vorbereitung"**, den ein Record nicht ausdrücken kann (s. §3).

Die Typ→Gate-Brücke stand bereits in `ERKENNUNG_LEITFELDER` und ist **geschlossen**: die vier Gates sind historisch, Sorgerechts- und KI-Verfügung haben nie eines bekommen. Ein siebtes Instrument erweitert die Brücke nicht — es hätte kein Gate und zeigte record-only. Beschriftungen sind geliehen (Instrument-Name aus den `typ`-Optionen, Wertetexte aus den Gate-Optionen); kein neuer Bürgertext.

## 3 · Die Gates BLEIBEN — wegen „in Vorbereitung"

**Nachtrag 02.08.2026 — dieser Abschnitt ist überholt.** Die Entscheidung „Gates bleiben"
unten ist durch eine spätere interne Entscheidung vom selben Tag (Prinzip-Entscheidung zum
Vorsorge-Wizard, internes Arbeitsdokument, nicht Teil dieses Repos) bewusst abgelöst: die Instrument-Liste
wird der eine Ort, die fünf Vorsorge-Gates — inklusive des hier besprochenen — entfallen.
**Ersetzt durch:** internes Entscheidungsdokument vom 22.07.2026. Der Rest
dieses Nachtrags (Etappen 1–4, `betreuungsverfuegung`-Alias, §5–§10) bleibt davon unberührt —
nur dieser eine Abschnitt ist betroffen. Der Absatz unten bleibt stehen als historische Spur,
nicht als geltender Beschluss.

**Beschluss, hier erstmals im ADR festgehalten:** Die vier Gate-Felder werden durch Block 2 **nicht abgelöst**. Ein Instrument-Record kennt nur „existiert / existiert nicht"; das Gate trägt zusätzlich den Zwischenzustand „in Vorbereitung" (`plant`), den eine Bürgerin braucht, um „ich kümmere mich gerade darum" auszudrücken. Solange dieser Zustand nur am Gate lebt, bleibt das Gate.

Diese Entscheidung stand bis zum 22.07.2026 **ausschließlich als Code-Kommentar** in der Migration ([vivodepot.html:14672](../../vivodepot.html): „Das Gate `vollmacht_vorhanden` BLEIBT (Existenz/‚in Vorbereitung')"). Sie war real und wirksam, aber an einem Ort, an dem niemand sie sucht — genau das Muster, das im Forschungstagebuch vom 21.07. beschrieben ist („Entscheidungen am falschen Ort"). Sie gehört ins ADR, damit sie nicht bei der nächsten Durchsicht als Versehen gelesen wird.

## 4 · Die umgestellten Konsumenten (Etappen 1–4)

| Etappe | Konsument | Umstellung |
| --- | --- | --- |
| 1 | Sechs Gate-Querverweise in den fünf Angehörigen-Blättern (`_ANG_SITUATIONEN`) + `angehoerigenCacheModell` | abgeleitete Instrument-Zeile; Cache schneidet die Quellfelder mit |
| 2 | Neun Querverweise in den Kern-`SITUATIONEN` + neun in `vivodepot-lesen.html` + drei `vollmachten`-Waisen in der Lese-App | Ableitung; Lese-App-Spiegel der Typ→Gate-Brücke (geschlossen); Click-Through landet auf der Liste |
| 3 | `modulKarteStatus` (Nicht-`mehrfach`-Zweig, die einzige `gateFeld`-Lesestelle) · `crossRef.pruef` Betreuungsverfügung | Record-ODER-Gate; Regal-Karte und PV-Dokument |
| 4 | Import-Alias (`B16_FELD_MAPPING`) | Gate-Aliase behalten, fehlenden `betreuungsverfuegung` ergänzt — s. §5 |

**Die Lese-App ist ein eigenständiger Konsument** mit eigenen Kopien von `crossRefFeldUndRoh`/`akutZeileHTML`. Block 1 hatte sie nicht mitgezogen — das war die Wurzel der Regression `aa15787`. Block 2 spiegelt die Ableitung eigens (`_INSTRUMENT_GATE_LESEN`, `instrumentZeileModellLesen`) und weist sie eigens nach.

## 5 · Import-Alias — Gate-Aliase BEHALTEN + `betreuungsverfuegung` ergänzen (Beschluss B)

`B16_FELD_MAPPING` ist der **Fremd-Import** (B16/XÖV-Export eines anderen Anbieters). Native `.vivodepot`-Depots laufen über die Migration, nie über diese Tabelle — die Tragweite beschränkt sich auf Fremd-Importe.

**Faktenlage bei der Umsetzung:** Es existierten drei Gate-Aliase (`vollmacht_vorhanden`, `testament_vorhanden`, `patientenverf_vorhanden`); `betreuungsverfuegung` fehlte. Die Detail-Aliase (Vollmacht-Person/-Ort usw.) waren bereits per U2-ADR-064/065 entfernt.

**Entscheidung (22.07.2026): die Gate-Aliase bleiben, der fehlende `betreuungsverfuegung`-Alias wird ergänzt.** Damit ist Etappe 4 kein Streichen, sondern ein **Ergänzen** — und die eigentliche Erkenntnis ist, dass **ADR-089 Alternative 2 überholt ist** (s. u.).

**Begründung.** Das Gate ist der einzige Ort für den Zwischenzustand „in Vorbereitung" (§3), und der Fremd-Import ist die einzige Stelle, an der ein *externes* „in Vorbereitung" ankommen kann. Streicht man den Alias, verwaist genau der Zustand, für den die Gates überhaupt behalten wurden — die beiden Sitzungs-Entscheidungen „Gates bleiben" und „Alias fällt" widersprechen sich, und die Alias-Entscheidung ist die ältere, getroffen bevor „in Vorbereitung" klar war.

**Der fehlende `betreuungsverfuegung`-Alias war ein echter Defekt**, kein Symmetrie-Wunsch: Drei Gates nahmen einen Importwert an, das vierte ließ ihn ins Freitextfeld fallen. Ein importiertes „Betreuungsverfügung in Vorbereitung" landete bis dahin im Nirgendwo. Die additive Zeile behebt das. Am Import-Pfad belegt: alle vier Gate-Werte (inkl. `betreuungsverfuegung: plant`) landen jetzt korrekt im jeweiligen Gate.

**Doppelname-Falle (ausdrücklich geprüft).** `betreuungsverfuegung` ist zugleich Gate-Feld-ID, Instrument-`typ`-Wert und **Sektions-ID** (die Vorsorge-Sektion 4765). Verifiziert, dass der Import nicht in die Falle läuft: `_feldDef('vorsorge','betreuungsverfuegung')` liefert deterministisch das Gate-**Feld** (auswahl `ja`/`nein`/`plant`) — Sektion und Feld sind getrennte Namensräume, und es gibt genau ein Feld dieser id im flachgeklopften Feld-Set. Der Importwert wird daher korrekt gegen die Gate-Optionen interpretiert.

### ADR-089 Alternative 2 ist für die Gate-Aliase aufgehoben

U2-ADR-089 Alternative 2 formulierte „**Import-Alias fällt weg, mit sichtbarem Verwaisen**". Das galt für die **Detail**-Aliase (die zu Listen-Records wurden — bereits mit U2-ADR-064/065 vollzogen) und ist für die **Gate**-Aliase durch die spätere Entscheidung „Gates bleiben wegen in Vorbereitung" (§3, hier erstmals im ADR) **aufgehoben**. Ohne diesen Vermerk läse jemand Alt-2 wörtlich und striche, was in dieser Sitzung bewusst behalten wurde — genau das Muster „Entscheidung am falschen Ort" (Tagebuch 21.07.), hier präventiv geschlossen.

## 6 · `betreuungsverfuegung` — ein Name, zwei Bedeutungen

`betreuungsverfuegung` ist **zugleich** eine Gate-Feld-ID **und** ein Instrument-`typ`-Wert. Rund 20 Code-Fundstellen sind der Typ, nicht das Gate. Ein Suchen-und-Ersetzen über den bloßen Namen richtet hier Schaden an. Festgehalten als stehende Warnung; nicht auflösbar ohne eine der beiden Umbenennungen, die beide Bestandsdaten berühren würden — daher bewusst so belassen.

## 7 · Bewusst NICHT umgestellt

Zwei der im Auftrag als „drei Registries" gefassten Stellen sind **keine** `_instrumentVorhanden`-Kandidaten und bleiben unverändert:

- **`ERKENNUNG_LEITFELDER`** lebt in der Dokument-Mappe-Schicht (`dokumentTypExistiert` liest `data.dokumente[]`, nicht die Instrument-Liste). Ihre Aufgabe ist das Gegenteil einer Existenz-Ableitung: sie schlägt das Anlegen eines Mappe-Eintrags vor, *wenn* das Gate „ja" sagt und *noch kein* Dokument existiert. `erfuellt` auf `_instrumentVorhanden` umzustellen wäre zirkulär und schichtfremd.
- **`standardDokumente[].felder`** ist eine Anzeige-Vorverknüpfung (Liste von `{sektorId, feldId}`), kein Boolescher Existenz-Check — `_instrumentVorhanden` passt nicht einmal typmäßig.

Beide bleiben, weil die Gates bleiben (kein stiller Ausfall). Eine mögliche **Anzeige-Verbesserung** — die Mappe-Vorverknüpfung auf `vorsorge_instrumente` statt aufs Gate zeigen zu lassen — ist als eigener kleiner Posten nach v1.0 vermerkt, nicht Teil von Block 2.

## 8 · Wizards — bleiben Gate-Schreiber, keine Umstellung nötig

**Amendiert 11.08.2026 — s. U2-ADR-133.** Der letzte Absatz dieses Abschnitts (Anlass-Wizards
bleiben unangetastet, sie erzeugen kein Instrument) gilt für **sechs** der sieben Anlass-Wizards
unverändert weiter. Für `gebwiz` wurde die Zurückhaltung am 10.08.2026 ausdrücklich
abgelöst: ein Kind in „Kinder und Schutzbefohlene" ist kein Instrument, und es gibt keinen
zweiten Schreibpfad, der durch das Anlegen doppelt würde — der Grund, der hier gegen
record-anlegende Wizards sprach (zwei Schreibpfade für dasselbe Instrument vermeiden), trägt
für ihn nicht. Details, Grenze und Nachweis in U2-ADR-133.

Die vier Instrument-Wizards (`vvwiz`, `pvwiz`, `bwwiz`, `erbwiz`) schreiben **Flachfelder** in `data.sektoren.vorsorge` — das Gate (`vollmacht_vorhanden` usw.) plus Detailfelder. **Kein Wizard legt einen Instrument-Record an**, und die Einzigartigkeits-Sperre (`_instrumentEinzigartig`) sitzt ausschließlich im Listen-Pfad (`listenEintragHinzufuegen`), nicht im Wizard.

**Daraus folgt: keine Umstellung.** U2-ADR-089 Entscheidung 3 („Wizard-Abschluss per Wiedereintritt, nicht per Sperre") beschreibt eine Welt, in der Wizards Records anlegen. Diese Welt existiert nicht. Ein Flachfeld-Wizard **ist** von Natur aus Wiedereintritt: der Wiederlauf überschreibt dasselbe Feld, legt nichts Zweites an und kann nie an eine Sperre laufen. Es gibt also keine Sperre, die durch Wiedereintritt zu ersetzen wäre.

**Und es gibt keinen stillen Ausfall von den Wizards** — der entscheidende Beleg für die Auflösung. Die Leser sind (E1–E4) auf „Record ODER Gate" umgestellt; ein Wizard, der `gate='ja'` schreibt, erscheint in allen Blättern als „vorhanden", `plant` als „in Vorbereitung". Die Eigenschaft, um die es in Block 2 ging, ist damit für alle vier Wizards erfüllt, **ohne einen anzufassen**.

**Verworfen: Wizards Records anlegen lassen (wäre ein neues Feature, kein Gate-Konsument).** Es widerspräche sich an der wichtigsten Stelle selbst: `vvwiz` vermeidet **bewusst** zwei Schreibpfade für dasselbe Instrument (Kommentar an der Definition: „nur das Gate + zvr; die einzelnen Vollmachten als Einträge unter Erteilte Vollmachten"). `pvwiz` ist Sonderfall (BMJ-Wizard, PV eigenständig). Record-anlegende Wizards gehören in die Merklisten-/Teil-B-Ära, wo sie **zusammen** entworfen werden, nicht vorher auf Verdacht.

Die **Anlass-Wizards** (`heirwiz`, `pflwiz`, `umzwiz`, `srwiz`, `anamwiz`, `gebwiz`, `kiwiz`) bleiben ebenfalls unangetastet: sie erzeugen kein Instrument, das Ergebnis einer Anlass-Prüfung ist ein Merklisten-Eintrag. Der ursprünglich geplante Wizard-Stopp als Rückfrage entfiel (entschieden, 22.07.).

## 8a · Stehende Notiz — „mechanische" Umstellungen einzeln prüfen

Fünf der in der Erhebung als Block-2-Konsumenten geführten Posten haben sich beim Hinsehen als **etwas anderes** erwiesen, als die mechanische Fassung („liest ein Gate, umstellen") behauptete:

1. **Notfall-Lookup** — las gar kein Gate (doppelt gezählt mit den Situations-Querverweisen).
2. **`ERKENNUNG_LEITFELDER`** — lebt in der Dokument-Mappe-Schicht; ihre Aufgabe ist das Gegenteil einer Existenz-Ableitung (schlägt Anlegen vor, WENN noch kein Record da ist). Umstellung wäre zirkulär (§7).
3. **`standardDokumente[].felder`** — Anzeige-Vorverknüpfung (Feld-Referenz-Liste), kein Boolescher Check; passt nicht einmal typmäßig (§7).
4. **Import-Alias** — „reines Streichen" hätte den einzigen Landeplatz für importiertes „in Vorbereitung" zerstört; wurde ein Ergänzen, kein Streichen (§5).
5. **Instrument-Wizards** — schreiben Flachfelder, legen keine Records an; „Wiedereintritt statt Sperre" ist gegenstandslos (dieser Abschnitt).

**Keiner der fünf wäre durch Suchen-und-Ersetzen sauber lösbar gewesen** — zwei hätten zirkuläre Logik bzw. einen Typfehler erzeugt, einer einen echten Datenverlust (importiertes „in Vorbereitung"), einer ein sich selbst widersprechendes Feature. Dass jeder **einzeln** gegen den Code geprüft wurde, statt der Gruppierung der Erhebung zu folgen, ist der Grund, warum Block 2 sauber dasteht und nicht als Trümmerfeld aus fünf mechanischen Läufen.

Die Ursache ist strukturell, nicht Zufall: Die erste Erhebung hat nach **mechanischer** Ähnlichkeit gruppiert (alle nennen ein Gate-Feld), nicht nach **semantischer** Rolle. Stehende Konsequenz für künftige „mechanische" Umstellungen: **jeden gelisteten Konsumenten einzeln auf seine tatsächliche Funktion prüfen, bevor umgestellt wird** — was liest er, was schreibt er, was schlägt er vor, was verknüpft er nur. Ein blindes „alle N umstellen" ist der Fehler, den diese fünf Prüfungen vermieden haben.

## 9 · Vertagt (bewusst, nach v1.0)

- **Zusammenlegung** der drei Registry-Aufzählungen (`ERKENNUNG_LEITFELDER`, `_MODUL_KARTE`, `standardDokumente[].felder`) zu *einer* gemeinsamen Liste. Nur die Zusammenlegung ist vertagt — die Ableitung ist mit Block 2 erledigt.
- Ablösung der Gates insgesamt: hängt daran, ob „in Vorbereitung" jemals ein anderes Zuhause bekommt (§3).
- **Record-anlegende Wizards** (§8, Variante B): ob und welche der Instrument-Wizards ihren Abschluss als geteilten Listen-Eintrag schreiben sollen — mit der `vvwiz`-Zwei-Schreibpfade-Frage und dem `pvwiz`-Sonderfall. Gehört in die Merklisten-/Teil-B-Ära, wo die Wizards zusammen entworfen werden.

## 10 · Nachweis-Prinzip

Jeder Konsument einzeln im Browser am Referenzdepot, mit den drei Grenzfällen (Gate `ja` ohne Record, Gate `plant`, nur Record). Der Golden-Test (amtliches PV-Dokument) blieb bei der crossRef-Umstellung **byte-identisch** — der Zusatz ist rein additiv und wird von keiner Fixture ausgeübt; keine Fixture wurde migriert.
