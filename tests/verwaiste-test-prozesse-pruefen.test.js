'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   L3 (19.09.2026): tools/verwaiste-test-prozesse-pruefen.js findet echte, verwaiste
   node --test-Prozesse (PPID 1) in bekannten Arbeitsbäumen und beendet NUR nach erneuter Prüfung
   und expliziter Bestätigung, nie über ein Namens- oder Musterfeld.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const {
  etimeInMinuten, istWaisenTestProzess, cwdVon, bekannteArbeitsbaeume, findeWaisen, beenden, alleProzesse,
  gruppeSicherBeenden,
} = require('../tools/verwaiste-test-prozesse-pruefen.js');

const env = ohneGitUmgebung();

test('[etimeInMinuten] alle drei ps-Formen ([[TT-]SS:]MM:SS)', () => {
  assert.equal(etimeInMinuten('05:30'), 5.5);
  assert.equal(etimeInMinuten('01:05:30'), 65.5);
  assert.equal(etimeInMinuten('2-01:05:30'), 2 * 24 * 60 + 65.5);
  assert.equal(etimeInMinuten('nicht-lesbar'), 0);
});

test('[Erkennung·rein] alle drei Merkmale müssen zutreffen — je eines fehlend ist KEIN Fund', () => {
  const arbeitsbaeume = ['/repo/wt1'];
  const echterWaise = { pid: 1, ppid: 1, kommando: '/usr/bin/node --test datei.test.js' };
  assert.equal(istWaisenTestProzess(echterWaise, arbeitsbaeume, '/repo/wt1/unter/ordner'), true);
  assert.equal(istWaisenTestProzess({ ...echterWaise, ppid: 500 }, arbeitsbaeume, '/repo/wt1'), false, 'kein Waise: hat einen echten Elter');
  assert.equal(istWaisenTestProzess({ ...echterWaise, kommando: '/usr/bin/node server.js' }, arbeitsbaeume, '/repo/wt1'), false, 'kein --test in der Kommandozeile');
  assert.equal(istWaisenTestProzess(echterWaise, arbeitsbaeume, '/anderes/projekt'), false, 'Arbeitsverzeichnis außerhalb jedes bekannten Baums');
  assert.equal(istWaisenTestProzess(echterWaise, arbeitsbaeume, null), false, 'kein lesbares Arbeitsverzeichnis (lsof fehlgeschlagen) — kein Fund, kein Rätselraten');
});

function repoMitWorktree() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'waisen-repo-'));
  const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: repo, env, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'a'), '1');
  g('add', '-A'); g('commit', '-q', '-m', 'basis');
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'waisen-wt-'));
  fs.rmSync(wt, { recursive: true, force: true });
  g('worktree', 'add', '--detach', wt);
  return { repo, wt };
}

/* Doppel-Fork: der Zwischenprozess spawnt das eigentliche Kind losgelöst (detached) und beendet
   sich sofort selbst — das Kind wird dadurch vom Betriebssystem an PID 1 neu verwaist, genau der
   reale Zustand, den dieser Wächter erkennen soll (kein Simulieren einer PPID, ein ECHTER Waise). */
/* WICHTIG: sowohl der Zwischenprozess als auch das eigentliche Kind bekommen eine Umgebung OHNE
   NODE_TEST_CONTEXT — sonst erbt das Kind die Variable von DIESEM Testlauf selbst (der ja unter
   node --test steht), node:test haelt einen `--test`-Aufruf mit gesetztem NODE_TEST_CONTEXT dann
   fuer verschachtelt und ueberspringt ihn sofort (still, ohne Fehler) — der erzeugte "Waise" waere
   in Wahrheit gar nicht gestartet, sondern binnen Millisekunden schon wieder beendet. Gemessen
   beim Bau dieser Probe: mit geerbtem NODE_TEST_CONTEXT verschwand der Prozess reproduzierbar
   innerhalb von 50ms, ohne dass die Zieldatei auch nur ihre erste Zeile ausfuehrte. */
/* Befund HOCH (20.09.2026): gibt NICHT nur die PID zurueck, sondern gleich die passende
   Aufraeum-Funktion mit — wer echtenWaisenErzeugen() aufruft, kann `aufraeumen()` nicht vergessen,
   ohne es hinzuschreiben, und kann nicht aus Versehen wieder auf ein blosses
   `process.kill(pid, 'SIGKILL')` zurueckfallen (das trifft nur den Orchestrator, nie den
   Worker-Kindprozess — GENAU DAS liess elf Waisen liegen, s. Kommentar an gruppeSicherBeenden). */
function echtenWaisenErzeugen(cwd) {
  const kindEnv = { ...ohneGitUmgebung() };
  delete kindEnv.NODE_TEST_CONTEXT;
  const haengtDatei = path.join(cwd, '_haengt.test.js');
  fs.writeFileSync(haengtDatei, "const { test } = require('node:test');\ntest('haengt fuer die Probe', () => new Promise(() => {}));\n");
  const zwischenskript = path.join(cwd, '_zwischenfork.js');
  fs.writeFileSync(zwischenskript, `
    const { spawn } = require('node:child_process');
    const kind = spawn(process.execPath, ['--test', '--test-timeout=0', ${JSON.stringify(haengtDatei)}], { cwd: ${JSON.stringify(cwd)}, env: ${JSON.stringify(kindEnv)}, detached: true, stdio: 'ignore' });
    process.stdout.write(String(kind.pid));
    kind.unref();
    process.exit(0);
  `);
  const r = execFileSync(process.execPath, [zwischenskript], { encoding: 'utf8', env: kindEnv });
  fs.rmSync(zwischenskript);
  const pid = Number(r.trim());
  return { pid, aufraeumen: () => gruppeSicherBeenden(pid) };
}

function lebt(pid) {
  try { process.kill(pid, 0); return true; } catch (_) { return false; }
}

test('[Rot-Beweis·echt] ein wirklich verwaister node --test-Prozess in einem bekannten Arbeitsbaum wird gefunden', () => {
  const { repo, wt } = repoMitWorktree();
  let pid, aufraeumen;
  try {
    ({ pid, aufraeumen } = echtenWaisenErzeugen(wt));
    // PPID-Umstellung auf 1 ist nicht synchron mit dem Spawn — kurz nachfassen, ohne beliebig lang zu blockieren.
    const bisPpid1 = Date.now() + 3000;
    let ppid = -1;
    while (Date.now() < bisPpid1) {
      try { ppid = Number(execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' }).trim()); } catch (_) { ppid = -1; }
      if (ppid === 1) break;
    }
    assert.equal(ppid, 1, 'Vorbedingung: der erzeugte Prozess muss wirklich verwaist sein (PPID 1)');
    assert.equal(cwdVon(pid), fs.realpathSync(wt), 'Vorbedingung: lsof muss das Arbeitsverzeichnis korrekt lesen');
    assert.ok(bekannteArbeitsbaeume(repo).includes(fs.realpathSync(wt)), 'Vorbedingung: git worktree list muss den Zweig kennen');

    const funde = findeWaisen(0, repo);
    assert.ok(funde.some((f) => f.pid === pid), 'der echte Waise muss in der Liste stehen: ' + JSON.stringify(funde.map((f) => f.pid)));
  } finally {
    // Befund HOCH (20.09.2026): gruppeSicherBeenden statt process.kill(pid, …) — sonst bleibt
    // der Worker-Kindprozess (--test-isolation=process) als NEUER Waise zurueck, egal ob die
    // Zusicherung oben durchfaellt oder der Lauf sonstwie abbricht.
    if (aufraeumen) aufraeumen();
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(wt, { recursive: true, force: true });
  }
});

test('[Rot-Beweis·Beenden] --beenden prüft ERNEUT vor dem Signal — eine falsche PID (kein Waise) wird verweigert, die richtige mit Bestätigung wirklich beendet', () => {
  const { repo, wt } = repoMitWorktree();
  let pid, aufraeumen;
  try {
    ({ pid, aufraeumen } = echtenWaisenErzeugen(wt));
    const bisPpid1 = Date.now() + 3000;
    while (Date.now() < bisPpid1) {
      let ppid = -1;
      try { ppid = Number(execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' }).trim()); } catch (_) { /* noch nicht */ }
      if (ppid === 1) break;
    }
    const fremd = beenden(process.pid, 0, repo); // die eigene Testrunner-PID: lebt, aber kein Waise
    assert.equal(fremd.ok, false, 'ROT ERWARTET: ein Prozess, der die Merkmale nicht erfüllt, darf NIE beendet werden');
    assert.ok(lebt(process.pid), 'die eigene PID darf unter keinen Umständen getroffen worden sein');

    // Der Worker-Kindprozess (--test-isolation=process) teilt die Prozessgruppe des Orchestrators —
    // beenden() muss ihn MITNEHMEN (Fund beim Bau, 19.09.2026: sonst bleibt der Worker als neuer Waise zurück).
    const bisWorker = Date.now() + 2000;
    let workerPid = null;
    while (Date.now() < bisWorker && !workerPid) {
      try {
        const roh = execFileSync('ps', ['-eo', 'pid,ppid'], { encoding: 'utf8' });
        for (const zeile of roh.split('\n')) {
          const t = zeile.trim().split(/\s+/);
          if (Number(t[1]) === pid) { workerPid = Number(t[0]); break; }
        }
      } catch (_) { /* noch keiner */ }
    }
    assert.ok(workerPid, 'Vorbedingung: der Waise muss selbst einen Worker-Kindprozess haben');

    const r = beenden(pid, 0, repo);
    assert.equal(r.ok, true, JSON.stringify(r));
    const bisTot = Date.now() + 3000;
    let tot = false;
    while (Date.now() < bisTot) { if (!lebt(pid)) { tot = true; break; } }
    assert.ok(tot, 'der echte Waise muss nach SIGTERM tatsächlich enden');
    const bisWorkerTot = Date.now() + 3000;
    let workerTot = false;
    while (Date.now() < bisWorkerTot) { if (!lebt(workerPid)) { workerTot = true; break; } }
    assert.ok(workerTot, 'ROT ERWARTET, wenn falsch: der Worker-Kindprozess (PID ' + workerPid + ') muss MIT beendet werden — sonst bleibt er als neuer Waise zurück');
  } finally {
    // Fallback-Netz, falls eine Zusicherung VOR dem beenden()-Aufruf oben durchfaellt: derselbe
    // gruppenbewusste Aufraeumer wie in der anderen Probe, nie ein blosses process.kill(pid, …).
    if (aufraeumen) aufraeumen();
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(wt, { recursive: true, force: true });
  }
});

/* ══ Befund HOCH (20.09.2026): eigene Waisen dieser Datei ═══════════════════════════
   Der Rot-Beweis fuer die eigentliche Reparatur (gruppeSicherBeenden trifft Orchestrator UND
   Worker) steht schon oben in [Rot-Beweis·Beenden] — dort verifiziert beenden() intern genau
   dasselbe Signalisieren der Prozessgruppe, das gruppeSicherBeenden jetzt im finally jeder
   dieser beiden Proben nutzt. Ein zweiter, eigens nachgestellter Vorher/Nachher-Vergleich
   (naiver Einzel-Kill vs. gruppeSicherBeenden an zwei frischen Waisen) erwies sich unter Last
   als zeitkritisch genug, selbst zu flackern — mehr Risiko als Beleg. Was hier steht, ist darum
   die STRUKTURELLE Ratsche gegen die Fehlerklasse, nicht eine weitere Prozess-Probe. */

test('[Waisen-Fixture·Ratsche] die Fixture-Fabrik liefert die Aufraeum-Funktion IMMER mit, nicht nur die PID', () => {
  // Strukturelle Ratsche gegen die Fehlerklasse (keine Text-Suche im eigenen Quelltext — eine
  // Probe, die nach ihrem eigenen Muster im Quelltext sucht, faengt sich leicht in ihren
  // eigenen Kommentaren, s. Regel „Wert nicht literal"). Stattdessen die API selbst pruefen:
  // wer den erzeugten Waisen abfragt, bekommt niemals nur eine PID zum Kuemmern-muss-man-
  // selber, sondern immer auch die passende, gruppenbewusste Aufraeum-Funktion GLEICH MIT —
  // ein spaeterer Umbau, der das wieder auf eine blosse Zahl zurueckbaut, faellt hier auf.
  const { repo, wt } = repoMitWorktree();
  let ergebnis;
  try {
    ergebnis = echtenWaisenErzeugen(wt);
    assert.equal(typeof ergebnis.pid, 'number');
    assert.equal(typeof ergebnis.aufraeumen, 'function',
      'ROT ERWARTET, wenn die Fabrik wieder nur eine nackte PID liefert: ohne mitgelieferte '
      + 'Aufraeum-Funktion faellt der Aufrufer leicht auf ein blosses process.kill(pid, …) '
      + 'zurueck, und der Worker-Kindprozess bleibt als neuer Waise zurueck.');
  } finally {
    if (ergebnis) ergebnis.aufraeumen();
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(wt, { recursive: true, force: true });
  }
});

test('[gruppeSicherBeenden] lehnt ungueltige PIDs ab, ohne zu werfen', () => {
  assert.equal(gruppeSicherBeenden(0).ok, false);
  assert.equal(gruppeSicherBeenden(1).ok, false, 'PID 1 (init/launchd) darf niemals Ziel sein');
  assert.equal(gruppeSicherBeenden(-5).ok, false);
  assert.equal(gruppeSicherBeenden(NaN).ok, false);
});

