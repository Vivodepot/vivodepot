#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   bereichs-literale-pruefen.js — keine Bereichskennung als Literal im Kern außerhalb benannter Gerüst-Regionen
   ────────────────────────────────────────────────────────────────────────────
   Grundsatz (05.10.2026): im fertigen Gerüst ist nichts fest verdrahtet; Bereiche kommen aus dem Rezept bzw. den
   Bereichs-Templates. Der Gerüst-Schnitt (S1–S9) hat Text gemessen, keine Kennungen — darum stand am 07.10.2026 noch
   jede Bereichskennung hundertfach als Literal im Kern, ohne dass ein Wächter es zählte.

   Was gemessen wird: jedes Vorkommen einer Bereichskennung als Zeichenkettenliteral ('…', "…", `…`) in vivodepot.html
   (Schlüssel „kern“) und vivodepot-lesen.html („lese-app“), AUSSERHALB der benannten Regionen (NAME:BEGIN … NAME:END, gebackene Erzeugnisse) und
   außerhalb von Kommentarzeilen. Gruppiert je umschließender Deklaration auf oberster Ebene (function/const/let).

   Woher die Kennungen kommen: aus den Schlüsseln von `bereiche` in tools/bereich-templates/*.json und
   tools/bereiche-nativ-katalog-modul.json — keine eigene Liste hier, ein neuer Bereich ist sofort mitgezählt.

   Deckel (tools/bereichs-literale-grundlinie.json): je Datei und Gruppe die gemessene Zahl, exakt. Eine neue Gruppe
   oder ein höherer Wert ist rot. Ein niedrigerer Wert ist ebenfalls rot („Deckel zu hoch“), bis der Deckel mit
   --grundlinie-schreiben gesenkt wird; dieses Schreiben hebt nie an.
   Benannte Ausnahmen (Feld `ausnahmen`, je mit Grund und Wort der Gegenlesung): Gruppen, die dauerhaft Literale tragen
   dürfen — Migrations-Register (alte Dateien müssen lesbar bleiben) und eingefrorene Krypto-Listen. Sie zählen nicht
   in den Gruppen-Deckel, tragen aber je einen eigenen exakten Deckel (`deckel`, summiert über beide Dateien, nur
   sinkend): eine Migrationsliste nimmt keine neue Kennung auf, ohne dass es auffällt; eine Krypto-Liste steht auf 0,
   ein Treffer dort ist ein Signal, kein Freibrief (Bedingung der Gegenlesung, 07.10.2026).

   Aufruf:
     node tools/bereichs-literale-pruefen.js                       → Exit 0 grün, 1 rot
     node tools/bereichs-literale-pruefen.js --grundlinie-schreiben → senkt die Deckel auf den Ist-Wert (nie anheben)
     node tools/bereichs-literale-pruefen.js --datei <html>          → nur diese Datei messen, Gruppen ausgeben
   Probe: tests/bereichs-literale-pruefen.test.js (Rot-Beweis: ein zusätzliches Literal außerhalb einer Region).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
// Schlüssel ohne Punkt, damit das Zähler-Register jeden Gruppendeckel einzeln über einen JSON-Pfad bewachen kann.
const DATEI_ZU = Object.freeze({ kern: 'vivodepot.html', 'lese-app': 'vivodepot-lesen.html' });
const DATEIEN = Object.keys(DATEI_ZU);
const GRUNDLINIE_PFAD = path.join(__dirname, 'bereichs-literale-grundlinie.json');

function bereichsKennungen(repo = REPO) {
  const ids = new Set();
  const verzeichnis = path.join(repo, 'tools', 'bereich-templates');
  const dateien = fs.readdirSync(verzeichnis).filter((f) => f.endsWith('.json')).map((f) => path.join(verzeichnis, f));
  dateien.push(path.join(repo, 'tools', 'bereiche-nativ-katalog-modul.json'));
  for (const datei of dateien) {
    const j = JSON.parse(fs.readFileSync(datei, 'utf8'));
    const b = j && j.bereiche;
    if (b && typeof b === 'object') for (const id of (Array.isArray(b) ? b.map((x) => x && x.id) : Object.keys(b))) if (id) ids.add(id);
  }
  if (!ids.size) throw new Error('bereichs-literale: keine Bereichskennung in den Templates gefunden — ein Wächter über eine leere Menge prüft nichts');
  return [...ids].sort();
}

function regionen(text) {
  const liste = [];
  const re = /([A-Z][A-Z0-9_]+):BEGIN/g;
  let m;
  while ((m = re.exec(text))) {
    const ende = text.indexOf(m[1] + ':END', m.index + m[0].length);
    if (ende > 0) liste.push([m.index, ende]);
  }
  return liste;
}

function deklarationen(text) {
  const liste = [];
  const re = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(text))) liste.push({ pos: m.index, name: m[1] || m[2] });
  return liste;
}

function messen(text, ids) {
  const reg = regionen(text);
  const dekl = deklarationen(text);
  const zeilenStart = (p) => text.lastIndexOf('\n', p - 1) + 1;
  const gruppen = {};
  const muster = new RegExp('([\'"`])(' + ids.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\1', 'g');
  let m;
  while ((m = muster.exec(text))) {
    const p = m.index;
    if (reg.some(([a, b]) => a <= p && p <= b)) continue;
    const zeile = text.slice(zeilenStart(p), text.indexOf('\n', p) < 0 ? text.length : text.indexOf('\n', p)).trim();
    if (zeile.startsWith('//') || zeile.startsWith('*')) continue;
    let name = '(oberste Ebene)';
    for (const d of dekl) { if (d.pos > p) break; name = d.name; }
    gruppen[name] = (gruppen[name] || 0) + 1;
  }
  return gruppen;
}

function messungAlle(repo = REPO) {
  const ids = bereichsKennungen(repo);
  const ist = {};
  for (const d of DATEIEN) ist[d] = messen(fs.readFileSync(path.join(repo, DATEI_ZU[d]), 'utf8'), ids);
  return { ids, ist };
}

function grundlinieLesen(pfad = GRUNDLINIE_PFAD) {
  return JSON.parse(fs.readFileSync(pfad, 'utf8'));
}

function summe(gruppen, ausnahmen) {
  return Object.entries(gruppen).filter(([n]) => !ausnahmen[n]).reduce((s, [, z]) => s + z, 0);
}

function pruefen(ist, grundlinie) {
  const fehler = [];
  const ausnahmen = grundlinie.ausnahmen || {};
  for (const [n, a] of Object.entries(ausnahmen)) {
    if (!a || !a.grund || !a.wort) { fehler.push('Ausnahme ' + n + ' ohne Grund oder ohne Wort der Gegenlesung'); continue; }
    if (!Number.isInteger(a.deckel)) { fehler.push('Ausnahme ' + n + ' ohne eigenen Deckel'); continue; }
    const z = DATEIEN.reduce((s, d) => s + ((ist[d] || {})[n] || 0), 0);
    if (z > a.deckel) fehler.push('Ausnahme „' + n + '“ wächst von ' + a.deckel + ' auf ' + z + ' Bereichskennungen — auch eine Ausnahme nimmt nichts Neues auf');
    else if (z < a.deckel) fehler.push('Ausnahme „' + n + '“ Deckel zu hoch — gemessen ' + z + ', Deckel ' + a.deckel + '. Senken: node tools/bereichs-literale-pruefen.js --grundlinie-schreiben');
  }
  for (const d of DATEIEN) {
    const soll = (grundlinie.deckel || {})[d] || {};
    const hat = ist[d] || {};
    for (const [n, z] of Object.entries(hat)) {
      if (ausnahmen[n]) continue;
      if (!(n in soll)) fehler.push(d + ': neue Gruppe „' + n + '“ mit ' + z + ' Bereichskennung(en) als Literal — die Kennung gehört ins Rezept bzw. Template, nicht in den Kern');
      else if (z > soll[n]) fehler.push(d + ': „' + n + '“ wächst von ' + soll[n] + ' auf ' + z + ' Bereichskennungen als Literal');
      else if (z < soll[n]) fehler.push(d + ': „' + n + '“ Deckel zu hoch — gemessen ' + z + ', Deckel ' + soll[n] + '. Senken: node tools/bereichs-literale-pruefen.js --grundlinie-schreiben');
    }
    for (const n of Object.keys(soll)) {
      if (!(n in hat)) fehler.push(d + ': „' + n + '“ trägt keine Bereichskennung mehr, Deckel ' + soll[n] + ' — senken: node tools/bereichs-literale-pruefen.js --grundlinie-schreiben');
    }
  }
  return fehler;
}

function grundlinieSenken(ist, alt) {
  const ausnahmen = alt.ausnahmen || {};
  const neu = { ...alt, deckel: {}, ausnahmen: {} };
  const verweigert = [];
  for (const [n, a] of Object.entries(ausnahmen)) {
    const z = DATEIEN.reduce((s, d) => s + ((ist[d] || {})[n] || 0), 0);
    if (z > a.deckel) { verweigert.push('Ausnahme ' + n + ' ' + a.deckel + ' → ' + z); neu.ausnahmen[n] = a; continue; }
    neu.ausnahmen[n] = { ...a, deckel: z };
  }
  for (const d of DATEIEN) {
    neu.deckel[d] = {};
    const soll = (alt.deckel || {})[d] || {};
    for (const [n, z] of Object.entries(ist[d] || {})) {
      if (ausnahmen[n]) continue;
      if (!(n in soll) || z > soll[n]) { verweigert.push(d + ': ' + n + ' ' + (soll[n] ?? 0) + ' → ' + z); neu.deckel[d][n] = soll[n] ?? 0; continue; }
      neu.deckel[d][n] = z;
    }
    for (const n of Object.keys(neu.deckel[d])) if (!neu.deckel[d][n]) delete neu.deckel[d][n];
    neu.deckel[d] = Object.fromEntries(Object.entries(neu.deckel[d]).sort(([a], [b]) => a.localeCompare(b)));
  }
  neu.summe = Object.fromEntries(DATEIEN.map((d) => [d, summe(neu.deckel[d], {})]));
  return { neu, verweigert };
}

function main() {
  const argv = process.argv.slice(2);
  const iDatei = argv.indexOf('--datei');
  if (iDatei >= 0) {
    const g = messen(fs.readFileSync(path.resolve(argv[iDatei + 1]), 'utf8'), bereichsKennungen());
    for (const [n, z] of Object.entries(g).sort((a, b) => b[1] - a[1])) process.stdout.write(z + '\t' + n + '\n');
    return;
  }
  const { ist } = messungAlle();
  const alt = grundlinieLesen();
  if (argv.includes('--grundlinie-schreiben')) {
    const { neu, verweigert } = grundlinieSenken(ist, alt);
    if (verweigert.length) {
      process.stderr.write('[bereichs-literale] NICHT geschrieben — die Grundlinie sinkt nur, ein Zuwachs gehört raus:\n  - ' + verweigert.join('\n  - ') + '\n');
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(GRUNDLINIE_PFAD, JSON.stringify(neu, null, 1) + '\n');
    process.stdout.write('[bereichs-literale] Grundlinie gesenkt: ' + DATEIEN.map((d) => d + ' ' + neu.summe[d]).join(' · ') + '\n');
    return;
  }
  const fehler = pruefen(ist, alt);
  const ausnahmen = alt.ausnahmen || {};
  const kopf = DATEIEN.map((d) => d + ' ' + summe(ist[d], ausnahmen)).join(' · ');
  if (fehler.length) {
    process.stderr.write('[bereichs-literale] ROT (' + kopf + '):\n  - ' + fehler.join('\n  - ') + '\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('[bereichs-literale] OK — Bereichskennungen als Literal außerhalb der Regionen: ' + kopf
    + '; benannte Ausnahmen: ' + Object.keys(ausnahmen).length + '. Ziel: 0 außer den Ausnahmen.\n');
}

module.exports = { bereichsKennungen, regionen, messen, messungAlle, pruefen, grundlinieLesen, grundlinieSenken, summe, DATEIEN, DATEI_ZU, GRUNDLINIE_PFAD };
if (require.main === module) main();
