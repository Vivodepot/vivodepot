#!/usr/bin/env node
'use strict';
/* ══════════════════════════════════════════════════════════════════════════════
   tests-alte-kennungen-finden.js — alte deutsche Kennungen in Testdateien (15.09.2026)
   ──────────────────────────────────────────────────────────────────────────────
   WARUM: in der Kennungs-Kampagne liefen Proben grün, obwohl sie noch alte Kennungen trugen —
   `V.flowEinlesen('mobilitaet')` fand keinen Bereich und prüfte damit etwas Leeres, und das
   Ergebnis sah aus wie ein Beleg („zufällig grün"). Eine Handprüfung von 21 Dateien fand das
   nur an zwei Stellen, die übrigen blieben ungeprüft. Dieses Werkzeug macht daraus eine Liste.

   ES ERSETZT NICHTS. Es liest, klassifiziert und berichtet. Ob eine alte Kennung Absicht ist
   (Migrations-Eingabe, Altdepot-Fixture, Wert, der deutsch bleibt) oder ein Rest, entscheidet
   jemand, der die Probe liest — die Kampagne hat gezeigt, was blindes Ersetzen anrichtet
   (`organspende` → `organDonation`).

   WAS GESUCHT WIRD — nur in String-Literalen, nie in Kommentaren (die tragen die Geschichte
   absichtlich): Quelle ist docs/umbau-englisch-vor-v1/kennung-mapping.json, nur Einträge, deren
   alter Teil vom neuen abweicht.
     qualifiziert  ein Literal ist eine alte Kennung (`identitaet.vorname`,
                   `vorsorge.vorsorge_instrumente/typ`) oder beginnt damit plus `.`
                   (`identitaet.vorname.label`) — fast sicher ein Rest
     bereich       ein Literal ist eine alte Bereichs-ID (`'mobilitaet'`)
     attribut      ein alter Name in `data-edit="…"`, `data-sektor="…"` usw. innerhalb eines Literals
     feld          ein Literal ist ein alter Feld-/Unterfeld-Name (`'vorname'`) — mehrdeutig,
                   `generisch` markiert, wenn der Name kurz oder an mehreren Feldern vergeben ist
   MARKIERUNGEN (kein Filter, nur Einordnung):
     deutschBleibt   der Wert steht in der Ausnahmeliste (Instrument-Typen) oder in DEUTSCH_BLEIBT
     migration       die Datei arbeitet sichtbar mit Altschema (schemaVersion < 81, migriere,
                     depotNormalisieren, Altdepot) — alte Kennungen dort sind oft die Eingabe

   Aufruf:
     node tools/tests-alte-kennungen-finden.js                      → Zusammenfassung über tests/
     node tools/tests-alte-kennungen-finden.js --bericht <datei.json> → alle Treffer als JSON
     --wurzel <ordner> (Default tests/) · --mapping <datei> · --mit-fixtures (sonst ohne tests/fixtures)
   ══════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const MAPPING_PFAD = path.join(REPO, 'docs', 'umbau-englisch-vor-v1', 'kennung-mapping.json');
const AUSNAHMEN_PFAD = path.join(REPO, 'docs', 'umbau-englisch-vor-v1', 'kennung-mapping-ausnahmeliste.md');

/* Werte, die laut Kampagnen-Regeln deutsch bleiben und darum wie alte Kennungen aussehen können
   (Dokumenttypen / Vorlagen-IDs). Die Instrument-Typen kommen zusätzlich aus der Ausnahmeliste. */
const DEUTSCH_BLEIBT = Object.freeze(['organspende', 'testament', 'vorsorgevollmacht', 'patientenverfuegung',
  'betreuungsverfuegung', 'sorgerechtsverfuegung', 'ki-verfuegung']);
const ATTRIBUT_MUSTER = /data-(?:edit|edit-code|edit-ref|edit-override|sektor|feld-liste|feld|iz-sektor|i-auto)="([^"]+)"/g;
const MIGRATION_MUSTER = /schemaVersion\s*[:=]\s*(?:[1-7]\d|80)\b|\bmigriere\b|depotNormalisieren|[Aa]ltdepot|v515|B16|b16/;

// Alte Kennungsteile aus dem Mapping, nur wo alt ≠ neu. Reine Funktion.
function kennungsTabelleBauen(mapping, ausnahmenText = '') {
  const qualifiziert = new Map();   // alte volle Kennung → neue
  const bereiche = new Map();       // alte Bereichs-ID → neue
  const felder = new Map();         // alter Feld-/Unterfeldname → Set neuer Namen
  const feldTraeger = new Map();    // alter Name → Set Träger (für „generisch")
  for (const e of Object.values(mapping)) {
    if (!e || !e.kennungAlt || !e.kennungNeu) continue;
    if (e.kennungAlt !== e.kennungNeu) qualifiziert.set(e.kennungAlt, e.kennungNeu);
    if (e.bereichAlt && e.bereichNeu && e.bereichAlt !== e.bereichNeu) bereiche.set(e.bereichAlt, e.bereichNeu);
    const alt = e.kennungAlt.slice(e.kennungAlt.indexOf('.') + 1);
    const neu = e.kennungNeu.slice(e.kennungNeu.indexOf('.') + 1);
    const altName = alt.includes('/') ? alt.split('/')[1] : alt;
    const neuName = neu.includes('/') ? neu.split('/')[1] : neu;
    if (altName !== neuName) {
      if (!felder.has(altName)) felder.set(altName, new Set());
      felder.get(altName).add(neuName);
      if (!feldTraeger.has(altName)) feldTraeger.set(altName, new Set());
      feldTraeger.get(altName).add(e.kennungAlt);
    }
  }
  // Neue Namen, die zufällig einem alten gleichen, sind keine Reste (z. B. `email`).
  const neueNamen = new Set();
  for (const e of Object.values(mapping)) {
    if (!e || !e.kennungNeu) continue;
    const neu = e.kennungNeu.slice(e.kennungNeu.indexOf('.') + 1);
    neueNamen.add(neu.includes('/') ? neu.split('/')[1] : neu);
  }
  for (const n of neueNamen) felder.delete(n);
  const deutschBleibt = new Set(DEUTSCH_BLEIBT);
  for (const m of String(ausnahmenText).matchAll(/^\|\s*`([a-z_-]+)`\s*\|/gm)) deutschBleibt.add(m[1]);
  return { qualifiziert, bereiche, felder, feldTraeger, deutschBleibt };
}

/* String-Literale eines JS-Quelltexts mit Zeilennummer und Lage — Kommentare übersprungen. Dazu
   `maskiert`: derselbe Text, Kommentare und Literal-INHALTE durch Leerzeichen ersetzt (Längen und
   Zeilen bleiben), damit Code-Stellen ohne Fehltreffer aus Strings gelesen werden können.
   Kein voller Parser: Regex-Literale werden nicht erkannt; ein Anführungszeichen in einem Regex
   kann ein Literal verschieben. Vorlagen-Literale werden an `${` geteilt. */
function literaleUndMaske(quelle) {
  const aus = [];
  const m = quelle.split('');
  const leeren = (von, bis) => { for (let k = von; k < bis; k++) if (m[k] !== '\n') m[k] = ' '; };
  let i = 0, zeile = 1;
  const n = quelle.length;
  while (i < n) {
    const c = quelle[i];
    if (c === '\n') { zeile++; i++; continue; }
    if (c === '/' && quelle[i + 1] === '/') { const a = i; while (i < n && quelle[i] !== '\n') i++; leeren(a, i); continue; }
    if (c === '/' && quelle[i + 1] === '*') {
      const a = i; i += 2;
      while (i < n && !(quelle[i] === '*' && quelle[i + 1] === '/')) { if (quelle[i] === '\n') zeile++; i++; }
      i += 2; leeren(a, Math.min(i, n));
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; let startZeile = zeile; let wert = ''; let start = i; i++;
      let inhaltAb = i;
      while (i < n && quelle[i] !== q) {
        if (quelle[i] === '\\') { wert += quelle[i + 1] || ''; i += 2; continue; }
        if (q === '`' && quelle[i] === '$' && quelle[i + 1] === '{') {
          leeren(inhaltAb, i);
          aus.push({ wert, zeile: startZeile, start });
          wert = '';
          let tiefe = 1; i += 2;
          while (i < n && tiefe) { if (quelle[i] === '{') tiefe++; else if (quelle[i] === '}') tiefe--; if (quelle[i] === '\n') zeile++; i++; }
          start = i - 1; inhaltAb = i; startZeile = zeile;
          continue;
        }
        if (quelle[i] === '\n') { if (q !== '`') break; zeile++; }
        wert += quelle[i]; i++;
      }
      leeren(inhaltAb, i);
      aus.push({ wert, zeile: startZeile, start });
      i++;
      continue;
    }
    i++;
  }
  return { literale: aus, maskiert: m.join('') };
}
function literaleFinden(quelle) { return literaleUndMaske(quelle).literale; }

/* SYNTAX-POSITION eines Feldnamen-Literals (15.09.2026): die Bare-Token-Klasse versteckt
   sich dort, wo ein Name ALS KENNUNG benutzt wird — Objektschlüssel, Punktzugriff, Feldpfad,
   Argument hinter einer Bereichs-ID. Ein Wert-Literal (`typ: 'text'`) ist fast immer harmlos.
     schluessel  `id: 'x'`, `feldId: 'x'`, `['x']`, `.id === 'x'`, `fn(V, 'identity', 'x')`
     wert        `typ: 'x'`, `feldtyp: 'x'`, `rolle: 'x'`, `.typ === 'x'` …
     unklar      alles andere */
const SCHLUESSEL_VOR = /(?:\b(?:id|feldId|feld|unterfeld|unterfeldId|unterFeld|listeId|feldname|kennung|sektorFeld)\s*:\s*|\[\s*|\.(?:id|feldId|unterfeldId)\s*===?\s*|\b(?:feldDefFuer|feldRohwert|setzeFeld|sektorFeld|feldGueltigkeitZeileHTML|_listenUnterfeldDef|listenEintragHinzufuegen)\s*\((?:[^()]*,\s*)?)$/;
const WERT_VOR = /(?:\b(?:typ|feldtyp|rolle|schwelle|kategorie|modulTyp|quelle|wert|label|titel|richtung|art|status|grund)\s*:\s*|\.(?:typ|feldtyp|rolle|schwelle|art|status|grund)\s*[!=]==?\s*)$/;

function positionBestimmen(maskiert, start, bereichsIds) {
  const vor = maskiert.slice(Math.max(0, start - 80), start).replace(/\s+$/, (s) => s);
  if (WERT_VOR.test(vor)) return 'wert';
  if (SCHLUESSEL_VOR.test(vor)) return 'schluessel';
  // Argument direkt hinter einer Bereichs-ID: `fn(V, 'identity', 'x')`. Die Bereichs-ID steht im
  // Original, nicht in der Maske — darum am Rohtext davor geprüft (Aufrufer reicht ihn herein).
  if (bereichsIds && bereichsIds.test(vor)) return 'schluessel';
  return 'unklar';
}

const ZEILEN_STRUKTUR = new Set(['typ', 'art', 'ort']);
const STRUKTURNAMEN = new Set(['text', 'wert', 'gueltig', 'datum', 'nr', 'hinweis', 'anlass', 'richtung', 'notiz',
  'betrag', 'stelle', 'bezeichnung', 'empfaenger', 'behoerde', 'ausgestellt', 'zusatz', 'wer', 'fach', 'karte',
  'bank', 'anmerkung', 'sonstiges', 'betreuung']);
/* Instrument-Werte (deutsch, Optionswerte) — ein `typ: 'testament'` markiert eine Instrument-Zeile. */
const INSTRUMENT_WERTE = /^(?:testament|vorsorgevollmacht|patientenverfuegung|betreuungsverfuegung|sorgerechtsverfuegung|ki-verfuegung|organspende|betreuerbestellung|erbvertrag|bankvollmacht)$/;
/* Empfänger, die Zeilen tragen, gegen solche, die Felddefinitionen tragen. */
const ZEILEN_EMPFAENGER = /^(?:r|e|z|row|zeile|zeilen\[\d+\]|rec|_rec|eintrag|instr|instrument|vi|it|e0|e1|r0|r1|t0|testamentRec|v0)$|\]$/;
const FELD_EMPFAENGER = /^(?:f|feld|def|_def|uf|sek|s|typDef|feldDef|sel|modul|m|opt|o|a|b|d|p|plan|ergebnis|r_?geprueft|antwort)$/;
const ZEILEN_KONTEXT = /provisionInstruments|vorsorge_instrumente|listenEintrag|eintraege|instrument\s*:/;

// Liefert einen Grund, wenn der Treffer eine Instrument-/Listenzeile betrifft, sonst null.
function strukturZeileErkennen(text, maskiert, m, name) {
  const idx = m.index;
  if (m[1]) {   // Objektschlüssel: `typ: 'testament'` oder `art:`/`ort:` im selben Objekt wie eine Instrument-Angabe
    const nach = text.slice(idx + m[0].length, idx + m[0].length + 40).match(/^\s*['"`]([^'"`]+)['"`]/);
    if (name === 'typ' && nach && INSTRUMENT_WERTE.test(nach[1])) return 'typ-mit-instrumentwert';
    const oeffnung = maskiert.lastIndexOf('{', idx);
    const objekt = oeffnung >= 0 ? text.slice(oeffnung, Math.min(text.length, idx + 160)) : '';
    if (/\b(?:typ|instrument)\s*:\s*['"`](?:testament|vorsorgevollmacht|patientenverfuegung|betreuungsverfuegung|sorgerechtsverfuegung|ki-verfuegung)['"`]/.test(objekt)) return 'im-instrument-objekt';
    return null;
  }
  const empfaenger = m[2] || '';
  if (FELD_EMPFAENGER.test(empfaenger)) return null;
  if (ZEILEN_EMPFAENGER.test(empfaenger)) {
    const umfeld = text.slice(Math.max(0, idx - 400), idx + 200);
    if (ZEILEN_KONTEXT.test(umfeld) || /===?\s*['"`](?:testament|vorsorgevollmacht|patientenverfuegung|betreuungsverfuegung)/.test(text.slice(idx, idx + 60))) return 'zeilen-punktzugriff';
  }
  return null;
}

// Alle Treffer einer Datei. Reine Funktion über Text + Tabelle.
function dateiPruefen(text, tabelle) {
  const treffer = [];
  const migration = MIGRATION_MUSTER.test(text);
  const { literale, maskiert } = literaleUndMaske(text);
  const alleBereiche = [...tabelle.bereiche.keys(), ...tabelle.bereiche.values()];
  const bereichVorArgument = new RegExp("['\"](?:" + alleBereiche.map((b) => b.replace(/[-]/g, '\\-')).join('|') + ")['\"]\\s*,\\s*$");
  const generisch = (name) => { const tr = tabelle.feldTraeger.get(name); return name.length <= 4 || (tr && tr.size > 1); };
  const eintragen = (klasse, alt, neu, zeile, literal, extra) => {
    const t = Object.assign({ klasse, alt, neu, zeile, literal: literal.length > 120 ? literal.slice(0, 117) + '…' : literal }, extra || {});
    if (tabelle.deutschBleibt.has(alt)) t.deutschBleibt = true;
    if (migration) t.migration = true;
    if ((klasse === 'feld' || klasse === 'bezeichner' || klasse === 'feldpfad') && generisch(alt)) t.generisch = true;
    treffer.push(t);
  };
  for (const { wert, zeile, start } of literale) {
    if (!wert) continue;
    let qualifiziertGefunden = false;
    if (tabelle.qualifiziert.has(wert)) {
      eintragen('qualifiziert', wert, tabelle.qualifiziert.get(wert), zeile, wert);
      qualifiziertGefunden = true;
    } else {
      const punkt = wert.lastIndexOf('.');
      for (let p = punkt; p > 0; p = wert.lastIndexOf('.', p - 1)) {
        const kopf = wert.slice(0, p);
        if (tabelle.qualifiziert.has(kopf)) {
          eintragen('qualifiziert', kopf, tabelle.qualifiziert.get(kopf) + wert.slice(p), zeile, wert);
          qualifiziertGefunden = true;
          break;
        }
      }
    }
    if (qualifiziertGefunden) continue;
    if (tabelle.bereiche.has(wert)) { eintragen('bereich', wert, tabelle.bereiche.get(wert), zeile, wert); continue; }
    let attributGefunden = false;
    for (const m of wert.matchAll(ATTRIBUT_MUSTER)) {
      const name = m[1];
      if (tabelle.bereiche.has(name)) { eintragen('attribut', name, tabelle.bereiche.get(name), zeile, wert); attributGefunden = true; }
      else if (tabelle.felder.has(name)) { eintragen('attribut', name, [...tabelle.felder.get(name)].join(' | '), zeile, wert); attributGefunden = true; }
    }
    if (attributGefunden) continue;
    if (tabelle.felder.has(wert)) {
      const vorRoh = text.slice(Math.max(0, start - 80), start);
      const position = WERT_VOR.test(maskiert.slice(Math.max(0, start - 80), start)) ? 'wert'
        : (positionBestimmen(maskiert, start, null) === 'schluessel' || bereichVorArgument.test(vorRoh) ? 'schluessel' : 'unklar');
      eintragen('feld', wert, [...tabelle.felder.get(wert)].join(' | '), zeile, wert, { position });
      continue;
    }
    // Feldpfad: `bereich.feld[/unterfeld][.suffix]` mit alter oder neuer Bereichs-ID vorn und
    // einem alten Feldnamen darin, der NICHT schon als qualifiziert erkannt wurde (`identity.vorname`).
    const teile = wert.split(/[./:]/);
    if (teile.length >= 2 && alleBereiche.includes(teile[0])) {
      const alt = teile.slice(1).find((s) => tabelle.felder.has(s));
      if (alt) eintragen('feldpfad', alt, [...tabelle.felder.get(alt)].join(' | '), zeile, wert, { position: 'schluessel' });
    }
  }
  // Bezeichner im CODE (nicht in Literalen): Objektschlüssel `vorname:` und Punktzugriff `.vorname`.
  const zeileVon = (idx) => { let z = 1; for (let k = 0; k < idx; k++) if (text[k] === '\n') z++; return z; };
  const bezeichnerMuster = /(?:(?<![\w$.])([A-Za-z_][\w]*)\s*:(?!:))|(?:([\w$\]\)]*)\.([A-Za-z_][\w]*)\b)/g;
  for (const m of maskiert.matchAll(bezeichnerMuster)) {
    const name = m[1] || m[3];
    if (!tabelle.felder.has(name)) continue;
    /* STRUKTURNAMEN (15.09.2026): `typ`/`art`/`ort` sind zugleich allgemeine Eigenschaften
       (`f.typ` an einer Felddefinition). Gemeldet werden sie NUR an Instrument- und Listenzeilen —
       dort liegt die Bare-Token-Klasse (`r.typ` statt `r.instrument`). Übrige Strukturnamen
       (`text`, `wert`, `gueltig` …) werden als `strukturname` markiert, nicht bewertet. */
    if (ZEILEN_STRUKTUR.has(name)) {
      const z = strukturZeileErkennen(text, maskiert, m, name);
      if (z) eintragen('strukturzeile', name, [...tabelle.felder.get(name)].join(' | '), zeileVon(m.index), m[0].trim(), { position: 'schluessel', grund: z });
      continue;
    }
    // `a ? b : c` — ein Doppelpunkt hinter einem Namen im Dreifach-Operator ist kein Schlüssel.
    if (m[1]) { const davor = maskiert.slice(Math.max(0, m.index - 40), m.index); if (/\?[^:;{}]*$/.test(davor)) continue; }
    eintragen('bezeichner', name, [...tabelle.felder.get(name)].join(' | '), zeileVon(m.index), m[0].trim(),
      Object.assign({ position: 'schluessel', form: m[1] ? 'objektschluessel' : 'punktzugriff' }, STRUKTURNAMEN.has(name) ? { strukturname: true } : {}));
  }
  treffer.sort((a, b) => a.zeile - b.zeile);
  return { migration, treffer };
}

function testDateienSammeln(wurzel, mitFixtures) {
  const aus = [];
  const gehen = (ordner) => {
    for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, eintrag.name);
      if (eintrag.isDirectory()) {
        if (eintrag.name === 'node_modules') continue;
        if (!mitFixtures && eintrag.name === 'fixtures') continue;
        gehen(p);
      } else if (eintrag.name === 'tests-alte-kennungen-finden.test.js') {
        continue;   // die eigene Probe trägt alte Kennungen als erfundene Eingabe — sie zählte sich sonst selbst mit
      } else if (/\.(test|spec)\.(js|mjs)$/.test(eintrag.name) || (/helpers?\.js$/.test(eintrag.name))) {
        aus.push(p);
      }
    }
  };
  gehen(wurzel);
  return aus.sort();
}

function durchsuchen({ wurzel, mappingPfad = MAPPING_PFAD, ausnahmenPfad = AUSNAHMEN_PFAD, mitFixtures = false }) {
  const mapping = JSON.parse(fs.readFileSync(mappingPfad, 'utf8'));
  const ausnahmen = fs.existsSync(ausnahmenPfad) ? fs.readFileSync(ausnahmenPfad, 'utf8') : '';
  const tabelle = kennungsTabelleBauen(mapping, ausnahmen);
  const dateien = [];
  for (const datei of testDateienSammeln(wurzel, mitFixtures)) {
    const r = dateiPruefen(fs.readFileSync(datei, 'utf8'), tabelle);
    if (r.treffer.length) dateien.push({ datei: path.relative(REPO, datei), migration: r.migration, treffer: r.treffer });
  }
  const zaehlung = {};
  for (const d of dateien) for (const t of d.treffer) {
    const schluessel = t.klasse + (t.generisch ? '·generisch' : '') + (t.deutschBleibt ? '·deutschBleibt' : '') + (t.migration ? '·migration' : '');
    zaehlung[schluessel] = (zaehlung[schluessel] || 0) + 1;
  }
  return { dateien, zaehlung };
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const r = durchsuchen({
    wurzel: path.resolve(wert('--wurzel') || path.join(REPO, 'tests')),
    mappingPfad: wert('--mapping') ? path.resolve(wert('--mapping')) : MAPPING_PFAD,
    mitFixtures: argv.includes('--mit-fixtures'),
  });
  const berichtPfad = wert('--bericht');
  if (berichtPfad) fs.writeFileSync(path.resolve(berichtPfad), JSON.stringify(r, null, 2) + '\n', 'utf8');
  const summe = Object.values(r.zaehlung).reduce((a, b) => a + b, 0);
  process.stdout.write('tests-alte-kennungen-finden: ' + summe + ' Treffer in ' + r.dateien.length + ' Dateien\n');
  for (const [k, v] of Object.entries(r.zaehlung).sort((a, b) => b[1] - a[1])) process.stdout.write('  ' + String(v).padStart(5) + '  ' + k + '\n');
  if (berichtPfad) process.stdout.write('Bericht: ' + berichtPfad + '\n');
}

if (require.main === module) main();

module.exports = { kennungsTabelleBauen, literaleFinden, literaleUndMaske, positionBestimmen, dateiPruefen, durchsuchen, DEUTSCH_BLEIBT };
