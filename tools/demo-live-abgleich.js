#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   demo-live-abgleich.js — ist jede live ausgelieferte Demo genau der Bau aus dem Kanon? (06.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, AUS DEM ES ENTSTAND (DEMO-ALTSTAENDE-LIVE, HOCH, 04.10.2026): neun Demo-Apps, ihre Lese-Apps und acht
   sw.js lagen live als Altstände (v843–v852), nicht aus dem Kanon gebaut. Am 06.10. war der Inhalt behoben — jede
   live erreichbare Demo-Datei byte-gleich mit dem Bau aus v1.0.919 —, aber nur GEMESSEN: nichts hielt den Zustand.

   WAS ES PRÜFT, je Datei des lokalen Demo-Baus (`--bau`, der Ordner, der hochgeladen wird):
     gleich        — live abgerufen, Status 200, Bytes gleich (sha256).
     anders        — live 200, aber andere Bytes: ein Altstand oder eine Handkopie. ROT.
     fehlt-live    — live kein 200: der Bau ist nicht (oder nicht mehr) veröffentlicht. Keine Rot-Meldung — ein
                     zurückgehaltener Bau ist erlaubt —, aber genannt.
     nicht-gemessen — kein Netz, Timeout: keine Aussage. Zählt NIE als gleich; ist nichts gemessen, ist der Lauf rot.
   Dazu:
     · jede Adresse aus `--altpfade <datei>` (eine je Zeile, `#` Kommentar) muss live 404/410 liefern; 200 ist ROT.
       Die Liste führt, wer veröffentlicht — das Repo kennt die Altstände der Website nicht.
     · jede sw.js im Bau trägt den Cache-Namen `vivodepot-shell-<SCHALEN_STAND>` der vivodepot.html daneben und räumt in
       `activate` jeden anderen `vivodepot-shell-`-Cache (`caches.delete`) — sonst behalten Wiederkehrer den Altstand.
       (Dieselbe statische Probe stand bis heute nur im Bauskript der Website.)

   WARUM KEIN GATE (wie website-live-abgleich-pruefen.js): ein Wächter, der bei jedem Commit ins Netz greift, hat eigene
   Tücken. `--url` gehört nie in einen Commit-/Push-Hook, sondern hinter jeden Demo-Upload.

   Aufruf:
     node tools/demo-live-abgleich.js --bau <ordner> --url https://vivodepot.de [--altpfade <datei>] [--json]
     node tools/demo-live-abgleich.js --bau <ordner> --live-ordner <ordner> [--altpfade <datei>]
       — „live“ ist ein lokaler Ordner (Probe ohne Netz).
     node tools/demo-live-abgleich.js
       — gegen die Fixtures tests/fixtures/demo-live-abgleich/ (stimmig: Exit 0). Prüft das Werkzeug, nicht die Website.
   Exit 0 grün · 1 rot · 2 Aufruffehler.
   Probe: tests/demo-live-abgleich.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'demo-live-abgleich');
const ALT_GUT = new Set([404, 410]);

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

function dateienIm(ordner) {
  const aus = [];
  const geh = (rel) => {
    for (const e of fs.readdirSync(path.join(ordner, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) geh(r); else if (e.isFile()) aus.push(r);
    }
  };
  geh('');
  return aus.sort();
}

function altpfadeLesen(datei) {
  if (!datei) return [];
  return fs.readFileSync(datei, 'utf8').split('\n').map((z) => z.replace(/#.*/, '').trim()).filter(Boolean);
}

/* Die statische sw.js-Probe: Cache-Name = Schale der App daneben, und activate räumt die anderen. */
function swPruefen(bau, relSw) {
  const text = fs.readFileSync(path.join(bau, relSw), 'utf8');
  const html = path.join(bau, path.dirname(relSw), 'vivodepot.html');
  if (!fs.existsSync(html)) return null;   // eine sw.js ohne App daneben prüft nur der Abgleich
  const schale = (/SCHALEN_STAND\s*=\s*'([^']+)'/.exec(fs.readFileSync(html, 'utf8')) || [])[1];
  const cache = (/const\s+CACHE\s*=\s*'([^']+)'/.exec(text) || [])[1];
  const fehler = [];
  if (!schale) fehler.push('vivodepot.html ohne SCHALEN_STAND');
  else if (cache !== 'vivodepot-shell-' + schale) fehler.push('Cache-Name ' + (cache || '(keiner)') + ' statt vivodepot-shell-' + schale);
  const activate = /addEventListener\(\s*'activate'[\s\S]*?caches\.delete/.test(text) && /indexOf\('vivodepot-shell-'\)|startsWith\('vivodepot-shell-'\)/.test(text);
  if (!activate) fehler.push('activate räumt alte vivodepot-shell-Caches nicht');
  return fehler;
}

/* abruf(relPfad) → Promise<{ status:number|null, bytes?:Buffer }>; status null = nicht gemessen. */
function netzAbruf(basis, zeitgrenzeMs = 20000) {
  const b = basis.replace(/\/+$/, '') + '/';
  return async (rel) => {
    try {
      const r = await fetch(b + rel, { redirect: 'manual', signal: AbortSignal.timeout(zeitgrenzeMs), headers: { 'user-agent': 'vivodepot-demo-live-abgleich' } });
      return r.status === 200 ? { status: 200, bytes: Buffer.from(await r.arrayBuffer()) } : { status: r.status };
    } catch (_) { return { status: null }; }
  };
}
function ordnerAbruf(ordner) {
  return async (rel) => {
    const p = path.join(ordner, rel);
    if (rel.endsWith('/')) return { status: fs.existsSync(path.join(p, 'index.html')) ? 200 : 404 };
    return fs.existsSync(p) && fs.statSync(p).isFile() ? { status: 200, bytes: fs.readFileSync(p) } : { status: 404 };
  };
}

async function abgleichen({ bau, abruf, altpfade = [] }) {
  const dateien = [];
  for (const rel of dateienIm(bau)) {
    const r = await abruf(rel);
    let ergebnis;
    if (r.status === null) ergebnis = 'nicht-gemessen';
    else if (r.status !== 200) ergebnis = 'fehlt-live';
    else ergebnis = sha256(r.bytes) === sha256(fs.readFileSync(path.join(bau, rel))) ? 'gleich' : 'anders';
    dateien.push({ pfad: rel, ergebnis, status: r.status });
  }
  const alt = [];
  for (const rel of altpfade) {
    const r = await abruf(rel);
    alt.push({ pfad: rel, status: r.status, ergebnis: r.status === null ? 'nicht-gemessen' : (ALT_GUT.has(r.status) ? 'weg' : 'noch-live') });
  }
  const sw = [];
  for (const rel of dateienIm(bau).filter((p) => path.basename(p) === 'sw.js')) {
    const f = swPruefen(bau, rel);
    if (f && f.length) sw.push({ pfad: rel, fehler: f });
  }
  const zaehl = (e) => dateien.filter((d) => d.ergebnis === e).length;
  const rot = [];
  for (const d of dateien.filter((x) => x.ergebnis === 'anders')) rot.push('anders als der Bau: ' + d.pfad);
  for (const a of alt.filter((x) => x.ergebnis === 'noch-live')) rot.push('Altpfad noch live (' + a.status + '): ' + a.pfad);
  for (const s of sw) for (const f of s.fehler) rot.push(s.pfad + ': ' + f);
  const gemessen = dateien.filter((d) => d.ergebnis !== 'nicht-gemessen').length + alt.filter((a) => a.ergebnis !== 'nicht-gemessen').length;
  if (!gemessen) rot.push('nichts gemessen — kein Netz oder leerer Bau; ein ungemessener Lauf ist kein grüner');
  return { dateien, alt, sw, rot, zahlen: { gleich: zaehl('gleich'), anders: zaehl('anders'), fehltLive: zaehl('fehlt-live'), nichtGemessen: zaehl('nicht-gemessen') } };
}

function argWert(argv, name) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; }

async function main(argv = process.argv.slice(2)) {
  let bau = argWert(argv, '--bau');
  const url = argWert(argv, '--url');
  let liveOrdner = argWert(argv, '--live-ordner');
  let altDatei = argWert(argv, '--altpfade');
  if (!bau) {
    bau = path.join(FIXTURES, 'bau');
    liveOrdner = path.join(FIXTURES, 'live-stimmig');
    altDatei = altDatei || path.join(FIXTURES, 'altpfade.txt');
  }
  if (!fs.existsSync(bau) || !fs.statSync(bau).isDirectory()) { console.error('[demo-live-abgleich] --bau ist kein Ordner: ' + bau); return 2; }
  if (!!url === !!liveOrdner) { console.error('[demo-live-abgleich] genau eines von --url oder --live-ordner'); return 2; }
  const abruf = url ? netzAbruf(url) : ordnerAbruf(liveOrdner);
  const e = await abgleichen({ bau, abruf, altpfade: altpfadeLesen(altDatei) });
  if (argv.includes('--json')) console.log(JSON.stringify(e, null, 1));
  else {
    const z = e.zahlen;
    console.log('[demo-live-abgleich] ' + z.gleich + ' gleich, ' + z.anders + ' anders, ' + z.fehltLive + ' nicht live, ' + z.nichtGemessen + ' nicht gemessen; Altpfade: '
      + e.alt.filter((a) => a.ergebnis === 'weg').length + ' weg, ' + e.alt.filter((a) => a.ergebnis === 'noch-live').length + ' noch live.');
    for (const d of e.dateien.filter((x) => x.ergebnis === 'fehlt-live')) console.log('  nicht live (' + d.status + '): ' + d.pfad);
    for (const r of e.rot) console.log('  ROT ' + r);
    console.log(e.rot.length ? '[demo-live-abgleich] ROT' : '[demo-live-abgleich] grün');
  }
  return e.rot.length ? 1 : 0;
}

if (require.main === module) main().then((c) => { process.exitCode = c; });

module.exports = { abgleichen, swPruefen, ordnerAbruf, netzAbruf, altpfadeLesen, dateienIm, main };
