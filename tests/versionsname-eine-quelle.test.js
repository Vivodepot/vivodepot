'use strict';
/* DER ÖFFENTLICHE NAME DER FASSUNG HAT EINE QUELLE (25.09.2026, Entscheidung: öffentlich „v1.0“).
   Bis v798 stand der Name an drei Stellen fest verdrahtet — BUILD_VERSION = 'v1.0-rc', der statische <title> und
   `document.title = name + ' · v1.0-rc'` — und eine vierte Stelle baute 'v' + BUILD_VERSION, so dass die Einstellungen
   „vv1.0-rc“ zeigten. Gehalten wird: (1) BUILD_VERSION ist die einzige Stelle im Kern-Code, die einen Fassungsnamen als
   Zeichenkette trägt — kein „v1.0…“, kein „-rc“ als Literal außerhalb von Kommentaren; der statische <title> ist genau
   „Vivodepot · “ + BUILD_VERSION; (2) keine Anzeige setzt ein weiteres „v“ davor; (3) zur Laufzeit zeigen Titel, Fußzeile
   und Einstellungen genau diesen Namen; (4) die Sprachmodule und die Lese-App tragen keinen Fassungsnamen im Text;
   (5) der Name steht nur in einem Export, den niemand liest — ein Depot aus v1.0-rc und eines aus v1.0 öffnen beide. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

// Kern-Code ohne Kommentare, Zeile für Zeile: Blockkommentare und Zeilen-Kommentare fallen weg (Zeichenketten mit „//“
// darin, etwa URLs, bleiben stehen — gesucht wird nur nach Fassungsnamen, nicht nach Kommentar-Freiheit).
function codeZeilen(text) {
  const aus = [];
  let imBlock = false;
  text.split('\n').forEach((zeile, i) => {
    let z = zeile;
    if (imBlock) { const e = z.indexOf('*/'); if (e < 0) return; z = z.slice(e + 2); imBlock = false; }
    for (;;) {
      const a = z.indexOf('/*');
      if (a < 0) break;
      const e = z.indexOf('*/', a + 2);
      if (e < 0) { z = z.slice(0, a); imBlock = true; break; }
      z = z.slice(0, a) + z.slice(e + 2);
    }
    z = z.replace(/(^|\s)\/\/.*$/, '$1');
    if (z.trim()) aus.push({ nr: i + 1, z });
  });
  return aus;
}
const FASSUNGSLITERAL = /['"`][^'"`\n]*(?:\bv1\.\d|-rc\b|\brc\.\d)[^'"`\n]*['"`]/;
const V_DAVOR = /['"`]v['"`]\s*\+\s*BUILD_VERSION/;

function funde(text) {
  return codeZeilen(text)
    .filter(({ z }) => (FASSUNGSLITERAL.test(z) || V_DAVOR.test(z)) && !/^\s*const BUILD_VERSION = /.test(z) && !/<title>/.test(z))
    .map(({ nr, z }) => nr + ': ' + z.trim().slice(0, 120));
}

const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

test('[Versionsname] BUILD_VERSION ist die einzige Stelle im Kern-Code, die einen Fassungsnamen trägt', () => {
  assert.deepEqual(funde(KERN), []);
});

test('[Versionsname] der statische <title> ist genau „Vivodepot · “ + BUILD_VERSION', () => {
  const bv = /const BUILD_VERSION = '([^']+)';/.exec(KERN)[1];
  assert.equal(/<title>([^<]*)<\/title>/.exec(KERN)[1], 'Vivodepot · ' + bv);
});

test('[Versionsname·Rot-Beweis] ein fest verdrahteter Titel und ein „v“ davor werden gefunden, ein Kommentar nicht', () => {
  const probe = [
    "      document.title = name + ' · v1.0-rc';",
    "  const k = ok ? x : ('v' + BUILD_VERSION);",
    "  // früher: document.title = name + ' · v1.0-rc';",
    "  /* 'v1.0-rc' im Kommentar */ const y = 1;",
    "const BUILD_VERSION = 'v1.0';",
  ].join('\n');
  assert.deepEqual(funde(probe).map((f) => f.split(':')[0]), ['1', '2']);
});

test('[Versionsname] zur Laufzeit: Titel, Fußzeile und Einstellungen zeigen genau BUILD_VERSION, ohne doppeltes „v“', async () => {
  const { V, document } = ladeKern();
  assert.equal(V.BUILD_VERSION, 'v1.0');
  V._markeAnzeigeAnwenden(null, { querySelector: () => null });
  assert.equal(document.title, 'Vivodepot · v1.0');
  await V.depotAnlegen('versionsname-pw-2026');
  V.betreteApp();
  const fuss = document.getElementById('app-fuss').innerHTML;
  assert.ok(fuss.includes('v1.0.' + V.SCHALEN_STAND.replace(/^v/, '')), 'Fußzeile: v1.0.<Stand>');
  V.flowEinstellungen();
  const einst = (document.getElementById('modal-inhalt') || {}).innerHTML || '';
  assert.ok(einst.includes('v1.0'), 'Einstellungen nennen die Fassung');
  assert.ok(!/vv1\.0/.test(fuss + document.title + einst), 'kein doppeltes „v“');
});

test('[Versionsname] Sprachmodule und Lese-App tragen keinen Fassungsnamen im Text', () => {
  for (const d of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json', 'vivodepot-lesen.html']) {
    const t = fs.readFileSync(path.join(REPO, d), 'utf8');
    assert.ok(!/v1\.0-rc/.test(t), d + ' nennt „v1.0-rc“');
  }
});

test('[Versionsname·Verträglichkeit] ein Klartext-Export mit „v1.0-rc“ und einer mit „v1.0“ lesen sich gleich — niemand liest _version', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('versionsname-pw-2026');
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1941-05-02');
  const neu = V.vollExportJSON({ sensibel: true });
  assert.equal(neu._version, 'v1.0');
  const alt = Object.assign({}, neu, { _version: 'v1.0-rc' });
  const { V: W } = ladeKern();
  const a = W._vollDepotParsen(JSON.stringify(alt));
  const n = W._vollDepotParsen(JSON.stringify(neu));
  assert.ok(a && n, 'beide werden als Depot erkannt');
  assert.deepEqual(a, n, 'der Fassungsname ändert am gelesenen Depot nichts');
  // Kein Leser: außer dem Schreiben in vollExportJSON kommt `_version` im Kern nicht vor.
  assert.equal((KERN.match(/_version\b/g) || []).length, 1);
});
