'use strict';
/* formpruefung-faelle.js -- gemeinsame Faelle fuer die Formpruefung (12.10.2026)
   Kalendertag im Fenster (gegen einen Eingang, Tag gegen Tag in UTC) und Felder in fester Form (abweisen statt
   bereinigen). Der Abschnitt zwischen den beiden Marken ist die EINE Quelle; eine zweite Stelle kopiert ihn
   byte-gleich, statt eigene Faelle zu fuehren. Diese Datei ist reines ASCII: ein Editor, der Zeichen still
   normalisiert, haette sonst andere Faelle erzeugt, als hier stehen (tests/studio-einreichung-ein-format.test.js
   haelt das). Sechs Faelle tragen zwei Gruende zugleich; sie legen die Reihenfolge der Pruefung fest.
   LIEGEZEIT (Abschnitt liegezeit): 14 Tage sind eine SETZUNG, kein hergeleiteter Wert. Sie gilt nur an der Stelle, die
   nachrechnet, gegen deren eigene Uhr; die annehmende Stelle wendet sie nicht an. */
/* ==FORMPRUEFUNG_FAELLE:BEGIN== */
const FORMPRUEFUNG_FAELLE = Object.freeze({
 "beschreibung": "Gemeinsame Faelle fuer die Formpruefung: Kalendertag im Fenster und Felder in fester Form. Jede Stelle, die diese Regeln anwendet, faehrt dieselben Faelle. Jedes Zeichen ausserhalb von ASCII steht als geschriebene Escape-Folge, nie roh.",
 "fenster": {
  "zurueckTage": 30,
  "vorausTage": 1,
  "vergleich": "Kalendertag gegen Kalendertag in UTC, gegen den Eingang, Grenzen eingeschlossen"
 },
 "reihenfolgeDerGruende": [
  "leer",
  "zeilenvorschub",
  "steuerzeichen",
  "randleerraum",
  "nicht-nfc",
  "spitze-klammer"
 ],
 "satzBeiAbweisung": "Antragsdatei bitte neu erzeugen.",
 "ausstelltag": [
  {
   "tag": "2026-10-12",
   "eingang": "2026-10-12T09:30:00.000Z",
   "soll": "gilt",
   "was": "derselbe Tag"
  },
  {
   "tag": "2026-10-11",
   "eingang": "2026-10-12T09:30:00.000Z",
   "soll": "gilt",
   "was": "1 Tag zur\u00fcck"
  },
  {
   "tag": "2026-09-12",
   "eingang": "2026-10-12T09:30:00.000Z",
   "soll": "gilt",
   "was": "30 Tage zur\u00fcck, Grenze"
  },
  {
   "tag": "2026-09-11",
   "eingang": "2026-10-12T09:30:00.000Z",
   "soll": "zu-alt",
   "was": "31 Tage zur\u00fcck"
  },
  {
   "tag": "2026-10-13",
   "eingang": "2026-10-12T09:30:00.000Z",
   "soll": "gilt",
   "was": "1 Tag voraus, Grenze"
  },
  {
   "tag": "2026-10-14",
   "eingang": "2026-10-12T09:30:00.000Z",
   "soll": "in-der-zukunft",
   "was": "2 Tage voraus"
  },
  {
   "tag": "2026-09-12",
   "eingang": "2026-10-12T00:00:00.000Z",
   "soll": "gilt",
   "was": "Eingang am Tagesanfang UTC"
  },
  {
   "tag": "2026-09-12",
   "eingang": "2026-10-12T23:59:59.999Z",
   "soll": "gilt",
   "was": "Eingang am Tagesende UTC"
  },
  {
   "tag": "2026-09-12",
   "eingang": "2026-10-13T00:00:00.000Z",
   "soll": "zu-alt",
   "was": "Eingang einen Augenblick sp\u00e4ter: n\u00e4chster Tag"
  },
  {
   "tag": "2026-09-12",
   "eingang": "2026-10-13T01:00:00+02:00",
   "soll": "gilt",
   "was": "Eingang mit Zeitzone: in UTC noch der 12."
  },
  {
   "tag": "2026-12-05",
   "eingang": "2027-01-04T10:00:00Z",
   "soll": "gilt",
   "was": "30 Tage \u00fcber den Jahreswechsel"
  },
  {
   "tag": "2026-12-04",
   "eingang": "2027-01-04T10:00:00Z",
   "soll": "zu-alt",
   "was": "31 Tage \u00fcber den Jahreswechsel"
  },
  {
   "tag": "2027-01-01",
   "eingang": "2026-12-31T23:00:00Z",
   "soll": "gilt",
   "was": "1 Tag voraus \u00fcber den Jahreswechsel"
  },
  {
   "tag": "2028-02-29",
   "eingang": "2028-03-30T08:00:00Z",
   "soll": "gilt",
   "was": "Schalttag, 30 Tage zur\u00fcck"
  },
  {
   "tag": "2028-02-29",
   "eingang": "2028-03-31T08:00:00Z",
   "soll": "zu-alt",
   "was": "Schalttag, 31 Tage zur\u00fcck"
  },
  {
   "tag": "2028-03-01",
   "eingang": "2028-02-29T08:00:00Z",
   "soll": "gilt",
   "was": "1 Tag voraus vom Schalttag"
  }
 ],
 "keinKalendertag": [
  "2026-02-30",
  "2027-02-29",
  "2026-13-01",
  "2026-00-10",
  "2026-10-00",
  "2026-10-32",
  "26-10-12",
  "2026-10-12T00:00:00Z",
  "12.10.2026",
  " 2026-10-12",
  "2026-10-12 ",
  ""
 ],
 "gebunden": [
  {
   "wert": "Stadt Musterhausen",
   "soll": "gilt",
   "was": "ASCII mit Leerzeichen im Inneren"
  },
  {
   "wert": "Caf\u00e9",
   "soll": "gilt",
   "was": "NFC"
  },
  {
   "wert": "A\u00f6R / K.d.\u00f6.R.",
   "soll": "gilt",
   "was": "Umlaut, Schr\u00e4gstrich, Punkt"
  },
  {
   "wert": "Amt\u00a0f\u00fcr Soziales",
   "soll": "gilt",
   "was": "gesch\u00fctztes Leerzeichen im Inneren"
  },
  {
   "wert": "DE",
   "soll": "gilt",
   "was": "Kennung"
  },
  {
   "wert": "oeffentliche-stelle",
   "soll": "gilt",
   "was": "Kennung"
  },
  {
   "wert": "\u6771\u4eac\u90fd",
   "soll": "gilt",
   "was": "au\u00dferhalb des lateinischen Alphabets"
  },
  {
   "wert": "a",
   "soll": "gilt",
   "was": "ein Zeichen"
  },
  {
   "wert": "Zeile1\nZeile2",
   "soll": "zeilenvorschub",
   "was": "LF"
  },
  {
   "wert": "Zeile1\r\nZeile2",
   "soll": "zeilenvorschub",
   "was": "CR LF"
  },
  {
   "wert": "a\u2028b",
   "soll": "zeilenvorschub",
   "was": "U+2028"
  },
  {
   "wert": "a\u2029b",
   "soll": "zeilenvorschub",
   "was": "U+2029"
  },
  {
   "wert": "a\u0085b",
   "soll": "zeilenvorschub",
   "was": "U+0085"
  },
  {
   "wert": "a\u0000b",
   "soll": "steuerzeichen",
   "was": "U+0000"
  },
  {
   "wert": "a\tb",
   "soll": "steuerzeichen",
   "was": "Tab"
  },
  {
   "wert": "a\u001fb",
   "soll": "steuerzeichen",
   "was": "U+001F"
  },
  {
   "wert": "a\u007fb",
   "soll": "steuerzeichen",
   "was": "U+007F"
  },
  {
   "wert": "a\u009fb",
   "soll": "steuerzeichen",
   "was": "U+009F"
  },
  {
   "wert": " Amt",
   "soll": "randleerraum",
   "was": "Leerzeichen vorn"
  },
  {
   "wert": "Amt ",
   "soll": "randleerraum",
   "was": "Leerzeichen hinten"
  },
  {
   "wert": "\u00a0Amt",
   "soll": "randleerraum",
   "was": "U+00A0 vorn"
  },
  {
   "wert": "Amt\u00a0",
   "soll": "randleerraum",
   "was": "U+00A0 hinten"
  },
  {
   "wert": "\ufeffAmt",
   "soll": "randleerraum",
   "was": "U+FEFF vorn"
  },
  {
   "wert": "Amt\u3000",
   "soll": "randleerraum",
   "was": "U+3000 hinten"
  },
  {
   "wert": "Cafe\u0301",
   "soll": "nicht-nfc",
   "was": "e + U+0301"
  },
  {
   "wert": "A\u030angstro\u0308m",
   "soll": "nicht-nfc",
   "was": "zwei zerlegte Zeichen"
  },
  {
   "wert": " a\nb",
   "soll": "zeilenvorschub",
   "was": "zwei Gr\u00fcnde: Zeilenvorschub geht vor Randleerraum"
  },
  {
   "wert": "a\n\u0000b",
   "soll": "zeilenvorschub",
   "was": "zwei Gr\u00fcnde: Zeilenvorschub geht vor Steuerzeichen"
  },
  {
   "wert": "\tAmt",
   "soll": "steuerzeichen",
   "was": "zwei Gr\u00fcnde: Steuerzeichen geht vor Randleerraum"
  },
  {
   "wert": "Cafe\u0301\u0007",
   "soll": "steuerzeichen",
   "was": "zwei Gr\u00fcnde: Steuerzeichen geht vor nicht NFC"
  },
  {
   "wert": " Cafe\u0301",
   "soll": "randleerraum",
   "was": "zwei Gr\u00fcnde: Randleerraum geht vor nicht NFC"
  },
  {
   "wert": "",
   "soll": "leer",
   "was": "leerer Wert"
  },
  {
   "wert": "Amt <Mitte>",
   "soll": "spitze-klammer",
   "was": "beide spitzen Klammern"
  },
  {
   "wert": "a<b",
   "soll": "spitze-klammer",
   "was": "nur die oeffnende"
  },
  {
   "wert": "a>b",
   "soll": "spitze-klammer",
   "was": "nur die schliessende"
  },
  {
   "wert": "Cafe\u0301 <b>",
   "soll": "nicht-nfc",
   "was": "zwei Gruende: nicht NFC geht vor spitzer Klammer"
  }
 ],
 "liegezeit": {
  "tage": 14,
  "art": "Setzung, kein hergeleiteter Wert: deckt die Zeit bis zum ersten Abholen und Nachrechnen",
  "vergleich": "Eingang gegen die Uhr der pruefenden Stelle, Kalendertag gegen Kalendertag in UTC, Grenzen eingeschlossen: hoechstens 1 Tag voraus, hoechstens 14 Tage zurueck",
  "hoechstesAlterEinesNachweisesTage": 44,
  "eingang": [
   {
    "uhr": "2026-10-26T12:00:00.000Z",
    "eingang": "2026-10-12T09:30:00.000Z",
    "soll": "gilt",
    "was": "Eingang 14 Tage zurueck, Grenze"
   },
   {
    "uhr": "2026-10-26T12:00:00.000Z",
    "eingang": "2026-10-11T09:30:00.000Z",
    "soll": "eingang-zu-alt",
    "was": "Eingang 15 Tage zurueck"
   },
   {
    "uhr": "2026-10-26T12:00:00.000Z",
    "eingang": "2026-10-27T09:30:00.000Z",
    "soll": "gilt",
    "was": "Eingang 1 Tag voraus, Grenze"
   },
   {
    "uhr": "2026-10-26T12:00:00.000Z",
    "eingang": "2026-10-28T09:30:00.000Z",
    "soll": "eingang-in-der-zukunft",
    "was": "Eingang 2 Tage voraus"
   }
  ],
  "ausstelltagUeberBeideFenster": [
   {
    "uhr": "2026-10-26T12:00:00.000Z",
    "eingang": "2026-10-12T09:30:00.000Z",
    "tag": "2026-09-12",
    "soll": "gilt",
    "was": "Nachweis 44 Tage alt: 14 Tage Liegezeit und 30 Tage Fenster, beide Grenzen"
   },
   {
    "uhr": "2026-10-26T12:00:00.000Z",
    "eingang": "2026-10-12T09:30:00.000Z",
    "tag": "2026-09-11",
    "soll": "zu-alt",
    "was": "Nachweis 45 Tage alt"
   }
  ]
 },
 "nachweisZeilen": {
  "stand": "KANDIDAT. Bestaetigt ist bisher nur die RECHNUNG, zweimal unabhaengig aus denselben Werten (einmal an der pruefenden Stelle, einmal an der annehmenden), jeweils mit einem Lesewerkzeug, nicht mit dem Code, der die Zeilen im Betrieb bildet. FEST wird das Beispiel erst, wenn die gemeinsame Bibliothek fuer die Zeilen am Kanon liegt und das Studio die Zeilen mit ihr gebildet hat. Signiert wird hier nichts.",
  "trenner": "LF zwischen den Zeilen, kein LF am Ende, UTF-8, kein BOM",
  "angaben": {
   "zeilen": [
    "vivodepot-herausgeber-angaben/1",
    "institution/stadtwerke-musterstadt-de",
    "Stadtwerke Musterstadt",
    "Deutschland",
    "A\u00f6R",
    "Am Markt 1",
    "12345",
    "Musterstadt",
    "ohne-ust-idnr",
    "ohne-rechtsraum"
   ],
   "bedeutung": [
    "Kennung",
    "anbieterTyp",
    "name",
    "land",
    "rechtsform",
    "strasse",
    "plz",
    "ort",
    "ustIdNr oder Platzhalter",
    "rechtsraum oder Platzhalter"
   ],
   "sha256": "f331a4624f635c7fac128ef0174eb41c50cce4568ddac323b5a08f6d4ef3a704",
   "mitUstIdNrUndRechtsraum": {
    "ustIdNr": "DE123456789",
    "rechtsraum": "DE",
    "sha256": "902dfaffaaad38633330800ffc8c592509ac0463e33e7fe1792d39728194e533"
   }
  },
  "zertifikat": {
   "zeilen": [
    "vivodepot-herausgeber-besitznachweis/2",
    "0123456789abcdef0123456789abcdef",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "f331a4624f635c7fac128ef0174eb41c50cce4568ddac323b5a08f6d4ef3a704",
    "c4dc344096a453cff01e1682",
    "2026-10-12",
    "ohne-vorlage"
   ],
   "laengeBytes": 229,
   "sha256": "387b3482750947d19f03941ed4650e2c1ccf8f5ab9e29821ef6660897c111121"
  },
  "vorlage": {
   "zeilen": [
    "vivodepot-herausgeber-besitznachweis/2",
    "0123456789abcdef0123456789abcdef",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "f331a4624f635c7fac128ef0174eb41c50cce4568ddac323b5a08f6d4ef3a704",
    "c4dc344096a453cff01e1682",
    "2026-10-12",
    "a8313dd6a56e11da42a6df2e755200cf8a53a413cf8834caf88838216bfe9f7d"
   ],
   "laengeBytes": 281,
   "sha256": "bd7645bf33b6f71b8960e8e8dba2785e65226e8b44a665e4687b10aa231a0d0b"
  },
  "bedeutungDerZeilen": [
   "Kennung des Nachweises",
   "antragId",
   "Fingerabdruck des Schluessels",
   "Fingerabdruck der Angaben",
   "konto",
   "ausstelltag",
   "SHA-256 der Vorlage oder Platzhalter"
  ]
 },
 "rechtsraum": {
  "regel": "freiwillig; wenn vorhanden: nur Grossbuchstaben A bis Z, zwei bis acht Zeichen; nichts wird entfernt oder umgeschrieben. Fehlt er, steht in den Angaben-Zeilen der Platzhalter; der Platzhalter selbst ist kein Rechtsraum.",
  "platzhalter": "ohne-rechtsraum",
  "faelle": [
   { "wert": "DE", "soll": "gilt", "was": "zwei Grossbuchstaben" },
   { "wert": "EU", "soll": "gilt", "was": "zwei Grossbuchstaben, kein Staat" },
   { "wert": "ABCDEFGH", "soll": "gilt", "was": "acht Zeichen: obere Grenze" },
   { "wert": "de", "soll": "faellt", "was": "klein geschrieben; wird nicht gross gemacht" },
   { "wert": "DE-BY", "soll": "faellt", "was": "mit Bindestrich" },
   { "wert": "ABCDEFGHI", "soll": "faellt", "was": "neun Zeichen" },
   { "wert": "D", "soll": "faellt", "was": "ein Zeichen" },
   { "wert": "", "soll": "faellt", "was": "leer: ein leerer Wert ist nicht dasselbe wie ein fehlender" },
   { "wert": " DE", "soll": "faellt", "was": "Leerraum am Rand; wird nicht abgeschnitten" },
   { "wert": "ohne-rechtsraum", "soll": "faellt", "was": "der Platzhalter selbst" }
  ]
 },
 "nutzlast": {
  "hoechstBytes": 1048576,
  "gemessenAn": "der ganzen Antragsdatei, wie sie gesendet wird (Bytes), nicht an der Vorlage darin",
  "faelle": [
   { "bytes": 1048576, "soll": "gilt", "was": "genau an der Grenze" },
   { "bytes": 1048577, "soll": "faellt", "was": "ein Byte darueber" }
  ]
 },
 "konto": {
  "rechnung": "Rand abschneiden (trim), klein schreiben, UTF-8, SHA-256, die ersten 24 Hex-Zeichen",
  "faelle": [
   {
    "eingabe": "  Register@Beispiel-Einrichtung.example ",
    "konto": "c4dc344096a453cff01e1682",
    "was": "rohe Eingabe mit Rand und Grossbuchstaben"
   },
   {
    "eingabe": "register@beispiel-einrichtung.example",
    "konto": "c4dc344096a453cff01e1682",
    "was": "bereinigte Form: dasselbe Konto"
   },
   {
    "eingabe": "register@beispiel-einrichtung.example.",
    "konto": "5e82a8be9fc5b7341c1e4437",
    "was": "ein Zeichen mehr: ein anderes Konto"
   }
  ]
 }
});
/* ==FORMPRUEFUNG_FAELLE:END== */
module.exports = { FORMPRUEFUNG_FAELLE };
