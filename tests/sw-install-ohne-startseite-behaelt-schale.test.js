'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Service Worker: ein Install ohne Startseite lässt die alte Schale stehen
   (Befund SW-INSTALL-OHNE-ZUGANG-LEERT-CACHE, 26.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Pro-Host liefert `/` und `/vivodepot.html` nur mit dem Zugangs-Cookie aus. Das Cookie gilt nur für die
   Sitzung. Prüft der Browser nach einem Neustart eine neue sw.js, antworten beide Adressen mit 404. Der Install
   schluckte jeden Fehler einzeln und galt trotzdem als gelungen. activate löschte danach die alte Schale, und
   Pro startete offline nicht mehr, bis die Person den Link aus der Kaufmail wieder öffnete.

   Die Regel: der Install bricht ab, wenn weder `./` noch `./vivodepot.html` im neuen Speicher liegt. Dann bleiben
   der alte Service Worker und seine Schale. Die übrigen Einträge (Manifest, vorabkonfiguration.js) bleiben
   tolerant. `./` allein genügt nicht als Pflicht: die Demos legen sw.js neben `vivodepot.html`, ohne Datei für `./`.

   Die Probe führt das echte sw.js in einer nachgebauten Umgebung aus. `cache.add` verwirft dort wie die Cache-API
   jede Antwort, die nicht ok ist; ein abgelehnter Install führt kein activate aus, wie im Browser.
   Fälle: Pro ohne Cookie, Demo ohne `./`, Pro mit Cookie. Rot-Beweis: dasselbe sw.js ohne die Pflicht.
   Nachbar: tests/sw-navigation-ohne-anhang.test.js (gleicher Nachbau, dort mit tolerantem add).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_TEXT = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const HERKUNFT = 'https://pro.beispiel.test';
const BASIS = HERKUNFT + '/';

class Anfrage {
  constructor(url, mode) { this.url = url; this.mode = mode; this.method = 'GET'; }
}
const antwort = (status, inhalt) => ({ ok: status >= 200 && status < 300, status, inhalt, clone() { return this; } });

/** Speicher nach der Cache-API: add verwirft Antworten, die nicht ok sind; match kennt ignoreSearch. */
function speicherNachbau() {
  const caches = new Map();
  const adresse = (x) => new URL(typeof x === 'string' ? x : x.url, BASIS).href;
  const ohneAnhang = (a) => { const u = new URL(a); return u.origin + u.pathname; };
  const passt = (k, a, opts) => (opts && opts.ignoreSearch) ? ohneAnhang(k) === ohneAnhang(a) : k === a;
  const cacheObjekt = (eintraege, netz) => ({
    async put(req, r) { eintraege.set(adresse(req), r); },
    async add(url) {
      const r = await netz(new Anfrage(adresse(url), 'no-cors'));
      if (!r || !r.ok) throw new TypeError('Cache.add: Antwort ' + (r && r.status));
      eintraege.set(adresse(url), r);
    },
    async match(req, opts) { const a = adresse(req); for (const [k, v] of eintraege) if (passt(k, a, opts)) return v; return undefined; },
  });
  const speicher = {
    netzJetzt: null,
    namen: () => [...caches.keys()],
    api() {
      const netz = (req) => speicher.netzJetzt(req);
      return {
        async open(name) { if (!caches.has(name)) caches.set(name, new Map()); return cacheObjekt(caches.get(name), netz); },
        async keys() { return [...caches.keys()]; },
        async delete(name) { return caches.delete(name); },
        async match(req, opts) {
          for (const e of caches.values()) { const t = await cacheObjekt(e, netz).match(req, opts); if (t) return t; }
          return undefined;
        },
      };
    },
  };
  return speicher;
}

function swLaden(swText, cacheName, speicher) {
  const handler = {};
  const self = { location: new URL(BASIS + 'sw.js'), addEventListener: (typ, fn) => { handler[typ] = fn; },
    skipWaiting() {}, clients: { claim: async () => {} } };
  const text = swText.replace(/const CACHE = '[^']*';/, "const CACHE = '" + cacheName + "';");
  assert.notEqual(text, swText, 'CACHE-Zeile in sw.js nicht in der erwarteten Form');
  vm.runInNewContext(text, { self, caches: speicher.api(), fetch: (req) => speicher.netzJetzt(req), URL, Promise, console, TypeError, Error });
  return {
    async ereignis(typ, extra = {}) {
      let warten = null; let zusage = null;
      handler[typ]({ ...extra, waitUntil: (p) => { warten = p; }, respondWith: (p) => { zusage = p; } });
      if (warten) await warten;
      return zusage ? await zusage : undefined;
    },
  };
}

/** Netz je Pfad: Tabelle Pfad → Status; fehlt der Pfad, 404. `offline` wirft wie ein Abruf ohne Netz. */
const netzAus = (tabelle, inhalt) => async (req) => {
  const p = new URL(req.url).pathname;
  const status = tabelle[p] || 404;
  return antwort(status, status === 200 ? inhalt : 'zugangssatz');
};
const offline = async () => { throw new TypeError('Failed to fetch'); };
const ALLES = { '/': 200, '/vivodepot.html': 200, '/manifest.webmanifest': 200 };

/**
 * Fassung A installiert und aktiviert mit vollem Zugang; dann Fassung B gegen das Netz `netzB`.
 * Ein abgelehnter Install führt kein activate aus. Danach eine Navigation ohne Netz über den Worker, der jetzt gilt.
 */
async function wechsel(swText, netzB) {
  const speicher = speicherNachbau();
  speicher.netzJetzt = (req) => netzAus(ALLES, 'schale-A')(req);
  const a = swLaden(swText, 'vivodepot-shell-vA', speicher);
  await a.ereignis('install');
  await a.ereignis('activate');

  speicher.netzJetzt = netzB;
  const b = swLaden(swText, 'vivodepot-shell-vB', speicher);
  let abgelehnt = null;
  try { await b.ereignis('install'); } catch (err) { abgelehnt = err; }
  const gilt = abgelehnt ? a : b;
  if (!abgelehnt) await b.ereignis('activate');

  speicher.netzJetzt = offline;
  let offlineSchale = null;
  try {
    const r = await gilt.ereignis('fetch', { request: new Anfrage(BASIS, 'navigate') });
    offlineSchale = r ? r.inhalt : null;
  } catch (_) { offlineSchale = null; }
  return { abgelehnt, namen: speicher.namen(), offlineSchale };
}

test('[SW·Install ohne Startseite] Pro ohne Cookie: Install lehnt ab, die alte Schale bleibt und startet offline', async () => {
  const r = await wechsel(SW_TEXT, netzAus({}, 'schale-B'));
  assert.ok(r.abgelehnt, 'der Install ohne Startseite hätte ablehnen müssen');
  assert.ok(r.namen.includes('vivodepot-shell-vA'), 'die alte Schale wurde gelöscht: ' + JSON.stringify(r.namen));
  assert.equal(r.offlineSchale, 'schale-A', 'ohne Netz kam die alte Schale nicht');
});

test('[SW·Install ohne Startseite] Demo ohne ./: vivodepot.html genügt, der Install gelingt', async () => {
  const r = await wechsel(SW_TEXT, netzAus({ '/vivodepot.html': 200, '/manifest.webmanifest': 200 }, 'schale-B'));
  assert.equal(r.abgelehnt, null, 'der Install mit vivodepot.html hat abgelehnt: ' + (r.abgelehnt && r.abgelehnt.message));
  assert.deepEqual(r.namen, ['vivodepot-shell-vB']);
  assert.equal(r.offlineSchale, 'schale-B', 'ohne Netz kam nicht die neue Schale');
});

test('[SW·Install ohne Startseite] Pro mit Cookie: Install gelingt, activate räumt die alte Schale', async () => {
  const r = await wechsel(SW_TEXT, netzAus(ALLES, 'schale-B'));
  assert.equal(r.abgelehnt, null);
  assert.deepEqual(r.namen, ['vivodepot-shell-vB']);
  assert.equal(r.offlineSchale, 'schale-B');
});

test('[SW·Install ohne Startseite·Rot-Beweis] ohne die Pflicht löscht der Wechsel die alte Schale, offline bleibt nichts', async () => {
  const ANKER = 'if (!startseite) throw';
  assert.equal(SW_TEXT.split(ANKER).length, 2, 'Anker für den Rot-Beweis trifft in sw.js nicht genau einmal');
  const tolerant = SW_TEXT.replace(ANKER, 'if (false) throw');
  const r = await wechsel(tolerant, netzAus({}, 'schale-B'));
  assert.equal(r.abgelehnt, null, 'Vorbedingung: der tolerante Install gelingt');
  assert.ok(!r.namen.includes('vivodepot-shell-vA'), 'Vorbedingung: activate hat die alte Schale gelöscht');
  assert.equal(r.offlineSchale, null, 'ohne die Pflicht hätte offline keine Schale kommen dürfen');
});

// pages/sw.js ist laut eigenem Kopf logik-gleich zur Wurzel-sw.js zu halten: dieselbe Pflicht, derselbe Fall (30.10.2026).
test('[SW·Install ohne Startseite·pages] pages/sw.js: ohne Startseite lehnt der Install ab, die alte Schale bleibt; mit ihr gelingt er', async () => {
  const PAGES = fs.readFileSync(path.join(__dirname, '..', 'pages', 'sw.js'), 'utf8');
  const ohne = await wechsel(PAGES, netzAus({}, 'schale-B'));
  assert.ok(ohne.abgelehnt, 'pages/sw.js: der Install ohne Startseite hätte ablehnen müssen');
  assert.ok(ohne.namen.includes('vivodepot-shell-vA'), 'pages/sw.js: die alte Schale wurde gelöscht');
  const mit = await wechsel(PAGES, netzAus(ALLES, 'schale-B'));
  assert.equal(mit.abgelehnt, null);
  assert.deepEqual(mit.namen, ['vivodepot-shell-vB']);
  // Rot-Beweis: ohne die Pflicht geht die alte Schale verloren.
  const tolerant = await wechsel(PAGES.replace('if (!startseite) throw', 'if (false) throw'), netzAus({}, 'schale-B'));
  assert.ok(!tolerant.namen.includes('vivodepot-shell-vA'));
});
