#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pre-push-Gate — ein Standard mit Status „echt" verlangt seinen gemessenen Prüferlauf, nur bei Anlass
   ────────────────────────────────────────────────────────────────────────
   WARUM (28.09.2026, U2-ADR-443/445): Die Registerzeile edc-ap (rdf-shacl.json, ITB-SHACL-Validator) steht auf
   „echt", weil ihr Lauf am offiziellen Werkzeug gemessen ist (tools/standards-register/). open-badges-3
   (json-schema.json, Prüfer von 1EdTech) ist ebenso gemessen, steht aber auf „teilweise", bis die Lizenz von
   inspector-core geklärt ist; das Gate verlangt den Lauf für beide. In der
   Node-Suite (pre-commit) bleibt dieser Lauf ohne Werkzeug ein sichtbares todo, denn Docker gibt es
   nicht auf jeder Maschine, und ein fehlendes Docker Desktop darf nicht jeden Commit jeder Sitzung
   sperren. Hier, vor der Auslieferung, gilt die scharfe Regel: „echt" und ungemessen ist rot.

   NUR BEI ANLASS (Gegenlesung, 28.09.2026): Scharf wird es, wenn der Push den Weg berührt, den die
   Messung belegt: die Dateien des Prüferlaufs selbst (ITB_EIGENE_DATEIEN) oder im Kern eine Zeile
   am Verwahr- bzw. Vorzeigepfad der Bildungsnachweise (KERN_WEG). Der Bereich kommt aus derselben
   Funktion wie beim E2E-Gate (geaenderteDateien aus scripts/pruefe-e2e-bereich.js). Ohne Anlass
   läuft nichts; der Hinweis nennt das Datum des letzten gemessenen Laufs aus der Registerzeile.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { geaenderteDateien } = require('./pruefe-e2e-bereich.js');

const REPO = path.join(__dirname, '..');
// Je gemessenem Standard: Registerzeile, Adapter und die Probe, die den Lauf verlangt.
const GEMESSEN = [
  { register: 'tools/standards-register/rdf-shacl.json', id: 'edc-ap', adapter: 'tests/konformitaet/adapter/itb-shacl.mjs',
    probe: 'tests/edc-itb-shacl-lauf.test.js', beheben: 'node tools/itb-shacl-beschaffen.mjs' },
  { register: 'tools/standards-register/json-schema.json', id: 'open-badges-3', adapter: 'tests/konformitaet/adapter/1edtech-validator.mjs',
    probe: 'tests/ob3-1edtech-lauf.test.js', beheben: 'node tools/1edtech-validator-beschaffen.mjs' },
];
const ITB_EIGENE_DATEIEN = [
  'tests/edc-itb-shacl-adapter.test.js',
  'tools/itb-shacl-beschaffen.mjs',
  'tests/fixtures/edci-europass-certofpart-signed.jsonld',
  'tests/fixtures/edci-europass-certofpart-unsigned.jsonld',
  'tests/fixtures/edci-europass-mc-signed.jsonld',
  'tests/ob3-1edtech-adapter.test.js',
  'tools/1edtech-validator-beschaffen.mjs',
  'tools/1edtech-validator/Dockerfile',
  ...GEMESSEN.flatMap((g) => [g.register, g.adapter, g.probe]),
];
const istEigene = (d) => ITB_EIGENE_DATEIEN.includes(d) || /^tests\/fixtures\/ob3-/.test(d);
// Die Kennungen des Kernwegs, den der Lauf belegt: Erkennen, Verwahren, Herausgeben eines EDC. Hängt an Namen —
// darum verlangt tests/pruefe-standards-echt-gate.test.js, daß jede Kern-Stelle, die EDC_AP_KONTEXT oder
// BILDUNG_DOK_TYPEN liest, hier steht (kernStellenMitBildungstyp); ein neuer Pfad unter anderem Namen fällt dort auf.
const KERN_WEG = /_ob3[A-Za-z]*|OB3_KENNUNG|mappeNachweisGueltigkeit|openbadges-3-extern|_jsonObjektAmAnfang|_edcOriginalAblegen|_edcNutzlastWennEdc|_edciExtern|EDC_AP_KONTEXT|BILDUNG_DOK_TYPEN|edci-europass-extern|importAutoritativDokument|_bytesZuDataUrl|_autoritativRohBytes|flowMappeOriginalHerunterladen|_autoritativTypDef|_ob3OriginalAblegen|shlProviderPayload|flowMappeVorschau/;

// Jede oberste Kern-Stelle (Funktion oder Konstante auf Spalte 0), die EDC_AP_KONTEXT, OB3_KENNUNG oder BILDUNG_DOK_TYPEN liest.
function kernStellenMitBildungstyp(kernText) {
  const stellen = new Set();
  let akt = null;
  for (const z of kernText.split('\n')) {
    const m = /^(?:async\s+)?function\s+([\w$]+)\s*\(|^(?:const|let|var)\s+([\w$]+)\s*=/.exec(z);
    if (m) akt = m[1] || m[2];
    if (/\b(?:EDC_AP_KONTEXT|OB3_KENNUNG|BILDUNG_DOK_TYPEN)\b/.test(z) && akt) stellen.add(akt);
  }
  return [...stellen];
}

// Die geänderten Kern-Zeilen (alt und neu) des Bereichs; null = nicht messbar.
function kernZeilen(lokalSha, remoteSha) {
  try {
    return execFileSync('git', ['diff', '-U0', remoteSha, lokalSha, '--', 'vivodepot.html'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n').filter((z) => /^[+-]/.test(z) && !/^(\+\+\+|---) /.test(z));
  } catch (_) { return null; }
}

function anlassGegeben(dateien, kernzeilen) {
  if (dateien === null) return { ja: true, grund: 'neuer Zweig oder kein messbarer Bereich' };
  const eigene = dateien.filter(istEigene);
  if (eigene.length) return { ja: true, grund: 'Datei des Prüferlaufs geändert: ' + eigene.join(', ') };
  if (dateien.includes('vivodepot.html')) {
    if (kernzeilen === null) return { ja: true, grund: 'Kern geändert, Diff nicht messbar' };
    const treffer = kernzeilen.filter((z) => KERN_WEG.test(z));
    if (treffer.length) return { ja: true, grund: 'Kern am Verwahr-/Vorzeigepfad geändert (' + treffer.length + ' Zeilen)' };
  }
  return { ja: false, grund: 'weder Datei des Prüferlaufs noch Kern am Verwahr-/Vorzeigepfad im Bereich' };
}

function registerZeile(g) {
  const r = JSON.parse(fs.readFileSync(path.join(REPO, g.register), 'utf8'));
  return r.standards.find((s) => s.id === g.id);
}

async function main() {
  const roh = fs.readFileSync(0, 'utf8').trim();
  if (!roh) { console.log('[standards-echt] nichts zu pushen'); return 0; }

  let anlass = { ja: false, grund: 'kein Ref mit Inhalt — der Hook bekam keine prüfbare Zeile' };
  for (const zeile of roh.split('\n').filter(Boolean)) {
    const [, lokalSha, , remoteSha] = zeile.split(/\s+/);
    if (/^0+$/.test(lokalSha)) continue;                     // Löschung eines Refs
    const dateien = geaenderteDateien(lokalSha, remoteSha);
    anlass = anlassGegeben(dateien, dateien && dateien.includes('vivodepot.html') ? kernZeilen(lokalSha, remoteSha) : []);
    if (anlass.ja) break;
  }

  if (!anlass.ja) {
    const letzte = GEMESSEN.map((g) => { const z = registerZeile(g); return g.id + ' ' + (z && z.gemessen ? z.gemessen.datum : 'keiner'); });
    console.log('[standards-echt] kein Anlass — ' + anlass.grund + '. Nicht gefahren. Letzter gemessener Lauf: ' + letzte.join(', ') + '.');
    return 0;
  }
  console.log('[standards-echt] Anlass: ' + anlass.grund);

  const rot = [];
  const fehlt = [];
  for (const g of GEMESSEN) {
    const zeile = registerZeile(g);
    if (!zeile || zeile.status !== 'echt') { console.log('[standards-echt] ' + g.id + ' steht nicht auf „echt" — nichts zu verlangen.'); continue; }
    const adapter = (await import(path.join(REPO, g.adapter))).default;
    const v = adapter.vorhanden();
    if (!v.ok) { fehlt.push(g.id + ': ' + v.grund + ' — Beheben: Docker Desktop starten; einmal ' + g.beheben); continue; }
    const env = Object.assign({}, process.env);
    delete env.NODE_TEST_CONTEXT;
    const lauf = spawnSync('node', ['--no-sparkplug', '--test', g.probe], { cwd: REPO, encoding: 'utf8', env, timeout: 300000 });
    const aus = (lauf.stdout || '') + (lauf.stderr || '');
    const todo = /ℹ todo (\d+)/.exec(aus);
    if ((lauf.error && lauf.error.code === 'ETIMEDOUT') || lauf.status !== 0 || !todo || todo[1] !== '0') {
      console.error(aus.split('\n').filter((z) => /✖|todo|fail/.test(z)).join('\n'));
      rot.push(g.id);
      continue;
    }
    console.log('[standards-echt] OK — ' + g.id + ' am Werkzeug gemessen, grün.');
  }
  const a = ausgang({ rot, fehlt });
  if (a.text) console.error(a.text);
  return a.code;
}

/* Zwei verschiedene Abbrüche, damit niemand ein abgeschaltetes Docker für einen Standardverstoß hält (Gegenlesung,
   29.09.2026, im Muster des Zeitabbruchs der Suite): ein ROTES Urteil des Prüfers ist Exit 1; fehlt nur das Werkzeug,
   ist es Exit 3 mit „KEIN roter Prüfbefund". Beides hält den Push an — „echt" und ungemessen ist nicht grün. */
const EXIT_WERKZEUG_FEHLT = 3;
function ausgang({ rot = [], fehlt = [] } = {}) {
  if (rot.length) {
    return { code: 1, text: '[standards-echt] ABBRUCH: der Prüferlauf ist ROT für ' + rot.join(', ') + ' — ein echter Befund am Standard.'
      + (fehlt.length ? '\n  Außerdem ungemessen: ' + fehlt.join(' · ') : '') };
  }
  if (fehlt.length) {
    return { code: EXIT_WERKZEUG_FEHLT, text: '[standards-echt] ABBRUCH OHNE WERKZEUG: Docker fehlt oder der Prüfer ist nicht beschafft — KEIN roter Prüfbefund. '
      + 'Ungemessen, nicht durchgefallen:\n  ' + fehlt.join('\n  ') + '\n  Werkzeug bereitstellen, dann erneut pushen.' };
  }
  return { code: 0, text: '' };
}

if (require.main === module) main().then((c) => { process.exitCode = c; }, (e) => { console.error('[standards-echt] ' + e.message); process.exitCode = 1; });

module.exports = { anlassGegeben, kernStellenMitBildungstyp, ausgang, EXIT_WERKZEUG_FEHLT, ITB_EIGENE_DATEIEN, KERN_WEG, GEMESSEN };
