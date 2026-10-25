# U2-ADR-477 · Geltungsbereich als Liste, „UK" als Alias, und die LPA-Ausfüllhilfe für England und Wales (Stufe 1)

**Status:** Angenommen — Geltungsbereich als Liste entschieden am 03.10.2026, die Auflagen vom 02.10.2026 umgesetzt;
fortgeschrieben am 18.10.2026 auf U2-ADR-504 § 3: Stufe 1 kommt über den Andockweg, nicht ab Werk (Punkt 7)
**Datum:** 03.10.2026, fortgeschrieben 18.10.2026
**Kategorie:** RECHTSRAUM, MODULE, AMTLICHE QUELLEN
**Linie:** U2
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`rechtsraumKennung`, `RECHTSRAUM_ALIAS`, `_rechtsraumQuelleGueltig`, die Eingangsstellen des
Rechtsraum-Codes in Stellensatz, Textsatz, Blattformat, Format-Modul, Rechtsraum-Einlass und -Anmeldung,
`_rechtsraumKatalogLesen`, `_rechtsraumCodeAbWerk`, `_rechtsraumModulDerZusammenstellung`, `_RECHTSRAUM_MODUL_SCHLUESSEL`),
`vivodepot-studio.html` (`rechtsraumModulPruefen`, Bereich EINLASS-REGELN, vom Erheber der Einlass-Regeln aus dem Kern erzeugt),
`docs/rechtsraum-modul/rechtsraum-modul-schema.json`,
`tools/lpa-england-wales-erzeugen.js`, `tools/lpa-england-wales/`, `tools/lpa-formular-wortlaut-pruefen.js`,
`tests/fixtures/opg/`, der Platzhalter des Bürgermoduls für das Vereinigte Königreich, `docs/fremdquellen.md`
**Bezug:** U2-ADR-121 (Rechtsraum-Modul) · U2-ADR-285 (Gerüst-Ladeweg für DE) · U2-ADR-307 (Fristen-Überlagerung) ·
U2-ADR-309 (der zweite Rechtsraum: Mechanik bewiesen, Recht offen) · U2-ADR-343 (Wortlaut gegen den PDF-Text) ·
U2-ADR-401 (zwei Module desselben Codes) · U2-ADR-495 (`name` des Rechtsraums) · U2-ADR-504 § 3 (Rechtsraum der
Zusammenstellung, Reservierung der Ab-Werk-Codes)

---

## Kontext

Die Lasting Power of Attorney (LPA) ist das Gegenstück der Vorsorgevollmacht in England und Wales. Ihr Recht gilt dort
und nicht im ganzen Vereinigten Königreich: „Subject to subsections (5) and (6), this Act extends to England and Wales
only." (Mental Capacity Act 2005 s. 68(4), legislation.gov.uk, abgerufen 03.10.2026). Schottland und Nordirland haben
eigenes Recht. „GB" ist darum zu weit, „GB-ENG" allein zu eng, und einen gemeinsamen Code für beide Unterteilungen
gibt es nicht.

Bis heute war der Rechtsraum eines Moduls ein String und zugleich der Schlüssel der Registry
(`registry[rechtsraum]`). Im Haus liefen „GB" und „UK" nebeneinander; „UK" ist kein Code nach ISO 3166-1.

Für die LPA gibt es ein amtliches Formular (LP1F für Vermögen, LP1H für Gesundheit und Pflege, je 15 Abschnitte,
Fassung 08.25) und einen amtlichen, kostenlosen Online-Dienst des Office of the Public Guardian (OPG), der das Formular
erstellt. Unterschrieben, bezeugt und bescheinigt wird auf Papier; registriert wird beim OPG. Der Powers of Attorney
Act 2023 soll den Weg digital machen, s. 1 ist „Prospective" (nicht in Kraft), einen Termin nennt keine amtliche
Quelle.

## Die Entscheidung

1. **Der Geltungsbereich eines Moduls ist ein String oder eine Liste von Strings.** Ein Modul für England und Wales
   nennt `["GB-ENG", "GB-WLS"]` (ISO 3166-2, beide in CLDR). Kein erfundener gemeinsamer Code.

2. **Eine Normalform im Kern: `rechtsraumKennung(wert)`.** Ein String bleibt, was `rechtsraumCodeNormalisieren`
   aus ihm macht. Eine Liste wird je Eintrag normalisiert, sortiert und mit Komma verbunden: `"GB-ENG,GB-WLS"`, gleich
   in jeder Reihenfolge und Schreibung. Das ist die abgeleitete Schreibweise der Liste, keine neue Kennung; angezeigt
   wird der `name` des Moduls. Abgewiesen wird eine leere Liste, ein Eintrag, der kein String ist, ein Eintrag außerhalb
   der Form „zwei Buchstaben, wahlweise mit Bindestrich und bis zu drei Zeichen" (ISO 3166-1 bzw. 3166-2) und ein
   doppelter Eintrag (auch nach der Normalisierung). `rechtsraumKennung` kennt keinen Code mit Vorrang (kein fester
   Rechtsraum im Gerüst, U2-ADR-504 § 3). **Reserviert** ist am Einlass der Code jedes Ab-Werk-Moduls
   (`_rechtsraumCodeAbWerk`), und zwar auch als Listeneintrag: eine Liste, die einen Ab-Werk-Code oder einen Eintrag einer
   Ab-Werk-Liste nennt, wird abgewiesen — im DE-Produkt also jede Liste mit „DE", im nackten Gerüst keine. (Fassung vom
   03.10.2026: „DE" fest reserviert; durch U2-ADR-504 § 3 abgelöst.) Die Prüfung der Teile wird mit dem Codelisten-Modul
   gegen ISO 3166-1/CLDR geschärft; der Prüfpunkt bleibt derselbe.

3. **Nur die Eingangsstellen rufen `rechtsraumKennung`**: Stellensatz-Prüfung und -Einbetten, Textsatz-Prüfung,
   -Fingerabdruck und -Einbetten, der aktive Rechtsraum des Depots, Blattformat, Format-Modul, Rechtsraum-Einlass,
   -Einbetten, -Anmeldung, Ab-Werk-Saat, Gerüst-Ladeweg, `_rechtsraumKatalogLesen` und die `kennung` der zwei
   Register, dazu `_rechtsraumModulDerZusammenstellung` und die Lebenslage-Hinweise. Das Studio (`rechtsraumModulPruefen`)
   prüft dieselbe Form der Listeneinträge, ohne reservierten Code (der entscheidet sich erst am Einlass eines Produkts),
   noch ohne ISO/CLDR; seine Vorprüfung im Bereich EINLASS-REGELN ist die wörtliche Kopie des Kern-Prüfers. Alle übrigen
   Leser arbeiten mit dem Schlüssel. Ein selbst eingelassenes Modul schlägt keinen Rechtsraum vor (Selbst-Einlass-Sperre,
   U2-ADR-504 § 3): `_rechtsraumVorschlagswert` bleibt der Rechtsraum der Zusammenstellung. Erst ein Produkt mit genau
   einem Ab-Werk-Modul für England und Wales stempelte den Schlüssel `GB-ENG,GB-WLS` als String — dasselbe Feld wie
   bisher, kein neues.

4. **„UK" wird als „GB" gelesen (ISO 3166-1, RFC 5646), nicht als „GB-ENG,GB-WLS".** Gelesen, nie geschrieben:
   ein Depot, ein Auszug oder ein signiertes Modul mit „UK" bleibt Byte für Byte, wie es ist, auch beim Speichern ohne
   Bearbeitung. Ein Instrument-Stempel „UK" findet über denselben Leseweg das GB-Fach. Der Konflikt-Bericht von
   U2-ADR-401 nennt seither den Schlüssel („GB"), nicht den Rohwert.

5. **Quelle und Anzeigename am Rechtsraum-Modul.** `quelle` nach dem Muster von `wortlautQuelle` (`behoerde`, `titel`,
   `url`, `lizenz`, `stand`; `behoerde`, `titel` und `lizenz` Pflicht, sobald das Feld da ist; `url`, wenn da, nicht
   leer; `stand`, `lizenzAdresse` und `abgerufen` frei). Der Kern prüft die Form und zeigt sie nicht an. Pflicht wird
   `quelle` nicht: bestehende Module ohne sie bleiben gültig. Den Anzeigenamen trägt das Feld `name` je Sprache
   (U2-ADR-495: `{ "de": "England und Wales", "en": "England and Wales" }`). (Fassung vom 03.10.2026: ein eigenes Feld
   `rechtsraumName`; mit `name` entfallen, ehe es gelandet war.)

6. **Die LPA-Ausfüllhilfe, Stufe 1, als drei dockbare Module, kein Kerninhalt.** Erzeugt aus einer Definition
   (`tools/lpa-england-wales-erzeugen.js`) in `tools/lpa-england-wales/`:
   - das Rechtsraum-Modul (`rechtsraum-gb-eng-wls.json`): Geltungsbereich, Name, Quelle (OPG, OGL v3.0, Stand 08.25,
     Publikationsseite https://www.gov.uk/government/publications/lasting-power-of-attorney-forms — so heißt sie seit
     20.04.2026, die frühere Adresse leitet nur weiter), Rechtsgrundlage MCA 2005 s. 9, Formvorschriften als wörtliche
     Zitate mit Fundstelle — Reihenfolge der Unterschriften, Zeuge, Certificate provider, Registrierung, Gebühr, LPA120
     (mit der Adresse der Fassung vom 20.04.2026) und die Wirksamkeit nach dem Gesetz (Punkt 10);
   - der Bereich „LPA England und Wales" (`bereich-de.json`, `bereich-en.json`): die Fragen in der Reihenfolge des
     Formulars, Abschnittstitel und Feldbezeichnungen wörtlich aus LP1F/LP1H, Bedienung in der Sprache der Datei;
   - die Übertragungsliste (`uebertragungsliste-de.json`, `-en.json`), ein Logikmodul über den vorhandenen Weg der
     Auszüge (wie der Erbschein-Vorbereitungsauszug): je Abschnitt und Feld der Wert der Person, als eigenes Dokument
     mit Vivodepot-Fußzeile und OGL-Attribution, ausdrücklich kein Formular, ohne Unterschriftsfeld.
   Die Liste nennt **als ersten Schritt den amtlichen Online-Dienst** mit Adresse
   (https://www.lastingpowerofattorney.service.gov.uk) und versteht sich als Vorbereitung, nicht als Ersatz. In den
   Schritten „Unterschreiben" (Abschnitt 9) und „Registrieren" (Abschnitt 12) steht je ein Sachsatz als erste Zeile,
   im Bereich als Hinweis der Sektion: „Unterschreiben, Bezeugen und Bescheinigen geschieht auf dem gedruckten
   Formular. Vivodepot übernimmt diese Schritte nicht." / „Registriert wird beim Office of the Public Guardian.
   Vivodepot reicht nichts ein." (englisch entsprechend).
   Die Plätze folgen dem Papier: vier Bevollmächtigte, zwei Ersatzbevollmächtigte, vier zu Benachrichtigende; wer mehr
   braucht, kreuzt das „More … Use Continuation sheet"-Kästchen des Formulars an. Was nur eines der beiden Formulare
   kennt (Abschnitt 5, die trust corporation, der Satz zur Unterschrift in Abschnitt 9), ist an die Wahl des Formulars
   gebunden.
   **Keine Zahl für die Wartefrist nach LP3**: die amtlichen Texte nennen drei und vier Wochen. **Die Gebühr** (£92)
   steht nur als Zitat von gov.uk/power-of-attorney mit Abrufdatum (zuletzt 18.10.2026).

7. **Andockweg, nicht ab Werk (fortgeschrieben 18.10.2026).** Die Module gehen in keine Auslieferung
   (`tools/lib/vier-produkte.js` unverändert). Sie liegen als Moduldateien im Repo und docken über den Einlassweg an
   (Selbst-Einlass, `modulEinlassen`; Einstellungen → Module). Der Grund ist U2-ADR-504 § 3 Punkt 1: der Rechtsraum der
   Zusammenstellung ist der Code des EINZIGEN Ab-Werk-Rechtsraum-Moduls, zwei ergeben „". Läge das E&W-Modul ab Werk neben
   dem DE-Modul, verlöre das Produkt seinen Rechtsraum, und der Einlass reservierte den eigenen Schlüssel. Selbst
   eingelassen trägt es seine Typen unter `GB-ENG,GB-WLS` in der Registry, ändert den Rechtsraum der Zusammenstellung
   nicht und schlägt nichts vor (der Einlass setzt `ungeprueft`). Die Entscheidung vom 03.10.2026 (Stufe 1 in
   Privat EN und Pro EN, nur bei gewähltem Rechtsraum England und Wales) bleibt bestehen; sie setzt voraus, dass man
   einen Rechtsraum wählen kann, und wird mit dem Befund RECHTSRAUM-NICHT-WAEHLBAR in einem eigenen Commit umgesetzt.

8. **Der Wortlaut-Wächter** (`tools/lpa-formular-wortlaut-pruefen.js`, Muster U2-ADR-343): Die PDFs von LP1F und LP1H
   liegen **nicht** im Repo, nur ihre SHA-256 (im Werkzeug und in `docs/fremdquellen.md`) und ihr extrahierter Text in
   `tests/fixtures/opg/`. Ohne Argument prüft das Werkzeug den Wortlaut gegen diese Texte; `--dokument <pdf>` hält eine
   heruntergeladene Fassung gegen den Pin und verlangt, dass ihr frisch extrahierter Text gleich der Fixture ist (ohne
   `pdftotext` meldet es „übersprungen", nie grün). Die Suite prüft die Logik dieses Pfads mit erfundenen Bytes und
   einem eingespritzten Extraktor; die Prüfung gegen die amtlichen PDFs ist ein Werkzeuglauf (Prüfweg in
   `docs/fremdquellen.md`), keine Probe der Suite. Verglichen wird gegen den Text in Lesereihenfolge (`pdftotext` ohne
   `-layout`, weil LP1H Abschnitt 5 zweispaltig setzt), Leerraum zu einem Leerzeichen zusammengefasst, wortgenau.
   Eigener Text steht in einer geschlossenen Liste im Erzeuger; ein Satz außerhalb dieser Liste gilt als Zitat und muss
   im Formular stehen.

9. **Der Platzhalter** des Bürgermoduls für das Vereinigte Königreich trägt `["GB-ENG", "GB-WLS"]`. Er bleibt eine eigene Datei: er ist eine Fristen-Überlagerung (U2-ADR-307, `felder`), kein
   Rechtsraum-Modul mit `typen`, und belegt kein Fach der Registry.

10. **Wirksamkeit nach dem Gesetz, als Text im Modul, ohne neues Kernfeld.** Eine LPA besteht erst mit ihrer
    Registrierung: „A lasting power of attorney is not created unless— … (b) an instrument … is made and registered in
    accordance with Schedule 1" (MCA 2005 s. 9(2)(b)); ein Instrument, das dem nicht genügt, „confers no authority"
    (s. 9(3)). Die Gesundheits-LPA (LP1H) gibt Befugnis zudem nur, wenn P die Entscheidungsfähigkeit fehlt oder der
    Bevollmächtigte das vernünftigerweise annimmt (s. 11(7)(a)). Das Modul trägt die drei Sätze wörtlich als
    Formvorschrift mit Fundstelle, Adresse der Norm auf legislation.gov.uk und Abrufdatum (18.10.2026); der
    Wortlaut-Wächter verlangt Adresse und Datum. **Ein strukturiertes Feld `wirksamkeit` am Typ baut diese Entscheidung
    nicht**: es kommt mit dem Befund BETREUUNGSVERFUEGUNG-ALS-VOLLMACHT, der es für alle Rechtsräume fasst (für die LPA
    mit der Zusatzbedingung aus s. 11(7)(a), die an der Wahl LP1F/LP1H hängt). Die Formvorschriften sind freie Form;
    sie sperren das spätere Feld nicht.

## Was nicht entschieden ist

- **Stufe 2** (das amtliche AcroForm-PDF unverändert mitliefern und nur die Felder füllen) wartet auf die Antwort des
  OPG und auf einen eigenen Report-before-Build für die PDF-Bibliothek (SBOM, Lizenz, Bedrohungsmodell, kein Netz).
- **Die Wartefrist nach LP3**: erst nach Lesen der Rechtsgrundlage.
- **Welsh**: LP1F und LP1H gibt es auch auf Walisisch; die Ausfüllhilfe führt die englische Fassung.
- **`docs/JURISDICTIONS.md`** ist zur englischen Oberfläche überholt; nachgezogen wird es von seinem Halter.
- **Die Produktzuordnung** (Punkt 7) wartet auf die Rechtsraum-Wahl (RECHTSRAUM-NICHT-WAEHLBAR).

## Belege

Proben: `tests/rechtsraum-kennung-liste.test.js`, `tests/lpa-england-wales-modul.test.js`,
`tests/lpa-england-wales-wortlaut.test.js`, `tests/mit-modul/modul-schema-rechtsraum.test.js`, dazu die Probe des
Andockwegs und die des Rechtsraumregisters. Wortlaut und Pins:
`node tools/lpa-formular-wortlaut-pruefen.js`; Erzeugtes gegen Abgelegtes: `node tools/lpa-england-wales-erzeugen.js --pruefen`;
die PDFs gegen die Pins: `node tools/lpa-formular-wortlaut-pruefen.js --dokument <pdf>` (Prüfweg in `docs/fremdquellen.md`;
am 18.10.2026 waren beide verlinkten PDFs byte-gleich mit den Pins). Neue Adressen nachsehen:
`curl -s https://www.gov.uk/api/content/government/publications/lasting-power-of-attorney-forms` → `details.attachments`.

```konformitaet
aussage:  Ein Rechtsraum-Modul mit der Liste ["GB-ENG","GB-WLS"] wird angenommen und unter dem Schlüssel GB-ENG,GB-WLS angemeldet.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·Liste] ein Modul mit der Liste GB-ENG und GB-WLS wird angenommen, Schlüssel GB-ENG,GB-WLS
```

```konformitaet
aussage:  Der Schlüssel einer Liste ist gleich in jeder Reihenfolge und Schreibung; ohne Sortierung wird die Probe rot.
zustand:  geprüft
herkunft: invariante
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·Liste] die Liste GB-WLS und gb-eng ergibt denselben Schlüssel — gleich in jeder Reihenfolge und Schreibung
```

```konformitaet
aussage:  Eine leere Liste, ein Nicht-String und ein doppelter Eintrag werden abgewiesen; im DE-Produkt auch jede Liste mit DE (reserviert).
zustand:  geprüft
herkunft: invariante
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·Liste] abgewiesen: die leere Liste, DE allein und neben anderem, doppelte Einträge, eine Zahl
```

```konformitaet
aussage:  Reserviert ist der Ab-Werk-Code auch als Listeneintrag; kein Code ist fest reserviert (im nackten Gerüst keiner).
zustand:  geprüft
herkunft: U2-ADR-504 § 3
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·Liste·Abweisung] der Ab-Werk-Code ist auch als Listeneintrag reserviert: DE im DE-Produkt, im nackten Gerüst nicht
```

```konformitaet
aussage:  Das E&W-Modul liegt in keinem der vier Produkte ab Werk.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/lpa-england-wales-andockweg.test.js#[U2-ADR-477·Andockweg] das E&W-Modul liegt in keinem der vier Produkte ab Werk
```

```konformitaet
aussage:  Selbst eingelassen trägt das E&W-Modul seine Typen in der Registry und ändert weder den Rechtsraum der Zusammenstellung noch den Vorschlag.
zustand:  geprüft
herkunft: U2-ADR-504 § 3
pruefung: tests/lpa-england-wales-andockweg.test.js#[U2-ADR-477·Andockweg] eingelassen trägt das E&W-Modul seine Typen und ändert den Rechtsraum der Zusammenstellung nicht (privat-de, privat-en)
```

```konformitaet
aussage:  Die Quelle nennt die heutige Publikationsseite der Formulare, im Modul und in docs/fremdquellen.md; die frühere, weiterleitende Adresse ist rot.
zustand:  geprüft
herkunft: OPG, gov.uk (Umzug der Seite am 20.04.2026)
pruefung: tests/lpa-england-wales-wortlaut.test.js#[U2-ADR-477·Wortlaut] die Quelle nennt die heutige Publikationsseite, im Modul und im Register der Fremdquellen
```

```konformitaet
aussage:  Jedes bestehende String-Modul im Repo ergibt denselben Schlüssel wie vor diesem ADR, außer UK, das GB wird.
zustand:  geprüft
herkunft: invariante
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·Bestand] jeder String-Rechtsraum im Repo ergibt denselben Schlüssel wie vorher — außer „UK“, das „GB“ wird
```

```konformitaet
aussage:  Der String UK wird als GB gelesen, nicht als England und Wales.
zustand:  geprüft
herkunft: RFC 5646 / ISO 3166-1
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·UK] der String „UK“ wird als „GB“ gelesen — nicht als England und Wales
```

```konformitaet
aussage:  Ein Depot mit UK, geladen und ohne Bearbeiten gespeichert, ist im Rechtsraum und in den Rechtsraum-Modulen byte-gleich.
zustand:  geprüft
herkunft: invariante
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·UK-Altbestand] ein Depot mit „UK“ laden und ohne Bearbeiten speichern: byte-gleich
```

```konformitaet
aussage:  Ein signiertes Modul mit UK bleibt nach dem Laden gültig und byte-gleich und wird als GB ausgelegt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/rechtsraum-kennung-liste.test.js#[U2-ADR-477·UK-signiert] signiertes Modul mit „UK“: nach dem Laden gültig, Signatur geprüft, Bytes unverändert, ausgelegt als GB
```

```konformitaet
aussage:  Die Übertragungsliste nennt als ersten Schritt den amtlichen Online-Dienst des OPG mit Adresse.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/lpa-england-wales-modul.test.js#[U2-ADR-477·LPA] der amtliche Online-Dienst des OPG ist der erste Schritt, mit Adresse (de und en)
```

```konformitaet
aussage:  Die Sachsätze zu Unterschreiben und Registrieren stehen zeichengenau als erste Zeile ihres Schritts.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/lpa-england-wales-modul.test.js#[U2-ADR-477·LPA] die Sachsätze zu Unterschreiben und Registrieren stehen zeichengenau im Ablauf (de und en)
```

```konformitaet
aussage:  Die Übertragungsliste ist ein eigenes Dokument mit OGL-Attribution, kein Formular, ohne amtlichen Stempelvermerk.
zustand:  geprüft
herkunft: Open Government Licence v3.0
pruefung: tests/lpa-england-wales-modul.test.js#[U2-ADR-477·LPA] die Übertragungsliste ist ein eigenes Dokument, kein Formular, mit Quellenangabe (de und en)
```

```konformitaet
aussage:  LP1F und LP1H sind per SHA-256 gepinnt, ihr extrahierter Text liegt als Fixture im Repo, die PDFs nicht.
zustand:  geprüft
herkunft: OPG LP1F/LP1H 08.25
pruefung: tests/lpa-england-wales-wortlaut.test.js#[U2-ADR-477·Wortlaut] LP1F und LP1H (08.25) sind per SHA-256 gepinnt, ihr Text liegt als Fixture
```

```konformitaet
aussage:  Der Dokument-Pfad urteilt über die SHA-256 des PDFs und verlangt, dass der extrahierte Text die Fixture ist; ohne Extraktor übersprungen, nie grün.
zustand:  geprüft
herkunft: invariante
pruefung: tests/lpa-england-wales-wortlaut.test.js#[U2-ADR-477·Wortlaut·Dokument] der Dokument-Pfad trifft den Pin per SHA-256 und verlangt denselben Text
```

```konformitaet
aussage:  Jeder Abschnittstitel, jede Feldbezeichnung, Antwortmöglichkeit und jedes Zitat der Module steht wortgenau im PDF-Text.
zustand:  geprüft
herkunft: OPG LP1F/LP1H 08.25
pruefung: tests/lpa-england-wales-wortlaut.test.js#[U2-ADR-477·Wortlaut] jeder amtliche Text der fünf Module steht wörtlich im PDF-Text
```

```konformitaet
aussage:  Keine Wartefrist nach LP3 steht als Zahl in einem der Module.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/lpa-england-wales-modul.test.js#[U2-ADR-477·LPA] keine Wartefrist nach LP3 als Zahl in irgendeinem der fünf Module
```

```konformitaet
aussage:  Die Gebühr steht nur als Zitat mit gov.uk-Adresse und Abrufdatum.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/lpa-england-wales-modul.test.js#[U2-ADR-477·LPA] die Gebühr steht nur mit gov.uk-Adresse und Abrufdatum
```

```konformitaet
aussage:  Mit dem Inkrafttreten von s. 1 Powers of Attorney Act 2023 wird das LPA-Modul neu geprüft (Online-Weg, Unterschrift, Registrierung, Sachsätze).
zustand:  offen
frist:    2027-01-04
bedingung: Inkrafttreten s. 1 PoA Act 2023 (legislation.gov.uk/ukpga/2023/42/section/1, heute Prospective)
quelle:   entscheidung
```

*Die Frist ist ein Wiedervorlage-Datum, kein erwarteter Termin: an ihm sieht jemand auf legislation.gov.uk nach, ob
s. 1 in Kraft ist. Ist sie es nicht, wird die Frist im ADR neu gesetzt; ist sie es, wird das Modul neu geprüft und
diese Klausel geschlossen. Die ADR-Fristen-Ratsche (`tools/adr-fristen-pruefen.js`) macht die Klausel nach Ablauf rot.*
