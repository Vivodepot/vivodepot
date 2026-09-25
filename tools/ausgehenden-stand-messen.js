#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   Den AUSGEHENDEN Stand messen — nicht den Arbeitsbaum
   ----------------------------------------------------------------------------
   Alle Gates in `hooks/pre-push` messen den Arbeitsbaum: `tools/kampagne.js`
   liest `path.join(REPO, 'vivodepot.html')`, `npm run test:konformitaet` lädt
   dieselbe Datei im Browser, die Suite lädt sie über `tests/load-kern.js`. Was
   hinausgeht, ist aber der COMMIT. Beide sind identisch, solange der Arbeitsbaum
   sauber ist — und genau dann ist der Unterschied nicht zu sehen.

   Am 28.07.2026 ist ein in sich unstimmiger Commit durch das Gate gegangen. Er
   fiel auf, weil eine zweite Sitzung parallel maß. Wo nur eine Sitzung läuft,
   fällt er nicht auf: der Baum ist grün, der Commit ist es nicht, und das Gate
   sieht den Baum.

   Dieses Werkzeug packt den zu pushenden Stand über `git archive` in ein eigenes
   Verzeichnis aus und lässt die Gates DORT laufen. Der Gegenstand ist damit der
   Commit, nicht die Datei, die zufällig danebenliegt.

   Aufruf:
     node tools/ausgehenden-stand-messen.js                  # HEAD gegen @{upstream}
     node tools/ausgehenden-stand-messen.js --ref u2-kanon
     node tools/ausgehenden-stand-messen.js --nur-suite      # ohne Browser und Netz
     node tools/ausgehenden-stand-messen.js --ziel <pfad> --behalten

   Was NICHT hierher gehört: `scripts/pruefe-build-datum-bereich.js`. Das misst
   ohnehin den Commit-Bereich und nicht den Baum, und es braucht `.git` samt der
   Refs, die git dem Hook auf stdin gibt. Es bleibt im Hook.

   Zum node_modules-Verzeichnis: es liegt nicht im Archiv und kann nicht darin
   liegen — es ist keine Quelle. Das Werkzeug verlinkt das des Arbeitsbaums und
   prüft vorher, ob die `package-lock.json` im Archiv byte-gleich der des Baums
   ist. Ist sie es nicht, sagt es das und misst nicht weiter: dann gehören die
   verlinkten Abhängigkeiten nicht zu dem Stand, der hinausgeht.
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);

function argWert(name, ersatz) {
  const i = argv.indexOf(name);
  if (i === -1) return ersatz;
  const wert = argv[i + 1];
  if (!wert || wert.startsWith('--')) {
    console.error(`ABBRUCH: ${name} braucht einen Wert.`);
    process.exit(2);
  }
  return wert;
}

const REF = argWert('--ref', 'HEAD');
const NUR_SUITE = argv.includes('--nur-suite');
const BEHALTEN = argv.includes('--behalten');

/* ── git, jeder Aufruf einzeln geprüft ────────────────────────────────────── */
function git(args, opt = {}) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8', ...opt });
  if (r.status !== 0 && !opt.darfFehlschlagen) {
    console.error(`ABBRUCH: git ${args.join(' ')} → Status ${r.status}`);
    if (r.stderr) console.error(r.stderr.trim());
    process.exit(2);
  }
  return { status: r.status, aus: (r.stdout || '').trim(), fehler: (r.stderr || '').trim() };
}

/* ── 1. Den Stand bestimmen, der gemessen wird ────────────────────────────── */
const sha = git(['rev-parse', REF]).aus;
const kurz = git(['rev-parse', '--short', REF]).aus;
const betreff = git(['log', '-1', '--format=%s', sha]).aus;
const zweig = git(['rev-parse', '--abbrev-ref', 'HEAD']).aus;

console.log('════ Ausgehender Stand ═══════════════════════════════════════════');
console.log(`  Ref        : ${REF} → ${kurz}`);
console.log(`  Betreff    : ${betreff}`);
console.log(`  Zweig      : ${zweig}`);

const upstream = git(['rev-parse', '--abbrev-ref', `${REF}@{upstream}`], { darfFehlschlagen: true });
if (upstream.status === 0) {
  const bereich = git(['log', '--oneline', `${upstream.aus}..${sha}`]).aus;
  const zahl = bereich ? bereich.split('\n').length : 0;
  console.log(`  Gegenüber  : ${upstream.aus} — ${zahl} Commit(s) gehen hinaus`);
  if (bereich) for (const z of bereich.split('\n')) console.log(`               ${z}`);
} else {
  console.log('  Gegenüber  : kein Upstream — der ganze Zweig ginge hinaus');
}

/* ── 2. Sagen, ob Baum und Commit auseinanderliegen ───────────────────────────
   Das ist der Punkt des Werkzeugs, also wird es genannt und nicht verschwiegen.
   Es bricht NICHT ab: ein abweichender Baum ist erlaubt, er wird nur nicht
   gemessen. Wer das liest, weiß, dass die Zahl unten nicht seinen Baum meint. */
const schmutzig = git(['status', '--porcelain']).aus;
const baumGleichCommit = git(['diff', '--quiet', sha, '--'], { darfFehlschlagen: true }).status === 0;
console.log(`  Arbeitsbaum: ${schmutzig ? schmutzig.split('\n').length + ' Eintrag/Einträge' : 'sauber'}` +
            `${baumGleichCommit ? '' : '  ⚠ WEICHT VOM GEMESSENEN COMMIT AB'}`);
console.log('');

/* ── 3. Auspacken — zwei Schritte, jeder einzeln geprüft ─────────────────────
   Kein `git archive | tar -x`: eine Pipe verschluckt den Status der linken
   Seite, und ein leeres Archiv sähe aus wie ein Erfolg. */
const ziel = path.resolve(argWert('--ziel',
  fs.mkdtempSync(path.join(os.tmpdir(), `vd-ausgehend-${kurz}-`))));

/* Nicht in den Arbeitsbaum hinein auspacken: git sucht seine Wurzel nach oben,
   und die Wächter, die das Repo messen, mäßen dann das umgebende statt des
   ausgepackten Standes — grün aus dem falschen Grund. */
if (path.resolve(ziel) === REPO || path.resolve(ziel).startsWith(REPO + path.sep)) {
  console.error(`ABBRUCH: --ziel liegt im Arbeitsbaum (${ziel}).`);
  console.error('  Dort fände git die Wurzel dieses Repos und nicht den ausgepackten Stand.');
  process.exit(2);
}
fs.mkdirSync(ziel, { recursive: true });

const tarDatei = path.join(os.tmpdir(), `vd-ausgehend-${kurz}-${process.pid}.tar`);
git(['archive', '--format=tar', '-o', tarDatei, sha]);
const groesse = fs.statSync(tarDatei).size;
if (groesse === 0) {
  console.error('ABBRUCH: das Archiv ist leer.');
  process.exit(2);
}

const entpackt = spawnSync('tar', ['-xf', tarDatei, '-C', ziel], { encoding: 'utf8' });
if (entpackt.status !== 0) {
  console.error(`ABBRUCH: tar → Status ${entpackt.status}\n${entpackt.stderr}`);
  process.exit(2);
}
fs.unlinkSync(tarDatei);
console.log(`  Ausgepackt : ${ziel}  (${(groesse / 1048576).toFixed(1)} MB Archiv)`);

/* ── 4. Abhängigkeiten verlinken, aber nur bei gleicher Sperrdatei ────────── */
const lockArchiv = path.join(ziel, 'package-lock.json');
const lockBaum = path.join(REPO, 'package-lock.json');
if (!fs.existsSync(lockArchiv)) {
  console.error('ABBRUCH: keine package-lock.json im Archiv — der Stand nennt seine Fassungen nicht.');
  process.exit(2);
}
if (!fs.readFileSync(lockArchiv).equals(fs.readFileSync(lockBaum))) {
  console.error('ABBRUCH: package-lock.json im Archiv weicht vom Arbeitsbaum ab.');
  console.error('  Die node_modules des Baums gehören dann nicht zu diesem Stand.');
  console.error('  Erst `npm ci` auf dem ausgehenden Stand, dann hier ohne Verlinkung messen.');
  process.exit(2);
}
fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(ziel, 'node_modules'), 'dir');
console.log('  Module     : node_modules verlinkt (package-lock.json byte-gleich)');
console.log('');

/* ── 5. Die Gates — im ausgepackten Stand, nicht im Baum ──────────────────── */
const gates = [
  { name: 'Behavior-Suite', cmd: 'node', args: ['--test'] },
  { name: 'Kampagne-Gate', cmd: 'node',
    args: ['tools/kampagne.js', '--ebenen', '5,8b,8d,9b,12b,13a,13b,16,5rest', '--gate'] },
];
if (!NUR_SUITE) {
  gates.push({ name: 'Konformität (Browser)', cmd: 'npm', args: ['run', 'test:konformitaet'] });
  gates.push({ name: 'OSV-Scan (Netz)', cmd: 'python3', args: ['scripts/osv-scan.py', '--out', '.osv-cache'] });
}

const ergebnisse = [];
for (const g of gates) {
  const t0 = process.hrtime.bigint();
  /* Der ausgepackte Stand kennt seinen Commit nicht — er trägt keine Historie.
     Wer ihn in ein Protokoll schreibt (offline-garantie.mjs), bekommt ihn hier
     hereingereicht. Wo git antwortet, gilt git; die Variable springt nur ein. */
  const r = spawnSync(g.cmd, g.args, {
    cwd: ziel, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, VD_AUSGEPACKTER_STAND: sha },
  });
  const sek = Number(process.hrtime.bigint() - t0) / 1e9;
  const aus = (r.stdout || '') + (r.stderr || '');
  const gruen = r.status === 0;

  /* Die Zahl wird aus der Ausgabe gelesen, nicht geschätzt. */
  let zahl = '';
  const pass = aus.match(/^# pass (\d+)$/m);
  const fail = aus.match(/^# fail (\d+)$/m);
  if (pass && fail) zahl = `${pass[1]} Prüfungen, ${fail[1]} Fehlschläge`;

  /* Was sich selbst als UNGEMESSEN ausweist, wird MITGEZÄHLT und genannt.
     Ein Gate, das grün meldet und dabei zwei Wächter übersprungen hat, liest
     sich wie volle Deckung. Die Zeilen stehen ohnehin in der Ausgabe — sie hier
     zu wiederholen kostet nichts und macht den Unterschied sichtbar. */
  const ungemessen = aus.split('\n').filter((z) => z.includes('UNGEMESSEN'));

  ergebnisse.push({ ...g, gruen, sek, zahl, ungemessen });
  console.log(`  ${gruen ? '✓' : '✗'} ${g.name.padEnd(24)} ${sek.toFixed(1).padStart(6)} s` +
              `${zahl ? '   ' + zahl : ''}`);
  for (const z of ungemessen) console.log(`      ${z.trim()}`);
  if (!gruen) {
    console.log('  ── Ausgabe (letzte 40 Zeilen) ──────────────────────────────');
    for (const z of aus.trimEnd().split('\n').slice(-40)) console.log('  │ ' + z);
    console.log('  ────────────────────────────────────────────────────────────');
  }
}

/* ── 6. Aufräumen ─────────────────────────────────────────────────────────── */
if (BEHALTEN) {
  console.log(`\n  Verzeichnis bleibt stehen: ${ziel}`);
} else {
  fs.rmSync(ziel, { recursive: true, force: true });
}

const rot = ergebnisse.filter((e) => !e.gruen);
console.log('');
if (rot.length) {
  console.log(`ROT — ${rot.length} von ${ergebnisse.length} Gates am ausgehenden Stand ${kurz}:`);
  for (const e of rot) console.log(`  ✗ ${e.name}`);
  console.log('Dieser Stand darf nicht hinausgehen.');
  process.exit(1);
}
const uZahl = ergebnisse.reduce((n, e) => n + e.ungemessen.length, 0);
console.log(`GRÜN — ${ergebnisse.length} von ${ergebnisse.length} Gates am ausgehenden Stand ${kurz}.` +
            `${NUR_SUITE ? '  (--nur-suite: Browser und Netz nicht gemessen)' : ''}` +
            `${uZahl ? `  ${uZahl} Prüfung(en) haben sich als UNGEMESSEN ausgewiesen — siehe oben.` : ''}`);
process.exit(0);
