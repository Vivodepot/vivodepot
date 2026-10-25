'use strict';
/* Wächter: keine HTML-Anwendung liest eine gewählte Datei ein, ohne vorher ihre Größe zu prüfen (Befund
   ANTWORT-DATEI-OHNE-GROESSENGRENZE, 20.10.2026; die Klasse: DATEI-LESEN-OHNE-GROESSENGRENZE). Die Stellen, die das heute noch
   tun, stehen in tools/datei-lesen-ohne-grenze-grundlinie.json; die Liste darf nur kürzer werden. Gefunden werden sie mit
   tools/lib/datei-lesen-stellen.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { alleStellen, stellenIn } = require('../tools/lib/datei-lesen-stellen.js');

const WURZEL = path.join(__dirname, '..');
const GRUNDLINIE = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'datei-lesen-ohne-grenze-grundlinie.json'), 'utf8'));
const schluessel = (s) => s.datei + '\u0000' + s.text;
function zaehlen(liste) { const m = new Map(); for (const s of liste) m.set(schluessel(s), (m.get(schluessel(s)) || 0) + 1); return m; }

test('[Datei-Größe] jede Stelle ohne Größenprüfung steht in der Grundlinie — keine neue', () => {
  const erlaubt = zaehlen(GRUNDLINIE.stellen);
  const ist = zaehlen(alleStellen(WURZEL).filter((s) => !s.mitGrenze));
  const neu = [...ist].filter(([k, n]) => n > (erlaubt.get(k) || 0)).map(([k]) => k.replace('\u0000', ': '));
  assert.deepEqual(neu, [], 'eine gewählte Datei wird ohne Größenprüfung eingelesen — vorher datei.size gegen eine Grenze prüfen');
});

test('[Datei-Größe] die Grundlinie trägt keine behobene Stelle (nur schrumpfend, exakt)', () => {
  const ist = zaehlen(alleStellen(WURZEL).filter((s) => !s.mitGrenze));
  const veraltet = [...zaehlen(GRUNDLINIE.stellen)].filter(([k, n]) => (ist.get(k) || 0) < n).map(([k]) => k.replace('\u0000', ': '));
  assert.deepEqual(veraltet, [], 'behoben — aus tools/datei-lesen-ohne-grenze-grundlinie.json streichen');
});

test('[Datei-Größe] die Antwort im Studio wird mit Größenprüfung gelesen', () => {
  const studio = alleStellen(WURZEL).filter((s) => s.datei === 'vivodepot-studio.html' && /datei\.text\(\); \} catch \(e\) \{ text = ''; \}/.test(s.text));
  assert.equal(studio.length, 1, 'die Lese-Stelle in antwortenOeffnen ist nicht mehr zu finden — Probe nachziehen');
  assert.equal(studio[0].mitGrenze, true);
});

test('[Datei-Größe·Rot-Beweis] der Finder sieht ein Einlesen ohne Grenze und eines mit', () => {
  const ohne = stellenIn('async function f(datei) {\n  const t = await datei.text();\n}');
  const mit = stellenIn('async function f(datei) {\n  if (datei.size > GRENZE_MAX_BYTES) return;\n  const t = await datei.text();\n}');
  const leser = stellenIn('const r = new FileReader();\nr.readAsText(f);');
  assert.equal(ohne.length, 1); assert.equal(ohne[0].mitGrenze, false);
  assert.equal(mit.length, 1); assert.equal(mit[0].mitGrenze, true);
  assert.equal(leser.length, 1); assert.equal(leser[0].mitGrenze, false);
});
