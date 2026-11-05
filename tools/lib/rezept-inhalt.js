'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   rezept-inhalt.js — was ein Rezept an lesbarem Inhalt und an Sicherheitsfrist trägt (v956, Nachtrag U2-ADR-414)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Die Link-Mail nach einem Kauf, die öffentliche Inhaltsseite und die Artikelseite nennen, was eine
   Fassung enthält und bis wann sie Sicherheitsaktualisierungen bekommt. Eine Liste von Hand veraltet mit
   dem nächsten Modul. Darum entsteht sie hier, aus genau den Modulen, die das Rezept nennt, und geht in
   die signierten Bytes. Eine Funktion für alle: die Auslieferung (`_rezeptBauen`) baut damit, und die
   Signatur baut dasselbe Rezept zum Abgleich nach — dieselbe Funktion, dieselben Bytes.

   `inhalt` (nur zugangsart „verkauft“): { bereiche, dokumente, auszuege, vorlagen, situationen }, je
   Eintrag { id, name }, der Name in der Sprache des Rezepts, die Reihenfolge die des Rezepts. Jede
   Modulart steht in MODULARTEN: einer Liste zugeordnet, oder ausdrücklich ohne Eintrag. Eine unbekannte
   Modulart, ein fehlender Name, ein Logikmodul ohne Zeile in ART oder eine leere Bereichsliste bricht ab,
   bevor etwas hochgeladen wird — die Leseseite (Gateway) schickt ohne diese Angaben keine Link-Mail.
   Ob ein Logikmodul ein Auszug oder eine Vorlage ist und ob ein Dokument nur gelesen wird, sagt NICHT das
   Modul über sich selbst: was im Inhalt eines verkauften Produkts steht, beruht nicht auf einer
   Selbstauskunft (Entscheidung 27.10.2026, vgl. tests/vertrauen-nie-aus-selbstauskunft.test.js). Darum die
   Tabellen ART und NUR_LESEN hier, je Kennung eine Zeile; der Kern bleibt unberührt.

   `sicherheitBis` (jedes Rezept): Monat und Jahr, bis zu dessen Ende Sicherheitsaktualisierungen zugesagt sind.
   § 12 Abs. 4 der Pro-Bedingungen zählt fünf Jahre ab Erscheinen der Fassung. Der Tag des Erscheinens steht
   beim Signieren noch nicht fest, die Bytes müssen es aber schon tragen. Darum: BUILD_DATUM des Kerns plus
   fünf Jahre plus ein Monat Aufschlag (eine längere Zusage ist erlaubt, eine kürzere nicht).
   `erscheinenPruefen` hält am Tag der Auslieferung fest, dass der Aufschlag reicht — liegt sie
   später als im Folgemonat des BUILD_DATUM, bricht kern-ausliefern ab. Aus dem Kern gelesen, nie aus der Uhr:
   Trockenlauf, Signatur und scharfer Lauf ergeben dieselben Bytes.

   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { leseDatum } = require('../../scripts/build-datum-kern.js');

const SICHERHEIT_JAHRE = 5;   // § 12 Abs. 4 Pro-Bedingungen: fünf Jahre ab Erscheinen der Fassung
const AUFSCHLAG_MONATE = 1;   // Erscheinen bis im Folgemonat des BUILD_DATUM ist gedeckt (s. Kopf)
const LISTEN = Object.freeze(['bereiche', 'dokumente', 'auszuege', 'vorlagen', 'situationen']);
const ART_LISTE = Object.freeze({ auszug: 'auszuege', vorlage: 'vorlagen' });
// Je Logikmodul-id: Auszug (stellt Daten des Depots auf ein Blatt) oder Vorlage (Text zum Ergänzen und Unterschreiben).
// Zuordnung nach docs/spezifikation/pro.md, Abschnitt 6. Eine neue id ohne Zeile bricht ab. Die Logikmodule der Berufsmodule
// stehen nicht hier (ihre Kennungen gehören nicht in eine öffentliche Datei): ein Zuschnitt ist laut Produktdefinition Pro plus
// Bereich und Auszug eines Berufsmoduls (tools/lib/vier-produkte.js, PRODUKT-ZUSCHNITTE), also ist das Logikmodul, das über
// `berufsmodulPfade` ins Rezept kommt, ein Auszug — aus der Struktur des Produkts, nicht aus einer Angabe des Moduls.
const ART = Object.freeze({
  'pro-geschaeftsfuehrerin-notfallmappe': 'auszug',
  'pro-auszug-steuerberatung': 'auszug', 'pro-auszug-bank': 'auszug', 'pro-auszug-nachfolge': 'auszug',
  'erbschein-vorbereitung': 'auszug', 'zugang-zum-recht-beratungshilfe': 'auszug',
  'pro-vorlage-kunden-informieren': 'vorlage', 'pro-vorlage-belegschaft-informieren': 'vorlage',
  'pro-vorlage-vollmacht-betrieb': 'vorlage', 'pro-vorlage-uebergabeprotokoll': 'vorlage',
});
// Dokumente, die ein Produkt nur liest (ältere Dateien), nicht anbietet: kein Eintrag. pvBmj in Pro: P2 d950f48da,
// docs/spezifikation/pro.md:37, Entscheidung 27.10.2026. Ein angebotenes Dokument ohne Namensquelle bricht ab.
const NUR_LESEN = Object.freeze(['pvBmj']);

function _lesen(datei) { return JSON.parse(fs.readFileSync(datei, 'utf8')); }

function _text(wert, sprache) {
  if (typeof wert === 'string') return wert.trim();
  if (wert && typeof wert === 'object' && typeof wert[sprache] === 'string') return wert[sprache].trim();
  return '';
}

function _name(text, wo) {
  if (!text) throw new Error('Rezept-Inhalt: ' + wo + ' trägt keinen lesbaren Namen — NICHTS hochgeladen.');
  return text;
}

// Je Modulart: welche Einträge sie zum Inhalt beiträgt. `null` = trägt ausdrücklich nichts bei (Technik, Kataloge, Texte).
const MODULARTEN = Object.freeze({
  bereich: (m, k) => Object.entries(m.bereiche || {}).map(([id, b]) => ({ liste: 'bereiche', id,
    name: _name(_text(k.texte[id + '.label'], k.sprache) || _text(b.label, k.sprache), k.datei + ' Bereich ' + id) })),
  bereichsErsatz: (m, k) => Object.entries(m.neu || {}).map(([id, b]) => ({ liste: 'bereiche', id,
    name: _name(_text(k.texte[id + '.label'], k.sprache) || _text(b.label, k.sprache), k.datei + ' Bereich ' + id) })),
  logikModul: (m, k) => {
    const liste = ART_LISTE[ART[m.id] || (k.berufsmodul ? 'auszug' : undefined)];
    if (!liste) throw new Error('Rezept-Inhalt: ' + k.datei + ' (id ' + m.id + ') steht nicht in der Tabelle ART von tools/lib/rezept-inhalt.js — Auszug oder Vorlage? NICHTS hochgeladen.');
    return [{ liste, id: m.id, name: _name(_text(m.titel, k.sprache), k.datei) }];
  },
  vorlage: (m, k) => [{ liste: 'vorlagen', id: m.id || path.basename(k.datei, '.json'), name: _name(_text(m.titel, k.sprache), k.datei) }],
  situation: (m, k) => Object.entries(m.situationen || {}).map(([id, s]) => ({ liste: 'situationen', id,
    name: _name(_text(s.titel, k.sprache), k.datei + ' Situation ' + id) })),
  dokumente: (m, k) => {
    const angeboten = Object.keys(m.dokumente || {}).filter((id) => !NUR_LESEN.includes(id));
    if (!angeboten.length) return [];
    throw new Error('Rezept-Inhalt: ' + k.datei + ' bietet Dokumente an (' + angeboten.join(', ') + '), aber kein Modul nennt ihren Namen — NICHTS hochgeladen.');
  },
  textsatz: null, erscheinungsbild: null, bereicheBekannt: null, bereicheBenennen: null, bereicheNativ: null,
  rechtsraum: null, 'ips-begleittext': null, sprachangebot: null,
  // U2-ADR-507 (Nachtrag 29.10.2026): die Bauplan-Ergänzung geht im Rechtsraum-Modul auf, der KI-Korpus ist Wortlaut eines Dokuments,
  // dessen Namen das Dokumentmodul trägt — beide tragen nichts bei.
  rechtsraumBauplan: null, kiKorpus: null,
});

// Die Module eines Produkts in der Reihenfolge des Rezepts (s. `_rezeptBauen`): Bereichsersatz, Pro-Modul, Bereiche,
// dann `modulPfade`, dann die Vorlage und die Templates. Sprachmodul und die übrigen Einzelzutaten tragen nichts bei.
function _modulDateien(produkt) {
  return [produkt.bereichsErsatzPfad, produkt.proModulPfad, produkt.bereicheBekanntPfad, produkt.bereicheBenennenPfad,
    ...(produkt.modulPfade || []), produkt.vorlagenPfad, ...(produkt.templatePfade || [])].filter(Boolean);
}

function rezeptInhaltBauen(produkt) {
  if (!produkt.sprachModulPfad) throw new Error('Rezept-Inhalt „' + produkt.slug + '“: ohne Sprachmodul keine lesbaren Namen — NICHTS hochgeladen.');
  const sprachmodul = _lesen(produkt.sprachModulPfad);
  const sprache = produkt.sprache || sprachmodul.sprache;
  const inhalt = Object.fromEntries(LISTEN.map((l) => [l, []]));
  for (const datei of _modulDateien(produkt)) {
    const m = _lesen(datei);
    if (!Object.prototype.hasOwnProperty.call(MODULARTEN, m.modulTyp)) {
      throw new Error('Rezept-Inhalt „' + produkt.slug + '“: ' + path.basename(datei) + ' hat die Modulart „' + m.modulTyp
        + '“, die tools/lib/rezept-inhalt.js nicht kennt — einer Liste zuordnen oder ausdrücklich ohne Eintrag führen. NICHTS hochgeladen.');
    }
    const beitrag = MODULARTEN[m.modulTyp];
    if (!beitrag) continue;
    const berufsmodul = (produkt.berufsmodulPfade || []).includes(datei);
    for (const { liste, id, name } of beitrag(m, { texte: sprachmodul.texte || {}, sprache, datei: path.basename(datei), berufsmodul })) {
      if (!inhalt[liste].some((e) => e.id === id)) inhalt[liste].push({ id, name });
    }
  }
  if (!inhalt.bereiche.length) throw new Error('Rezept-Inhalt „' + produkt.slug + '“: keine Bereiche — NICHTS hochgeladen.');
  return inhalt;
}

function _monat(datum, wo) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(datum || ''));
  if (!m) throw new Error('Rezept: ' + wo + ' „' + datum + '“ ist kein Datum — NICHTS hochgeladen.');
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}
function _alsMonat(n) { return Math.floor(n / 12) + '-' + String(n % 12 + 1).padStart(2, '0'); }

function sicherheitBisAusBuildDatum(buildDatum) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(buildDatum || ''))) throw new Error('Rezept: BUILD_DATUM „' + buildDatum + '“ ist kein Datum JJJJ-MM-TT — NICHTS hochgeladen.');
  return _alsMonat(_monat(buildDatum, 'BUILD_DATUM') + SICHERHEIT_JAHRE * 12 + AUFSCHLAG_MONATE);
}

// Am Tag des Erscheinens (Auslieferung): reicht die zugesagte Frist für fünf Jahre ab heute? Sonst Abbruch.
function erscheinenPruefen(sicherheitBis, erscheinungstag) {
  const noetig = _monat(erscheinungstag, 'Erscheinungstag') + SICHERHEIT_JAHRE * 12;
  if (noetig > _monat(sicherheitBis, 'sicherheitBis')) {
    throw new Error('Rezept: erscheint am ' + erscheinungstag + ', zugesagt sind Sicherheitsaktualisierungen nur bis ' + sicherheitBis
      + ' — fünf Jahre ab Erscheinen (§ 12 Abs. 4) wären bis ' + _alsMonat(noetig) + '. Kern mit neuem BUILD_DATUM ausliefern. NICHTS hochgeladen.');
  }
}

function sicherheitBisAusKern(kernText) {
  return sicherheitBisAusBuildDatum(leseDatum(kernText));
}

module.exports = { rezeptInhaltBauen, sicherheitBisAusBuildDatum, sicherheitBisAusKern, erscheinenPruefen, AUFSCHLAG_MONATE, MODULARTEN, LISTEN, ART, NUR_LESEN, SICHERHEIT_JAHRE };
