#!/usr/bin/env node
'use strict';
/* modul-text-lese-app-ausgabe-messen.js — welche Kennungen aus einem Sprachmodul gibt die Lese-App wirklich aus?
   Grundsatz (19.09.2026): Was ein Modul mitbringt und die Lese-App zeigt, muss aus dem Modul kommen können.
   Gemessen wird ein Lauf der Lese-App selbst, keine Liste von Hand: `textLesen` schreibt jede angefragte Kennung mit, dann werden alle eingebauten
   Bereiche, die Pro-Bereichsmodule, die Logikmodule (Erbschein, Beratungshilfe), die Situationsblätter und die Seitenleiste gerendert, in einem Durchgang je
   Optionsnummer (jedes Auswahlfeld zeigt der Reihe nach jede Option). Jede Kern-Kennung (`tools/textsatz-de-modul.json`, ohne `strings:`) landet in
   genau einer Klasse:
     gelesen        — die Lese-App hat sie angefragt (in Ordnung, wenn sie sie auch annimmt)
     fest           — die Lese-App zeigt den Text, fragt aber nie an (Katalog-Option, ja/nein-Unterfeld-Beschriftung, Einführungstext …)
     gruppe         — nicht angefragt und mit Grund nicht angezeigt (Grundlinie: `tools/modul-text-lese-app-grundlinie.json`)
     unklar         — keins davon: neue Familie ohne Grund
   Verstöße: `abgewiesen` (angefragt, aber beim Einlassen verworfen), `fest`, `unklar`, `nichtImKern` (die Lese-App fragt eine Kennung an, die der Kern nicht hat).
   Aufruf: node tools/modul-text-lese-app-ausgabe-messen.js [--grundlinie-schreiben] */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LESEN_QUELLE = path.join(REPO, 'vivodepot-lesen.html');
const GRUNDLINIE = path.join(__dirname, 'modul-text-lese-app-grundlinie.json');
const ANFANG = 'function textLesen(kennung) {';

/* Die Gründe, aus denen eine Kern-Kennung in der Lese-App nie erscheint. Reihenfolge zählt: die erste passende Regel gilt. */
const GRUPPEN = [
  ['situationsblaetter', /^situation:/, 'Situationsblätter (Bauteil 3, eigener Zweig): Beispiele werden nie angezeigt; die übrigen Texte sinken, sobald die Blätter über textLesen laufen'],
  ['assistenten', /^wizard:/, 'Assistenten des Kerns; die Lese-App hat keine Eingabe'],
  ['dokumentgenerator', /^dok:(patientenverfuegung|vorsorgevollmacht|betreuungsverfuegung|ki-verfuegung)/, 'Dokumentgenerator des Kerns; die Lese-App hat keine Dokumentansicht'],
  ['dokumenttext-art', /^dok:/, 'Textart eines Logikmoduls, die die Lese-App nie liest (Einleitung, Unterschrift-Hinweis, Fußtext, Toolbar-Hinweis)'],
  ['vollmacht-formular', /^(vollmacht:|vollmachtBmj|pvBmj|kiKorpus)/, 'Vollmacht-Formular und Korpus des Kerns'],
  ['feldgruppen', /^(feldgruppe|feld\.)/, 'Feldgruppen und Vorschlagslisten des Kerns (Eingabe)'],
  ['katalog-kern', /^(institutionsArt|institutionsFeld|anlass:|cluster:|dokument\.)/, 'Kern-Kataloge: Institutionen, Anlässe, Dokumentliste'],
  ['hilfe-themen', /^hilfe:/, 'Hilfe-Themen des Kerns (Hilfe-Overlay, U2-ADR-425); die Lese-App führt für die Empfängerin eine eigene kurze Hilfe aus strings: und zeigt diese Themen nie'],
  ['menschen-register', /^menschenRegister/, 'Beschriftung der Eingabemaske des Menschen-Registers'],
  ['hinweis-beispiel', /\.(hint|beispiel)$/, 'Hinweis und Beispiel gehören zur Eingabemaske; die Lese-App zeigt sie nie'],
  ['seitenleiste', /\.navUnterzeile$/, 'Unterzeile der Kern-Seitenleiste'],
];
const GRUPPE_UNTERFELD = ['unterfeld-beschriftung', 'Beschriftung eines Listen-Unterfelds; die Lese-App zeigt sie nur bei ja/nein-Optionen'];
const GRUPPE_KERN_FELD = ['feld-nur-im-kern', 'Feld oder Sektion, die die Lese-App nicht führt'];

function ladeLese(quelle) {
  const text = quelle == null ? fs.readFileSync(LESEN_QUELLE, 'utf8') : quelle;
  if (!text.includes(ANFANG)) throw new Error('textLesen nicht gefunden — Form geändert? Nicht raten, nachsehen.');
  const spur = text.replace(ANFANG, ANFANG + ' if (typeof data === "object" && data) { (data.__spur = data.__spur || []).push(kennung); }');
  const tmp = path.join(os.tmpdir(), 'lesen-spur-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, spur);
  const alt = process.env.LESEN_HTML_PATH;
  process.env.LESEN_HTML_PATH = tmp;
  const laden = path.join(REPO, 'tests', 'load-lesen.js');
  delete require.cache[require.resolve(laden)];
  try { return require(laden).ladeLesen().V; }
  finally {
    if (alt === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = alt;
    delete require.cache[require.resolve(laden)];
    try { fs.unlinkSync(tmp); } catch (_) { /* Wegwerfdatei */ }
  }
}

function wertFuer(f, j, tiefe) {
  if (f.typ === 'liste') {
    if (tiefe > 1) return [];
    /* Sichtbarkeit hängt an anderen Unterfeldern (Instrumentart, Grundentscheidung): je Instrumentart und je Wert der steuernden Unterfelder ein Eintrag,
       die übrigen Unterfelder nehmen die Option des Durchgangs; Mehrfachauswahl zeigt alle Optionen. */
    const unter = f.unterFelder || [];
    const steuernd = new Set(unter.flatMap((u) => [u.sichtbarWenn && u.sichtbarWenn.feld, u.verborgenWenn && u.verborgenWenn.feld]).filter((x) => x && x !== 'instrument'));
    const stufen = Math.max(1, ...unter.filter((u) => steuernd.has(u.id)).map((u) => (u.optionen || []).length));
    const reihe = [...steuernd];
    const eintrag = (inst, a, umgekehrt) => {
      const e = {};
      for (const u of unter) {
        if (u.id === 'instrument' && inst) e[u.id] = inst;
        else if (u.optionen && u.optionen.length && u.typ === 'mehrfachauswahl') e[u.id] = u.optionen.map((x) => x.wert);
        else if (u.optionen && u.optionen.length) e[u.id] = u.optionen[Math.min(steuernd.has(u.id) ? (((reihe.indexOf(u.id) + umgekehrt) % 2 === 0) ? a : stufen - 1 - a) : j, u.optionen.length - 1)].wert;
        else e[u.id] = wertFuer(u, j, tiefe + 1);
      }
      return e;
    };
    const art = unter.find((u) => u.id === 'instrument' && u.optionen);
    const arten = art ? art.optionen.map((x) => x.wert) : [null];
    const raus = [];
    for (const inst of arten) for (let a = 0; a < stufen; a++) for (const umgekehrt of [0, 1]) raus.push(eintrag(inst, a, umgekehrt));
    return raus;
  }
  if (f.optionen && f.optionen.length) { const o = f.optionen[Math.min(j, f.optionen.length - 1)].wert; return f.typ === 'mehrfachauswahl' ? [o] : o; }
  if (f.typ === 'datum') return '2026-01-01';
  if (f.typ === 'checkbox') return true;
  if (f.typ === 'ref') return 'x';
  if (f.typ === 'refMehrfach') return [{ ref: 'x' }];
  return 'x';
}

function einlesen(p) { return JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(REPO, p), 'utf8')); }

/* Was die Lese-App an Auswahl-Werten und Unterfeld-Beschriftungen KENNT: Kennung → Art. Sensible Felder zeigen ihre Werte nie. */
function katalogAufbauen(V, proModule, eingebaut) {
  const kat = new Map();
  const feldEintragen = (id, f) => {
    let fs_ = false; try { fs_ = !!V.feldIstSensibel(f, id); } catch (_) { fs_ = !!f.sensibel; }
    const b = id + '.' + f.id;
    kat.set(b + '.label', 'feld');
    for (const o of f.optionen || []) kat.set(b + '/' + o.wert + '.label', fs_ ? 'opt-sensibel' : 'opt');
    for (const u of f.unterFelder || []) {
      /* Ob ein Unterfeld zurückgehalten wird, hängt an der Zeile (Instrumentart): nur wenn es für jede Art zurückgehalten wird, zeigt die Lese-App es nie. */
      const arten = ((f.unterFelder || []).find((x) => x.id === 'instrument') || {}).optionen || [];
      const pruef = (e) => { try { return !!V.unterfeldIstSensibel(id, f.id, e, u); } catch (_) { return !!u.sensibel; } };
      const us = arten.length ? arten.every((a) => pruef({ instrument: a.wert })) : pruef({});
      const jn = (u.optionen || []).some((o) => /^(ja|nein)$/i.test(o.label));
      kat.set(b + '/' + u.id + '.label', us ? 'uf' : (jn ? 'uf-jn' : 'uf'));
      for (const o of u.optionen || []) kat.set(b + '/' + u.id + '/' + o.wert + '.label', (fs_ || us) ? 'opt-sensibel' : 'ufopt');
    }
  };
  for (const s of eingebaut) {
    for (const se of s.sektionen || []) for (const f of se.felder || []) feldEintragen(s.id, f);
    if (s.einfuehrungstext) kat.set(s.id + '.einfuehrungstext', 'einfuehrung');
  }
  for (const m of proModule) for (const [id, b] of Object.entries(m.bereiche)) for (const se of b.sektionen || []) for (const f of se.felder || []) feldEintragen(id, f);
  return kat;
}


/* Kein Listen- oder Feldwert darf als roher Optionsschlüssel erscheinen: ein Schlüssel, der vom Klartext-Label abweicht, steht nie als eigener Wertteil im gerenderten Text. */
function rohSchluesselFinden(V, proModule, seiten, eingebaut) {
  const teile = new Set(seiten.join('\n').replace(/<[^>]*>/g, '\n').replace(/&amp;/g, '&').split(/[\n·;,]/).map((x) => x.trim()).filter(Boolean));
  const gefunden = [];
  const pruefe = (id, feld, kette, optionen) => {
    for (const o of optionen || []) {
      if (!o || typeof o.wert !== 'string' || typeof o.label !== 'string' || o.wert.length < 4 || o.wert === o.label || /^(ja|nein)$/i.test(o.wert)) continue;   // ohne Katalog-Label kommt der Text aus dem Textsatz der Datei
      if (teile.has(o.wert)) gefunden.push(id + '.' + feld.id + kette + '/' + o.wert);
    }
  };
  const feld = (id, f) => { pruefe(id, f, '', f.optionen); for (const u of f.unterFelder || []) pruefe(id, f, '/' + u.id, u.optionen); };
  for (const s of eingebaut) for (const se of s.sektionen || []) for (const f of se.felder || []) feld(s.id, f);
  for (const m of proModule) for (const [id, b] of Object.entries(m.bereiche)) for (const se of b.sektionen || []) for (const f of se.felder || []) feld(id, f);
  return gefunden;
}

function erheben(opt) {
  const o = opt || {};
  const V = ladeLese(o.lesenQuelle);
  const eingebaut = Object.values(V.SEKTOR_BY_ID).filter((x) => !x.angedockt);   // die eingebauten Bereiche der Lese-App, vor dem Anmelden der Module
  const L = require('./lib/vier-produkte.js');
  const { kennungen: kernKennungen, annehmer } = require('./modul-text-lese-app-messen.js');
  const kern = o.kennungen || kernKennungen();
  const kernAlle = new Set(Object.keys(einlesen('tools/textsatz-de-modul.json').texte));
  const nimmt = annehmer(V);

  const proModule = L.BEREICH_TEMPLATE_PFADE_PRO_6.map((p) => { const m = einlesen(p); for (const b of Object.values(m.bereiche)) b.label = b.label || b.id; return m; });
  const proIds = proModule.flatMap((m) => Object.keys(m.bereiche));
  const logik = ['tools/erbschein-vorbereitung-modul.json', 'tests/fixtures/zugang-zum-recht-beratungshilfe-logikmodul.json'].map(einlesen);
  let maxOpt = 1;
  const zaehle = (f) => { maxOpt = Math.max(maxOpt, (f.optionen || []).length); for (const u of f.unterFelder || []) zaehle(u); };
  for (const s of eingebaut) for (const se of s.sektionen || []) for (const f of se.felder || []) zaehle(f);
  for (const m of proModule) for (const b of Object.values(m.bereiche)) for (const se of b.sektionen || []) for (const f of se.felder || []) zaehle(f);

  const spur = new Set(); const fehler = []; const seiten = [];
  for (let j = 0; j < maxOpt; j++) {
    const d = { schemaVersion: 75, sektoren: {}, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, logikModule: logik, bereichsModule: proModule, textsatzModule: [], situationen: {} };
    V.setData(d); V._bereichsModuleAusDepotAnmeldenLesen(d);
    const alle = [...eingebaut];
    for (const id of proIds) if (V.SEKTOR_BY_ID && V.SEKTOR_BY_ID[id]) alle.push(V.SEKTOR_BY_ID[id]);
    for (const s of alle) { const w = {}; for (const se of s.sektionen || []) for (const f of se.felder || []) w[f.id] = wertFuer(f, j, 0); d.sektoren[s.id] = w; }
    for (const si of (V.SITUATIONEN || [])) { const w = {}; for (const b of (si.bloecke || [])) for (const e of (b.eintraege || [])) if (e && e.feld && typeof e.feld === 'object' && e.feld.id) w[e.feld.id] = wertFuer(e.feld, j, 0); d.situationen[si.id] = w; }
    for (const s of alle) { try { seiten.push(V.sektorHTML(s.id)); } catch (e) { fehler.push(s.id + ': ' + e.message); } }
    try { seiten.push(V.sidebarHTML()); } catch (e) { fehler.push('sidebar: ' + e.message); }
    for (const si of (V.SITUATIONEN || [])) { try { seiten.push(V.situationContentHTML(si.id)); } catch (e) { fehler.push('situation ' + si.id + ': ' + e.message); } }
    for (const k of (d.__spur || [])) spur.add(k);
  }

  const kat = katalogAufbauen(V, proModule, eingebaut);
  const rohe = rohSchluesselFinden(V, proModule, seiten, eingebaut);
  const je = {}; const verstoesse = { abgewiesen: [], fest: [], unklar: [] }; const gruppen = {};
  for (const k of kern) {
    const angenommen = nimmt(k);
    if (spur.has(k)) { je[k] = 'gelesen'; if (!angenommen) verstoesse.abgewiesen.push(k); continue; }
    const art = kat.get(k);
    if (art === 'opt-sensibel') { je[k] = 'sensibel'; continue; }
    if (art === 'opt' || art === 'ufopt' || art === 'uf-jn' || art === 'einfuehrung') { je[k] = 'fest'; verstoesse.fest.push(k); continue; }
    let g = null;
    for (const [name, muster] of GRUPPEN) if (muster.test(k)) { g = name; break; }
    if (!g && art === 'uf') g = GRUPPE_UNTERFELD[0];
    if (!g && !art && V.SEKTOR_BY_ID && V.SEKTOR_BY_ID[k.split(/[.#]/)[0]]) g = GRUPPE_KERN_FELD[0];
    if (!g) { je[k] = 'unklar'; verstoesse.unklar.push(k); continue; }
    je[k] = 'gruppe:' + g; gruppen[g] = (gruppen[g] || 0) + 1;
  }
  const nichtImKern = [...spur].filter((k) => !k.startsWith('strings:') && !kernAlle.has(k));
  const gelesen = Object.values(je).filter((x) => x === 'gelesen').length;
  return { je, gelesen, spur: spur.size, verstoesse, gruppen, nichtImKern, rohe, fehler, kennungen: kern.length, katalog: kat.size, durchgaenge: maxOpt };
}

function grundlinieLesen() { return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')); }
function gruppenGruende() {
  const g = {}; for (const [name, , grund] of GRUPPEN) g[name] = grund; g[GRUPPE_UNTERFELD[0]] = GRUPPE_UNTERFELD[1]; g[GRUPPE_KERN_FELD[0]] = GRUPPE_KERN_FELD[1];
  return g;
}
module.exports = { erheben, grundlinieLesen, gruppenGruende, GRUPPEN, GRUNDLINIE };

if (require.main === module) {
  const m = erheben();
  console.log('Kern-Kennungen: ' + m.kennungen + ' · gelesen: ' + m.gelesen + ' · fest: ' + m.verstoesse.fest.length + ' · abgewiesen: ' + m.verstoesse.abgewiesen.length +
    ' · unklar: ' + m.verstoesse.unklar.length + ' · nicht im Kern: ' + m.nichtImKern.length);
  console.log('Gruppen (nicht angezeigt, mit Grund):', JSON.stringify(m.gruppen));
  for (const [n, l] of Object.entries(m.verstoesse)) if (l.length) console.log('  ' + n + ': ' + l.slice(0, 8).join(', ') + (l.length > 8 ? ' …' : ''));
  if (m.nichtImKern.length) console.log('  nicht im Kern: ' + m.nichtImKern.join(', '));
  if (m.rohe.length) console.log('  rohe Optionsschlüssel: ' + m.rohe.join(', '));
  if (m.fehler.length) console.log('  Renderfehler: ' + m.fehler.slice(0, 5).join(' | '));
  if (process.argv.includes('--grundlinie-schreiben')) {
    const gr = gruppenGruende(); const gruppen = {};
    for (const [g, n] of Object.entries(m.gruppen)) gruppen[g] = { anzahl: n, grund: gr[g] };
    fs.writeFileSync(GRUNDLINIE, JSON.stringify({
      stand: '19.09.2026', messweg: 'node tools/modul-text-lese-app-ausgabe-messen.js --grundlinie-schreiben',
      hinweis: 'Je Gruppe: so viele Kern-Kennungen erscheinen in der Lese-App nie, mit Grund. Die Zahl darf nur sinken; eine Kennung ohne Gruppe ist rot.',
      gruppen,
    }, null, 2) + '\n');
    console.log('Grundlinie geschrieben: ' + GRUNDLINIE);
  }
}
