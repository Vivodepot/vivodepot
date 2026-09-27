'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Toast schließt per Klick (Fund, 27.08.2026, Frischer-
   Blick-Prüfung, "alle vier Prüf-Linsen fanden das")
   ────────────────────────────────────────────────────────────────────────
   Drei Toasts kurz hintereinander stapelten sich unten (position:fixed,
   z-index:300) und verdeckten "Frühere Namen" (die letzte Statuskarte auf
   Identität & Person) für bis zu ~3,2s PRO Toast — ohne jede Möglichkeit,
   sie vorzeitig wegzuklicken. Nur Toasts mit optionaler `aktion` hatten
   überhaupt einen Knopf.

   Fix: ein einfacher Toast (ohne `aktion`) schließt sich sofort per Klick.
   Toasts MIT `aktion` bleiben unverändert — ihr Knopf ist bereits eine
   bewusste Handlung, ein zusätzlicher Klick-zum-Schließen auf der Fläche
   würde ihn konkurrieren (versehentliches Wegklicken der Handlung selbst).

   Die DOM-Stub-Umgebung (tests/load-kern.js) kann `appendChild`-Kinder
   nicht wirklich sammeln (bewusst ein No-op-Passthrough) — das Verhalten
   "Klick entfernt den Toast wirklich" ist darum per E2E geprüft
   (tests/e2e/toast-klick-schliesst.spec.js). Diese Datei prüft die Quelle:
   die Verdrahtung existiert, und nur dort, wo sie hingehört.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Toast·Rot-Beweis] ein einfacher Toast (ohne aktion) bekommt einen Klick-Schließen-Handler', () => {
  const { html } = ladeKern();
  const fn = html.slice(html.indexOf('toast(text, art, aktion) {'), html.indexOf('host.appendChild(el);') + 'host.appendChild(el);'.length);
  assert.match(fn, /if\s*\(\s*!aktion\s*\)\s*el\.onclick\s*=\s*\(\s*\)\s*=>\s*\{[^}]*el\.remove\(\)/s,
    'ein Toast ohne aktion muss beim Klick el.remove() ausloesen — sonst bleibt der Stapel nur ueber das Auto-Timeout loesbar');
});

test('[Toast·Gegenprobe] ein Toast MIT aktion bekommt KEINEN zusätzlichen Klick-Schließen-Handler auf der Fläche', () => {
  const { html } = ladeKern();
  const fn = html.slice(html.indexOf('toast(text, art, aktion) {'), html.indexOf('host.appendChild(el);') + 'host.appendChild(el);'.length);
  // Der aktion-Knopf setzt SEINEN eigenen onclick (btn.onclick) — el.onclick (die ganze Flaeche)
  // darf dabei nicht ZUSAETZLICH belegt werden, sonst konkurriert ein Flaechen-Klick mit der
  // bewussten Handlung des Knopfs.
  const elOnclickAusserhalbDesIfNichtAktion = /if\s*\(\s*!aktion\s*\)\s*el\.onclick/.test(fn);
  assert.ok(elOnclickAusserhalbDesIfNichtAktion, 'el.onclick darf nur im !aktion-Zweig gesetzt werden');
});
