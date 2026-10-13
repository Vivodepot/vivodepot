#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   studio-rechtsraeume-backen.js — das Studio kennt die Rechtsräume aus ihren Modulen, nicht aus eigenen Listen
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────
   U2-ADR-495 (09.10.2026). Bisher standen die Rechtsformen als feste deutsche Liste
   im Studio (RECHTSFORMEN, RECHTSFORM_EN) und das Land war „Deutschland“ vorbelegt. Dieser Erzeuger bäckt aus jedem
   Rechtsraum-Modul unter tools/ (rechtsraum-*-modul.json) Kürzel, Namen und Rechtsformen in eine Region der Studio-Datei.
   Ein neuer Rechtsraum ist eine neue Moduldatei; das Studio ändert sich dafür nicht von Hand.
   Nichts wird erfunden: was ein Modul nicht trägt, steht nicht in der Region. Ein Modul ohne `rechtsformen` ergibt einen
   Rechtsraum, bei dem die Rechtsform als freier Text eingegeben wird.

     node tools/studio-rechtsraeume-backen.js                  Region neu schreiben
     node tools/studio-rechtsraeume-backen.js --check          Exit 1, wenn die Region nicht den Modulen entspricht
     node tools/studio-rechtsraeume-backen.js --module <ordner> --studio <pfad>   andere Quelle/Datei (Proben)
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STUDIO = path.join(REPO, 'vivodepot-studio.html');
const MODUL_ORDNER = path.join(REPO, 'tools');
const BEGIN = '/* STUDIO-RECHTSRAEUME:BEGIN — erzeugt von tools/studio-rechtsraeume-backen.js aus den Rechtsraum-Modulen, nicht von Hand ändern */';
const ENDE = '/* STUDIO-RECHTSRAEUME:END */';

function moduleLesen(ordner) {
  return fs.readdirSync(ordner).filter((n) => /^rechtsraum-[a-z0-9-]+-modul\.json$/.test(n)).sort()
    .map((n) => JSON.parse(fs.readFileSync(path.join(ordner, n), 'utf8')));
}
function eintrag(m) {
  if (!m || m.modulTyp !== 'rechtsraum' || typeof m.rechtsraum !== 'string' || !m.rechtsraum.trim()) throw new Error('kein Rechtsraum-Modul');
  const raus = { rechtsraum: m.rechtsraum.trim().toUpperCase() };
  if (m.name && typeof m.name === 'object') raus.name = { de: String(m.name.de || ''), en: String(m.name.en || m.name.de || '') };
  if (Array.isArray(m.rechtsformen)) {
    raus.rechtsformen = m.rechtsformen.map((r) => {
      if (!r || typeof r.kennung !== 'string' || !r.kennung.trim()) throw new Error(raus.rechtsraum + ': Rechtsform ohne Kennung');
      const f = { kennung: r.kennung, label: String(r.label || r.kennung), labelEn: String(r.labelEn || r.label || r.kennung) };
      if (typeof r.art === 'string' && r.art) f.art = r.art;   // welche Art von Einrichtung das ist (für die Vorbelegung aus dem Assistenten)
      return f;
    });
  }
  return raus;
}
function regionErzeugen(module) {
  const liste = module.map(eintrag);
  return BEGIN + '\nconst STUDIO_RECHTSRAEUME = Object.freeze(' + JSON.stringify(liste) + ');\n' + ENDE;
}
function regionLesen(text) {
  const a = text.indexOf(BEGIN), e = text.indexOf(ENDE);
  if (a < 0 || e < a || text.indexOf(BEGIN, a + 1) >= 0) return null;
  return text.slice(a, e + ENDE.length);
}
function studioMitRegion(text, region) {
  const alt = regionLesen(text);
  if (!alt) throw new Error('Region STUDIO-RECHTSRAEUME fehlt oder steht mehrfach');
  return text.replace(alt, () => region);
}
module.exports = { moduleLesen, eintrag, regionErzeugen, regionLesen, studioMitRegion, BEGIN, ENDE, STUDIO, MODUL_ORDNER };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const wert = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? path.resolve(argv[i + 1]) : d; };
  const studio = wert('--studio', STUDIO), ordner = wert('--module', MODUL_ORDNER);
  const text = fs.readFileSync(studio, 'utf8');
  const soll = regionErzeugen(moduleLesen(ordner));
  if (argv.includes('--check')) {
    if (regionLesen(text) !== soll) { console.error('[studio-rechtsraeume] ROT: die Region entspricht nicht den Rechtsraum-Modulen (neu backen: node tools/studio-rechtsraeume-backen.js)'); process.exit(1); }
    console.log('[studio-rechtsraeume] grün'); process.exit(0);
  }
  fs.writeFileSync(studio, studioMitRegion(text, soll));
  console.log('[studio-rechtsraeume] Region geschrieben');
}
