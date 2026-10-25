'use strict';
/* Welche Safari-Signale Playwright-WebKit liefert, hängt vom Betriebssystem ab (21.10.2026).
   GEMESSEN im öffentlichen Workflow (ubuntu-latest, Lauf vom 20.10.2026, iPhone-Profil): CSS.supports mit dem
   Systemschrift-Schlüsselwort ist false, navigator.standalone fehlt. Auf macOS liefert WebKit beides (gemessen 11.10.2026).
   Unter Linux erkennt der Kern darum kein Safari, und die Safari-Wege kommen in WebKit nicht zustande. Eine Spec, die
   Safari-Werte in WebKit prüft, fragt hier, ob sie sie erwarten darf. Auf macOS läuft sie voll; nur ohne diese
   Signale lässt sie die Safari-Wege aus. Die Wege selbst hält dort die Chromium-Probe mit nachgestellten Signalen. */

function safariSignaleVomWebkit(plattform = process.platform) {
  return plattform === 'darwin';
}

const GRUND_OHNE_SAFARI_SIGNALE = 'Safari-Signale liefert nur WebKit auf macOS; die Wege prüft die Chromium-Probe mit nachgestellten Signalen';

module.exports = { safariSignaleVomWebkit, GRUND_OHNE_SAFARI_SIGNALE };
