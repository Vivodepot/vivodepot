#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   e2e-fundstelle-ungeprueft-pruefen.js — kein Suchergebnis ohne Prüfung auf −1 in den E2E-Proben (05.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Anlass: tests/e2e/seitenleiste-struktur-abnahme.spec.js schnitt `html.slice(html.indexOf('Verwaltete Depots'), …)`.
   Nach der Umbenennung in „Sub-Depots“ lieferte indexOf −1, slice(−1, …) einen leeren Text, und die Prüfung
   „kein gruppe-titel darin“ bestand immer — eine Probe, die nichts mehr prüfte und grün blieb.

   Die Klasse: ein Ergebnis von `.indexOf(`, `.lastIndexOf(`, `.findIndex(` oder `.search(` wird weiterverwendet,
   ohne dass jemand −1 ausschließt. Erlaubt ist eine Fundstelle nur, wenn
     (a) der Aufruf selbst verglichen wird:          `x.indexOf(y) >= 0`, `s.indexOf('feld:') !== 0`, oder
     (b) sein Ergebnis einem Namen zugewiesen wird   (`const i = …indexOf(…)`, auch `… + 1` oder als Ternär-Zweig)
         und dieser Name in den nächsten NACHLAUF Zeilen links in einem Vergleich steht (`i < 0`, `i >= 0`,
         `i === -1`) oder per `expect(i).toBeGreaterThanOrEqual(0)` bzw. `toBeGreaterThan(-1)` geprüft wird.
   Alles andere ist ein Fund. Keine Ausnahmeliste, keine Grundlinie: der Bestand ist beim Bau auf null gebracht.

   Grenzen (bewusst): Kommentare und Zeichenketten werden ausgeblendet; Code in `${…}` einer Vorlagenzeichenkette
   wird nicht gelesen. Ein Vergleich, der den Namen rechts trägt (`i > a`), zählt nicht für `a`.

     node tools/e2e-fundstelle-ungeprueft-pruefen.js                  → prüft tests/e2e und tests/e2e-cross, Exit 1 bei Fund
     node tools/e2e-fundstelle-ungeprueft-pruefen.js --datei <pfad> … → prüft die genannten Dateien
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ORDNER = ['tests/e2e', 'tests/e2e-cross'];
const NACHLAUF = 6;
const AUFRUF = /\.(indexOf|lastIndexOf|findIndex|search)\(/g;
const VERGLEICH = /^\s*(<=|>=|===|!==|==|!=|<|>)/;

function standardDateien() {
  const dateien = [];
  const sammeln = (ordner) => {
    if (!fs.existsSync(ordner)) return;
    for (const n of fs.readdirSync(ordner)) {
      const p = path.join(ordner, n);
      if (fs.statSync(p).isDirectory()) sammeln(p);
      else if (n.endsWith('.js')) dateien.push(p);
    }
  };
  for (const o of ORDNER) sammeln(path.join(REPO, o));
  return dateien.sort();
}

/* Kommentare und den Inhalt von Zeichenketten und Regex-Literalen durch Leerzeichen ersetzen (gleiche Länge,
   Zeilenumbrüche bleiben), damit Klammern und Aufrufe nur im Code gezählt werden. */
function ausblenden(text) {
  const z = text.split('');
  const leer = (von, bis) => { for (let k = von; k < bis; k++) if (z[k] !== '\n') z[k] = ' '; };
  let i = 0;
  let letztes = '';
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') { const e = text.indexOf('\n', i); const bis = e < 0 ? text.length : e; leer(i, bis); i = bis; continue; }
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const bis = e < 0 ? text.length : e + 2; leer(i, bis); i = bis; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      let k = i + 1;
      while (k < text.length && text[k] !== c) { if (text[k] === '\\') k++; else if (c !== '`' && text[k] === '\n') break; k++; }
      leer(i + 1, k); i = k + 1; letztes = c; continue;
    }
    if (c === '/' && (letztes === '' || '(,=:[!&|?{};+-*%<>~^'.includes(letztes))) {
      let k = i + 1;
      let klasse = false;
      while (k < text.length && text[k] !== '\n') {
        if (text[k] === '\\') { k += 2; continue; }
        if (text[k] === '[') klasse = true; else if (text[k] === ']') klasse = false; else if (text[k] === '/' && !klasse) break;
        k++;
      }
      leer(i + 1, k); i = k + 1; letztes = '/'; continue;
    }
    if (!/\s/.test(c)) letztes = c;
    i++;
  }
  return z.join('');
}

function schliessendeKlammer(maske, auf) {
  let tiefe = 0;
  for (let k = auf; k < maske.length; k++) {
    if (maske[k] === '(') tiefe++;
    else if (maske[k] === ')') { tiefe--; if (tiefe === 0) return k; }
  }
  return -1;
}

function geprueftDurchName(name, folgezeilen) {
  const n = name.replace(/\$/g, '\\$');
  const links = new RegExp('(^|[^\\w$.])' + n + '\\s*(<=|>=|===|!==|==|!=|<|>)');
  const erwartet = new RegExp('expect\\(\\s*' + n + '\\s*[,)][^\\n]*\\.(toBeGreaterThanOrEqual\\(\\s*0\\s*\\)|toBeGreaterThan\\(\\s*-1\\s*\\))');
  return folgezeilen.some((zeile) => links.test(zeile) || erwartet.test(zeile));
}

function funde(text) {
  const maske = ausblenden(text);
  const zeilen = maske.split('\n');
  const zeilenAnfang = [0];
  for (let k = 0; k < maske.length; k++) if (maske[k] === '\n') zeilenAnfang.push(k + 1);
  const zeileVon = (pos) => { let lo = 0, hi = zeilenAnfang.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (zeilenAnfang[m] <= pos) lo = m; else hi = m - 1; } return lo; };
  const ergebnis = [];
  AUFRUF.lastIndex = 0;
  let m;
  while ((m = AUFRUF.exec(maske)) !== null) {
    const auf = m.index + m[0].length - 1;
    const zu = schliessendeKlammer(maske, auf);
    if (zu < 0) continue;
    if (VERGLEICH.test(maske.slice(zu + 1, zu + 12))) continue;                                   // (a)
    const zi = zeileVon(m.index);
    const zuweisung = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(zeilen[zi]);
    if (zuweisung && geprueftDurchName(zuweisung[1], zeilen.slice(zi, zi + 1 + NACHLAUF).map((z, k) => (k === 0 ? z.slice(z.indexOf('=') + 1) : z)))) continue; // (b)
    ergebnis.push({ zeile: zi + 1, aufruf: m[1], text: text.split('\n')[zi].trim().slice(0, 160) });
  }
  return ergebnis;
}

function messen(dateien) {
  const alle = [];
  for (const d of dateien) for (const f of funde(fs.readFileSync(d, 'utf8'))) alle.push({ datei: path.relative(REPO, d), ...f });
  return alle;
}

module.exports = { REPO, ORDNER, NACHLAUF, standardDateien, ausblenden, funde, messen };

if (require.main === module) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--datei');
  const dateien = i >= 0 ? args.slice(i + 1).map((p) => path.resolve(p)) : standardDateien();
  const gefunden = messen(dateien);
  for (const f of gefunden) process.stdout.write(f.datei + ':' + f.zeile + '  .' + f.aufruf + '()  ' + f.text + '\n');
  process.stdout.write('[e2e-fundstelle] ' + dateien.length + ' Dateien, ' + gefunden.length + ' ungeprüfte Fundstelle(n)\n');
  process.exit(gefunden.length ? 1 : 0);
}
