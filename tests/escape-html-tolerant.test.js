'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund 34.6 (22.09.2026) — das nackte Gerüst ohne Sprachmodul startet,
   statt zu werfen
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN (S8-Fahrer1, 21.09.2026, Rohgerüst-Messung §12; Einordnung nach
   der Tabelle tools/invarianten-register.json,
   Zeile 34.6): ohne Produkt-Sprachmodul liefert STRINGS[x] `undefined`
   (Proxy-Kommentar an STRINGS begründet ausdrücklich, warum das SO SEIN
   MUSS — das im ganzen Kern verbreitete Muster `STRINGS[x] || y` braucht
   einen echten `undefined`-Wert, keinen Ersatztext). `escapeHTML(undefined)`
   machte `undefined.replace(...)` — TypeError, ungefangen bis booteEingang().
   Das ist Fall (a) der Tabelle (wirft) — verletzt 34.6. Fall (b) (rendert
   mit leeren Beschriftungen) ist KEINE Verletzung.

   DER ORT DES FIXES, mit Begründung: escapeHTML selbst, nicht STRINGS/
   vorDepotText. STRINGS muss `undefined` liefern können (s. o.) — die
   Stelle, die tolerant wird, ist darum die KONSUMIERENDE. Vorbild bereits
   im Kern: escapeAttr macht direkt daneben genau das schon
   (`escapeHTML(String(s == null ? '' : s))`) — kein neues Muster, das
   Schließen einer Asymmetrie zwischen zwei Nachbarfunktionen.

   VERDECKUNGSFRAGE (gestellt und beantwortet, hier wiederholt, weil
   sie zum Verständnis des Fixes gehört): könnte ein tolerantes escapeHTML
   ein fehlendes Sprachmodul VERBERGEN statt es zu zeigen? Vertretbar, weil
   tools/vier-produkte-erzeugen.js mit Wächter 2 bereits verlangt, dass
   jedes AUSGELIEFERTE Produkt genau ein Sprachmodul trägt — eine leere
   Beschriftung kann nur entstehen, wo jemand ABSICHTLICH ohne Modul baut
   (Werkzeuge, das nackte Gerüst selbst). Ausführlicher Kommentar an
   escapeHTML in vivodepot.html.

   VERHÄLTNIS ZU BEFUND F4 (tests/eingang-fehler-sichtbar.test.js): F4 macht
   einen Fehler im Eingangsweg SICHTBAR statt ihn stumm zu verschlucken.
   34.6 hier nimmt für GENAU DIESEN einen Auslöser den Fehler ganz weg — F4s
   eigener Rot-Beweis bleibt trotzdem unverändert stehen (eine andere,
   generische Ursache), weil F4 nicht von diesem Fix abhängen darf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const HTML = path.join(REPO, 'vivodepot.html');

test('[34.6·Rot-Beweis] escapeHTML(undefined) und escapeHTML(null) werfen NICHT mehr — leere Zeichenkette statt TypeError', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => V.escapeHTML(undefined), 'escapeHTML(undefined) wirft nicht');
  assert.doesNotThrow(() => V.escapeHTML(null), 'escapeHTML(null) wirft nicht');
  assert.equal(V.escapeHTML(undefined), '', 'undefined wird zur leeren Zeichenkette — Fall (b), kein Rückfalltext');
  assert.equal(V.escapeHTML(null), '', 'null ebenso');
});

test('[34.6·Gegenprobe] escapeHTML maskiert echten Text weiterhin korrekt — der Guard verändert die Maskierung selbst nicht', () => {
  const { V } = ladeKern();
  assert.equal(V.escapeHTML('<b>A & "B" \'C\'</b>'), '&lt;b&gt;A &amp; &quot;B&quot; &#39;C&#39;&lt;/b&gt;');
  assert.equal(V.escapeHTML(''), '');
});

test('[34.6·Rot-Beweis am Gegenstand] am gekippten Guard wirft escapeHTML(undefined) wieder wie vor dem Fix', () => {
  // Mutation AM GEGENSTAND, auf einer Kopie: dieselbe Form wie an anderer Stelle im Bestand
  // (z. B. tests/a376-feldtyp-spiegel.test.js) — der Fix wird namentlich entfernt, nicht geraten.
  const original = fs.readFileSync(HTML, 'utf8');
  const anker = 'function escapeHTML(s) {\n  if (s == null) s = \'\';\n  return s.replace(';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker (Fix-Zeile) kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), '34-6-rot-beweis-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, 'function escapeHTML(s) {\n  return s.replace('));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    assert.throws(() => V.escapeHTML(undefined), TypeError, 'ohne den Guard wirft escapeHTML(undefined) wieder — der Fix trägt wirklich');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML, 'utf8'), original, 'die Probe darf den echten Kern nicht verändern');
});

test('[34.6·Fall (b)] das nackte Gerüst ohne Sprachmodul startet und bootet durch — kein Wurf, keine weiße Seite', () => {
  // GERÜST-TEST: lädt bewusst das nackte Gerüst (kein `backen`, roher Pfad) — genau die
  // Konstellation der S8-Messung. Vor 34.6 warf booteEingang() hier zweimal (Rot-Beweis in
  // tests/eingang-fehler-sichtbar.test.js, Zug „Gegenstück nach 34.6").
  const original = fs.readFileSync(HTML, 'utf8');
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = HTML;
  let V, document;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    ({ V, document } = require('./load-kern.js').ladeKern({ blank: true }));
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
  }
  assert.equal(fs.readFileSync(HTML, 'utf8'), original, 'nur gelesen, nicht verändert');
  // booteEingang() lief bereits beim Laden (s. load-kern.js-Kommentar) — kein Wurf bis hierher
  // bedeutet: der Test wäre sonst schon in ladeKern() selbst gescheitert. Zusätzlich: renderWelcome
  // erneut aufrufbar, wirft auch bei direktem Aufruf nicht mehr.
  assert.doesNotThrow(() => V.renderWelcome(), 'renderWelcome() wirft nicht mehr, auch ohne Sprachmodul');
  assert.equal(typeof document.getElementById('eingang-fehler-hinweis').hidden === 'boolean'
    ? document.getElementById('eingang-fehler-hinweis').hidden : true, true,
    'F4s Auffangposten bleibt verborgen — kein Fehler, also kein Anlass');
});
