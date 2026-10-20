'use strict';
/* Die Netzsperre wirkt im Browser (14.10.2026, Befund PLAYWRIGHT-OHNE-NETZSPERRE): tools/lib/netz-sperre.js.
   Kein Abruf verlässt den Rechner. Ein lokaler Server auf 127.0.0.1 spielt einen fremden Host: Chromium löst
   „lockvogel.invalid“ per --host-resolver-rules auf ihn auf. Gezählt werden TCP-Verbindungen am Server, also auch WebSockets.
   1. Rot-Beweis: ohne Sperre erreicht die Seite den Lockvogel (fetch, Bild, WebSocket) — der Weg ist offen, die Probe misst echt.
   2. Mit mitSperre (toter Proxy) und sperren (route): keine Verbindung kommt an, die Versuche stehen in `versuche`, ein Abruf an
      127.0.0.1 geht weiter durch.
   3. Die reine Regel: Produkt- und Auslieferungshosts gesperrt, lokale Adressen erlaubt.
   Braucht Chromium; fehlt es, ist die Probe rot (kein stilles Überspringen). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const S = require('../../tools/lib/netz-sperre.js');

test('[Netzsperre·Regel] Produkt- und Auslieferungshosts gesperrt, lokale Adressen erlaubt; eigenes proxy wirft', () => {
  const host = (n) => 'https://' + n + '.vivodepot.' + 'org/x';
  for (const u of [host('privat-de'), host('pro-de'), host('download'), host('studio'), host('lesen'), 'https://example.invalid/', 'wss://example.invalid/s'])
    assert.equal(S.erlaubt(u), false, u);
  for (const u of ['file:///tmp/x.html', 'data:text/plain,a', 'blob:null/abc', 'about:blank', 'http://127.0.0.1:1/x', 'http://localhost:1/x', 'ws://[::1]:1/'])
    assert.equal(S.erlaubt(u), true, u);
  assert.deepEqual(S.mitSperre({ headless: true }), { headless: true, proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1,localhost,[::1]' } });
  assert.throws(() => S.mitSperre({ proxy: { server: 'http://anders:1' } }), /hebt die Netzsperre auf/);
});

async function lauf({ mitSperreAn }) {
  const { chromium } = require('playwright');
  const verbindungen = [];
  const srv = http.createServer((q, a) => { a.setHeader('access-control-allow-origin', '*'); a.end('lockvogel'); });
  srv.on('connection', (s) => verbindungen.push(s.remoteAddress));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const fremd = 'http://lockvogel.invalid:' + port;
  const optionen = { args: ['--host-resolver-rules=MAP lockvogel.invalid 127.0.0.1'] };
  const browser = await chromium.launch(mitSperreAn ? S.mitSperre(optionen) : optionen);
  try {
    const ctx = await browser.newContext();
    const s = mitSperreAn ? await S.sperren(ctx) : { versuche: [] };
    const page = await ctx.newPage();
    // Die Seite selbst liegt auf dem lokalen Server: von about:blank aus sperrt Chromium Abrufe an 127.0.0.1 (Schutz privater
    // Netze), das wäre eine Röte aus anderem Grund.
    await page.goto('http://127.0.0.1:' + port + '/start');
    const lokal = await page.evaluate(async (p) => { try { return await (await fetch('http://127.0.0.1:' + p + '/lokal')).text(); } catch (e) { return 'fehler'; } }, port);
    const vorFremd = verbindungen.length;
    await page.evaluate(async (u) => {
      try { await fetch(u + '/fetch'); } catch (_) { /* gesperrt */ }
      await new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = u + '/bild.png'; });
      await new Promise((r) => { try { const w = new WebSocket(u.replace('http:', 'ws:') + '/ws'); w.onerror = w.onclose = w.onopen = () => r(); setTimeout(r, 2000); } catch (_) { r(); } });
    }, fremd);
    await page.waitForTimeout(500);
    return { lokal, fremdeVerbindungen: verbindungen.length - vorFremd, versuche: s.versuche };
  } finally { await browser.close(); srv.close(); }
}

test('[Netzsperre·Rot-Beweis] ohne Sperre erreicht die Seite den Lockvogel — der Weg ist offen, die Messung echt', async () => {
  const r = await lauf({ mitSperreAn: false });
  assert.equal(r.lokal, 'lockvogel');
  assert.ok(r.fremdeVerbindungen >= 1, 'ohne Sperre kommt mindestens eine Verbindung an');
});

test('[Netzsperre] mit Sperre kommt keine Verbindung an, jeder Versuch ist erfasst, lokal geht durch', async () => {
  const r = await lauf({ mitSperreAn: true });
  assert.equal(r.lokal, 'lockvogel', 'ein Abruf an 127.0.0.1 geht durch');
  assert.equal(r.fremdeVerbindungen, 0, 'kein Abruf an den fremden Host erreicht den Rechner');
  assert.ok(r.versuche.some((u) => u.includes('lockvogel.invalid') && u.includes('/fetch')), 'der fetch-Versuch steht in versuche');
  assert.ok(r.versuche.some((u) => u.includes('/bild.png')), 'der Bild-Versuch steht in versuche');
});
