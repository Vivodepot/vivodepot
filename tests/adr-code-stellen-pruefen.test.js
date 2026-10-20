'use strict';
/* tools/adr-code-stellen-pruefen.js — meldet in ADRs genannte Bezeichner, die im Code nirgends
   mehr als Definition stehen (20.09.2026, Fund `angehoerigenEintritt()`).
   Rot-Beweis läuft gegen selbst gebaute Wegwerf-Fixtures, nicht gegen den echten ADR-Bestand —
   der echte Bestand ändert sich mit jedem Fix, eine Probe gegen ihn würde beim Beheben selbst rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  pruefe, kandidatenAusZeile, istKandidatenName, existiertLebendig, kommentareEntfernen, AUSNAHMEN, OFFEN,
} = require('../tools/adr-code-stellen-pruefen.js');

test('[Kandidatenname] camelCase und Unterstrich-Präfix gelten, kurze/nicht-camelCase Wörter nicht', () => {
  assert.equal(istKandidatenName('angehoerigenEintritt'), true);
  assert.equal(istKandidatenName('_angDeriveKey'), true);
  assert.equal(istKandidatenName('STRINGS'), false, 'kein Kleinbuchstabe-Großbuchstabe-Übergang, kein Unterstrich-Präfix');
  assert.equal(istKandidatenName('K'), false, 'unter Mindestlänge');
  assert.equal(istKandidatenName('data'), false, 'reines Kleinwort, kein camelCase, kein Unterstrich');
});

test('[Kandidaten aus Zeile] extrahiert Backtick-Bezeichner mit und ohne Klammern, dedupliziert, merkt sich Klammer-Signal', () => {
  const zeile = 'über `angehoerigenEintritt()`, NICHT über `depotLaden()`, siehe auch `_internerUmschlagRoh` und `_internerUmschlagRoh` noch einmal.';
  const gefunden = kandidatenAusZeile(zeile).sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(gefunden, [
    { name: '_internerUmschlagRoh', mitKlammern: false },
    { name: 'angehoerigenEintritt', mitKlammern: true },
    { name: 'depotLaden', mitKlammern: true },
  ]);
});

test('[Kandidaten aus Zeile] ignoriert Nicht-Kandidaten wie STRINGS, PascalCase-Typnamen oder kurze Wörter', () => {
  assert.deepEqual(kandidatenAusZeile('`STRINGS` und `K` und `data` und `CodeableConcept` bleiben draußen'), []);
});

test('[Kommentare entfernen] Zeilen-Kommentare ab Zeilenanfang und Block-Kommentare verschwinden, Code bleibt', () => {
  const text = '// angehoerigenEintritt() wurde entfernt.\nconst x = 1;\n/* Block\nüber\nmehrere Zeilen */\nconst y = 2;\n';
  const bereinigt = kommentareEntfernen(text);
  assert.doesNotMatch(bereinigt, /angehoerigenEintritt/);
  assert.doesNotMatch(bereinigt, /Block|mehrere Zeilen/);
  assert.match(bereinigt, /const x = 1;/);
  assert.match(bereinigt, /const y = 2;/);
});

test('[Existenz] lebt als Funktion, Datenfeld-Schlüssel oder sonstiges Wortvorkommen im (bereinigten) Code', () => {
  assert.equal(existiertLebendig('foo', [kommentareEntfernen('function foo() { return 1; }')]), true);
  assert.equal(existiertLebendig('bar', [kommentareEntfernen('const bar = () => 1;')]), true);
  assert.equal(existiertLebendig('ablaufDatum', [kommentareEntfernen('{ ablaufDatum: null, x: 1 }')]), true,
    'ein Datenfeld ist keine Funktionsdefinition und muss trotzdem als lebendig gelten');
});

test('[Existenz] eine Erwähnung NUR in einem Zeilen- oder Block-Kommentar zählt nicht als lebendig', () => {
  assert.equal(
    existiertLebendig('angehoerigenEintritt', [kommentareEntfernen('// angehoerigenEintritt() wurde entfernt, siehe ADR.')]),
    false,
    'genau der Fall, der den echten Fund bisher durchrutschen ließ',
  );
  assert.equal(
    existiertLebendig('angehoerigenEintritt', [kommentareEntfernen('/* F5 Zug 2: angehoerigenEintritt SIND HIER entfernt */\nconst andereSache = 1;')]),
    false,
  );
});

test('[Kommentare entfernen] escaped Sonderzeichen im Namen, wirft nicht', () => {
  assert.doesNotThrow(() => existiertLebendig('a.b$c', ['a.b$c irgendwo']));
});

/* ── Rot-Beweis: eigene Wegwerf-Fixtures, kein Griff in den echten ADR-Bestand ────────── */

function tempOrdnerBauen() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adr-code-stellen-probe-'));
}

test('[Rot-Beweis] eine ADR-Nennung ohne Code-Definition wird gefunden, eine mit Definition nicht', () => {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  try {
    fs.writeFileSync(
      path.join(adrOrdner, 'vivodepot-U2-ADR-999-probe-2026-09-20.md'),
      '# U2-ADR-999: Probe\n\n' +
      '`umschlagEntpacken(roh)` (`vivodepot.html:7842`) hebt eine Blackbox-Hülle auf die oberste Ebene;\n' +
      'verdrahtet in `cryptoOverlayOeffnen` und `angehoerigenEintritt`, direkt nach dem Parse.\n' +
      'Und `nochVorhandeneFunktion()` bleibt unberührt.\n',
    );
    const codeDatei = path.join(codeOrdner, 'kern-probe.html');
    fs.writeFileSync(codeDatei, 'function umschlagEntpacken() {}\nfunction cryptoOverlayOeffnen() {}\nfunction nochVorhandeneFunktion() {}\n');

    const funde = pruefe({ adrOrdner, codeDateien: [codeDatei] });
    const namen = funde.map((f) => f.name).sort();

    assert.deepEqual(namen, ['angehoerigenEintritt'],
      'nur der Name ohne Code-Definition darf gemeldet werden — umschlagEntpacken, cryptoOverlayOeffnen und nochVorhandeneFunktion existieren, und sie stehen alle nah genug an der vivodepot.html-Nennung bzw. tragen Klammern, um überhaupt als Kandidat zu zählen');
    assert.equal(funde[0].datei, 'vivodepot-U2-ADR-999-probe-2026-09-20.md');
    assert.equal(funde[0].zeile, 4);
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
    fs.rmSync(codeOrdner, { recursive: true, force: true });
  }
});

test('[Rot-Beweis] ohne jede Code-Datei mit der Definition wird auch eine sonst gültige Nennung gemeldet', () => {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  try {
    fs.writeFileSync(
      path.join(adrOrdner, 'vivodepot-U2-ADR-998-probe-2026-09-20.md'),
      '# U2-ADR-998: Probe\n\nSiehe `schliessenWarnungNoetig()`.\n',
    );
    const codeDatei = path.join(codeOrdner, 'leer.html');
    fs.writeFileSync(codeDatei, '<html></html>\n');

    const funde = pruefe({ adrOrdner, codeDateien: [codeDatei] });
    assert.deepEqual(funde.map((f) => f.name), ['schliessenWarnungNoetig'],
      'die Probe muss wirklich am Code messen, nicht an einer eingebauten Positivliste');
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
    fs.rmSync(codeOrdner, { recursive: true, force: true });
  }
});

test('[Gegenprobe] ein Name ohne Klammern UND ohne nahe Datei-Nennung wird NICHT gemeldet — reines Datenfeld-Rauschen', () => {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  try {
    fs.writeFileSync(
      path.join(adrOrdner, 'vivodepot-U2-ADR-996-probe-2026-09-20.md'),
      '# U2-ADR-996: Probe\n\n' +
      'Das Feld `dataAbsentReason` beschreibt, warum ein Wert fehlt.\n\n' +
      'Weiterer Fließtext ohne jede Datei-Nennung in der Nähe.\n',
    );
    const codeDatei = path.join(codeOrdner, 'leer.html');
    fs.writeFileSync(codeDatei, '<html></html>\n');
    assert.deepEqual(pruefe({ adrOrdner, codeDateien: [codeDatei] }), [],
      'dataAbsentReason existiert nirgends im Code UND hat kein Funktions-Signal — genau der Rauschen-Fall des ersten, ungefilterten Laufs (1127 Treffer)');
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
    fs.rmSync(codeOrdner, { recursive: true, force: true });
  }
});

test('[Gegenprobe] eine Datei ohne Kandidaten-Bezeichner erzeugt keinen Fund', () => {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  try {
    fs.writeFileSync(
      path.join(adrOrdner, 'vivodepot-U2-ADR-997-probe-2026-09-20.md'),
      '# U2-ADR-997: Probe\n\nNur `STRINGS` und `K` und `data`, keine Kandidaten.\n',
    );
    const codeDatei = path.join(codeOrdner, 'leer.html');
    fs.writeFileSync(codeDatei, '<html></html>\n');
    assert.deepEqual(pruefe({ adrOrdner, codeDateien: [codeDatei] }), []);
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
    fs.rmSync(codeOrdner, { recursive: true, force: true });
  }
});

test('[Selbst-Ausschluss] die echte pruefe()-Voreinstellung zieht ihre eigenen zwei Dateien nicht in die Code-Basis', () => {
  const adrOrdner = tempOrdnerBauen();
  try {
    // Realer Fund beim Bauen: dieser Wächter nennt `angehoerigenEintritt` selbst als
    // Beispiel/Fixture — ohne Selbst-Ausschluss „lebte" der Name wieder, weil der Wächter über
    // die eigenen Zeichenketten stolperte, statt über echten Produktcode.
    fs.writeFileSync(
      path.join(adrOrdner, 'vivodepot-U2-ADR-995-probe-2026-09-20.md'),
      '# U2-ADR-995: Probe\n\n`angehoerigenEintritt()` steht in `vivodepot.html`.\n',
    );
    const funde = pruefe({ adrOrdner }); // codeDateien NICHT übergeben — echte Voreinstellung
    assert.ok(funde.some((f) => f.name === 'angehoerigenEintritt'),
      'muss trotz der eigenen Erwähnungen in tools/adr-code-stellen-pruefen.js und seiner Testdatei gefunden werden');
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
  }
});

/* ── Nachgezogene Funde: Vermerk mit dem Werkzeugnamen, oder eine Fehlen-Aussage im Text ─────── */

test('[Nachgezogen] ein toter Name mit Vermerk `adr-code-stellen-pruefen` in ±2 Zeilen wird nicht gemeldet, ohne Vermerk schon', () => {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  try {
    fs.writeFileSync(path.join(adrOrdner, 'vivodepot-U2-ADR-994-probe-2026-10-18.md'),
      '# U2-ADR-994: Probe\n\nSiehe `alteFunktionWeg()` (Stand 01.01.2026,\nseither nicht mehr im Kern,\nFund 18.10.2026, `tools/adr-code-stellen-pruefen.js`).\n');
    fs.writeFileSync(path.join(adrOrdner, 'vivodepot-U2-ADR-993-probe-2026-10-18.md'),
      '# U2-ADR-993: Probe\n\nSiehe `alteFunktionWeg()`.\n');
    const codeDatei = path.join(codeOrdner, 'leer.html');
    fs.writeFileSync(codeDatei, '<html></html>\n');
    const funde = pruefe({ adrOrdner, codeDateien: [codeDatei] });
    assert.deepEqual(funde.map((f) => f.datei), ['vivodepot-U2-ADR-993-probe-2026-10-18.md'],
      'der Vermerk gilt nur in der ADR, die ihn trägt');
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
    fs.rmSync(codeOrdner, { recursive: true, force: true });
  }
});

test('[Nachgezogen] eine Fehlen-Aussage gilt nur ±1 Zeile: auf derselben Zeile still, drei Zeilen weiter rot', () => {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  try {
    fs.writeFileSync(path.join(adrOrdner, 'vivodepot-U2-ADR-992-probe-2026-10-18.md'),
      '# U2-ADR-992: Probe\n\n`ersteWegFunktion()` wurde gebaut und wieder entfernt.\n\n\n\n`zweiteWegFunktion()` steht hier.\n');
    const codeDatei = path.join(codeOrdner, 'leer.html');
    fs.writeFileSync(codeDatei, '<html></html>\n');
    assert.deepEqual(pruefe({ adrOrdner, codeDateien: [codeDatei] }).map((f) => f.name), ['zweiteWegFunktion']);
  } finally {
    fs.rmSync(adrOrdner, { recursive: true, force: true });
    fs.rmSync(codeOrdner, { recursive: true, force: true });
  }
});

/* ── Nur U2, anderswo bekannt, Ausnahmen und offene Funde (18.10.2026) ─────────────────── */

function fallBauen(dateien, codeText = '<html></html>\n') {
  const adrOrdner = tempOrdnerBauen();
  const codeOrdner = tempOrdnerBauen();
  for (const [name, text] of Object.entries(dateien)) fs.writeFileSync(path.join(adrOrdner, name), text);
  const codeDatei = path.join(codeOrdner, 'leer.html');
  fs.writeFileSync(codeDatei, codeText);
  return { adrOrdner, codeOrdner, codeDatei, weg: () => { fs.rmSync(adrOrdner, { recursive: true, force: true }); fs.rmSync(codeOrdner, { recursive: true, force: true }); } };
}

test('[Nur U2] eine B16-ADR mit totem Namen wird nicht gemessen, dieselbe Zeile in einer U2-ADR schon', () => {
  const fall = fallBauen({
    'vivodepot-B16-ADR-991-probe-2026-05-01.md': '# B16-ADR-991\n\nSiehe `vorgaengerFunktion()`.\n',
    'vivodepot-U2-ADR-991-probe-2026-10-18.md': '# U2-ADR-991\n\nSiehe `vorgaengerFunktion()`.\n',
  });
  try {
    assert.deepEqual(pruefe({ adrOrdner: fall.adrOrdner, codeDateien: [fall.codeDatei], jsonDateien: [] }).map((f) => f.datei),
      ['vivodepot-U2-ADR-991-probe-2026-10-18.md']);
  } finally { fall.weg(); }
});

test('[Schwesterrepo] ein Name neben „im Gateway" oder einem Pfad src/ gilt als bekannt, ohne Nennung nicht', () => {
  const fall = fallBauen({
    'vivodepot-U2-ADR-990-probe-2026-10-18.md': '# U2-ADR-990\n\n`gatewayBauen()` im Gateway.\n\nsrc/rezept.js (`rezeptHolen()`)\n\n\n\n`nirgendsFunktion()` steht hier.\n',
  });
  try {
    assert.deepEqual(pruefe({ adrOrdner: fall.adrOrdner, codeDateien: [fall.codeDatei], jsonDateien: [] }).map((f) => f.name),
      ['nirgendsFunktion']);
  } finally { fall.weg(); }
});

test('[JSON-Schlüssel] ein Datenschlüssel aus einer übergebenen .json gilt als bekannt, ohne die Datei nicht', () => {
  const fall = fallBauen({
    'vivodepot-U2-ADR-989-probe-2026-10-18.md': '# U2-ADR-989\n\nIn `tools/x.js` steht `feldSchluesselA` je Feld.\n',
  });
  const json = path.join(fall.codeOrdner, 'felder.json');
  fs.writeFileSync(json, JSON.stringify({ felder: [{ feldSchluesselA: true }] }));
  try {
    assert.deepEqual(pruefe({ adrOrdner: fall.adrOrdner, codeDateien: [fall.codeDatei], jsonDateien: [json] }), []);
    assert.deepEqual(pruefe({ adrOrdner: fall.adrOrdner, codeDateien: [fall.codeDatei], jsonDateien: [] }).map((f) => f.name),
      ['feldSchluesselA']);
  } finally { fall.weg(); }
});

test('[Ausnahmen/Offen] ein Eintrag „U2-ADR-NNN/name" nimmt genau diesen Fund heraus, nicht denselben Namen in einer anderen ADR', () => {
  const fall = fallBauen({
    'vivodepot-U2-ADR-988-probe-2026-10-18.md': '# U2-ADR-988\n\nSiehe `fremdesApiFeld()`.\n',
    'vivodepot-U2-ADR-987-probe-2026-10-18.md': '# U2-ADR-987\n\nSiehe `fremdesApiFeld()`.\n',
  });
  try {
    const basis = { adrOrdner: fall.adrOrdner, codeDateien: [fall.codeDatei], jsonDateien: [] };
    assert.deepEqual(pruefe({ ...basis, ausnahmen: { 'U2-ADR-988/fremdesApiFeld': 'Probe' }, offen: {} }).map((f) => f.datei),
      ['vivodepot-U2-ADR-987-probe-2026-10-18.md']);
    assert.deepEqual(pruefe({ ...basis, ausnahmen: {}, offen: { 'U2-ADR-987/fremdesApiFeld': 'Probe' } }).map((f) => f.datei),
      ['vivodepot-U2-ADR-988-probe-2026-10-18.md']);
  } finally { fall.weg(); }
});

test('[Ausnahmen/Offen] jeder Eintrag trägt einen Grund und hat die Form U2-ADR-NNN/name', () => {
  for (const liste of [AUSNAHMEN, OFFEN]) {
    for (const [k, grund] of Object.entries(liste)) {
      assert.match(k, /^U2-ADR-\d+\/[A-Za-z_$][A-Za-z0-9_$]*$/);
      assert.ok(typeof grund === 'string' && grund.length > 10, `Grund fehlt: ${k}`);
    }
  }
});

/* ── Sanity gegen den echten Bestand: läuft ohne zu werfen, liefert eine Liste ─────────
   Kein Zahlen-/Namens-Anker gegen den echten Bestand — der ändert sich mit jedem Fund-Fix
   (die echten Funde werden im ADR-Text nachgezogen). */
test('[Sanity] pruefe() läuft gegen den echten ADR-/Code-Bestand ohne zu werfen und liefert eine Liste', () => {
  const funde = pruefe();
  assert.ok(Array.isArray(funde));
  for (const f of funde) {
    assert.equal(typeof f.datei, 'string');
    assert.equal(typeof f.zeile, 'number');
    assert.equal(typeof f.name, 'string');
  }
});
