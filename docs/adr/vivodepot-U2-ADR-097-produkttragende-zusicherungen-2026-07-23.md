# U2-ADR-097: Die produkttragenden Zusicherungen

**Status:** Angenommen
**Datum:** 23.07.2026
**Kategorie:** ARCHITEKTUR-PRINZIP, PRODUKT, GESCHÄFTSMODELL
**U2-Bezug:** U2-ADR-015 (D43-Zwei-Ebenen-Persistenz) · U2-ADR-044 (SHL nicht in v1) ·
U2-ADR-047 (SHL-Knopf) · U2-ADR-050 (Migrations-Verwaisung) · U2-ADR-066 (CSP `connect-src 'none'`)
**Status heute:** gilt — Beleg `tests/b16-113-klartext-ausgabepfade.test.js`, `tests/testmode-bleibt-draussen.test.js`, `tests/ui-marke-zusicherungen.test.js`, `tests/sonderfall-verbote.test.js`, `tests/netz-verbote.test.js`, `tests/allowlist-verbote.test.js`, `tests/konformitaet/offline-garantie.mjs`.

---

## Kontext

Der Verbots-Durchgang über beide ADR-Linien (Tranche 9, 23.07.2026) hat gezeigt: Von den
Zusicherungen, die das Produktversprechen tragen, hat ein Teil keine dokumentierte
Entscheidungsgrundlage. „Kein Konto" und „keine Bürger-Zahlung" sind in keiner der beiden Linien
als Beschluss auffindbar — sie gelten, seit es Vivodepot gibt, aber sie wurden nie entschieden.

Das ist die gefährlichere Sorte Lücke. Eine Entscheidung, die formal nicht existiert, kann formal
nicht verletzt werden. Es gibt nichts, woran eine Prüfung ansetzen könnte, und nichts, was ein
späterer Bau überschreiten würde.

Dieses ADR schließt die Lücke, indem es die tragenden Zusicherungen an einer Stelle beschließt. Es
formuliert **keine** Konformitätsklauseln — deren Format ist noch nicht entschieden. Es benennt pro
Zusicherung, was eine Prüfung messen müsste, damit das Format-ADR an echtem Material entworfen
werden kann.

Sieben der zehn Zusicherungen sind bereits als `tools/zusicherungen-pruefen.js` gebaut und laufen
(`npm run zusicherungen:pruefen`) — dieses ADR ist der nachgezogene, formale Beleg dafür, dass der
Scanner auf eine tatsächlich existierende Entscheidung zeigt, nicht auf eine Lücke.

---

## Entscheidung

Die folgenden Zusicherungen gelten für Vivodepot. Sie sind Grenzen, keine Ziele: Ihre Verletzung
ist kein Qualitätsmangel, sondern ein Bruch der Produktaussage.

### 1 — Kein Server für die Anwendung

**Wortlaut:** Die Anwendung benötigt zu ihrer Funktion keinen Server. Öffnen, Erfassen,
Verschlüsseln, Speichern, Lesen, Exportieren und Importieren laufen vollständig auf dem Gerät.

**Prüfung müsste messen:** Kein Netzwerkaufruf im ausgelieferten Bündel auf den funktionalen
Pfaden; CSP `connect-src 'none'` als Ausgangszustand (U2-ADR-066).

**Bekannte Eigenschaft des Bündels, die die Zusicherung nicht bricht:** Die vendorten
PDF-Bibliotheken (jsPDF/html2pdf) enthalten `XMLHttpRequest`-Code. Er wird auf keinem Pfad
aufgerufen, aber er steht im ausgelieferten Bündel und ist mit einer Textsuche auffindbar. Wer die
Zusicherung liest und den Quelltext durchsucht, findet ihn — deshalb steht er hier und nicht nur in
der Erlaubnisliste des Scanners. Die Abgrenzung erfolgt über die vorhandenen `@vd-lib`-SBOM-Marker.

**Vorgesehene Ausnahme — bewusst, eng, gilt nur für eine Variante, noch nicht gebaut:** Die
gehostete PWA-Variante soll einen vom Nutzer bewusst ausgelösten Versions-Check gegen einen
signierten Endpunkt (Codeberg) (Ziel-Host korrigiert, s. Nachtrag 01.08.2026) tragen, für den die CSP chirurgisch geöffnet wird. Die
Datei-Variante (`file://`) bekommt diesen Check ausdrücklich nicht.

**Stand 23.07.2026: im Code nicht vorhanden.** Die Erhebung zum Zusicherungs-Scanner hat keinen
Codeberg-Aufruf gefunden — der Versions-Check ist Zielzustand aus dem Master-Briefing, nicht
Ist-Zustand. Er wird deshalb **nicht** vorab in eine Erlaubnisliste geschrieben. Wenn er gebaut
wird, wird die Ausnahme mit ihm zusammen eingetragen, nicht vorher.

*Diese Ausnahme ist der Grund, warum dieses ADR nicht „kein Netzwerkaufruf" als Zusicherung führt.
Der Satz wäre spätestens dann falsch.*

### 2 — Keine Cloud

**Wortlaut:** Bürgerdaten verlassen das Gerät nicht. Es gibt kein Cloud-Backup, keine
Synchronisierung und keine Übertragung an Dritte. Die `.vivodepot`-Datei ist die Wahrheit und liegt
ausschließlich beim Bürger.

**Was dazugehört und keine Ausnahme ist:** Die D43-Zwei-Ebenen-Persistenz (U2-ADR-015) — Ebene 1
ist eine verschlüsselte Arbeitskopie in IndexedDB auf demselben Gerät, Ebene 2 die Datei. Die
Arbeitskopie verlässt das Gerät nicht und ist beschlossene Architektur, nicht ihre Verletzung.

**Prüfung müsste messen:** Kein Upload-, Sync- oder Übertragungspfad für Bürgerdaten. Dazu die
statisch prüfbare D43-Invariante **Lese-App null Storage**. Der Service-Worker-Cache der
PWA-Variante trägt Auslieferung, keine Bürgerdaten — diese Abgrenzung ist Teil der Prüfung.

**Verhältnis zu 1:** Verwandt, nicht deckungsgleich. Nr. 1 betrifft die Lauffähigkeit, Nr. 2 den
Verbleib der Daten. Ein Server ohne Datenablage verletzt 1, nicht 2; eine Synchronisierung zwischen
zwei Geräten verletzte 2, nicht zwingend 1.

*Frühere Fassung dieses Entwurfs formulierte „keine Ablage außerhalb der Depot-Datei". Das
widersprach D43 und hätte die erste Prüfung gegen eine beschlossene Architektur rot laufen lassen.
Korrigiert am 23.07.2026 nach der Stufe-1-Erhebung.*

### 3 — Kein Konto

**Wortlaut:** Vivodepot kennt keine Anmeldung, keine Registrierung und keine Identität, die über
die Depot-Datei hinausgeht. Der Zugang besteht aus dem Besitz der Datei und der Kenntnis des
Passworts, aus nichts sonst.

**Prüfung müsste messen:** Kein Authentifizierungspfad, kein Nutzer-Identifikator im Depot-Format
außerhalb der vom Bürger erfassten Daten, kein Wiederherstellungspfad, der eine dritte Stelle
einbezieht.

*Dies ist die Zusicherung mit der bisher größten Lücke zwischen Geltung und Verschriftlichung. Sie
hat Konsequenzen an jeder Stelle, an der ein Anmelde-, Synchronisierungs- oder
Wiederherstellungsweg entstehen könnte.*

**Abgeleitet und mitgeltend:** Die optionale E-Mail-Abfrage für Sicherheits- und
Funktionsbenachrichtigungen begründet kein Konto. Sie ist freiwillig, getrennt einwilligbar und
ohne Bezug zum Depot.

### 4 — Keine Bürger-Zahlung

**Wortlaut:** Bürgerinnen und Bürger zahlen für Vivodepot nichts — weder einmalig noch
wiederkehrend, weder für die Anwendung noch für Vorlagen, Funktionen oder Weitergabe. Erlöse
kommen ausschließlich von Institutionen.

**Prüfung müsste messen:** Im Code nur die Abwesenheit eines Zahlungs-, Lizenz- oder
Freischaltungspfads. Die Zusage für die Zukunft ist im Code nicht messbar.

**Einstufung:** Nach dem Klausel-Papier `nicht prüfbar`, mit Begründung. Der tragende Beleg ist das
operative Geschäftsmodell, nicht der Quelltext. Eine Klausel, die mehr behauptet, misst nicht, was
sie zu messen vorgibt.

### 5 — Kein Klartext außerhalb der erlaubten Ausschnitte

**Wortlaut:** Bürgerdaten verlassen die Verschlüsselung nur über ausdrücklich freigegebene
Ausgabepfade und nur in dem dort festgelegten Umfang.

**Prüfung müsste messen:** Für jeden unverschlüsselten Ausgabepfad, dass er kein Feld außerhalb
seiner Erlaubnisliste enthält. Entspricht Invariante 6 der Prüf-Architektur; die PDF-QR- und
Bereich-QR-Sofortmaßnahmen sind die Belegfälle.

### 6 — Kein selbst ausgestelltes Bildungs-Credential

**Wortlaut:** Vivodepot stellt keine Bildungsnachweise aus. Bildung ist Import-only.

**Prüfung müsste messen:** Kein Ausstellungspfad, der ein Credential vom Typ Bildung erzeugt oder
signiert.

### 7 — Kein SHL-Hosting-Endpunkt

**Wortlaut:** Vivodepot betreibt keinen Endpunkt, unter dem geteilte Inhalte abrufbar wären. SHL
ist Import-only.

**Prüfung müsste messen:** Kein Upload- oder Hosting-Pfad; keine erzeugte URL, die auf eine von
Vivodepot betriebene Stelle zeigt.

**Bekannter Ist-Soll-Konflikt, ungelöst:** U2-ADR-044 führt SHL als „nicht in v1", während der
Knopf aus U2-ADR-047 ungeflaggt im ausgelieferten Code sichtbar ist. Der Konflikt betrifft nicht
das Hosting-Verbot selbst, wohl aber die Frage, was in v1 überhaupt vorhanden ist. **Zu entscheiden
vor RC** — Flag setzen oder U2-ADR-044 nachziehen. Dieses ADR beschließt den Konflikt nicht mit, es
hält ihn fest.

### 8 — Keine inhaltliche Zertifizierung

**Wortlaut:** Vivodepot zertifiziert die Authentizität eines Ausstellers, niemals die inhaltliche
Richtigkeit dessen, was er ausstellt. Die Zertifizierungs-Doktrin ist sektoragnostisch.

**Prüfung müsste messen:** Kein Ausgabe- oder Anzeigepfad, der eine inhaltliche
Gültigkeitsaussage über importierte Daten trifft; jede Vertrauensanzeige bezieht sich auf den
Aussteller, nicht auf den Inhalt.

---

### 9 — Bürgerdaten werden nie durch Migration gelöscht

**Wortlaut:** Kein Schema-Übergang und keine Migration entfernt vom Bürger erfasste Daten. Felder,
die ihre Zuordnung verlieren, verwaisen sichtbar, statt zu verschwinden.

**Prüfung müsste messen:** Migrations-Kette über alle älteren Schemata bis zum heutigen — jeder
erfasste Wert ist danach noch auffindbar. Entspricht Invariante 4 der Prüf-Architektur.

**Herkunft:** Verwaisungs-Regel aus U2-ADR-050. Diese Zusicherung tut bereits Arbeit, ohne bisher
als solche geführt zu werden — sie ist der Maßstab, an dem B16-ADR-054 (aggressives Löschen alter
Felder) heute formal verletzt wird. Der dort fällige Korrektur-Vermerk verweist auf dieses ADR.

### 10 — Keine App-Store-Pflicht

**Wortlaut:** Der Weg zur Anwendung führt nie zwingend über einen Plattformbetreiber. Eine
heruntergeladene Datei genügt; Installation, Konto beim Betriebssystemhersteller oder Freigabe
durch einen Store sind keine Voraussetzung.

**Prüfung müsste messen:** Die ausgelieferte Datei ist aus dem Dateisystem heraus (`file://`) voll
funktionsfähig — alle Kernpfade laufen ohne Installation, ohne Service Worker und ohne Herkunft
aus einem Store.

**Verhältnis zu 1 und 2:** Nr. 10 ist die Zugangsseite dessen, was 1 und 2 für Betrieb und
Datenverbleib zusichern. Sie trägt die Niedrigschwelligkeit: der Stick aus der Schublade muss
reichen.

### 11 — Kein Testmode im Produktivpfad

**Wortlaut:** Kein Test-, Demo- oder Debug-Schalter im Produktivpfad umgeht echte Kryptographie oder
Speicherung oder überspringt eine Prüfung. Entwickler-Affordancen (etwa die `?dev=1`-Sichtumschaltung)
dürfen ausschließlich die Darstellung wechseln, nie den Sicherheits- oder Speicherpfad.

**Prüfung müsste messen:** (a) Kein Schlüssel- oder Header-Präfix führt vor `crypto.subtle.verify` zu
einem Frühausstieg, der eine Signatur ungeprüft als gültig behandelt (einschließlich eines
`TEST_KEY_`-Sentinels). (b) Kein Schalter im Produktivpfad ruft einen Krypto- oder Speicher-umgehenden
Pfad; die `?dev=1`-Affordance schaltet nur die Sicht (`Modus._setzeIntern`).

**Herkunft:** B16-082 (und B16-083 als Spezialfall — der `TEST_KEY_`-Sentinel ist ein Präfix-Skip der
Verifikation) sowie B16-055. Aus drei Register-Verboten werden zwei Zusicherungs-Aussagen.

### 12 — UI- und Marken-Grenzen

**Wortlaut:** (a) Verhalten verzweigt nie am User-Agent; Browser-Fähigkeiten werden ausschließlich per
Feature-Detection ermittelt. (b) Die Wortmarke „Vivodepot" steht im Footer. (c) Kein Prozent- oder
Vollständigkeits-Indikator über den Depot-Inhalt und keine Gamification (keine Punkte-, Badge-, Level-
oder Streak-Elemente). (d) Keine Interaktion ist ausschließlich per Drag-and-Drop erreichbar: jede
Umsortierung und jeder Datei-Eintritt hat einen erreichbaren Nicht-D&D-Pfad. (e) Das Topbar-Logo
bleibt unangetastet: die Marke steht als Wortmarke in der Topbar und wird nicht durch Fremd-/Anbieter-
Logos ersetzt oder ergänzt (kein Co-Branding im Anwendungs-Chrome).

**Prüfung müsste messen:** (a) kein `navigator.userAgent/platform/vendor`-Vergleich zur
Verhaltenssteuerung (Capability-Stellen nutzen Feature-Detection); (b) der Footer trägt die Wortmarke;
(c) die einzige prozentgetriebene Anzeige ist die Wizard-Schrittanzeige (`schritt/gesamt`), kein
Feldzähl- oder Vollständigkeits-Indikator über den Depot-Inhalt; (d) zu jedem Drop-/`draggable`-
Reihungs-Handler existiert ein erreichbarer Nicht-D&D-Pfad (Datei-Picker bzw. bedienbare ↑/↓-Knöpfe).

**Ausdrücklich ausgenommen (Geltungsbereich):** die sachliche Wizard-Schrittanzeige „Schritt X von N"
(positionsgebunden), der Prüftermin-Ampelstatus (Aktuell/Bald fällig/Überfällig) und der Passwort-
Stärke-Segment-Indikator — Orientierung/Status, keine Gamification. (c) ist die präzisierte Fassung von
B16-021 („kein Fortschrittsbalken, keine Gamification"), gestützt auf die Abgrenzung „`wizardFortschritt()`
= anderer Gegenstand" (ADR-Durchgang 23.07.) und die UX-Spezifikation, die die Schrittanzeige vorschreibt.
(d) ist die enge, strukturelle Fassung von B16-033; die vollständige „nirgends D&D-only in der
Bedienung"-Aussage bleibt Laufzeit-/Accessibility-Vorbehalt.

**Herkunft:** B16-030 (a), B16-009b (b), B16-021 (c), B16-033 (d) — die UI-/Marken-Verbote der
26-Verbote-Strecke (Gruppe B3), die keine der zehn produkttragenden Zusicherungen führte.

### 13 — „Gespeichert" heißt: tatsächlich geschrieben

**Wortlaut:** Jede Statusanzeige und jede Erfolgsmeldung, die das Wort „gespeichert" (oder eine
Ableitung davon) trägt, folgt einem tatsächlich erfolgreichen Schreibversuch — nie einem
Schreibversuch, der geworfen und still verschluckt wurde. Ein fehlgeschlagener Schreibversuch führt
zu einem eigenen, sichtbaren vierten Status, nie zu Stille und nie zur Behauptung des Gegenteils.

**Prüfung müsste messen:** Kein Aufrufer eines Schreibpfads (`kernAPI.speichern`,
`depotInDateiSichern`, `depotInternSichern`, `depotInIdbSichern`) trägt ein bare `catch (_) {}` ohne
begründenden Kommentar; jeder Fehlschlag erreicht `markiereSpeichernFehlgeschlagen()` und damit den
vierten Zustand aus `saveStatusModell()`; kein Erfolgs-Toast, der das Wort „gespeichert" trägt, feuert
unbedingt, unabhängig vom tatsächlichen Ausgang des vorangehenden Schreibversuchs.

**Herkunft und Deckungslücke:** Diese Zusicherung tut bereits Arbeit, seit U2-ADR-031 Stück 1
(21.06.2026) die Statuspille als „reines, testbares Modell" einführte — sie war ab diesem Zeitpunkt
faktisch das Versprechen des Bausteins, ohne je als eigene Zusicherung geführt zu werden. Gemessen
war sie nicht gedeckt: sieben Aufrufstellen von `kernAPI.speichern()`/`depotInDateiSichern()` sowie
zwei weitere `depotInIdbSichern()`-Stellen trugen bare `catch (_) {}` ohne surfacing (eigene
Erhebung, Zug-0-Nachtrag, 08.08.2026), und `flowPasswortSetzen` zeigte den Erfolgs-Toast unbedingt, auch nach
einem stillen Fehlschlag. Ob sie zwischen 21.06. und 08.08.2026 an irgendeinem Zeitpunkt tatsächlich
gedeckt war, ist nicht rekonstruierbar — die Lücke bestand nachweislich von Anfang an (Stück 1
selbst trug bereits die uneingeschränkten `catch`-Blöcke), nicht erst seit einer späteren Regression.
Geschlossen mit U2-ADR-031 Stück 5 (Nachtrag, 08.08.2026).

---

## Folgen

- Die zehn Zusicherungen sind ab sofort beschlossene Entscheidungen, nicht gelebte Praxis. Ihre
  Verletzung ist ein ADR-Bruch.
- Sie sind das vorgesehene Prüfmaterial für das Format-ADR zur Konformitätsklausel: sieben scharf
  prüfbar, eine ausdrücklich nicht prüfbar, eine mit dokumentierter Ausnahme, eine mit offenem
  Ist-Soll-Konflikt. Ein Format, das an diesen zehn trägt, trägt am gesamten Bestand.
- Sie sind der Kern dessen, was ein Institutionen-Prüfer als Erstes verlangt: nicht „funktioniert
  es", sondern „stimmt, was ihr über euch behauptet".
- `tools/zusicherungen-pruefen.js` referenziert diese Nummer (`adr: 'U2-ADR-097'`) in seiner
  Regeldatei — dieser Eintrag macht den Verweis gültig.

## Nicht Teil dieser Entscheidung

Klausel-Syntax, Prüfungsnamen, gebaute Prüfungen über das bereits laufende
`tools/zusicherungen-pruefen.js` hinaus. Das Format-ADR steht aus und muss vor dem Bau weiterer
Prüfungen entschieden sein.

---

*Vivodepot GmbH · Berlin · 23.07.2026*

## Nachtrag — §11 und §12 (25.07.2026)

Dieses ADR wurde am 25.07.2026 um zwei Zusicherungen erweitert: **§11 (Kein Testmode im Produktivpfad)**
und **§12 (UI- und Marken-Grenzen)**. Die ursprünglich **zehn** am 23.07. beschlossenen Zusicherungen
wachsen damit auf **zwölf** Abschnitte.

**Warum:** §11/§12 sind die Heimat der bis dahin heimatlosen B3-Verbote der 26-Verbote-Strecke (Stufe 0,
Gruppe B3) — UI-, Marken- und Testmode-Grenzen, die keine der zehn produkttragenden Zusicherungen führte.

**Gebundene Aussagen — sechs, alle über `tests/bindung-pruefen.js` (U2-ADR-098 + Nachtrag):** §11 →
B16-082 (inkl. 083) + B16-055; §12 → B16-030 (a), B16-009b (b), B16-021 (c), B16-033 (d). Jede war zum
Bindungszeitpunkt durch einen von Tag 1 grünen Test belegt — kein erzwungener Grün-Zustand (Auflage des
B3.3-Komplett-Zugs).

**§12(c) — Präzisierung von B16-021:** nicht „kein Fortschrittsbalken" wörtlich, sondern „kein Prozent-/
Vollständigkeits-Indikator über den Depot-Inhalt, keine Gamification"; die sachliche Wizard-Schrittanzeige
ist ausdrücklich erlaubt (s. §12). Gestützt auf die 23.07.-Abgrenzung („`wizardFortschritt()` = anderer
Gegenstand") und die UX-Spezifikation.

**Keine reservierte Lücke:** §12(a) UA-Sniffing war nicht auf einen Fix zu vertagen — die Messung ergab
**0 UA-Sniffing im Eigen-Code** (kein `MacIntel`/`navigator.platform`; das einzige `navigator.userAgent`
steckt im vendorten jsPDF, §1-Ausnahme, im Test über `vendorZeilen` ausgenommen). Alle sechs sind heute
gebunden; §11/§12 tragen keine offene Lücke.

**Außerhalb dieses ADR:** Hash-Pin (B16-067) bleibt CI-Lieferkette und ist ein eigener Vorgang.

## Nachtrag — Ziel-Host der §1-Ausnahme: Codeberg → GitHub (01.08.2026)

Codeberg entfällt komplett als Host (Produktentscheidung vom 31.07.2026, internes
Entscheidungsdokument, nicht Teil dieses Repos): neue Klausel in Codebergs
Nutzungsbedingungen (Punkt 2.7, seit 22.07.2026) verbietet Projekte, die „hauptsächlich
KI-generiert" sind — Vivodepot fällt darunter.

Betroffen ist ausschließlich der in §1 benannte Ziel-Host der vorgesehenen, noch nicht gebauten
Ausnahme (gehostete PWA-Variante, nutzerausgelöster Versions-Check gegen einen signierten
Endpunkt): „Codeberg" wird zu „GitHub" (`github.com/vivodepot/vivodepot`, Org-Profil, entsteht erst
beim Public-Release-Schnitt).

Keine Auswirkung auf den Ist-Zustand: die Erhebung vom 23.07. fand keinen Codeberg-Aufruf im Code
(Zielzustand, nicht Ist-Zustand) — das gilt unverändert für GitHub als neuen Zielzustand. Kein
Konformitäts-Block betroffen, keine Prüfung ändert sich.

## Nachtrag — §13 „Gespeichert heißt geschrieben" (08.08.2026)

Dieses ADR wurde um eine dreizehnte Zusicherung erweitert: **§13 („Gespeichert" heißt: tatsächlich
geschrieben)**. Die zwölf am 25.07. geführten Zusicherungen wachsen damit auf **dreizehn** Abschnitte.

**Warum:** Auftrag „Speichern darf nicht mehr still misslingen" (08.08.2026), Grundlage der
Zug-0-Nachtrag-Bericht vom selben Tag — sieben still abgefangene Speicherfehler plus zwei ungeschützte
`depotInIdbSichern()`-Aufrufe gefunden, dazu ein Erfolgs-Toast (`flowPasswortSetzen`), der unbedingt
feuerte. §13 benennt, was U2-ADR-031 Stück 1 schon immer implizit versprach.

**Gedeckt seit:** U2-ADR-031 Stück 5 (Nachtrag 08.08.2026) — vierter Statuszustand
`saveStatusModell()`, gemeinsamer Prüfpunkt `speichernOderFehlschlagMarkieren()` für jeden Aufrufer
von `kernAPI.speichern()`, `depotInternSichern()` liefert bei Fehlschlag einen Rückgabewert statt
eines Wurfs. **Keine automatisierte Konformitäts-Bindung in diesem Nachtrag** — wie die ursprüngliche
Fassung des ADR selbst festhält, sind über `tools/zusicherungen-pruefen.js` hinausgehende neue
Prüfungen nicht Teil dieser Entscheidung. Abdeckung läuft über `tests/persistenz-status.test.js`
(PS1-6 ff., s. Testdatei).

## Nachtrag — automatisierter Wächter auf §3 „Kein Konto" (08.08.2026)

§3 hatte bislang keine automatisierte Bindung — „Prüfung müsste messen: kein Authentifizierungspfad"
stand als Absicht, nicht als laufender Test.

**Anlass:** Auftrag „Einstiegsmarken statt Rückfall" (08.08.2026, Zug 4). Ein zuvor verworfener
Wortlaut-Vorschlag im Vorgänger-Auftrag hätte selbst „melden Sie sich erneut an" geschrieben — genau
den Bruch, den §3 ausschließt. Abgefangen durch Messung des Vorschlags gegen die STRINGS, nicht
durch einen Wächter — der Anlass, den Wächter jetzt zu bauen, statt es bei der einen Messung zu
belassen.

**Gebaut:** `bietetAnmeldungAn(text)` in `tests/persistenz-status.test.js` (PS9-1..4) — scannt jeden
STRINGS-Wert auf „anmelden"/„Anmeldung"/„Konto"/„Login" (wortgrenzenscharf gegen Komposita wie
„Kontoauszug", beide Wortstellungen des trennbaren Verbs „anmelden"), mit einer begründeten,
lebendigkeits-geprüften Ausnahmeliste für die zwei einzigen echten, unbedenklichen Treffer im
heutigen Bestand. Gate-Nachweis mit dem exakten abgelehnten Vorschlag, Positivkontrolle gegen reine
Bankbegriffe. Näher dokumentiert in U2-ADR-031 Stück 9 (derselbe Auftrag, dort die technische Seite).

## Konformität

```konformitaet
aussage:   Kein Klartext außerhalb der erlaubten Ausschnitte (§5): jeder dateiAusgeben-Aufrufer
           (die Ausgabe-Leck-Grenze) ist als erlaubt-Klartext (Feld-Grenze/Two-Step) oder nur-Chiffrat
           registriert; ein neuer, nicht klassifizierter Ausgabepfad bricht die Prüfung.
zustand:   prüfbar
pruefung:  tests/b16-113-klartext-ausgabepfade.test.js#b16-113-kein-unregistrierter-klartext-ausgeber
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (A2-als-Code), über `tests/bindung-pruefen.js` (U2-ADR-098 + Nachtrag).
Der Feld-für-Feld-Beweis je erlaubtem Klartext-Pfad liegt an dessen eigener Prüfung
(NOTFALL_KERN_FELDER, EXPORT_FORMATE, f.sensibel/Two-Step); diese Klausel sichert die Grenze — kein
stiller neuer Klartext-Ausgabepfad.*

### §11 — Kein Testmode im Produktivpfad

```konformitaet
aussage:   Kein Testmode im Produktivpfad (§11): kein Schlüssel-/Header-Präfix führt vor
           crypto.subtle.verify zu einem Frühausstieg, der eine Signatur ungeprüft als gültig behandelt
           (inkl. TEST_KEY_-Sentinel); _verifyJWS trägt keinen Präfix-/Sentinel-Bypass.
zustand:   prüfbar
pruefung:  tests/testmode-bleibt-draussen.test.js#b16-082-kein-praefix-skip-der-verifikation
quelle:    invariante
```

```konformitaet
aussage:   Kein Testmode im Produktivpfad (§11): kein Schalter im Produktivpfad umgeht Krypto oder
           Speicherung oder überspringt eine Prüfung; die ?dev=1-Affordance schaltet nur die Sicht
           (Modus._setzeIntern), nie den Sicherheits-/Speicherpfad.
zustand:   prüfbar
pruefung:  tests/testmode-bleibt-draussen.test.js#b16-055-kein-testmode-schalter-umgeht-krypto-speicher
quelle:    invariante
```

### §12 — UI- und Marken-Grenzen

```konformitaet
aussage:   UI-/Marken-Grenzen (§12a): kein navigator.userAgent/platform/vendor-Vergleich steuert
           Verhalten im Eigen-Code; Capability wird per Feature-Detection ermittelt. Vendorte
           Bibliotheksblöcke (jsPDFs UA-Shim) sind über vendorZeilen ausgenommen — §1-Ausnahme.
zustand:   prüfbar
pruefung:  tests/ui-marke-zusicherungen.test.js#b16-030-kein-ua-sniffing-nur-feature-detection
quelle:    invariante
```

```konformitaet
aussage:   UI-/Marken-Grenzen (§12b): der Footer trägt die Wortmarke „Vivodepot" (STRINGS.fussFirma,
           gerendert in renderFooter).
zustand:   prüfbar
pruefung:  tests/ui-marke-zusicherungen.test.js#b16-009b-wortmarke-im-footer
quelle:    entscheidung
```

```konformitaet
aussage:   UI-/Marken-Grenzen (§12c, präzisiert B16-021): kein Prozent-/Vollständigkeits-Indikator über
           den Depot-Inhalt; die einzige *-100-Prozent-Rechnung ist der Wizard-Schrittbalken
           (schritt/gesamt). Wizard-Schrittanzeige und Prüftermin-Ampel ausdrücklich ausgenommen.
zustand:   prüfbar
pruefung:  tests/ui-marke-zusicherungen.test.js#b16-021-kein-prozent-vollstaendigkeit-indikator
quelle:    invariante
```

```konformitaet
aussage:   UI-/Marken-Grenzen (§12d, enge Fassung B16-033): jeder Drop-Handler hat einen Nicht-D&D-Pfad
           (Datei-Picker); eine draggable-Reihung ohne erreichbaren ↑/↓-Pfad ist verboten. Kein Beweis
           vollständiger „nirgends D&D-only"-Bedienung (Laufzeit-Vorbehalt).
zustand:   prüfbar
pruefung:  tests/ui-marke-zusicherungen.test.js#b16-033-jeder-drop-hat-nicht-dnd-pfad
quelle:    invariante
```

```konformitaet
aussage:   UI-/Marken-Grenzen (§12e, Instanz U2-054): das Topbar-Logo bleibt unangetastet — die Topbar
           trägt das eigene Logo-Symbol (#vd-logo) und die Wortmarke VIVO|DEPOT; kein Fremd-/Anbieter-/
           Sponsor-Logo im Anwendungs-Chrome (kein Co-Branding).
zustand:   prüfbar
pruefung:  tests/sonderfall-verbote.test.js#u2-054-topbar-logo-unangetastet
quelle:    entscheidung
```

*§12(e) und diese Bindung nachgetragen 25.07.2026 (Stufe 7). Heimat-Korrektur aus Stufe 0: U2-054 war im
Register der ADR-Datei `U2-ADR-054-wizard-navigation-findings` zugeordnet, die den Verbotssatz **nicht**
trägt; die tragende Heimat ist §12 (UI-/Marken-Grenzen) — dieselbe Klasse wie B16-009b (Wortmarke im
Footer). `quelle: entscheidung` wie bei §12(b): eine gesetzte Marken-Entscheidung, kein Absenz-Invariant.*

*Bindungen nachgetragen 25.07.2026 (B3.3-Komplett-Zug), über `tests/bindung-pruefen.js` (U2-ADR-098 +
Nachtrag). §11/§12-Prosa s. oben; Meta-Nachtrag „§11 und §12 (25.07.2026)" führt Herkunft und Grün-
Nachweis. Alle sechs Aussagen waren zum Bindungszeitpunkt durch einen von Tag 1 grünen Test belegt.*

### Netz (Stufe 2 der 26-Verbote-Strecke)

```konformitaet
aussage:   Kein Server/keine Cloud (§1/§2), Instanz B16-012: kein AWS-/US-Cloud-SDK im Eigen-Code, und
           die Laufzeit stellt 0 externe Requests. Vendorte Bibliotheken ausgenommen (§1-Ausnahme).
zustand:   prüfbar
pruefung:  tests/konformitaet/offline-garantie.mjs#NULL externe HTTP/S-Requests bei Laden + Nutzung
pruefung:  tests/netz-verbote.test.js#b16-012-kein-aws-cloud-sdk
quelle:    invariante
```

```konformitaet
aussage:   Kein Server (§1), Instanz B16-057: keine Telemetrie-/Analytics-Einbindung im Eigen-Code, und
           die Laufzeit stellt 0 externe Requests.
zustand:   prüfbar
pruefung:  tests/konformitaet/offline-garantie.mjs#NULL externe HTTP/S-Requests bei Laden + Nutzung
pruefung:  tests/netz-verbote.test.js#b16-057-keine-telemetrie-analytics
quelle:    invariante
```

### Interne Allowlists (Stufe 3b)

```konformitaet
aussage:   Kein Klartext außerhalb der erlaubten Ausschnitte (§5), Instanz B16-061v3: der Angehörigen-
           Cache trägt genau die fünf freigegebenen Blätter (_ANG_SITUATIONEN: krankenhausakut,
           pflegeheimakut, beerdigung, behoerden_nachlass, meine_menschen) — ein sechstes Blatt bricht.
zustand:   prüfbar
pruefung:  tests/allowlist-verbote.test.js#b16-061v3-nur-fuenf-blaetter-im-angehoerigen-cache
quelle:    invariante
```

```konformitaet
aussage:   Keine inhaltliche Zertifizierung (§8), Instanz B16-064: kein paralleler, selbst erfundener
           Beziehungs-/Rollen-Namespace neben dem HL7-V3-RoleCode (Anker `beziehungZu`, U2-ADR-079).
zustand:   prüfbar
pruefung:  tests/allowlist-verbote.test.js#b16-064-kein-paralleler-beziehungs-namespace
quelle:    invariante
```

```konformitaet
aussage:   Kein Server/keine Cloud (§1/§2), Instanzen B16-063/B16-065: externe URIs im Eigen-Code sind
           ausschließlich Terminologie-/Profil-KENNUNGEN (SNOMED, LOINC, HL7, hl7.eu, UCUM, ATC, ESCO,
           W3C, urn:) oder amtliche Quellenangaben zur Anzeige (BMJ/BÄK/BZgA-Belege der 1E-Vorlagen);
           keine externe URI ist Abruf-/Link-Ziel (kein href/window.open/location.href/src auf http(s)).
           EINE belegte Ausnahme: der nutzer-initiierte Quellcode-Link in der Fußzeile
           (STRINGS.fussQuellcode, rel="noopener noreferrer") — EUPL-/Transparenz-Zusage, kein Abruf.
zustand:   prüfbar
pruefung:  tests/allowlist-verbote.test.js#b16-063-065-keine-externen-uris-ausserhalb-der-allowlist
quelle:    invariante
```

*Stufe-3b-Bindungen nachgetragen 25.07.2026: neu gebaute Prüfungen (für diese drei existierte **keine**
Scanner-Z-Regel — die [S]-Markierung der Sichtung war falsch, korrigiert 25.07.). Laufen in jedem
`npm test`; je Muster eine Negativprobe (sechstes Blatt / paralleler Namespace / fremde externe URI →
erkannt; SNOMED-Kennung bleibt grün).*

*Netz-Bindungen (B16-012 §1/§2, B16-057 §1) nachgetragen 25.07.2026 (Stufe 2), Bindungsart B: **Verweis**
auf den ausgeführten offline-garantie-Runtime-Test („0 externe Requests", pre-push + CI-konformitaet; sein
Gate-Nachweis `deepEqual(externeRequests, [])` → rot bei jedem externen Request) **plus** ein additiver
Always-on-Statik-Test (`tests/netz-verbote.test.js`, läuft in jedem `npm test`), der latenten SDK-/
Abruf-Code fängt — die Lücke „gedeckt, aber nicht auf jedem Push ausgeführt".*
