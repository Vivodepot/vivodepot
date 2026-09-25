'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   background.js — Vivodepot-Firefox-Erweiterung, Vervielfachungs-Fix
   ────────────────────────────────────────────────────────────────────────────
   BEFUND (Entscheidungsvorlage 24.08.2026, entschieden 24.08.2026, Option A):
   Firefox unterstützt die File System Access API nie (Mozilla, Position
   „negative" seit 2019) — vivodepot.html (`dateiAusgeben`/`_depotBlobSpeichern`)
   fällt darum auf einen klassischen `<a download>`-Anker mit stabilem, wieder-
   verwendetem Dateinamen zurück. JEDE Wiederholung desselben Downloads hängt
   Firefox von sich aus „(1)", „(2)", … an den Namen — rein im browsereigenen
   Downloadmanager, die Seite hat darauf keinen Einfluss.

   DIESE ERWEITERUNG BRAUCHT KEINE ÄNDERUNG AN vivodepot.html: sie hört auf
   JEDEN Download über `downloads.onDeterminingFilename` und erzwingt für
   Dateien, deren Name auf `.vivodepot` endet, `conflictAction: 'overwrite'`
   statt der browsereigenen Vervielfachung. Sie ändert nichts an „Ja,
   angekommen" und nichts am Speicherverhalten in Chromium/Safari (dort greift
   sie gar nicht, weil dort ohnehin showSaveFilePicker bzw. Web Share läuft).

   PRÜFBARE REINE FUNKTION: `entscheideUeberDownload(downloadItem)` trifft die
   Entscheidung, `wireListener()` verdrahtet sie an die echte `downloads`-API —
   getrennt, damit die Entscheidung ohne Firefox-Laufzeit testbar ist
   (tests/firefox-erweiterung-download-entscheidung.test.js).
   ════════════════════════════════════════════════════════════════════════════ */

// Endet der vorgeschlagene Dateiname auf `.vivodepot` (Groß-/Kleinschreibung
// unerheblich — Firefox reicht den Namen unverändert durch, ein Depot könnte
// theoretisch mit Großbuchstaben umbenannt worden sein)? Dann: überschreiben
// statt vervielfachen. Sonst: keine Meinung — `null` heißt „nicht zuständig",
// nicht „ablehnen"; ein anderer Listener oder Firefox selbst entscheidet dann.
function entscheideUeberDownload(downloadItem) {
  const name = downloadItem && typeof downloadItem.filename === 'string' ? downloadItem.filename : '';
  if (!name.toLowerCase().endsWith('.vivodepot')) return null;
  return { filename: name, conflictAction: 'overwrite' };
}

function wireListener(downloadsApi) {
  downloadsApi.onDeterminingFilename.addListener((downloadItem, suggest) => {
    const entscheidung = entscheideUeberDownload(downloadItem);
    suggest(entscheidung || undefined);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { entscheideUeberDownload, wireListener };
}
// Echte Firefox-Laufzeit (kein Node, kein `module`): sofort verdrahten.
if (typeof module === 'undefined' && typeof browser !== 'undefined' && browser.downloads) {
  wireListener(browser.downloads);
}
