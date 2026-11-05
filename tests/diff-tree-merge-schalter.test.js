'use strict';
/* Klassen-Wächter zum Befund MERGE-AUSSENTEXT-OHNE-TRAILER (02.11.2026): `git diff-tree` auf einen einzelnen Commit gibt
   für einen Merge nichts aus. Ein Prüfer, der so die Dateien eines Commits liest, sieht in einem Merge keine Datei und
   lässt ihn durch. Jeder diff-tree-Aufruf in tools/, hooks/ und scripts/ trägt deshalb einen Merge-Schalter
   (--diff-merges=…, --cc, -c, -m oder die Konstante MERGE_GEGEN_ERSTEN) — oder er steht mit Grund in
   tools/diff-tree-merge-grundlinie.json (samt interner Ergänzung). Die Grundlinie gilt exakt: ein neuer Aufruf ist rot, ein behobener auch,
   bis die Anzahl gesenkt ist. Die Anzahlen bewacht das Register der Gegenlesung (Kennung diff-tree-merge-grundlinie): Anheben braucht den Trailer,
   Senken ist frei. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { lesenMitErgaenzung } = require('../tools/lib/mit-interner-ergaenzung.js');

const WURZEL = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = 'tools/diff-tree-merge-grundlinie.json';
// Geteilt in der Quelle: die Liste nennt nur Dateien, die hinausgehen; Aufrufe in Dateien, die drinnen bleiben, stehen in ihrer
// internen Ergänzung. Drinnen liest die Probe beide Teile, öffentlich nur den ersten.
const GRUNDLINIE = lesenMitErgaenzung(path.join(WURZEL, GRUNDLINIE_PFAD));
const SCHALTER = /--diff-merges|--cc\b|'-c'|"-c"|'-m'|"-m"|\s-m\s|\s-c\s|MERGE_GEGEN_ERSTEN/;

function istJs(d) { return /\.(c|m)?js$/.test(d); }
function zuPruefen(d) { return istJs(d) || /\.(sh|py)$/.test(d) || /^hooks\/[^/.]+$/.test(d); }
const IST_KOMMENTAR = /^\s*(\/\/|\/\*|\*|#)/;
const FUNKTION = /^(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\(|^\s*def\s+([A-Za-z0-9_]+)\s*\(|^([A-Za-z0-9_]+)\s*\(\)\s*\{/gm;

/* Zählt je „Datei Funktion“ die diff-tree-Aufrufe ohne Merge-Schalter. Zwei Formen:
   (a) in JS und Python das Literal 'diff-tree' als eigenes Argument, bis zur schließenden Klammer der Argumentliste;
   (b) in jeder Datei „git [-c k=v | -C pfad]… diff-tree“ in einer Zeile, die kein Kommentar ist (Shell, execSync-Strings,
       Template-Strings), bis zum Zeilenende.
   Die Funktion ist die letzte Funktionsdeklaration am Zeilenanfang davor (JS function, Python def, Shell name()). */
function messen(dateien, lesen) {
  const aus = {};
  const zaehlen = (d, t, pos) => {
    const fn = [...t.slice(0, pos).matchAll(FUNKTION)];
    const f = fn.length ? fn[fn.length - 1].slice(1).find(Boolean) : '(Dateikopf)';
    const k = d + ' ' + f;
    aus[k] = (aus[k] || 0) + 1;
  };
  for (const d of dateien) {
    if (!zuPruefen(d)) continue;
    const t = lesen(d);
    if (istJs(d) || d.endsWith('.py')) {
      const re = /(['"])diff-tree\1/g; let m;
      while ((m = re.exec(t))) {
        const ende = t.indexOf(']', m.index);
        if (!SCHALTER.test(t.slice(m.index, ende < 0 ? undefined : ende))) zaehlen(d, t, m.index);
      }
    }
    let pos = 0;
    for (const zeile of t.split('\n')) {
      if (!IST_KOMMENTAR.test(zeile)) {
        const m = /git(?:\s+-[cC]\s+\S+)*\s+diff-tree\b/.exec(zeile);
        if (m && !SCHALTER.test(zeile.slice(m.index + m[0].length))) zaehlen(d, t, pos + m.index);
      }
      pos += zeile.length + 1;
    }
  }
  return aus;
}

function abweichungen(gemessen, grundlinie) {
  const soll = grundlinie.anzahlen;
  const f = [];
  for (const [k, n] of Object.entries(gemessen)) {
    if (!(k in soll)) f.push('neu ohne Merge-Schalter: ' + k + ' (' + n + ')');
    else if (n > soll[k]) f.push('mehr als die Grundlinie: ' + k + ' ' + n + ' > ' + soll[k]);
  }
  for (const [k, n] of Object.entries(soll)) {
    const ist = gemessen[k] || 0;
    if (ist < n) f.push('Grundlinie senken: ' + k + ' ' + ist + ' < ' + n);
  }
  return f;
}

const DATEIEN = execFileSync('git', ['ls-files', 'tools', 'hooks', 'scripts'], { cwd: WURZEL, env: ohneGitUmgebung() }).toString().split('\n').filter(Boolean);
const lesenRepo = (d) => fs.readFileSync(path.join(WURZEL, d), 'utf8');

test('[diff-tree·Merge] jeder diff-tree-Aufruf ohne Merge-Schalter steht genau so in der Grundlinie', () => {
  const g = messen(DATEIEN, lesenRepo);
  assert.ok(Object.keys(g).length >= 1, 'Vorbedingung: der Messer findet die heutigen Aufrufe');
  assert.deepEqual(abweichungen(g, GRUNDLINIE), []);
});

test('[diff-tree·Merge·Liste] jede Anzahl ≥ 1 hat genau einen Eintrag mit Datei, Funktion und Grund', () => {
  const gesehen = new Set();
  for (const e of GRUNDLINIE.eintraege) {
    assert.ok(DATEIEN.includes(e.datei), 'Datei fehlt im Repo: ' + e.datei);
    assert.ok(/^[A-Za-z0-9_$]+$/.test(e.funktion), 'Funktion: ' + e.funktion);
    assert.ok(typeof e.grund === 'string' && e.grund.length >= 20, 'Grund fehlt: ' + e.datei + ' ' + e.funktion);
    const k = e.datei + ' ' + e.funktion;
    assert.ok(!gesehen.has(k), 'doppelt: ' + k);
    gesehen.add(k);
  }
  for (const [k, n] of Object.entries(GRUNDLINIE.anzahlen)) assert.ok(Number.isInteger(n) && n >= 1, 'Anzahl: ' + k);
  assert.deepEqual([...gesehen].sort(), Object.keys(GRUNDLINIE.anzahlen).sort(), 'anzahlen und eintraege decken dieselben Stellen');
});

test('[Negativprobe] [diff-tree·Merge·Rot-Beweis] ein neuer Aufruf ohne Schalter ist rot, mit Schalter grün; ein behobener verlangt Senken', () => {
  const zusatz = {
    'tools/neu-x.js': "function neuePruefung(c) {\n  return g(['diff-tree', '--no-commit-id', '--name-only', '-r', c]);\n}\n",
    'tools/neu-y.js': "function mitSchalter(c) {\n  return g(['diff-tree', ...MERGE_GEGEN_ERSTEN, '-r', c]);\n}\nfunction mitM(c) { return g(['diff-tree', '-m', '-r', c]); }\n",
    'scripts/neu-z.sh': '#!/bin/sh\ngit diff-tree --no-commit-id -r "$1"\n',
    'tools/neu-s.js': "function alsString(c) {\n  return execSync('git diff-tree --name-only -r ' + c);\n}\n",
    'tools/neu-t.js': "function alsTemplate(c) {\n  return execSync(`git diff-tree -r ${c}`);\n}\n",
    'scripts/neu-c.sh': '#!/bin/sh\nmitKonfig() {\n  git -c core.quotepath=off diff-tree -r "$1"\n}\n',
    'tools/neu-p.py': 'def dateien(c):\n    return subprocess.run(["git", "diff-tree", "-r", c])\n',
    'tools/neu-k.js': "/* `git diff-tree` im Kommentar zählt nicht */\n// git diff-tree auch nicht\n",
  };
  const lesen = (d) => (d in zusatz ? zusatz[d] : lesenRepo(d));
  const f = abweichungen(messen(DATEIEN.concat(Object.keys(zusatz)), lesen), GRUNDLINIE);
  assert.ok(f.includes('neu ohne Merge-Schalter: tools/neu-x.js neuePruefung (1)'), f.join('\n'));
  assert.ok(f.includes('neu ohne Merge-Schalter: scripts/neu-z.sh (Dateikopf) (1)'), f.join('\n'));
  for (const erwartet of ['tools/neu-s.js alsString', 'tools/neu-t.js alsTemplate', 'scripts/neu-c.sh mitKonfig', 'tools/neu-p.py dateien']) {
    assert.ok(f.includes('neu ohne Merge-Schalter: ' + erwartet + ' (1)'), erwartet + '\n' + f.join('\n'));
  }
  assert.ok(!f.some((x) => x.includes('neu-y.js')), 'ein Aufruf mit Merge-Schalter zählt nicht');
  assert.ok(!f.some((x) => x.includes('neu-k.js')), 'ein Kommentar zählt nicht');
  assert.equal(f.length, 6, f.join('\n'));

  const e = { ...GRUNDLINIE.eintraege[0], anzahl: GRUNDLINIE.anzahlen[GRUNDLINIE.eintraege[0].datei + ' ' + GRUNDLINIE.eintraege[0].funktion] };
  const behoben = (d) => (d === e.datei ? lesenRepo(d).replace(/(['"])diff-tree\1/, "'diff-tree', '--diff-merges=first-parent'") : lesenRepo(d));
  const f2 = abweichungen(messen(DATEIEN, behoben), GRUNDLINIE);
  assert.deepEqual(f2, ['Grundlinie senken: ' + e.datei + ' ' + e.funktion + ' ' + (e.anzahl - 1) + ' < ' + e.anzahl]);

  const doppelt = (d) => (d === e.datei ? lesenRepo(d) + "\nfunction " + e.funktion + "(c) { return g(['diff-tree', '-r', c]); }\n" : lesenRepo(d));
  const f3 = abweichungen(messen(DATEIEN, doppelt), GRUNDLINIE);
  assert.deepEqual(f3, ['mehr als die Grundlinie: ' + e.datei + ' ' + e.funktion + ' ' + (e.anzahl + 1) + ' > ' + e.anzahl]);
});
