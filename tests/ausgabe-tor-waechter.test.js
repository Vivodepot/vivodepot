'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter: jeder Ausgabeweg für Abschnittsfelder fragt das ganze Tor (Befund DATENSATZ-VERBORGENE-WERTE, 03.11.2026)
   ────────────────────────────────────────────────────────────────────────
   DIE FEHLERKLASSE. Ein Feld hinter einem Tor verschwindet am Bildschirm und in der Übersicht vor dem Senden. Ein Ausgabeweg,
   der das Tor nicht oder nur halb prüft, gibt den gespeicherten Wert trotzdem heraus. So ging es im Datensatz (Zusammenstellung,
   Anlass, Anfrage-Antwort) und in den SD-JWT-Formaten: geprüft war nur `verborgenWenn` über `verborgenWennTrifft`, ohne
   `sichtbarWenn` und ohne verborgene Torfelder (Kaskade). U2-ADR-102 §1 mit Nachtrag vom 03.11.2026: was die Übersicht vor dem
   Senden nicht zeigt, geht nicht hinaus.

   Teile:
   (a) Register der Ausgabewege: der Rumpf jeder genannten Funktion ruft `feldSichtbar(` mit Geltungsbereich (drittes
       Argument, nicht `null`/`undefined`). Ein neuer Ausgabeweg für Abschnittsfelder kommt hier ins Register. Die Wege des
       Empfänger-Zuschnitts und des Angehörigen-Caches kommen hinzu, wenn der Befund AUSGABE-VERBORGENE-WERTE schließt.
       Dazu: `verborgenWennTrifft(` — das halbe Tor — steht im Kern nur an den Stellen der Positivliste. Negativprobe daneben.
   (b) Pflege der Positivliste: jeder Eintrag hat einen Aufruf und einen Grund (die Liste kann nur schrumpfen).
   (c) Listen-Unterfeld-Selektor am Kern: eine Zeile, in der das Tor des Unterfelds es verbirgt (direkt oder über ein
       verborgenes Torfeld), liefert keinen Wert, weder über `listenUnterfeldRoh` noch im Datensatz; Gegenfall sichtbar.
   (d) Leser `_liesSektorWertText`: steht im Register (a) und liefert für ein verborgenes Feld nichts; jeder Aufrufer steht
       in `LESER_AUFRUFER` (SD-JWT-Anschrift, FIM/XÖV, vCard, Mapping), ein neuer Aufrufer fällt auf.
   (e) In einem Ausgabe-Mapping liest kein transform per `feldRohwert(` am Tor vorbei (Teil von (a), Negativprobe daneben).
   Rot-Beweis: gegen den Kern vor dem Fix (8342058db) sind (a), (b) und (c) rot; gegen den Kern nach dem Fix grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeKern, HTML_PATH, extrahiereScripts } = require('./load-kern.js');
const { nurCode } = require('../tools/anzeige-index-leser.js');

const AUSGABEWEGE = [
  { funktion: '_datensatzAusEintraegen', grund: 'Datensatz für eine Stelle: Zusammenstellung, Anlass samt PDF-Modell und QR, Anfrage-Antwort' },
  { funktion: 'baueAusMapping', grund: 'Formate aus einem Feld-Mapping: SD-JWT Identität, Finanzen, Sozialversicherung, XÖV, EDCI, Formatkatalog' },
  { funktion: 'listenUnterfeldRoh', grund: 'Listen-Unterfeld-Selektor je Zeile: Datensatz, Übersicht, Notfallkern, Situationsblätter' },
  { funktion: '_rohFuerAusgabe', grund: 'Unterfelder einer mitgegebenen Liste im Datensatz' },
  { funktion: 'exportUebersichtModell', grund: 'Übersicht vor dem Senden, der Maßstab der Ausgaben' },
  { funktion: '_liesSektorWertText', grund: 'der eine Leser des Ausgabewerts eines Abschnittsfelds für die Formate (Leser unten)' },
];
/* (d) Wer `_liesSektorWertText` ruft, gibt Werte nach draußen; der Leser fragt das Tor selbst (Register oben). Jeder Aufrufer
   steht hier, damit ein neuer Weg auffällt und bewusst eingetragen wird (Durchsicht vom 03.11.2026: drei Nebenwege lasen
   ohne Tor). */
const LESER_AUFRUFER = [
  { funktion: 'baueAusMapping', grund: 'Formate aus einem Feld-Mapping, prüft das Tor zusätzlich vor der Sensibel-Prüfung' },
  { funktion: 'sdJwtVcIdentitaet', grund: 'SD-JWT Identität, strukturierte Anschrift (adrLesen)' },
  { funktion: '_fimFelderMitBezug', grund: 'FIM/XÖV-Felder mit Bezug auf einen Abschnitt' },
  { funktion: 'vcardIdentitaet', grund: 'vCard der eigenen Identität' },
  { funktion: 'VC_IDENTITAET_MAPPING', grund: 'Mapping SD-JWT Identität: family_name trägt den zweiten Nachnamen mit (transform)' },
];
/* (e) In einem Ausgabe-Mapping (`const …_MAPPING = Object.freeze(…)`) liest kein transform den Rohwert per `feldRohwert(`
   am Tor vorbei; ein weiteres Feld kommt über `_liesSektorWertText` (Durchsicht vom 03.11.2026: secondLastName). */
const MAPPING_RE = /(?:^|\n)const\s+([A-Z0-9_]*MAPPING)\s*=\s*Object\.freeze\(/g;
function mappingBereiche(code) {
  const out = [];
  let m;
  MAPPING_RE.lastIndex = 0;
  while ((m = MAPPING_RE.exec(code))) {
    const offen = code.indexOf('(', m.index + m[0].length - 1);
    let tiefe = 0, i = offen;
    for (; i < code.length; i++) {
      if (code[i] === '(') tiefe++;
      else if (code[i] === ')') { tiefe--; if (tiefe === 0) break; }
    }
    out.push({ name: m[1], von: offen, bis: i });
  }
  return out;
}
const HALBES_TOR_ERLAUBT = [
  { funktion: 'wizardSchrittVerborgen', grund: 'Assistenten-Schritt: das Tor liest die Tasche des Schritts, kein Abschnittsfeld eines Bereichs' },
  { funktion: '_pvDokumentDaten', grund: 'Patientenverfügungs-Dokument: Tore der Schritte des Bauplans, ausgewertet gegen dieselbe Tasche wie im Assistenten' },
  { funktion: 'docxBereichModell', grund: 'Word-Modell ohne Aufrufer im Kern (Export seit 21.08.2026 entfallen), eigener Posten NIEDRIG; '
    + 'wird es wieder an eine Ausgabe gehängt, gehört es ins Register oben' },
];

function kernCode() {
  const { script1, script2 } = extrahiereScripts(fs.readFileSync(HTML_PATH, 'utf8'));
  return nurCode(script1 + '\n' + script2);
}
const FN_RE = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
function funktionen(code) {
  const starts = [];
  let m;
  FN_RE.lastIndex = 0;
  while ((m = FN_RE.exec(code))) starts.push({ name: m[1], pos: m.index });
  return starts.map((s, i) => ({ name: s.name, rumpf: code.slice(s.pos, i + 1 < starts.length ? starts[i + 1].pos : code.length), pos: s.pos }));
}
function umschliessend(fns, pos) {
  let name = null;
  for (const f of fns) { if (f.pos < pos) name = f.name; else break; }
  return name;
}
function argumente(code, offen) {
  const args = [];
  let tiefe = 0;
  let start = offen + 1;
  for (let i = offen; i < code.length; i++) {
    const c = code[i];
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') {
      tiefe--;
      if (tiefe === 0) { args.push(code.slice(start, i).trim()); break; }
    } else if (c === ',' && tiefe === 1) { args.push(code.slice(start, i).trim()); start = i + 1; }
  }
  return args;
}
function aufrufe(text, name) {
  const re = new RegExp('(^|[^A-Za-z0-9_$.])' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const vor = text.slice(Math.max(0, m.index - 12), m.index + m[1].length);
    if (/function\s*$/.test(vor)) continue;
    out.push({ pos: m.index, args: argumente(text, text.indexOf('(', m.index + m[1].length)) });
  }
  return out;
}

/* Die Diskriminante des Wächters (a): alle Lücken im übergebenen Kern-Code — ein Ausgabeweg des Registers ohne
   feldSichtbar mit Geltungsbereich, und jeder Aufruf des halben Tors außerhalb der Positivliste. */
function torLueckenImKern(code) {
  const fns = funktionen(code);
  const luecken = [];
  for (const w of AUSGABEWEGE) {
    const f = fns.filter((x) => x.name === w.funktion);
    if (f.length !== 1) { luecken.push('Ausgabeweg ' + w.funktion + ' nicht genau einmal im Kern (' + f.length + ')'); continue; }
    const mitBereich = aufrufe(f[0].rumpf, 'feldSichtbar').filter((a) => a.args.length >= 3
      && !['null', 'undefined', 'void 0', ''].includes(a.args[2]));
    if (!mitBereich.length) luecken.push('Ausgabeweg ohne feldSichtbar mit Geltungsbereich: ' + w.funktion);
  }
  const leser = new Set(LESER_AUFRUFER.map((e) => e.funktion));
  const mappings = mappingBereiche(code);
  const imMapping = (pos) => (mappings.find((b) => b.von < pos && pos < b.bis) || {}).name;
  for (const a of aufrufe(code, 'feldRohwert')) {
    const mp = imMapping(a.pos);
    if (mp) luecken.push('feldRohwert im Ausgabe-Mapping ' + mp + ' (am Tor vorbei): Zeile ' + code.slice(0, a.pos).split('\n').length);
  }
  for (const a of aufrufe(code, '_liesSektorWertText')) {
    const fn = imMapping(a.pos) || umschliessend(fns, a.pos);
    if (!leser.has(fn)) luecken.push('Aufrufer von _liesSektorWertText nicht im Register: ' + fn);
  }
  const erlaubt = new Set(HALBES_TOR_ERLAUBT.map((e) => e.funktion));
  for (const a of aufrufe(code, 'verborgenWennTrifft')) {
    const fn = umschliessend(fns, a.pos);
    if (!erlaubt.has(fn)) luecken.push('halbes Tor (verborgenWennTrifft) außerhalb der Positivliste: Zeile '
      + code.slice(0, a.pos).split('\n').length + ' in ' + fn);
  }
  return luecken;
}

test('[AUSGABE-TOR] (a) jeder Ausgabeweg im Register ruft feldSichtbar mit Geltungsbereich, das halbe Tor steht nur auf der Positivliste', () => {
  const code = kernCode();
  assert.ok(aufrufe(code, 'feldSichtbar').length >= 19, 'Messweg läuft nicht: zu wenige Aufrufe von feldSichtbar im Kern');
  assert.deepEqual(torLueckenImKern(code), [], 'Ausgabewege prüfen das Tor nicht oder nur halb (U2-ADR-102 §1, Nachtrag 03.11.2026)');
});

test('[AUSGABE-TOR] (a·Negativprobe) der Wächter schlägt an, wenn ein Ausgabeweg wieder das halbe Tor prüft (rot ⇄ grün)', () => {
  const code = kernCode();
  assert.deepEqual(torLueckenImKern(code), [], 'Rückstellung: der Kern ist ohne Lücke');
  const i = code.indexOf('function _datensatzAusEintraegen(');
  assert.ok(i >= 0, 'Ausgabeweg _datensatzAusEintraegen nicht gefunden');
  const j = code.indexOf('feldSichtbar(', i);
  assert.ok(j > i, 'kein Aufruf von feldSichtbar in _datensatzAusEintraegen');
  const mutiert = code.slice(0, j) + 'verborgenWennTrifft(' + code.slice(j + 'feldSichtbar('.length);
  const rot = torLueckenImKern(mutiert);
  assert.ok(rot.some((l) => /ohne feldSichtbar.*_datensatzAusEintraegen/.test(l)), 'Lücke im Register nicht erkannt: ' + rot.join(' | '));
  assert.ok(rot.some((l) => /halbes Tor.*_datensatzAusEintraegen/.test(l)), 'halbes Tor nicht erkannt: ' + rot.join(' | '));
  // Rot-Beweis (d): der Leser ohne Tor und ein neuer Aufrufer außerhalb des Registers fallen auf.
  const l = code.indexOf('function _liesSektorWertText(');
  const k = code.indexOf('feldSichtbar(', l);
  assert.ok(l >= 0 && k > l, 'Leser _liesSektorWertText ohne feldSichtbar');
  const ohneTor = torLueckenImKern(code.slice(0, k) + 'feldSichtbarX(' + code.slice(k + 'feldSichtbar('.length));
  assert.ok(ohneTor.some((x) => /ohne feldSichtbar.*_liesSektorWertText/.test(x)), 'Leser ohne Tor nicht erkannt: ' + ohneTor.join(' | '));
  const neuerWeg = torLueckenImKern(code + '\nfunction neuerAusgabeweg() { return _liesSektorWertText(\'identity\', \'givenName\'); }\n');
  assert.ok(neuerWeg.some((x) => /nicht im Register: neuerAusgabeweg/.test(x)), 'neuer Aufrufer nicht erkannt: ' + neuerWeg.join(' | '));
  // Rot-Beweis (e): ein transform, das im Mapping wieder feldRohwert liest, fällt auf.
  const vc = mappingBereiche(code).find((x) => x.name === 'VC_IDENTITAET_MAPPING');
  const t = vc ? code.indexOf('_liesSektorWertText(', vc.von) : -1;
  assert.ok(vc && t > vc.von && t < vc.bis, 'transform des zweiten Nachnamens (Leser im Mapping) nicht gefunden');
  const roh = torLueckenImKern(code.slice(0, t) + 'feldRohwert' + code.slice(t + '_liesSektorWertText'.length));
  assert.ok(roh.some((x) => /feldRohwert im Ausgabe-Mapping VC_IDENTITAET_MAPPING/.test(x)), 'feldRohwert im Mapping nicht erkannt: ' + roh.join(' | '));
});

test('[AUSGABE-TOR] (b) die Positivliste des halben Tors ist gepflegt: jeder Eintrag hat einen Aufruf und einen Grund, kein Ausgabeweg steht darauf', () => {
  const code = kernCode();
  const fns = funktionen(code);
  const genutzt = new Set(aufrufe(code, 'verborgenWennTrifft').map((a) => umschliessend(fns, a.pos)));
  assert.deepEqual(HALBES_TOR_ERLAUBT.filter((e) => !genutzt.has(e.funktion)).map((e) => e.funktion), [],
    'Positivliste nennt Funktionen ohne Aufruf (Eintrag streichen)');
  const mappings = mappingBereiche(code);
  assert.ok(mappings.length >= 5, 'Messweg läuft nicht: zu wenige Ausgabe-Mappings gefunden (' + mappings.length + ')');
  const leserGenutzt = new Set(aufrufe(code, '_liesSektorWertText').map((a) =>
    (mappings.find((b) => b.von < a.pos && a.pos < b.bis) || {}).name || umschliessend(fns, a.pos)));
  assert.deepEqual(LESER_AUFRUFER.filter((e) => !leserGenutzt.has(e.funktion)).map((e) => e.funktion), [],
    'Register der Leser-Aufrufer nennt Funktionen ohne Aufruf (Eintrag streichen)');
  for (const e of [...HALBES_TOR_ERLAUBT, ...AUSGABEWEGE, ...LESER_AUFRUFER]) assert.ok(e.grund && e.grund.length > 20, 'Eintrag ohne Grund: ' + e.funktion);
  const reg = new Set(AUSGABEWEGE.map((w) => w.funktion));
  assert.deepEqual(HALBES_TOR_ERLAUBT.filter((e) => reg.has(e.funktion)).map((e) => e.funktion), [], 'ein Ausgabeweg steht auf der Positivliste');
});

const VERBORGENE_ZEILEN = [
  ['direkt (organDonation „ja“)', { instrument: 'living-will', organDonation: 'ja' }],
  ['Kaskade (organDonation gilt bei „will“ nicht)', { instrument: 'will', organDonation: 'teil' }],
];
function selektorLauf(V, zeile) {
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Anna', familyName: 'Muster' };
  d.sektoren.advanceCare = { provisionInstruments: [Object.assign({ id: 'z1', whatRestriction: 'MARKER-EINSCHRAENKUNG' }, zeile)] };
  V.setData(d);
  const sel = 'liste:provisionInstruments:' + zeile.instrument + ':whatRestriction';
  const kennung = V.kennungAusSelektor('advanceCare', sel);
  assert.ok(kennung, 'keine Kennung für ' + sel);
  const ds = V.zusammenstellungDatensatz([kennung], { id: 'x', titel: '' }, { sensibel: true });
  return { roh: V.listenUnterfeldRoh('advanceCare', 'provisionInstruments', zeile.instrument, 'whatRestriction'),
    datensatz: JSON.stringify(ds.felder) };
}
// Die Diskriminante des Wächters (c): je verborgener Zeile, wo der Wert doch herauskommt.
function verborgeneUnterfeldWerte(V) {
  const lecks = [];
  for (const [fall, zeile] of VERBORGENE_ZEILEN) {
    const r = selektorLauf(V, zeile);
    if (r.roh.length) lecks.push(fall + ': listenUnterfeldRoh liefert den verborgenen Wert');
    if (/MARKER-EINSCHRAENKUNG/.test(r.datensatz)) lecks.push(fall + ': verborgenes Unterfeld steht im Datensatz');
  }
  return lecks;
}

test('[AUSGABE-TOR] (c) Listen-Unterfeld-Selektor: eine Zeile mit verborgenem Unterfeld liefert keinen Wert (direkt und über die Kaskade)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Ausgabe-Tor-Waechter-2026!');
  const sichtbar = selektorLauf(V, { instrument: 'living-will', organDonation: 'teil' });
  assert.deepEqual(sichtbar.roh, ['MARKER-EINSCHRAENKUNG'], 'Kontrolle: sichtbares Unterfeld liefert seinen Wert');
  assert.match(sichtbar.datensatz, /MARKER-EINSCHRAENKUNG/, 'Kontrolle: sichtbares Unterfeld steht im Datensatz');
  assert.deepEqual(verborgeneUnterfeldWerte(V), [], 'verborgene Listen-Unterfelder gehen hinaus');
});

test('[AUSGABE-TOR] (d) der Leser _liesSektorWertText liefert für ein verborgenes Feld keinen Wert; Gegenfall sichtbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Ausgabe-Tor-Waechter-2026!');
  const lauf = (art) => {
    const d = V.getData();
    d.sektoren.socialInsurance = { longTermCareAllowanceTypeOf: art, longTermCareAllowanceAmount: 'MARKER-BETRAG' };
    V.setData(d);
    return V._liesSektorWertText('socialInsurance', 'longTermCareAllowanceAmount');
  };
  assert.equal(lauf('pflegegeld'), 'MARKER-BETRAG', 'Kontrolle: sichtbarer Betrag wird gelesen');
  assert.equal(lauf('sachleistung'), undefined, 'verborgener Betrag wird gelesen');
});

module.exports = {
  PROBEN: [
    { fuer: '[AUSGABE-TOR] (a) jeder Ausgabeweg im Register ruft feldSichtbar mit Geltungsbereich, das halbe Tor steht nur auf der Positivliste', diskriminante: torLueckenImKern },
    { fuer: '[AUSGABE-TOR] (c) Listen-Unterfeld-Selektor: eine Zeile mit verborgenem Unterfeld liefert keinen Wert (direkt und über die Kaskade)', diskriminante: verborgeneUnterfeldWerte },
  ],
};
