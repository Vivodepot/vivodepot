/* ════════════════════════════════════════════════════════════════════════
   Vivodepot — Service Worker (D43 / U2-ADR-015, Etappe 8)
   ────────────────────────────────────────────────────────────────────────
   Auslieferungs-MECHANIK, KEIN Daten-Pfad. Echte Offline-Fähigkeit der
   gehosteten Mobil-Auslieferung (GitHub Pages).

   HARTE GRENZE:
   • Gecacht wird AUSSCHLIESSLICH die App-Schale: die eine HTML-Datei, das
     Manifest, die Icons (Icons sind inline/data: → reisen mit HTML/Manifest),
     und bei einer Modul-App die Begleitdatei `vorabkonfiguration.js`.
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
// v894 (03.10.2026): das Gerüst trägt keinen Gestaltungswert — Stylesheet und Werte kommen als Erscheinungsbild-Modul.
const CACHE = 'vivodepot-shell-v929';

// Die App-Schale. Einzeln & tolerant gecacht (fehlende Einträge brechen den
// Install NICHT — z. B. wenn die Manifest-Entscheidung „inline" lautet und es
// keine separate manifest.webmanifest gibt).
const SCHALE = [
  './',
  './vivodepot.html',
  './manifest.webmanifest',
  /* Modul-App (Weg B, U2-ADR-182): die Begleitdatei mit Sprache, Branding und signierten Modulen gehört zur Schale.
     Der Kern lädt sie beim Booten, bevor ein Service Worker die Seite bedient (Anmeldung erst bei `load`); ohne diesen
     Eintrag fehlte sie nach dem ersten Besuch ohne Netz. Produkte backen die Konfiguration ein und tragen die Datei
     nicht: der Eintrag fällt dort bei der Installation still weg (cache.add(…).catch). Klassenwächter:
     tests/schale-traegt-nachgeladene-dateien.test.js; Probe: tests/e2e/modul-app-vorabkonfiguration-offline.spec.js. */
  './vorabkonfiguration.js',
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

/* „Anwendung als Datei erhalten“ (12.10.2026): der Schalter `?datei=1` gehört dem Dienst. Er liefert
   die geltende Fassung als Anhang, mit der Fassung im Dateinamen. Der Service Worker antwortet darauf
   NICHT: er legt die Antwort nicht ab, gibt keine frühere zurück und setzt ohne Netz nicht die
   gespeicherte Schale an ihre Stelle. Sonst trüge eine abgelegte Fassung den Namen der geltenden.
   Probe: tests/e2e/anwendung-als-datei-immer-vom-dienst.spec.js. */
function istAnwendungAlsDatei(url) {
  return url.searchParams.get('datei') === '1';
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // nur GET (Schale)
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;        // NIE fremde Origins
  if (istAnwendungAlsDatei(url)) return;                  // „Anwendung als Datei“: immer der Dienst, s. u.

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
