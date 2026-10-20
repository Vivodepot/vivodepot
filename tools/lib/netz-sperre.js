'use strict';
/* netz-sperre.js — jeder Playwright-Lauf im Kanon bleibt auf dem Rechner (14.10.2026, Befund PLAYWRIGHT-OHNE-NETZSPERRE).
   Live-Produkte und Auslieferungswege werden nur mit curl und Intern-Kopf gemessen; ein Browser, der sie abruft, zählt als
   Download. Bisher hielt das nur eine Regel. Zwei Schichten, eine Regel:
     erlaubt(adresse)     file:, data:, blob:, about: und http(s)/ws(s) nur auf 127.0.0.1, localhost, [::1].
     STARTOPTIONEN        die harte Schicht: ein toter lokaler Proxy für alles außer lokal. Gilt in Chromium, Firefox und
                          WebKit gleich, auch für Dienstarbeiter und WebSockets, die route() nicht sieht.
     mitSperre(optionen)  mischt STARTOPTIONEN in Startoptionen; ein eigenes `proxy` wirft (es höbe die Sperre auf).
     sperren(kontext)     die zweite Schicht: route() bricht Nicht-Lokales ab und hält es in `versuche` fest, damit ein Lauf
                          rot werden kann statt still zu scheitern.
   Vorbild: die Werkstatt-Sperre der Website (14.10.2026). Probe: tests/mit-modul/playwright-netzsperre.test.js. Wächter:
   tests/playwright-netzsperre-klasse.test.js. */
const PROTOKOLLE = new Set(['file:', 'data:', 'blob:', 'about:']);
const LOKAL = new Set(['127.0.0.1', 'localhost', '[::1]']);

function erlaubt(adresse) {
  let u;
  try { u = new URL(adresse); } catch (_) { return false; }
  if (PROTOKOLLE.has(u.protocol)) return true;
  return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) && LOKAL.has(u.hostname);
}

// Port 9 (discard) auf der eigenen Maschine: niemand lauscht, jede Verbindung über den Proxy scheitert sofort.
const STARTOPTIONEN = Object.freeze({ proxy: Object.freeze({ server: 'http://127.0.0.1:9', bypass: '127.0.0.1,localhost,[::1]' }) });

function mitSperre(optionen = {}) {
  if (optionen && optionen.proxy) throw new Error('netz-sperre: eigene Proxy-Angabe hebt die Netzsperre auf — nicht erlaubt');
  return { ...(optionen || {}), proxy: { ...STARTOPTIONEN.proxy } };
}

async function sperren(ziel) {
  const versuche = [];
  await ziel.route('**/*', (route) => {
    const adresse = route.request().url();
    if (erlaubt(adresse)) return route.continue();
    versuche.push(adresse);
    return route.abort('blockedbyclient');
  });
  return { versuche };
}

module.exports = { erlaubt, STARTOPTIONEN, mitSperre, sperren };
