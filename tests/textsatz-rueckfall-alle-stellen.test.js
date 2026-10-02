'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Rückfall in derselben Sprache an JEDER Anzeigestelle (Befund ALTMODUL-UEBERDECKT-PRODUKT, 01.10.2026, U2-ADR-463)
   ───────────────────────────────────────────────────────────────────────────
   Eine ältere Datei trägt ihr eigenes, älteres Sprachmodul. Im Produkt derselben Sprache geöffnet, zeigte jede Stelle, die
   `textLesen(k) || deutscher Literal` las, einen seither neuen Text deutsch — obwohl das Produkt ihn in derselben Sprache
   trug und der Rückfall dafür (`_textsatzRueckfall`, U2-ADR-416) längst bestand. Gefunden an den Auszügen (Erbschein,
   Beratungshilfe); dieselbe Form stand an Institutionsarten, der Todesfall-Zwischenfrage und einer strings-Stelle, in der
   Lese-App an deren Auszugs-Läufer.

   DIE KLASSE, gegen die der Wächter steht: ein Literal als letzter Ausweg, der den Rückfall derselben Sprache überspringt.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const P = require('./produkt-html-erzeugen.js');

const REPO = path.join(__dirname, '..');
const ALTDATEI = path.join(__dirname, 'fixtures', 'vorfuehrung-zugang-zum-recht', 'demo-en.vivodepot');
// `textLesen(<Ausdruck>) ||` — Kommentare, die das Muster mit „…“ nennen, zählen nicht.
const MUSTER = /textLesen\((?:[^()…]|\([^()]*\))*\)\s*\|\|/g;

test('[Rückfall·Wächter] kein `textLesen(…) ||` in Kern und Lese-App — jede Stelle mit Literal nimmt _textLesenOderRueckfall', () => {
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const quelle = fs.readFileSync(path.join(REPO, datei), 'utf8');
    assert.deepEqual(quelle.match(MUSTER) || [], [], datei);
    assert.ok(quelle.includes('function _textLesenOderRueckfall('), datei + ': der Helfer ist da');
  }
  const rot = "const t = textLesen(aK + '.titel') || ab.titel;";
  assert.equal((rot.match(MUSTER) || []).length, 1, 'Rot-Beweis im Test: die alte Form würde gefunden');
});

async function altdateiImProdukt(slug) {
  const t = fs.readFileSync(ALTDATEI, 'utf8');
  const { V } = P.kernAus(P.produktHtml(slug));
  await V.depotLaden(JSON.parse(t.slice(t.indexOf('{'))), 'zugang-zum-recht-vorfuehrung-2026');
  return V;
}

test('[Rückfall·Altdatei] eine ältere englische Datei zeigt im englischen Produkt jeden Auszugstext englisch', async () => {
  const W = await altdateiImProdukt('privat-en');
  const mod = (W.getData().textsatzModule || []).find((m) => m.sprache === 'en');
  const en = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  const fehlend = Object.keys(en).filter((k) => k.startsWith('dok:erbschein-vorbereitung#2') && !(k in mod.texte));
  assert.ok(fehlend.length >= 3, 'Vorbedingung: dem Modul der Datei fehlen Texte von Teil C, die das Produkt kennt (' + fehlend.length + ')');
  const html = W.dokumentHTML('erbschein-vorbereitung');
  for (const k of fehlend) {
    const text = en[k].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');   // wie escapeHTML
    assert.ok(html.includes(text.slice(0, 30)), k + ': der englische Text des Produkts steht im Auszug');
  }
  assert.doesNotMatch(html, /Urkunden für den Nachweis|Wo liegt die Geburtsurkunde/, 'kein deutscher Text im englischen Produkt');
});

test('[Rückfall·Rot-Beweis] mit der alten Form in `_logikModulTexteAufloesen` erscheint Teil C deutsch', async () => {
  const produkt = fs.readFileSync(P.produktHtml('privat-en'), 'utf8');
  const neu = "const titel = (typeof ab.titel === 'string') ? (_textLesenOderRueckfall(aK + '.titel', ab.titel)) : ab.titel;";
  assert.equal(produkt.split(neu).length, 2, 'Anker trifft genau einmal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rueckfall-rot-'));
  try {
    const ziel = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(ziel, produkt.replace(neu, "const titel = (typeof ab.titel === 'string') ? (textLesen(aK + '.titel') || ab.titel) : ab.titel;"));
    const t = fs.readFileSync(ALTDATEI, 'utf8');
    const { V } = P.kernAus(ziel);
    await V.depotLaden(JSON.parse(t.slice(t.indexOf('{'))), 'zugang-zum-recht-vorfuehrung-2026');
    assert.match(V.dokumentHTML('erbschein-vorbereitung'), /Teil C — Urkunden für den Nachweis/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
