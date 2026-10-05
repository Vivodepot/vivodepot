'use strict';
/* ════════════════════════════════════════════════════════════════════════
   share-abholseite-csp.test.js — die CSP der Abhol-Seite, wie sie heute ist, festgehalten (04.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund ABHOLSEITE-CONNECT-SRC-OFFEN (02.10.2026): die Abhol-Seite (share/empfangen.html) muss SMART Health Links von
   beliebigen Servern holen und trägt darum `connect-src https:`. Was den Abfluss entschlüsselter Daten heute verhindert, ist
   der übrige Rand: nur eigene Skripte, kein Inline-Skript, genau das erwartete Skript. Diese Probe hält ihn fest — enger als
   tests/shl-abholseite.test.js: `script-src` ist GENAU 'self' (kein weiterer Ursprung daneben), die Seite lädt GENAU
   empfangen.js. Die Härtung (Netz zu nach dem Abruf) ist die Abnahme des Befunds und kommt mit eigener Messung je Browser.
   Rot-Beweise: ein Inline-Skript, 'unsafe-inline', ein zweites Skript, ein fremder Ursprung in script-src.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SEITE = path.join(__dirname, '..', 'share', 'empfangen.html');
const ERWARTETE_SKRIPTE = Object.freeze(['empfangen.js']);

function cspVon(html) {
  const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  if (!m) return null;
  const d = {};
  for (const teil of m[1].split(';')) {
    const [name, ...werte] = teil.trim().split(/\s+/);
    if (name) d[name] = werte;
  }
  return d;
}

function befunde(html) {
  const b = [];
  const csp = cspVon(html);
  if (!csp) return ['keine CSP'];
  if (JSON.stringify(csp['script-src']) !== JSON.stringify(["'self'"])) b.push("script-src ist nicht genau 'self': " + (csp['script-src'] || []).join(' '));
  if (JSON.stringify(csp['default-src']) !== JSON.stringify(["'none'"])) b.push("default-src ist nicht 'none'");
  for (const [name, werte] of Object.entries(csp)) {
    for (const w of werte) if (/^'unsafe-|^'wasm-unsafe-eval'$/.test(w)) b.push(name + ' trägt ' + w);
  }
  const skripte = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  for (const [, attr, rumpf] of skripte) {
    const src = (attr.match(/\ssrc="([^"]+)"/) || [])[1];
    if (!src) b.push('Inline-Skript ohne src');
    else if (rumpf.trim()) b.push('Skript ' + src + ' mit Rumpf');
  }
  const quellen = skripte.map(([, attr]) => (attr.match(/\ssrc="([^"]+)"/) || [])[1]).filter(Boolean);
  if (JSON.stringify(quellen) !== JSON.stringify(ERWARTETE_SKRIPTE)) b.push('Skripte der Seite: ' + quellen.join(', ') + ' statt genau ' + ERWARTETE_SKRIPTE.join(', '));
  return b;
}

test('[Abhol-Seite·CSP] nur eigene Skripte, genau das erwartete, kein Inline-Code, nichts unsafe — der Rand um connect-src https:', () => {
  const html = fs.readFileSync(SEITE, 'utf8');
  assert.deepEqual(befunde(html), []);
  assert.deepEqual(cspVon(html)['connect-src'], ['https:'], 'Stand des offenen Befunds: connect-src https: (die Härtung ändert diese Zeile mit)');
});

test('[Abhol-Seite·CSP·Rot-Beweis] Inline-Skript, unsafe-inline, ein zweites Skript und ein fremder Ursprung fallen auf', () => {
  const html = fs.readFileSync(SEITE, 'utf8');
  assert.ok(befunde(html.replace('</body>', '<script>fetch("https://x.example")</script></body>')).includes('Inline-Skript ohne src'));
  assert.ok(befunde(html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")).some((x) => /unsafe-inline/.test(x)));
  assert.ok(befunde(html.replace('</body>', '<script src="weiteres.js"></script></body>')).some((x) => /statt genau empfangen\.js/.test(x)));
  assert.ok(befunde(html.replace("script-src 'self'", "script-src 'self' https://cdn.example")).some((x) => /nicht genau 'self'/.test(x)));
});
