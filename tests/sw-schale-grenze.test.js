'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Service Worker: abgelegt wird nur die App-Schale (Befund SW-SCHALE-GRENZE-OFFEN, 23.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Kopf von sw.js sagt zu, dass ausschließlich die App-Schale abgelegt wird. Bis v1071 entschied ein
   Suffixvergleich, was Schale ist: für den Eintrag './' blieb der leere Text, und jeder Pfad endet auf ihn. So
   wurde jede gleichursprüngliche GET-Antwort abgelegt und danach aus dem Speicher bedient, dazu jede Navigation,
   gleich wohin. Auch ohne den leeren Text war der Vergleich zu weit (/fremd/vivodepot.html), und das Ablegen hing
   nicht am Ereignis.

   Die Probe führt das echte sw.js in einer nachgebauten Umgebung aus (wie tests/sw-navigation-ohne-anhang.test.js)
   und prüft die Klasse: ein beliebiger gleichursprünglicher Pfad, ein ähnlich endender fremder Pfad und eine
   fremde Navigation landen nicht im Speicher; die Schalen-Adressen weiterhin, Navigationen auf sie ohne Anhang.
   Das Ablegen liegt in waitUntil des Ereignisses. Rot-Beweis: dasselbe sw.js mit dem alten Suffixvergleich.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_TEXT = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const HERKUNFT = 'https://app.beispiel.test';
const SCOPE = HERKUNFT + '/privat/';

class NachgebauteAnfrage {
  constructor(url, mode) { this.url = url; this.mode = mode; this.method = 'GET'; }
}
/** Wartet, bis auch ein nicht am Ereignis hängendes put fertig wäre. */
const nachlauf = () => new Promise((r) => setTimeout(r, 30));
const antwort = (inhalt) => ({ ok: true, inhalt, clone() { return this; } });

/** Speicher nach der Cache-API (Schlüssel: volle Adresse, ignoreSearch). put meldet sich erst nach einem Takt fertig. */
function speicherNachbau() {
  const caches = new Map();
  const adresse = (x) => new URL(typeof x === 'string' ? x : x.url, SCOPE).href;
  const ohneAnhang = (a) => { const u = new URL(a); return u.origin + u.pathname; };
  const passt = (k, g, o) => (o && o.ignoreSearch) ? ohneAnhang(k) === ohneAnhang(g) : k === g;
  const cacheObjekt = (eintraege, netz) => ({
    async put(req, a) { await new Promise((r) => setTimeout(r, 5)); eintraege.set(adresse(req), a); },
    async add(url) { const r = await netz(new NachgebauteAnfrage(adresse(url), 'no-cors')); if (r && r.ok) eintraege.set(adresse(url), r); },
    async match(req, o) { const a = adresse(req); for (const [k, v] of eintraege) if (passt(k, a, o)) return v; return undefined; },
  });
  return {
    api(netz) {
      return {
        async open(n) { if (!caches.has(n)) caches.set(n, new Map()); return cacheObjekt(caches.get(n), netz); },
        async keys() { return [...caches.keys()]; },
        async delete(n) { return caches.delete(n); },
        async match(req, o) {
          for (const e of caches.values()) { const t = await cacheObjekt(e, netz).match(req, o); if (t) return t; }
          return undefined;
        },
      };
    },
    alleSchluessel() { return [...caches.values()].flatMap((m) => [...m.keys()]); },
  };
}

/** Lädt sw.js mit Scope /privat/ und gibt die Ereignisse zurück. Ein fetch-Ereignis wartet auf alle waitUntil-Zusagen. */
function swLaden(swText, speicher, netz) {
  const handler = {};
  const self = { location: new URL(SCOPE + 'sw.js'), registration: { scope: SCOPE },
    addEventListener: (typ, fn) => { handler[typ] = fn; }, skipWaiting() {}, clients: { claim: async () => {} } };
  vm.runInNewContext(swText, { self, caches: speicher.api(netz), fetch: netz, URL, Promise, console, setTimeout });
  return {
    async ereignis(typ, extra = {}) {
      const warten = []; let antwortZusage = null; let synchron = true; let spaetesWarten = false;
      handler[typ]({ ...extra, waitUntil: (p) => { if (!synchron) spaetesWarten = true; warten.push(p); },
        respondWith: (p) => { antwortZusage = p; } });
      synchron = false;
      const geliefert = antwortZusage ? await antwortZusage.catch(() => undefined) : undefined;
      await Promise.all(warten.map((p) => Promise.resolve(p).catch(() => undefined)));
      return { geliefert, wartenZahl: warten.length, spaetesWarten };
    },
  };
}

async function abrufe(swText, liste) {
  const speicher = speicherNachbau();
  const netz = async (req) => antwort('netz:' + req.url);
  const sw = swLaden(swText, speicher, netz);
  await sw.ereignis('install');
  await sw.ereignis('activate');
  const vorher = new Set(speicher.alleSchluessel());
  const ergebnisse = [];
  for (const [url, mode] of liste) ergebnisse.push(await sw.ereignis('fetch', { request: new NachgebauteAnfrage(url, mode) }));
  await nachlauf();   // ein Ablegen außerhalb von waitUntil zählt hier auch
  return { neu: speicher.alleSchluessel().filter((k) => !vorher.has(k)), alle: speicher.alleSchluessel(), ergebnisse, sw, speicher };
}

const FREMD = [
  [SCOPE + 'beliebig.json', 'cors'],
  [SCOPE + 'code-listen/geschlecht.json', 'no-cors'],
  [SCOPE + 'fremd/vivodepot.html', 'no-cors'],
  [SCOPE + 'alt-manifest.webmanifest', 'no-cors'],
  [SCOPE + 'kopie-vorabkonfiguration.js', 'no-cors'],
  [SCOPE + 'impressum.html', 'navigate'],
  [SCOPE + 'fremd/vivodepot.html', 'navigate'],
  [HERKUNFT + '/anderes/', 'navigate'],
];

test('[SW·Schalen-Grenze] fremde Pfade und fremde Navigationen landen nicht im Speicher', async () => {
  const r = await abrufe(SW_TEXT, FREMD);
  assert.deepEqual(r.neu, [], 'abgelegt außerhalb der Schale: ' + JSON.stringify(r.neu));
});

test('[SW·Schalen-Grenze] die Schalen-Adressen werden weiter abgelegt, Navigationen ohne Anhang', async () => {
  const speicher = speicherNachbau();
  const sw = swLaden(SW_TEXT, speicher, async (req) => antwort('netz:' + req.url));
  for (const [url, mode] of [[SCOPE + '?von=startseite', 'navigate'], [SCOPE + 'vivodepot.html', 'navigate'],
    [SCOPE + 'manifest.webmanifest', 'no-cors'], [SCOPE + 'vorabkonfiguration.js', 'no-cors']]) {
    await sw.ereignis('fetch', { request: new NachgebauteAnfrage(url, mode) });
  }
  await nachlauf();
  assert.deepEqual(speicher.alleSchluessel().sort(),
    [SCOPE, SCOPE + 'manifest.webmanifest', SCOPE + 'vivodepot.html', SCOPE + 'vorabkonfiguration.js'].sort());
});

test('[SW·Schalen-Grenze] „Anwendung als Datei“ bleibt beim Dienst und wird nicht abgelegt', async () => {
  const r = await abrufe(SW_TEXT, [[SCOPE + 'vivodepot.html?datei=1', 'navigate'], [SCOPE + '?datei=1', 'navigate']]);
  assert.deepEqual(r.neu, []);
});

test('[SW·Schalen-Grenze] ohne Netz bekommt eine Navigation weiter die Schale', async () => {
  const speicher = speicherNachbau();
  let offline = false;
  const sw = swLaden(SW_TEXT, speicher, async (req) => { if (offline) throw new Error('offline'); return antwort('netz:' + req.url); });
  await sw.ereignis('install');
  await sw.ereignis('activate');
  offline = true;
  const r = await sw.ereignis('fetch', { request: new NachgebauteAnfrage(SCOPE + '?von=x', 'navigate') });
  assert.ok(r.geliefert && /vivodepot\.html$|\/privat\/$/.test(r.geliefert.inhalt.replace('netz:', '')), 'keine Schale ohne Netz');
});

test('[SW·Schalen-Grenze] das Ablegen hängt am Ereignis (waitUntil, synchron angemeldet)', async () => {
  const speicher = speicherNachbau();
  const sw = swLaden(SW_TEXT, speicher, async (req) => antwort('netz:' + req.url));
  const r = await sw.ereignis('fetch', { request: new NachgebauteAnfrage(SCOPE + 'vivodepot.html', 'navigate') });
  assert.ok(r.wartenZahl >= 1, 'das fetch-Ereignis meldet kein waitUntil an');
  assert.equal(r.spaetesWarten, false, 'waitUntil erst nach dem Ereignis angemeldet');
  assert.deepEqual(speicher.alleSchluessel(), [SCOPE + 'vivodepot.html'], 'nach dem Ereignis ist die Schale nicht abgelegt');
});

test('[SW·Schalen-Grenze·pages] pages/sw.js hält dieselbe Grenze und meldet das Ablegen am Ereignis an', async () => {
  const PAGES = fs.readFileSync(path.join(__dirname, '..', 'pages', 'sw.js'), 'utf8');
  const r = await abrufe(PAGES, FREMD);
  assert.deepEqual(r.neu, [], 'pages/sw.js legt außerhalb der Schale ab: ' + JSON.stringify(r.neu));
  const speicher = speicherNachbau();
  const sw = swLaden(PAGES, speicher, async (req) => antwort('netz:' + req.url));
  const e = await sw.ereignis('fetch', { request: new NachgebauteAnfrage(SCOPE + 'vivodepot.html', 'navigate') });
  assert.ok(e.wartenZahl >= 1 && !e.spaetesWarten, 'pages/sw.js meldet kein waitUntil synchron an');
  assert.deepEqual(speicher.alleSchluessel(), [SCOPE + 'vivodepot.html']);
});

test('[SW·Schalen-Grenze·Rot-Beweis] mit dem alten Suffixvergleich landet jeder Pfad im Speicher', async () => {
  const anker = /const istSchale = [^;]*;/;
  assert.ok(anker.test(SW_TEXT), 'Rot-Beweis ohne Anker: „const istSchale = …;“ steht nicht in sw.js');
  const alt = SW_TEXT.replace(anker,
    "const istSchale = istNavigation || SCHALE.some((s) => url.pathname.endsWith(s.replace('./', '')));");
  const r = await abrufe(alt, FREMD);
  assert.equal(r.neu.length, new Set(FREMD.map(([u, m]) => m === 'navigate' ? new URL(u).origin + new URL(u).pathname : u)).size,
    'der alte Vergleich hätte jeden fremden Pfad ablegen müssen: ' + JSON.stringify(r.neu));
});
