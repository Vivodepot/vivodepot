#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   platte-protokoll — je Aufruf eine Zeile: wie viel frei ist und wo die größten Posten liegen (05.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Am 05.11.2026 fehlte im Lauf des Tages Platz, und ohne Messung vom Morgen ließ sich der Rest nicht zuordnen. Dazu
   kam ein Vergleich in zwei Einheiten: `df -h` rechnet in GiB, der Finder in GB und zählt „purgeable“ als frei mit. Jede
   Zeile dieses Protokolls nennt darum beide Werte in GB (10⁹ Byte) und die Posten, die einen Verlust erklären können.

   Spalten (Tab-getrennt, eine Zeile je Aufruf):
     zeit · frei_gb (df, ohne purgeable) · frei_wichtig_gb (mit purgeable, wie der Finder; leer, wo nicht messbar) ·
     swap_gb (belegt) · schnappschuesse (Zahl der lokalen) · produkt_html (Zahl der Ordner produkt-html-* im TMPDIR) ·
     danach je Ort „name=gb“ (du -sk).

   AUFRUF
     node tools/platte-protokoll.js                       gegen die Beispiel-Ausgaben in BEISPIEL (Probe, ohne Messung)
     node tools/platte-protokoll.js --messen [--protokoll <datei>] [--ort name=pfad …]
                                                          misst diesen Rechner; mit --protokoll wird die Zeile angehängt
   Vorgabe-Orte bei --messen: tmpdir (os.tmpdir()), caches (~/Library/Caches). Weitere Orte mit --ort, z. B. die Arbeitsbäume.
   Das Werkzeug löscht nichts.
   Probe: tests/platte-protokoll.test.js. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GB = 1e9;
const RESTE = /^produkt-html-/;

const gb = (byte) => (byte / GB).toFixed(1);
const zwei = (n) => String(n).padStart(2, '0');
// Ortszeit wie `date '+%F %H:%M'`, damit die Zeile neben den Zeiten der Übergaben steht
const ortszeit = (d) => d.getFullYear() + '-' + zwei(d.getMonth() + 1) + '-' + zwei(d.getDate()) + ' ' + zwei(d.getHours()) + ':' + zwei(d.getMinutes());

/* `df -k <pfad>`: die Spalte Avail der letzten Zeile, in Byte. */
function dfFreiLesen(text) {
  const zeilen = String(text).trim().split('\n');
  const kopf = zeilen[0].split(/\s+/);
  const i = kopf.findIndex((s) => /^Avail/i.test(s));
  const werte = zeilen[zeilen.length - 1].split(/\s+/);
  const kb = Number(werte[i]);
  if (i < 0 || !Number.isFinite(kb)) throw new Error('df: Spalte Avail nicht lesbar');
  return kb * 1024;
}

/* `sysctl vm.swapusage`: „used = 56820.00M“ in Byte. */
function swapLesen(text) {
  const m = /used = ([0-9.]+)([KMG])/.exec(String(text));
  if (!m) return null;
  return Number(m[1]) * { K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[m[2]];
}

/* `tmutil listlocalsnapshots /`: Zahl der Zeilen com.apple.…. */
function schnappschuesseLesen(text) {
  return String(text).split('\n').filter((z) => /^com\.apple\./.test(z.trim())).length;
}

/* `du -sk <pfad>`: erste Zahl, in Byte. */
function duLesen(text) {
  const erstes = String(text).trim().split(/\s+/)[0];
  return /^[0-9]+$/.test(erstes) ? Number(erstes) * 1024 : null;
}

function zeileBauen(w) {
  const teile = [
    w.zeit,
    gb(w.freiByte),
    w.freiWichtigByte == null ? '' : gb(w.freiWichtigByte),
    w.swapByte == null ? '' : gb(w.swapByte),
    String(w.schnappschuesse),
    String(w.produktHtml),
  ];
  for (const o of w.orte) teile.push(o.name + '=' + (o.byte == null ? '?' : gb(o.byte)));
  return teile.join('\t');
}

/* Beispiel-Ausgaben der Messbefehle (Stand 05.11.2026 14:22), damit der Aufruf ohne Argument und die Probe ohne Messung laufen. */
const BEISPIEL = Object.freeze({
  df: 'Filesystem   1024-blocks      Used Available Capacity iused ifree %iused  Mounted on\n'
    + '/dev/disk3s5   971299000 616000000 269531250    70% 4600000 2700000000    0%   /System/Volumes/Data\n',
  freiWichtig: '283700000000\n',
  swapusage: 'vm.swapusage: total = 58368.00M  used = 56820.00M  free = 1548.00M  (encrypted)\n',
  tmutil: 'Snapshots for disk /:\ncom.apple.TimeMachine.2026-11-05-142745.local\n',
  tmpdirNamen: 'produkt-html-privat-de-p123-AbCdEf\nprodukt-html-pro-en-XyZabc\nvd-lauf-1-aaaaaa\nprodukt-html-anderes\n',
  duTmpdir: '12582912\t/var/folders/x/T/\n',
});

function beispielLesen(b = BEISPIEL) {
  return {
    zeit: '2026-11-05 14:22',
    freiByte: dfFreiLesen(b.df),
    freiWichtigByte: Number(b.freiWichtig.trim()),
    swapByte: swapLesen(b.swapusage),
    schnappschuesse: schnappschuesseLesen(b.tmutil),
    produktHtml: b.tmpdirNamen.split('\n').filter((n) => RESTE.test(n.trim())).length,
    orte: [{ name: 'tmpdir', byte: duLesen(b.duTmpdir) }],
  };
}

const lauf = (cmd, args) => String(spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 24 }).stdout || '');

function freiWichtigMessen(pfad) {
  if (process.platform !== 'darwin') return null;
  const js = 'ObjC.import("Foundation");const r=$.NSURL.fileURLWithPath(' + JSON.stringify(pfad) + ').resourceValuesForKeysError($(["NSURLVolumeAvailableCapacityForImportantUsageKey"]),null);'
    + 'String(ObjC.unwrap(r.objectForKey("NSURLVolumeAvailableCapacityForImportantUsageKey")))';
  const n = Number(lauf('osascript', ['-l', 'JavaScript', '-e', js]).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function messen(orte) {
  const tmp = os.tmpdir();
  let produktHtml = 0;
  try { produktHtml = fs.readdirSync(tmp).filter((n) => RESTE.test(n)).length; } catch (_) { produktHtml = 0; }
  return {
    zeit: ortszeit(new Date()),
    freiByte: dfFreiLesen(lauf('df', ['-k', os.homedir()])),
    freiWichtigByte: freiWichtigMessen(os.homedir()),
    swapByte: swapLesen(lauf('sysctl', ['vm.swapusage'])),
    schnappschuesse: schnappschuesseLesen(lauf('tmutil', ['listlocalsnapshots', '/'])),
    produktHtml,
    orte: orte.map((o) => ({ name: o.name, byte: duLesen(lauf('du', ['-sk', o.pfad])) })),
  };
}

function argumenteLesen(argv) {
  const a = { messen: false, protokoll: null, orte: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--messen') a.messen = true;
    else if (argv[i] === '--protokoll') a.protokoll = argv[++i];
    else if (argv[i] === '--ort') {
      const m = /^([^=]+)=(.+)$/.exec(argv[++i] || '');
      if (!m) throw new Error('--ort erwartet name=pfad');
      a.orte.push({ name: m[1], pfad: m[2] });
    } else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  return a;
}

function main(argv) {
  const a = argumenteLesen(argv);
  if (!a.messen) { process.stdout.write(zeileBauen(beispielLesen()) + '\n'); return 0; }
  const orte = a.orte.length ? a.orte : [{ name: 'tmpdir', pfad: os.tmpdir() }, { name: 'caches', pfad: path.join(os.homedir(), 'Library', 'Caches') }];
  const zeile = zeileBauen(messen(orte));
  if (a.protokoll) fs.appendFileSync(a.protokoll, zeile + '\n');
  process.stdout.write(zeile + '\n');
  return 0;
}

module.exports = { dfFreiLesen, swapLesen, schnappschuesseLesen, duLesen, zeileBauen, beispielLesen, BEISPIEL, argumenteLesen };
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { process.stderr.write('platte-protokoll: ' + e.message + '\n'); process.exitCode = 2; }
}
