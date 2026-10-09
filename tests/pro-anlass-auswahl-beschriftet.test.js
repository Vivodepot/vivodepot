'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Pro-Anlass-Auswahl trägt Beschriftungen (05.10.2026, Befund PRO-ANLASS-OHNE-BESCHRIFTUNG)
   ────────────────────────────────────────────────────────────────────────────
   Die vier Pro-Situationen (U2-ADR-243 Teil 2) stehen als Kacheln auf „Was möchten Sie erledigen?“. Ihre Beschriftung kommt über
   `_anlassAusSituation` aus dem Textsatz (`anlass:<situation>.label`); fehlt die Kennung, stand dort wörtlich „undefined“, und über
   der Auswahl standen die Überschriften der leeren Privat-Klassen. Geprüft im gebauten pro-de und pro-en sowie privat-de als Gegenprobe:
   (1) keine Kachel ohne Beschriftung, kein „undefined“ im Schirm;
   (2) keine Klassen-Überschrift ohne Kachel darunter;
   (3) die vier Pro-Kacheln tragen den Titel ihrer Situation.
   Rot-Beweis (gemessen 05.10.2026): am Stand vor dem Fix sind (1) bis (3) für pro-de und pro-en rot.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-anlass-auswahl-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

function kern(slug) {
  const ziel = path.join(TMP, slug);
  const p = VP.PRODUKTE.find((x) => x.slug === slug);
  konfektionieren({ ziel, slug, modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: VP.modulDateienFuer(p) });
  const html = fs.readdirSync(ziel, { recursive: true }).find((f) => String(f).endsWith('vivodepot.html'));
  process.env.KERN_HTML_PATH = path.join(ziel, String(html));
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally { delete process.env.KERN_HTML_PATH; delete require.cache[LOAD_KERN]; }
}

function auswahlLesen(k) {
  k.V.renderAnlassAuswahl();
  // Aus dem Markup gelesen, nicht über querySelectorAll: der Harnisch liefert dort für die Kachelknöpfe keine Treffer.
  const html = k.document.getElementById('overlay-inhalt').innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '');
  const kacheln = [...html.matchAll(/<button class="anlass" data-anlass="([^"]*)">(?:<span class="ico">[^<]*<\/span>)?<span>([^<]*)<\/span><\/button>/g)]
    .map((m) => ({ id: m[1], text: m[2].trim() }));
  const knoepfe = (html.match(/<button class="anlass"/g) || []).length;
  const leereKlassen = [...html.matchAll(/<div class="klasse-titel">([^<]*)<\/div>(?!<div class="anlass-grid"><button)/g)].map((m) => m[1]);
  return { html, kacheln, knoepfe, leereKlassen };
}

const PRO = { 'pro-de': 'de', 'pro-en': 'en', 'privat-de': null };
for (const [slug, sprache] of Object.entries(PRO)) test(`[Anlass-Auswahl·${slug}] jede Kachel beschriftet, keine leere Klassen-Überschrift`, () => {
  const a = auswahlLesen(kern(slug));
  assert.ok(!/undefined/.test(a.html), 'undefined im Schirm');
  assert.equal(a.kacheln.length, a.knoepfe, 'jede Kachel gelesen');
  assert.ok(a.kacheln.length > 0, 'Kacheln gefunden');
  for (const k of a.kacheln) assert.ok(k.text && k.text !== 'undefined', 'Kachel ohne Beschriftung: ' + k.id);
  assert.deepEqual(a.leereKlassen, [], 'Klassen-Überschrift ohne Kachel');
  if (sprache) {
    const sit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'templates', 'vivodepot-pro-situationen-' + sprache + '.json'), 'utf8')).situationen;
    for (const [id, s] of Object.entries(sit)) {
      const kachel = a.kacheln.find((k) => k.id === id);
      assert.ok(kachel, 'Pro-Kachel fehlt: ' + id);
      assert.equal(kachel.text, s.titel, id);
    }
  }
});
