'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Gestaltungsdefinition (Stufe 1): eine Quelle für Grundwerte und Bedeutungs-Token.
   Die Definition (tools/erscheinung/definition.json) ist gültig, der erzeugte Block in der Stilquelle entspricht ihr,
   und ihre Prüfsumme steht in der ADR „Gestaltungsdefinition: eine Quelle“. Ändert sich die Definition ohne Nachtrag, ist es rot.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const g = require('../tools/gestaltung-definition.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'gestaltung-definition.js');

test('[Definition·a] die Definition ist gültig: Verweise lösen auf, Schicht 2 trägt keine Zahl', () => {
  assert.deepEqual(g.definitionPruefen(g.definitionLaden()), []);
});

test('[Definition·person] die Personenfarbe steht in der Definition: acht Töne, jeder mit Text- und Linienfassung in beiden Stilquellen', () => {
  const def = g.definitionLaden();
  assert.equal(def.grundwerte.person.toene.length, 8);
  assert.deepEqual(def.grundwerte.person.token, ['--person', '--person-text', '--person-linie']);
  const kaputt = JSON.parse(JSON.stringify(def));
  kaputt.grundwerte.person.toene.push('gibtesnicht');
  assert.ok(g.definitionPruefen(kaputt).some((f) => f.includes('--gibtesnicht')), 'ein nicht deklarierter Ton wird gemeldet');
});

test('[Definition·b] der erzeugte Block in grundlage.css entspricht der Definition', () => {
  const css = fs.readFileSync(g.GRUNDLAGE, 'utf8');
  assert.deepEqual(g.blockPruefen(css, g.definitionLaden()), []);
  const def = g.definitionLaden();
  for (const s of def.grundwerte.abstaende.stufen) assert.ok(css.includes(s.token + ':'), s.token);
  for (const r of def.grundwerte.radien) assert.ok(css.includes(`${r.token}: ${r.wert};`), r.token);
  assert.ok(css.includes('--treffer: 44px;'));
  for (const s of def.grundwerte.abstaende.zwischen) assert.ok(css.includes(s.token + ':'), s.token);
  for (const k of ['gewichte', 'zeilenhoehen', 'uebergaenge', 'schatten']) for (const e of def.grundwerte[k]) assert.ok(css.includes(`${e.token}: ${e.wert};`), e.token);
});

test('[Definition·c] Rot-Beweis: ein verändertes Maß im Block und ein fehlender Block machen --check rot', () => {
  const def = g.definitionLaden();
  const css = fs.readFileSync(g.GRUNDLAGE, 'utf8');
  assert.equal(g.blockPruefen(css.replace('--radius-7: 10px', '--radius-7: 11px'), def).length, 1);
  assert.equal(g.blockPruefen(css.replace(g.MARKE_ANFANG, 'WEG'), def).length, 1);
  // über den Aufruf: --check gegen eine Kopie mit verändertem Block
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gestaltung-def-'));
  try {
    const kopie = path.join(tmp, 'grundlage.css');
    fs.writeFileSync(kopie, css.replace('--treffer: 44px', '--treffer: 48px'));
    let code = 0; let aus = '';
    try { execFileSync(process.execPath, [WERKZEUG, '--check', '--css', kopie], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { code = e.status; aus = String(e.stderr); }
    assert.equal(code, 1);
    assert.match(aus, /weicht von der Definition ab/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Definition·d] Rot-Beweis: Schicht 2 mit Zahl, ohne Auflösung oder mit kopierter Größe fällt in der Prüfung auf', () => {
  const sauber = () => JSON.parse(JSON.stringify(g.definitionLaden()));
  let d = sauber(); d.bedeutung.token[0].verweis = '--gibt-es-nicht';
  assert.ok(g.definitionPruefen(d).some((f) => /nicht steht/.test(f)));
  d = sauber(); d.bedeutung.token[0].px = 12;
  assert.ok(g.definitionPruefen(d).some((f) => /keine Zahl in Schicht 2/.test(f)));
  d = sauber(); d.grundwerte.schriftgroessen.stufen = [{ token: '--fs-x', px: 14 }];
  assert.ok(g.definitionPruefen(d).some((f) => /nicht kopiert/.test(f)));
  d = sauber(); d.grundwerte.abstaende.stufen[2].px = 4;
  assert.ok(g.definitionPruefen(d).some((f) => /aufsteigend/.test(f)));
  d = sauber(); d.grundwerte.umbrueche.breit_ab_px = 800;
  assert.ok(g.definitionPruefen(d).some((f) => /umbrueche/.test(f)));
  d = sauber(); d.bedeutung.token = d.bedeutung.token.filter((t) => t.bedeutung !== 'herkunft');
  assert.ok(g.definitionPruefen(d).some((f) => /herkunft/.test(f)));
});

test('[Definition·e] die Prüfsumme der Definition steht in der ADR', () => {
  const adr = g.adrDatei();
  assert.ok(adr, 'genau eine ADR „Gestaltungsdefinition: eine Quelle“ unter docs/adr/');
  assert.deepEqual(g.adrPruefen(g.DEFINITION, adr), []);
  assert.equal(g.adrPruefsumme(adr), g.pruefsumme());
});

test('[Definition·Rot-Beweis] ändert sich die Definition ohne ADR-Nachtrag, ist der Wächter rot', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gestaltung-adr-'));
  try {
    const geaendert = path.join(tmp, 'definition.json');
    fs.writeFileSync(geaendert, fs.readFileSync(g.DEFINITION, 'utf8').replace('"px": 4', '"px": 5'));
    const f = g.adrPruefen(geaendert, g.adrDatei());
    assert.equal(f.length, 1);
    assert.match(f[0], /Nachtrag in der ADR/);
    // ohne Prüfsummen-Zeile in der ADR
    const ohne = path.join(tmp, 'adr.md');
    fs.writeFileSync(ohne, fs.readFileSync(g.adrDatei(), 'utf8').replace(/^definition-pruefsumme:.*$/m, ''));
    assert.match(g.adrPruefen(g.DEFINITION, ohne)[0], /trägt keine Zeile/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Definition·f] ohne Argument läuft das Werkzeug gegen die Fixtures: gut grün, schief rot', () => {
  const aus = execFileSync(process.execPath, [WERKZEUG], { encoding: 'utf8' });
  assert.match(aus, /Fixture gut:\s+grün/);
  assert.match(aus, /Fixture schief: rot/);
});

test('[Definition·vorlagen] Schicht 3: je Feldart eine Grundregel, im Block der Stilquelle wie definiert, ohne Zahl', () => {
  const def = g.definitionLaden();
  const css = fs.readFileSync(g.GRUNDLAGE, 'utf8');
  assert.deepEqual(g.vorlagenPruefen(def.vorlagen), []);
  assert.deepEqual(g.vorlagenPruefenImCss(css, def), []);
  assert.deepEqual(def.vorlagen.arten.map((a) => a.art).sort(), ['feld-auswahl', 'feld-eingabe', 'feld-mehrzeilig']);
  // Feldform des Dummys 13.11.2026 (Entscheidung 25.11.2026): Rahmen ringsum, Fläche, Radius rundum
  for (const a of def.vorlagen.arten) assert.deepEqual([a.regeln.border, a.regeln['border-radius'], a.regeln['background-color']], ['var(--feld-rahmen)', 'var(--radius-feld)', 'var(--feld-flaeche)'], a.art);
  assert.ok(!/border-bottom/.test(JSON.stringify(def.vorlagen.arten)), 'Feldart mit Linie unten');
  // Die Profile tragen die Feldform nicht mehr selbst (eine Quelle), auch nicht in den Dialogen.
  const salbei = fs.readFileSync(path.join(path.dirname(g.GRUNDLAGE), 'salbei-glas.css'), 'utf8');
  assert.ok(!/^html:not\(\.high-contrast\) :is\(\.content, \.modal, \.suche-feld\)/m.test(salbei), 'salbei-glas.css trägt die Feldform im Inhalt noch selbst');
  const dummy = fs.readFileSync(path.join(path.dirname(g.GRUNDLAGE), 'dummy.css'), 'utf8');
  assert.ok(!/#suche-eingabe \{[^}]*border-bottom/.test(dummy), 'dummy.css trägt die Form des Suchfelds noch selbst');
});

test('[Definition·vorlagen·Rot-Beweis] Zahl im Wert, doppelte Art und veränderter Block fallen auf', () => {
  const def = g.definitionLaden();
  const kaputt = JSON.parse(JSON.stringify(def.vorlagen));
  kaputt.arten[0].regeln['min-height'] = '44px';
  kaputt.arten.push(JSON.parse(JSON.stringify(kaputt.arten[1])));
  const f = g.vorlagenPruefen(kaputt);
  assert.ok(f.some((x) => /44px|Wert/.test(x)), f.join(' | '));
  assert.ok(f.some((x) => /doppelte Art/.test(x)), f.join(' | '));
  const css0 = fs.readFileSync(g.GRUNDLAGE, 'utf8'); const im = css0.indexOf(g.VORLAGEN_MARKE_ANFANG);
  const css = css0.slice(0, im) + css0.slice(im).replace('background-color: var(--feld-flaeche);', 'background-color: #fff;');
  assert.equal(g.vorlagenPruefenImCss(css, def).length, 1);
  const ohne = fs.readFileSync(g.GRUNDLAGE, 'utf8').replace(g.VORLAGEN_MARKE_ANFANG, 'X');
  assert.deepEqual(g.vorlagenPruefenImCss(ohne, def), ['Block ' + g.VORLAGEN_MARKE_ANFANG + ' fehlt']);
});

test('[Definition·elemente] je Elementart eine Regel an ihrer Stelle in der Stilquelle, wie definiert', () => {
  const def = g.definitionLaden();
  const css = fs.readFileSync(g.GRUNDLAGE, 'utf8');
  assert.deepEqual(g.elementePruefen(def.vorlagen.elemente), []);
  assert.deepEqual(g.elementePruefenImCss(css, def), []);
  const arten = def.vorlagen.elemente.map((e) => e.art);
  for (const a of ['ueberschrift-1', 'ueberschrift-2', 'ueberschrift-3', 'fliesstext', 'hinweis', 'fehlermeldung', 'feldbeschriftung',
    'knopf-haupt', 'knopf-neben', 'knopf-text', 'stand-marke', 'karte', 'menue', 'dialog-rahmen']) assert.ok(arten.includes(a), a);
  // Die Grundregel steht vor ihren Abwandlungen: der Hauptknopf vor dem Nebenknopf, die Karte vor ihrer Handy-Fassung.
  assert.ok(css.indexOf(g.ELEMENT_MARKE('knopf-haupt')) < css.indexOf(g.ELEMENT_MARKE('knopf-neben')));
  assert.ok(css.indexOf(g.ELEMENT_MARKE('karte')) < css.indexOf('.karte { padding: var(--space-5) var(--space-4); border-radius: var(--radius-karte-schmal); }'));
});

test('[Definition·elemente·Rot-Beweis] Maß außer der Haarlinie, fehlende Marke und veränderte Regel fallen auf', () => {
  const def = g.definitionLaden();
  const kaputt = JSON.parse(JSON.stringify(def.vorlagen.elemente));
  kaputt[0].regeln.margin = '3px';
  assert.ok(g.elementePruefen(kaputt).some((x) => /3px/.test(x)));
  const css = fs.readFileSync(g.GRUNDLAGE, 'utf8');
  const ohne = css.replace(g.ELEMENT_MARKE('karte'), '/* x */');
  assert.ok(g.elementePruefenImCss(ohne, def).some((x) => /karte: Marke 0-mal/.test(x)));
  const marke = css.indexOf(g.ELEMENT_MARKE('karte'));
  const zeileAb = css.indexOf('\n', marke) + 1;
  const zeile = css.slice(zeileAb, css.indexOf('\n', zeileAb));
  assert.match(zeile, /border-radius: var\(--radius-6\)/, 'Vorbedingung: die Kartenzeile trägt ihre Rundung');
  const schief = css.slice(0, zeileAb) + zeile.replace('border-radius: var(--radius-6)', 'border-radius: var(--radius-1)') + css.slice(zeileAb + zeile.length);
  assert.ok(g.elementePruefenImCss(schief, def).some((x) => /karte: Regel weicht ab|Element karte/.test(x)));
});

test('[Definition·formate] VD-FORMATE: gebacken wie die Quelle, hängt nur an der Wurzelklasse und den .vd-Klassen', () => {
  const block = fs.readFileSync(g.FORMATE, 'utf8');
  assert.equal(block, g.vorlagenBacken());
  assert.deepEqual(g.formatePruefen(g.definitionLaden()), []);
  const regeln = block.split('\n').filter((z) => z && !z.startsWith('/*') && !z.startsWith('@media') && !z.startsWith('html.dark-mode'));
  for (const z of regeln) assert.match(z, /^\.vd-formate( (:is\()?\.vd-[a-z0-9-]+(, \.vd-[a-z0-9-]+)*\)?)? \{/, z.slice(0, 80));
  // Jedes Token, das eine Regel nennt, steht in der Wurzel (selbsttragend).
  const wurzel = regeln[0];
  for (const n of new Set([...block.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]))) assert.ok(wurzel.includes(n + ':'), n);
  assert.ok(/html\.dark-mode \.vd-formate/.test(block) && /@media \(max-width: 767px\)/.test(block));
  // Rot-Beweis: eine andere Wurzel ist ein anderer Block; ein Wert ohne Token im Modul bricht ab.
  assert.notEqual(g.vorlagenBacken({ wurzel: '.anders' }), block);
  const def = g.definitionLaden(); def.vorlagen.elemente[0].regeln.color = 'var(--gibt-es-nicht)';
  assert.throws(() => g.vorlagenBacken({ def }), /gibt-es-nicht/);
});

test('[Definition·grundwerte-25-11] Rot-Beweis: Lücke in der Radienreihe, ein Wert mit zwei Namen, Gewicht ohne Zahl und doppelter Zwischenabstand fallen auf', () => {
  const def = g.definitionLaden();
  assert.deepEqual(g.definitionPruefen(def), []);
  const k = () => JSON.parse(JSON.stringify(def));
  const a = k(); a.grundwerte.radien = a.grundwerte.radien.filter((r) => r.token !== '--radius-3');
  assert.ok(g.definitionPruefen(a).some((x) => /lückenlos/.test(x)));
  const b = k(); b.grundwerte.gewichte.push({ token: '--fw-doppelt', wert: '600' });
  assert.ok(g.definitionPruefen(b).some((x) => /zwei Namen/.test(x)));
  const c = k(); c.grundwerte.gewichte[0].wert = 'normal';
  assert.ok(g.definitionPruefen(c).some((x) => /Schriftgewicht/.test(x)));
  const d = k(); d.grundwerte.abstaende.zwischen.push({ token: '--abstand-9-9', px: 16 });
  assert.ok(g.definitionPruefen(d).some((x) => /hat schon einen Namen/.test(x)));
  const e = k(); e.grundwerte.radien.push({ token: '--radius-kreis', wert: '40%' });
  assert.ok(g.definitionPruefen(e).some((x) => /50%/.test(x)));
});
