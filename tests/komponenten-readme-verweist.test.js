'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jede Komponenten-README zeigt auf ihre Datei — oder sagt, wo sie ist (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund auf OpenCoDE: unter docs/lese-app lag nur die README, die App nannte
   sie allein in Backticks — wer den Ordner öffnete, fand keine App. Die
   Anwendungen liegen im Hauptverzeichnis. Regel:
     - eine öffentliche Komponente: ihre README verlinkt die Datei relativ
       (`](../../<datei>)`), und die Datei existiert;
     - eine Komponente, die nicht im öffentlichen Stand liegt: ihre README sagt
       das offen und verlinkt nicht ins Leere.
   ROT-BEWEIS: die Lese-App-README vom 26.09.2026 (nur Backticks) fällt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KOMPONENTEN = [
  { readme: 'docs/lese-app/README.md', datei: 'vivodepot-lesen.html', oeffentlich: true },
  { readme: 'docs/vc-issuer/README.md', datei: 'vivodepot-vc-issuer.html', oeffentlich: true },
  { readme: 'docs/template-generator/README.md', datei: 'vivodepot-template-generator.html', oeffentlich: false },
];

function befund(k, text, dateiDa) {
  const link = text.includes('](../../' + k.datei + ')');
  if (k.oeffentlich) {
    if (!link) return k.readme + ': verlinkt ' + k.datei + ' nicht';
    if (!dateiDa) return k.readme + ': verlinkt ' + k.datei + ', die Datei fehlt';
    return null;
  }
  if (link) return k.readme + ': verlinkt ' + k.datei + ', die im öffentlichen Stand fehlt';
  if (!/nicht enthalten|nicht im öffentlichen/i.test(text)) return k.readme + ': sagt nicht, wo ' + k.datei + ' zu finden ist';
  return null;
}

test('[Komponenten-README] jede README verlinkt ihre Datei oder sagt, dass sie nicht öffentlich ist', () => {
  const funde = KOMPONENTEN.map((k) => befund(k, fs.readFileSync(path.join(REPO, k.readme), 'utf8'), fs.existsSync(path.join(REPO, k.datei))))
    .filter(Boolean);
  assert.deepEqual(funde, []);
});

test('[Komponenten-README·Rot-Beweis] die Lese-App-README vom 26.09.2026 und ein Link ins Leere fallen', () => {
  const alt = '# Vivodepot — Lese-Ansicht (`vivodepot-lesen.html`)\n\nÖffnen Sie die Datei `vivodepot-lesen.html` in Ihrem Browser.';
  assert.match(befund(KOMPONENTEN[0], alt, true), /verlinkt vivodepot-lesen.html nicht/);
  assert.match(befund(KOMPONENTEN[2], '[x](../../vivodepot-template-generator.html)', false), /fehlt/);
});
