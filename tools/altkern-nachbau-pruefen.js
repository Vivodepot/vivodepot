#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   altkern-nachbau-pruefen.js — baut das heutige produktTextErzeugen eine AUSGELIEFERTE Fassung byte-gleich nach? (v894)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Der Shop baut mit dem jeweils neuen produktTextErzeugen auch aus hochgeladenen alten Kernen. Ändert das Werkzeug eine
   alte Fassung still, merkt es niemand: die Datei sieht aus wie immer, trägt aber eine andere Prüfsumme als die, die das
   Fassungsregister und das Rezept nennen.

   Der Weg: die zuletzt ausgelieferte Fassung des Produkts aus dem Register (tools/lib/altkern-referenz.js), deren Baum per
   `git archive <kanonCommit>` in ein Temp-Verzeichnis, dort tools/lib/produkt-text-erzeugen.js durch die HEUTIGE Fassung
   ersetzt, dann konfektionieren wie `tools/vier-produkte-erzeugen.js --wie-ausgeliefert` (ohne Angleichung byte-gleich zum
   Shop-Bau, gehalten von der Bauwege-Probe) — und die Prüfsumme gegen die Registerzeile.

   Aufruf:
     node tools/altkern-nachbau-pruefen.js                 # Exit 0 = byte-gleich, 1 = abweichend
     node tools/altkern-nachbau-pruefen.js --ohne-tausch   # Kontrolle: der alte Baum mit seinem eigenen Werkzeug
     node tools/altkern-nachbau-pruefen.js --manipuliere   # Rot-Beweis: eine Zutat um ein Zeichen verändert
     --produkt <slug> (Vorgabe privat-de) · --register <pfad> (ein anderes Fassungsregister, z. B. das des Kanons) · --json
   Probe: tests/e2e/altkern-shop-bau.spec.js (läuft mit der E2E im pre-push).
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { referenzLesen, REGISTER } = require('./lib/altkern-referenz.js');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const NEUES_WERKZEUG = path.join(REPO, 'tools', 'lib', 'produkt-text-erzeugen.js');

/* Läuft IM alten Baum: konfektioniert ein Produkt wie tools/vier-produkte-erzeugen.js und gibt die Prüfsumme aus. */
const KIND = `
const path = require('path'); const fs = require('fs'); const crypto = require('crypto'); const os = require('os');
const baum = process.argv[1]; const slug = process.argv[2]; const manipuliere = process.argv[3] === '1'; const ablage = process.argv[4] || '';
const { PRODUKTE, modulDateienFuer } = require(path.join(baum, 'tools/lib/vier-produkte.js'));
const { konfektionieren } = require(path.join(baum, 'tools/produkt-konfektionieren.js'));
const ISSUER = require(path.join(baum, 'tests/load-issuer.js')).ladeIssuer().V;
const p = PRODUKTE.find((x) => x.slug === slug);
const dateien = modulDateienFuer(p);
if (manipuliere) {
  // Eine gültige, aber andere Zutat: ein Satz des Sprachmoduls bekommt ein Zeichen mehr.
  const d = dateien.find((f) => /textsatz-/.test(path.basename(f)));
  const m = JSON.parse(fs.readFileSync(d, 'utf8')); const k = Object.keys(m.texte)[0]; m.texte[k] += '.';
  fs.writeFileSync(d, JSON.stringify(m, null, 2));
}
const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'altkern-ziel-'));
const g = konfektionieren({ ziel, slug, modulauswahl: [], vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt, unsignierteModulDateien: dateien, wieAusgeliefert: true });
const datei = path.join(g.ordner, 'vivodepot.html');
if (ablage) fs.copyFileSync(datei, path.join(ablage, 'vivodepot.html'));
process.stdout.write(JSON.stringify({ sha256: crypto.createHash('sha256').update(fs.readFileSync(datei)).digest('hex') }));
fs.rmSync(ziel, { recursive: true, force: true });
`;

/* ablage: ein Ordner, in den die nachgebaute vivodepot.html kopiert wird (für den Browserlauf der Probe). */
function pruefen({ produkt = 'privat-de', ohneTausch = false, manipuliere = false, ablage = '', registerPfad = REGISTER } = {}) {
  const ref = referenzLesen(produkt, registerPfad);
  const zeile = JSON.parse(fs.readFileSync(registerPfad, 'utf8')).zeilen.find((z) => z.fassung === ref.fassung && z.produkt === produkt);
  const baum = fs.mkdtempSync(path.join(os.tmpdir(), 'altkern-baum-'));
  try {
    const archiv = spawnSync('git', ['archive', '--format=tar', ref.kanonCommit], { cwd: REPO, env: ohneGitUmgebung(), maxBuffer: 1 << 30 });
    if (archiv.status !== 0) throw new Error('git archive ' + ref.kanonCommit + ' scheitert: ' + String(archiv.stderr).trim());
    const tar = spawnSync('tar', ['-x', '-C', baum], { input: archiv.stdout, maxBuffer: 1 << 30 });
    if (tar.status !== 0) throw new Error('tar scheitert: ' + String(tar.stderr).trim());
    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(baum, 'node_modules'));
    if (!ohneTausch) fs.copyFileSync(NEUES_WERKZEUG, path.join(baum, 'tools', 'lib', 'produkt-text-erzeugen.js'));
    const kind = spawnSync(process.execPath, ['-e', KIND, baum, produkt, manipuliere ? '1' : '0', ablage], { cwd: baum, encoding: 'utf8', maxBuffer: 1 << 26 });
    if (kind.status !== 0) throw new Error('Nachbau im alten Baum scheitert: ' + (kind.stderr || '').trim().split('\n').filter((z) => !/^\s+at /.test(z)).slice(0, 4).join(' | '));
    const { sha256 } = JSON.parse(kind.stdout.trim().split('\n').pop());
    return { ...ref, erwartet: zeile.sha256, gebaut: sha256, gleich: sha256 === zeile.sha256, werkzeug: ohneTausch ? 'alt' : 'heute', manipuliert: manipuliere };
  } finally {
    fs.rmSync(baum, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--produkt');
  const j = argv.indexOf('--register');
  const r = pruefen({ produkt: i >= 0 ? argv[i + 1] : 'privat-de', ohneTausch: argv.includes('--ohne-tausch'), manipuliere: argv.includes('--manipuliere'),
    registerPfad: j >= 0 ? path.resolve(argv[j + 1]) : REGISTER });
  if (argv.includes('--json')) console.log(JSON.stringify(r));
  else console.log((r.gleich ? 'GLEICH' : 'ABWEICHEND') + ' — ' + r.produkt + ' ' + r.fassung + ' (' + r.kanonCommit + '), Werkzeug ' + r.werkzeug
    + (r.manipuliert ? ', Zutat manipuliert' : '') + ': erwartet ' + r.erwartet.slice(0, 12) + ', gebaut ' + r.gebaut.slice(0, 12));
  process.exitCode = r.gleich ? 0 : 1;
}

module.exports = { pruefen };
