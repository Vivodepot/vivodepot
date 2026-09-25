#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vorfuehrung-showcase-erzeugen.js — die Vorführung als Produkt (15.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Baut aus `tools/vorfuehrung/showcase-depot.json` (erfundene Beispielperson) die Nutzlast
   für den Kern-Block AB_WERK_SHOWCASE und backt sie auf Wunsch in eine Kopie des Kerns.

   ZWEI SCHRITTE, BEIDE ÜBER DEN ECHTEN KERN, NICHTS VON HAND:
   1. Die Beispieldaten werden über die Schreibwege des Kerns (sektorFeldSetzen,
      listenEintragHinzufuegen, personHinzufuegen, institutionHinzufuegen, chipAusEingabe) in ein
      Vorschau-Depot geschrieben — dieselben Wächter wie bei einer Bürgerin (Listen-Typ,
      Code-Listen-Chips, Verweise). Ein Code, der nicht in den mitgeführten Listen steht, wirft.
   2. Aus dem Ergebnis werden NUR die Inhaltsfelder genommen (dieselbe Liste wie
      `vorschauDatenUebernehmen` im Kern), die Zufalls-ids durch feste ersetzt und die Zeitstempel
      der Urheberschaft entfernt — zwei Läufe ergeben byte-gleiche Nutzlast.

   KENNUNGEN: Die Datei ist in den englischen Feldkennungen des Kerns geschrieben (`identity.givenName`).
   Eine Kennung, die der Kern nicht kennt, wirft — keine Übersetzung, kein Raten.

   REGEL (21.09.2026): DIE VORFÜHRUNG WIRD NIE AUF DEM BLANKEN KERN GEBAUT, SONDERN AUF EINEM ERZEUGTEN PRODUKT
   (`node tools/vier-produkte-erzeugen.js --ziel <ordner>`, dann `<ordner>/privat-de/vivodepot.html`). Das Gerüst wird mit
   jedem Schnitt leerer (S7: Bereichskatalog in der Moduldatei, S8: Deutsch als Sprachmodul); was auf dem blanken Kern baut,
   verliert mit jedem Schnitt mehr — zweimal am 21.09.2026 unsichtbar: erst ohne Text, dann ohne Bereichsfelder. `--produkt`
   ist deshalb Pflicht, und das Werkzeug wirft, wenn ihm ein Kern ohne gebackene Bereichsquellen gegeben wird.

   Aufruf:
     node tools/vorfuehrung-showcase-erzeugen.js --produkt <vivodepot.html eines erzeugten Produkts> --nutzlast [--sprache en]
     node tools/vorfuehrung-showcase-erzeugen.js --produkt <…> --aus <ordner> [--sprache en] [--depot <json>] [--szenen <json>]
       → <ordner>/vivodepot.html (das Produkt mit gebackener Vorführung), dazu sw.js und manifest.webmanifest aus dem Repo
       `--sprache` muss zur Sprache des Produkts passen (privat-de → de, privat-en → en).
       `--depot` und `--szenen` nehmen Beispieldepot und Stationen einer anderen Demo; ohne sie gelten die mitgelieferten.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DATEN_PFAD = path.join(__dirname, 'vorfuehrung', 'showcase-depot.json');
const SZENEN_PFAD = path.join(__dirname, 'vorfuehrung', 'showcase-szenen.json');

const SHOWCASE_BEGIN = '/* AB_WERK_SHOWCASE:BEGIN */';
const SHOWCASE_ENDE = '/* AB_WERK_SHOWCASE:END */';

// Dieselbe Liste wie `vorschauDatenUebernehmen` im Kern — die Nutzlast ist Inhalt, nie Verwaltung.
const INHALTS_FELDER = ['menschen', 'institutionen', 'mappe', 'sektoren', 'situationen', 'codes', 'sensibelFelder', 'schwangerschaften'];

// Das Produkt, auf dem gebaut wird, muss Bereichsquellen gebacken tragen. Der blanke Kern hat die Region leer
// (`Object.freeze([])`); die Vorführung darauf hätte leere Bereiche („Für diesen Bereich sind noch keine Felder spezifiziert").
// Die Probe misst die ERZEUGTE Datei, nicht den Kern im Test-Lader: der lädt die Module von der Platte und wüsste die Felder trotzdem.
function _produktPruefen(produktText) {
  if (typeof produktText !== 'string' || !produktText) {
    throw new Error('Kein Produkt übergeben. Die Vorführung wird nie auf dem blanken Kern gebaut: --produkt <vivodepot.html eines erzeugten Produkts> (node tools/vier-produkte-erzeugen.js).');
  }
  const { AB_WERK_REGIONEN, _regionSpanne } = require('./lib/produkt-text-erzeugen.js');
  const region = AB_WERK_REGIONEN.find((r) => r.kennung === 'AB_WERK_BEREICH_QUELLEN');
  const { innenStart, innenEnde } = _regionSpanne(produktText, region, 'dem übergebenen Produkt');
  const innen = produktText.slice(innenStart, innenEnde).replace(/\s+/g, '');
  if (innen === ('constAB_WERK_BEREICH_QUELLEN=' + region.nativerWert + ';').replace(/\s+/g, '')) {
    throw new Error('Das übergebene Produkt trägt keine gebackenen Bereichsquellen (AB_WERK_BEREICH_QUELLEN leer) — das ist der blanke Kern. Die Vorführung wäre ohne Bereichsfelder. Erst ein Produkt erzeugen: node tools/vier-produkte-erzeugen.js --ziel <ordner>.');
  }
  return produktText;
}

// Die Sprache des Produkts steht in AB_WERK_SPRACHE_PRODUKT (`"sprache":"de"`); der blanke Kern hat dort null.
function _produktSprache(produktText) {
  const { AB_WERK_REGIONEN, _regionSpanne } = require('./lib/produkt-text-erzeugen.js');
  const region = AB_WERK_REGIONEN.find((r) => r.kennung === 'AB_WERK_SPRACHE_PRODUKT');
  const { innenStart } = _regionSpanne(produktText, region, 'dem übergebenen Produkt');
  const m = /"sprache":"([a-z]{2})"/.exec(produktText.slice(innenStart, innenStart + 400));
  return m ? m[1] : null;
}

// Lädt den Kern AUS dem Produkt (nicht den des Repos): nur der weiß, welche Felder die Datei tatsächlich hat.
function _kernAusProdukt(produktText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-vorfuehrung-produkt-'));
  const datei = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(datei, produktText, 'utf8');
  try { return require('../tests/produkt-html-erzeugen.js').kernAus(datei).V; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// 'identity.givenName' → { sektor, feld }; der Kern muss die Kennung kennen.
function _kennungAufloesen(V, kennung) {
  const [sektor, feld] = kennung.split('.');
  if (!V.feldDefFuer(sektor, feld)) throw new Error('Kennung ' + kennung + ' ist dem Kern unbekannt.');
  return { sektor, feld };
}

function _unterfeldPruefen(V, sektor, feld, unter) {
  const def = V.feldDefFuer(sektor, feld);
  if (!(def.unterFelder || []).some((u) => u.id === unter)) {
    throw new Error('Unterfeld ' + sektor + '.' + feld + '/' + unter + ' ist dem Kern unbekannt.');
  }
  return unter;
}

function _wertAufloesen(V, wert, ids) {
  if (Array.isArray(wert)) return wert.map((w) => _wertAufloesen(V, w, ids));
  if (wert && typeof wert === 'object') {
    if (wert.person) {
      const id = ids.person.get(wert.person);
      if (!id) throw new Error('Unbekannte Person „' + wert.person + '" in showcase-depot.json.');
      return { ref: id };
    }
    if (wert.institution) {
      const id = ids.institution.get(wert.institution);
      if (!id) throw new Error('Unbekannte Institution „' + wert.institution + '" in showcase-depot.json.');
      return { ref: id };
    }
    if (wert.codeListe) {
      const chip = V.chipAusEingabe(wert.codeListe, wert.text);
      if (!chip || !chip.code) throw new Error('„' + wert.text + '" steht nicht in der Code-Liste ' + wert.codeListe + ' — kein erfundener Code.');
      return JSON.parse(JSON.stringify(chip));
    }
  }
  return wert;
}

// Ersetzt die Zufalls-ids (uuidV4) durch feste, in Reihenfolge ihres ersten Auftretens.
function _idsFestschreiben(nutzlast) {
  const text = JSON.stringify(nutzlast);
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g;
  const fest = new Map();
  const ersetzt = text.replace(uuid, (u) => {
    if (!fest.has(u)) fest.set(u, 'showcase-' + String(fest.size + 1).padStart(4, '0'));
    return fest.get(u);
  });
  return JSON.parse(ersetzt);
}

function showcaseNutzlastErzeugen({ daten, V } = {}) {
  if (!V) throw new Error('showcaseNutzlastErzeugen: V fehlt. Der Kern kommt aus einem erzeugten Produkt (_kernAusProdukt), nie aus dem blanken Kern.');
  daten = daten || JSON.parse(fs.readFileSync(DATEN_PFAD, 'utf8'));
  if (daten.format !== 'showcaseDepot/1') throw new Error('showcase-depot.json: unbekanntes Format ' + daten.format);
  V.vorschauDepotErzeugen();
  // Die Schreibwege stempeln Urheberschaft — ohne Sitzungs-Akteur werfen sie. Die Beispielperson erklärt sich
  // selbst, wie beim Anlegen eines Depots; die Stempel selbst gehören nicht in die Nutzlast (s. INHALTS_FELDER).
  if (!daten.owner) throw new Error("showcase-depot.json: owner (Name der Beispielperson) fehlt.");
  V.akteurSelbstErklaeren(daten.owner);

  const ids = { person: new Map(), institution: new Map() };
  for (const p of daten.people || []) {
    const { key, ...patch } = p;
    ids.person.set(key, V.personHinzufuegen(patch));
  }
  for (const i of daten.institutions || []) {
    const { key, ...patch } = i;
    ids.institution.set(key, V.institutionHinzufuegen(patch));
  }
  for (const [kennung, roh] of Object.entries(daten.fields || {})) {
    const { sektor, feld } = _kennungAufloesen(V, kennung);
    V.sektorFeldSetzen(sektor, feld, _wertAufloesen(V, roh, ids));
  }
  for (const [kennung, eintraege] of Object.entries(daten.lists || {})) {
    const { sektor, feld } = _kennungAufloesen(V, kennung);
    for (const e of eintraege) {
      const eintrag = {};
      for (const [unterNeu, roh] of Object.entries(e)) {
        eintrag[_unterfeldPruefen(V, sektor, feld, unterNeu)] = _wertAufloesen(V, roh, ids);
      }
      V.listenEintragHinzufuegen(sektor, feld, eintrag);
    }
  }

  const d = V.getData();
  // Jedes Feld besteht die Feldprüfung des Kerns — sonst meldet die Anwendung am Stand „unvollständig oder unstimmig"
  // (am 21.09.2026 gefunden: `instrument: "vorsorgevollmacht"` statt `enduring-power-of-attorney`, vom Erzeuger angenommen).
  const funde = [];
  for (const [sektor, felder] of Object.entries(d.sektoren || {})) {
    for (const [feld, wert] of Object.entries(felder)) {
      const def = V.feldDefFuer(sektor, feld);
      const r = def ? V.feldValidieren(def, wert) : { ok: false, grund: 'kein-feld' };
      if (!r.ok) funde.push(sektor + '.' + feld + ': ' + JSON.stringify(r));
    }
  }
  if (funde.length) throw new Error('Das Beispieldepot besteht die Feldprüfung nicht: ' + funde.join(' | '));
  const nutzlast = {};
  for (const f of INHALTS_FELDER) if (d[f] !== undefined && d[f] !== null) nutzlast[f] = d[f];
  return _idsFestschreiben(JSON.parse(JSON.stringify(nutzlast)));
}

// Die ganze Block-Nutzlast: Beispiel-Depot + Stationen + Texte in EINER Sprache. Geprüft gegen den
// Kern: jede Ansicht muss er kennen, jedes Ziel muss es geben, kein Text darf leer sein.
function vorfuehrungNutzlastErzeugen({ sprache = 'de', szenen, daten, V } = {}) {
  szenen = szenen || JSON.parse(fs.readFileSync(SZENEN_PFAD, 'utf8'));
  if (!V) throw new Error('vorfuehrungNutzlastErzeugen: V fehlt. Der Kern kommt aus einem erzeugten Produkt (--produkt), nie aus dem blanken Kern.');
  if (szenen.format !== 'showcaseSzenen/1') throw new Error('showcase-szenen.json: unbekanntes Format ' + szenen.format);
  const texte = szenen.texte && szenen.texte[sprache];
  if (!texte) throw new Error('showcase-szenen.json: keine Texte für Sprache ' + sprache);
  for (const k of ['streifen', 'tippen', 'leerlaufHinweis', 'weiterAnsehen', 'gesperrt', 'schliessen']) {
    if (typeof texte[k] !== 'string' || !texte[k].trim()) throw new Error('showcase-szenen.json: Text ' + k + ' (' + sprache + ') fehlt.');
  }
  const ansichten = V.VORFUEHRUNG_ANSICHTEN;
  if (!Array.isArray(ansichten)) throw new Error('Der Kern kennt VORFUEHRUNG_ANSICHTEN nicht — ohne AB_WERK_SHOWCASE-Abschnitt keine Vorführung.');
  const stationen = (szenen.stationen || []).map((st, i) => {
    if (!ansichten.includes(st.ansicht)) throw new Error('Station ' + (i + 1) + ': Ansicht „' + st.ansicht + '" kennt der Kern nicht.');
    if (st.ansicht === 'bereich' && !V.SEKTOR_BY_ID[st.ziel]) throw new Error('Station ' + (i + 1) + ': Bereich „' + st.ziel + '" gibt es nicht.');
    if (st.ansicht === 'anlass' && !V.anlassDef(st.ziel)) throw new Error('Station ' + (i + 1) + ': Anlass „' + st.ziel + '" gibt es nicht.');
    const text = st.text && st.text[sprache];
    if (typeof text !== 'string' || !text.trim()) throw new Error('Station ' + (i + 1) + ': Text (' + sprache + ') fehlt.');
    const aus = { ansicht: st.ansicht, text };
    if (st.ziel) aus.ziel = st.ziel;
    if (st.titel && st.titel[sprache]) aus.titel = st.titel[sprache];
    if (st.sekunden) aus.sekunden = st.sekunden;
    return aus;
  });
  if (!stationen.length) throw new Error('showcase-szenen.json: keine Stationen.');
  return {
    format: 'showcase/1', sprache,
    stationSekunden: szenen.stationSekunden, leerlaufSekunden: szenen.leerlaufSekunden, warnSekunden: szenen.warnSekunden,
    texte: Object.assign({}, texte), stationen,
    depot: showcaseNutzlastErzeugen({ daten, V }),
  };
}

function showcaseInKernBacken(kernText, nutzlast) {
  const a = kernText.indexOf(SHOWCASE_BEGIN);
  const b = kernText.indexOf(SHOWCASE_ENDE);
  if (a < 0 || b < a || kernText.indexOf(SHOWCASE_BEGIN, a + 1) >= 0) {
    throw new Error('AB_WERK_SHOWCASE-Marker fehlt, ist doppelt oder beschädigt — Kern-Marker verschoben? Nicht raten, nachsehen.');
  }
  const innen = '\nconst AB_WERK_SHOWCASE = ' + JSON.stringify(nutzlast) + ';\n';
  return kernText.slice(0, a + SHOWCASE_BEGIN.length) + innen + kernText.slice(b);
}

// Die ganze Produktdatei: das erzeugte Produkt (privat-de/-en, pro-de/-en) trägt die Vorführung als Nutzlast.
// Das Produkt bringt Sprachmodul und Bereichsquellen selbst mit; hier kommen nur die Nutzlast und der Service-Worker-Vermerk dazu,
// weil die Vorführung mit sw.js und Manifest im selben Ordner ausgeliefert wird (Offline am Stand).
function vorfuehrungDateiErzeugen({ sprache = 'de', produktText, daten, szenen } = {}) {
  if (!['de', 'en'].includes(sprache)) throw new Error('Sprache de|en, nicht ' + sprache);
  _produktPruefen(produktText);
  const ps = _produktSprache(produktText);
  if (ps && ps !== sprache) throw new Error('Das Produkt ist ' + ps + ', verlangt ist --sprache ' + sprache + ' — dieselbe Sprache für Produkt und Stationstexte.');
  const V = _kernAusProdukt(produktText);
  const nutzlast = vorfuehrungNutzlastErzeugen({ sprache, szenen, daten, V });
  const { _serviceWorkerVorhandenAufText } = require('./lib/produkt-text-erzeugen.js');
  const text = _serviceWorkerVorhandenAufText(showcaseInKernBacken(produktText, nutzlast), true, 'dem übergebenen Produkt');
  return { text, nutzlast };
}

function _argWert(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(name + ' braucht einen Wert.');
  return argv[i + 1];
}

function main(argv) {
  const sprache = _argWert(argv, '--sprache') || 'de';
  const produkt = _argWert(argv, '--produkt');
  const depot = _argWert(argv, '--depot');
  const szenen = _argWert(argv, '--szenen');
  const ziel = _argWert(argv, '--aus');
  if (!produkt) throw new Error('Aufruf: --produkt <vivodepot.html eines erzeugten Produkts> (Pflicht) --nutzlast | --aus <ordner> [--sprache en] [--depot <json>] [--szenen <json>]');
  const produktText = fs.readFileSync(produkt, 'utf8');
  const daten = depot ? JSON.parse(fs.readFileSync(depot, 'utf8')) : undefined;
  const szenenDaten = szenen ? JSON.parse(fs.readFileSync(szenen, 'utf8')) : undefined;
  if (argv.includes('--nutzlast')) {
    _produktPruefen(produktText);
    process.stdout.write(JSON.stringify(vorfuehrungNutzlastErzeugen({ sprache, daten, szenen: szenenDaten, V: _kernAusProdukt(produktText) }), null, 2) + '\n');
    return;
  }
  if (!ziel) throw new Error('Aufruf: --produkt <…> --nutzlast | --aus <ordner> [--sprache en] [--depot <json>] [--szenen <json>]');
  const { text } = vorfuehrungDateiErzeugen({ sprache, produktText, daten, szenen: szenenDaten });
  fs.mkdirSync(ziel, { recursive: true });
  fs.writeFileSync(path.join(ziel, 'vivodepot.html'), text, 'utf8');
  for (const f of ['sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(REPO, f), path.join(ziel, f));
  console.log('Vorführung (' + sprache + ') geschrieben: ' + ziel);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('FEHLER:', e.message); process.exitCode = 1; }
}

module.exports = { showcaseNutzlastErzeugen, vorfuehrungNutzlastErzeugen, vorfuehrungDateiErzeugen, showcaseInKernBacken, SHOWCASE_BEGIN, SHOWCASE_ENDE, INHALTS_FELDER, _produktPruefen, _produktSprache, _kernAusProdukt };
