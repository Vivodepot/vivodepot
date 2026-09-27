'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Referenzdepot — eingefrorener Stand VOR dem Kennungs-Umbau („Englisch vor v1")
   ────────────────────────────────────────────────────────────────────────
   Frozen Snapshot von `tests/fixtures/referenzdepot.js` aus Commit f165f9d8 (letzter
   Stand mit deutschen Bereichs-/Feld-Kennungen, vor der Umbenennung). Inhaltlich
   dasselbe Depot wie `referenzdepot.js`, nur unter den ALTEN Kennungen.

   Zweck: die A-Seite von `tests/e2e/nativ-auslieferung-a-b-abnahme.spec.js`. A ist das
   ausgelieferte Nativ v501 (Commit 37038011) — sein Kern kennt nur die deutschen
   Kennungen. Mit der englischen Fixture befüllt, legt er unbekannte Schlüssel ab und
   exportiert leer; der Vergleich maß dann die Kennungs-Umbenennung, nicht die
   Auslieferung (gemessen 15.09.2026: edci-bildung, fhir-ips, fim-json auf A leer, mit
   DIESER Fixture pfadgleich zu B).

   Bewusst NICHT nachgezogen, wenn sich `referenzdepot.js` ändert — das ist der Punkt
   eines eingefrorenen Snapshots (wie `referenzdepot-alt-schema38.js`). Vergrößert sich die
   Differenz zu B dadurch, ist das ein sichtbarer Befund im A==B-Vergleich, kein stiller.

   Herkunft nachsehen: git show f165f9d8:tests/fixtures/referenzdepot.js
   ════════════════════════════════════════════════════════════════════════ */

// ── Personen-Register (erfunden) ────────────────────────────────────────
// Bewusste Mischung aus langen (Umbruch-Testfall) und kurzen Namen.
const MENSCHEN = [
  { id: 'p-partner', name: 'Maximiliane Alexandra Wredenhagen-Sonnenschein',
    beziehung: 'partner', geburtsdatum: '1961-11-02', tel: '0171 2345678',
    email: 'maximiliane.wredenhagen-sonnenschein@beispielpost.example',
    adresse: 'Lindenweg 4, 80331 München' },
  { id: 'p-kind-1', name: 'Konstantin-Emanuel Wredenhagen-Sonnenschein',
    beziehung: 'kind', geburtsdatum: '1994-06-18' },
  { id: 'p-kind-2', name: 'Mia', beziehung: 'kind', geburtsdatum: '2016-02-29' },
  { id: 'p-mutter', name: 'Brunhilde Waltraud Immergrün',
    beziehung: 'mutter', geburtsdatum: '1937-08-09' },
  { id: 'p-hebamme', name: 'Frida Nachtigall', beziehung: 'sonstige', tel: '089 1122334' },
  { id: 'p-hausarzt', name: 'Dr. med. Anselm Bergmüller-Kastner', fachrichtung: 'Allgemeinmedizin' },
  { id: 'p-facharzt-1', name: 'Dr. med. Prof. Cordelia Habichtsberg-von der Marwitz', fachrichtung: 'Kardiologie' },
  { id: 'p-facharzt-2', name: 'Dr. Tom Nguyen', fachrichtung: 'Neurologie' },
  { id: 'p-zahnarzt', name: 'Dr. Sibylle Rautenkranz', fachrichtung: 'Zahnmedizin' },
  { id: 'p-pflegeperson', name: 'Johanna Lichtblau', beziehung: 'sonstige' },
  { id: 'p-vermieter', name: 'Herbert Osterwald', beziehung: 'sonstige' },
  { id: 'p-seelsorger', name: 'Pfarrer Matthias Kornblum', beziehung: 'sonstige' },
  { id: 'p-steuerberater', name: 'Wolf-Dietrich Ellermann', beziehung: 'geschaeftlich' },
  { id: 'p-finanzberater', name: 'Priska Sandmeier', beziehung: 'geschaeftlich' },
  { id: 'p-erbe-3', name: 'Onkel Reinhard Wredenhagen', beziehung: 'sonstige' },
];

// ── Institutionen-Register (erfunden) ───────────────────────────────────
const INSTITUTIONEN = [
  { id: 'i-arbeitgeber', name: 'Süddeutsche Ingenieurgesellschaft für Anlagenbau und Verfahrenstechnik mbH',
    adresse: 'Industriestraße 88, 81379 München' },
  { id: 'i-pflegedienst', name: 'Ambulanter Pflegedienst Sonnenschein gGmbH', tel: '089 998877' },
  { id: 'i-notar', name: 'Notariat Dr. Sommer & Habicht, Partnerschaft mbB', tel: '089 554433' },
  { id: 'i-bestattung', name: 'Bestattungshaus Ehrlich & Söhne KG' },
];

const _person = (id, override) => ({ ref: id || '', override: override || '' });
const _personen = (...ids) => ids.map(id => _person(id));
const _inst = (id) => ({ ref: id, override: '' });

// ── Sektor-Daten ─────────────────────────────────────────────────────────
function baueSektoren() {
  return {
    identitaet: {
      vorname: 'Elisabeth', nachname: 'Wredenhagen-Sonnenschein',
      // A460 (22.08.2026): bewusst leer — Elisabeths Doppelname steht bereits vollständig in
      // `nachname` (Bindestrich-Form); ein zusätzlicher Wert hier würde jedes render-Snapshot-
      // Fixture unter tests/fixtures/render-aufnahme/ verschieben, ohne den Vollständigkeits-Test
      // selbst voranzubringen (der prüft nur: hat das Feld einen BEWUSSTEN Wert).
      nachname2: '',
      // U2-ADR-256 (04.09.2026): bewusst leer/false — Elisabeths Anzeigereihenfolge ist die
      // heutige Default-Reihenfolge (Vorname zuerst), kein aktiv gesetzter Sonderfall. `true`
      // hier würde dieselben render-Snapshot-Fixtures unnötig verschieben (s. nachname2 oben);
      // der echte Familienname-zuerst-Fall wird direkt an identitaetAnzeigename() geprüft
      // (tests/namenskomposition-reihenfolge.test.js), nicht über dieses Referenzdepot.
      familienname_zuerst: false,
      geburtsdatum: '1958-03-14',
      // A461 (22.08.2026): bewusst leer — Elisabeth hat ein volles Geburtsdatum, der Rückfall greift
      // nur, wenn der Tag unbekannt ist (s. persona-p3.js / A461-Proben für den befüllten Fall).
      geburtsjahr: '',
      telefon: '089 87654321',
      strasse: 'Lindenweg 4', plz_ort: '80331 München',
      email: 'elisabeth.wredenhagen-sonnenschein@beispielpost.example',
      nationalitaet: 'deutsch', geburtsname: 'Immergrün', geburtsort: 'Augsburg',
      geschlecht: 'w', familienstand: 'verh', gueterstand: 'zugewinn',
      // Auftragskette 14.08.2026, Glied 3: bewusst leer — Elisabeth ist verheiratet (s. o.),
      // keine Trennung. Derselbe Rest-vs-realer-Zustand wie bei aufenthaltstitel_* unten.
      trennungsdatum: '',
      // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): ausweis_nr/_ausgestellt/_gueltig sind zur
      // mehrwertigen Liste `ausweis` geworden (Korb 1) — der Vorgänger-Ausweis UND der aktuelle,
      // damit die Liste (wie referenzdepot-vollstaendigkeit.test.js für JEDE Liste verlangt)
      // mindestens zwei Einträge trägt.
      ausweis: [
        { system: 'DE', nr: 'T11XXXXX3', ausgestellt: '2011-06-01', gueltig: '2021-06-01' },
        // M1 Zug 1 (10.08.2026): Elisabeth ist 1958 geboren, war bei Ausstellung längst über 24 —
        // zehn Jahre Gültigkeit, wie auf dem Ausweis eingetragen.
        { system: 'DE', nr: 'T22XXXXX9', ausgestellt: '2021-06-01', gueltig: '2031-06-01' },
      ],
      // „Aufenthaltstitel" (11.08.2026): `aufenthaltstitel_art` bleibt bewusst leer —
      // Elisabeth ist deutsche Staatsangehörige (s. nationalitaet oben), kein befristeter
      // Aufenthaltsstatus. Kein Rest, sondern der reale Zustand ihres Profils (dasselbe Muster
      // wie pflegeheim/pflegevertrag_ort weiter unten).
      aufenthaltstitel_art: '',
      // Schnitt Glied 3: die übrigen fünf Felder des Bündels sind in die Liste `aufenthaltstitel`
      // gewandert. Dieser Fixture-Zweck ist Vollständigkeit, nicht Plausibilität (Dateikopf) —
      // die Liste trägt darum zwei strukturelle Einträge wie jede andere Liste, auch wenn
      // Elisabeths reale Biografie (s. o.) keinen Aufenthaltstitel kennt.
      aufenthaltstitel: [
        { system: 'DE', nr: 'AT-XXXXXX1', ausgestellt: '2015-01-01', gueltig: '2020-01-01', behoerde: '', aktenzeichen: '' },
        { system: 'DE', nr: 'AT-XXXXXX2', ausgestellt: '2020-01-01', gueltig: '2025-01-01', behoerde: '', aktenzeichen: '' },
      ],
      profilfoto: _person('', ''),
      // Posten 39 (01.08.2026): war „leer — Gegenprobe"; die Gegenprobe steht
      // an anderen Feldern in dieser Datei weiterhin reichlich (s. u.).
      notizen_start: 'Bevorzugt schriftliche Nachrichten gegenüber Telefonanrufen',
      // F4 Zug 4 (11.08.2026): Namensform statt Name — der Name selbst steht in nachname/geburtsname.
      heirat_namenswahl: 'ehename_meiner', heirat_namenswahl_frueher: '',
      steuerklasse: 'IV', steuerklasse_frueher: '',   // F4 Zug 1: exakter Katalog-Treffer, kein Rest
      // Posten 39 (01.08.2026): bewusst leer, kein Rest — Elisabeth zieht nicht um. Dasselbe gilt
      // zusammenhängend für verwaltung.umzug_versorger und wohnen.umzug_mietverhaeltnis.
      umzug_ummeldung: '',
      haustiere: [
        { name: 'Felix, Europäisch Kurzhaar', betreuung: _person('p-mutter'), tierarzt: _person(''),
          futter: 'Trockenfutter, zweimal täglich; Tablette gegen Schilddrüsenüberfunktion morgens im Futter versteckt',
          sonstiges: 'sehr scheu bei fremden Geräuschen, versteckt sich dann unter dem Sofa im Wohnzimmer' },
        { name: 'Bruno', betreuung: _person(''), tierarzt: _person(''), futter: '', sonstiges: '' },
      ],
      // „Frühere Namen" (11.08.2026): Elisabeth heiratete 1985 (Geburtsname
      // „Immergrün" siehe oben), ließ sich 2003 scheiden und nahm dabei den Geburtsnamen
      // wieder an, bevor der heutige Doppelname aus einer zweiten Heirat entstand.
      fruehere_namen: [
        { name: 'Elisabeth Immergrün', gefuehrt_bis: '1985-06-14', anlass: 'heirat',
          nachweis_ort: 'Heiratsurkunde, Ordner „Familie"' },
        { name: 'Elisabeth Wredenhagen', gefuehrt_bis: '2003-02-01', anlass: 'scheidung', nachweis_ort: '' },
      ],
    },

    'meine-menschen': {
      pflege_hauptperson: _person('p-pflegeperson'),
      pflegezeit: 'Pflegezeit beim Arbeitgeber der Tochter beantragt, drei Monate ab 09/2026',
      ehepartner: _person('p-partner'),
      kinder: [
        { person: _person('p-kind-1'), art: 'leiblich', kind_beziehung_zusatz: '',
          sorgerecht_kind: 'gemeinsam', sorgerecht_kind_zusatz: '',
          betreuungsmodell: '', in_ausbildung: 'ja', ausbildung_ende: '2027-07-31',
          geburtsurkunde_ort: 'Ordner „Familie", Aktenschrank Wohnzimmer' },
        { person: _person('p-kind-2'), art: 'leiblich',
          kind_beziehung_zusatz: 'aus zweiter Ehe des Vaters, lebt überwiegend bei mir',
          sorgerecht_kind: 'gemeinsam', sorgerecht_kind_zusatz: 'Aufenthaltsbestimmungsrecht bei mir, im Übrigen gemeinsam mit dem Vater',
          betreuungsmodell: 'Wechselmodell, ca. 60/40 zu meinen Gunsten', in_ausbildung: 'nein',
          ausbildung_ende: '', geburtsurkunde_ort: '' },
      ],
      unterhalt: [
        { person: _person('p-kind-2'), art: 'Kindesunterhalt', betrag: '480 EUR / Monat',
          richtung: 'zahle', anmerkung: 'gemäß Vereinbarung vom 03.05.2020, Düsseldorfer Tabelle Stufe 3' },
        { person: _person(''), art: 'Trennungsunterhalt', betrag: '', richtung: '', anmerkung: '' },
      ],
      // „Gebwiz Kind und Sub-Depot" (11.08.2026): bewusst leer, kein Rest — reine
      // Zwischenspeicher-Felder des Geburts-Assistenten, im Referenzdepot nie befuellt.
      gebwiz_kind_name: '', gebwiz_kind_geburtsdatum: '', gebwiz_kind_art: '',
    },

    mobilitaet: {
      // F4 Zug 3 (11.08.2026): Klasse und Ablageort getrennt.
      fuehrerschein: ['B', 'BE'], fuehrerschein_ort: 'Geldbeutel', fuehrerschein_frueher: '',
      // M1 Zug 1 (10.08.2026): Führerschein 15 Jahre (keine C1/C/CE/D1/D/DE-Klasse hier).
      fuehrerschein_gueltig: '2033-09-01',
      // C10/Schema 43: ref-Feld. `{override}` ist die typgueltige Form fuer Freitext ohne
      // Register-Eintrag — dieselbe, die der Import erzeugt (`vivodepot.html:9098`).
      kfz_versicherung: { override: 'HUK24' },
      kfz_versicherung_nr: '4711-0815-X',
      d_ticket: 'Deutschlandticket-Abo bei der MVG',
      reisepass_nr: 'C1XXXXX45',
      reisepass_ausgestellt: '2023-04-01', reisepass_gueltig: '2033-04-01',
      // Posten 39 (01.08.2026): Jahresurlaub mit der Tochter, ELEFAND-Registrierung dafür.
      // Schnitt Glied 3: elefand_nr/_laender/_gueltig sind zur Liste `elefand` geworden — zwei
      // Registrierungen, damit die Liste (wie jede andere) mindestens zwei Einträge trägt.
      elefand: [
        { system: '', nr: 'ELE-2025-58204', laender: 'Thailand', gueltig: '2026-12-31' },
        { system: '', nr: 'ELE-2023-11029', laender: 'Marokko', gueltig: '2024-01-15' },
      ],
      botschaft: { override: 'Deutsche Botschaft Bangkok, +66 2 161 2101' },   // F4 Zug 2: ref:institution
      fahrzeuge: [
        { bezeichnung: 'VW Golf 8 Variant, 1.5 TSI, Kennzeichen M-EW 4521',
          fahrzeugausweis_ort: 'Handschuhfach', leasing_ort: '' },
        { bezeichnung: 'Fahrrad, Pedelec Kalkhoff Endeavour', fahrzeugausweis_ort: '', leasing_ort: '' },
        { bezeichnung: 'Vespa Primavera 125, Kennzeichen M-EW 88',
          fahrzeugausweis_ort: 'Aktenordner „Fahrzeuge"', leasing_ort: 'Sparkassen-Leasing, Vertrag endet 2028' },
      ],
    },

    finanzen: {
      // Schnitt Glied 3: `steuerid` ist selbst zur Liste geworden (gleicher id, jetzt mehrwertig) —
      // die frühere und die aktuelle Steuer-ID (Neuvergabe nach Umzug ins Ausland und zurück ist
      // ein bekannter Realfall), damit die Liste mindestens zwei Einträge trägt.
      steuerid: [
        { system: '', nr: '12 345 678 901' },
        { system: '', nr: '98 765 432 100' },
      ],
      bav_name: 'Allianz Pensionskasse', bav_durchfuehrungsweg: 'pensionskasse',   // F4 Zug 3
      bav_nr: 'APK-XXXXXX', bav_rentenbeginn: '2045-03-01',
      private_av_institut: 'Cosmos Direkt', private_av_nr: 'POL-772-4493', private_av_ablauf: '2043-11-01',
      steuerberater: _person('p-steuerberater'), steuerberater_tel: '089 12345-678',
      steuer_ablage: 'Ordner „Steuern 2025", Aktenschrank Arbeitszimmer',
      steuer_software: 'WISO Steuer 2026', steuer_besonders: 'Einkünfte aus Vermietung der Zweitwohnung, Ehegattensplitting',
      finanzberater: _person('p-finanzberater'),
      schulden: 'Baudarlehen bei der DKB, Restlaufzeit 11 Jahre, 1.150 EUR/Monat',
      wertgegenstaende: 'Schmuck im Bankschließfach; Münzsammlung im Wohnzimmerschrank; Gemälde „Herbstwald" von Tante Gudrun',
      digitale_guthaben: 'PayPal-Guthaben ca. 80 EUR',
      forderungen: 'Bürgschaft für Konstantin-Emanuel, Immobilienkredit bei der Sparkasse München, 20.000 EUR',
      // U2-ADR-104: war ein Freitext mit vier Werten in einem Feld — jetzt vier Zeilen.
      nachlass_vermoegen: [
        { wert: 'Eigentumswohnung',   ort: 'München-Schwabing' },
        { wert: 'Wertpapierdepot',    ort: 'DKB' },
        { wert: 'Lebensversicherung', ort: 'Allianz' },
        { wert: 'Bausparvertrag',     ort: 'Schwäbisch Hall' },
      ],
      /* A55/A56 (30.07.2026): `bank` ist ein ref-UNTERfeld (entitaet:institution) — {override} für
         einen Freitext-Namen ohne Register-Eintrag, symmetrisch zu `kv_art`/`kfz_versicherung`/
         `pflegekasse`, die C10 längst so trägt. Bis A56 stand hier der nackte Name; die Anzeige ist
         identisch (der Leser liest den override-Text), aber die Form war die Grube, die A56 schliesst. */
      konten: [
        { bank: { override: 'Kreissparkasse Oberbayern-Nord eG' }, art: 'Girokonto', iban: 'DE89 3704 0044 0532 0130 00',
          bankvollmacht: [{ ref: 'vi-bank-1', override: '' }], notiz: 'Hauptkonto, monatliche Abbuchungen' },
        { bank: { override: 'Deutsche Bank Privat- und Geschäftskunden AG' }, art: 'Tagesgeldkonto', iban: 'DE12 1203 0000 0000 2020 51',
          bankvollmacht: [{ ref: 'vi-bank-2', override: '' }], notiz: '' },
        { bank: { override: 'DKB' }, art: 'Wertpapierdepot', iban: 'DE45 1203 0000 0009 8765 43', bankvollmacht: [], notiz: '' },
      ],
      kreditkarten: [
        { karte: 'Visa · …4521', karte_gueltig: '2028-06-01' },
        { karte: 'Mastercard Gold · …7788', karte_gueltig: '2027-11-01' },
      ],
    },

    vermoegen: {
      // Zugang zum Recht Zug 1 (30.08.2026): Einkommen-Ergänzung + Wohnsituation.
      weitere_einkommensarten: ['kindergeld', 'rente'],
      wohnsituation: 'mit_angehoerigen',
      wohnung_groesse_qm: '82',
      wohnkosten_allein: '',
      wohnung_personenzahl: '3',
      wohnkosten_gesamt: '1.450',
      wohnkosten_eigenanteil: '480',
      // U2-ADR-326: Beratungshilfe/Prozesskostenhilfe verlangen BETRÄGE, nicht Einkommens-ARTEN.
      // `belastungen_monatlich` bewusst leer — die Fixture soll auch den ungefüllten Fall tragen.
      einkommen_netto_monat: '1.850',
      unterhalt_verpflichtungen: 'Tochter Mia, 420 EUR monatlich',
      haushalt_weitere_einkommen: '2.100',
      belastungen_monatlich: '',
    },

    gesundheit: {
      hausarzt: _person('p-hausarzt'),
      behandlung_aktuell: 'Reha-Nachsorge bis 15.09., Kontrolltermine Kardiologie alle drei Monate',
      blutgruppe: 'A+',
      allergien: [{ text: 'Penicillin' }, { text: 'Hausstaubmilben' }],
      krankheiten: [{ text: 'Diabetes mellitus Typ 2' }, { text: 'Bluthochdruck (essentielle Hypertonie)' }],
      /* C10/Schema 43: ref-Feld, s. kfz_versicherung. Der Wert war „gesetzlich" — die
         VERSICHERUNGSART, nicht die Kasse. Das Feld heisst „Krankenversicherung" und traegt
         `beispiel: 'AOK Bayern'`; eine codeListe hat es nicht (die Gegenprobe steht eine Zeile
         tiefer: `medikamente` fuehrt `codeListe:'atc'` NEBEN `typ:'text'`). Ein Fixture-Rest,
         der als Institutionsname gelesen nie stimmte. */
      kv_art: { override: 'AOK Bayern' },
      medikamente: [{ text: 'Ramipril 5 mg morgens' }, { text: 'Metformin 500 mg, zweimal täglich' }],
      kv_nummer: 'A1XXXXX89',
      implantate: 'Hüft-TEP rechts (Stryker), seit 2019',
      koerpergroesse: '167', koerpergewicht: '71',
      impfbuch_ort: 'Grüner Impfausweis, oberste Schublade im Nachttisch',
      hauptpflegeperson: _personen('p-pflegeperson', 'p-partner'),
      kv_versicherter: 'selbst versichert', kv_zusatz: 'Zahnzusatzversicherung bei der HUK-Coburg',
      // Schnitt Glied 3: krankenkassenkarte_ort/_gueltig sind zur Liste `krankenkassenkarte` geworden.
      // Schnitt Glied 3: zwei Karten (Vorgängerkarte + aktuelle), damit die Liste mindestens
      // zwei Einträge trägt.
      krankenkassenkarte: [
        { system: '', ort: 'Geldbeutel', gueltig: '2030-03-01' },
        { system: '', ort: 'Geldbeutel, altes Fach', gueltig: '2025-01-01' },
      ],
      notfallkarte_ort: 'Geldbeutel, Fach hinter dem Ausweis',
      rauchen: 'ex', alkohol: 'selten',
      impfungen: 'Tetanus 2023, Grippe jährlich, COVID-19 Grundimmunisierung + zwei Auffrischungen',
      arztberichte_stick: 'USB-Stick im Ordner „Gesundheit", beschriftet',
      vorsorge_uebersicht: 'letzte Vorsorgeuntersuchung 03/2026, unauffällig',
      zahnarzt: _person('p-zahnarzt'), bonusheft_ort: 'Ordner „Gesundheit"',
      ehic_nr: 'auf der Rückseite der Krankenversicherungskarte',
      // U2-ADR-104: beide waren Freitext mit „;"-getrennten Sachverhalten — jetzt je eine Zeile.
      // `voroperationen` trägt bewusst DREI Zeilen: der FHIR-Generator macht daraus drei
      // `Procedure`-Einträge, und genau das prüft der eu-eps-Test.
      voroperationen: [
        { eingriff: 'Blinddarm-Entfernung',   jahr: '1979' },
        { eingriff: 'Hüft-TEP rechts',        jahr: '2019' },
        { eingriff: 'Kaiserschnitt',          jahr: '1994' },
      ],
      familienanamnese: [
        { person: 'Vater',     erkrankung: 'Herzinfarkt (verstorben)',            alter_bei_erkrankung: '61' },
        { person: 'Mutter',    erkrankung: 'Diabetes Typ 2',                      alter_bei_erkrankung: '70' },
        { person: 'Schwester', erkrankung: 'Brustkrebs (behandelt, in Remission)', alter_bei_erkrankung: '' },
      ],
      fachaerzte: [
        { arzt: _person('p-facharzt-1'), fach: 'Kardiologie' },
        { arzt: _person('p-facharzt-2'), fach: 'Neurologie' },
      ],
    },

    bildung: {
      // F4 Zug 3 (11.08.2026): Abschluss/Jahr getrennt, Alt-Wortlaut war exakt "Abitur"
      // (schon Katalog-Label) — kein Rest.
      schulabschluss: 'abitur', schulabschluss_jahr: '1978', schulabschluss_frueher: '',
      schule_name: 'Luitpold-Gymnasium München',
      // Posten 39 (01.08.2026): Ausbildung vor dem Studium — für ihren Jahrgang (Abitur Ende
      // der 1970er) ein üblicher Weg, nicht zusätzlich zur Studien-Angabe erfunden.
      // „Ausbildung und Betreuerbestellung" Zug 1 (12.08.2026): Abschlussart/Beruf/
      // Betrieb/Jahr getrennt, dasselbe Muster wie studium.
      ausbildung: 'ihk', ausbildung_beruf: 'Bankkauffrau',
      ausbildung_betrieb: 'Bayerische Vereinsbank München', ausbildung_jahr: '1978', ausbildung_frueher: '',
      // F4 Zug 3: Abschlussart/Fach/Hochschule/Jahr getrennt.
      studium: 'diplom', studium_fach: 'Betriebswirtschaftslehre',
      studium_hochschule: 'Ludwig-Maximilians-Universität München', studium_jahr: '', studium_frueher: '',
      dok_abschluss: 'Diplomurkunde, Ordner „Bildung"',
      beruf: 'Kaufmännische Leiterin (im Ruhestand seit 2023)',
      arbeitgeber: _inst('i-arbeitgeber'), arbeitsvertrag_befristet_bis: '',
      arbeitgeber_adresse: 'Industriestraße 88, 81379 München',
      letzter_arbeitgeber: 'Süddeutsche Ingenieurgesellschaft für Anlagenbau und Verfahrenstechnik mbH',
      // F4 Zug 1: Betriebsrente ist kein eigener Katalogwert (nur bAV-Herkunft, kein Erwerbsstatus)
      // — abgebildet als rente_pension, der alte Wortlaut bleibt im Rettungsfeld nachprüfbar.
      einkommensart: ['rente_pension'], einkommensart_frueher: 'Betriebsrente + gesetzliche Rente',
      brutto_monat: '2.680 EUR (Bruttorente)', netto_monat: '2.340 EUR',
      gehaltsnachweis_ort: 'Ordner „Rente", Aktenschrank',
      qualifikationen: 'IHK-Ausbilderschein, Projektmanagement-Zertifikat (PMP)',
      ehrenamt: 'Kassenwartin im Gartenbauverein München-Nord seit 2021',
      zeugnis_schule_ort: 'Ordner „Bildung"', zeugnis_ausbildung_ort: 'Ordner „Bildung"',
      zeugnis_studium_ort: 'Ordner „Bildung"', zeugnis_arbeit_ort: 'Ordner „Bildung", Arbeitszeugnisse',
    },

    sozialversicherung: {
      // Schnitt Glied 3: rentenversicherungsnummer ist zur Liste `rentenversicherung` geworden —
      // die Nummer aus erster Ehe (Namensänderung, s. fruehere_namen) und die aktuelle.
      rentenversicherung: [
        { system: '', nr: '65 120358 A 456' },
        { system: '', nr: '65 120358 A 456-2' },
      ],
      pflegekasse: { override: 'AOK Bayern — Pflegekasse' },   // C10/Schema 43: ref-Feld
      // Schnitt Glied 3: pflegekasse_nr ist zur Liste `pflegekasse_nummer` geworden.
      pflegekasse_nummer: [
        { system: '', nr: 'PK-XXXXXXX' },
        { system: '', nr: 'PK-YYYYYYY (Vorgängernummer)' },
      ],
      pflegekasse_tel: '089 30909-0',
      // Posten 39 (01.08.2026): Pflegegrad 1 passt zu ihrem Profil (aktiv, eigenständig, aber
      // Diabetes/Hypertonie/Hüft-TEP) — `pflegegrad_befristet_bis` bleibt bewusst leer, das ist
      // laut Hinweis am Feld selbst der gültige Zustand „unbefristet", kein Rest.
      pflegegrad: '1', pflegegrad_seit: '2024', pflegegrad_befristet_bis: '',
      // W-7, Zug 3 (09.08.2026): Bezugsdatum für die Widerspruchsfrist, passend zu „seit 2024".
      pflegegrad_bescheid_vom: '2024-03-15',
      // U2-ADR-116 §7: `pflegedienst_kontakt` entfallen, `pflegedienst` ist das überlebende Feld.
      pflegedienst: _inst('i-pflegedienst'),
      // F4 Zug 3 (11.08.2026): Leistungsart/Betrag getrennt — „Entlastungsbetrag" passt zu
      // keiner der drei Katalogwerte, zieht darum vollständig ins Rettungsfeld.
      pflegegeld: '', pflegegeld_betrag: '', pflegegeld_frueher: 'Entlastungsbetrag Pflegegrad 1, 125 EUR/Monat',
      // gdb_merkmale bewusst leer: bei GdB 30 kein Merkzeichen zuerkannt — kein Rest, sondern
      // der reale Zustand darunter (Merkzeichen setzen i. d. R. einen höheren GdB voraus).
      gdb: '30', gdb_merkmale: [], gdb_nachpruefung: '2029-05-01',
      // Schnitt Glied 3: schwerbehindertenausweis_ort/_gueltig sind zur Liste geworden.
      schwerbehindertenausweis: [
        { system: '', ort: 'Geldbeutel', gueltig: '2029-12-31' },
        { system: '', ort: 'Geldbeutel, alter Ausweis', gueltig: '2024-12-31' },
      ],
      // pflegeheim/pflegevertrag_ort bewusst leer: Elisabeth lebt eigenständig zuhause, nicht in
      // einem Pflegeheim — kein Rest, sondern der reale Zustand ihres Profils.
      pflegeheim: '', pflegevertrag_ort: '',
      // Auftragskette 14.08.2026, Glied 3: bewusst leer — Elisabeth ist im Ruhestand (s.
      // ruhestand-Baustein), nicht arbeitslos. Realer Zustand, kein Rest.
      kuendigungsdatum: '', meldung_arbeitsuchend_am: '', arbeitslosmeldung_am: '', bescheid_agentur: '',
    },

    vorsorge: {
      pflege_vorsorge_geprueft: 'ja',
      // Nachlese F8/M1 Zug 2 (11.08.2026): Ziffer-2.7-Klausel (PV_MODUL) — Elisabeth hat mit der
      // bevollmächtigten Person gesprochen, mit der vorgeschlagenen Betreuung noch nicht.
      pv_vollmacht_besprochen: 'ja', pv_betreuung_besprochen: 'nein',
      // C7/C8 (U2-ADR-118 / U2-ADR-119): die toten Vorsorge-Flachfelder aus der Zeit vor dem
      // Umbau (U2-ADR-096/109) sind ENTFERNT — zvr_nummer, vollmacht_vorhanden, patientenverf_
      // vorhanden/-ort, organspende(_einschraenkung), testament_vorhanden/-ort/-datum, erbfolge_
      // hinweis, vermaechtnisse, betreuungsverfuegung, betreuung_wuensche/-ausschluss/-ort,
      // sorgerechtsverfuegung(_wuensche/-ort). feldDefFuer kennt keines; die echten Werte stehen
      // in den vorsorge_instrumente-Zeilen unten. C8a nahm zusätzlich die fünf toten Person-Ref-
      // Flachfelder (betreuung_person/-ersatz, sorgerechtsverfuegung_person/-ersatz, patientenverf_arzt) —
      // Objekt-Refs, die der Skalar-Wächter übersah; ihre Rollen leben als ref-unterFelder im Instrument.
      erben: _personen('p-partner', 'p-kind-1', 'p-erbe-3'),
      pflegewuensche_koerper: 'Dusche statt Wanne bevorzugt; morgens Haare kämmen und Zopf flechten, das ist mir wichtig',
      pflegewuensche_ernaehrung: 'keine Milchprodukte (Unverträglichkeit); Kaffee mit wenig Milch, keinen Zucker',
      pflegewuensche_alltag: 'Radio Bayern 1 morgens; Fenster auch im Winter kurz lüften',
      pflegewuensche_sonstiges: 'Besuch von Pfarrer Kornblum, wenn möglich; Fenster im Zimmer soll offen bleiben können',
      hilfsmittel: 'Lesebrille +2,5, Hörgerät rechts',
      vorsorge_instrumente: [
        { id: 'vi-vollmacht-vorsorge', typ: 'vorsorgevollmacht', art: 'vorsorge',
          form: 'beurkundet', stelle: 'Notariat Dr. Sommer & Habicht, Urkundenrolle Nr. 118/2019',
          ort: 'beim Notariat verwahrt; Kopie im Ordner „Vorsorge"', datum: '2019-04-03', zusatz: '',
          bevollmaechtigter: _personen('p-partner', 'p-kind-1') },
        // F3 (09.08.2026), Zug 3: „gesundheit" ist kein art-Wert mehr (Umfang statt Instrument) —
        // dieselbe Absicht („nur die Gesundheitssorge") drückt sich jetzt über art:'vorsorge' +
        // die drei Gesundheitssorge-Kästchen + alle vier Freiheitsentzug-Optionen aus.
        { id: 'vi-vollmacht-gesundheit', typ: 'vorsorgevollmacht', art: 'vorsorge',
          form: 'privat', stelle: '', ort: 'Ordner „Vorsorge"', datum: '2019-04-03', zusatz: 'nur Gesundheitssorge',
          bevollmaechtigter: _personen('p-partner'),
          vm_gesundheit_entscheiden: 'ja', vm_gesundheit_eingriffe: 'ja', vm_gesundheit_schweigepflicht: 'ja',
          // Nachlese F8/M1 Zug 1 (11.08.2026): vm_gesundheit_freiheitsentzug (mehrfachauswahl) durch
          // vier eigene ☐ja/☐nein-Felder ersetzt.
          vm_freiheitsentzug_unterbringung: 'ja', vm_freiheitsentzug_massnahmen: 'ja',
          vm_freiheitsentzug_zwangsmassnahmen: 'ja', vm_freiheitsentzug_krankenhaus: 'ja' },
        { id: 'vi-bank-1', typ: 'vorsorgevollmacht', art: 'bank',
          form: 'privat', stelle: '', ort: 'Ordner „Vorsorge"', datum: '2020-01-15',
          zusatz: 'Kreissparkasse Oberbayern-Nord eG, Girokonto', bevollmaechtigter: _personen('p-partner') },
        { id: 'vi-bank-2', typ: 'vorsorgevollmacht', art: 'bank',
          form: 'privat', stelle: '', ort: 'Ordner „Vorsorge"', datum: '2022-06-30',
          zusatz: 'Deutsche Bank Privat- und Geschäftskunden AG, Tagesgeldkonto', bevollmaechtigter: _personen('p-kind-1') },
        { id: 'vi-vollmacht-betreuung', typ: 'vorsorgevollmacht', art: 'betreuung',
          form: 'privat', stelle: '', ort: '', datum: '2019-04-03', zusatz: '',
          bevollmaechtigter: _personen('p-partner') },
        // F3 Zug 3: „general" ist kein art-Wert mehr — vollumfängliche Vollmacht heißt jetzt
        // art:'vorsorge' mit allen 19 ja/nein-Kästchen + Freiheitsentzug gesetzt.
        { id: 'vi-vollmacht-general', typ: 'vorsorgevollmacht', art: 'vorsorge',
          form: 'beglaubigt', stelle: 'Bürgeramt München-Schwabing', ort: 'Ordner „Vorsorge"',
          datum: '2024-02-20', zusatz: 'für den Notfall, falls die anderen Vollmachten nicht ausreichen',
          bevollmaechtigter: _personen('p-partner', 'p-kind-1'),
          vm_gesundheit_entscheiden: 'ja', vm_gesundheit_eingriffe: 'ja', vm_gesundheit_schweigepflicht: 'ja',
          vm_freiheitsentzug_unterbringung: 'ja', vm_freiheitsentzug_massnahmen: 'ja',
          vm_freiheitsentzug_zwangsmassnahmen: 'ja', vm_freiheitsentzug_krankenhaus: 'ja',
          vm_aufenthalt_bestimmen: 'ja', vm_wohnung_mietvertrag: 'ja', vm_wohnung_neuer_mietvertrag: 'ja',
          vm_wohnung_betreuungsvertrag: 'ja', vm_behoerden: 'ja', vm_vermoegen_verwalten: 'ja',
          vm_vermoegen_verfuegen: 'ja', vm_vermoegen_zahlungen: 'ja', vm_vermoegen_verbindlichkeiten: 'ja',
          vm_vermoegen_konten: 'ja', vm_vermoegen_schenkungen: 'ja', vm_post_fernmeldeverkehr: 'ja',
          vm_gericht: 'ja', vm_untervollmacht: 'ja', vm_betreuungsverfuegung_verweis: 'ja', vm_tod_hinaus: 'ja' },
        { id: 'vi-pv', typ: 'patientenverfuegung', form: 'privat', stelle: '', ort: 'beim Hausarzt hinterlegt',
          datum: '2023-05-11', zusatz: '' },
        { id: 'vi-testament', typ: 'testament', form: 'beurkundet',
          stelle: 'Notariat Dr. Sommer & Habicht, Urkundenrolle Nr. 204/2021',
          ort: 'beim Notariat verwahrt', datum: '2021-09-12', zusatz: '',
          erbfolge_hinweis: 'abweichend',
          vermaechtnisse: 'Großmutters Ring an Mia; die Vespa an Konstantin-Emanuel; 5.000 EUR an den örtlichen Tierschutzverein München-Nord' },
        { id: 'vi-betreuungsvfg', typ: 'betreuungsverfuegung', form: 'privat', stelle: '',
          ort: 'Ordner „Vorsorge"', datum: '2019-04-03', zusatz: '',
          betreuung_person: _person('p-partner'), betreuung_ersatz: _person('p-kind-1'),
          betreuung_wuensche: 'Wohnung möglichst lange halten; vertraute Hausärztin behalten',
          betreuung_ausschluss: 'kein Umzug ins Pflegeheim ohne Rücksprache mit beiden Kindern' },
        { id: 'vi-sorgerecht', typ: 'sorgerechtsverfuegung', form: 'privat', stelle: '',
          ort: 'beim Notariat', datum: '2019-04-03', zusatz: '',
          sorgerechtsverfuegung_person: _person('p-partner'), sorgerechtsverfuegung_ersatz: _person('p-mutter'),
          sorgerechtsverfuegung_wuensche: 'Mia soll in der gewohnten Schule bleiben; Kontakt zu beiden Großmüttern erhalten' },
        { id: 'vi-ki', typ: 'ki-verfuegung', form: 'privat', stelle: '', ort: 'Ordner „Vorsorge"',
          datum: '2026-03-01', zusatz: '',
          ki_grundentscheidung: 'erlaubnis', ki_zweck: ['trauer', 'erinnerung'],
          ki_berechtigte: 'benannte', ki_berechtigte_personen: _personen('p-partner', 'p-kind-1'),
          ki_raum: 'privat', ki_datenarten: ['schriftverkehr', 'fotovideo'],
          ki_befristung: 'jahre', ki_befristung_jahre: 'zehn', ki_befristung_zeitpunkt: '',
          ki_verhaltensgrenze: 'belegt', ki_nachlassverwaltung: 'benannt',
          ki_nachlassverwalter: _personen('p-kind-1') },
        // „Ausbildung und Betreuerbestellung" Zug 2 (12.08.2026): siebtes Instrument —
        // eine bereits BESTEHENDE gerichtliche Betreuung für die Depot-Inhaberin selbst, kein
        // selbst verfasstes Vorsorge-Dokument (darum ort statt form/stelle).
        { id: 'vi-betreuerbestellung', typ: 'betreuerbestellung', ort: 'Betreuerausweis im Ordner „Vorsorge"',
          zusatz: '', betreuerbestellung_person: _personen('p-partner'),
          betreuerbestellung_aufgabenbereiche: 'Gesundheitssorge; Vermögenssorge',
          betreuerbestellung_gericht: 'Amtsgericht München', betreuerbestellung_aktenzeichen: 'XVII 1234/25',
          betreuerbestellung_seit: '2025-03-10', betreuerbestellung_ueberpruefung: '2032-03-10' },
      ],
    },

    verwaltung: {
      // Schnitt Glied 3: bundid_email/_ort sind zur Liste `bundid` geworden.
      bundid: [
        { system: '', email: 'elisabeth.wredenhagen-sonnenschein@beispielpost.example',
          ort: 'Ordner „Digitale Zugänge", Schreibtisch' },
        { system: '', email: 'elisabeth.immergruen@beispielpost.example',
          ort: 'Ordner „Digitale Zugänge" — altes Konto, vor der Namensänderung' },
      ],
      bundid_status: 'hoch', bundid_status_frueher: '',   // F4 Zug 1: eID-Funktion aktiv → Niveau hoch
      verwaltung_vorgaenge: [
        { behoerde: 'Deutsche Rentenversicherung', vorgangstyp: 'Rentenantrag', aktenzeichen: 'RV-2026-00417',
          datum: '2026-03-12', gueltig_bis: '', betrag: '1.240 EUR monatlich',
          referenz: 'Sachbearbeiterin Frau Meyer', notiz: 'Unterlagen eingereicht, Rückmeldung ausstehend' },
        { behoerde: 'Stadt München, Bürgerbüro', vorgangstyp: 'Ummeldung', aktenzeichen: '',
          datum: '2026-06-01', gueltig_bis: '', betrag: '', referenz: '', notiz: 'Nach Umzug erledigt' },
        // U2-ADR-326: eine dritte Zeile mit den zwei neuen Unterfeldern — die zwei darüber lassen
        // sie leer, damit die Fixture beide Fälle trägt (Zeile mit und ohne Angelegenheit).
        { behoerde: 'Amtsgericht München', vorgangstyp: 'Beratungshilfe', aktenzeichen: 'BerH-2026-0912',
          datum: '2026-08-20', gueltig_bis: '', betrag: '', referenz: '',
          gegenseite: 'Vermieter Herbert Osterwald', beratung_bisher: 'Rechtsanwältin Dr. Sommer, 03/2026',
          notiz: 'Antrag vorbereitet, Unterlagen vollständig' },
      ],
      pw_manager: 'KeePassXC', pw_masterkey_ort: 'Tresor, Fach 2',
      pw_backup_ort: 'verschlüsselter Stick im Bankschließfach',
      computer_pw_ort: 'Passwort-Manager', smartphone_pin_ort: 'Passwort-Manager',
      computer: 'MacBook Air, FileVault aktiv', smartphone: 'iPhone 14, Face ID + Code',
      cloud_dienst: 'iCloud, 200 GB', proton_email: 'elisabeth.ews@example.de',
      social_media: 'Facebook (selten genutzt)',
      alarm_code_ort: 'Tresor, Fach 1',
      // Posten 39 (01.08.2026): bewusst leer, kein Rest — s. identitaet.umzug_ummeldung.
      umzug_versorger: '',
      tresor_ort: 'Ankleidezimmer, hinter dem Kleiderschrank',
      tresor_code_ort: 'Passwort-Manager + Zettel bei der Tochter',
      schliessf_ort: 'Kreissparkasse Oberbayern-Nord eG, Filiale Schwabing',
      schliessf_schluessel: 'Schlüsselbund im Tresor',
      // U2-ADR-104: Liste. Zwei Zeilen — eine mit Person-Referenz, eine nur mit Anmerkung
      // (genau der Fall, den die Migration erzeugt: Freitext geht nach `anmerkung`, nie nach `person`).
      wohnungsschluessel_ort: [
        { person: _person('p-tochter'), anmerkung: 'Ersatzschlüssel, Wohnungstür + Keller' },
        { person: _person(''),          anmerkung: 'Nachbarin im 2. Stock links, nur Wohnungstür' },
      ],
      email_haupt: 'elisabeth.wredenhagen-sonnenschein@beispielpost.example',
      email2: 'elisabeth.ews@altepost.example (alte Adresse)',
      krypto: 'Bitcoin (Hardware-Wallet), Ethereum (Kraken-Konto)',
      krypto_seed_ort: 'Tresor, Fach 2, auf Papier notiert',
      krypto_hardware: 'Ledger Nano X, Schreibtischschublade',
      krypto_legacy: 'Altes Wallet von 2017, Zugang bei der Tochter',
    },

    // F6 Zug 2 (10.08.2026): Umzug aus `verwaltung`, keine Neuanlage — Werte unverändert.
    krisenvorsorge: {
      // F6 Zug 3 (10.08.2026): Personenzahl bewusst überschrieben (Elisabeth lebt mit Partner UND
      // pflegt zusätzlich — die aus „Meine Menschen" abgeleitete Zahl träfe hier nicht zu).
      ks_bedarf_personen: '3',
      ks_wasser_liter: '20 Liter', ks_wasser_ort: 'Keller, Regal links',
      // F6 Zug 3: text → datum. Die beiden `_frueher`-Rettungsfelder bleiben leer — dieses Depot
      // simuliert den Stand NACH der Migration, nicht davor (das prüft migrations-stufen.js).
      ks_wasser_haltbar: '2027-02-01', ks_wasser_haltbar_frueher: '',
      ks_lebensmittel_was: 'Reis, Nudeln, Konserven, Trockenobst', ks_lebensmittel_ort: 'Speisekammer',
      ks_lebensmittel_haltbar: '2026-12-01', ks_lebensmittel_haltbar_frueher: '',
      ks_taschenlampe: 'vorhanden, Flur-Schrank', ks_kerzen: 'vorhanden, Küchenschublade',
      ks_batterien: 'AA/AAA, Werkzeugkiste', ks_radio: 'Kurbelradio, Abstellkammer',
      ks_powerbank: 'geladen, Schreibtischschublade',
      ks_heizung_notfall: 'Campingkocher + Gaskartuschen, Balkonschrank',
      ks_erstehilfe_ort: 'Bad, Spiegelschrank', ks_erstehilfe_datum: '2026-01-15',
      ks_medikamente_vorrat: 'Schmerzmittel, Fieberzäpfchen, Blutdruckmittel für 2 Wochen',
      ks_rucksack_vorhanden: 'ja', ks_rucksack_ort: 'Flur, neben der Wohnungstür',
      ks_rucksack_liste: 'Ausweise-Kopien, Bargeld, Powerbank, Erste-Hilfe, Medikamente',
      ks_dokumente_vorhanden: 'ja', ks_dokumente_ort: 'Aktenschrank, oberes Fach',
      ks_bargeld_vorhanden: 'ja', ks_bargeld_ort: 'Nicht im Portemonnaie — separates Fach',
      ks_hygiene_liste: 'Zahnpasta, Seife, Toilettenpapier, Desinfektionsmittel',
      ks_hygiene_ort: 'Badschrank, unteres Fach',
      ks_sammelplatz: 'Spielplatz Ecke Bergstraße',
      ks_fluchtweg: 'Treppenhaus, Notausgang Hinterhof bei Blockade',
      ks_ausweichort_2: 'Wohnung der Schwester, Musterstraße 5',
      ks_nachbar: _person('p-tochter'),
      ks_besondere_situation: 'Rollstuhlfahrer, 3. Stock ohne Aufzug',
      ks_feuerwehr_notiz: 'Gasflasche im Keller, Haustier im Schlafzimmer',
    },

    wohnen: {
      // U2-ADR-104: der gemischte Kontakt ist getrennt — Telefon und E-Mail als eigene Felder.
      // Posten 39 (01.08.2026): vermieter/-tel/-email, miete, kaution, mietvertrag_ort und
      // umzug_mietverhaeltnis bleiben bewusst leer, kein Rest — die Hauptwohnung ist Eigentum
      // (wohnung_typ), es gibt strukturell keinen Vermieter/keine Miete zu ihr. Dieselben Felder
      // SIND befüllt bei der Zweitwohnung unten (weitere_wohnungen[1], dort tatsächlich Miete).
      wohnung_typ: 'eigentum', vermieter: _person(''), vermieter_tel: '', vermieter_email: '',
      miete: '', miete_waehrung: '', kaution: '', mietvertrag_ort: '', mietvertrag_befristet_bis: '',
      wohnsituation_bem: 'Eigentumswohnung, 3 Zimmer, 2. Stock, Aufzug vorhanden',
      umzug_mietverhaeltnis: '', umzug_kuendigung: '', umzug_auszug: '', umzug_uebergabe: '',
      weitere_wohnungen: [
        { strasse: 'Seestraße 12', plz_ort: '83209 Prien am Chiemsee', typ: 'eigentum',
          vermieter: _person(''), vermieter_tel: '', vermieter_email: '', miete: '',
          kaution: '', mietvertrag_ort: '', mietvertrag_befristet_bis: '',
          wohnsituation_bem: 'Ferienwohnung, Mai bis Oktober selbst genutzt, sonst über eine Agentur vermietet' },
        { strasse: '', plz_ort: '', typ: 'miete', vermieter: _person('p-vermieter'),
          vermieter_tel: '08051 998877', vermieter_email: 'verwaltung@chiemsee-immo.example',
          miete: '620 EUR warm', kaution: '1.240 EUR (Sparkasse Rosenheim)',
          mietvertrag_ort: '', mietvertrag_befristet_bis: '2027-08-31', wohnsituation_bem: '' },
      ],
    },

    persoenliches: {
      fotos_physisch: 'mehrere Fotoalben im Wohnzimmerschrank, unteres Fach',
      fotos_digital: 'iCloud-Fotos + externe Festplatte im Tresor',
      erinnerungen_sonstiges: 'alte Briefe der Eltern im Sekretär, oberes Fach',
      gegenstaende_wuensche: 'die Standuhr geht an Konstantin-Emanuel; das Klavier an Mia, sobald sie volljährig ist',
      haushalt_spenden: 'Kleidung und Bücher an die Diakonie; der Rest darf entrümpelt werden',
      konflikte_hinweise: 'mit meinem Bruder Reinhard seit Jahren wenig Kontakt, aber kein offener Streit',
      religion: 'evangelisch-lutherisch', seelsorger: _person('p-seelsorger'),
      spirituelle_wuensche: 'Psalm 23 zur Beisetzung; stille, ruhige Musik statt Trauermarsch',
      brief_notarzt: 'Liebe Helferin, lieber Helfer — bitte rufen Sie meine Tochter Mia unter der hinterlegten Nummer an, sie kennt meine Wünsche.',
      brief_krankenhaus: 'Bitte informieren Sie meinen Mann und meine Kinder umgehend. Ich vertraue Ihnen mein Wohl an.',
      brief_pflegeheim: 'Ich mag morgens Kaffee mit wenig Milch, keinen Zucker. Mein Lieblingslied ist „An der schönen blauen Donau".',
      brief_todesfall: 'Bitte feiert mein Leben — trauert nicht zu lange um den Tod. Es war ein gutes, reiches Leben.',
      briefe_ablage: 'Schreibtisch, oberste Schublade rechts, blauer Umschlag',
      sonstiges_persoenlich: 'Ich hoffe, dass meine Familie zusammenhält, auch wenn ich nicht mehr da bin.',
      abhaengige_personen: [
        { wer: 'Mutter Brunhilde (89)', hinweis: 'lebt im Pflegeheim, ich zahle den Eigenanteil und besuche sie wöchentlich' },
        { wer: 'Katze Felix', hinweis: 'Nachbarin füttert bei kurzer Abwesenheit' },
      ],
      persoenliche_briefe: [
        { empfaenger: 'meine Tochter Mia', text: 'Liebe Mia, du warst das größte Geschenk meines Lebens. Bleib neugierig und mutig …' },
        { empfaenger: 'Konstantin-Emanuel', text: 'Lieber Konstantin, ich bin stolz auf den Menschen, der du geworden bist.' },
      ],
      bestattung_art: 'feuer', bestattung_voraus: 'ja',
      bestattung_unternehmen: 'Bestattungshaus Ehrlich & Söhne KG',
      bestattung_ort: 'Familiengrab, Waldfriedhof München', bestattung_vorsorge_nachweis: 'Ordner „Vorsorge", Wohnzimmerschrank',
    },
  };
}

module.exports = { MENSCHEN, INSTITUTIONEN, baueSektoren };
