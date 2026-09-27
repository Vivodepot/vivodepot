'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 8: Service Worker (Auslieferungs-Mechanik)
   ────────────────────────────────────────────────────────────────────────
   Maschinell prüfbar (Quell-Inspektion + Gating-Logik):
   (a) sw.js existiert, cached NUR die Schale (versionierter Cache-Name), löscht
       alte Versionen in activate, hat einen fetch-Handler, fasst NIE Daten an
       (kein IndexedDB/Depot-Bezug im SW).
   (b) Die Registrierung ist capability-detektiert: gehostet ja, file:// nein,
       ohne navigator.serviceWorker.register nein.
   Die echte Install-/Offline-Prüfung am Gerät bleibt iPhone-Schritt → Morgen-Bericht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const REPO = path.join(__dirname, '..');
const SW = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');

test('[D43-E8] sw.js: versionierter Schalen-Cache, activate räumt alte, fetch-Handler', () => {
  assert.match(SW, /vivodepot-shell-v\d+/, 'versionierter Cache-Name');
  assert.match(SW, /addEventListener\(['"]install['"]/, 'install-Handler');
  assert.match(SW, /addEventListener\(['"]activate['"]/, 'activate-Handler');
  assert.match(SW, /addEventListener\(['"]fetch['"]/, 'fetch-Handler');
  assert.match(SW, /caches\.delete/, 'löscht alte Cache-Versionen');
  assert.match(SW, /clients\.claim/, 'übernimmt offene Clients');
});

test('[D43-E8] sw.js cached NUR die Schale, NIE Daten (IndexedDB unberührt)', () => {
  // Der SW darf IndexedDB / Depot-Daten nicht anfassen.
  assert.equal(/indexedDB|IDBDatabase|VdStore|depotSerialisieren/.test(SW), false,
    'SW berührt IndexedDB / Depot-Daten NICHT');
  // Schale ist HTML + Manifest (Icons inline) — keine Daten-URLs gelistet.
  assert.match(SW, /vivodepot\.html/, 'HTML-Schale gelistet');
  assert.match(SW, /manifest\.webmanifest/, 'Manifest in der Schale');
  // Nur same-origin (keine fremden Origins nachladen).
  assert.match(SW, /url\.origin\s*!==\s*self\.location\.origin/, 'fremde Origins ausgeschlossen');
});

test('[D43-E8] Registrierung capability-detektiert: gehostet ja, file:// nein', () => {
  const reg = async () => {};
  // Gehostet + register vorhanden → erlaubt.
  const h = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://e/x' }, navigator: { serviceWorker: { register: reg } } });
  assert.equal(h.V._swRegistrierenErlaubt(), true, 'gehostet + register → erlaubt');
  // file:// → nie (Desktop-Datei-Modus ohne SW).
  const f = ladeKern({ location: { protocol: 'file:', href: 'file:///x' }, navigator: { serviceWorker: { register: reg } } });
  assert.equal(f.V._swRegistrierenErlaubt(), false, 'file:// → kein SW');
  // Kein serviceWorker → nie.
  const n = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://e/x' }, navigator: {} });
  assert.equal(n.V._swRegistrierenErlaubt(), false, 'ohne serviceWorker → kein SW');
  // Node-Default (kein navigator) → nie.
  const d = ladeKern();
  assert.equal(d.V._swRegistrierenErlaubt(), false, 'kein navigator → kein SW');
});

test('[D43-E8·Rot-Beweis] AB_WERK_SERVICE_WORKER_VORHANDEN=false unterdrückt die Registrierung — kein 404-Versuch (Auftrag 12.09.2026)', () => {
  const reg = async () => {};
  const k = ladeKern({
    indexedDB: createIdbMock(),
    location: { protocol: 'https:', href: 'https://e/x' },
    navigator: { serviceWorker: { register: reg } },
    abWerkServiceWorkerVorhanden: false,
  });
  assert.equal(k.V._swRegistrierenErlaubt(), false,
    'ein Dateisatz ohne sw.js darf nie registrieren — sonst derselbe 404 wie beim echten Fund');
});

test('[D43-E8·Gegenprobe] AB_WERK_SERVICE_WORKER_VORHANDEN=true/undefined lässt die Registrierung unverändert zu (die gehostete Fassung verliert nichts)', () => {
  const reg = async () => {};
  const mitTrue = ladeKern({
    indexedDB: createIdbMock(),
    location: { protocol: 'https:', href: 'https://e/x' },
    navigator: { serviceWorker: { register: reg } },
    abWerkServiceWorkerVorhanden: true,
  });
  assert.equal(mitTrue.V._swRegistrierenErlaubt(), true, 'true → weiterhin erlaubt');
  const ohneFlag = ladeKern({
    indexedDB: createIdbMock(),
    location: { protocol: 'https:', href: 'https://e/x' },
    navigator: { serviceWorker: { register: reg } },
  });
  assert.equal(ohneFlag.V._swRegistrierenErlaubt(), true,
    'ungebacken (Bestandsschutz) → alter Weg gilt unverändert, wie vor diesem Bau');
});

test('[D43-E8] Kern registriert sw.js (gated) — Registrierungs-Aufruf vorhanden', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.match(html, /navigator\.serviceWorker\.register\(['"]sw\.js['"]\)/, 'register(sw.js) im Kern');
  assert.match(html, /serviceWorkerRegistrieren\(\)/, 'Registrierung aufgerufen');
});
