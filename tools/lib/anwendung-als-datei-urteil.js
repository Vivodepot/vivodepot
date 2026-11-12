'use strict';
/* anwendung-als-datei-urteil.js — der reine Teil des Gerätemessers für „Anwendung als Datei erhalten“ (Teil C Nr. 28,
   07.11.2026): Argumente, Dateiname gegen Stand, das Kriterium „heil“ und die Schlusszeile. Ohne Browser und ohne
   externes Modul, damit die Probe in Schicht 1 bleibt. Der Browser-Teil: tools/anwendung-als-datei-geraet-messen.js.
   Probe: tests/anwendung-als-datei-geraet-messen.test.js. */

const NAME_MUSTER = /^vivodepot-([a-z0-9-]+)-v(\d+)\.html$/;

function argumente(argv) {
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const browser = wert('--browser') || 'alle';
  return { adresse: wert('--adresse'), browser: browser === 'alle' ? ['chromium', 'webkit'] : [browser], ausgabe: wert('--ausgabe') };
}

/* Rein: passt der Dateiname zum Stand in der Datei? */
function nameUrteil(name, inhalt) {
  const m = NAME_MUSTER.exec(String(name || ''));
  const s = /const SCHALEN_STAND = 'v(\d+)'/.exec(String(inhalt || ''));
  if (!m) return { ok: false, grund: 'Name ohne Muster vivodepot-<kennung>-v<stand>.html: ' + name };
  if (!s) return { ok: false, grund: 'kein SCHALEN_STAND in der Datei' };
  return m[2] === s[1] ? { ok: true, kennung: m[1], stand: 'v' + m[2] } : { ok: false, grund: 'Name v' + m[2] + ', Datei v' + s[1] };
}

/* Rein: „heil“ nach dem Kriterium vom 15.10.2026. */
function heil(m) {
  return m.app === 1 && m.hinweisKopie === 0 && m.knoepfeSichtbar > 0 && m.seitenfehler.length === 0 && m.netzVersuche === 0;
}

/* Rein: die Schlusszeile und der Ausgang. */
function schluss(ergebnisse) {
  const online = ergebnisse.length > 0 && ergebnisse.every((e) => e.online && e.online.ok && e.dateiHeil);
  const offline = ergebnisse.length > 0 && ergebnisse.every((e) => e.offline && e.offline.ok);
  const rot = ergebnisse.length > 0 && ergebnisse.every((e) => e.rotBeweis === true);
  return {
    zeile: 'heil online: ' + (online ? 'ja' : 'nein') + ' · offline: ' + (offline ? 'kein falscher Download' : 'NICHT BELEGT')
      + ' · rot-beweis: ' + (rot ? 'ja' : 'nein'),
    ok: online && offline && rot,
  };
}

module.exports = { argumente, nameUrteil, heil, schluss, NAME_MUSTER };
