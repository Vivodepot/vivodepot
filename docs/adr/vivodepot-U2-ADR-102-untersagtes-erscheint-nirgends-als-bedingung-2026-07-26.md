# U2-ADR-102: Was untersagt ist, erscheint auf keinem Anzeige- oder Ausgabepfad als Bedingung

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-100 §6 (Parität heißt gleiche Information, nicht gleiche Mechanik) ·
U2-ADR-097 (produkttragende Zusicherungen) · U2-ADR-098 (Klausel-Format) ·
U2-ADR-099 (Prüfstand)
**Anker:** Gerätetest v76, Fund B3 · Daten-Hygiene-Messung 26.07.2026
**Status heute:** gilt — Beleg `tests/untersagtes-nirgends-bedingung.test.js`, `tests/wizard-untersagung-ueberspringt.test.js`, `tests/adr-102-import-bereinigen.test.js`, `tests/hinweis-felder-tragen-keinen-wert.test.js`.

---

## Kontext

Die KI-Verfügung kennt eine Grundentscheidung: untersagen oder erlauben. Alle
weiteren Angaben sind **Bedingungen einer Erlaubnis** — sie gelten nur, wenn
erlaubt wurde.

Gemessen am 26.07. behandeln vier Ebenen dieselben zwölf Felder verschieden
streng:

| Ebene | Verhalten bei `ki_grundentscheidung = untersagung` |
|---|---|
| Wizard | fragt alle 12 Schritte, mit dem Hilfetext „Nur relevant, wenn Sie oben eine Nachbildung erlaubt haben" |
| Sektor-Formular | zeigt alle 11 Folgefelder (Gate nur auf `typ`) |
| Dokument-Generator | blendet sie aus — 13 Blöcke auf `'erlaubnis'` gegatet |
| Lese-App | zeigt sie alle |

Was die **Vertrauensperson** in der Lese-App liest:

> Verfügung zur digitalen Nachbildung · **Ich untersage jede KI-gestützte Nachbildung
> meiner Person nach meinem Tod.** · trauer · ausschließlich namentlich benannte
> Personen · nur privater Raum · … · Löschung nach zehn Jahren · …

Die Untersagung, und direkt dahinter die Bedingungen, unter denen es erlaubt
wäre. Diese Sicht wird im Ernstfall gelesen — Krankenhaus, Nachlass,
Pflegeentscheidung — von Menschen, die nicht mehr nachfragen können.

**Die Uneinheitlichkeit ist nicht der eigentliche Fehler.** Der eigentliche
Fehler ist, dass es **kein festgeschriebenes Kriterium** gab, an dem eine neue
Ausgabe-Ebene sich hätte ausrichten können. Jede Ebene hat für sich entschieden.
Eine fünfte hätte wieder für sich entschieden.

---

## Entscheidung

### 1 — Das Kriterium

> **Was untersagt ist, erscheint auf keinem Anzeige- oder Ausgabepfad als
> Bedingung. Bearbeitungspfade sind ausgenommen und tragen eine eigene
> Behandlung.**

Der zweite Satz gehört **in** das Kriterium, nicht in eine Fußnote. Eine erste
Fassung formulierte den ersten Satz absolut und nahm das Sektor-Formular
darunter als offene Entscheidung wieder heraus — damit trug die Entscheidung
einen Widerspruch zu sich selbst.

**Anzeige- und Ausgabepfade** — jeder Weg, der Bürgerdaten jemandem **vorlegt**:
Lese-App, erzeugte Dokumente, Notfallblatt, PDF- und Druckausgaben, künftige
Ausgabewege. Hier gilt der Satz ohne Ausnahme.

**Bearbeitungspfade** — Flächen, auf denen dieselbe Person ihre Angaben
**ändert**. Dort ist Verbergen die gefährlichere Wahl: Ein Feld, das einen Wert
trägt und nicht angezeigt wird, kann nicht korrigiert werden, und die Bürgerin
erfährt nicht, dass es ihn noch gibt. Die richtige Behandlung ist dort nicht
Verbergen, sondern **Kennzeichnen** — der Wert bleibt sichtbar und wird als
gegenstandslos ausgewiesen. Wie das aussieht, ist eine eigene Entscheidung; dass
es nicht Verbergen ist, ist hier entschieden.

**Der Wizard ist kein Bearbeitungspfad in diesem Sinne**, obwohl er Eingaben
entgegennimmt: Er *stellt Fragen*, deren Antworten es noch nicht gibt. Eine
Frage, die durch eine Untersagung gegenstandslos ist, verbirgt keinen Wert — sie
unterbleibt. Deshalb fällt er unter den ersten Satz.

Nicht für den Datensatz selbst — siehe §4.

### 2 — Der Gate ist NEGATIV, nicht positiv

Unterdrückt wird, wenn der Datensatz **aktiv widerspricht** — nicht, solange
eine Erlaubnis fehlt.

```
verborgenWenn: { feld: 'ki_grundentscheidung', wert: 'untersagung' }
```

**nicht** `sichtbarWenn: { … wert: 'erlaubnis' }`.

Der Unterschied ist tragend und keine Geschmacksfrage. U2-ADR-100 §6 hat
entschieden, dass die Lese-App **alle gefüllten Felder zeigt**, weil ein
Positivfilter dort sechzehn von dreiundzwanzig Unterfeldern unsichtbar machte —
darunter Ablageort und ZVR-Nummer. Ein Positiv-Gate würde genau diesen Fehler
wiederholen: Felder verschwänden, sobald die Grundentscheidung **fehlt**, also
aus Mangel an Information. Das Negativ-Gate unterdrückt ausschließlich, was der
Datensatz selbst zurückgenommen hat.

*Gemessen, nicht abgewogen: die Zusicherung `[ZusVoll] JEDES deklarierte
Unterfeld erscheint, wenn es gefuellt ist` speist Zeilen mit genau einem
gesetzten Feld ein, ohne Grundentscheidung. Ein Positiv-Gate hätte sie rot
gemacht — die beiden Entscheidungen hätten einander widersprochen, und der
Widerspruch wäre erst im Testlauf sichtbar geworden.*

### 3 — Der Generator behält sein Positiv-Gate, mit Grund

Der Dokument-Generator gated weiter auf `'erlaubnis'`. Das ist **kein Rückfall
in die Uneinheitlichkeit**, sondern ein anderer Gegenstand: Er erzeugt eine
Urkunde. Ohne getroffene Grundentscheidung gibt es keine gültige Verfügung, also
auch keine Bedingungen, die hineingehörten. Eine Anzeige zeigt, was da ist; eine
Urkunde behauptet, was gilt.

Sichtbare Folge, damit sie niemanden überrascht: Ist die Grundentscheidung
**leer** und sind Bedingungen gefüllt, zeigt die Lese-App sie und das Dokument
nicht. Das ist gewollt.

### 4 — Anzeige-Gating macht den Datensatz nicht widerspruchsfrei

Die `ki_*`-Werte **bleiben in der Datei**. Das ist richtig: kein Datenverlust an
einem Gate, das nachträglich anzieht — gemessen 26.07., 11 von 11 Feldern
bleiben erhalten.

**Die Grenze, ausdrücklich:** Ein Dritter, der den Record importiert oder roh
liest — nicht über einen Vivodepot-Anzeigepfad —, sieht Untersagung und
Bedingungen nebeneinander. Für den Vivodepot-Lesepfad ist das gelöst, für einen
importierenden Dritten **nicht**. Das ist ein eigener Vorgang (Backlog), keine
stillschweigende Lücke dieser Entscheidung.

### 5 — Das Kriterium gilt allgemein, die Deklarationen stehen je gemessenem Fall

Der Mechanismus (`verborgenWenn`) ist feldunabhängig. Deklariert wird er dort,
wo eine Untersagung gemessen ist — heute die elf `ki_*`-Folgefelder. Eine
künftige Untersagung anderer Art erbt das Kriterium, nicht die Deklaration.

---

## Konformität

```konformitaet
aussage:  Steht in einer Instrument-Zeile eine Untersagung, zeigt die Lese-App
          keine ihrer Bedingungen — und zwar NUR dann; fehlt die
          Grundentscheidung, bleibt alles sichtbar (U2-ADR-100 §6 unangetastet).
zustand:  geprüft
herkunft: invariante
pruefung: tests/untersagtes-nirgends-bedingung.test.js#u2-102-lese-app-zeigt-keine-bedingung-bei-untersagung
```

```konformitaet
aussage:  Der Wizard stellt keine Frage, deren Antwort durch eine Untersagung
          bereits gegenstandslos ist; der Schrittzähler nennt nur die Schritte,
          die auch gestellt werden. Ohne Grundentscheidung wird weiterhin alles
          gefragt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wizard-untersagung-ueberspringt.test.js#u2-102-wizard-stellt-keine-gegenstandslose-frage
```

---

### Nachtrag 26.07.2026, dritter Teil — die Kennzeichnungs-Frage ist ZURÜCKGEZOGEN

**Nicht beantwortet — zurückgezogen.** Das steht hier ausdrücklich, damit niemand
in einem Jahr nach der Antwort auf eine Frage sucht, die es nicht mehr gibt.

Der Grund: Kennzeichnen hilft nur dem, der das **Bearbeitungsformular öffnet**.
Die Vertrauensperson im Ernstfall öffnet es nie, der DOCX-Export nicht, ein
importierender Dritter auch nicht. Bei den gemessenen zwanzig verwaisten Feldern
(Triage 26.07.) hieße Kennzeichnen: an jeder Oberfläche einzeln — und der
Datensatz bliebe überall falsch.

**Der Ort ist der Wechselmoment, nicht die Anzeige danach.** Wechselt `typ` von
Vorsorgevollmacht auf Testament, weiß die Bürgerin *in diesem Augenblick*, was
mit „Generalvollmacht" geschehen soll; drei Wochen später weiß sie es nicht mehr.
Eine getroffene Wahl ist kein Datenverlust. Und sie heilt den Record **einmal**
statt fünf Ausgabepfade nachzuziehen.

**Das Fenster:** U2-ADR-100 §8 — bis zum RC liegen keine Depots in fremder Hand.
Vor dem RC gebaut braucht der Handler **keine Migration**; danach bräuchte er eine.

**Damit entfällt auch die Kennzeichnung im Sektor-Formular.** Eine Entscheidung,
zwei Anwendungen — nicht zwei Entscheidungen.

```konformitaet
aussage:  Trägt eine importierte Instrument-Zeile Angaben, die zur gewählten Art nicht
          passen, wird das benannt angezeigt UND eine Bereinigung angeboten — nicht
          abgewiesen, nicht stillschweigend übernommen. Ohne aktives Häkchen bleibt die
          Zeile exakt, wie sie ankam; kein stilles Löschen, kein stilles Bereinigen.
zustand:  geprüft
herkunft: Nachtrag 04.08.2026 (Produktentscheidung, dritter von vier vorgelegten Wegen)
pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·1] eine inkonsistente Zeile wird erkannt, mit Schlüssel und Text
pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·3] importZeileBereinigt entfernt GENAU die angekündigten Felder, sonst nichts
pruefung: tests/adr-102-import-bereinigen.test.js#[U2-102·4] importAnwenden OHNE bereinigen-Auswahl lässt jede Zeile exakt, wie sie ankam
```

**Nachtrag 03.09.2026 (U2-ADR-226).** Der bisherige Kurz-Anker „U2-102" allein passte mehrdeutig
auf elf Testtitel dieser Datei — der ADR-Konformitäts-Wächter prüfte bis dahin nur die erste
`pruefung:`-Zeile je Block und konnte das nicht sehen. Auf die drei Testtitel aufgelöst, die die
drei Teilaussagen oben tatsächlich tragen (erkannt+benannt · Bereinigung entfernt GENAU die
Felder · ohne Häkchen bleibt die Zeile exakt) — die übrigen acht Treffer (Nebenfälle wie
„unbekannte Art" und die `importSichtbarkeitsHinweise`-Familie) gehören zu anderen, nicht hier
behaupteten Aussagen dieser ADR-Datei, nicht zu dieser.

Erwogen und bewusst NICHT aufgenommen: die `·2`-Gruppe („eine konsistente Zeile erzeugt KEINEN
Fund" u. a.), die Spezifität prüft — dass NUR die wirklich inkonsistente Zeile einen Fund
auslöst. Sie ist ein reales, nahes Verhalten derselben Funktion, aber keine der drei Teilaussagen
oben behauptet sie ausdrücklich („wird das benannt angezeigt" sagt, DASS erkannt wird, nicht
DASS Konsistentes verschont bleibt). Wer später fragt, warum drei Titel und nicht fünf: das ist
der Grund.


**Nachtrag 04.08.2026 — gebaut, Frist entfällt.** Die gemessene Grenze unten bleibt als
Befund stehen (sie war der Anlass), ist aber kein offener Punkt mehr. Produktentscheidung:
weder abweisen noch stillschweigend übernehmen — die App sagt, was nicht zusammenpasst, und
bietet die Bereinigung als Handlung an (ADR-033: was geschieht, nicht was die Nutzerin tun
sollte). `importVerwaisteEintraege(plan)` (`vivodepot.html`) erkennt betroffene Zeilen,
`flowImportVorschau` zeigt sie mit einem Häkchen je Zeile, `importAnwenden(plan, {
bereinigen })` bereinigt ausschließlich die aktiv gewählten — die bestehende
Verwaisungsregel (U2-ADR-111, „es wird nichts normalisiert") bleibt für den Default
(kein Häkchen) unverändert in Kraft, elf Proben in
`tests/adr-102-import-bereinigen.test.js` decken Erkennung, Positiv-/Negativkontrolle,
Bereinigung und Ablehnen.

### Die gemessene Grenze — der Import erreicht den Handler nicht

Read-only gemessen am 26.07. gegen `d9a88f4`, mit Positivkontrolle:

| Frage | Ergebnis |
|---|---|
| Einhak-Punkt des Handlers | `listenEintragAktualisieren` — 3 Fundstellen (Definition + 2 Aufrufer) |
| Weg des Imports | `listenEintragHinzufuegen` (`:10734`, `:10738`) — **nicht** über den Einhak-Punkt |
| Kann eine inkonsistente Zeile ankommen? | **ja** — `{ typ: 'testament', art: 'general' }` landet unverändert im Depot |
| Positivkontrolle | eine konsistente Zeile kommt ebenso an (die Messung lebt) |

Der `_ausGate`-Alias baut typ-konsistent (`{ typ: def.typ, … }` aus einer
Feld-Tabelle je Typ) und **erzeugt** die Inkonsistenz nicht. Er **trägt sie
herein**: eine echte Instrument-Liste aus einem fremden Depot wird ohne
Deduplizierung angehängt, mitsamt jeder Verwaisung, die dort schon stand.

**Und die Wechselmoment-Frage passt auf den Import gar nicht.** Eine neu
hinzugefügte Zeile hat kein „Vorher" — es gibt nichts zu fragen („du hast X
geändert, was soll mit Y geschehen?" — nichts wurde geändert). Der Import
braucht eine **eigene** Antwort: abweisen, bereinigen, in der Import-Vorschau
zeigen (`flowImportVorschau` existiert), oder bewusst annehmen. Das ist eine
Entscheidung, keine Messung.

```konformitaet
aussage:  Kein Feld, dessen id auf `_hinweis` endet, trägt einen werttragenden Typ —
          in BEIDEN Apps. Ein Bezeichner, der etwas anderes verspricht als der Typ
          hält, wird bei jeder späteren Sichtung falsch einsortiert.
zustand:  geprüft
herkunft: invariante
pruefung: tests/hinweis-felder-tragen-keinen-wert.test.js#u2-102-hinweis-felder-tragen-keinen-wert
```

*Eine geführte Ausnahme: `erbfolge_hinweis` (Typ `auswahl`). Der Rename zieht nach
U2-ADR-100 §8 Alt-Label-Register und B16-Import-Alias nach — eigener Vorgang. Die
Ausnahme steht benannt, datiert und begründet IM Wächter, mit mit-assertierter
Anzahl; sie kann nicht still wachsen. Bewusst NICHT in `_bekannte-fehlschlaege.js`:
diese Liste ist leer („Ziel: leere Liste = Umbau fertig") und trägt die Regel „nie
ergänzt, um einen neuen Fehler ruhigzustellen".*

## Offen, benannt

**Das Sektor-Formular** ist nach §1 ein Bearbeitungspfad und wird **nicht**
gegatet — das ist entschieden. Die Frage nach der *Form der Kennzeichnung* dort
ist mit dem Nachtrag oben **zurückgezogen**, nicht offen.

**Die 34 toten `sichtbarWenn`-Deklarationen der Lese-App.** Gemessen am 26.07.:
Die Lese-App trägt 34 `sichtbarWenn`-Deklarationen und hatte **nie** einen
Auswerter dafür; der mit dieser Entscheidung gebaute `feldVerborgen` liest
ausschließlich `verborgenWenn` und lässt sie unberührt. **Es ist also nichts
still verborgen worden** — kein Rückschritt im Notfall-Lesepfad.

Harmlos sind sie deswegen nicht: **26 der 34** beschreiben Widersprüche, die
durch normales Bearbeiten erreichbar sind (`typ` ist ein änderbares Auswahlfeld
ohne Aufräumpfad; wer eine Vorsorgevollmacht anlegt, `art` füllt und den Typ auf
`testament` umstellt, sieht in der Lese-App weiter den Vollmacht-Wert).

**Sie werden trotzdem nicht scharfgeschaltet**, und der Grund ist gemessen: eine
positive Auswertung verbärge auf einer Zeile ohne `typ` — Altdaten,
Migrationslücke — **25 von 34** Unterfeldern. Das ist U2-ADR-100 §6 noch einmal
(dort 16 von 23), diesmal im Notfall-Lesepfad. Ein Positiv-Gate bleibt ein
Positiv-Gate, auch wenn es „aufräumen" heißt.

**Und die Negativ-Form ist für sie ebenfalls nicht die Antwort.** Eine erste
Fassung dieses Abschnitts schrieb, der Widerspruchs-Fall bekomme
`verborgenWenn`. Das ist die andere Hälfte desselben Fehlers: `ki_befristung_jahre`
steht mit „zehn" im Record, auch nachdem die Frist auf „bis zum Tod der letzten
berechtigten Person" umgestellt wurde. Verbirgt die Lese-App das, ist der
Widerspruch **vom Bildschirm weg und weiter in der Datei** — genau der Handel,
den §4 für importierende Dritte schon als offene Lücke führt. **Diese 26 sind
kein Anzeigeproblem, sie sind verwaiste Daten.**

Der Weg ist deshalb ein anderer, und er hat drei Ausgänge:

1. **Deklaration zeigt aufs falsche Feld** → Zuordnungsfehler. Deklaration
   korrigieren, fertig. Kein Gate nötig.
2. **Feld gehört strukturell zu einem anderen Instrument-Typ** → Zuordnung. Ein
   gefüllter Wert ist eine Altlast; ihn zu **zeigen** ist vertretbar (er
   existiert), ihn zu verbergen wäre die 25-von-34-Falle.
3. **Feld ist wirklich verwaist, weil `typ` oder ein Vorfeld geändert wurde** →
   die Antwort gehört in den **Bearbeitungspfad**, nach §1: beim Umstellen
   **kennzeichnen oder aufräumen**. Nur verbergen wäre dort zu wenig — es nähme
   die Anzeige weg und ließe den Widerspruch im Datensatz stehen.

Fall 3 ist damit **kein Anzeige-Vorgang**, sondern derselbe offene Punkt wie die
Kennzeichnungs-Form für das Sektor-Formular. Beide hängen an derselben
Entscheidung.

**Gerätetest:** Das `typ`-Umstell-Szenario gehört in die nächste gebündelte
Runde. Es ist durch normales Bearbeiten erreichbar, und die betroffene Seite ist
der **Notfall-Lesepfad** — die Vertrauensperson liest im Ernstfall einen Wert,
den die Bürgerin für überschrieben hielt.

---

*Vivodepot GmbH · Berlin · 26.07.2026*
