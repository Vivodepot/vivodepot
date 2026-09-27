/* ════════════════════════════════════════════════════════════════════════
   Vivodepot — Service Worker (D43 / U2-ADR-015, Etappe 8)
   ────────────────────────────────────────────────────────────────────────
   Auslieferungs-MECHANIK, KEIN Daten-Pfad. Echte Offline-Fähigkeit der
   gehosteten Mobil-Auslieferung (GitHub Pages).

   HARTE GRENZE:
   • Gecacht wird AUSSCHLIESSLICH die App-Schale: die eine HTML-Datei, das
     Manifest, die Icons (Icons sind inline/data: → reisen mit HTML/Manifest).
   • NIE gecacht: Depot-Daten, IndexedDB-Inhalte, Templates, Bürger-Inhalte.
     Daten leben getrennt in IndexedDB; der SW berührt IndexedDB NICHT.
   • Kein erfundener Netz-Pfad für Inhalte (ADR-066). Der SW lädt keine Inhalte
     aus dem Netz nach — nur die Schale.

   VERSIONS-BUMP: Cache-Name trägt ein Versions-Suffix. `activate` löscht alle
   alten `vivodepot-shell-*`-Caches → sauberer Schnitt. Ein neuer SW erneuert NUR
   die Schale; IndexedDB bleibt unberührt (Daten liegen außerhalb jedes Caches).
   Schema-Migrationen der Daten laufen separat über IndexedDB-onupgradeneeded.
   ════════════════════════════════════════════════════════════════════════ */
'use strict';

// Cache-Name mit Versions-Suffix. Bei jedem Schalen-Update HOCHZÄHLEN: ohne neuen Namen erreicht eine schon
// installierte App die neue Schale nie (cache-first). Der Suffix läuft mit SCHALEN_STAND in vivodepot.html
// gleich (tests/schalen-stand-sw-lockstep.test.js); was eine Fassung geändert hat, steht dort am SCHALEN_STAND
// und in der Versionsgeschichte des Repositorys.
// v804 (26.09.2026): Demos mit Handsteuerung — die Vorführung schaltet auf Wunsch Schritt für Schritt, auch über die Lese-App.
// v805 (26.09.2026): Listen-Unterfelder folgen beim Herausgeben der Entscheidung der Person — abgewählt bleibt zurück, freigegeben geht mit.
const CACHE = 'vivodepot-shell-v806';

// Die App-Schale. Einzeln & tolerant gecacht (fehlende Einträge brechen den
// Install NICHT — z. B. wenn die Manifest-Entscheidung „inline" lautet und es
// keine separate manifest.webmanifest gibt).
const SCHALE = [
  './',
  './vivodepot.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(SCHALE.map((url) => cache.add(url).catch(() => undefined)))
    )
  );
  // KEIN automatisches skipWaiting — der Schalen-Wechsel ist ein bewusster Schnitt
  // (kein Datenbruch; IndexedDB bleibt ohnehin unberührt). Aktivierung über activate.
  // U2-ADR-190: die einzige Ausnahme läuft über den `message`-Handler unten, NIE von hier aus.
});

// U2-ADR-190 (2026-09-01) — bedingte Aktivierung: der Worker selbst kennt weder offene Tabs noch
// ungesicherte Änderungen — er gehorcht nur. Die Seite (kennt `_ungespeicherteAenderungen`,
// vivodepot.html) entscheidet, WANN diese Nachricht überhaupt gesendet wird; hier wird sie nur
// noch ausgeführt. Kein anderer Aufrufer als die Seite selbst — nichts im Netz/Cache-Pfad sendet
// diese Nachricht. Berührt weder Cache- noch IndexedDB-Logik.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(
      namen
        .filter((n) => n !== CACHE && n.indexOf('vivodepot-shell-') === 0)
        .map((n) => caches.delete(n))   // alte Schalen-Versionen sauber entfernen
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // nur GET (Schale)
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;        // NIE fremde Origins

  e.respondWith((async () => {
    // Cache-first für die Schale.
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      // Nur same-origin-Schale nachcachen (Navigation oder gelistete Schalen-URL).
      // KEIN Daten-Caching — IndexedDB ist strikt getrennt und wird nie berührt.
      const istSchale = req.mode === 'navigate'
        || SCHALE.some((s) => url.pathname.endsWith(s.replace('./', '')));
      if (net && net.ok && istSchale) {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (err) {
      // Offline + nicht im Cache: für Navigationen die Schale ausliefern.
      if (req.mode === 'navigate') {
        const schale = (await caches.match('./vivodepot.html'))
                    || (await caches.match('./'));
        if (schale) return schale;
      }
      throw err;
    }
  })());
});
