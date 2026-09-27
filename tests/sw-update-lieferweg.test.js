'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Service-Worker-Update-Lieferweg (Tor 1 vor produktiver Trust Authority)
   ────────────────────────────────────────────────────────────────────────
   Belegt, dass ein Schalen-Update eine schon installierte PWA ERREICHT — die
   Voraussetzung dafür, dass eine Notfall-Schlüssel-Rotation (neuer Trust-Root per
   Software-Update) tatsächlich ausliefert. Genau dieser Pfad versagte am festen
   SW-Cache (U2-ADR-024 §3): ohne Versions-Bump bleibt cache-first ewig auf der
   alten Schale.

   Wir laden das echte `sw.js` in eine minimale SW-Umgebung (mock Cache/clients/fetch)
   und treiben den Lebenszyklus: alte Schale vorinstalliert → neuer SW installiert +
   aktiviert → alte Schale weg, neue gewinnt, clients.claim() gerufen.
   Kein Browser nötig; läuft in `node --test`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_PFAD = path.join(__dirname, '..', 'sw.js');
const SW_QUELLE = fs.readFileSync(SW_PFAD, 'utf8');
const ORIGIN = 'https://vivodepot.example';

function reqUrl(req) { return typeof req === 'string' ? req : (req && req.url) || String(req); }

// Minimaler, aber funktionsfähiger Cache-Storage-Mock (Map aus Cache-Name → Map(url→Response)).
function makeCaches() {
  const store = new Map();
  const resp = (u) => { const r = { url: u, ok: true, clone() { return r; } }; return r; };
  const cacheObj = (name) => {
    const m = store.get(name);
    return {
      add: async (url) => { m.set(reqUrl(url), resp(reqUrl(url))); },
      put: async (req, res) => { m.set(reqUrl(req), res); },
      match: async (req) => m.get(reqUrl(req)),
    };
  };
  return {
    _store: store,
    open: async (name) => { if (!store.has(name)) store.set(name, new Map()); return cacheObj(name); },
    keys: async () => [...store.keys()],
    delete: async (name) => store.delete(name),
    match: async (req) => { for (const m of store.values()) { const r = m.get(reqUrl(req)); if (r) return r; } return undefined; },
  };
}

// Lädt das echte sw.js in eine frische SW-Umgebung; gibt Handler + Sonden zurück.
function ladeSW() {
  const handlers = {};
  const claimCalls = [];
  const caches = makeCaches();
  const sandbox = {
    caches,
    fetch: async (req) => ({ url: reqUrl(req), ok: true, clone() { return this; } }),
    URL, Promise, console, Map,
    self: {
      addEventListener: (typ, fn) => { handlers[typ] = fn; },
      location: { origin: ORIGIN },
      clients: { claim: async () => { claimCalls.push(1); } },
      caches,
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SW_QUELLE, sandbox, { filename: 'sw.js' });
  const treibe = async (typ, evt) => {
    const warten = [];
    const e = Object.assign({ waitUntil: (p) => warten.push(p) }, evt);
    handlers[typ](e);
    await Promise.all(warten);
  };
  return { handlers, claimCalls, caches, treibe, sandbox };
}

// Befund 1: der Cache-Name ist VERSIONIERT — nur so kann ein Bump überhaupt ausliefern.
test('SW-Lieferweg: Cache-Name trägt eine Version (Bump-fähig)', () => {
  assert.match(SW_QUELLE, /vivodepot-shell-v\d+/, 'Cache-Name muss ein Versions-Suffix tragen');
});

// Befund 2 (Kern): ein neuer SW entfernt beim Aktivieren die ALTE Schale → die neue gewinnt.
//   Angriff/Defekt-Szenario (U2-ADR-024 §3): bliebe die alte Schale, erreichte das Update die PWA nie.
test('SW-Lieferweg: activate löscht alte Schalen-Caches, fremde bleiben, neue gewinnt', async () => {
  const { caches, treibe, claimCalls } = ladeSW();
  // Eine schon installierte ALTE Schale + ein fremder Cache liegen vor.
  (await caches.open('vivodepot-shell-v2')).add(ORIGIN + '/vivodepot.html');
  (await caches.open('fremd-cache')).add(ORIGIN + '/irgendwas');

  await treibe('install', {});                 // neuer SW cacht die aktuelle Schale
  await treibe('activate', {});                // räumt alte Schalen-Versionen ab

  const namen = [...caches._store.keys()];
  assert.ok(!namen.includes('vivodepot-shell-v2'), 'alte Schale MUSS entfernt sein (sonst liefert das Update nie aus)');
  assert.ok(namen.some((n) => /^vivodepot-shell-v\d+$/.test(n) && n !== 'vivodepot-shell-v2'), 'neue Schalen-Version ist vorhanden');
  assert.ok(namen.includes('fremd-cache'), 'fremde Caches bleiben unangetastet');
  assert.equal(claimCalls.length, 1, 'clients.claim() wird gerufen — der neue SW übernimmt bestehende Clients');
});

// Befund 3: nach dem Update liefert fetch die NEUE Schale aus (cache-first auf der aktuellen Version).
test('SW-Lieferweg: nach Aktivierung liefert fetch die aktuelle Schale aus', async () => {
  const { caches, treibe, handlers } = ladeSW();
  await treibe('install', {});
  await treibe('activate', {});

  let antwort;
  const evt = { request: { url: ORIGIN + '/vivodepot.html', method: 'GET', mode: 'navigate' },
                respondWith: (p) => { antwort = p; } };
  handlers.fetch(evt);
  const res = await antwort;
  assert.ok(res && res.ok, 'Navigation wird beantwortet');
  assert.equal(reqUrl(res), ORIGIN + '/vivodepot.html', 'die aktuelle, gecachte Schale wird ausgeliefert');
});
