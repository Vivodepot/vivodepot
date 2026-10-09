#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   durchklick-bestaetigungslauf.js — der Bestätigungslauf auf dem Endstand (Auftrag,
   23.09.2026): alles, was der Vorlauf einzeln gefahren hat, in EINEM Aufruf.

     node tools/durchklick-bestaetigungslauf.js --hash <commit> --ausgabe <ordner> [--trocken]

   Ablauf, strikt nacheinander (ein Browser zur Zeit):
     1. Vorprüfung: <commit> muss Vorfahre von HEAD sein (sonst Abbruch mit dem Merge-Hinweis).
     2. Personas: 20 × {privat-de, privat-en}, alle Achsen, in Fünfer-Päckchen
        (tools/durchklick-abnahme-lauf.js).
     3. Journeys: (a) Empfängerkreis mit Bereich, (b) Versionstor Anker, dazu buergerweg-vier-produkte
        (playwright, --workers=1).
   Vor JEDEM Schritt wird gewartet, solange ein `git push` läuft (Weisung: bei Push pausieren).
   Die Specs laufen gegen die Auslieferungs-Bytes (global-setup über tests/produkt-test-backen.js,
   Byte-Gleichheit in tests/e2e-artefakt-gleich-auslieferung.test.js); die Personas gegen den echten
   Auslieferungs-Bake (_produktBauen).

   Ausgabe: <ausgabe>/bestaetigung.json + eine Tabelle auf stdout. Exit 1, wenn eine Spec rot ist, ein
   Personen-Lauf abbricht oder ein harter Befund AUSSERHALB der bekannten Liste steht.
   --trocken: zeigt nur den Plan, startet nichts (und prüft nur die Argumente).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');
const REPO = path.join(__dirname, '..');
const PRODUKTE = ['privat-de', 'privat-en'];
const PAECKCHEN = 5;
const SPECS = [
  ['journey-a-empfaengerkreis', 'tests/e2e/journey-empfaengerkreis-bereich-datei.spec.js'],
  ['journey-b-versionstor-anker', 'tests/e2e/journey-versionstor-anker.spec.js'],
  ['buergerweg-vier-produkte', 'tests/e2e/buergerweg-vier-produkte.spec.js'],
];
// Bekannt und erklärt — jeder andere harte Befund zählt als „neu" und macht den Lauf rot.
// - personas-notfallkontakt-luecke: keine Persona setzt health.emergencyContacts (die Probe greift ein).
// - notfallkarte-qr bei P14/P16/P18/P20: kein Mensch mit Telefonnummer → leerer QR (Befund NOTFALLKARTE-LEERER-QR,
//   offen, Verhalten entschieden). P7/P10/P13 (Blutgruppen-Minus) gehören NICHT hierher: auf dem
//   Endstand müssen sie grün sein.
const BEKANNTE_ACHSEN = new Set(['personas-notfallkontakt-luecke']);
const BEKANNT_LEERER_QR = new Set(['P14', 'P16', 'P18', 'P20']);
function istBekannt(b) {
  if (BEKANNTE_ACHSEN.has(b.achse)) return true;
  return b.achse === 'notfallkarte-qr' && BEKANNT_LEERER_QR.has(b.persona);
}

function argWert(name) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; }
function log(s) { process.stdout.write(s + '\n'); }

function pushLaeuft() {
  const ps = execFileSync('ps', ['-axo', 'command='], { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' });
  return ps.split('\n').some((z) => /(^|\/)git(\s+-C\s+\S+)?\s+push\b/.test(z) || /git-remote-https/.test(z));
}
function warteBisKeinPush(trocken) {
  if (trocken) return;
  let gewartet = 0;
  while (pushLaeuft()) {
    if (gewartet % 4 === 0) log('  … git push läuft — pausiere (' + gewartet * 15 + ' s)');
    spawnSync('sleep', ['15']); gewartet += 1;
  }
}

function persona(kennungen) {
  const { allePersonaKennungen } = require(path.join(REPO, 'tests', 'e2e', 'durchklick-abnahme-helpers.js'));
  const alle = allePersonaKennungen();
  if (kennungen) return kennungen;
  return alle;
}

function plan() {
  const alle = persona();
  const schritte = [];
  for (const p of PRODUKTE) {
    for (let i = 0; i < alle.length; i += PAECKCHEN) {
      schritte.push({ art: 'personas', produkt: p, personas: alle.slice(i, i + PAECKCHEN) });
    }
  }
  for (const [name, datei] of SPECS) schritte.push({ art: 'spec', name, datei });
  return schritte;
}

function main() {
  const hash = argWert('--hash');
  const trocken = process.argv.includes('--trocken');
  if (!hash) { process.stderr.write('Aufruf: --hash <commit> --ausgabe <ordner> [--trocken]\n'); process.exit(2); }
  const ausgabeArg = argWert('--ausgabe');
  if (!ausgabeArg && !trocken) { process.stderr.write('Aufruf: --ausgabe <ordner> ist Pflicht (kein fester Ort unter dem Temp-Verzeichnis)\n'); process.exit(2); }
  const ausgabe = path.resolve(ausgabeArg || '<ausgabe>');
  const schritte = plan();

  if (trocken) {
    log('TROCKEN — Plan für ' + hash + ' → ' + ausgabe);
    schritte.forEach((s, i) => log('  ' + (i + 1) + '. ' + (s.art === 'personas' ? s.produkt + ' ' + s.personas.join(',') : 'playwright ' + s.datei)));
    return;
  }

  const anc = spawnSync('git', ['merge-base', '--is-ancestor', hash, 'HEAD'], { cwd: REPO, env: ohneGitUmgebung() });
  if (anc.status !== 0) {
    process.stderr.write('Abbruch: ' + hash + ' ist nicht Vorfahre von HEAD. Erst mergen (Sicherungsref, stash -u, git merge ' + hash + ', stash apply).\n');
    process.exit(2);
  }
  fs.mkdirSync(ausgabe, { recursive: true });
  const kopf = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }).trim();
  log('Bestätigungslauf auf ' + hash + ' (HEAD ' + kopf.slice(0, 9) + ') → ' + ausgabe);

  const ergebnis = { hash, head: kopf, start: new Date().toISOString(), personas: [], specs: [], harteBefundeNeu: [], harteBefundeBekannt: [] };
  let rot = false;
  for (const s of schritte) {
    warteBisKeinPush(false);
    if (s.art === 'personas') {
      const ziel = path.join(ausgabe, s.produkt + '-' + s.personas[0]);
      log('▶ ' + s.produkt + ' ' + s.personas.join(','));
      const r = spawnSync('node', [path.join('tools', 'durchklick-abnahme-lauf.js'), '--produkte', s.produkt,
        '--personas', s.personas.join(','), '--ausgabe', ziel], { cwd: REPO, encoding: 'utf8', timeout: 30 * 60 * 1000 });
      fs.writeFileSync(ziel + '.log', (r.stdout || '') + (r.stderr || ''));
      let zus = null;
      try { zus = JSON.parse(fs.readFileSync(path.join(ziel, 'zusammenfassung.json'), 'utf8')); } catch (_) { /* fehlt → Abbruch gewertet */ }
      const fehlerPersonas = zus ? Object.values(zus.produkte || {}).flatMap((p) => (p.personas || []).filter((x) => x.fehler || x.rot).map((x) => x.personaId)) : ['(keine Zusammenfassung)'];
      const eintrag = { produkt: s.produkt, personas: s.personas, exit: r.status, fehlerPersonas };
      ergebnis.personas.push(eintrag);
      if (r.status !== 0 || !zus || fehlerPersonas.length) rot = true;
      for (const b of (zus && zus.harteBefunde) || []) {
        const achse = b.achse;
        const ziel2 = istBekannt(b) ? ergebnis.harteBefundeBekannt : ergebnis.harteBefundeNeu;
        ziel2.push({ produkt: s.produkt, persona: b.persona || null, achse, details: b.details || b.befund || null });
      }
    } else {
      log('▶ playwright ' + s.datei);
      const r = spawnSync('npx', ['playwright', 'test', s.datei, '--workers=1', '--reporter=line'], { cwd: REPO, encoding: 'utf8', timeout: 45 * 60 * 1000 });
      fs.writeFileSync(path.join(ausgabe, s.name + '.log'), (r.stdout || '') + (r.stderr || ''));
      ergebnis.specs.push({ name: s.name, datei: s.datei, exit: r.status });
      if (r.status !== 0) rot = true;
    }
  }
  if (ergebnis.harteBefundeNeu.length) rot = true;
  ergebnis.ende = new Date().toISOString();
  ergebnis.gruen = !rot;
  fs.writeFileSync(path.join(ausgabe, 'bestaetigung.json'), JSON.stringify(ergebnis, null, 1));

  log('\n=== Bestätigungslauf ' + (rot ? 'ROT' : 'GRÜN') + ' auf ' + hash + ' ===');
  for (const p of ergebnis.personas) log('  personas ' + p.produkt + ' ' + p.personas.join(',') + ': exit ' + p.exit + (p.fehlerPersonas.length ? ' FEHLER ' + p.fehlerPersonas.join(',') : ''));
  for (const sp of ergebnis.specs) log('  spec ' + sp.name + ': exit ' + sp.exit);
  log('  harte Befunde bekannt: ' + ergebnis.harteBefundeBekannt.length + ' · NEU (nicht in der bekannten Liste): ' + ergebnis.harteBefundeNeu.length);
  for (const b of ergebnis.harteBefundeNeu) log('    NEU ' + b.produkt + ' ' + (b.persona || '-') + ' ' + b.achse);
  log('  Ausgabe: ' + ausgabe);
  process.exit(rot ? 1 : 0);
}

if (require.main === module) main();
module.exports = { plan, pushLaeuft, istBekannt };
