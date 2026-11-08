'use strict';
/* Baut ein konfektioniertes Produkt (wie tools/vier-produkte-erzeugen.js) und liefert den Pfad seiner
   vivodepot.html. Seit S1 (U2-ADR-426) trägt das Gerüst keinen vollen englischen Satz; Tests, die
   „Englisch ist aktiv" am ERZEUGTEN Produkt messen, laden ihn über KERN_HTML_PATH aus dem englischen Produkt. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const zwischen = new Map();
/* Die Ordner leben so lange wie der Prozess (zwischen hält den Pfad); beim Ende werden sie geräumt (Befund TEMP-RESTE-WIEDER).
   Auch bei SIGTERM, SIGINT und SIGHUP (02.11.2026, tests/produkt-html-temp-signal.test.js): dann endet Node ohne 'exit',
   und jeder abgebrochene Lauf ließ seine Produkte im TMPDIR liegen. Nach dem Räumen gilt das Signal wie vorher: ist kein
   anderer Hörer da, wird es neu ausgelöst und beendet den Prozess. SIGKILL lässt sich nicht abfangen. */
const zuRaeumen = new Set();
function raeumen() {
  for (const d of zuRaeumen) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) { /* weiter mit dem nächsten */ } }
  zuRaeumen.clear();
}
let wacheAn = false;

/* Verwaiste Ordner toter Läufe (07.11.2026): SIGKILL lässt sich nicht abfangen. Endet ein Lauf so (Überzeit-Abbruch über
   suite-platz: erst SIGTERM, nach 2 s SIGKILL), bleibt sein Ordner liegen; am 07.11. lagen 1000 davon mit 5,6 GB im TMPDIR.
   Darum trägt jeder Ordner die PID seines Laufs im Namen (produkt-html-<slug>-p<pid>-XXXXXX), und der erste Bau eines
   Prozesses räumt die Ordner, deren PID nicht mehr lebt. Geräumt wird nur genau dieses Namensmuster: ältere Ordner ohne PID,
   Ordner lebender Läufe und fremde Ordner bleiben stehen. Probe: tests/produkt-html-verwaiste-raeumen.test.js. */
const VERWAIST_MUSTER = /^produkt-html-(?:privat|pro)-(?:de|en)-p(\d+)-[A-Za-z0-9]{6}$/;
function pidLebt(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === 'EPERM'; }
}
function verwaisteRaeumen({ tmp = os.tmpdir(), lebt = pidLebt, eigenePid = process.pid } = {}) {
  const geraeumt = [];
  let namen = [];
  try { namen = fs.readdirSync(tmp); } catch (_) { return geraeumt; }
  for (const name of namen) {
    const m = VERWAIST_MUSTER.exec(name);
    if (!m) continue;
    const pid = Number(m[1]);
    if (pid === eigenePid || lebt(pid)) continue;
    try { fs.rmSync(path.join(tmp, name), { recursive: true, force: true }); geraeumt.push(name); } catch (_) { /* weiter */ }
  }
  return geraeumt;
}
let verwaistGeraeumt = false;
/* Legt den Ordner eines Baus an: PID im Namen, beim ersten Mal je Prozess vorher die verwaisten räumen. */
function _ordnerAnlegen(slug, tmp = os.tmpdir()) {
  if (!verwaistGeraeumt) { verwaistGeraeumt = true; verwaisteRaeumen({ tmp }); }
  const ziel = fs.mkdtempSync(path.join(tmp, 'produkt-html-' + slug + '-p' + process.pid + '-'));
  zuRaeumen.add(ziel);
  wacheEinrichten();
  return ziel;
}
function wacheEinrichten() {
  if (wacheAn) return;
  wacheAn = true;
  process.once('exit', raeumen);
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    process.once(signal, () => {
      raeumen();
      if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
    });
  }
}
function _bauArgumente(slug) {
  const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  const p = PRODUKTE.find((x) => x.slug === slug);
  const ziel = _ordnerAnlegen(slug);
  return { ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(p) };
}
/* Das Produkt, wie es ausgeliefert wird: ohne window.__vdOeffentlich (U2-ADR-494). Für Byte-, Text- und jsdom-Proben. */
function produktHtml(slug) {
  if (!zwischen.has(slug)) {
    const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
    zwischen.set(slug, path.join(konfektionieren(_bauArgumente(slug)).ordner, 'vivodepot.html'));
  }
  return zwischen.get(slug);
}
/* Die Testfassung desselben Produkts: mit der Fläche. Für Proben, die das Produkt im Browser über die Fläche bedienen.
   Eine eigene Funktion, damit tools/testflaeche-klasse-pruefen.js je Funktion sieht, wer welches Produkt baut. */
function produktHtmlTestfassung(slug) {
  const k = slug + '#testfassung';
  if (!zwischen.has(k)) {
    const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
    zwischen.set(k, path.join(konfektionieren({ ..._bauArgumente(slug), mitTestflaeche: true }).ordner, 'vivodepot.html'));
  }
  return zwischen.get(k);
}
const LADER = path.join(__dirname, 'load-kern.js');

/* Lädt den Kern einer beliebigen vivodepot.html (KERN_HTML_PATH), leert den Cache davor und danach und
   setzt die Umgebung zurück. Liefert das Ergebnis von ladeKern(): { V, document, window, ... }. */
function kernAus(html, opts) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = html;
  delete require.cache[require.resolve(LADER)];
  try { return require(LADER).ladeKern(opts); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LADER)];
  }
}

/* Produktwechsel, Ausgangsseite: legt im Produkt `slug` ein Depot an, ruft `vorbereiten(V)` (z. B.
   Felder setzen; darf async sein) und serialisiert es über den echten Schreibweg. Liefert { V, umschlag }. */
async function depotImProduktAnlegen(slug, passwort, vorbereiten) {
  const { V } = kernAus(produktHtml(slug));
  await V.depotAnlegen(passwort);
  if (vorbereiten) await vorbereiten(V);
  return { V, umschlag: await V.depotSerialisieren() };
}

/* Produktwechsel, Zielseite: bootet das Produkt `slug` und lädt den Umschlag über den echten Leseweg.
   Liefert { V, document, d } mit d = V.getData() nach dem Laden. */
async function depotImProduktLaden(slug, umschlag, passwort) {
  const { V, document } = kernAus(produktHtml(slug));
  await V.depotLaden(umschlag, passwort);
  return { V, document, d: V.getData() };
}

module.exports = { produktHtml, produktHtmlTestfassung, kernAus, depotImProduktAnlegen, depotImProduktLaden,
  verwaisteRaeumen, _ordnerAnlegen, VERWAIST_MUSTER };
