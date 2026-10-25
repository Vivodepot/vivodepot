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
   tests/playwright-netzsperre-klasse.test.js.
   Firefox unter macOS 27 (21.10.2026): Seit dem Update schützt macOS ~/Library/Application Support/Firefox. Playwrights Firefox
   liest dort profiles.ini, auch mit eigenem -profile, und hängt headless bis zur Grenze (Playwright-Fehler #42768, behoben mit
   Firefox 158 ab Playwright 1.65). Beim Laden (und in mitSperre) hängt sie auf darwin einmal einen Patch an
   firefox.launch und firefox.launchPersistentContext (gemeinsamer BrowserType-Prototyp, Muster tools/lib/browser-eigenes-tmp.js):
   NUR der Firefox-Start bekommt in seiner env CFFIXED_USER_HOME auf ein leeres Verzeichnis, das beim Prozessende geräumt wird.
   process.env bleibt unberührt, kein anderes Kind sieht die Variable; Chromium und WebKit bleiben unberührt. Eine eigene env
   der Probe bleibt, ein schon gesetztes CFFIXED_USER_HOME auch. ohneLeeresHome(fn) startet ohne Patch (für den Rot-Beweis).
   Probe: tests/mit-modul/firefox-start-macos.test.js.
   MERKPOSTEN: entfernen, sobald Playwright >= 1.65 im Repo steht. Dann wird der Rot-Beweis jener Probe rot und sagt es. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
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

let leeresHome = null;
function leeresHomeVerzeichnis() {
  if (leeresHome) return leeresHome;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-browser-home-'));
  // macOS legt beim ersten Start Library/ und Downloads/ darin an, mit der ACL „group:everyone deny delete“; ohne chmod -RN
  // scheitert rmSync an ENOTEMPTY (gemessen 21.10.2026). Ein Rest am Prozessende darf den Lauf nicht rot machen.
  process.once('exit', () => {
    try { spawnSync('/bin/chmod', ['-RN', dir], { stdio: 'ignore' }); fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); }
    catch (_) { /* Rest bleibt */ }
  });
  leeresHome = dir;
  return dir;
}

const HOME_MARKE = Symbol.for('vd.firefoxLeeresHome');
// Wo die Optionen im Aufruf stehen: launch(optionen), launchPersistentContext(nutzerdatenOrdner, optionen).
const OPTIONEN_STELLE = Object.freeze({ launch: 0, launchPersistentContext: 1 });

/* Rein: die Argumente mit CFFIXED_USER_HOME = dir in der env der Optionen. Ohne eigene env gilt wie bei Playwright die
   Umgebung des Prozesses; ein dort schon gesetztes CFFIXED_USER_HOME bleibt. */
function argumenteMitHome(name, args, dir, umgebung = process.env) {
  const i = OPTIONEN_STELLE[name];
  const neu = [...args];
  while (neu.length <= i) neu.push(undefined);
  const optionen = { ...(neu[i] || {}) };
  const env = optionen.env || umgebung;
  if (env.CFFIXED_USER_HOME) return neu;
  optionen.env = { ...env, CFFIXED_USER_HOME: dir };
  neu[i] = optionen;
  return neu;
}

let ohneHome = 0;
function firefoxPatchen(proto, { plattform = process.platform, verzeichnis = leeresHomeVerzeichnis } = {}) {
  if (plattform !== 'darwin' || !proto || proto[HOME_MARKE]) return false;
  for (const name of Object.keys(OPTIONEN_STELLE)) {
    const urspruenglich = proto[name];
    if (typeof urspruenglich !== 'function') continue;
    proto[name] = function mitLeeremHome(...args) {
      if (ohneHome || typeof this.name !== 'function' || this.name() !== 'firefox') return urspruenglich.apply(this, args);
      return urspruenglich.apply(this, argumenteMitHome(name, args, verzeichnis()));
    };
  }
  Object.defineProperty(proto, HOME_MARKE, { value: true });
  return true;
}

// Startet fn ohne den Patch; der Firefox-Aufruf muss synchron in fn beginnen (für den Rot-Beweis der Probe).
function ohneLeeresHome(fn) {
  ohneHome++;
  try { return fn(); } finally { ohneHome--; }
}

/* netz-sperre lädt Playwright nicht selbst (Schicht 1 bleibt ohne Lieferkette): gepatcht wird, was schon geladen ist, und
   über Module._load, was später geladen wird (wie browser-eigenes-tmp). Schon beim Laden, weil JS in
   `firefox.launch(mitSperre(...))` die Methode vor ihren Argumenten liest; ein Patch erst in mitSperre käme für den ersten
   Start zu spät (gemessen 21.10.2026: das CSP-Exploit-Gate hing am ersten Firefox-Start). */
const PLAYWRIGHT = /^(playwright|playwright-core|@playwright\/test)$/;
const PLAYWRIGHT_DATEI = /[\\/]node_modules[\\/](playwright|playwright-core|@playwright[\\/]test)[\\/]index\.js$/;
function exportPatchen(r) {
  if (r && r.firefox) firefoxPatchen(Object.getPrototypeOf(r.firefox));
}
function playwrightPatchen(Module = require('node:module')) {
  for (const [datei, m] of Object.entries(Module._cache || {})) if (PLAYWRIGHT_DATEI.test(datei)) exportPatchen(m && m.exports);
  if (Module._load[HOME_MARKE]) return;
  const laden = Module._load;
  const neu = function _load(request, ...rest) {
    const r = laden.call(this, request, ...rest);
    if (PLAYWRIGHT.test(request)) exportPatchen(r);
    return r;
  };
  Object.defineProperty(neu, HOME_MARKE, { value: true });
  Module._load = neu;
}
if (process.platform === 'darwin') playwrightPatchen();

function mitSperre(optionen = {}) {
  if (optionen && optionen.proxy) throw new Error('netz-sperre: eigene Proxy-Angabe hebt die Netzsperre auf — nicht erlaubt');
  if (process.platform === 'darwin') playwrightPatchen();
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

module.exports = { erlaubt, STARTOPTIONEN, mitSperre, sperren, argumenteMitHome, firefoxPatchen, ohneLeeresHome, HOME_MARKE };
