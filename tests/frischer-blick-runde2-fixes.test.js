'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Frischer-Blick Runde 2 (27./28.08.2026): fünf Funde
   ────────────────────────────────────────────────────────────────────────
   1. Toast lag über dem Modal-Layer (z-index 300 > 200) — bei einem
      sicherheitsrelevanten Export-Dialog (Blackbox-Export) legten sich bis
      zu 6 Toasts über "Abbrechen"/"Verschlüsselte Datei exportieren".
      Klick-zum-Schließen (Nachtrag 27.08.2026) mildert es, behebt aber
      nicht die LAGE — ein Toast sollte nie über einem Dialog liegen, den
      die Bürgerin gerade entscheiden muss.
   2. Mobile-Nav-Review (neu, noch nicht weitergegeben): bei offenem Drawer
      (.sidebar, Off-canvas-Menü) blieb die Bottom-Tab-Bar (z-index 150)
      über dem Drawer (z-index 90) UND seinem Backdrop (z-index 80) liegen
      — klickbar, doppelte Navigation gleichzeitig aktiv.
   3. Toast über Bottom-Tab-Bar: BEWUSST NICHT per z-Index geändert — ein am
      unteren Rand verankerter Toast, der kurz die Bottom-Nav überdeckt, ist
      dasselbe Muster wie Material-/iOS-Snackbars; der Klick-zum-Schließen-
      Fix deckt den eigentlichen Fund (keine Wegwisch-Möglichkeit) bereits
      ab. Kein Test hier — bewusste Abgrenzung, im Bericht
      benannt.
   4. pflwiz-Abschluss-Toast nannte "Gesundheit" als Ziel, obwohl kein
      Schritt mehr dorthin schreibt (Ziel ist seit U2-ADR-018/019
      'sozialversicherung', s. Kommentar an PFLWIZ selbst) — vierfach
      unabhängig bestätigt.
   5. subDepotAnlegen-Erfolgstoast sagte "Depot eingehängt und versiegelt" —
      "eingehängt" ist im Produkt fest für den Import einer FREMDEN
      Blackbox-Datei reserviert (s. einhaengenFertig), hier aber eine
      Neuanlage.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function zIndexVon(html, selektor) {
  const i = html.indexOf(selektor);
  assert.ok(i > -1, selektor + ' nicht gefunden');
  const block = html.slice(i, html.indexOf('}', i) + 1);
  const m = block.match(/z-index:\s*(\d+)/);
  assert.ok(m, selektor + ' hat keine z-index-Angabe');
  return Number(m[1]);
}

test('[Runde2·Fund1] #toast-host liegt UNTER #modal-rueck (z-index), nicht darüber', () => {
  const { html } = ladeKern();
  const toast = zIndexVon(html, '#toast-host {');
  const modal = zIndexVon(html, '#modal-rueck {');
  assert.ok(toast < modal, 'toast-host (' + toast + ') muss unter modal-rueck (' + modal + ') liegen — sonst verdeckt ein Toast einen offenen Dialog');
});

test('[Runde2·Fund2] .sidebar (Off-canvas-Drawer) liegt ÜBER .bottom-tabs (mobile)', () => {
  const { html } = ladeKern();
  const sidebar = zIndexVon(html, '#app .sidebar {');
  const bottomTabs = zIndexVon(html, 'display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index:');
  assert.ok(sidebar > bottomTabs, '.sidebar (' + sidebar + ') muss über .bottom-tabs (' + bottomTabs + ') liegen — sonst bleibt die Tab-Bar bei offenem Drawer klickbar');
});

test('[Runde2·Fund2] .menue-backdrop (Scrim hinter dem Drawer) liegt ebenfalls ÜBER .bottom-tabs', () => {
  const { html } = ladeKern();
  const backdrop = zIndexVon(html, 'display: block; position: fixed; inset: 48px 0 0 0;');
  const bottomTabs = zIndexVon(html, 'display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index:');
  assert.ok(backdrop > bottomTabs, 'der Scrim muss die Tab-Bar mit abdunkeln/blockieren, sonst bleibt sie als einziges Element unverdeckt bedienbar');
});

test('[Runde2·Fund2·Gegenprobe] .menue-backdrop bleibt UNTER .sidebar (bestehende Reihenfolge unverändert)', () => {
  const { html } = ladeKern();
  const backdrop = zIndexVon(html, 'display: block; position: fixed; inset: 48px 0 0 0;');
  const sidebar = zIndexVon(html, '#app .sidebar {');
  assert.ok(backdrop < sidebar, 'der Scrim liegt weiterhin hinter dem Drawer selbst');
});

test('[Runde2·Fund4] pflwiz-Abschluss-Toast nennt Sozialversicherung, nicht Gesundheit', () => {
  const { V } = ladeKern();
  const zeile = V.TEXTSATZ_DE_QUELLE.texte['wizard:pflwiz.abschluss.toast'];   // seit S8 im Sprachmodul, nicht im Kern-Quelltext
  assert.ok(typeof zeile === 'string', 'der Wortlaut-Schlüssel fehlt');
  assert.match(zeile, /Sozialversicherung/, 'der reale Landeplatz (pflwiz.ziel) ist sozialversicherung, nicht gesundheit');
  assert.doesNotMatch(zeile, /Gesundheit/, 'kein pflwiz-Schritt schreibt mehr nach gesundheit (s. Kommentar an PFLWIZ)');
});

test('[Runde2·Fund5] subAngelegt-Toast sagt "angelegt", nicht "eingehängt" — das Wort bleibt dem Blackbox-Import vorbehalten', () => {
  const { V } = ladeKern();
  const zeile = V.TEXTSATZ_DE_QUELLE.texte['strings:subAngelegt.text'];   // seit S8 im Sprachmodul, nicht im Kern-Quelltext
  assert.ok(typeof zeile === 'string');
  assert.doesNotMatch(zeile, /eingehängt/, '"eingehängt" ist für den Import einer fremden Blackbox-Datei reserviert (s. einhaengenFertig)');
  assert.match(zeile, /angelegt/, 'subDepotAnlegen ist eine Neuanlage, kein Import');
});
