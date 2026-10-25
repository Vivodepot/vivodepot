'use strict';
/* Kern-Prüfsumme je Fassung in SECURITY.md (Entscheidung 20.10.2026): die ausgelieferte Programmdatei steht öffentlich neben
   den Produkten, ab v937, v933 nachgetragen. Gehalten wird:
   - die öffentliche Zeile ist die Auslieferung: sha256(wurzelKopfzeileZuruecksetzen(vivodepot.html)) = Kern-Zeile der Fassung,
     im Kanon wie im öffentlichen Zuschnitt (dort trägt Zeile 5 die öffentliche Kopfzeile);
   - (mit Geschichte, darum in der privaten Probe des Registers: jede Kern-Zeile ist der Kern ihres Kanon-Commits);
   - der Prüfweg, den SECURITY.md nennt (sed auf Zeile 5), setzt genau die Quellzeile;
   - Wächter: ab v937 hat jede Fassung mit Produkten eine Kern-Zeile (tools/fassungen-register.js --check). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const F = require('../tools/fassungen-register.js');
const W = require('../tools/lib/wurzel-kopfzeile.js');

const REPO = path.join(__dirname, '..');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const H = (c) => c.repeat(64);
const zeile = (o) => Object.assign({ fassung: 'v937', produkt: 'privat-de', datum: '2026-10-20', kanonCommit: 'abc1234', sha256: H('a'), herkunft: 'Probe' }, o);

/* Die Urteilsfunktion der Probe: liefert null oder den Grund. Eigene Funktion, damit der Rot-Beweis dieselbe Prüfung fährt. */
function oeffentlicheZeileIstAuslieferung(kernText, register) {
  const s = /const SCHALEN_STAND = '(v[0-9]+)'/.exec(kernText);
  if (!s) return 'kein SCHALEN_STAND im Kern';
  const z = register.zeilen.find((r) => r.fassung === s[1] && r.produkt === F.KERN_ZEILE);
  if (!z) return null;   // Fassung ohne Kern-Zeile (Kanon nach der Auslieferung, vor dem nächsten Release)
  const ist = sha(Buffer.from(W.wurzelKopfzeileZuruecksetzen(kernText), 'utf8'));
  return ist === z.sha256 ? null : s[1] + ': zurückgesetzt ' + ist.slice(0, 12) + '… statt Kern-Zeile ' + z.sha256.slice(0, 12) + '…';
}

test('[Kern-Zeile] vivodepot.html (Zeile 5 zurückgesetzt) ist die Kern-Zeile ihrer Fassung in SECURITY.md', () => {
  const text = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.strictEqual(oeffentlicheZeileIstAuslieferung(text, F.registerLesen(REPO)), null);
});

test('[Kern-Zeile·Rot-Beweis] ein abweichender Kern wird erkannt, öffentlich wie in der Quelle', () => {
  const kern = '<!--\n' + W.WURZEL_KOPFZEILE.quellzeile + '\n-->\nconst BUILD_VERSION = \'v1.0\';\nconst SCHALEN_STAND = \'v937\';\n';
  const reg = { zeilen: [zeile({ produkt: F.KERN_ZEILE, sha256: sha(Buffer.from(kern, 'utf8')) })] };
  assert.strictEqual(oeffentlicheZeileIstAuslieferung(kern, reg), null, 'Quelle passt');
  assert.strictEqual(oeffentlicheZeileIstAuslieferung(W.wurzelKopfzeileSetzen(kern), reg), null, 'öffentliche Fassung passt nach dem Zurücksetzen');
  assert.match(oeffentlicheZeileIstAuslieferung(kern.replace('v1.0', 'v1.1'), reg) || '', /statt Kern-Zeile/, 'anderes Byte: rot');
  assert.match(oeffentlicheZeileIstAuslieferung(W.wurzelKopfzeileSetzen(kern) + ' ', reg) || '', /statt Kern-Zeile/, 'öffentlich mit Zusatz: rot');
});

test('[Kern-Zeile] der Prüfweg in SECURITY.md setzt Zeile 5 auf genau die Quellzeile', () => {
  const absatz = F.KERN_ABSATZ.join('\n');
  assert.ok(absatz.includes("sed '5s/.*/" + W.WURZEL_KOPFZEILE.quellzeile + "/' vivodepot.html"), 'sed-Befehl nennt die Quellzeile wörtlich');
  const zeile5 = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8').split('\n')[4];
  assert.ok(zeile5 === W.WURZEL_KOPFZEILE.quellzeile || /^ {2}Vivodepot — Fassung v[0-9.]+\. /.test(zeile5), 'Zeile 5 ist die Kopfzeile (Quelle oder öffentlich)');
  assert.ok(fs.readFileSync(path.join(REPO, 'SECURITY.md'), 'utf8').includes(F.KERN_ABSATZ[0]), 'der Absatz steht im erzeugten Block');
});

test('[Kern-Zeile·Wächter] ab v937 braucht jede Fassung mit Produkten eine Kern-Zeile (Rot-Beweis)', () => {
  assert.deepStrictEqual(F.kernPflichtPruefen({ zeilen: [zeile(), zeile({ produkt: F.KERN_ZEILE })] }), []);
  assert.deepStrictEqual(F.kernPflichtPruefen({ zeilen: [zeile({ fassung: 'v933' })] }), [], 'vor v937 keine Pflicht');
  assert.deepStrictEqual(F.kernPflichtPruefen({ zeilen: [zeile({ produkt: F.SERVICE_WORKER_ZEILE })] }), [], 'Service Worker allein ist kein Produkt');
  const rot = F.kernPflichtPruefen({ zeilen: [zeile(), zeile({ fassung: 'v938', produkt: 'pro-de' }), zeile({ fassung: 'v938', produkt: F.KERN_ZEILE })] });
  assert.strictEqual(rot.length, 1);
  assert.match(rot[0], /v937 hat Produkte, aber keine Zeile „kern“/);
  assert.deepStrictEqual(F.kernPflichtPruefen(F.registerLesen(REPO)), [], 'das echte Register hält die Pflicht');
});

test('[Kern-Zeile] die Versionsseite führt keine Kern-Zeile', () => {
  const j = F.fassungenJson({ zeilen: [zeile(), zeile({ produkt: F.KERN_ZEILE })] }, new Map());
  assert.deepStrictEqual(j.fassungen[0].produkte.map((p) => p.produkt), ['privat-de']);
  assert.match(F.blockText({ zeilen: [zeile(), zeile({ produkt: F.KERN_ZEILE })] }), /\| v937 \| 2026-10-20 \| kern \|[^\n]*\n\| v937 \| 2026-10-20 \| privat-de \|/, 'kern vor den Produkten');
  assert.doesNotMatch(F.blockText({ zeilen: [zeile()] }), /Die Zeile „kern“/, 'Absatz nur, wenn eine Kern-Zeile steht');
});

/* Befund SECURITY-2-2 (20.10.2026): SECURITY.md 2.2 und docs/release-planung.md versprachen, DEVELOPING.md beschreibe das
   Nachrechnen der Prüfsummen aus dem Quelltext; DEVELOPING.md nennt keinen Prüfweg, und die Produkte sind aus dem öffentlichen
   Repository nicht byte-gleich nachzubauen (erfundene Ersatzvorlagen). Wächter gegen die Klasse: jeder Satz in einer
   Markdown-Datei, der vom Nachrechnen spricht und verlinkt, verlinkt nur Ziele, die einen Prüfweg (Prüfsummen-Befehl) tragen.
   Ziel ist die Datei oder, bei einem Anker, der Abschnitt unter dieser Überschrift. */
const PRUEFWEG = /shasum -a 256|sha256sum|certutil -hashfile/;
const NACHRECHNEN = /nachrechn|nachgerechnet/i;

const anker = (u) => u.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
function abschnitt(text, a) {
  const z = text.split('\n');
  const i = z.findIndex((l) => /^#{1,6} /.test(l) && anker(l.replace(/^#+ /, '')) === a);
  if (i < 0) return null;
  const tiefe = /^#+/.exec(z[i])[0].length;
  let j = i + 1;
  while (j < z.length && !(/^#{1,6} /.test(z[j]) && /^#+/.exec(z[j])[0].length <= tiefe)) j++;
  return z.slice(i, j).join('\n');
}
function saetze(text) {
  return text.replace(/```[\s\S]*?```/g, '').split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' '))
    .flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„*[`])/));
}
/* Liefert die Gründe für eine Datei: lesen(rel) gibt den Text einer Repo-Datei oder null. */
function nachrechenVerweisePruefen(rel, text, lesen) {
  const gruende = [];
  for (const s of saetze(text)) {
    if (!NACHRECHNEN.test(s)) continue;
    for (const m of s.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(m[1])) continue;
      const [datei, a] = m[1].split('#');
      const ziel = datei ? path.posix.normalize(path.posix.join(path.posix.dirname(rel), datei)) : rel;
      let zielText = lesen(ziel);
      if (zielText != null && a) zielText = abschnitt(zielText, a);
      if (zielText == null) gruende.push(rel + ': „' + m[1] + '“ führt ins Leere');
      else if (!PRUEFWEG.test(zielText)) gruende.push(rel + ': verspricht Nachrechnen, „' + m[1] + '“ nennt keinen Prüfweg');
    }
  }
  return gruende;
}
function markdownDateien(wurzel) {
  const aus = [];
  (function gehen(r) {
    for (const e of fs.readdirSync(path.join(wurzel, r), { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const k = r ? r + '/' + e.name : e.name;
      if (e.isDirectory()) gehen(k); else if (e.name.endsWith('.md')) aus.push(k);
    }
  })('');
  return aus;
}

test('[Kern-Zeile·Nachrechnen] jeder Nachrechen-Verweis in einer Markdown-Datei führt zu einem Prüfweg', () => {
  const lesen = (r) => { try { return fs.readFileSync(path.join(REPO, r), 'utf8'); } catch (_) { return null; } };
  const dateien = markdownDateien(REPO);
  assert.ok(dateien.includes('SECURITY.md') && dateien.length > 50, 'die Liste trifft die Markdown-Dateien (' + dateien.length + ')');
  assert.deepStrictEqual(dateien.flatMap((d) => nachrechenVerweisePruefen(d, lesen(d), lesen)), []);
  const s22 = abschnitt(lesen('SECURITY.md'), anker('2.2 Prüfsummen je Fassung'));
  assert.match(s22, /nachrechnen[^.]*„kern“[\s\S]*\(#8--fingerabdruck-je-fassung\)/, '2.2 nennt den Kern als nachrechenbar, mit Verweis auf Abschnitt 8');
  assert.match(s22, /nicht byte-gleich nachbauen/, '2.2 sagt, dass die Produkte nicht nachzubauen sind');
});

test('[Kern-Zeile·Nachrechnen·Rot-Beweis] der alte Satz in 2.2 und Verweise ins Leere sind rot', () => {
  const dateien = {
    'SECURITY.md': '## 2.2 Prüfsummen\n\nDie Prüfsummen stehen in [Abschnitt 8](#8--fingerabdruck); wie man sie aus dem Quelltext nachrechnet, steht in [`DEVELOPING.md`](DEVELOPING.md).\n\n## 8 · Fingerabdruck\n\n`shasum -a 256 <datei>`\n',
    'DEVELOPING.md': '## Build\n\nnode tools/x.js\n',
    'docs/plan.md': 'Wie man ihn nachrechnet, steht in [`SECURITY.md`](../SECURITY.md#8--fingerabdruck) und [x](../FEHLT.md).\n',
  };
  const lesen = (r) => (r in dateien ? dateien[r] : null);
  assert.deepStrictEqual(nachrechenVerweisePruefen('SECURITY.md', dateien['SECURITY.md'], lesen),
    ['SECURITY.md: verspricht Nachrechnen, „DEVELOPING.md“ nennt keinen Prüfweg']);
  assert.deepStrictEqual(nachrechenVerweisePruefen('docs/plan.md', dateien['docs/plan.md'], lesen), ['docs/plan.md: „../FEHLT.md“ führt ins Leere']);
  dateien['DEVELOPING.md'] += '\n`shasum -a 256 vivodepot.html`\n';
  assert.deepStrictEqual(nachrechenVerweisePruefen('SECURITY.md', dateien['SECURITY.md'], lesen), [], 'mit Prüfweg im Ziel grün');
  assert.deepStrictEqual(nachrechenVerweisePruefen('x.md', 'Siehe [a](DEVELOPING.md).', lesen), [], 'ohne Nachrechnen kein Anspruch');
});
