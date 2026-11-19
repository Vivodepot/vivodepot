#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════
   standards-seite-erzeugen.js — die Seite „Standards und Vereinbarungen“ aus dem Standards-Register (16.11.2026)
   ───────────────────────────────────────────────────────────
   Quelle: tools/standards-register/*.json (Form: docs/standards-schnittstelle.md). Auf die Seite kommt jeder Standard, den das
   Produkt liest oder schreibt, also jeder Eintrag mit einem Export- oder Importweg. Je Eintrag: Kennung, Name, Herausgeber,
   Fassung, Richtung und die Wege. Das Statusfeld des Registers ist Arbeitsstand und kommt nicht auf die Seite.
   Das optionale Feld `seite` überschreibt für die Seite Name, Herausgeber, Richtung und Wege. Ein Eintrag mit Status fehlt erscheint
   nur mit „{marke}-Format“ im Namen, einer mit Status orientiert nur mit eigenem seite.name (seitenFehler; sonst Exit 1).
   Fassung: das Feld `fassungAnzeige`, sonst `version`, wenn sie eine kurze Kennung ist (Ziffern, Buchstaben, Punkt, Bindestrich,
   Raute, höchstens 24 Zeichen); eine erklärende `version` bleibt im Register und entfällt auf der Seite.
   Träger: vivodepot.html, der Block STANDARDS-SEITE vor `function _ueberStandardsHTML`. Die Seite rendert ihn mit den Bausteinen
   des Erscheinungsbilds; die Beschriftung von Richtung und Weg kommt aus dem Textsatz und aus den Formaten des Kerns.
     node tools/standards-seite-erzeugen.js               schreibt
     node tools/standards-seite-erzeugen.js --check       prüft, schreibt nichts; Exit 1 bei Abweichung
     --depot <pfad>                                       Wurzel (Standard: das Repo)
   Gehalten von tests/standards-seite-erzeugt.test.js.
   ═══════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ANFANG = '/* STANDARDS-SEITE:BEGIN — ERZEUGT aus tools/standards-register (node tools/standards-seite-erzeugen.js), nicht von Hand ändern. */';
const ENDE = '/* STANDARDS-SEITE:END */';
const ANKER = 'function _ueberStandardsHTML() {';
const FASSUNG_KURZ = /^[0-9A-Za-z.#-]{1,24}$/;

function liste(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

function registerLesen(depot) {
  const ordner = path.join(depot, 'tools', 'standards-register');
  const eintraege = [];
  for (const f of fs.readdirSync(ordner).filter((n) => n.endsWith('.json')).sort()) {
    const r = JSON.parse(fs.readFileSync(path.join(ordner, f), 'utf8'));
    for (const s of r.standards || []) eintraege.push(s);
  }
  return eintraege;
}

function fassung(s) {
  if (typeof s.fassungAnzeige === 'string' && s.fassungAnzeige.trim()) return s.fassungAnzeige.trim();
  const v = String(s.version || '').trim();
  return FASSUNG_KURZ.test(v) ? v : '';
}

// Felder, die `seite` für die Seite überschreiben darf (Quellenprüfung 16.11.2026: Name, Herausgeber, Richtung und Weg so,
// wie das Produkt sie heute trägt; das Register behält seinen Arbeitsstand).
const SEITE_FELDER = Object.freeze(['name', 'herausgeber', 'richtung', 'exportwege', 'importwege']);
// Ein Eintrag mit diesem Status liest oder schreibt den Standard selbst nicht; auf der Seite steht dann das eigene Format.
const STATUS_EIGENES_FORMAT = Object.freeze(['fehlt', 'orientiert']);
// `{marke}` setzt die Seite zur Laufzeit als Namen der aktiven Marke ein (White Label, U2-ADR-400): kein fester Herstellername.
const MARKE_EIGENES_FORMAT = '{marke}-Format';

function mitSeite(s) {
  const o = s.seite && typeof s.seite === 'object' ? s.seite : {};
  const x = Object.assign({}, s);
  for (const f of SEITE_FELDER) if (o[f] !== undefined) x[f] = o[f];
  return x;
}

function seitenEintraege(register) {
  return register
    .map(mitSeite)
    .filter((s) => liste(s.exportwege).length || liste(s.importwege).length)
    .map((s) => ({ id: s.id, name: s.name, herausgeber: s.herausgeber || '', fassung: fassung(s),
      richtung: liste(s.richtung), export: liste(s.exportwege), import: liste(s.importwege) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id));
}

// Wächter gegen die ganze Klasse: kein Eintrag, der den Standard selbst nicht liest oder schreibt, steht unter dessen Namen auf
// der Seite; unbekannte Felder in `seite` fallen auf.
function seitenFehler(register) {
  const m = [];
  for (const s of register) {
    if (s.seite !== undefined) {
      if (!s.seite || typeof s.seite !== 'object' || Array.isArray(s.seite)) { m.push(s.id + ': seite ist kein Objekt'); continue; }
      for (const k of Object.keys(s.seite)) if (!SEITE_FELDER.includes(k)) m.push(s.id + ': seite.' + k + ' ist kein Seitenfeld (' + SEITE_FELDER.join(', ') + ')');
    }
    const x = mitSeite(s);
    if (!(liste(x.exportwege).length || liste(x.importwege).length)) continue;
    for (const f of ['name', 'herausgeber']) {
      if (/vivodepot/i.test(String(x[f] || ''))) m.push(s.id + ': ' + f + ' nennt den Herstellernamen fest — `{marke}` setzen (White Label, Feld seite.' + f + ')');
    }
    if (s.status === 'fehlt' && !String(x.name || '').includes(MARKE_EIGENES_FORMAT)) {
      m.push(s.id + ': Status fehlt — auf der Seite steht das eigene Format, der Name braucht „' + MARKE_EIGENES_FORMAT + '“ (Feld seite.name)');
    } else if (s.status === 'orientiert' && !(s.seite && typeof s.seite.name === 'string' && s.seite.name.trim() && s.seite.name !== s.name)) {
      m.push(s.id + ': Status orientiert — die Seite braucht einen eigenen Namen, der sagt, wie das Produkt den Standard trägt (Feld seite.name)');
    }
  }
  return m;
}

function blockErzeugen(eintraege) {
  const zeilen = eintraege.map((e) => '  Object.freeze(' + JSON.stringify(e) + '),');
  return ANFANG + '\n/* Je Standard, den das Produkt liest oder schreibt: Kennung, Name, Herausgeber, Fassung, Richtung, Wege (Kennungen aus\n'
    + '   EXPORT_FORMATE und IMPORT_FORMATE). Die Seite: _ueberStandardsHTML. */\n'
    + 'const STANDARDS_SEITE = Object.freeze([\n' + zeilen.join('\n') + '\n]);\n' + ENDE;
}

function blockFinden(text) {
  const a = text.indexOf(ANFANG);
  if (a < 0) return null;
  const e = text.indexOf(ENDE, a);
  if (e < 0) return null;
  return { anfang: a, ende: e + ENDE.length, text: text.slice(a, e + ENDE.length) };
}

function einsetzen(text, block) {
  const b = blockFinden(text);
  if (b) return text.slice(0, b.anfang) + block + text.slice(b.ende);
  const i = text.indexOf(ANKER);
  if (i < 0) throw new Error('Anker fehlt: ' + ANKER);
  // vor den Kopfkommentar der Funktion, wenn einer direkt davor steht
  const kopf = text.lastIndexOf('/* Standards und Vereinbarungen', i);
  const ziel = kopf >= 0 && text.slice(kopf, i).split('*/').length === 2 ? kopf : i;
  return text.slice(0, ziel) + block + '\n' + text.slice(ziel);
}

function main(argv) {
  const pruefen = argv.includes('--check') || argv.includes('--pruefen');
  const i = argv.indexOf('--depot');
  const depot = i >= 0 ? path.resolve(argv[i + 1]) : REPO;
  const pfad = path.join(depot, 'vivodepot.html');
  const text = fs.readFileSync(pfad, 'utf8');
  const register = registerLesen(depot);
  const fehler = seitenFehler(register);
  if (fehler.length) { process.stdout.write('[standards-seite] Register:\n  ' + fehler.join('\n  ') + '\n'); return 1; }
  const block = blockErzeugen(seitenEintraege(register));
  const b = blockFinden(text);
  if (b && b.text === block) { process.stdout.write('[standards-seite] vivodepot.html: gleich\n'); return 0; }
  if (pruefen) {
    process.stdout.write('[standards-seite] vivodepot.html: ' + (b ? 'ABWEICHUNG vom Register' : 'Block FEHLT') + ' — node tools/standards-seite-erzeugen.js\n');
    return 1;
  }
  fs.writeFileSync(pfad, einsetzen(text, block), 'utf8');
  process.stdout.write('[standards-seite] vivodepot.html: ' + (b ? 'erneuert' : 'eingesetzt') + '\n');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { ANFANG, ENDE, SEITE_FELDER, STATUS_EIGENES_FORMAT, MARKE_EIGENES_FORMAT, registerLesen, mitSeite, seitenEintraege, seitenFehler, blockErzeugen, blockFinden, einsetzen, fassung, main };
