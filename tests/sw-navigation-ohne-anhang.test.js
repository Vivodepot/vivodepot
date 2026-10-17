'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Service Worker: eine Navigation mit Anhang trifft die Schale auch nach einem Release
   (Befund SW-NAVIGATION-MIT-ANHANG-VERFEHLT-SPEICHER, 14.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine abgelegte App startet oft mit dem Anhang ihrer ersten Adresse (`/?von=startseite`). Vergleicht der Service
   Worker die volle Adresse, findet er die Schale nach jedem Release nicht, die Navigation geht als Seitenabruf an den
   Dienst und zählt dort erneut als Download.

   Die Probe führt das echte sw.js in einer nachgebauten Umgebung aus (Ereignisse, Speicher mit ignoreSearch,
   Netz mit Zähler) und spielt durch: Installation, Aktivierung, Navigation mit Anhang, Release (neuer CACHE-Name,
   Installation, Aktivierung), dieselbe Navigation. Gezählt wird, welche Navigationen das Netz erreichen.

   Die Klasse: jede Navigation, gleich mit welchem Abfrageteil, findet die abgelegte Schale; nichts wird unter einer
   Adresse mit Abfrageteil abgelegt. Rot-Beweis: dasselbe sw.js mit dem vollen Vergleich.
   Probe im Browser: tests/e2e/sw-navigation-ohne-anhang.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_TEXT = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const HERKUNFT = 'https://app.beispiel.test';
const BASIS = HERKUNFT + '/';

/** Speicher nach der Cache-API, mit ignoreSearch. Schlüssel: die volle Adresse. */
function speicherNachbau() {
  const caches = new Map();
  const adresse = (x) => new URL(typeof x === 'string' ? x : x.url, BASIS).href;
  const ohneAnhang = (a) => { const u = new URL(a); return u.origin + u.pathname; };
  const passt = (schluessel, gesucht, opts) => (opts && opts.ignoreSearch)
    ? ohneAnhang(schluessel) === ohneAnhang(gesucht) : schluessel === gesucht;
  const cacheObjekt = (eintraege, netz) => ({
    async put(req, antwort) { eintraege.set(adresse(req), antwort); },
    async add(url) { const r = await netz(new NachgebauteAnfrage(adresse(url), 'no-cors')); if (r && r.ok) eintraege.set(adresse(url), r); },
    async match(req, opts) { const a = adresse(req); for (const [k, v] of eintraege) if (passt(k, a, opts)) return v; return undefined; },
  });
  return {
    caches,
    api(netz) {
      return {
        async open(name) { if (!caches.has(name)) caches.set(name, new Map()); return cacheObjekt(caches.get(name), netz); },
        async keys() { return [...caches.keys()]; },
        async delete(name) { return caches.delete(name); },
        async match(req, opts) {
          for (const eintraege of caches.values()) { const t = await cacheObjekt(eintraege, netz).match(req, opts); if (t) return t; }
          return undefined;
        },
      };
    },
    alleSchluessel() { return [...caches.values()].flatMap((m) => [...m.keys()]); },
  };
}

class NachgebauteAnfrage {
  constructor(url, mode) { this.url = url; this.mode = mode; this.method = 'GET'; }
}
const antwort = (inhalt) => ({ ok: true, inhalt, clone() { return this; } });

/** Lädt einen Service Worker (Text) in die Umgebung und gibt seine Ereignis-Handler zurück. */
function swLaden(swText, speicher, netz) {
  const handler = {};
  const self = { location: new URL(BASIS + 'sw.js'), addEventListener: (typ, fn) => { handler[typ] = fn; },
    skipWaiting() {}, clients: { claim: async () => {} } };
  vm.runInNewContext(swText, { self, caches: speicher.api(netz), fetch: netz, URL, Promise, console });
  return {
    async ereignis(typ, extra = {}) {
      let warten = null; let antwortZusage = null;
      handler[typ]({ ...extra, waitUntil: (p) => { warten = p; }, respondWith: (p) => { antwortZusage = p; } });
      if (warten) await warten;
      return antwortZusage ? await antwortZusage : undefined;
    },
  };
}

/** Spielt Installation, Navigation mit Anhang, Release und dieselbe Navigation durch. Liefert die Navigationen am Netz. */
async function durchspielen(swText) {
  const speicher = speicherNachbau();
  const navigationenAmNetz = [];
  const netz = async (req) => { if (req.mode === 'navigate') navigationenAmNetz.push(req.url); return antwort('schale'); };
  const nav = (url) => ({ request: new NachgebauteAnfrage(url, 'navigate') });

  const v1 = swLaden(swText.replace(/const CACHE = '[^']*';/, "const CACHE = 'vivodepot-shell-v1';"), speicher, netz);
  await v1.ereignis('install');
  await v1.ereignis('activate');
  await v1.ereignis('fetch', nav(BASIS + '?von=startseite'));

  const v2 = swLaden(swText.replace(/const CACHE = '[^']*';/, "const CACHE = 'vivodepot-shell-v2';"), speicher, netz);
  await v2.ereignis('install');
  await v2.ereignis('activate');
  const nachRelease = navigationenAmNetz.length;
  const geliefert = await v2.ereignis('fetch', nav(BASIS + '?von=startseite'));
  return { navigationenAmNetz, nachRelease, geliefert, schluessel: speicher.alleSchluessel() };
}

test('[SW·Navigation mit Anhang] nach einem Release trifft dieselbe Navigation die Schale, nicht das Netz', async () => {
  const r = await durchspielen(SW_TEXT);
  assert.equal(r.navigationenAmNetz.length, r.nachRelease, 'die Navigation nach dem Release erreichte das Netz: ' + JSON.stringify(r.navigationenAmNetz));
  assert.ok(r.geliefert && r.geliefert.inhalt === 'schale', 'die Navigation bekam keine Schale aus dem Speicher');
});

test('[SW·Navigation mit Anhang] nichts wird unter einer Adresse mit Abfrageteil abgelegt', async () => {
  const r = await durchspielen(SW_TEXT);
  assert.deepEqual(r.schluessel.filter((s) => new URL(s).search !== ''), []);
});

test('[SW·Navigation mit Anhang·Rot-Beweis] mit dem vollen Vergleich geht die Navigation nach dem Release ans Netz', async () => {
  const ohne = SW_TEXT.replace('istNavigation ? { ignoreSearch: true } : undefined', 'undefined');
  assert.notEqual(ohne, SW_TEXT, 'Rot-Beweis ohne Anker: die Option steht nicht in der erwarteten Form in sw.js');
  const r = await durchspielen(ohne);
  assert.equal(r.navigationenAmNetz.length, r.nachRelease + 1, 'ohne ignoreSearch hätte die Navigation das Netz erreichen müssen');
});

test('[SW·Navigation mit Anhang·Gegenprobe] „als Datei erhalten“ bleibt beim Dienst, auch mit ignoreSearch', async () => {
  const speicher = speicherNachbau();
  const netz = async () => antwort('dienst');
  const sw = swLaden(SW_TEXT, speicher, netz);
  await sw.ereignis('install');
  await sw.ereignis('activate');
  const r = await sw.ereignis('fetch', { request: new NachgebauteAnfrage(BASIS + '?datei=1', 'navigate') });
  assert.equal(r, undefined, 'der Service Worker hat ?datei=1 selbst beantwortet');
});
