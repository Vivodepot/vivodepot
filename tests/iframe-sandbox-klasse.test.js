'use strict';
/* Jeder Rahmen im Kern trägt `sandbox` (15.10.2026, Abgleich mit dem W3C-Entwurf VC Render Method Threat Model, T2 „Unsafe
   Rendering of Untrusted Data“). Die PDF-Vorschau lud eine `blob:`-Adresse gleicher Herkunft in einen Rahmen ohne `sandbox`;
   ein Dokument darin hätte dieselben Rechte wie die Anwendung. Die Klasse: jedes `<iframe` in einer Zeichenkette und jedes
   `createElement('iframe')` in der Anwendung oder der Lese-App nennt `sandbox`. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];

function rahmenOhneSandbox(text, name) {
  const raus = [];
  text.split('\n').forEach((z, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
    for (const m of z.matchAll(/['"`]<iframe\b[^'"`]*/g)) if (!/\bsandbox\b/.test(m[0])) raus.push(name + ':' + (i + 1));
    if (/createElement\(\s*['"]iframe['"]\s*\)/.test(z)) {
      const umgebung = text.split('\n').slice(i, i + 4).join('\n');
      if (!/\bsandbox\b/.test(umgebung)) raus.push(name + ':' + (i + 1));
    }
  });
  return raus;
}

test('[Rahmen·sandbox] jeder Rahmen in Anwendung und Lese-App trägt sandbox', () => {
  const funde = [];
  let gelesen = 0;
  for (const d of DATEIEN) {
    const text = fs.readFileSync(path.join(__dirname, '..', d), 'utf8');
    if (text.length > 10000) gelesen++;
    funde.push(...rahmenOhneSandbox(text, d));
  }
  assert.equal(gelesen, DATEIEN.length, 'Vorbedingung: beide Dateien werden gelesen');   // seit 15.10.2026 hat der Kern keinen Rahmen mehr
  assert.deepEqual(funde, []);
});

test('[Rahmen·sandbox·Rot-Beweis] ein Rahmen ohne sandbox, als Zeichenkette und als createElement, fällt auf', () => {
  const ohne = "x = '<iframe class=\"v\" src=\"' + u + '\"></iframe>';\nconst f = document.createElement('iframe');\nf.src = u;\n";
  assert.deepEqual(rahmenOhneSandbox(ohne, 'f'), ['f:1', 'f:2']);
  const mit = "x = '<iframe sandbox class=\"v\"></iframe>';\nconst f = document.createElement('iframe');\nf.setAttribute('sandbox', '');\n";
  assert.deepEqual(rahmenOhneSandbox(mit, 'f'), []);
});
