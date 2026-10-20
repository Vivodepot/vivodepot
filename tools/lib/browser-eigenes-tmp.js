'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Chromium aus einem Testprozess bekommt ein eigenes TMPDIR (17.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Die öffentliche CI (Linux) brach `npm test` mit Exit 1 ab, obwohl kein Test rot war: die Temp-Wache um den Lauf
   (tools/lib/temp-aufraeumen.js, Schicht 2) fand „1× .org.chromium.Chromium.oFNBhY“ im Laufverzeichnis. Chromium legt unter
   Linux solche Verzeichnisse in seinem TMPDIR an und lässt sie nicht immer liegen; unter macOS legt es sie dort nicht an,
   darum war derselbe Baum lokal grün. Der Rest kommt aus einem Kindprozess, den kein mkdtemp des Testprozesses erfasst.

   DIE KORREKTUR, OHNE DIE WACHE ZU LOCKERN. Startet ein Testprozess Chromium über Playwright (launch,
   launchPersistentContext), bekommt der Browser ein eigenes TMPDIR: ein mkdtemp-Verzeichnis unter os.tmpdir, das der
   Testprozess angelegt hat und darum auch abräumt — sobald der Browser schließt, spätestens beim Prozessende
   (temp-aufraeumen-preload.js merkt sich jedes mkdtemp). Was Chromium dort anlegt, gehört zu diesem einen Start. Alles
   andere unter os.tmpdir sieht die Wache weiter wie bisher; nur der Browser schreibt nicht mehr in den gemeinsamen Ort.

   Gepatcht wird der gemeinsame Prototyp von BrowserType (playwright, playwright-core und @playwright/test teilen ihn),
   einmal, beim ersten Laden eines dieser Pakete. WebKit und Firefox bleiben unberührt: für sie ist kein Rest gemessen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PRAEFIX = 'vd-chromium-tmp-';
const MARKE = Symbol.for('vd.browserEigenesTmp');
// Am Ergebnis eines Starts: sein Verzeichnis, damit eine Probe genau dieses prüft und nicht das eines parallelen Prozesses.
const VERZEICHNIS = Symbol.for('vd.browserEigenesTmp.verzeichnis');
// Wo die Optionen im Aufruf stehen: launch(optionen), launchPersistentContext(nutzerdatenOrdner, optionen).
const OPTIONEN_STELLE = Object.freeze({ launch: 0, launchPersistentContext: 1 });

/* Rein: die Argumente des Aufrufs mit TMPDIR auf `dir` in den Optionen. Eine eigene env der Probe bleibt, nur TMPDIR wird
   gesetzt; ohne eigene env gilt wie bei Playwright die Umgebung des Prozesses. */
function argumenteMitTmp(name, args, dir, umgebung = process.env) {
  const i = OPTIONEN_STELLE[name];
  const neu = [...args];
  while (neu.length <= i) neu.push(undefined);
  const optionen = { ...(neu[i] || {}) };
  optionen.env = { ...(optionen.env || umgebung), TMPDIR: dir, TMP: dir, TEMP: dir };
  neu[i] = optionen;
  return neu;
}

/* Patcht den Prototyp einmal. Für die Probe lassen sich Anlegen und Räumen ersetzen (`anlegen()` liefert ein Verzeichnis,
   `raeumen(dir)` entfernt es); ohne sie legt mkdtemp unter os.tmpdir an, und rmSync räumt. */
function patchen(proto, { anlegen = null, raeumen = null } = {}) {
  if (!proto || proto[MARKE]) return false;
  for (const name of Object.keys(OPTIONEN_STELLE)) {
    const urspruenglich = proto[name];
    if (typeof urspruenglich !== 'function') continue;
    proto[name] = async function mitEigenemTmp(...args) {
      if (typeof this.name !== 'function' || this.name() !== 'chromium') return urspruenglich.apply(this, args);
      const dir = anlegen ? anlegen() : fs.mkdtempSync(path.join(os.tmpdir(), PRAEFIX));
      let geraeumt = false;
      const weg = () => {
        if (geraeumt) return;
        geraeumt = true;
        if (raeumen) raeumen(dir); else fs.rmSync(dir, { recursive: true, force: true });
      };
      let ergebnis;
      try { ergebnis = await urspruenglich.apply(this, argumenteMitTmp(name, args, dir)); }
      catch (e) { weg(); throw e; }
      if (ergebnis) {
        try { Object.defineProperty(ergebnis, VERZEICHNIS, { value: dir }); } catch (_) { /* eingefroren */ }
        // close() räumt, sobald es fertig ist — darauf wartet die Probe. Das Ereignis deckt den Absturz des Browsers
        // (Browser: 'disconnected', persistenter Kontext: 'close').
        if (typeof ergebnis.close === 'function') {
          const schliessen = ergebnis.close;
          ergebnis.close = async function close(...a) { try { return await schliessen.apply(this, a); } finally { weg(); } };
        }
        if (typeof ergebnis.once === 'function') ergebnis.once(name === 'launch' ? 'disconnected' : 'close', weg);
      }
      return ergebnis;
    };
  }
  Object.defineProperty(proto, MARKE, { value: true });
  return true;
}

/* Hängt sich an Module._load: sobald playwright, playwright-core oder @playwright/test geladen ist, wird gepatcht. */
function beimLadenPatchen(Module = require('node:module')) {
  if (Module._load[MARKE]) return;
  const laden = Module._load;
  let fertig = false;
  const neu = function _load(request, ...rest) {
    const r = laden.call(this, request, ...rest);
    if (!fertig && /^(playwright|playwright-core|@playwright\/test)$/.test(request) && r && r.chromium) {
      fertig = patchen(Object.getPrototypeOf(r.chromium)) || !!Object.getPrototypeOf(r.chromium)[MARKE];
    }
    return r;
  };
  Object.defineProperty(neu, MARKE, { value: true });
  Module._load = neu;
}

module.exports = { PRAEFIX, MARKE, VERZEICHNIS, argumenteMitTmp, patchen, beimLadenPatchen };
