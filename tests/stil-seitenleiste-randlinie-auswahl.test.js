'use strict';
/* ═════════════════════════════════════════════════════════════════
   Test: Seitenleiste mit zarter Fläche statt Randlinie, Auswahlfelder im Stil des Leitfadens
   Abnahme v998, M20/M21 der Gestaltungsleitung.
   ─────────────────────────────────────────────────────────────────
   M20, seit 01.11.2026 nach Zielbild Nr. 13 (Fläche statt Linien): Der aktive Eintrag der Seitenleiste trägt eine zarte Fläche
   aus einem Token und kräftigere Schrift, keine sichtbare Randlinie, im eigenen Depot wie im Sub-Depot, hell wie dunkel. Die
   Randlinie vom 31.10. sprengte den Linien-Deckel der Seitenleiste. Hoher Kontrast bleibt unberührt.
   M21: Wo der Browser `appearance: base-select` kennt, steht die Liste eines `select` im Stil des Leitfadens (Feldfläche, Linie,
   Radius, Schatten; Einträge in Normalgröße; der gewählte Eintrag salbei, nicht blau). Der Dateiknopf ist eine Pille wie die
   Sekundärknöpfe. Am Datumsfeld wird nur das Kalendersymbol eingefärbt.
   Gelesen werden die Quellen des Stils (tools/erscheinung/stil/), nicht das gebackene Produkt. Der Rot-Beweis läuft gegen eine
   Kopie der Randlinien-Regeln vom 31.10. und gegen je eine verdorbene Fassung der M21-Regeln.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { zerlegen, deklarationen, ohneKommentare } = require('../tools/lib/css-zerlegen.js');

const STIL = path.join(__dirname, '..', 'tools', 'erscheinung', 'stil');
const SALBEI_GLAS = fs.readFileSync(path.join(STIL, 'salbei-glas.css'), 'utf8');
const GRUNDLAGE = fs.readFileSync(path.join(STIL, 'grundlage.css'), 'utf8');

/* Kopie der Randlinien-Regeln vom 31.10.: der aktive Eintrag mit linker Linie und ohne Fläche, hell, dunkel und im Sub-Depot. */
const ALTE_REGELN = `
html:not(.high-contrast) .nav-item.aktiv { background: transparent; border-left-color: var(--salbei-dunkel); color: var(--salbei-dunkel); font-weight: var(--fw-semibold); }
html.dark-mode:not(.high-contrast) .nav-item.aktiv { border-left-color: #d4d7d1; color: var(--ink); }
html.vm-akzent:not(.dark-mode):not(.high-contrast) #app.modus-vollmacht .nav-item.aktiv { background: transparent; border-left-color: var(--ink); color: var(--ink); }
html.vm-akzent.dark-mode:not(.high-contrast) #app.modus-vollmacht .nav-item.aktiv { background: transparent; border-left-color: var(--sd-hell); color: var(--ink); }
`;

/* Alle Regeln flach, jede mit den Köpfen ihrer At-Regeln. */
function regeln(css, huelle = []) {
  const raus = [];
  for (const x of zerlegen(css)) {
    if (x.art === 'regel') {
      const sel = ohneKommentare(x.selektor).trim().replace(/\s+/g, ' ');
      raus.push({ huelle, selektoren: sel.split(/,(?![^(]*\))/).map((s) => s.trim()), dekl: deklarationen(x.innen) });
    } else if (x.art === 'at-block' && (x.name === 'media' || x.name === 'supports')) {
      raus.push(...regeln(x.innen, huelle.concat(x.kopf.trim().replace(/\s+/g, ' '))));
    }
  }
  return raus;
}
const wert = (r, prop) => {
  const d = r.dekl.find((z) => z.toLowerCase().startsWith(prop + ':'));
  return d ? d.slice(prop.length + 1).trim() : null;
};
const hat = (r, teil) => r.selektoren.some((s) => s.includes(teil));

/* Die Regeln für den aktiven Eintrag der Seitenleiste (nicht Symbol, nicht Unterzeile). */
function aktiveEintraege(css) {
  return regeln(css).map((r) => ({ ...r, ziel: r.selektoren.filter((s) => /\.nav-item\.aktiv$/.test(s)) })).filter((r) => r.ziel.length);
}
const KEINE = /^(transparent|none|inherit|initial|unset)$/i;
/* Sichtbare Randlinien an diesen Regeln: jede border-left-Farbe, die nicht durchsichtig ist. */
function linien(css) {
  const funde = [];
  for (const r of aktiveEintraege(css)) {
    const w = wert(r, 'border-left-color');
    if (w !== null && !KEINE.test(w)) funde.push(r.ziel[0] + ' { border-left-color: ' + w + ' }');
  }
  return funde;
}
/* Kontexte des aktiven Eintrags: wer trägt die Fläche? */
const KONTEXTE = {
  'eigenes Depot, hell': (s) => /\.nav-item\.aktiv$/.test(s) && !/dark-mode|modus-vollmacht/.test(s),
  'eigenes Depot, dunkel': (s) => /\.nav-item\.aktiv$/.test(s) && /dark-mode/.test(s) && !/modus-vollmacht|vm-akzent/.test(s),
  'Sub-Depot, hell': (s) => /\.nav-item\.aktiv$/.test(s) && /vm-akzent:not\(\.dark-mode\)/.test(s) && /modus-vollmacht/.test(s),
  'Sub-Depot, dunkel': (s) => /\.nav-item\.aktiv$/.test(s) && /vm-akzent\.dark-mode/.test(s) && /modus-vollmacht/.test(s),
};
/* Kontexte ohne Fläche aus einem Token (eine Hintergrundfarbe mit var(--…), kein Rohwert). */
function ohneFlaeche(css) {
  const luecken = [];
  const alle = aktiveEintraege(css);
  for (const [name, passt] of Object.entries(KONTEXTE)) {
    const treffer = alle.filter((r) => r.ziel.some(passt)).map((r) => wert(r, 'background')).filter((w) => w !== null && !KEINE.test(w));
    if (!treffer.some((w) => /var\(--/.test(w) && !/#[0-9a-f]{3,8}\b|rgba?\(/i.test(w))) luecken.push(name);
  }
  return luecken;
}

test('[M20] der aktive Seitenleisten-Eintrag trägt in salbei-glas.css keine sichtbare Randlinie', () => {
  assert.ok(aktiveEintraege(SALBEI_GLAS).length >= 4, 'Regeln für .nav-item.aktiv gefunden');
  assert.deepEqual(linien(SALBEI_GLAS), []);
});

test('[M20] der aktive Eintrag hat hell, dunkel und im Sub-Depot eine Fläche aus einem Token', () => {
  assert.deepEqual(ohneFlaeche(SALBEI_GLAS), []);
});

test('[M20] kräftigere Schrift statt Fläche, und Hoher Kontrast bleibt unberührt', () => {
  const alle = aktiveEintraege(SALBEI_GLAS);
  assert.ok(alle.some((r) => wert(r, 'font-weight') === 'var(--fw-semibold)'), 'der aktive Eintrag steht kräftiger');
  for (const r of alle) {
    if (wert(r, 'border-left-color') === null && wert(r, 'background') === null) continue;
    assert.ok(r.ziel.every((s) => s.includes(':not(.high-contrast)')), 'ohne Hochkontrast-Ausnahme: ' + r.ziel[0]);
  }
});


/* ── M21 ─────────────────────────────────────────────────────────── */

/* Prüft die base-select-Regeln in einem Stylesheet und liefert die Mängel. */
function auswahlMaengel(css) {
  const m = [];
  const alle = regeln(css).filter((r) => r.huelle.some((h) => /^@supports\s*\(\s*appearance:\s*base-select\s*\)/.test(h)));
  if (!alle.length) return ['keine @supports-(appearance: base-select)-Regel'];
  const mit = (teil) => alle.filter((r) => hat(r, teil));
  if (!mit('select').some((r) => wert(r, 'appearance') === 'base-select')) m.push('select ohne appearance: base-select');
  const liste = mit('::picker(select)');
  if (!liste.length) m.push('keine Regel für select::picker(select)');
  for (const prop of ['background', 'border', 'border-radius', 'box-shadow']) {
    if (liste.length && !liste.some((r) => wert(r, prop) !== null)) m.push('die Liste setzt kein ' + prop);
  }
  for (const r of mit('option')) {
    const fs_ = wert(r, 'font-size');
    if (fs_ !== null && /--fs-xs|--fs-2xs|\bpx\b/.test(fs_)) m.push('Eintrag in kleiner Schrift: ' + fs_);
  }
  const gewaehlt = mit('option:checked');
  if (!gewaehlt.length) m.push('option:checked fehlt');
  for (const r of gewaehlt) {
    const rohtext = r.dekl.join(';');
    if (/blue|highlight|accentcolor|canvas|#[0-9a-f]{3,8}\b|rgba?\(/i.test(rohtext)) m.push('option:checked mit Roh- oder Systemfarbe: ' + rohtext);
    if (!/salbei/.test(rohtext)) m.push('option:checked nicht salbei: ' + rohtext);
  }
  if (!gewaehlt.some((r) => hat(r, 'html.dark-mode') && /--salbei-nacht/.test(r.dekl.join(';')))) m.push('Nacht: option:checked ohne --salbei-nacht');
  if (!alle.some((r) => r.selektoren.every((s) => s.includes(':not(.high-contrast)')))) m.push('Hoher Kontrast nicht ausgenommen');
  return m;
}
function dateiKnopfMaengel(css) {
  const m = [];
  const r = regeln(css).filter((x) => hat(x, 'input[type="file"]::file-selector-button') && !hat(x, ':hover') && !hat(x, 'dark-mode'));
  if (!r.length) return ['keine Regel für ::file-selector-button'];
  if (!r.some((x) => /--radius-pill/.test(wert(x, 'border-radius') || ''))) m.push('keine Pille (--radius-pill)');
  if (!r.some((x) => /^1px solid var\(--salbei-dunkel\)$/.test(wert(x, 'border') || ''))) m.push('keine salbei Linie');
  if (!r.some((x) => /^var\(--salbei-dunkel\)$/.test(wert(x, 'color') || ''))) m.push('Schrift nicht salbei');
  return m;
}

test('[M21] die @supports-base-select-Regel gibt der Liste den Stil des Leitfadens, der gewählte Eintrag ist salbei', () => {
  assert.deepEqual(auswahlMaengel(GRUNDLAGE), []);
});

test('[M21] option:checked färbt nicht blau, Einträge stehen in normaler Größe', () => {
  const alle = regeln(GRUNDLAGE).filter((r) => r.huelle.some((h) => /base-select/.test(h)));
  const eintrag = alle.find((r) => r.selektoren.some((s) => /select option$/.test(s)));
  assert.ok(eintrag, 'Regel für die Einträge');
  assert.equal(wert(eintrag, 'font-size'), 'var(--fs-base)');
  for (const r of alle.filter((x) => hat(x, 'option:checked'))) assert.doesNotMatch(r.dekl.join(';'), /blue|highlight|accentcolor|#|rgba?\(/i);
});

test('[M21] der Dateiknopf ist eine Pille wie die Sekundärknöpfe', () => {
  assert.deepEqual(dateiKnopfMaengel(GRUNDLAGE), []);
});

test('[M21] am Datumsfeld wird nur das Kalendersymbol eingefärbt', () => {
  const r = regeln(GRUNDLAGE).filter((x) => hat(x, 'input[type="date"]::-webkit-calendar-picker-indicator'));
  assert.ok(r.length >= 2, 'hell und dunkel');
  for (const x of r) for (const d of x.dekl) assert.match(d, /^(cursor|opacity|filter)\s*:/, 'nur dezente Einfärbung: ' + d);
});

test('[M21] keine Roh-Farbwerte in den neuen Regeln von grundlage.css', () => {
  const neu = regeln(GRUNDLAGE).filter((r) => r.huelle.some((h) => /base-select/.test(h)) || r.selektoren.some((s) => /file-selector-button|calendar-picker-indicator/.test(s)));
  assert.ok(neu.length >= 8);
  for (const r of neu) assert.doesNotMatch(r.dekl.join(';'), /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
});

/* ── Rot-Beweis: die Prüfung schlägt an, wenn die Regel verdorben ist ── */

test('[Rot-Beweis M20] die Randlinien-Regeln vom 31.10. werden erkannt, hell, dunkel und im Sub-Depot', () => {
  const funde = linien(ALTE_REGELN);
  assert.equal(funde.length, 4, funde.join(' | '));
  assert.ok(funde.some((f) => /dark-mode/.test(f)) && funde.some((f) => /vm-akzent/.test(f)));
  assert.equal(ohneFlaeche(ALTE_REGELN).length, Object.keys(KONTEXTE).length, 'in den alten Regeln keine Fläche');
  assert.ok(ohneFlaeche('html:not(.high-contrast) .nav-item.aktiv { background: #e6eddf; }').includes('eigenes Depot, hell'), 'Rohwert zählt nicht als Token');
});

test('[Rot-Beweis M21] verdorbene Fassungen werden erkannt', () => {
  assert.ok(auswahlMaengel('select { appearance: none; }').length > 0, 'ohne @supports-Regel');
  const blau = '@supports (appearance: base-select) { html:not(.high-contrast) select { appearance: base-select; } html:not(.high-contrast) select option:checked { background: #0b57d0; color: var(--ink); } }';
  assert.ok(auswahlMaengel(blau).some((x) => /Roh- oder Systemfarbe/.test(x)), 'blauer Eintrag erkannt');
  const klein = '@supports (appearance: base-select) { html:not(.high-contrast) select option { font-size: var(--fs-xs); } }';
  assert.ok(auswahlMaengel(klein).some((x) => /kleiner Schrift/.test(x)), 'kleine Einträge erkannt');
  const eckig = 'input[type="file"]::file-selector-button { border: 1px solid var(--line); border-radius: var(--radius-sm); }';
  const maengel = dateiKnopfMaengel(eckig);
  assert.ok(maengel.includes('keine Pille (--radius-pill)') && maengel.includes('keine salbei Linie'), maengel.join(' | '));
});
