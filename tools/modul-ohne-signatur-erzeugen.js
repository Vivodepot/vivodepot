#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   modul-ohne-signatur-erzeugen.js — ein Modul aus Angaben bauen, unsigniert (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   WOZU. Wer ein Modul für einen Rechtsraum, einen Bereich, eine Institutionsart oder Blätter
   für Angehörige bauen will, soll das ohne Kern-Wissen und ohne Browser tun können. Dieses
   Werkzeug nimmt dieselben Angaben wie das entsprechende Formular des Studios
   (vivodepot-studio.html) und ruft dessen Bau- und Prüffunktionen auf. Es gibt keinen zweiten
   Bauweg: was hier entsteht, entstünde im Studio genauso.

   WAS ES NICHT TUT. Es signiert nichts, stellt kein Zertifikat aus und liest keinen Schlüssel.
   Das Ergebnis ist ein unsigniertes Modul; die App führt es als „unsigniert“ und setzt ihre
   Vertrauensfelder beim Einlass selbst. Ein unsigniertes Modul wirkt nie geprüft. Signieren unter
   dem Anker ist der Dienst der Ausgabestelle und gehört nicht hierher.

   ANGABEN. Eine JSON-Datei mit genau dem Formularabschnitt des Studios für den gewählten Typ,
   z. B. für `bereich`:
     { "herkunft": "beispiel-org", "sprache": "en", "moduleVersion": 1,
       "bereiche": [ { "id": "beispiel-garten", "label": "Allotment garden", "icon": "folder" } ] }
   Beispiele je Typ: docs/modules/angaben/<typ>.angaben.json.

   AUFRUF
     node tools/modul-ohne-signatur-erzeugen.js --typ <typ> --angaben <angaben.json> --ausgabedatei <modul.json>
       <typ>: bereich · rechtsraum · institutions-art · wizard · logikmodul · format · branding · angehoerigen-vorlage
       Exit 0: geschrieben. Exit 1: ein Blocker (nichts geschrieben, Gründe auf stderr). Exit 2: Aufruf falsch.
     node tools/modul-ohne-signatur-erzeugen.js --pruefen <modul.json> [--produkt privat-de|privat-en|pro-de|pro-en]
       prüft eine fertige Moduldatei mit der Einlassprüfung des Kerns, in einem leeren Depot des Produkts
       (Voreinstellung privat-de) und ohne Signatur: angenommen oder abgelehnt (Grund), verworfene Teile.
       Exit 0 angenommen, 1 abgelehnt.
     node tools/modul-ohne-signatur-erzeugen.js
       ohne Argument: Selbsttest — baut jedes Beispiel unter docs/modules/angaben/ und meldet je Typ das Ergebnis.
   Ein Sprachmodul (textsatz) entsteht nicht aus einem Formular, sondern als Übersetzung eines vollständigen Satzes;
   Vorbild ist tools/textsatz-en-modul-erzeugen.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ANGABEN_ORDNER = path.join(REPO, 'docs', 'modules', 'angaben');

/* Typ → Abschnitt im Studio-Zustand und die Prüffunktion des Studios, die { modul, blocker, warnungen } liefert. */
const TYPEN = Object.freeze({
  'bereich': { abschnitt: 'bereich', pruefen: 'pruefeBereich' },
  'rechtsraum': { abschnitt: 'rechtsraum', pruefen: 'pruefeRechtsraum' },
  'institutions-art': { abschnitt: 'institutionsArt', pruefen: 'pruefeInstitutionsArt' },
  'wizard': { abschnitt: 'wizard', pruefen: 'pruefeWizard' },
  'logikmodul': { abschnitt: 'logikmodul', pruefen: 'pruefeLogikmodul' },
  'format': { abschnitt: 'format', pruefen: 'pruefeFormat' },
  'branding': { abschnitt: 'branding', pruefen: 'pruefeBranding' },
  'angehoerigen-vorlage': { abschnitt: 'blatt', bauen: 'blattModulBauen', pruefenModul: 'blattModulPruefen' },
});
const HINWEIS = Object.freeze({
  branding: 'Ein Markenmodul nimmt die App nur signiert an; unsigniert dient es dem Prüfen und dem Bau eines eigenen Produkts.',
});

let _G = null;
function studio() {
  if (!_G) _G = require('../tests/load-generator.js').ladeGenerator().V;
  return _G;
}

/* Baut das Modul. Wirft nie; Ergebnis { ok, modul, blocker, warnungen }. */
function modulBauen(typ, angaben) {
  const t = TYPEN[typ];
  if (!t) return { ok: false, blocker: ['unbekannter Typ „' + typ + '“; bekannt: ' + Object.keys(TYPEN).join(', ')], warnungen: [] };
  if (!angaben || typeof angaben !== 'object' || Array.isArray(angaben)) return { ok: false, blocker: ['die Angaben sind kein JSON-Objekt'], warnungen: [] };
  const G = studio();
  const state = { [t.abschnitt]: angaben };
  if (t.bauen) {
    const modul = G[t.bauen](state);
    const g = G[t.pruefenModul](modul);
    const blocker = g && g.gueltig ? [] : ['das Modul besteht die Prüfung nicht: ' + ((g && g.grund) || 'unbekannt')];
    return { ok: !blocker.length, modul, blocker, warnungen: ((g && g.verworfene) || []).map((v) => JSON.stringify(v)) };
  }
  const r = G[t.pruefen](state);
  const blocker = (r && r.blocker) || ['keine Antwort der Prüfung'];
  return { ok: !blocker.length, modul: r && r.modul, blocker, warnungen: (r && r.warnungen) || [] };
}

/* Die Einlassprüfung des Kerns, unsigniert, in einem leeren Depot des genannten Produkts: dieselbe Antwort, die dieses
   Produkt beim Einlassen gäbe, samt seinen Reservierungen und seinem Kennungsbestand. */
function modulPruefen(text, produkt) {
  const { ladeKern } = require('../tests/load-kern.js');
  const V = ladeKern({ produkt: produkt || 'privat-de' }).V;
  const r = V.modulEinlassen(String(text), V.leeresDepot());
  return { angenommen: !!r.angenommen, grund: r.grund || null, typ: r.typ || null, verworfene: r.verworfene || [] };
}

function lauf(argv) {
  const wert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  if (argv.length === 0) return selbsttest();
  if (wert('--pruefen')) {
    let text;
    try { text = fs.readFileSync(path.resolve(wert('--pruefen')), 'utf8'); }
    catch (e) { console.error('[modul-ohne-signatur-erzeugen] Datei nicht lesbar: ' + e.message); return 2; }
    const r = modulPruefen(text, wert('--produkt'));
    for (const v of r.verworfene) console.log('[modul-ohne-signatur-erzeugen] verworfen: ' + JSON.stringify(v));
    console.log('[modul-ohne-signatur-erzeugen] ' + (r.angenommen ? 'angenommen (' + r.typ + '), unsigniert, geprüft gegen ' + (wert('--produkt') || 'privat-de') : 'abgelehnt: ' + r.grund));
    return r.angenommen ? 0 : 1;
  }
  const typ = wert('--typ');
  const angabenPfad = wert('--angaben');
  const ziel = wert('--ausgabedatei');
  if (!typ || !angabenPfad || !ziel) {
    console.error('[modul-ohne-signatur-erzeugen] Aufruf: --typ <typ> --angaben <angaben.json> --ausgabedatei <modul.json>');
    return 2;
  }
  let angaben;
  try { angaben = JSON.parse(fs.readFileSync(path.resolve(angabenPfad), 'utf8')); }
  catch (e) { console.error('[modul-ohne-signatur-erzeugen] Angaben nicht lesbar: ' + e.message); return 1; }
  const r = modulBauen(typ, angaben);
  for (const w of r.warnungen) console.error('[modul-ohne-signatur-erzeugen] Hinweis: ' + w);
  if (!r.ok) {
    for (const b of r.blocker) console.error('[modul-ohne-signatur-erzeugen] Blocker: ' + b);
    return 1;
  }
  if (istGetrackt(path.resolve(ziel))) {
    console.error('[modul-ohne-signatur-erzeugen] Ziel ist eine von git verfolgte Datei, es wird nichts geschrieben: ' + path.resolve(ziel));
    return 2;
  }
  const tmp = path.resolve(ziel) + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(r.modul, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, path.resolve(ziel));
  console.log('[modul-ohne-signatur-erzeugen] unsigniertes Modul geschrieben: ' + path.resolve(ziel));
  if (HINWEIS[typ]) console.log('[modul-ohne-signatur-erzeugen] ' + HINWEIS[typ]);
  return 0;
}

/* Das Werkzeug schreibt nur in die genannte Ausgabedatei und nie in eine Datei, die git verfolgt: ein erzeugtes
   Modul ist kein Erzeugnis des Repos und darf keines überschreiben. Ohne git (oder außerhalb eines Repos) gilt das
   Ziel als nicht verfolgt. */
function istGetrackt(ziel) {
  const ordner = path.dirname(ziel);
  if (!fs.existsSync(ordner)) return false;
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  const r = require('node:child_process').spawnSync('git', ['ls-files', '--error-unmatch', '--', path.basename(ziel)],
    { cwd: ordner, env, stdio: 'pipe' });
  return r.status === 0;
}

function selbsttest() {
  const dateien = fs.existsSync(ANGABEN_ORDNER) ? fs.readdirSync(ANGABEN_ORDNER).filter((d) => d.endsWith('.angaben.json')).sort() : [];
  if (!dateien.length) { console.error('[modul-ohne-signatur-erzeugen] keine Beispiele unter docs/modules/angaben/'); return 1; }
  let fehler = 0;
  for (const d of dateien) {
    const typ = d.replace(/\.angaben\.json$/, '');
    const r = modulBauen(typ, JSON.parse(fs.readFileSync(path.join(ANGABEN_ORDNER, d), 'utf8')));
    console.log('[modul-ohne-signatur-erzeugen] ' + typ + ': ' + (r.ok ? 'gebaut (' + r.modul.modulTyp + ')' : 'BLOCKER — ' + r.blocker.join('; ')));
    if (!r.ok) fehler++;
  }
  return fehler ? 1 : 0;
}

if (require.main === module) process.exitCode = lauf(process.argv.slice(2));

module.exports = { modulBauen, modulPruefen, lauf, TYPEN, ANGABEN_ORDNER };
