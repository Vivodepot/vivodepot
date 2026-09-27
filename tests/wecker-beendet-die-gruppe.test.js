'use strict';
/* U2-ADR-273 (Wecker): der Abbruch beendet die GRUPPE, nicht nur den Elternprozeß.
   Diese Probe fährt den Zeitüberschreitungs-Pfad DIREKT — sie benutzt bewusst NICHT `npm test`.
   Die Frage ist „lebt danach noch etwas", und die wird von 6900 Prüfungen nur verdeckt und
   verteuert, nicht schärfer beantwortet.
   Beide Richtungen, weil ein Werkzeug, das Prozeßgruppen tötet, selbst destruktiv ist:
   es muss belegen, dass es trifft — UND dass es daneben nichts mitnimmt. */
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'mit-zeitgrenze.pl');

// Eindeutig je Lauf UND je Prozeß — parallele Suiten in mehreren Arbeitsbäumen dürfen sich
// nicht gegenseitig die Marker abräumen (die Falle, die U2-ADR-225 aufgeschrieben hat).
const marke = () => 'VDWECKER' + process.pid + '_' + Math.random().toString(36).slice(2, 10);

function haengerSkript(m) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-wecker-')), 'haenger.sh');
  fs.writeFileSync(p,
    '#!/bin/sh\n' +
    "perl -e 'sleep 8' " + m + ' &\n' +
    "perl -e 'sleep 8' " + m + ' &\n' +
    'sleep 8\n', { mode: 0o755 });
  return p;
}
const lebende = (m) => {
  const r = spawnSync('pgrep', ['-f', m], { encoding: 'utf8' });
  return (r.stdout || '').trim() ? r.stdout.trim().split('\n').length : 0;
};
const aufraeumen = (m) => { try { spawnSync('pkill', ['-f', m]); } catch (e) { /* egal */ } };
const warte = (ms) => spawnSync('sleep', [String(ms / 1000)]);

test('[Wecker] Zeitgrenze erreicht: Exit 142 UND keine verwaisten Arbeiter', () => {
  const m = marke();
  try {
    const r = spawnSync('perl', [WERKZEUG, '2', '--', haengerSkript(m)], { encoding: 'utf8', stdio: 'ignore' });
    assert.strictEqual(r.status, 142,
      'Der 142-Vertrag traegt: hooks/pre-commit erkennt den Haenger daran. ' +
      'Er muss 142 melden, EGAL woran der Prozess tatsaechlich gestorben ist — sonst ' +
      'verliert der rote Zweig seinen Ausloeser, ohne dass es auffaellt.');
    warte(1200);
    assert.strictEqual(lebende(m), 0,
      'DIE EIGENTLICHE ZUSICHERUNG: nach dem Abbruch lebt kein Kind mehr. Ohne sie prueft ' +
      'die Probe nur, dass der Wecker feuert — und das tat er vorher auch.');
  } finally { aufraeumen(m); }
});

test('[Wecker·Gegenrichtung] was AUSSERHALB der Gruppe laeuft, ueberlebt', () => {
  const mAussen = marke();
  const mInnen = marke();
  const aussen = spawn('perl', ['-e', 'sleep 90', mAussen], { detached: true, stdio: 'ignore' });
  aussen.unref();
  try {
    warte(300);
    assert.strictEqual(lebende(mAussen), 1, 'Vorbedingung: der Aussenstehende laeuft');
    spawnSync('perl', [WERKZEUG, '2', '--', haengerSkript(mInnen)], { encoding: 'utf8', stdio: 'ignore' });
    warte(1200);
    assert.strictEqual(lebende(mInnen), 0, 'innen: abgeraeumt');
    assert.strictEqual(lebende(mAussen), 1,
      'Ein Werkzeug, das Prozessgruppen toetet, muss zielen. Diese Haelfte wird gern ' +
      'vergessen und ist im Schadensfall die teure.');
  } finally { aufraeumen(mAussen); aufraeumen(mInnen); }
});

test('[Wecker·Rot-Beweis] die ALTE Bauart liess die Arbeiter am Leben', () => {
  const m = marke();
  try {
    const r = spawnSync('perl',
      ['-e', 'alarm 2; exec @ARGV or exit 127', '--', haengerSkript(m)], { encoding: 'utf8', stdio: 'ignore' });
    // Aus node heraus meldet spawnSync einen Signaltod als status:null + signal:'SIGALRM';
    // aus der Shell heraus als Exit 142. Beides ist derselbe Tod — die Probe akzeptiert beides,
    // weil sie den VERBLEIB der Kinder prueft, nicht die Form der Todesmeldung.
    assert.ok(r.status === 142 || r.signal === 'SIGALRM',
      'auch die alte Bauart starb am Wecker — daran lag es nie (status=' + r.status + ', signal=' + r.signal + ')');
    warte(1200);
    assert.strictEqual(lebende(m), 2,
      'DER DEFEKT, festgehalten: `alarm` ueberlebt `exec` und feuert IM Befehl; dessen Tod ' +
      'nimmt die Prozessgruppe nicht mit. Genau so entstanden in der Nacht zum 04.09.2026 ' +
      '172 verwaiste Prozesse. Wird diese Probe eines Tages gruen, ist die alte Bauart ' +
      'irgendwo zurueckgekehrt.');
  } finally { aufraeumen(m); }
});

test('[Wecker·Vertrag] normaler Lauf reicht Exit-Code und Ausgabe durch', () => {
  const ok = spawnSync('perl', [WERKZEUG, '30', '--', 'sh', '-c', 'echo hallo; exit 0'], { encoding: 'utf8' });
  assert.strictEqual(ok.status, 0);
  assert.match(ok.stdout, /hallo/);
  const rot = spawnSync('perl', [WERKZEUG, '30', '--', 'sh', '-c', 'exit 7'], { encoding: 'utf8' });
  assert.strictEqual(rot.status, 7, 'ein echter Fehlschlag bleibt sein eigener Exit-Code');
  const weg = spawnSync('perl', [WERKZEUG, '30', '--', 'gibtesnicht-vdwecker'], { encoding: 'utf8' });
  assert.strictEqual(weg.status, 127, 'nicht startbar bleibt 127');
});

test('[Wecker·extern] ein SIGTERM VON AUSSEN beendet dieselbe Gruppe, nicht nur den Wecker selbst', () => {
  // L3 (19.09.2026): ein abgebrochener Hook (z. B. `git push` unterbrochen) sendet dem
  // Wecker ein Signal, statt dass ihn niemand mehr beendet — der alte Zustand liess das Kind
  // (und dessen Gruppe) verwaist zurueck, weil nur der eigene Alarm reagierte.
  const m = marke();
  try {
    const wecker = spawn('perl', [WERKZEUG, '30', '--', haengerSkript(m)], { stdio: 'ignore' });
    // Warten bis die Arbeiter da sind (höchstens 5 s), statt eine feste Zeit: unter der Last einer vollen Suite (Hook-Lauf) startet perl + sh langsamer als 400 ms
    // und die Vorbedingung schlug zufällig fehl (0 statt 2), obwohl der Wecker richtig arbeitet.
    for (let i = 0; i < 50 && lebende(m) !== 2; i++) warte(100);
    assert.strictEqual(lebende(m), 2, 'Vorbedingung: die Arbeiter laufen, bevor das externe Signal kommt');
    wecker.kill('SIGTERM');
    warte(1200);
    assert.strictEqual(lebende(m), 0,
      'ROT ERWARTET, wenn falsch: ein externes SIGTERM an den Wecker muss dieselbe Gruppen-Toetung ' +
      'ausloesen wie ein Ablauf der Zeitgrenze — sonst bleibt die Gruppe als Waise zurueck.');
  } finally { aufraeumen(m); }
});

test('[Wecker·extern·Exit-Code] das externe SIGTERM bleibt am Exit-Code erkennbar (128+15), verwechselt sich nicht mit 142 (Zeitgrenze)', async () => {
  const m = marke();
  try {
    const wecker = spawn('perl', [WERKZEUG, '30', '--', haengerSkript(m)], { stdio: 'ignore' });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const exitCode = await new Promise((resolve) => {
      wecker.on('exit', (code) => resolve(code));
      wecker.kill('SIGTERM');
    });
    assert.strictEqual(exitCode, 143, 'ein externes SIGTERM ist NICHT die eigene Zeitgrenze (142) — beide duerfen sich am Exit-Code nicht verwechseln lassen');
  } finally { aufraeumen(m); }
});
