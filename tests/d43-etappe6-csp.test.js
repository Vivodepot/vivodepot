'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 6: Content-Security-Policy (vor Service Worker)
   ────────────────────────────────────────────────────────────────────────
   Maschinell prüfbar (Datei-Inspektion): die CSP ist im Kern vorhanden und
   konsistent mit der Lese-App-Vorlage; sie lässt SW-Scope + Manifest zu, hält
   aber connect-src für Inhalte geschlossen (kein Netz-Pfad für Depots/Schlüssel).
   Browser-Verifikation (kein Inline-Bruch, App bootet, Schriften/Icons rendern,
   Sichern/Export laufen) ist ein Geräte-Schritt → siehe Morgen-Bericht.

   NACHTRAG (18.09.2026, „zweite Engine"): `frame-ancestors`
   steht als Wert in der CSP, WIRKT ABER NICHT — die Direktive gilt per Spezifikation
   ausschließlich als echter HTTP-Header, ein `<meta http-equiv="Content-Security-Policy">`
   ignoriert sie (WebKit meldet das inzwischen auf der Konsole, Chromium schweigt dazu —
   derselbe Befund, nur unterschiedlich sichtbar). Gemessen: es gibt HEUTE keinen
   Auslieferungsweg, auf dem der Wert je griffe — weder `file://` (keine Header
   überhaupt) noch die gehostete Fassung unter `pages/` (GitHub Pages, klassische
   Auslieferung ohne eigene Response-Header). Die Zeile 38 unten prüft darum nur noch,
   DASS der Wert steht — nicht, dass er wirkt; die eigene Probe weiter unten hält das
   ausdrücklich fest, damit niemand „kein Framing" als geprüfte Zusage liest. Die
   ~20 E2E-Spezifikationen, die diese Konsolen-Meldung schon vorher als bekannt und
   folgenlos herausfiltern, belegen, dass das Team die Einschränkung für Chromium
   bereits kannte — nur der Filter-Wortlaut passte nicht auf WebKits abweichende
   Formulierung derselben Meldung (in siebzehn Dateien nachgezogen, s. Patch-Kopf).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
function cspAus(datei) {
  const html = fs.readFileSync(path.join(REPO, datei), 'utf8');
  // Der CSP-Wert enthält einfache Anführungszeichen ('none' …) → nur am
  // doppelten Begrenzer schneiden. Meta darf über zwei Zeilen gehen.
  const m = html.match(/http-equiv="Content-Security-Policy"\s*content="([^"]+)"/i);
  return m ? m[1] : null;
}

test('[D43-E6] Kern trägt eine Content-Security-Policy', () => {
  const csp = cspAus('vivodepot.html');
  assert.ok(csp, 'CSP-Meta im Kern vorhanden');
});

test('[D43-E6] CSP-Kern: Inhalte-Netzpfad geschlossen, Marken-Härtung gesetzt', () => {
  const csp = cspAus('vivodepot.html');
  assert.match(csp, /default-src 'none'/, 'default-src none');
  assert.match(csp, /connect-src 'none'/, 'KEIN Netz-Pfad für Inhalte/Depots/Schlüssel (ADR-066)');
  assert.match(csp, /script-src [^;]*'unsafe-inline'/, 'inline-Skripte erlaubt (Single-File)');
  assert.match(csp, /style-src [^;]*'unsafe-inline'/, 'inline-Styles erlaubt');
  assert.match(csp, /font-src [^;]*data:/, 'eingebettete data:-Schriften erlaubt');
  assert.match(csp, /img-src [^;]*data:/, 'eingebettete data:-Bilder erlaubt');
  assert.match(csp, /frame-ancestors 'none'/, 'frame-ancestors steht als Wert — WIRKT NICHT, s. Kopf-Kommentar und eigene Probe unten');
  assert.match(csp, /base-uri 'none'/, 'keine base-uri-Übernahme');
  assert.equal(/'unsafe-eval'/.test(csp), false, 'KEIN unsafe-eval (im Kern nicht nötig)');
});

test('[D43-E6·Nachtrag 18.09.2026] frame-ancestors ist per <meta> strukturell wirkungslos — kein geprüfter Schutz', () => {
  /* Gemessen, nicht vermutet: `frame-ancestors` gilt laut CSP-Spezifikation ausschließlich als
     HTTP-Response-Header; ein `<meta http-equiv="Content-Security-Policy">` liefert ihn nicht,
     Browser ignorieren die Direktive dort (WebKit meldet es auf der Konsole, Chromium schweigt).
     Ausgeliefert wird die Datei heute entweder über `file://` (keine Header möglich) oder über
     `pages/` (GitHub Pages, klassische Auslieferung ohne eigene Response-Header) — auf keinem der
     beiden Wege könnte die Direktive je greifen. Die Zeile bleibt im Markup stehen (harmlos, und
     nutzbar, sollte je ein Header-setzender Ausliefer-Weg hinzukommen), aber KEINE Stelle darf sie
     als geprüften Schutz gegen Einbettung/Clickjacking behaupten. */
  const csp = cspAus('vivodepot.html');
  assert.match(csp, /frame-ancestors 'none'/,
    'die Direktive steht bewusst weiter im Markup (kostet nichts, könnte künftig greifen) — diese Probe hält nur fest, dass sie heute nichts bewirkt');
});

test('[D43-E6] CSP lässt Service-Worker-Scope + Manifest zu (für Etappe 7/8)', () => {
  const csp = cspAus('vivodepot.html');
  assert.match(csp, /worker-src 'self'/, 'Service Worker (self) erlaubt');
  assert.match(csp, /script-src 'self'/, 'SW-Registrierung (self) erlaubt');
  assert.match(csp, /manifest-src [^;]*'self'/, 'Manifest (self) — separate Datei möglich');
  assert.match(csp, /manifest-src [^;]*data:/, 'Manifest (data:) — Inline-Variante möglich');
});

test('[D43-E6] CSP konsistent mit der Lese-App-Vorlage (gemeinsame Härtungs-Linie)', () => {
  const kern = cspAus('vivodepot.html');
  const lesen = cspAus('vivodepot-lesen.html');
  assert.ok(lesen, 'Lese-App-CSP als Vorlage vorhanden');
  // frame-ancestors bleibt in dieser Liste, um den Wert zwischen Kern und Lese-App konsistent zu
  // halten — s. Kopf-Kommentar und die eigene Probe oben: konsistent bedeutet hier „beide tragen
  // denselben wirkungslosen Wert", keine Aussage über eine geprüfte Wirkung.
  for (const direktive of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "frame-ancestors 'none'"]) {
    assert.match(kern, new RegExp(direktive.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')), 'Kern teilt: ' + direktive);
    assert.match(lesen, new RegExp(direktive.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')), 'Lese-App teilt: ' + direktive);
  }
});
