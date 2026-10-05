#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   persist-frage-messen.js — was jeder Browser-Motor über den dauerhaften Speicher sagt
   ───────────────────────────────────────────────────────────────────────────
   Anlass (Abnahme 28.09.2026): Firefox fragt „Daten im dauerhaften Speicher speichern?“ ohne Vorwarnung. Ob ein
   Browser fragen wird, sollte eine Schnittstelle sagen — diese Messung zeigt, dass keine es tut: sie öffnet eine leere
   Seite in Chromium, Firefox und WebKit (Playwright) und schreibt je Motor storage.persisted(),
   permissions.query('persistent-storage') und die Motor-Erkennung, auf die der Kern sich stützt
   (_browserFragtNachDauerspeicher: CSS.supports('-moz-appearance', 'none')).

   Aufruf:  node tools/persist-frage-messen.js [--aus <datei.json>]
   Ohne --aus steht das Ergebnis auf stdout. Ein Motor, der hier nicht startet, steht mit seinem Fehler in der Ausgabe
   (ungemessen), nicht als Ergebnis. Probe: tests/speicher-vorwarnung.test.js liest das Ergebnis nicht — sie prüft die
   Kernfunktion; dieses Werkzeug ist der Beleg für den Kommentar im Kern.
   ═══════════════════════════════════════════════════════════════════════════ */
const http = require('node:http');
const fs = require('node:fs');

async function messen(pw = require('playwright')) {
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<p>x</p>'); }).listen(0);
  await new Promise((r) => srv.on('listening', r));
  const url = 'http://localhost:' + srv.address().port + '/';
  const aus = {};
  try {
    for (const name of ['chromium', 'firefox', 'webkit']) {
      let b;
      try {
        b = await pw[name].launch({ timeout: 30000 });
        const p = await (await b.newContext()).newPage();
        await p.goto(url, { timeout: 20000 });
        aus[name] = Object.assign({ version: b.version() }, await p.evaluate(async () => {
          const o = { motorFragt: CSS.supports('-moz-appearance', 'none'), persisted: null, erlaubnis: null };
          try { o.persisted = await navigator.storage.persisted(); } catch (e) { o.persisted = 'fehler: ' + e.message; }
          try { o.erlaubnis = (await navigator.permissions.query({ name: 'persistent-storage' })).state; } catch (e) { o.erlaubnis = 'fehler: ' + e.message; }
          return o;
        }));
      } catch (e) {
        aus[name] = { ungemessen: e.message.split('\n')[0] };
      } finally {
        if (b) await b.close();
      }
    }
  } finally {
    srv.close();
  }
  return aus;
}

if (require.main === module) {
  const i = process.argv.indexOf('--aus');
  messen().then((ergebnis) => {
    const text = JSON.stringify({ gemessen: new Date().toISOString(), ergebnis }, null, 2) + '\n';
    if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], text); else process.stdout.write(text);
  });
}
module.exports = { messen };
