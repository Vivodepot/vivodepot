'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Abdeckungsweg — Zeilentreue der Temp-Datei rotmachbar (Auftrag „Belegkette
   und Lücken", Glied 1, 14./15.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tests/load-kern.js` lädt den Kern normal über `new Function(...)` — trägt
   keine Source-URL, V8-Coverage kann ausgeführte Zeilen nicht auf
   `vivodepot.html` zurückabbilden (dreifach belegt, Abdeckungs-Bericht
   14.08.2026). Mit `KERN_ABDECKUNG_TEMPDATEI=1` schreibt `ladeKern()`
   stattdessen eine reale Temp-Datei, deren Zeilennummern für script1/script2
   EXAKT denen von `vivodepot.html` entsprechen (Blank-Rekonstruktion:
   alles außerhalb der beiden `<script>`-Körper wird durch Leerzeichen
   ersetzt, Zeilenumbrüche bleiben stehen — die Übereinstimmung folgt aus der
   Konstruktion, nicht aus einer von Hand berechneten `lineOffset`-Zahl, die
   falsch sein könnte).

   Geprüft hier: (1) die Rekonstruktion selbst hat exakt so viele Zeilen wie
   die Quelle und script1/script2 landen an der richtigen Stelle; (2) ROT-
   BELEG mit echtem V8-Coverage-Lauf — eine bekannt ausgeführte Zeile
   (`uuidV4`-Körper, aufgerufen) zeigt sich als ausgeführt, eine bekannt NIE
   ausgeführte (`subDepotBlackboxExportieren`-Körper, nicht aufgerufen) zeigt
   sich als nicht ausgeführt — beide Zeilennummern real gegen `vivodepot.html`
   nachgeschlagen, nicht angenommen; (3) der Normalbetrieb (`new Function`,
   ohne die Umgebungsvariable) bleibt unverändert unangetastet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern, extrahiereScripts, baueZeilentreueQuelle, HTML_PATH } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

/* ── 1 · Die Rekonstruktion selbst ────────────────────────────────────────── */

test('[Abdeckungsweg] baueZeilentreueQuelle erhält die Zeilenzahl und platziert Inhalt an der richtigen Zeile', () => {
  const html = 'AAAA\nBBBB\nCCCC\nDDDD\n';
  // "BBBB" (Zeile 2) ist der "Script"-Körper, der Rest wird blankiert.
  const start = html.indexOf('BBBB');
  const out = baueZeilentreueQuelle(html, [[start, start + 4]]);
  const zeilenIn = html.split('\n');
  const zeilenOut = out.split('\n');
  assert.equal(zeilenOut.length, zeilenIn.length, 'Zeilenzahl bleibt exakt erhalten');
  assert.equal(zeilenOut[1].trim(), 'BBBB', 'der bewahrte Körper steht auf derselben Zeile wie im Original');
  assert.equal(zeilenOut[0].trim(), '', 'Zeile 1 (außerhalb der bounds) ist blankiert');
  assert.equal(zeilenOut[2].trim(), '', 'Zeile 3 (außerhalb der bounds) ist blankiert');
});

test('[Abdeckungsweg] gegen den echten Kern: script1/script2 landen auf ihrer wahren Zeile', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const { script1, script2, bounds } = extrahiereScripts(html);
  const out = baueZeilentreueQuelle(html, bounds);
  assert.equal(out.split('\n').length, html.split('\n').length);
  // Der bewahrte Text an den ursprünglichen Zeichen-Offsets ist identisch mit script1/script2 —
  // die Rekonstruktion verändert innerhalb der bounds kein einziges Zeichen.
  const [[o1, c1], [o2, c2]] = bounds;
  assert.equal(out.slice(o1, c1), script1);
  assert.equal(out.slice(o2, c2), script2);
});

/* ── 2 · ROT-BELEG — echter V8-Coverage-Lauf ─────────────────────────────── */

test('[Abdeckungsweg] Rot-Beleg: bekannt ausgeführte Zeile zeigt ausgeführt, bekannt nie ausgeführte zeigt nicht ausgeführt', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const zeilen = html.split('\n');
  // Bekannt AUSGEFÜHRT: uuidV4()-Körper, wird von der Probe unten real aufgerufen.
  const zeileAusgefuehrt = zeilen.findIndex((z) => /const b = crypto\.getRandomValues\(new Uint8Array\(16\)\);/.test(z)) + 1;
  // Bekannt NIE AUSGEFÜHRT: subDepotBlackboxExportieren()-Körper, wird von der Probe nie aufgerufen.
  const zeileNieAusgefuehrt = zeilen.findIndex((z) => z.includes("if (!verwaltungAktiv(eintrag))")) + 1;
  assert.ok(zeileAusgefuehrt > 0, 'uuidV4-Körperzeile im echten Kern gefunden');
  assert.ok(zeileNieAusgefuehrt > 0, 'subDepotBlackboxExportieren-Körperzeile im echten Kern gefunden');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abdeckungsweg-rotbeleg-'));
  const covDir = path.join(tmp, 'cov');
  fs.mkdirSync(covDir);
  const probeDatei = path.join(tmp, 'probe.js');
  fs.writeFileSync(probeDatei,
    `const { ladeKern } = require(${JSON.stringify(path.join(__dirname, 'load-kern.js'))});\n` +
    `const { V } = ladeKern();\n` +
    `V.uuidV4();\n`
  );
  try {
    execFileSync('node', [probeDatei], {
      cwd: REPO,
      env: { ...process.env, NODE_V8_COVERAGE: covDir, KERN_ABDECKUNG_TEMPDATEI: '1' },
    });
    const covDatei = fs.readdirSync(covDir).find((f) => f.startsWith('coverage-'));
    assert.ok(covDatei, 'V8 hat eine Coverage-Datei geschrieben');
    const cov = JSON.parse(fs.readFileSync(path.join(covDir, covDatei), 'utf8'));
    const entry = cov.result.find((r) => r.url.includes('vivodepot-kern-abdeckung'));
    assert.ok(entry, 'die Abdeckungs-Temp-Datei erscheint als eigene Coverage-URL — genau das, was `new Function` nicht kann');

    const tempQuelle = fs.readFileSync(entry.url.replace('file://', ''), 'utf8');
    const tempZeilen = tempQuelle.split('\n');
    const offsetVonZeile = (n) => tempZeilen.slice(0, n - 1).reduce((s, z) => s + z.length + 1, 0);
    const ausgefuehrtAnZeile = (n) => {
      const off = offsetVonZeile(n);
      for (const fn of entry.functions) {
        for (const r of fn.ranges) {
          if (off >= r.startOffset && off < r.endOffset && r.count === 0) return false;
        }
      }
      return true;
    };

    assert.equal(tempZeilen[zeileAusgefuehrt - 1].trim(), zeilen[zeileAusgefuehrt - 1].trim(),
      'Zeileninhalt in der Temp-Datei deckt sich mit vivodepot.html an derselben Zeilennummer');
    assert.equal(ausgefuehrtAnZeile(zeileAusgefuehrt), true, 'bekannt ausgeführte Zeile zeigt sich als ausgeführt');
    assert.equal(ausgefuehrtAnZeile(zeileNieAusgefuehrt), false, 'bekannt nie ausgeführte Zeile zeigt sich als nicht ausgeführt');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* ── 3 · Normalbetrieb unangetastet ──────────────────────────────────────── */

test('[Abdeckungsweg] ohne die Umgebungsvariable bleibt der Normalbetrieb (new Function) unverändert', async () => {
  const { V } = ladeKern();
  assert.equal(typeof V.depotAnlegen, 'function');
  assert.equal(typeof V.uuidV4, 'function');
  const id = V.uuidV4();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
