'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ADR-Referenzen-Wächter rotmachbar — Posten 2, Auftrag
   ADR_Referenzen_und_Auflagen_Rubrik (03.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tools/adr-referenzen-pruefen.js` sammelt jede `U2-ADR-<Zahl>`/`ADR-<Zahl>`-
   Referenz in `vivodepot.html` und `tools/` und prüft sie gegen die ADR-Dateien
   unter `docs/adr/`. Geprüft hier: die Sammel-/Prüffunktion selbst, und
   Rotmachbarkeit gegen eine Kopie (nie im Arbeitsbaum).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { adrNummernAusDateinamen, pruefeQuellen } = require('../tools/adr-referenzen-pruefen.js');

const REPO = path.join(__dirname, '..');
const PRODUKT = path.join(REPO, 'vivodepot.html');

/* ── 1 · DIE SAMMLUNG SELBST ─────────────────────────────────────────────────── */

test('[ADR-Referenzen-Wächter] "U2-ADR-100" zählt als EIN Treffer, nicht als U2-ADR- und ADR- getrennt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-waechter-'));
  const datei = path.join(tmp, 'probe.js');
  fs.writeFileSync(datei, '// Begründung siehe U2-ADR-100.\n');
  try {
    const { referenzen } = pruefeQuellen([datei], new Set([100]));
    assert.equal(referenzen.length, 1);
    assert.equal(referenzen[0].nummer, 100);
    assert.equal(referenzen[0].zeile, 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[ADR-Referenzen-Wächter] eine bekannte Nummer bleibt unbeanstandet', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-waechter-'));
  const datei = path.join(tmp, 'probe.js');
  fs.writeFileSync(datei, '// ADR-22 kennt das.\n');
  try {
    const { unbekannt } = pruefeQuellen([datei], new Set([22]));
    assert.deepEqual(unbekannt, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[ADR-Referenzen-Wächter] eine erfundene Nummer landet in `unbekannt`, mit Fundstelle', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-waechter-'));
  const datei = path.join(tmp, 'probe.js');
  fs.writeFileSync(datei, 'zeile eins\n// U2-ADR-9999 gibt es nicht.\n');
  try {
    const { unbekannt } = pruefeQuellen([datei], new Set([1, 2, 3]));
    assert.equal(unbekannt.length, 1);
    assert.equal(unbekannt[0].nummer, 9999);
    assert.equal(unbekannt[0].zeile, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[ADR-Referenzen-Wächter] die ADR-Nummern-Menge kommt exakt aus den Dateinamen unter docs/adr/', () => {
  const nummern = adrNummernAusDateinamen();
  assert.ok(nummern.has(1), 'ADR-001 muss gefunden werden');
  assert.ok(nummern.has(100), 'ADR-100 muss gefunden werden');
  assert.ok(!nummern.has(9999), 'eine nicht existierende Nummer darf nicht auftauchen');
});

/* ── 2 · ROTMACHBARKEIT: gepflanzt auf einer KOPIE, nie im Baum ─────────────── */

function gateGegenKopie(inhalt) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-waechter-gate-'));
  const f = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(f, inhalt);
  const leererToolsOrdner = path.join(tmp, 'tools-leer');
  fs.mkdirSync(leererToolsOrdner);
  try {
    const r = cp.spawnSync('node', ['tools/adr-referenzen-pruefen.js', '--gate'], {
      cwd: REPO,
      encoding: 'utf8',
      env: { ...process.env, KERN_HTML_PATH: f, ADR_TOOLS_PATH: leererToolsOrdner },
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('[ADR-Referenzen-Wächter] Negativkontrolle: die unveränderte Kopie lässt das Gate grün', () => {
  const html = fs.readFileSync(PRODUKT, 'utf8');
  const r = gateGegenKopie(html);
  assert.equal(r.code, 0, 'Gegen den heutigen Stand darf das Gate nicht rot sein. Ausgabe:\n' + r.out.slice(-300));
});

test('[ADR-Referenzen-Wächter] Positivkontrolle: eine erfundene ADR-Nummer macht das Gate ROT', () => {
  const html = fs.readFileSync(PRODUKT, 'utf8');
  const anker = '<!DOCTYPE html>';
  assert.equal(html.split(anker).length - 1, 1, 'Der Pflanz-Anker muss genau einmal vorkommen.');
  const gepflanzt = html.replace(anker, anker + '\n<!-- U2-ADR-9999 gibt es nicht -->');
  const r = gateGegenKopie(gepflanzt);
  assert.equal(r.code, 1, 'Eine erfundene ADR-Nummer MUSS rot machen. Ausgabe:\n' + r.out.slice(-300));
  assert.match(r.out, /U2-ADR-9999/, 'Das Rot muss die erfundene Nummer beim Namen nennen.');
});

/* ── 3 · GEGEN DAS ECHTE PRODUKT: keine unbekannte Referenz heute ───────────── */

test('[ADR-Referenzen-Wächter] das echte Produkt trägt heute keine unbekannte ADR-Referenz', () => {
  const r = cp.spawnSync('node', ['tools/adr-referenzen-pruefen.js', '--gate'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, 'Das Gate ist gegen den eingecheckten Stand rot. Ausgabe:\n'
    + ((r.stdout || '') + (r.stderr || '')).slice(-600));
});
