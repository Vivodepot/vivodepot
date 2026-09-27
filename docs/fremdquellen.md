# Fremdquellen-Register

Jede Stelle, an der Vivodepot sich auf eine externe Behörde, Norm oder Veröffentlichung beruft —
als Berechnungsgrundlage, als übernommener amtlicher Wortlaut, oder als erklärender Verweis.
Grundlage für den wöchentlichen Quellen-Scanner (montags). Erhoben am 01.09.2026, nachgezogen
am 15.09.2026.

**Das wichtigste Feld ist „Anlass", nicht „Stand".** Ein Datum veraltet von selbst und sagt dem
nächsten Prüfer nicht, WORAUF er achten soll. Ein benannter Anlass tut das.

---

### `bbk-checkliste-notvorrat`

- **Titel:** BBK-Checkliste für den Notvorrat (Teil von „Vorsorgen für Krisen und Katastrophen")
- **Herausgeber:** Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK)
- **Adresse:** bbk.bund.de/vorsorge
- **Erfasster Stand:** Stand laut PDF-Metadaten 04.12.2025 (zuletzt geprüft 01.09.2026)
- **Wo verwendet (Zeilenangaben Stand 15.09.2026):**
  `vivodepot.html:7383` (Bedarfszahl 2 Liter/Person/Tag), `:7406` (`krisenvorsorgeBedarfQuelle`),
  `:7388-7404` (Herkunftskommentar „HERKUNFT DER DREI BBK-KATEGORIEN" — selbst dokumentiert als
  „hierher gerettet, U2-ADR-320, 06.09.2026", vorher an anderer Stelle bei den Feldern),
  `tools/textsatz-en-vollabdeckung-daten.js:1156` (englischer Spiegel)
- **Anlass:** wenn BBK eine neue Fassung der Checkliste veröffentlicht (neues PDF-Metadaten-
  Datum) — ODER wenn sich die Wasserzahl/Vorratsdauer-Angabe zwischen Checkliste und Webseite
  (`https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Bevorraten/bevorraten_node.html`)
  verschieben. **Bekannter, ungelöster Widerspruch:** die
  Webseite nennt „1,5 + 0,5 Liter bedingt", die hier zitierte Checkliste pauschal „2 Liter" —
  beide Stichtag 01.09.2026 aktuell. Außerdem: die Checkliste bietet die Vorratsdauer als Wahl
  (3/5/7/10 Tage), Vivodepot verdrahtet 10 Tage fest als „die" BBK-Empfehlung — eigene Setzung,
  kein BBK-Zwang.

### `bbk-hinweise-allgemein`

- **Titel:** dieselbe Checkliste, allgemeine Rubrik-Hinweise (Notgepäck, Bargeld, Hygiene)
- **Herausgeber:** BBK
- **Adresse:** bbk.bund.de/vorsorge
- **Erfasster Stand:** kein Datum im Hinweistext selbst genannt („Stand siehe bbk.bund.de/vorsorge")
- **Wo verwendet (Zeilenangaben Stand 15.09.2026):** `vivodepot.html:5223` (Dokumente-Hinweis,
  `ks_dokumente_vorhanden.hint`), `:5227` (Bargeld-Hinweis, `ks_bargeld_vorhanden.hint`), `:5231`
  (Hygiene-Hinweis, `ks_hygiene_liste.hint`), `tools/textsatz-en-daten.js:377,388,400`
  (englischer Spiegel — Zeilenangaben nicht neu gemessen)
- **Anlass:** wenn BBK die Rubriken Notgepäck/Hygiene/Bargeld inhaltlich ändert (neue Positionen,
  andere Einteilung).

### `bmj-vollmacht`

- **Titel:** Formular Vollmacht (Vorsorgevollmacht)
- **Herausgeber:** Bundesministerium der Justiz (BMJ)
- **Adresse:** bmj.de/SharedDocs/Downloads/DE/Formular/Vorsorgevollmacht.pdf
- **Erfasster Stand:** Januar 2023 (live gegen bmj.de geprüft 01.09.2026: BMJ nennt exakt
  „15. Januar 2023" — unverändert)
- **Prüfweg (nicht die PDF-Metadaten):** die Adresse oben öffnen — sie liefert keinen rohen
  PDF-Stream, sondern leitet auf eine bmj.de-Landing-Page mit einem sichtbaren Feld „Datum"
  darüber weiter. Dieses Datum vergleichen, nicht die PDF selbst herunterladen/öffnen.
- **Wo verwendet:** `vivodepot.html` `STANDARD_VORLAGEN['vorsorgevollmacht']` (amtlicher
  Wortlaut, `templateJws`-signiert), `docs/template-generator/basistemplate-inhalte.json`
- **Anlass:** wenn BMJ eine neue Fassung des Formulars veröffentlicht (das „Datum" auf der
  Landing-Page ändert sich). **Achtung bei einer Korrektur:** `wortlautQuelle` ist Teil des
  signierten `templateJws` — eine Änderung braucht eine echte Neu-Signatur
  (`tools/basistemplate-neu-signieren.js`), kein einfacher Commit.

### `bmj-betreuungsverfuegung`

- **Titel:** Formular Betreuungsverfügung
- **Herausgeber:** BMJ
- **Adresse:** bmj.de/SharedDocs/Downloads/DE/Formular/Betreuungsverfuegung.pdf
- **Erfasster Stand:** Januar 2023 (live geprüft 01.09.2026: BMJ nennt „01. Januar 2023" —
  unverändert)
- **Prüfweg:** wie bei `bmj-vollmacht` — die Adresse leitet auf eine Landing-Page mit
  sichtbarem „Datum"-Feld weiter, keine PDF-Metadaten nötig.
- **Wo verwendet:** `STANDARD_VORLAGEN['betreuungsverfuegung']`, `basistemplate-inhalte.json`
- **Anlass:** wie bei `bmj-vollmacht` — neue Fassung ODER Signatur-Ablauf.

### `bmj-patientenverfuegung-textbausteine`

- **Titel:** Textbausteine für eine schriftliche Patientenverfügung
- **Herausgeber:** BMJ
- **Adresse:** bmj.de/SharedDocs/Downloads/DE/Service/Formulare/Patientenverfuegung_Textbausteine_pdf.pdf
- **Erfasster Stand:** **„17. September 2021"** — seit 12.09.2026 in `vivodepot.html:23235`
  eingetragen (Schlüssel `patientenverfuegung`, `wortlautQuelle.stand`).
- **Prüfweg:** `bmj.de` leitet für diesen Pfad wie für alle anderen BMJ-Formulare inzwischen per
  301 auf `bmjv.de` weiter (gemessen 14.09.2026, `curl -D -` einzeln nachgeprüft) — `bmjv.de` ist
  damit NICHT mehr „die alte Domain für einen Sonderfall", sondern das aktuelle Redirect-Ziel
  für alle fünf geprüften BMJ-Pfade (s. auch die Einträge oben). Die Adresse oben löst dennoch
  NICHT auf eine Landing-Page auf, sondern startet einen echten Datei-Download — nicht
  anklicken/laden. Der funktionierende Prüfweg (Landing-Page mit sichtbarem „Datum"-Feld) bleibt:
  `https://www.bmjv.de/SharedDocs/Downloads/DE/Formular/Patientenverfuegung_Textbausteine_pdf.html?nn=17634`
  — gefunden über eine Websuche nach dem Dateinamen, nicht über eine offensichtliche
  URL-Ableitung; falls dieser Pfad künftig nicht mehr trägt, erneut suchen, nicht raten.
- **Wo verwendet:** `STANDARD_VORLAGEN['patientenverfuegung']`, `basistemplate-inhalte.json`
- **Anlass:** wenn BMJ eine neue Fassung veröffentlicht (das „Datum" auf der Landing-Page ändert
  sich).
- **Toter Verweis IM übernommenen Wortlaut selbst** (ein Zitat innerhalb dieses Dokuments, nicht
  der Registereintrag dieses Dokuments): Abschnitt 2.3.3 „Künstliche Ernährung und
  Flüssigkeitszufuhr" zitiert den Leitfaden des Bayerischen Sozialministeriums unter
  `unimedizin-mainz.de/fileadmin/kliniken/palliativ/Dokumente/Bayern_Leitfaden_2008.pdf` — tot
  (404 mit Browser-User-Agent, 403 ohne; Domain selbst lebt). Gegengeprüft 15.09.2026 gegen den
  frisch heruntergeladenen aktuellen `bmjv.de`-PDF-Stand: **derselbe Satz, derselbe tote Link
  steht bereits im amtlichen Original** — kein Vivodepot-Fehler. Eigene Einträge
  `bayern-leitfaden-kuenstliche-ernaehrung` und `baek-arbeitspapier-patientenverfuegung-2013`
  unten. Der Wortlaut selbst wird nicht korrigiert (Entscheidung s. Eintrag
  `bayern-leitfaden-kuenstliche-ernaehrung`).

### `bmj-patientenverfuegung-broschuere` / `bmj-betreuungsrecht-broschuere`

- **Titel:** Broschüre „Patientenverfügung" / Broschüre „Betreuungsrecht"
- **Herausgeber:** BMJ
- **Adresse:** bmj.de/SharedDocs/Publikationen/DE/Broschueren/{Patientenverfuegung,Betreuungsrecht}.html
- **Erfasster Stand:** kein Datum im Code hinterlegt (`wortlautQuelleBroschuere` kennt nur
  behoerde/titel/url, kein `stand`-Feld existiert für diesen Quellentyp)
- **Wo verwendet:** `STANDARD_VORLAGEN[*].wortlautQuelleBroschuere`; Anzeige-Herkunftszeilen
  gerendert über `wortlautVorlageHTML()`, `vivodepot.html:26554` (Zeilenangabe Stand 15.09.2026)
- **Anlass:** wenn BMJ die Broschüre neu auflegt. Bislang nicht Gegenstand einer Stand-Prüfung.

### `bzga-organspendeausweis` — **ältestes Dokument der vier**

- **Titel:** Sonderformat: Organspendeausweis (Formular)
- **Herausgeber:** Bundeszentrale für gesundheitliche Aufklärung (BZgA) / Bundesgesundheits-
  ministerium (BMG)
- **Adresse:** bundesgesundheitsministerium.de/fileadmin/Dateien/3_Downloads/O/Organspende/Organspendeausweis_ausfuellbar.pdf
- **Erfasster Stand:** **„Januar 2011"** — seit 12.09.2026 in `vivodepot.html:23235`
  eingetragen (Schlüssel `organspende`, `wortlautQuelle.stand`). 15 Jahre alt, älter als alle drei BMJ-Dokumente.
- **Prüfweg:** die Adresse oben (bundesgesundheitsministerium.de-PDF-Pfad) startet einen
  Datei-Download — nicht anklicken/laden. Der funktionierende Prüfweg:
  `https://www.bundesgesundheitsministerium.de/service/publikationen/details/sonderformat-organspendeausweis`
  — zeigt „Stand: [Monat] [Jahr]" UND bestätigt über den „Herunterladen"-Link denselben
  Dateinamen (`Organspendeausweis_ausfuellbar.pdf`) wie die Adresse oben, also dasselbe
  Dokument. Gefunden über eine Websuche nach dem Publikationstitel, nicht über eine
  offensichtliche URL-Ableitung.
- **Wo verwendet:** `STANDARD_VORLAGEN['organspende']`, `basistemplate-inhalte.json`
- **Anlass:** ein bestätigter liegt bereits vor, nicht nur ein hypothetischer — **01.03.2022:**
  Änderung von genau § 2 TPG (dem im Titel zitierten Paragraphen) durch das „Gesetz zur Stärkung
  der Entscheidungsbereitschaft"; **18.03.2024:** Start des bundesweiten Organspende-Registers.
  Wortlaut-Prüfung gegen beides bereits durchgeführt: kein inhaltlicher Widerspruch, aber der Registerhinweis fehlt strukturell (das Dokument ist
  älter als das Register). **Nächster Anlass, falls das Register selbst novelliert wird** (§ 2a TPG).

### `bzga-organspende-info`

- **Titel:** Informationsportal organspende-info.de
- **Herausgeber:** BZgA
- **Adresse:** organspende-info.de
- **Erfasster Stand:** kein Datum im Code hinterlegt
- **Wo verwendet:** `STANDARD_VORLAGEN['organspende'].wortlautQuelleBroschuere`
- **Anlass:** rein informativer Verweis, kein übernommener Wortlaut — niedrigste Priorität dieser
  Liste.

### `bayern-leitfaden-kuenstliche-ernaehrung` — **toter Link, im amtlichen Wortlaut selbst**

- **Titel:** Leitfaden „Künstliche Ernährung und Flüssigkeitszufuhr" (Bayerischer
  Landespflegeausschuss, Dezember 2008)
- **Herausgeber:** Bayerisches Sozialministerium (2008: „Bayerisches Staatsministerium für
  Arbeit und Sozialordnung, Familie und Frauen") — Datei gehostet bei Unimedizin Mainz, nicht
  beim Ministerium selbst
- **Adresse:** `https://www.unimedizin-mainz.de/fileadmin/kliniken/palliativ/Dokumente/Bayern_Leitfaden_2008.pdf`
- **Erfasster Stand:** 2008 (aus Titel/Kontext, kein separates Stand-Feld im zitierenden Wortlaut)
- **Wo verwendet:** `vivodepot.html:23235` — NICHT als eigenes `wortlautQuelle`-Feld, sondern als
  wörtlicher Bestandteil des übernommenen BMJ-Wortlauts (Patientenverfügung-Textbausteine,
  Abschnitt 2.3.3 „Künstliche Ernährung und Flüssigkeitszufuhr"), Schlüssel `patientenverfuegung`
  in `BUERGERMODUL_BUENDEL`.
- **Status, zweifach geprüft:** **TOT.** Erst 14.09.2026 (`curl`, HTTP 404 mit Browser-UA/403
  ohne), dann unabhängig erneut 15.09.2026 (`curl -A "Mozilla/5.0"` → 404) — Domain selbst lebt
  (`unimedizin-mainz.de/` → 200), nur diese Datei ist weg.
- **Amtliche Ersatzadresse gesucht, keine gefunden (15.09.2026):** gezielte Websuche auf
  `stmas.bayern.de` (Nachfolgeministerium) — kein Treffer. Der Leitfaden existiert nur noch auf
  nicht-amtlichen Drittseiten (z. B. eine Hospizvereins-Kopie); nach der Vorgabe „immer amtliche
  Fassung" scheidet das als Ersatzlink aus.
- **Zusätzlich bestätigt: derselbe tote Link steht bereits im aktuellen amtlichen BMJ-Original
  selbst** — 15.09.2026 frisch von `bmjv.de` heruntergeladen und mit `pdftotext` gegengelesen,
  identischer Satz, identische URL. Vivodepot hat den Wortlaut korrekt, unverändert übernommen;
  der tote Link ist ein Fehler der Quelle, nicht der Übernahme.
- **Anlass:** Entscheidung vom 15.09.2026: kein Eingriff in den amtlichen Wortlaut selbst,
  stattdessen ein Hinweis außerhalb des Zitats. Bei jeder erneuten Prüfung: falls das BMJ die eigene
  Quelle irgendwann korrigiert, wird der Hinweis hinfällig — dann den Hinweis entfernen, nicht den
  Wortlaut anfassen.

### `baek-arbeitspapier-patientenverfuegung-2013` — **im amtlichen Wortlaut selbst, Alt-Pfad**

- **Titel:** Arbeitspapier „Patientenverfügung und Organspendeerklärung" (18.01.2013)
- **Herausgeber:** Bundesärztekammer
- **Adresse:** `https://www.bundesaerztekammer.de/fileadmin/user_upload/_old-files/downloads/pdf-Ordner/Patienten/Arbeitspapier_Patientenverfuegung_Organspende_18012013.pdf`
- **Erfasster Stand:** 18.01.2013 (aus Dateiname)
- **Wo verwendet:** `vivodepot.html:23235` — wie beim Bayern-Leitfaden Teil des amtlichen
  BMJ-Wortlauts selbst (Organspende-Abschnitt der Patientenverfügung-Textbausteine), kein eigenes
  `wortlautQuelle`-Feld.
- **Status:** lebt noch (200, geprüft 14.09. und erneut 15.09.2026), aber unter einem
  `_old-files`-Pfad, der nach absehbarem Verfall aussieht — kein akuter Handlungsbedarf, nur zur
  Beobachtung vorgemerkt.
- **Anlass:** wenn dieser Pfad ebenfalls 404 wird — dann dieselbe Prüfkette wie beim
  Bayern-Leitfaden (aktuelles BMJ-Original prüfen, amtliche Ersatzadresse suchen, keine
  Wortlaut-Änderung ohne vorherige Entscheidung).

### `edilife-ki-verfuegung` — **schwächste Quelle im Register, keine URL/kein Titel im Code**

- **Titel:** unbenannt — im Code nur als Forschungssynthese referenziert, kein Papiertitel, keine
  Autor:innen, kein Jahr
- **Herausgeber:** „Edilife/Cambridge/Zürich" — als Forschungssynthese benannt, kein amtlicher
  Herausgeber
- **Adresse:** keine URL im Code
- **Erfasster Stand:** keiner
- **Wo verwendet:** `vivodepot.html:6624` (Einleitungssatz zur KI-Verfügung, Abgrenzung),
  `:14287,14299` (Kopfkommentar + `herkunft`-Feld `KI_KORPUS`), `:42752` (`herkunft:
  {art:'forschung', beleg:'Edilife/Cambridge/Zürich', ...}`)
- **Geprüft, nicht bestätigt (14.09.2026):** die zeitweise vermutete Zenodo-DOI
  `10.5281/zenodo.14222860` kommt weder in `vivodepot.html` noch in diesem Register vor — im
  Repository existiert nur eine völlig andere, nicht verwandte Zenodo-DOI
  (`docs/adr/vivodepot-U2-ADR-080-eudiw-keine-import-verifikation-2026-07-13.md:9`,
  10.5281/zenodo.20180480, „VC Data Model Position Paper"). Die vermutete DOI bleibt unbestätigt.
- **Anlass:** sobald ein Titel, Autor:innen, Jahr oder eine URL für „Edilife/Cambridge/Zürich"
  auffindbar wird — nachtragen. Bis dahin die am schwächsten belegte Quelle dieser Liste, hier
  aber bewusst geführt, statt sie unter „was nicht im Register steht" zu verschweigen.

### `bgb-paragraphen-lese-app`

- **Titel:** Bürgerliches Gesetzbuch, mehrere Einzelparagraphen (Betreuungs-, Erb- und
  Vollmachtrecht) — als erklärender Verweis, kein übernommener Wortlaut
- **Herausgeber:** kein Herausgeber im engeren Sinn — geltendes Bundesrecht
- **Adresse:** gesetze-im-internet.de/bgb/ (amtlicher Fassungs-Nachweis; im Code selbst nicht
  verlinkt)
- **Erfasster Stand:** keiner — der Code nennt nur die Paragraphen-Nummer, keine Fassungs-
  version.
- **Wo verwendet (Zeilenangaben Stand 15.09.2026):** in `vivodepot.html` über 25 Fundstellen
  (u. a. §§ 1358, 1814, 1829, 1831, 1832 BGB — Zeilen 5357, 5845, 5847, 5849, 7537, 8051, 8629,
  8720, 8726, 8729, 8732, 8735, 23235 mehrfach als Teil des amtlichen Vollmacht-Wortlauts in
  `BUERGERMODUL_BUENDEL`, 29767–29817, 52653, 52971, 52976 — Liste nicht abschließend). Je
  Paragraph:
  - § 1358 (Ehegattennotvertretung): `vivodepot.html:5357,7537,8051` (u. a.),
    `vivodepot-lesen.html:1523`
  - § 1782 (Sorgerechtsverfügung): `vivodepot-lesen.html:2466`
  - § 1814 (gesetzliche Betreuung): `vivodepot-lesen.html:1521,1522,2120,2458`
  - § 1829 (Gesundheitssorge, ärztliche Eingriffe): `vivodepot-lesen.html:2146`
  - § 1831 (freiheitsentziehende Unterbringung/Maßnahmen): `vivodepot-lesen.html:2152,2155`
  - § 1832 (ärztliche Zwangsmaßnahmen): `vivodepot-lesen.html:2158,2161`
  - § 1924 (gesetzliche Erbfolge): `vivodepot-lesen.html:2041`
  - § 1939 (Vermächtnis): `vivodepot-lesen.html:2043`
  - **Offen:** ob dieser Eintrag nur `vivodepot-lesen.html` zählen soll (der Registername legt das
    nahe) oder `vivodepot.html` mitgemeint ist — nicht entschieden.
- **Anlass:** wenn einer der genannten BGB-Paragraphen novelliert oder umnummeriert wird. Zu
  einzelnen Paragraphen einzeln beobachten — eine Novelle trifft selten alle acht gleichzeitig.
  **Niedrigeres Risiko als BBK/BMJ/BZgA:** BGB-Paragraphennummern verschieben sich selten,
  anders als eine Behörden-Broschüre oder ein Formular-Stand.

### `sbgg-namenskette`

- **Titel:** Gesetz über die Selbstbestimmung in Bezug auf den Geschlechtseintrag (SBGG), § 13
- **Herausgeber:** kein Herausgeber im engeren Sinn — geltendes Bundesrecht (in Kraft seit
  01.11.2024, damit das mit Abstand jüngste hier gelistete Gesetz)
- **Adresse:** gesetze-im-internet.de/sbgg/
- **Erfasster Stand:** keiner — nur die Paragraphen-Nummer im Code
- **Wo verwendet:** `vivodepot-lesen.html:1412` (Hinweis zum Offenbarungsverbot bei früherem
  Vornamen/Geschlechtseintrag); zusätzlich `vivodepot.html:5688`
  (`identitaet.fruehere_namen/anlass_personenstand_hinweis.hint`), nachgetragen 15.09.2026.
- **Anlass:** wenn § 13 SBGG geändert wird. Eigener Eintrag statt Einordnung unter BGB, weil es
  ein anderes, deutlich jüngeres Gesetz ist.

---

### `xshare-yellow-button-visual-identity-kit`

- **Titel:** xShare Yellow Button – Visual identity kit
- **Herausgeber:** xShare-Konsortium (Horizon Europe, Grant Agreement No. 101136734)
- **Adresse:** `https://xshare-project.eu/wp-content/uploads/2026/07/xShare-Yellow-Button-Visual-identity-kit.zip`
- **Erfasster Stand:** Dateidatum im ZIP 22.07.2026, 20 PNG, keine Nutzungsbedingungen im Kit (geprüft 16.09.2026)
- **Wo verwendet:** `vivodepot.html` — `YB_ZEICHEN` / `ybZeichenHTML` (drei eingebettete PNG, Varianten
  „Full – light background" DOWNLOAD/UPLOAD/ONE_TIME_SHARE, verkleinert auf 136×64 px); Orte s.
  U2-ADR-400, Nachtrag 16.09.2026. Nachsehen: `grep -n "ybZeichenHTML(" vivodepot.html`
- **Anlass:** wenn das Programm eine neue Fassung des Kits veröffentlicht (neues Upload-Datum im Pfad)
  — ODER wenn Nutzungsbedingungen für das Zeichen erscheinen (auf der Programmseite, im Vertrag oder
  als Datei im Kit). Heute stehen keine fest; die Frage nach Werbung außerhalb des Produkts ist offen.

---

## Was NICHT in diesem Register steht, mit Begründung

- **Interne Struktur-/UX-Konzept-„§"-Verweise** (`§7/§8`, `§3.5` usw. in Code-Kommentaren) — das
  sind Abschnittsnummern eigener interner Dokumente (Struktur-Spezifikation, UX-Konzept), keine
  externen Quellen.
- **ADR-eigene Nummerierungen** (`U2-ADR-085 §5` usw.) — Verweise auf Vivodepots eigene
  Architektur-Dokumentation, nicht auf eine externe Behörde/Norm.
- **RFC-Verweise** (`RFC 7515 §2`, `RFC 4648 §5`, base64url) — technische Internet-Standards,
  nicht Gegenstand dieses Registers (ändern sich praktisch nie rückwirkend inkompatibel; eigener
  Fall, falls das je relevant wird).
- **Der Vorratskalkulator der Bundesanstalt für Landwirtschaft und Ernährung**
  (`ernaehrungsvorsorge.de`) — von BBK verlinkt, aber nirgends im Produkt-Code selbst zitiert
  oder verwendet. Kein Eintrag, solange das so bleibt.
- **WHO ATC/DDD-Referenz** (`vivodepot.html:52020`, Medikamenten-Codesystem) — ein technisches
  Klassifikationssystem, kein inhaltlicher Rat/keine Empfehlung; niedrigste Kategorie, bewusst
  ausgelassen, um das Register nicht zu verwässern. Kann bei Bedarf ergänzt werden.

---

*Vivodepot GmbH · Berlin · zuletzt erzeugt 01.09.2026 · nachgezogen 15.09.2026*
