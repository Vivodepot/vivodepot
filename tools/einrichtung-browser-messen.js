#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Einrichtungsseite, Messungen M3 und M4 (28.09.2026) — Desktop-Engines
   ────────────────────────────────────────────────────────────────────────────
   M4 · Hält IndexedDB einen Browser-Neustart aus, wenn die Seite als Datei
        (file://) läuft? Gemessen mit einem dauerhaften Profil je Engine: Seite
        schreibt einen Datensatz, Browser zu, Browser mit DEMSELBEN Profil auf,
        Seite liest. Dazu: gibt navigator.storage.persist() Dauerhaftigkeit?
        Und dieselbe Seite über http://127.0.0.1 (Intranet-Fall) als Gegenprobe.
   M3 · Unter file:// und über http://127.0.0.1: ist der Kontext sicher
        (isSecureContext), gibt es getUserMedia, liefert es mit einer Test-
        Kamera ein Bild, gibt es BarcodeDetector? (BarcodeDetector wird NICHT
        benutzt: seine Erkennung hängt auf Android an einem Dienst außerhalb der Seite; er wird nur festgestellt.)

   Was es NICHT misst: echte Handys (iPhone als installierte Web-App, Android),
   echte Kameras, ein Profil-Reset durch die IT. Das braucht Geräte.

   Aufruf:  node tools/einrichtung-browser-messen.js [--engine chromium|firefox|webkit]... [--ausgabe <datei.json>]
   Kein Netz nach außen: der Prüfserver lauscht nur auf 127.0.0.1, die Seite lädt nichts.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const pw = require('playwright');

const SEITE = `<!doctype html><meta charset="utf-8"><title>messen</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'">
<script>
window.messen = async (modus) => {
  const r = { isSecureContext: window.isSecureContext, origin: location.origin,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    barcodeDetector: 'BarcodeDetector' in window, compressionStream: typeof CompressionStream === 'function' };
  const db = await new Promise((ok, nein) => { const q = indexedDB.open('einrichtung-messen', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('s'); q.onsuccess = () => ok(q.result); q.onerror = () => nein(q.error); })
    .catch((e) => { r.indexedDbFehler = String(e && e.name || e); return null; });
  if (db) {
    const tx = (art) => db.transaction('s', art).objectStore('s');
    if (modus === 'schreiben') await new Promise((ok) => { const q = tx('readwrite').put('da', 'k'); q.onsuccess = ok; q.onerror = ok; });
    r.gelesen = await new Promise((ok) => { const q = tx('readonly').get('k'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok('fehler'); });
  }
  if (navigator.storage && navigator.storage.persist) { try { r.persist = await Promise.race([navigator.storage.persist(), new Promise((ok) => setTimeout(() => ok('keineAntwortIn5s(Nachfrage?)'), 5000))]); } catch (e) { r.persist = 'fehler:' + e.name; } }
  if (modus === 'kamera' && r.getUserMedia) {
    try { const s = await Promise.race([navigator.mediaDevices.getUserMedia({ video: true }),
        new Promise((_, nein) => setTimeout(() => nein({ name: 'KeineAntwortIn8s' }), 8000))]); r.kamera = s.getVideoTracks().length > 0 ? 'bild' : 'leer'; s.getTracks().forEach((t) => t.stop()); }
    catch (e) { r.kamera = 'fehler:' + (e && e.name); }
  }
  return r;
};
</script>`;

const START = {
  chromium: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  firefox: { firefoxUserPrefs: { 'media.navigator.streams.fake': true, 'media.navigator.permission.disabled': true } },
  webkit: {},
};

async function einmal(engine, profil, url, modus) {
  const ctx = await pw[engine].launchPersistentContext(profil, Object.assign({ headless: true, timeout: 30000 }, START[engine]));
  ctx.setDefaultTimeout(20000);
  const netz = [];
  ctx.on('request', (q) => { if (!q.url().startsWith(url.split('#')[0])) netz.push(q.url()); });
  try {
    if (engine === 'chromium' && url.startsWith('http')) await ctx.grantPermissions(['camera'], { origin: new URL(url).origin }).catch(() => {});
    const p = await ctx.newPage();
    await p.goto(url);
    const r = await Promise.race([p.evaluate((m) => window.messen(m), modus),
      new Promise((_, nein) => setTimeout(() => nein(new Error('Seite antwortet nicht in 20 s (' + modus + ')')), 20000))]);
    r.fremdeAufrufe = netz;
    return r;
  } catch (e) { return { fehler: String(e.message || e).split('\n')[0] }; }
  finally { await ctx.close(); }
}

async function engineMessen(engine, { datei, httpUrl }) {
  const erg = { engine };
  for (const [art, url] of [['file', 'file://' + datei], ['http-127', httpUrl]]) {
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'einrichtung-messen-' + engine + '-'));
    try {
      const vorher = await einmal(engine, profil, url, 'schreiben');
      const nachher = await einmal(engine, profil, url, 'lesen');
      const kamera = await einmal(engine, profil, url, 'kamera');
      erg[art] = {
        isSecureContext: vorher.isSecureContext, origin: vorher.origin, compressionStream: vorher.compressionStream,
        m4: { geschrieben: vorher.gelesen, nachNeustart: nachher.gelesen, persist: nachher.persist, fehler: vorher.indexedDbFehler || vorher.fehler || null },
        m3: { getUserMedia: kamera.getUserMedia, kamera: kamera.kamera || null, barcodeDetector: kamera.barcodeDetector, fehler: kamera.fehler || null },
        fremdeAufrufe: [].concat(vorher.fremdeAufrufe || [], nachher.fremdeAufrufe || [], kamera.fremdeAufrufe || []),
      };
    } finally { fs.rmSync(profil, { recursive: true, force: true }); }
  }
  return erg;
}

function _args(argv, name) { const r = []; for (let i = 0; i < argv.length; i++) if (argv[i] === name && argv[i + 1]) r.push(argv[++i]); return r; }

async function main(argv) {
  const bekannt = new Set(['--engine', '--ausgabe']);
  for (let i = 0; i < argv.length; i += 2) if (!bekannt.has(argv[i])) throw new Error('unbekanntes Flag ' + argv[i]);
  const engines = _args(argv, '--engine');
  const liste = engines.length ? engines : ['chromium', 'firefox', 'webkit'];
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'einrichtung-messen-seite-'));
  const datei = path.join(ordner, 'messen.html');
  fs.writeFileSync(datei, SEITE);
  const server = http.createServer((q, a) => { a.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); a.end(SEITE); });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const httpUrl = 'http://127.0.0.1:' + server.address().port + '/messen.html';
  const ergebnis = { werkzeug: 'tools/einrichtung-browser-messen.js', versionen: {}, messungen: [] };
  try {
    for (const e of liste) {
      try { const b = await pw[e].launch(); ergebnis.versionen[e] = b.version(); await b.close(); } catch (x) { ergebnis.versionen[e] = 'nicht startbar: ' + String(x.message).split('\n')[0]; continue; }
      ergebnis.messungen.push(await engineMessen(e, { datei, httpUrl }));
    }
  } finally { server.close(); fs.rmSync(ordner, { recursive: true, force: true }); }
  const text = JSON.stringify(ergebnis, null, 1) + '\n';
  const aus = _args(argv, '--ausgabe')[0];
  if (aus) fs.writeFileSync(aus, text); else process.stdout.write(text);
  return ergebnis;
}

module.exports = { main, SEITE };
if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error('FEHLER:', e.message); process.exitCode = 1; });
