# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), dieses Projekt hält
sich an [Semantic Versioning](https://semver.org/lang/de/).

**Sicherheitshinweise je Fassung.** Eine ausgelieferte Fassung bekommt eine eigene Überschrift in der
Form, die die App anzeigt (`## [v1.0.818] – 2026-09-28`; die Zahl nach dem letzten Punkt ist die
Fassung). Darunter trägt `### Sicherheit` je behobener Schwachstelle einen Listenpunkt mit ihrer Nummer aus
dem Schwachstellen-Register und dem, was zu tun ist.
Der Listenpunkt entsteht im selben Commit wie die Korrektur. Daraus entstehen die
Sicherheitshinweise der Versionsseite (aus dem internen Versionsregister); `tools/fassungen-register.js --check`
(pre-commit) ist rot, wenn eine als korrigiert geführte Schwachstelle hier fehlt.

## [Unreleased]

## [v1.0.919] – 2026-10-06

### Hinzugefügt
- Trägt ein Produkt die Marke einer Einrichtung, steht ihr Logo oben in den PDF-Dateien; auf Notfallkarte, Dokumenten und
  dem Widerruf einer Herausgabe steht die Marke klein im unteren Rand jeder Seite. Ab Werk bleibt das PDF, wie es war.
- Das Studio, das Vorlagen-Werkzeug für Einrichtungen, liegt jetzt im öffentlichen Repository, unter EUPL-1.2 wie die
  anderen Anwendungen.

### Geändert
- Keine Serifenschrift mehr: Alle Texte stehen in derselben Schrift.
- Die Schriften kommen aus dem Erscheinungsbild-Modul, das eigene Schriften mitbringen kann (U2-ADR-473); das PDF nimmt sie
  nur, wenn sie jedes Zeichen der Angaben darstellen, sonst die mitgelieferte Inter. Steht keine geprüfte Schrift zur
  Verfügung, entsteht kein PDF; ein Hinweis sagt das und bietet an, die Angaben als Datei herauszugeben.
- Der Code für den älteren Antwort-Umschlag ist aus der Anwendung entfernt. Die Lese-App öffnet bereits ausgegebene
  Antworten im älteren Format weiter.
- SECURITY.md beschreibt die Passwortprüfung so, wie die Anwendung sie vornimmt: Pflicht ist nur die Mindestlänge von
  8 Zeichen, alles Weitere ist ein Hinweis. Drei weitere Stellen in STANDARDS.md, SOVEREIGNTY.md und docs/pruefebene.md
  sind an den Code angeglichen.

### Behoben
- Ein Hinweis, der nur einmal erscheint, konnte ausbleiben, wenn gerade ein anderer Dialog offen war, oder von einem
  späteren Dialog überdeckt werden, etwa der Hinweis, dass sich eine Datei aus einer neueren Fassung nur lesen lässt.
  Jetzt kommt er, sobald der Dialog davor geschlossen ist.

## [v1.0.918] – 2026-10-05

### Hinzugefügt
- Die Vorsorgevollmacht als Datei nach dem Medizinischen Informationsobjekt Patientenkurzakte 1.0.0 der
  Kassenärztlichen Bundesvereinigung (U2-ADR-471), eine Datei je bevollmächtigter Person. Dafür lässt sich zum Ablageort der Vollmacht
  jetzt die Anschrift eintragen (Straße, Hausnummer, Postleitzahl, Ort); der bisherige freie Text bleibt unverändert stehen.
  Fehlt etwas, das der Standard verlangt (etwa die Krankenversichertennummer), sagt Vivodepot, was fehlt.

## [v1.0.917] – 2026-10-05

### Hinzugefügt
- Vorführung „Vertretung“ (englisch): eine vertretende Person mit
  Rechtsgrundlage, Umfang und Geltungsdauer in der Patientenkurzakte. Der FHIR-Auszug zeigt die vertretende Person und die
  Einwilligung; über der Datei steht das Ergebnis des Validators mit einem Link zum vollständigen Bericht.

### Geändert
- Vorführungen: Die Notiz steht auf einem eigenen Platz und bleibt im Bild, auch hinter Dialogen und auf dem Handy.
  Die Sicherungsanzeige zeigt „Beispiel — wird nicht gespeichert“. Eine Demo fragt beim Verlassen nicht mehr nach,
  und ihre Einstiegsseite leitet nicht mehr weiter, sondern zeigt den Bau-Commit und einen Knopf „Demo starten“.
- Wo der Vollmachtsumfang § 1829 BGB nennt, steht neben der Lebensgefahr jetzt auch der schwere, länger dauernde
  Gesundheitsschaden; bisher las man daraus weniger, als die Vollmacht umfasst.
- Jeder verschlüsselte Teil der Depotdatei wird auf das nächste volle Kilobyte aufgefüllt. Wer mehrere Fassungen einer
  Datei aufbewahrt, etwa ein Cloud-Anbieter, sieht an der Länge nicht mehr, ob sich ein Teil um weniger als ein Kilobyte
  geändert hat. Die Datei wird dadurch um 6 bis 10 % größer (U2-ADR-464).
- Außen trägt die Datei eine Marke, an der die App erkennt, ob zwei Dateien denselben Stand haben. Ältere
  Fassungen öffnen die neue Datei (U2-ADR-464).
- Hinweise zur Netzverbindung berichtigt: Bei der gehosteten Fassung fragt die Anwendung nach Aktualisierungen. Die Hilfe
  „Was wir nicht sehen“ und der Hinweis bei „Nach neuer Version suchen“ sagen jetzt nur noch, was trägt: Die Anwendung
  sendet keine Daten aus Ihrem Depot an einen Server.
- Der Hinweis zum Ablageort sagt jetzt, dass jeder mit der Datei ihn lesen kann, ohne Passwort und ohne die App, und rät
  zu einer unpräzisen Angabe.
- Patientenverfügung (v874, U2-ADR-459): Das erzeugte Dokument steht Zeile für Zeile im Wortlaut der Textbausteine des
  Bundesministeriums der Justiz. In Ziffer 2.7 stehen bevollmächtigte und betreuende Person mit Name, Anschrift und Kontakt wie im
  Formular; der Hinweis auf die Vorsorgevollmacht erscheint nur, wenn die Besprechung bejaht ist. Ziffer 2.12 fragt getrennt,
  wo Sie sich informiert haben und wer Sie beraten hat. Eine fehlende Angabe bleibt eine Lücke zum Ausfüllen.

### Behoben
- Firefox fragte beim ersten Sichern ohne Vorwarnung, ob die Seite Daten dauerhaft speichern darf. Jetzt sagt ein Hinweis
  vorher, warum und was „Erlauben“ bewirkt — nur in Firefox, dem Browser, der fragt. Unter „Sichern & Wiederherstellen“
  steht dauerhaft, wann ein Browser das Depot löschen kann, mit dem Knopf „Sicherungskopie erstellen“ direkt darunter.

## [v1.0.857] – 2026-10-02

### Hinzugefügt
- Der Export als HL7 FHIR IPS trägt Vorsorgevollmacht, Patientenverfügung und Betreuungsverfügung als eigene Sektion
  „Advance Directives“: je Verfügung ein Consent nach EU EPS mit Rechtsgrundlage und den bevollmächtigten Personen, dazu,
  wo zutreffend, der Widerspruch gegen die Notvertretung durch Ehegatten. Ablageort und Gesundheitsbefugnisse gehen nur
  mit Freigabe der sensiblen Felder mit. In allen 24 Sprachen des Begleittexts gegen IPS 2.0.0 und EU EPS (Fassung
  1.0.0-ballot) geprüft (U2-ADR-466).
- Namen und Anschrift in getrennten Feldern (U2-ADR-467): Personen haben Familienname und Vornamen, Identität und
  Personen haben Straße, Hausnummer, Postleitzahl und Ort. Die bisherigen Einträge bleiben stehen. Aus einer bisherigen
  Anschrift schlägt die Anwendung die Teile nur vor; sie gelten erst, wenn die Person sie übernimmt. Namen werden nie
  automatisch zerlegt. FHIR, vCard, der selbst ausgestellte Nachweis über die Person und die Dokumente nutzen die
  getrennten Teile; XMeld liest sie getrennt ein.
- Beim Export als HL7 FHIR IPS wählt man die Sprache der festen Sätze (Narrative, Leer-Hinweise, Herkunft): alle 24
  EU-Amtssprachen, voreingestellt Englisch. Codes und die eigenen Einträge bleiben, wie sie sind. Die englischen
  Leer-Hinweise sind die amtlichen Sätze der eHDSI (MyHealth@EU); eine noch nicht unabhängig geprüfte Übersetzung sagt das
  in der Auswahl und im Export (U2-ADR-458).
- Passwort: Jedes Feld für ein neues Passwort bietet „Passwort vorschlagen“ an, sechs zufällige Wörter aus einer Wortliste
  der Produktsprache. Der Vorschlag lässt sich ersetzen und vorlesen; die Bestätigung tippt man selbst. Wer ein eigenes
  Passwort wählt, sieht einen Hinweis, gesperrt wird nichts (U2-ADR-463).
- Weichen der Stand auf dem Gerät und die geöffnete Datei voneinander ab, gibt es neben der Wahl einer Seite „Beide
  zusammenführen“. Listen werden Eintrag für Eintrag zusammengeführt: Was nur eine Seite geändert hat, wird übernommen,
  wo beide etwas geändert haben, wird gefragt. Ein gelöschter Eintrag kehrt nicht zurück, eine Änderung geht nicht ohne
  Rückfrage verloren (U2-ADR-463).
- Die Anwendung kann sich den Speicherort der Depotdatei merken, nur nach Zustimmung und in Browsern, die das
  unterstützen. Die nächste Sicherungskopie geht dann ohne Dateidialog in dieselbe Datei. In den Einstellungen steht der
  gemerkte Ort mit „Speicherort vergessen“ (U2-ADR-031).
- In der installierten Desktop-App von Chrome und Edge öffnet ein Doppelklick auf die Depotdatei die Anwendung mit dieser
  Datei; sie wird das Speicherziel. Ist schon ein Depot offen, wird es zuerst geschlossen, mit Warnung, falls etwas
  ungesichert ist (U2-ADR-463).
- Notfall: Die Notfallkarte zeigt, wo die Vorsorgevollmacht liegt, wie bisher schon bei der Patientenverfügung (Nachtrag
  U2-ADR-096).
- Anfragen per QR-Code: Das Studio erzeugt für eine signierte Anfrage eine kompakte Form, die die Stelle unter einer
  kurzen Adresse ablegt; der QR-Code trägt nur diese Adresse und bleibt so vom Aushang lesbar. Die Anwendung liest die
  kompakte Form aus Link und eingefügtem Text, prüft die Signatur wie bisher und liest Anfragen in der bisherigen Form
  weiter. Die Anwendung selbst lädt nichts; die kurze Adresse ruft das Handy auf, dafür braucht es ein Netz (U2-ADR-460).

### Geändert
- Vivodepot Studio liegt jetzt unter register.vivodepot.de/studio.html; die bisherige Adresse leitet dorthin weiter.
  Lese-App, „Schlüssel teilen“ und der VC-Issuer zeigen wie das Studio im Kopf den Produktnamen und einen Link zur Seite
  der Marke (U2-ADR-362).

### Behoben
- Wurde bei offenem Depot eine zweite Fassung derselben Depotdatei geöffnet, bot die Anwendung die abweichenden Angaben
  nie zum Zusammenführen an: der Vergleich fand das Depot nicht und brach ab (U2-ADR-463).
- In einer älteren Datei mit eigenem Sprachmodul erschienen Texte, die es in diesem Modul noch nicht gab, auf Deutsch,
  auch wenn die Anwendung eine andere Sprache hatte. Sie kommen jetzt aus der Sprache der Anwendung; die Lese-App zeigt
  sie ersatzweise auf Englisch, wenn es sie dort gibt, sonst auf Deutsch, und kennzeichnet das (U2-ADR-463).
- Der FHIR-Export nahm bei einer vertretenden Person das letzte Wort des Namens als Familiennamen, und beim Anlegen eines
  Sub-Depots für ein Kind wurde das erste Wort des Namens als Vorname eingesetzt. Beides nimmt die Teile jetzt nur aus
  den eigenen Feldern oder lässt sie leer (U2-ADR-467).

## [v1.0.843] – 2026-10-01

### Hinzugefügt
- PBKDF2-Iterationen je Kryptoversion (U2-ADR-271, Entscheidung vom 04.09.2026, nachgetragen): eine Zuordnung außerhalb des
  gepinnten Krypto-Blocks hält fest, welche Iterationszahl zu welcher Kryptoversion gehört — je erlaubte Version ein Eintrag,
  heute überall dieselbe Zahl. Eine
  Erhöhung geht damit nur über einen Versionssprung; jede Fundstelle des Werts im ausgelieferten Bestand ist an ihn gebunden.
- Sub-Depot: Zum 18. Geburtstag der vertretenen Person erinnert die Anwendung an die Übergabe, im Prüfblatt und im
  Kalender.
- Sub-Depot: Widerspricht die vertretene Person einer Handlung, wird das festgehalten, bei jeder weiteren Handlung
  angezeigt und nie still gelöscht.
- Sub-Depot: Das Kind übernimmt sein Depot später allein mit seinem Passwort, ohne dass die Eltern mitwirken müssen.
  Wer das Depot führt, richtet dafür einmal einen Ort ein (Kind-Datei).
- Meine Dokumente: Ein Original lässt sich zusammen mit seinem Verwahrungsnachweis herunterladen. Ein eingelesenes
  Gesundheitsdokument ist als sensibel markiert.
- Anfragen: Die Antwort nennt, wer antwortet. Anfrage, Antwort und Notfall-Ansicht zeigen die Angaben mit lesbaren
  Beschriftungen. Die Antwort wird als JWE (RFC 7516) verschlüsselt; die Lese-App öffnet sie und Antworten im früheren
  Format.
- Vertretung: Ein Fach kann ablaufen („gilt bis“); ein abgelaufenes Fach öffnet nicht mehr. Im FHIR-Export erscheint
  die Vertretung mit ihrer Rolle und ihrem Ende.
- Notfall: Schwangerschaft und Weglaufgefährdung sind eigene Felder; im IPS-Export erscheinen sie als
  Schwangerschaftsstatus und als Warnhinweis.
- Bildung: Ein fremd ausgestellter Open Badge 3.0 wird als Original verwahrt und unverändert vorgezeigt.
- Verwaltung: Bei den Stammdaten-Feldern (Name, Anschrift, Geburtsdatum u. a.) zeigt die Anwendung den Bezug zum
  Föderalen Informationsmanagement (FIM) mit Kennung, Fassung und Status; der FIM-Export trägt ihn mit.
- Vorführung: Die Erklärtexte erscheinen als Notiz am jeweiligen Element; eine Demo „Patientin“ zeigt Originalbefunde
  unter „Meine Dokumente“.
- Vivodepot Studio: Das Werkzeug für Vorlagen heißt jetzt so und führt im Kopf zu vivodepot.de. Die Allergene Erdnuss
  und Schalenfrüchte stehen wieder zur Auswahl.
- Nachbau: Die ausgelieferten Dateien lassen sich aus dem Quelltext byte-gleich nachbauen; wie, steht in
  `DEVELOPING.md`.

### Behoben
- In der Kurzzeile eines Listeneintrags stand ein Datum ohne Beschriftung und im Format JJJJ-MM-TT („… · 2026-08-10 ·
  2026-10-15“) — welches die Frist ist, sagte die Zeile nicht. Jetzt „Gültig bis / Frist: 15.10.2026“, in der Ansicht, im
  Word-Export und in der Lese-App; ein Wächter prüft jedes Datums-Unterfeld jeder Liste.
- Die Hilfe spricht nur noch vom Sub-Depot, nicht mehr zusätzlich vom „Unterdepot“.
- Beim Export an die EUDI-Wallet trug der Dateiname den Vornamen; ein Dateiname liegt außerhalb jeder Verschlüsselung.
  Jetzt trägt er keinen Personennamen mehr, wie alle anderen erzeugten Dateien.
- Nach dem Öffnen stand das eingetippte Passwort (beim Öffnen mit dem Wiederherstellungs-Code auch Code und neues
  Passwort) weiter im ausgeblendeten Öffnen-Schirm. Er wird jetzt beim Eintritt geleert; ein Wächter hält jedes
  Geheimnis-Feld in einem Dialog oder im Öffnen-Schirm, die beide geleert werden.
- Notfallkarte: der Name steht in der Reihenfolge, die die Bürgerin gewählt hat („Familienname zuerst anzeigen“) — bisher
  immer Vorname zuerst (U2-ADR-277, Entscheidung vom 05.09.2026, nachgetragen).
- Eine über ein Fach geöffnete Vertretung konnte Angaben ändern; sie liest jetzt nur.
- In Pro lieferten Bürger-Bereiche ohne Werte an mehreren Stellen leere Antworten oder brachen ab; sie werden jetzt
  aus dem Katalog gelesen.
- FHIR-Export: ICD-10-GM und ATC tragen die Adresse aus dem deutschen Basisprofil und die Version des Codesystems.
  Bestehende Depots werden beim Öffnen umgestellt.
- Ein Exportweg hieß nach einem XÖV-Standard, den es für diese Daten nicht gibt; er heißt jetzt
  „Verwaltungs-Stammdaten“.
- Der Dialog zum Abgeben eines Sub-Depots nennt die Grenze: Ältere Sicherungskopien der eigenen Datei enthalten das
  Depot weiter.
- Studio: Der Link für Anfragen zeigt auf die ausgelieferte Fassung.

## [v1.0.842] – 2026-10-01

### Sicherheit
- VD-SEC-006 (kritisch): Behoben in v842: Ein fremdes Logikmodul konnte beim Öffnen seines Dokuments Programmcode in der
  Anwendung ausführen und damit angezeigte Depotdaten an eine fremde Adresse schicken — ohne Signatur eingelassen oder in
  einer fremden Depotdatei mitgebracht. Betroffen: Fassungen bis v841.
  Was zu tun ist: auf v842 aktualisieren bzw. die App neu laden; Module und fremde Depotdateien nur aus bekannter Quelle.
- VD-SEC-007 (kritisch): Behoben in v842: Eine fremde Depotdatei konnte über den Namen ihrer Marke, den Anbieternamen einer
  Vorlage oder die Liste einer Zusammenstellung Programmcode in der Anwendung ausführen und Daten aus der geöffneten Datei
  an eine fremde Adresse bringen. Betroffen: Fassungen bis v841.
  Was zu tun ist: auf v842 aktualisieren bzw. die App neu laden; fremde Depotdateien nur öffnen, wenn man der Absenderin
  vertraut.
- VD-SEC-008 (kritisch): Behoben in v842: Im Ausstellungswerkzeug der Trust Authority konnte eine präparierte Einreichung
  über ihre Anbieter-Kennung Programmcode ausführen. Betroffen: Schalen-Fassungen bis v841.
  Was zu tun ist: nichts für Nutzerinnen; Einreichungen werden nur mit v842 oder später ausgestellt.

### Behoben
- Härtung: Im Studio setzt die Antwort auf das Vereinbarungs-Angebot einer Person einen Verweis „Quelle“ nur noch
  für http(s)-Adressen; andere erscheinen als Text. In der Lese-App werden die Lückensätze, die ein signiertes
  Sprachmodul überschreiben kann, maskiert eingesetzt.

## [v1.0.818] – 2026-09-28

### Hinzugefügt
- Wiederherstellungs-Code (U2-ADR-430): nach dem Anlegen bietet die App einen erzeugten Code an (135 Bit, sieben
  Vierergruppen mit Prüfzeichen), der die Datei öffnet, wenn das Passwort vergessen ist. Voreinstellung ist
  „einrichten“; wer ablehnt, liest vorher die Tragweite. Der Code wird nur angezeigt und von Hand abgeschrieben, zur
  Kontrolle einmal eingetippt, und steht in keiner Datei, keinem Druck, keinem Export. Ein eigenes Code-Blatt wird
  ohne Code gedruckt, getrennt vom Notfall-Blatt mit dem Passwort („Nicht zum Passwort legen.“). Wer mit dem Code
  öffnet, legt im selben Schritt ein neues Passwort fest; der Code gilt weiter. In den Einstellungen: Zustand,
  neu einrichten, entfernen (mit dem Hinweis, dass ältere Kopien den Code weiter tragen). Beim Passwortwechsel gilt
  der Code weiter, wenn er eingegeben wird, sonst fällt er weg. Eine exportierte Kopie trägt ihn nie.
- Vorsorge: neue Gruppe „Verständigung und Unterstützung“ — Sprache, Unterstützung bei der Verständigung (Dolmetschen,
  Gebärdensprache, Leichte Sprache), Begleitperson, „Was mir hilft“ und „Wer nicht informiert werden soll“. Sprache,
  Unterstützung und Begleitperson stehen auf der Notfallkarte und im Blatt Krankenhaus der Angehörigen-Sicht; „Wer nicht
  informiert werden soll“ steht auf keinem von beiden.
- Notfallkarte: „Besondere Situation“ und „Hinweis für Rettungskräfte“ stehen jetzt auf der Karte (höchstens 160 Zeichen,
  dann „… (vollständig in der Datei)“) und ungekürzt im Blatt Krankenhaus.
- Vorsorge: die Festlegungen, die der Assistent zur Patientenverfügung schreibt, sind Felder des Bereichs Vorsorge und
  können mit einer Anfrage erfragt werden; sie werden aus den Antworten abgeleitet und nur angezeigt (U2-ADR-440).
- Bildung: ein fremd ausgestellter European Digital Credential wird als Original verwahrt und byte-gleich vorgezeigt
  (U2-ADR-443).

### Sicherheit
- VD-SEC-004 (mittel): Teilweise behoben in v818, vollständig ab v830: Erzeugte Dateinamen trugen Personennamen
  (Übergabe-Datei eines Sub-Depots, Export-Dateien, Datei eines Empfängerkreises; bis v830 auch der Export an die
  EUDI-Wallet). Ein Dateiname liegt außerhalb der Verschlüsselung. Betroffen: alle Wege bis v811, der Export an die
  EUDI-Wallet bis v818.
  Was zu tun ist: auf v830 aktualisieren bzw. die App neu laden; ältere Dateien bei Bedarf umbenennen.

### Behoben
- FHIR-Export: `display` ist nur noch der offizielle Begriff des Codesystems oder fehlt; der eigene deutsche Name steht
  in `text`. Die mitgelieferten ICD-10-GM-Codes sind endständig (E11.90, I10.90, J45.99 statt E11.9, I10, J45.9).
- Der Hinweis am Feld „Abschrift im Register hinterlegt“ behauptete eine Rechtslage zum Zentralen Vorsorgeregister, die
  nicht belegt ist; er beschreibt jetzt nur das Feld.

## [v1.0.811] – 2026-09-27

### Hinzugefügt
- Identität: die Ablageorte von Geburtsurkunde, Ehe- oder Lebenspartnerschaftsurkunde und Familienstammbuch sind eigene
  Felder (U2-ADR-439). Eine Anfrage kann sie erfragen, und der Auszug zur Erbschein-Vorbereitung nennt sie.

## [v1.0.810] – 2026-09-27

### Sicherheit
- VD-SEC-003 (hoch): Behoben: Felder, die ein Assistent unter einer Bedingung ausblendet, zeigten Listen-Editor,
  Bereichsansicht, PDF und Vorlesen trotzdem. Betroffen: Fassungen bis v806.
  Was zu tun ist: auf v810 aktualisieren bzw. die App neu laden. Früher erzeugte PDFs können die ausgeblendeten Felder
  enthalten; bei Bedarf neu erzeugen und die alten nicht weitergeben.
- VD-SEC-005 (hoch): Behoben: Hatte die Person eine Bedingung für die Weitergabe festgelegt, ging der Auszug eines
  Empfängerkreises als QR-Code ohne die Vereinbarung hinaus, als Datei nicht. Betroffen: Fassungen bis v806.
  Was zu tun ist: auf v810 aktualisieren bzw. die App neu laden.

### Hinzugefügt
- JSON-Schemas (2020-12) für alle Modultypen unter `docs/<typ>-modul/`, je mit einer Probe, die Schema und
  App-Prüfung im Gleichlauf hält.

### Geändert
- Rechtsraum-Modul-Schema (`docs/rechtsraum-modul/rechtsraum-modul-schema.json`): das Pflichtfeld
  `schemaVersion` entfällt. Die App hat es nie gelesen und als unbekannt verworfen; zugleich lehnte das
  Schema `modulTyp` und `sprache` ab, die die App annimmt. Maßstab ist jetzt die Prüfung der App.
  Module mit `schemaVersion` laden weiter, das Feld wird verworfen und benannt. Siehe `docs/JURISDICTIONS.md`.
- FHIR-Export: SNOMED CT nur so, wie SNOMED International es freigegeben hat — als `display` der unveränderte Begriff
  aus dem Global Patient Set, sonst kein `display`. Die Pflicht-Wortlaute für LOINC, ICD-10-GM und ATC-GM stehen
  wörtlich im Kern, in NOTICE.md und in THIRD_PARTY_LICENSES.
- Template-Generator: die Vorschlagsliste bietet keine Allergen-Codes mehr an, das Beispielfeld „Bekannte Allergien“ ist
  Freitext, bis SNOMED International die zwei angefragten Konzepte beantwortet.

### Behoben
- Ein Stellensatz-Modul mit dem Rechtsraum ` DE` (Leerraum) oder `de` wurde angenommen und lieferte im
  deutschen Depot fremde Stellen; der reservierte Rechtsraum war nur in exakter Schreibung geschützt.
  Rechtsraum- und Sprach-Codes werden jetzt einmal normalisiert, und Prüfung, Speicherung und Nachschlagen
  benutzen denselben Wert (auch für Textsatz- und Rechtsraum-Module; `at` und `AT` sind derselbe Rechtsraum).
- Ein Logikmodul mit dem Blocktyp `constructor` (oder einem anderen vom Objekt geerbten Namen) wurde
  angenommen. Konstanten-Tabellen werden jetzt nur noch mit eigenen Einträgen nachgeschlagen.

## [v1.0.806] – 2026-09-26

### Behoben
- Die englische Ausgabe zeigt die Lebenslagen englisch, im Wegweiser, in der Bestandsauswahl und in der Suche.
- Einstellungen → Rechtliches verlinkt die Datenschutzerklärung der Webseite.
- Englische Ausgabe: die rechtliche Betreuung heißt „court-appointed representation“ statt „guardianship“; die
  Unterlagen für die Steuerberatung nennen den Ort der Zugangsdaten, nicht die Zugangsdaten selbst.
- Template-Generator: das Impressum verlinkt auf vivodepot.de statt Platzhalter zu zeigen; das Logo der App steht im
  Kopf, und auf schmalen Bildschirmen bleibt er bedienbar.

## [v1.0.805] – 2026-09-26

### Sicherheit
- VD-SEC-001 (hoch): Behoben: Abgewählte Angaben aus Listen wurden beim Beantworten einer Anfrage trotzdem übermittelt.
  Was zu tun ist: auf v805 aktualisieren bzw. die App neu laden.

## [v1.0.803] – 2026-09-26

### Hinzugefügt
- SMART Health Links: ein geprüftes Original der Mappe lässt sich jetzt auch über ein Manifest weitergeben; „Daten
  einlesen“ verweist auf die Abhol-Seite.
- Lese-App: die Antwort auf eine Anfrage zeigt je Angabe, ob sie aus einem geprüften Nachweis stammt oder von der Person
  angegeben ist.

### Behoben
- Template-Generator, VC-Issuer und „Schlüssel teilen“ zeigen sich in einer fremden Seite nicht mehr, sondern nur als
  oberstes Fenster.
- Vorführung: das Band verdeckte im Handy-Format die Tab-Leiste, wenn diese nach dem Laden wuchs.

## [v1.0.800] – 2026-09-25

### Hinzugefügt
- Vorsorge: Ablehnung der Notvertretung durch Ehegatten, mit Datum und Eintragung im Zentralen Vorsorgeregister
  (U2-ADR-433); die Notfallkarte zeigt Ablehnung und Eintragung, die Registernummer nie.

### Behoben
- Die Einstellungen zeigten die Version als „vv1.0-rc“, jetzt „v1.0“.

## [v1.0.799] – 2026-09-25

### Sicherheit
- VD-SEC-002 (hoch): Behoben: Beim Herausgeben einer Zusammenstellung, eines Anlass-Auszugs oder einer Antwort trug der
  Rohwert einer Liste auch zurückgehaltene Angaben hinaus. Betroffen: Fassungen bis v797.
  Was zu tun ist: auf v799 aktualisieren bzw. die App neu laden. Früher erzeugte Zusammenstellungs- oder
  Anlass-Dateien können die zurückgehaltenen Angaben enthalten; bei Bedarf neu erzeugen und die alten nicht weitergeben.

## [v1.0.797] – 2026-09-25

### Behoben
- Die Vorsorgevollmacht entsteht wieder als PDF; sie brach ab, sobald die Gesundheitssorge beantwortet war.
- Ein Auszug aus einem Sub-Depot trägt die Personen und Institutionen, auf die seine Felder verweisen; die Antwort auf
  eine Anfrage meldete sonst etwa eine hinterlegte Bevollmächtigte als „nicht hinterlegt“.

## [v1.0.795] – 2026-09-25

### Behoben
- Die aus dem Shop ausgelieferte Fassung startet auch ohne Netz: sie bringt ihren Service Worker mit.

## [v1.0] – 2026-09-24

Erste veröffentlichte Version.
