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
  assert.ok(css.includes('--treffer: 48px;'));
});

test('[Definition·c] Rot-Beweis: ein verändertes Maß im Block und ein fehlender Block machen --check rot', () => {
  const def = g.definitionLaden();
  const css = fs.readFileSync(g.GRUNDLAGE, 'utf8');
  assert.equal(g.blockPruefen(css.replace('--radius-klein: 10px', '--radius-klein: 11px'), def).length, 1);
  assert.equal(g.blockPruefen(css.replace(g.MARKE_ANFANG, 'WEG'), def).length, 1);
  // über den Aufruf: --check gegen eine Kopie mit verändertem Block
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gestaltung-def-'));
  try {
    const kopie = path.join(tmp, 'grundlage.css');
    fs.writeFileSync(kopie, css.replace('--treffer: 48px', '--treffer: 44px'));
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
