# U2-ADR-156: Empfängerkreise — ein Empfänger, ein Passwort, ein Zuschnitt

**Status:** Akzeptiert
**Datum:** 21.08.2026
**Kategorie:** ARCHITEKTUR, KRYPTO, DATENMODELL
**Grundlage:** Produktentscheidung vom 20.08.2026
(internes Entscheidungsdokument vom 20.08.2026); die Vorab-Messung
A414 vom 21.08.2026 (`tools/schluesseluebergabe-messen.js`); A345 (Zerfall in Feld-Einheiten),
U2-ADR-062 (Vertrauens-Zugang), U2-ADR-089 (abgeleitete Instrument-Zeilen).
- **Code-Stelle:** `vivodepot.html` — `EMPFAENGER_BAUSTEINE`, `EMPFAENGER_NIE`,
  `empfaengerBausteinTripel`, `empfaengerZuschnittModell`, `_zerfallSchreiben`,
  `ZERFALL_GEHEIM_POLSTER`, `empfaengerDateiErzeugen`, `empfaengerkreisSetzen/-Entfernen`,
  `flowEmpfaengerkreis*`, Migrationsstufe 70 → 71; `vivodepot-lesen.html` — `subBannerHTML`.
- **ADR-Bezug:** U2-ADR-062 (Vertrauens-Zugang, dessen Wortlaut hier berichtigt wird),
  U2-ADR-089 (abgeleitete Instrument-Zeilen), U2-ADR-043 (Datei-Magic-Bytes),
  U2-ADR-097 §5 (Klartext-Ausgabepfade).
- **Status heute:** gilt — beide Wege sind gebaut und belegt:
  `tests/empfaengerkreise-zuschnitt.test.js` (15 Proben, drei Mutations-Rot-Belege) für den
  Zuschnitt und die Sperre, `tests/empfaengerkreise-fach-in-der-datei.test.js` (18 Proben,
  vier Mutations-Rot-Belege) für das Fach in der Datei der Bürgerin, die Prüfung je Eintrag
  und die zwei geschlossenen Lecks. Gemessen mit `tools/faecher-in-der-datei-messen.js`.

---

## Kontext

Der Zerfall des Depot-Inhalts in einzeln verschlüsselte Feld-Einheiten (A345, 19.08.2026,
Schema 65 → 66) hat das Fundament gelegt: pseudonyme Adressen, ein eigener Inhaltsschlüssel je
Einheit, AAD-Bindung, und eine Umschlagstabelle, die mehrere Einträge tragen KANN. Sie trug
bisher genau einen — den Anker. Der Kommentar am Kern sagt es selbst: *die Fähigkeit, nicht ihr
erster Inhalt.*

Der einzige gebaute Weg, auf dem heute ein zweiter Mensch etwas öffnet, ist der
Vertrauens-Zugang (U2-ADR-062): ein zweites Passwort, ein verschlüsselter Schnappschuss von
fünf Blättern, ein Klartext-Hinweis daneben, wo das Passwort physisch liegt.

## Produktentscheidung (20.08.2026)

**Ein Kreis ist ein EMPFÄNGER, kein Anlass.** Ein Mensch oder eine Gruppe mit einem Passwort,
dauerhaft demselben. Der Einwand, der die Bauform festgelegt hat:

> „Pro Anlass ein PW? Das macht keinen Sinn, dann bräuchte Tante Renate 3 PW und die Tochter 12…"

**Die Anlässe sind der Zuschnitt, nicht das Schloss** — fertige Bausteine (Notfall, Pflege,
Bestattung, Erbe), aus denen die Bürgerin zusammenstellt. **Kein Baukasten:** eine Liste von
Menschen mit Häkchen daneben. Ausnahmen je Feld sind möglich, nicht nötig.

**Der Erbfall-Baustein ist ab Werk weit, alle übrigen sind ab Werk eng.** Bei einem lebenden
Menschen ist Zuviel der schlimmere Fehler — sie lebt, sie hätte gefragt werden können. Im
Todesfall ist Zuwenig der schlimmere, und er ist endgültig.

## Was diese ADR entscheidet

### 1 · Zwei Wege, und das Kriterium dazwischen

**NACHGETRAGEN am 21.08.2026 nach dem Anhalt zu Posten 2.** Die erste Fassung dieses Abschnitts
empfahl den zugeschnittenen Ausschnitt als den EINEN Weg. Das war zu eng, und der Widerspruch
stand im eigenen Bericht: Abschnitt 3 maß eine Rücknahme, die 260 ms kostet und die übrigen
Empfänger nicht bricht — das setzt voraus, dass alle DIESELBE Datei benutzen. Abschnitt 4 riet
dann zur eigenen Datei je Empfänger, und in diesem Modell hat eine Rücknahme gar keinen
Gegenstand: **wer seine eigene Kopie hat, bekommt ohnehin nie etwas Neues.**

**Das Kriterium, das entscheidet — nicht „geplant gegen ungeplant", sondern: welche Datei liegt
im entscheidenden Moment in der Hand?**

- **Liegt die Datei der BÜRGERIN da** — der Stick aus der Schublade, der Stick, den jemand im
  Unfall findet —, **muss das Fach IN DIESER Datei sein.** Ein Ausschnitt, den sie vor drei
  Jahren verschickt hat, hilft niemandem, der ihren Stick hält. **Notfall- und Todesfall-Kreise
  gehören darum in die Datei der Bürgerin.**
- **Hat sie bewusst etwas verschickt**, reicht die zugeschnittene eigene Datei — der Weg, den
  Abschnitt 1b beschreibt und der heute gebaut ist.

**Der Vertrauens-Zugang ist damit keine eigene Kategorie mehr:** er ist eine geplante Weitergabe,
die man hoffentlich nie braucht, und er wirkt nur, wenn er vorher eingerichtet ist. Kann die
Bürgerin im Ernstfall sprechen, nennt sie ihr Passwort und braucht ihn nicht.

### 1b · Der zugeschnittene Ausschnitt — gebaut, und für die geplante Weitergabe der richtige

Er ist gemessen, nicht gewählt (A414, 21.08.2026, `tools/schluesseluebergabe-messen.js`):

- `_zerfallLesen` (Kern) und `_zerfallLesenLeseApp` (Lese-App) nehmen `umschlagTabelle[0]`
  **unbedingt**; `depotLaden` holt das Passwort-Salz aus `umschlag.pbkdf2.salt` der obersten
  Ebene, **nicht** aus `eintrag.kdf.salt`. Das Feld `kdf` je Eintrag ist gebaut und wird nicht
  gelesen.
- An der echten `depotLaden` geprüft: die Inhaberin öffnet eine mehrfächrige Datei; **ein
  Empfänger öffnet dieselbe Datei nicht; eine auf ihn zugeschnittene öffnet er** — mit
  unverändertem Kern und unveränderter Lese-App. 15,6 kB statt 130 kB.

Der andere Weg verlangte zwei Eingriffe: den Leser über alle Einträge probieren zu lassen **und
die Gleichheitsprüfung aus A406/E-9b umzubauen** — also genau den Wächter, der den stillen
Feldverlust an einer fremden Datei hält. **Beides ist gebaut**, siehe Abschnitt 1c.

**Für den Ausschnitt-Weg schliesst er zwei Lecks mit, die eine mehrfächrige Tabelle öffnet — im
Datei-Modell entstehen sie doch, und dann sind sie zu SCHLIESSEN, nicht zu melden:** die Zahl der
Umschläge je Eintrag steht im Klartext (sie verriete den Zuschnitt jedes Empfängers und machte
den Anker erkennbar), und die Chiffrat-Länge des Geheimteils folgt der Namenslänge (gemessen:
112 Zeichen bei `name: null`, 168 bei einer Kanzlei — AES-GCM polstert nicht). Wo jede Datei
einen Eintrag trägt, entsteht das erste gar nicht; gegen das zweite steht seit heute ein
**Polster auf feste Länge** (`ZERFALL_GEHEIM_POLSTER = 512`) im geteilten Schreibweg.

### 1c · Das Fach IN der Datei — und eine Prüfung, die STRENGER ist als die alte

**Der Umbau war zu messen, bevor er gebaut wurde** (Auflage des Anhalts). Die Messung hat einen
Fund ergeben, den niemand gesucht hatte:

**Die alte Gleichheitsprüfung fing ein entferntes PAAR nicht.** Wird eine Einheit UND ihr
Umschlag entfernt, bleiben beide Zahlen gleich, die Prüfung schweigt — und das Feld ist fort. Am
echten `depotLaden` gemessen: 247 Felder vorher, 246 nachher, keine Meldung. Dieselbe Klasse wie
der stille Feldverlust vom 19.08., nur eine Ebene tiefer.

**Darum trägt der Geheimteil jedes Eintrags jetzt sein VERZEICHNIS** — die Adressen, die diesem
Fach gehören. Ein Angreifer kann es nicht mitkürzen; fehlt eine seiner Adressen, wirft der Leser.
Die Prüfung ist damit von „Datei" auf „Eintrag" umgestellt **und dabei strenger geworden**.

**Eine Datei ohne Verzeichnis** (alles vor dem 21.08.) wird weiter über den alten Vergleich
gelesen. Er ist schwächer, aber er ist das, was diese Datei hergibt — ein Bestandsdepot darf
nicht unlesbar werden, weil die Prüfung strenger wurde.

**Die zwei Lecks sind geschlossen, nicht gemeldet:**

- **Die Belegungszahl:** jeder Eintrag trägt Umschläge für ALLE Adressen; die fremden sind
  Zufallsbytes **gleicher Länge**. Welche echt sind, sagt erst der Schlüssel. Damit ist auch die
  Zuordnung verborgen, nicht nur die Zahl.
- **Die Namenslänge:** der Geheimteil wird auf eine Ziel-Länge gepolstert, die der
  GESAMTZAHL der Einheiten folgt — nicht der Länge des eigenen Verzeichnisses.

**Der Preis, gemessen:** 92 kB → 310 kB bei 301 Einheiten und sechs Fächern (Faktor 3,4). Die
Alternative — die Umschläge im Geheimteil statt im Klartext — kostet 410 kB, **verbirgt nichts
darüber hinaus** (die Adressen stehen ohnehin als Schlüssel in `einheiten`) und bräche das
Dateiformat. Sie ist erwogen und verworfen.

**Was NICHT verborgen ist und benannt gehört:** Der Anker ist als einziger Eintrag ohne
`fachSchluessel` erkennbar. Das war er auch vorher — jeder Leser beginnt unbedingt bei Platz 0.

**Der Fach-Schlüssel `K` ist Zufall, kein Passwort-Derivat.** Das Passwort des Empfängers öffnet
nur die Tür zu `K`. Der Grund ist handfest: die Bürgerin speichert täglich neu, und jeder Save
wickelt die Umschläge dieses Fachs neu — ohne `K` im Depot ginge das nur mit ihrem Passwort. `K`
liegt im verschlüsselten Depot und ist über `EMPFAENGER_NIE` von jedem Ausschnitt ausgeschlossen.
**Das Passwort selbst steht nirgends.**

**Die Kennung bleibt dem Kreis**, auch wenn ein anderer entfernt wird — sie geht in die
AAD-Bindung des Fach-Schlüssels. Wanderte sie mit der Position, bräche die Bindung nach jedem
Entfernen, und der Empfänger stünde ohne Tür da, ohne dass jemand es merkte.

### 2 · Der Umfang je Baustein ist der heutige Blattschnitt

Die vier Bausteine ziehen aus `_ANG_SITUATIONEN` — nicht aus `_ANG_CACHE_ERLAUBT`. **Die
Differenz ist gemessen und benannt:** 80 Tripel gegen 75, die Cache-Liste ist echte Teilmenge.
Die fünf zusätzlichen stehen alle auf dem Pflege-Blatt (Vor-/Nachname, Geburtsdatum,
Krankenversicherung) — genau das, was eine Heimaufnahme braucht.

**Das fünfte Blatt (`meine_menschen`) ist kein eigener Baustein:** sein einziger Eintrag steht
auf allen vier übrigen ohnehin.

### 3 · „Weit" heisst weit — und ohne den Sensibel-Filter

Der Erbfall-Baustein nimmt alle Bereichsfelder mit Wert, alle Situationsfelder, Menschen,
Institutionen, Dokumente und Mappe. **Ausdrücklich ohne den Sensibel-Filter**, der die engen
Bausteine bindet: ein als sensibel markiertes Konto ist im Erbfall genau das Feld, dessen Fehlen
niemand mehr nachfragen kann. **Die Bürgerin macht den Baustein über Ausnahmen enger, nicht über
die Markierung.** Das ist die folgenreiche Lesart der Entscheidung und steht hier, damit sie
nicht später als Nebenwirkung gelesen wird.

### 4 · Die harte Sperre

`EMPFAENGER_NIE` — was nie in einen Ausschnitt geht. **Erster Eintrag: `empfaengerkreise`
selbst.** Ohne diese Sperre trüge die Datei einer Tante die Liste aller Empfänger und damit,
wer sonst noch etwas bekommt. Dazu der fremde Vertrauens-Zugang, die verwalteten Sub-Depots,
das Übergabe-Protokoll, die Anfragen und Zusammenstellungen — und die vier Ganz-Objekt-Register
(`urheberschaft`, `feldGueltigkeit`, `sensibelFelder`, die Verwaisungs-Slots), deren SCHLÜSSEL
die Namen der Felder verrieten, die der Empfänger gerade nicht bekommen hat.

**Der Preis ist benannt und nicht klein:** kein Herkunfts-Stempel, kein Gültigkeitsdatum auf dem
Ausschnitt.

### 5 · Das Passwort wird nie gespeichert

Es entsteht beim Erzeugen der Datei und ist danach fort. Im Depot steht nur, **wann** zuletzt
eine Datei entstand und **wieviele** Angaben darin lagen.

### 6 · Die Anwendung verspricht keine Rücknahme

Gemessen (A414): eine frühere Sicherung öffnet die alten Fächer weiterhin — der
Zurückgenommene liest aus seiner eigenen Kopie 50 von 50 Feldern im Klartext; dasselbe gilt für
das alte Vertrauens-Passwort nach einem Wechsel. **„Zurücknehmen" ist ein Wort, das eine
Anwendung ohne Server nicht halten kann.**

Der Entfernen-Dialog sagt darum: *„Der Eintrag wird gelöscht, und dieser Mensch bekommt von
Ihnen keine neue Datei mehr. Achtung: Die Datei, die er bereits hat, kann er mit seinem Passwort
weiter öffnen — das lässt sich nicht rückgängig machen."*

**Zwei bestehende Sätze behaupteten das Gegenteil** (`strings:vpAktualisierenText.text`,
`strings:vpEntfernenText.text`) und sind mit derselben Änderung berichtigt.

### 7 · Der Ausschnitt sagt selbst, dass er einer ist

`data.empfaengerAusschnitt` reist im verschlüsselten Teil mit; die Lese-App zeigt daraus ihren
ersten Satz. Ohne diese Marke sähe die Datei aus wie ein sehr leeres Depot, und der Empfänger
hielte für „alles, was sie hat", was in Wahrheit sein Ausschnitt ist.

## Folgen

- **Schema 70 → 71:** `data.empfaengerkreise[]`, rein additiv.
- Der v4-Schreibweg ist **eine** Funktion (`_zerfallSchreiben`); Depot und Ausschnitt gehen
  hindurch. Der Ausschnitt bekommt eigene Salze und eine eigene `depotUUID` — die Sitzung der
  Inhaberin wird nicht angefasst.
- Der Ausschnitt ist eine **reguläre v4-Datei**: er öffnet sich in der Lese-App und in der App
  selbst, ohne dass eine Zeile Lesepfad geändert wurde.
- `data.angehoerigenCache` bleibt **unangetastet** — das ist F5 und nicht entschieden.

## Was offen ist und in dieser ADR nicht steht

- **Der Wortlaut beim Entfernen.** Im Datei-Modell heisst „Empfänger entfernen" etwas anderes als
  im Ausschnitt-Modell; **beide sind jetzt gebaut, und es stehen zwei getrennte Sätze im Code** —
  beide als VORLÄUFIG gekennzeichnet. Der Wortlaut ist eine Produktentscheidung und ist NICHT
  entschieden.
- **Die Grenze der Körnung im Datei-Modell.** Ein Fach schaltet ganze EINHEITEN frei. Für
  Bereichsfelder ist die Einheit das Feld — genau richtig. Für oberste Schlüssel
  (`situationen`, `menschen`, `dokumente`) ist sie das ganze Objekt: wer sie bekommt, bekommt
  sie ganz. Die engen Bausteine brauchen davon nur `menschen`, was dem heutigen Blattschnitt
  entspricht; der weite Erbfall-Baustein bekommt sie ohnehin. **Für einen künftigen Baustein,
  der nur EINE Situation freigeben soll, reicht die Körnung nicht.**

## Was NICHT entschieden ist

- **Was mit dem alten Angehörigen-Cache geschieht**, wenn Empfängerkreise da sind (F5).
- **Ob der Ausschnitt beim Empfänger read-only sein soll.** Er kann ihn heute wie ein eigenes
  Depot öffnen und bearbeiten — seine Kopie, seine Sache; aber die Frage ist gestellt, nicht
  beantwortet.
- **Ob die Bausteine je eine eigene Liste bekommen**, wie der Cache sie seit A383 hat. Heute
  ziehen sie aus dem Blatt. Wächst ein Blatt, wächst der Baustein mit — das ist bewusst so,
  aber es ist dieselbe Kopplung, die A383 an anderer Stelle gelöst hat.

---

*Vivodepot GmbH · 21.08.2026*
