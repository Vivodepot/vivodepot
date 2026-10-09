'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Vorführung „Kleingartenverein“: die Quellen liegen im Repo und bauen (06.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund DEMO-QUELLEN-FEHLEN: die Kleingarten-Demo stand nur als gebackene Datei auf der Website; ihre Beispieldaten lagen
   außerhalb des Repos, und jede neue Kern-Fassung lief an ihr vorbei. Der Kleingarten ist nach
   tools/vorfuehrung/kleingarten/ überführt — mit den drei Notiz-Texten, die der Kern seit v843 verlangt, und der englischen
   Übersetzung jeder Freitext-Stelle des Kleingarten-Depots, die der Erzeuger für einen englischen Bau verlangt.
   Die Klasse: jeder Vorführungs-Ordner unter tools/vorfuehrung/ baut auf dem erzeugten Produkt. Ein Ordner, dessen Quelle
   nicht baut, ist rot — er läge sonst wie eine Demo im Repo und wäre keine.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WERKZEUG = require('../tools/vorfuehrung-showcase-erzeugen.js');
const PRODUKT = require('./produkt-html-erzeugen.js');

const VORFUEHRUNG = path.join(__dirname, '..', 'tools', 'vorfuehrung');
const lesen = (name, datei) => JSON.parse(fs.readFileSync(path.join(VORFUEHRUNG, name, datei), 'utf8'));
const _kern = {};
const V = (slug) => (_kern[slug] || (_kern[slug] = PRODUKT.kernAus(PRODUKT.produktHtml(slug)).V));
const bauen = (name, slug, sprache, depot = lesen(name, 'showcase-depot.json'), szenen = lesen(name, 'showcase-szenen.json')) =>
  WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache, daten: depot, szenen, V: V(slug), dokumentOrdner: path.join(VORFUEHRUNG, name) });

// Welches Produkt eine Vorführung trägt: Pro-Bereiche brauchen das Pro-Produkt.
function produktFuer(name) {
  const szenen = lesen(name, 'showcase-szenen.json');
  return szenen.stationen.some((s) => /^pro-/.test(String(s.ziel || ''))) ? 'pro' : 'privat';
}

test('[Vorführung·Kleingarten] baut auf Deutsch und Englisch; jede Station steht, die Notiz spricht beide Sprachen', () => {
  for (const [slug, sprache] of [['privat-de', 'de'], ['privat-en', 'en']]) {
    const n = bauen('kleingarten', slug, sprache);
    assert.equal(n.stationen.length, 4, sprache);
    assert.ok(n.texte.notizLabel && n.texte.mehr && n.texte.weniger, sprache + ': Notiz-Texte');
  }
  assert.equal(lesen('kleingarten', 'showcase-szenen.json').noindex, true, 'die Demo-Datei trägt noindex');
});

test('[Vorführung·Kleingarten·Rot-Beweis] ohne englische Übersetzung des Depots baut die englische Fassung nicht', () => {
  const depot = lesen('kleingarten', 'showcase-depot.json');
  delete depot.uebersetzung;
  assert.throws(() => bauen('kleingarten', 'privat-en', 'en', depot));
});

test('[Vorführung·Quellen·Rot-Beweis] eine Station auf einem Bereich, den der Kern nicht kennt, bricht den Bau ab', () => {
  const szenen = lesen('kleingarten', 'showcase-szenen.json');
  szenen.stationen.find((s) => s.ansicht === 'bereich').ziel = 'gibt-es-nicht';
  assert.throws(() => bauen('kleingarten', 'privat-de', 'de', undefined, szenen), /gibt-es-nicht|kennt|Bereich/);
});

test('[Vorführung·Quellen·Klasse] jeder Vorführungs-Ordner unter tools/vorfuehrung/ baut aus dem Repo, auf dem Produkt, das er braucht', () => {
  const ordner = fs.readdirSync(VORFUEHRUNG, { withFileTypes: true }).filter((e) => e.isDirectory()
    && fs.existsSync(path.join(VORFUEHRUNG, e.name, 'showcase-szenen.json'))).map((e) => e.name).sort();
  assert.ok(ordner.includes('kleingarten') && ordner.includes('betreuungsverein'), ordner.join(','));
  for (const name of ordner) {
    const slug = produktFuer(name) + '-de';
    assert.ok(fs.existsSync(path.join(VORFUEHRUNG, name, 'showcase-depot.json')), name + ': Depot im Repo');
    assert.doesNotThrow(() => bauen(name, slug, 'de'), name + ' baut auf ' + slug);
  }
});
