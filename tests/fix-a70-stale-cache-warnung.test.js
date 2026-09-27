'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A70 — proaktive Stale-Cache-Warnung im Fuß
   ────────────────────────────────────────────────────────────────────────
   `caches.keys()` beim Fuß-Render lesen, die höchste dort gefundene Schalen-
   Generation (`vivodepot-shell-vNN`) gegen die geladene (`SCHALEN_STAND`)
   halten. Weichen sie ab, hat der Service Worker beim letzten Online-Moment
   (`registration.update()`, braucht Netz) bereits eine neuere Schale
   installiert — `sw.js` legt sie beim `install`-Event an, VOR jeder
   Aktivierung (kein `skipWaiting`), sodass ALT und NEU gleichzeitig in
   `caches.keys()` stehen, solange die neue nur wartet.

   Kern von `_swCacheStandFuellen` (F2 hatte die reine ANZEIGE entfernt,
   nicht wiedererfunden) — jetzt mit einem Vergleich statt einer Anzeige.

   ── ROTMACHBAR ────────────────────────────────────────────────────────────
   Positivkontrolle: eine künstlich höhere Cache-Generation als SCHALEN_STAND
   löst die Warnung aus. Negativkontrollen: Gleichstand und fehlende Cache-API
   lösen sie NICHT aus (letztere auch ohne Absturz). Gegen den Vor-Fix-Stand
   (interaktiv über `KERN_HTML_PATH` auf den letzten Commit vor diesem Zug
   geprüft, nicht als permanente Test-Zeile — die existierte im Vor-Fix-Stand
   nicht und würde sich mit demselben Commit, der sie einführt, selbst
   widersprechen): die geprüfte Funktion existierte nicht — eine Stale-Schale
   konnte unter keinen Umständen eine sichtbare Warnung erzeugen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

function mockCaches(keys) { return { keys: async () => keys }; }
function naechsteGeneration(stand) {
  const n = parseInt(String(stand).replace(/^v/, ''), 10);
  return 'v' + (n + 1);
}

async function bereit(opts) {
  const k = ladeKern(opts);
  await k.V.depotAnlegen(PW);
  k.V.betreteApp();
  return k;
}

test('[A70·Vorprüfung] SCHALEN_STAND hat die erwartete Form (vNN) — sonst prüft der Rest eine falsche Grammatik', () => {
  const { V } = ladeKern();
  assert.match(V.SCHALEN_STAND, /^v\d+$/, 'SCHALEN_STAND: ' + V.SCHALEN_STAND);
});

test('[A70] eine bereits installierte, neuere Schale löst die Warnung im Fuß aus', async () => {
  const stand = ladeKern().V.SCHALEN_STAND;
  const hoeher = naechsteGeneration(stand);
  const k = await bereit({ caches: mockCaches(['vivodepot-shell-' + stand, 'vivodepot-shell-' + hoeher]) });
  k.V.renderFooter();
  await k.V._staleCacheWarnungAnzeigen();
  const html = k.document.getElementById('app-fuss').innerHTML;
  assert.match(html, /ff-stale-warnung/, 'kein Warnungs-Element im Fuß');
  assert.ok(html.includes(k.V.STRINGS.fussStaleCacheWarnung), 'Warntext (final vereinbarter Wortlaut) fehlt');
});

test('[A70·Negativkontrolle] Gleichstand — keine höhere Generation im Cache — zeigt KEINE Warnung', async () => {
  const stand = ladeKern().V.SCHALEN_STAND;
  const k = await bereit({ caches: mockCaches(['vivodepot-shell-' + stand]) });
  k.V.renderFooter();
  await k.V._staleCacheWarnungAnzeigen();
  const html = k.document.getElementById('app-fuss').innerHTML;
  assert.doesNotMatch(html, /ff-stale-warnung/, 'Gleichstand darf keine Warnung zeigen');
});

test('[A70·Negativkontrolle] keine Cache-API (älterer Browser) — keine Warnung, kein Absturz', async () => {
  const { V, document } = await bereit({});   // kein opts.caches -> kein `caches`-Global im Sandkasten
  assert.doesNotThrow(() => V.renderFooter());
  await assert.doesNotReject(V._staleCacheWarnungAnzeigen());
  const html = document.getElementById('app-fuss').innerHTML;
  assert.doesNotMatch(html, /ff-stale-warnung/, 'ohne Cache-API darf keine Warnung stehen');
});

test('[A70] registration.update() schlägt fehl (offline) — die Prüfung bricht trotzdem nicht ab', async () => {
  const stand = ladeKern().V.SCHALEN_STAND;
  const hoeher = naechsteGeneration(stand);
  const k = await bereit({
    caches: mockCaches(['vivodepot-shell-' + stand, 'vivodepot-shell-' + hoeher]),
    navigator: { serviceWorker: { getRegistration: async () => ({ update: async () => { throw new Error('offline'); } }) } },
  });
  const ergebnis = await k.V._staleCacheWarnungPruefen();
  assert.equal(ergebnis, true, 'ein fehlgeschlagenes registration.update() (offline) darf den Cache-Befund nicht verwerfen');
});

test('[A70] ohne Service-Worker-Registrierung (kein registration.update() verfügbar) läuft die Prüfung trotzdem', async () => {
  const stand = ladeKern().V.SCHALEN_STAND;
  const hoeher = naechsteGeneration(stand);
  const k = await bereit({ caches: mockCaches(['vivodepot-shell-' + stand, 'vivodepot-shell-' + hoeher]) });
  // Kein opts.navigator gesetzt — navigator.serviceWorker existiert im Sandkasten nicht.
  const ergebnis = await k.V._staleCacheWarnungPruefen();
  assert.equal(ergebnis, true, 'die Cache-Prüfung allein muss auch ohne Service-Worker-API greifen');
});
