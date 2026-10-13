'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Neugestaltung A+ mit Glas, Wagen S0 (08.10.2026): dasselbe Glas wie die App, und zwei Zugangsbefunde
   ─────────────────────────────────────────────────────────────────────────────
   (1) GLAS WIE IN DER APP. vivodepot-studio.html trägt die Region STUDIO-ERSCHEINUNG, gebacken aus dem Erscheinungsbild-
       Modul der App (tools/studio-erscheinung-backen.js). Die Werte jeder Fläche sind die des Moduls — hier unabhängig vom
       Erzeuger gegen das Modul gelesen —, und bei „Transparenz reduzieren“ und im Hochkontrast fällt jede Glasfläche auf
       eine deckende Fläche ohne backdrop-filter zurück. Rot-Beweise: ein veränderter Wert im Modul, eine von Hand
       veränderte Region und ein Modul ohne Rückfall werden gefangen.
   (2) TEXT AUF GLAS IST --ink (Kontrast über jeder Partnerfarbe, Bericht A+ mit Glas): jede Glasfläche setzt Schrift und
       das gedämpfte Grau auf --ink.
   (3) B6 (UX-Test 06.10.2026): die Fehlerliste der Angaben zur Einrichtung ist role="alert", jedes betroffene Feld trägt
       aria-invalid, der Fokus steht im ersten fehlerhaften Feld; jede Meldung von validiereStammdaten, die ein Feld
       meint, ist einem Feld zugeordnet (Klasse: eine neue Meldung ohne Feld ist rot).
   (4) B7 (UX-Test 06.10.2026): auf schmalen Bildschirmen öffnet der Feld-Editor als Blatt von unten.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const B = require('../tools/studio-erscheinung-backen.js');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(B.STUDIO, 'utf8');
const MODUL = JSON.parse(fs.readFileSync(B.MODUL, 'utf8'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-glas-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const region = () => B.regionLesen(HTML);
const kopie = (x) => JSON.parse(JSON.stringify(x));

/* Unabhängig vom Erzeuger: die Deklaration einer Regel im Modul-CSS außerhalb jedes @-Blocks, per Textsuche. */
function ohneAtBloecke(css) {
  let raus = '', i = 0;
  while (i < css.length) {
    const a = css.indexOf('@', i);
    if (a < 0) { raus += css.slice(i); break; }
    raus += css.slice(i, a);
    let k = css.indexOf('{', a) + 1, tiefe = 1;
    while (tiefe && k < css.length) { if (css[k] === '{') tiefe++; else if (css[k] === '}') tiefe--; k++; }
    i = k;
  }
  return raus;
}
function modulDeklaration(appSelektor, eigenschaft) {
  const css = ohneAtBloecke(Object.values(MODUL.stil).join('\n').replace(/\/\*[\s\S]*?\*\//g, ''));
  const gesucht = 'html:not(.dark-mode):not(.high-contrast) ' + appSelektor;
  let wert = null;
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].split(',').map((x) => x.trim().replace(/\s+/g, ' '));
    if (!sel.includes(gesucht)) continue;
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0 && d.slice(0, i).trim() === eigenschaft) wert = d.slice(i + 1).trim().replace(/\s+/g, ' ');
    }
  }
  return wert;
}

/* ── (1) Glas wie in der App ─────────────────────────────────────────────── */
test('[Glas] die Studio-Datei trägt die Region STUDIO-ERSCHEINUNG, genau so, wie der Erzeuger sie aus dem Modul bäckt', () => {
  assert.ok(region(), 'keine Region STUDIO-ERSCHEINUNG');
  assert.equal(region(), B.regionErzeugen(MODUL));
});

test('[Glas] Kopf, Karten, Dialog und Vorschau tragen die Unschärfe und den Hintergrund ihrer App-Fläche, Wert für Wert', () => {
  const r = region();
  for (const rolle of B.ROLLEN.filter((x) => x.name !== 'grundflaeche')) {
    const filter = modulDeklaration(rolle.app, 'backdrop-filter');
    const grund = modulDeklaration(rolle.app, 'background');
    assert.ok(filter && filter !== 'none', rolle.name + ': das Modul gibt ' + rolle.app + ' kein Glas');
    const block = r.split('\n').find((z) => z.startsWith(rolle.studio + ' {'));
    assert.ok(block, rolle.name + ': keine Regel für ' + rolle.studio);
    assert.ok(block.includes('backdrop-filter: ' + filter + ';'), rolle.name + ': Unschärfe weicht vom Modul ab — ' + block);
    assert.ok(block.includes('background: ' + grund + ';'), rolle.name + ': Hintergrund weicht vom Modul ab — ' + block);
  }
});

test('[Glas] bei „Transparenz reduzieren“ und im Hochkontrast fällt jede Glasfläche deckend und ohne backdrop-filter zurück', () => {
  const r = region();
  const a = r.indexOf('@media (prefers-reduced-transparency: reduce), (forced-colors: active) {');
  assert.ok(a > 0, 'kein Rückfall für reduced-transparency und forced-colors');
  const rumpf = r.slice(a, r.indexOf('\n}', a));
  for (const rolle of B.ROLLEN.filter((x) => x.name !== 'grundflaeche')) {
    const z = rumpf.split('\n').find((x) => x.trim().startsWith(rolle.studio + ' {'));
    assert.ok(z, rolle.name + ': fehlt im Rückfall');
    assert.match(z, /backdrop-filter: none;/, rolle.name);
    const hg = (z.match(/background: ([^;]+);/) || [])[1] || '';
    assert.ok(hg && !/rgba\([^)]*,\s*(0?\.\d+)\)/.test(hg) && hg !== 'transparent', rolle.name + ': Rückfall nicht deckend — ' + hg);
  }
});

test('[Glas · Rot-Beweis] ein veränderter Glaswert im Modul passt nicht mehr zur Region im Studio', () => {
  const m = kopie(MODUL);
  for (const k of Object.keys(m.stil)) m.stil[k] = m.stil[k].replace(/blur\(10px\)/g, 'blur(11px)');
  assert.notEqual(B.regionErzeugen(m), region());
});

test('[Glas · Rot-Beweis] ein Modul ohne Rückfall für „Transparenz reduzieren“ bricht den Erzeuger ab', () => {
  const m = kopie(MODUL);
  for (const k of Object.keys(m.stil)) m.stil[k] = m.stil[k].replace(/@media \(prefers-reduced-transparency: reduce\)/g, '@media (min-width: 99999px)');
  assert.throws(() => B.regionErzeugen(m), /Rückfall/);
});

test('[Glas · Rot-Beweis] eine von Hand veränderte Region macht --check rot', () => {
  const datei = path.join(TMP, 'studio-verfaelscht.html');
  fs.writeFileSync(datei, HTML.replace(region(), region().replace('blur(10px)', 'blur(9px)')));
  assert.throws(() => execFileSync(process.execPath, [path.join(REPO, 'tools', 'studio-erscheinung-backen.js'), '--check', '--studio', datei], { stdio: 'pipe' }));
  assert.doesNotThrow(() => execFileSync(process.execPath, [path.join(REPO, 'tools', 'studio-erscheinung-backen.js'), '--check'], { stdio: 'pipe' }));
});

/* ── (2) Text auf Glas ───────────────────────────────────────────────────── */
function stilBlock() {
  const a = HTML.indexOf('<style id="studio-erscheinung">');
  return HTML.slice(a, HTML.indexOf('</style>', a));
}
test('[Text auf Glas] jede Glasfläche setzt Schrift und das gedämpfte Grau auf --ink', () => {
  const zeile = stilBlock().split('\n').find((z) => /\{ --grau: var\(--ink\); color: var\(--ink\); \}/.test(z));
  assert.ok(zeile, 'keine Regel „--grau: var(--ink); color: var(--ink)“ für die Glasflächen');
  const flaechen = zeile.slice(0, zeile.indexOf('{')).split(',').map((x) => x.trim());
  for (const rolle of B.ROLLEN.filter((x) => x.name !== 'grundflaeche')) {
    for (const s of rolle.studio.split(',').map((x) => x.trim())) assert.ok(flaechen.includes(s), s + ' trägt Glas, aber nicht --ink');
  }
});

/* ── (3) B6: Fehlerliste ─────────────────────────────────────────────────── */
function quelleVon(name) {
  const a = HTML.indexOf(name);
  assert.ok(a > 0, name + ' fehlt');
  const start = HTML.lastIndexOf('\n', a) + 1;
  let tiefe = 0, i = HTML.indexOf('{', a);
  for (; i < HTML.length; i++) { if (HTML[i] === '{') tiefe++; else if (HTML[i] === '}' && --tiefe === 0) break; }
  return HTML.slice(start, i + 1) + (HTML[i + 1] === ')' ? ');' : '');
}
function fehlerSandbox() {
  const elemente = new Map();
  let fokus = null;
  const neu = (id) => {
    const attr = new Map(); const kinder = [];
    return { id, hidden: true, attr, kinder, setAttribute: (k, v) => attr.set(k, v), removeAttribute: (k) => attr.delete(k),
      getAttribute: (k) => attr.get(k), appendChild: (c) => { kinder.push(c); return c; }, focus() { fokus = id; } };
  };
  const $ = (id) => { if (!id) return null; if (!elemente.has(id)) elemente.set(id, neu(id)); return elemente.get(id); };
  const ctx = { $, L: (de) => de, meldungL: (x) => x, leeren: (e) => { e.kinder.length = 0; }, el: (tag, o) => ({ tag, o, appendChild() {} }), Object };
  vm.createContext(ctx);
  vm.runInContext(quelleVon('const STAMMDATEN_FEHLER_FELD') + '\n' + quelleVon('function stammdatenFehlerZeigen') + '\nthis.zeigen = stammdatenFehlerZeigen; this.KARTE = STAMMDATEN_FEHLER_FELD;', ctx);
  return { ctx, $, fokus: () => fokus };
}
test('[B6] die Fehlerliste ist role="alert"; betroffene Felder tragen aria-invalid, der Fokus steht im ersten', () => {
  assert.match(HTML, /<div id="sd-fehler" class="meldung" role="alert" tabindex="-1" hidden><\/div>/);
  const s = fehlerSandbox();
  s.ctx.zeigen(['Bitte geben Sie die Straße an.', 'Bitte geben Sie den Ort an.']);
  assert.equal(s.$('sd-fehler').hidden, false);
  assert.equal(s.$('sd-strasse').getAttribute('aria-invalid'), 'true');
  assert.equal(s.$('sd-ort').getAttribute('aria-invalid'), 'true');
  assert.equal(s.fokus(), 'sd-strasse');
  s.ctx.zeigen([]);
  assert.equal(s.$('sd-strasse').getAttribute('aria-invalid'), undefined, 'nach der Korrektur bleibt kein Feld als fehlerhaft markiert');
  assert.equal(s.$('sd-fehler').hidden, true);
});

test('[B6 · Rot-Beweis] eine Meldung ohne Feld setzt den Fokus auf die Liste, nicht ins Leere', () => {
  const s = fehlerSandbox();
  s.ctx.zeigen(['Der Bereich aus dem Entwurf ist unbekannt.']);
  assert.equal(s.fokus(), 'sd-fehler');
});

test('[B6 · Klasse] jede Meldung von validiereStammdaten, die ein Feld der Maske meint, ist einem Feld zugeordnet, und das Feld existiert', () => {
  const quelle = quelleVon('function validiereStammdaten');
  const meldungen = [...quelle.matchAll(/fehler\.push\('([^']+)'\)/g)].map((m) => m[1]).filter((t) => !/Entwurf/.test(t));
  assert.ok(meldungen.length >= 8, 'zu wenige Meldungen gelesen: ' + meldungen.length);
  const s = fehlerSandbox();
  const karte = s.ctx.KARTE;
  assert.deepEqual(meldungen.filter((m) => !karte[m]), [], 'Meldung ohne Feld');
  for (const id of Object.values(karte)) assert.ok(HTML.includes('id="' + id + '"'), id + ' fehlt in der Maske');
  // Rot-Beweis: eine neue Meldung ohne Zuordnung fiele hier auf.
  const mitNeuer = meldungen.concat(['Bitte geben Sie die Hausnummer an.']);
  assert.equal(mitNeuer.filter((m) => !karte[m]).length, 1);
});

/* ── (4) B7: Editor als Blatt ────────────────────────────────────────────── */
test('[B7] schmal öffnet der Feld-Editor als Blatt von unten; Öffnen setzt, Schließen und Ausprobieren nehmen die Klasse', () => {
  const css = stilBlock();
  const m = css.match(/@media \(max-width: 760px\) \{\s*\.eigenschaften\.editor-offen \{([^}]*)\}/);
  assert.ok(m, 'keine Blatt-Regel für schmale Bildschirme');
  assert.match(m[1], /position: fixed;/);
  assert.match(m[1], /bottom: 0;/);
  assert.match(HTML, /\$\('eigenschaften'\)\.classList\.add\('editor-offen'\)/);
  assert.match(quelleVon('function schliesseEditor'), /classList\.remove\('editor-offen'\)/);
});
