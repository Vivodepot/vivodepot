'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   fehlerzeile.js — ein roter Zugkopf in einer Zeile (Werkzeug-Zug 2, 27.10.2026; Testkonzept Punkt 10, entschieden 26.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   WOZU. Nach einem Rot suchte jede Sitzung in 30 Protokollzeilen nach dem Test, der Datei und dem Wagen. Die Fehlerzeile nennt
   alles auf einmal: Testname, Datei, erste Meldung, letzter ändernder Wagen. Die roten Dateien und das Behalten der Protokolle
   liegen in tools/lib/rot-protokoll.js (Befund LANDUNG-ROT-OHNE-DATEI, 28.10.2026); diese Zeile setzt darauf auf und nennt das
   behaltene Protokoll der roten Seite.

   QUELLEN DER ZEILE
   - Node-Suite: die Datei des frühen Rots (VD_ERSTES_ROT, „datei<TAB>test<TAB>meldung“; die dritte Spalte schreibt der Reporter
     seit diesem Wagen, ältere Zeilen haben sie nicht). Fehlt sie, die erste ✖-Zeile des Protokolls.
   - Jede andere Seite (Gates, Browser-Strecke, Air): der Schritt, an dem sie rot wurde, und die letzten Zeilen ihres Protokolls.
   - Der letzte ändernde Wagen: der jüngste Commit im Zug (<kanon>..HEAD), der die rote Datei ändert; ändert keiner sie, der
     jüngste Commit des Zugs, ausdrücklich als „Datei im Zug unverändert“ benannt (der Verursacher ist dann offen).

   WOHIN
   - Eine Zeile an den Aufrufer (stderr der Landung) und als JSON-Zeile nach <git-common-dir>/vd-fehlerzeilen.ndjson, mit dem
     Pfad des behaltenen Protokolls der roten Seite.
   Probe: die Proben [Fehlerzeile·…] im Testordner.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const { letzteZeilen, LETZTE_ZEILEN } = require('./rot-protokoll.js');

const MELDUNG_LAENGE = 300;
const FEHLERZEILEN_DATEI = 'vd-fehlerzeilen.ndjson';

const einzeilig = (t, n = MELDUNG_LAENGE) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Die Meldung eines Fehlers für die dritte Spalte von VD_ERSTES_ROT: die erste Zeile, ohne Tabs und Umbrüche. */
function meldungAusFehler(fehler) {
  if (!fehler) return '';
  const f = fehler.cause && typeof fehler.cause === 'object' ? fehler.cause : fehler;
  const text = String(f.message || f || '').split('\n').find((z) => z.trim()) || '';
  return einzeilig(((f.code && f.code !== 'ERR_TEST_FAILURE') ? f.code + ': ' : '') + text);
}

/** Zeilen der Datei des frühen Rots: [{ datei, test, meldung }]; die dritte Spalte darf fehlen. */
function roteLesen(datei) {
  let zeilen = [];
  try { zeilen = fs.readFileSync(datei, 'utf8').split('\n').filter(Boolean); } catch (_) { return []; }
  return zeilen.map((z) => { const [d, test = '', meldung = ''] = z.split('\t'); return { datei: d, test, meldung }; });
}

/** Erste ✖-Zeile eines spec-Protokolls mit der Meldung danach: { test, meldung } oder null. */
function erstesKreuz(text) {
  const z = String(text || '').split('\n');
  const i = z.findIndex((x) => /^\s*✖ /.test(x) && !/failing tests:/.test(x));
  if (i < 0) return null;
  const test = einzeilig(z[i].replace(/^\s*✖ /, '').replace(/ \([\d.]+m?s\)\s*$/, ''));
  const m = z.slice(i + 1, i + 12).find((x) => /Error|assert|expected|erwartet|Exit|rot/i.test(x));
  return { test, meldung: einzeilig(m || '') };
}

/** Der rote Schritt einer Seite aus dem Ergebnis des Parallel-Werkzeugs (der erste mit rc ≠ 0, sonst der letzte). */
function roterSchritt(seite) {
  const s = (seite && seite.schritte) || [];
  return s.find((x) => x.rc !== 0) || s[s.length - 1] || null;
}

/** Baut den Eintrag. `wagenFuer(datei)` → { kurz, betreff, zweig?, unveraendert? } oder null.
    Ergebnis: { seite, test, datei, meldung, wagen, letzte, zeile }. */
function fehlerzeileBauen({ rot, seite = null, protokoll = '', rote = [], wagenFuer = () => null, wurzel = process.cwd() }) {
  const name = (rot && rot.seite) || (seite && seite.name) || '?';
  let test = '';
  let datei = '';
  let meldung = '';
  if (name === 'node-suite') {
    const r = rote[0] || null;
    const k = erstesKreuz(protokoll);
    if (r) { datei = r.datei; test = r.test; meldung = r.meldung || (k && k.meldung) || ''; }
    else if (k) { test = k.test; meldung = k.meldung; }
  } else {
    const sch = roterSchritt(seite);
    const befehl = sch ? sch.befehl : '';
    const skript = befehl.split(' ').find((w) => /\.(c|m)?js$/.test(w));
    datei = skript ? (path.isAbsolute(skript) ? path.relative(wurzel, skript) : skript) : '';
    if (datei.startsWith('..')) datei = '';
    test = sch ? einzeilig(befehl.split(' ').slice(0, 4).map((w) => path.basename(w)).join(' '), 120) : name;
    meldung = (rot && rot.grund) || '';
  }
  const letzte = letzteZeilen(protokoll);
  if (!meldung) meldung = einzeilig(letzte.slice(-1)[0] || '');
  const wagen = datei ? wagenFuer(datei) : wagenFuer(null);
  const wagenText = !wagen ? 'Wagen unbestimmt'
    : 'Wagen ' + wagen.kurz + (wagen.betreff ? ' „' + einzeilig(wagen.betreff, 80) + '“' : '') + (wagen.unveraendert ? ' (Datei im Zug unverändert, jüngster Wagen)' : '');
  const zeile = 'FEHLERZEILE · ' + name + ' · ' + (test || '?') + ' · ' + (datei || '?') + ' · ' + (meldung || '(keine Meldung)') + ' · ' + wagenText;
  return { seite: name, test, datei, meldung, wagen, letzte, zeile };
}

/** Hängt den Eintrag an die Fehlerzeilen-Datei, mit dem Pfad des behaltenen Protokolls (tools/lib/rot-protokoll.js).
    Gibt den Pfad der Datei oder null. Messung, kein Gate: Fehler beim Schreiben werfen nicht. */
function fehlerzeileEintragen(eintrag, { ort, baum = '', protokoll = null, zeit = new Date().toISOString() }) {
  if (!ort) return null;
  try {
    fs.mkdirSync(ort, { recursive: true });
    const datei = path.join(ort, FEHLERZEILEN_DATEI);
    fs.appendFileSync(datei, JSON.stringify({ zeit, baum, seite: eintrag.seite, test: eintrag.test, datei: eintrag.datei,
      meldung: eintrag.meldung, wagen: eintrag.wagen, letzte: eintrag.letzte, protokoll }) + '\n');
    return datei;
  } catch (_) { return null; }
}

/** Der letzte ändernde Wagen über git: jüngster Commit in <basis>..HEAD, der `datei` ändert; sonst der jüngste des Zugs. */
function wagenUeberGit(git, basis = 'refs/remotes/origin/u2-kanon') {
  return (datei) => {
    const fmt = ['log', '-1', '--format=%h%x09%s', basis + '..HEAD'];
    const lies = (args) => { const t = String(git(args) || '').trim(); if (!t) return null; const [kurz, betreff] = t.split('\t'); return { kurz, betreff }; };
    const getroffen = datei ? lies([...fmt, '--', datei]) : null;
    if (getroffen) return getroffen;
    const juengster = lies(fmt);
    return juengster ? { ...juengster, unveraendert: true } : null;
  };
}

module.exports = { fehlerzeileBauen, fehlerzeileEintragen, wagenUeberGit, meldungAusFehler, roteLesen, erstesKreuz,
  roterSchritt, LETZTE_ZEILEN, FEHLERZEILEN_DATEI };
