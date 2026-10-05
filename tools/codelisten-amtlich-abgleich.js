#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════
   codelisten-amtlich-abgleich.js — stehen die Codes, die Vivodepot schreibt und liest, in der amtlichen Liste? (01.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────
   Grundsatz des Projekts „Für jeden Standard mindestens ein Prüfer“: Für Codelisten ist der Prüfer die amtliche Liste selbst.
   Drei Listen, je mit dem Gegenstand, an dem sie gemessen werden:

     EQF / DQR   tools/codelisten-amtlich/eqf-dqr.json (EU Vocabularies, CC BY 4.0, im Repo). Jede Kennung
                 data.europa.eu/snb/eqf/… und jede DQR-Kennung aus snb/qdr/…, die in einem verwahrten Nachweis
                 (tests/fixtures, die Europass-Beispiele) oder im Kern steht, muss eine der acht Stufen sein; jede
                 DQR-Stufe n hat closeMatch EQF-Stufe n. Kennungen fremder nationaler Rahmen werden gezählt, nicht bewertet.
     ISO 4217    die Liste der Maintenance Agency (SIX, „List One“, XML). Weitergabe der Liste ist nicht geregelt, sie
                 kommt NICHT ins Repo: --iso4217 <list-one.xml>. Gemessen: die Währungsoptionen der Bereichsvorlagen
                 und des Bürgermoduls (außer „sonstige“), die Vorgabe des Textsatzes (regeln.waehrung) und jedes Ccy der
                 CAMT-Fixtures. Ohne Argument: gegen die erfundene Fixture tests/fixtures/codelisten-abgleich-erfunden/.
     ISO 13616   das IBAN-Register (SWIFT, Textfassung, tabgetrennt). swift.com verweigert den automatischen Abruf;
                 die Datei wird von Hand geladen: --iban-register <txt>. Gemessen: jede Länge in IBAN_LAENGE (Kern) und
                 die Beispiel-IBAN jedes dort genannten Landes gegen `_ibanPlausibel`. Ohne Argument: Fixture.

   Aufruf:
     node tools/codelisten-amtlich-abgleich.js [--iso4217 <list-one.xml>] [--iban-register <txt>] [--json]
   Exit 0 = stimmt, 1 = Befund, 2 = Datei nicht lesbar (nie still grün).
   ═══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const EQF_DQR = path.join(REPO, 'tools', 'codelisten-amtlich', 'eqf-dqr.json');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'codelisten-abgleich-erfunden');
const VORLAGEN = [path.join(REPO, 'tools', 'bereich-templates'), path.join(REPO, 'tools', 'buergermodul')];
const NACHWEISE = path.join(REPO, 'tests', 'fixtures');

function dateienUnter(dir, muster) {
  const raus = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) raus.push(...dateienUnter(p, muster));
    else if (muster.test(e.name)) raus.push(p);
  }
  return raus;
}

/* ── EQF / DQR ─────────────────────────────────────────────────────────── */
function eqfDqrPruefen(liste, texte) {
  const befunde = [];
  const eqf = new Map(liste.eqf.map((x) => [x.uri, x]));
  const dqr = new Map(liste.dqr.map((x) => [x.uri, x]));
  if (eqf.size !== 8 || dqr.size !== 8) befunde.push('Liste: EQF und DQR haben je acht Stufen (hat ' + eqf.size + '/' + dqr.size + ')');
  for (const d of dqr.values()) {
    const m = eqf.get(d.closeMatch);
    if (!m || m.stufe !== d.stufe) befunde.push('Liste: ' + d.de + ' entspricht nicht EQF-Stufe ' + d.stufe + ' (closeMatch ' + d.closeMatch + ')');
  }
  const { eqf: S_EQF, qdr: S_QDR, dqrRahmen } = liste.quelle.schemata;
  let fremd = 0, gesehen = 0;
  for (const [datei, text] of texte) {
    for (const [uri] of text.matchAll(/http:\/\/data\.europa\.eu\/snb\/eqf\/[0-9a-z_]+/g)) {
      gesehen++;
      if (uri !== S_EQF && !eqf.has(uri)) befunde.push(datei + ': ' + uri + ' ist keine EQF-Stufe');
    }
    for (const [uri] of text.matchAll(/http:\/\/data\.europa\.eu\/snb\/qdr\/[0-9a-z_]+/g)) {
      gesehen++;
      if (uri === S_QDR || uri === dqrRahmen || dqr.has(uri)) continue;
      fremd++;
    }
  }
  return { befunde, gesehen, fremd };
}

/* ── ISO 4217 ──────────────────────────────────────────────────────────── */
function iso4217Lesen(xml) {
  const pblshd = (/<ISO_4217 Pblshd="([^"]+)"/.exec(xml) || [])[1] || null;
  if (!pblshd) throw new Error('keine ISO_4217-Liste (Pblshd fehlt)');
  const codes = new Set([...xml.matchAll(/<Ccy>([A-Z]{3})<\/Ccy>/g)].map((m) => m[1]));
  return { pblshd, codes };
}

function waehrungenImProdukt() {
  const raus = [];
  for (const dir of VORLAGEN) {
    for (const datei of dateienUnter(dir, /\.json$/)) {
      (function lauf(o) {
        if (Array.isArray(o)) { o.forEach(lauf); return; }
        if (!o || typeof o !== 'object') return;
        if (/^(currency|.*Currency)$/.test(String(o.id || '')) && Array.isArray(o.optionen)) {
          for (const op of o.optionen) if (op && op.wert !== 'sonstige') raus.push({ wo: path.relative(REPO, datei) + ' ' + o.id, code: op.wert });
        }
        for (const v of Object.values(o)) lauf(v);
      })(JSON.parse(fs.readFileSync(datei, 'utf8')));
    }
  }
  const textsatz = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8'));
  if (textsatz.regeln && textsatz.regeln.waehrung) raus.push({ wo: 'tools/textsatz-de-modul.json regeln.waehrung', code: textsatz.regeln.waehrung });
  for (const datei of dateienUnter(NACHWEISE, /camt.*\.xml$/i)) {
    for (const m of fs.readFileSync(datei, 'utf8').matchAll(/Ccy="([^"]*)"|<Ccy>([^<]*)<\/Ccy>/g)) raus.push({ wo: path.relative(REPO, datei) + ' Ccy', code: m[1] || m[2] });
  }
  return raus;
}

function iso4217Pruefen(liste, verwendet) {
  const befunde = [];
  for (const v of verwendet) if (!liste.codes.has(v.code)) befunde.push(v.wo + ': ' + JSON.stringify(v.code) + ' steht nicht in ISO 4217 (Liste vom ' + liste.pblshd + ')');
  return befunde;
}

/* ── ISO 13616: IBAN-Register ──────────────────────────────────────────── */
// Die Textfassung des Registers ist zeilenweise je Merkmal, spaltenweise je Land, tabgetrennt. Gebraucht werden drei Zeilen.
function ibanRegisterLesen(text) {
  const zeilen = text.split(/\r?\n/).map((z) => z.split('\t'));
  const finde = (re) => zeilen.find((z) => re.test(String(z[0]).trim()));
  const land = finde(/^IBAN prefix country code/i), laenge = finde(/^IBAN length$/i), beispiel = finde(/^IBAN electronic format example$/i);
  if (!land || !laenge || !beispiel) throw new Error('IBAN-Register: Zeilen „IBAN prefix country code“, „IBAN length“, „IBAN electronic format example“ nicht gefunden');
  const raus = new Map();
  for (let i = 1; i < land.length; i++) {
    const cc = String(land[i]).trim().slice(0, 2);
    if (/^[A-Z]{2}$/.test(cc)) raus.set(cc, { laenge: Number(String(laenge[i]).trim()), beispiel: String(beispiel[i] || '').trim() });
  }
  return raus;
}

function ibanPruefen(register, IBAN_LAENGE, ibanPlausibel) {
  const befunde = [];
  for (const [cc, soll] of Object.entries(IBAN_LAENGE)) {
    const r = register.get(cc);
    if (!r) befunde.push('IBAN_LAENGE.' + cc + ': Land steht nicht im IBAN-Register');
    else if (r.laenge !== soll) befunde.push('IBAN_LAENGE.' + cc + ' = ' + soll + ', das Register nennt ' + r.laenge);
  }
  for (const [cc, r] of register) {
    if (!r.beispiel || !Object.prototype.hasOwnProperty.call(IBAN_LAENGE, cc)) continue;
    if (!ibanPlausibel(r.beispiel)) befunde.push('Beispiel-IBAN ' + cc + ' aus dem Register wird abgelehnt: ' + r.beispiel);
  }
  return befunde;
}

function kernIban() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  return { IBAN_LAENGE: V.IBAN_LAENGE, ibanPlausibel: V._ibanPlausibel };
}

function abgleich({ iso4217Pfad = path.join(FIXTURE, 'list-one.xml'), ibanPfad = path.join(FIXTURE, 'iban-register.txt'), kern = null } = {}) {
  const liste = JSON.parse(fs.readFileSync(EQF_DQR, 'utf8'));
  const texte = [...dateienUnter(NACHWEISE, /\.(xml|jsonld|json)$/), path.join(REPO, 'vivodepot.html')]
    .map((p) => [path.relative(REPO, p), fs.readFileSync(p, 'utf8')]);
  const e = eqfDqrPruefen(liste, texte);
  const iso = iso4217Lesen(fs.readFileSync(iso4217Pfad, 'utf8'));
  const k = kern || kernIban();
  return {
    eqfDqr: e,
    iso4217: { liste: path.basename(iso4217Pfad), pblshd: iso.pblshd, befunde: iso4217Pruefen(iso, waehrungenImProdukt()) },
    iban: { register: path.basename(ibanPfad), befunde: ibanPruefen(ibanRegisterLesen(fs.readFileSync(ibanPfad, 'latin1')), k.IBAN_LAENGE, k.ibanPlausibel) },
  };
}

module.exports = { eqfDqrPruefen, iso4217Lesen, iso4217Pruefen, waehrungenImProdukt, ibanRegisterLesen, ibanPruefen, abgleich, EQF_DQR, FIXTURE };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  let r;
  try { r = abgleich({ iso4217Pfad: arg('--iso4217'), ibanPfad: arg('--iban-register') }); } catch (err) { console.error('[codelisten-amtlich] ' + err.message); process.exit(2); }
  const alle = [...r.eqfDqr.befunde, ...r.iso4217.befunde, ...r.iban.befunde];
  if (argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log('EQF/DQR: ' + r.eqfDqr.gesehen + ' Kennungen gesehen, ' + r.eqfDqr.fremd + ' aus fremden nationalen Rahmen (nicht bewertet)');
    console.log('ISO 4217: gegen ' + r.iso4217.liste + ' vom ' + r.iso4217.pblshd);
    console.log('ISO 13616: gegen ' + r.iban.register);
    for (const b of alle) console.log('  ✗ ' + b);
    console.log(alle.length ? alle.length + ' Befund(e).' : 'stimmt.');
  }
  process.exit(alle.length ? 1 : 0);
}
