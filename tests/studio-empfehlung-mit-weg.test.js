'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Befund STUDIO-EMPFEHLUNG-OHNE-WEG (10.10.2026): jede Meldung hat einen Weg zur Stelle, an der sie behoben wird
   ─────────────────────────────────────────────────────────────────────────────
   Anlass: „ich kann nicht zurück und diese Pflichtfelder erstellen“. Schritt 3 von „Fertigstellen und einreichen“ nannte
   Empfehlungen und Hindernisse aus pruefeKonformitaet, aber keinen Weg dorthin; der Assistent hatte keinen Pflicht-Schalter.
   (a) KLASSEN-WÄCHTER: jede Meldung, die pruefeKonformitaet und validiereStammdaten erzeugen können, hat ein Ziel in
       MELDUNG_ZIEL. Gesammelt STATISCH aus dem Quelltext (jedes Argument von blocker.push / warnungen.push / fehler.push
       und das Rückgabe-Array) — eine neue Meldung ohne Ziel wird rot, bevor sie jemand sieht. Rot-Beweis: eine Kopie
       mit einer zusätzlichen Warnung meldet genau ein fehlendes Ziel.
   (b) ASSISTENT: eine Frage mit Pflicht ergibt ein Feld mit pflicht: true, auch ein Standardfeld; der Schalter am Modell
       (ASSISTENT.fragen[i].pflicht) ändert assistentFelder().
   (c) SCHRITT 3: renderefPruefung baut Blocker und Warnungen über pruefZeile, und pruefZeile hängt bei einem Ziel den
       Knopf „Beheben“ an.
   Der Weg im Browser (Assistent und Fachebene, mit Rot-Beweis) steht in tests/e2e-cross/T-CROSS-35-studio-empfehlung-beheben.spec.js.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

/* Der Rumpf einer Funktion der obersten Ebene: vom Kopf bis zur ersten Zeile, die nur „}“ ist. */
function rumpf(html, name) {
  const a = html.indexOf('function ' + name + '(');
  assert.ok(a > 0, 'Funktion ' + name + ' nicht gefunden');
  const e = html.indexOf('\n}\n', a);
  assert.ok(e > a, 'Ende von ' + name + ' nicht gefunden');
  return html.slice(a, e + 2);
}
/* Das Argument eines Aufrufs ab der öffnenden Klammer, bis zur passenden schließenden (Zeichenketten berücksichtigt). */
function argumentAb(q, start) {
  let tiefe = 0, i = start, quote = null;
  for (; i < q.length; i++) {
    const c = q[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[') tiefe++;
    else if (c === ')' || c === ']') { tiefe--; if (tiefe === 0) return q.slice(start + 1, i); }
  }
  throw new Error('Klammer ohne Ende ab ' + start);
}
/* Ein Ausdruck aus Zeichenketten und Werten → eine Beispiel-Meldung. Zeichenketten bleiben wörtlich, `nr` wird
   „Feld 1 („Name“)“ (so baut pruefeKonformitaet die Feldnummer), jeder andere Wert ein Platzhalter. */
function beispielMeldung(ausdruck) {
  const teile = [];
  let i = 0, tiefe = 0, start = 0, quote = null;
  for (; i < ausdruck.length; i++) {
    const c = ausdruck[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') tiefe--;
    else if (c === '+' && tiefe === 0) { teile.push(ausdruck.slice(start, i).trim()); start = i + 1; }
  }
  teile.push(ausdruck.slice(start).trim());
  return teile.map((t) => {
    const lit = /^'((?:[^'\\]|\\.)*)'$/.exec(t);
    if (lit) return lit[1].replace(/\\(.)/g, '$1');
    if (t === 'nr') return 'Feld 1 („Name“)';
    return 'X';
  }).join('');
}
/* Alle Meldungen der beiden Prüfungen, statisch aus dem Quelltext. */
function meldungenAusQuelle(html) {
  const out = [];
  for (const name of ['validiereStammdaten', 'pruefeKonformitaet']) {
    const q = rumpf(html, name);
    for (const m of q.matchAll(/\b(?:blocker|warnungen|fehler)\.push\(/g)) {
      const auf = m.index + m[0].length - 1;
      out.push({ funktion: name, meldung: beispielMeldung(argumentAb(q, auf)) });
    }
    for (const m of q.matchAll(/\breturn \['((?:[^'\\]|\\.)*)'\]/g)) out.push({ funktion: name, meldung: m[1] });
  }
  return out;
}
/* Der Wächter: welche Meldungen haben kein Ziel? */
function ohneZiel(html) {
  const { V } = ladeGenerator({ html });
  return meldungenAusQuelle(html).filter((x) => !V.meldungZiel(x.meldung, [])).map((x) => x.funktion + ': ' + x.meldung);
}

/* ── (a) Klassen-Wächter ─────────────────────────────────────────────────── */
test('[Empfehlung mit Weg · Wächter] jede Meldung von pruefeKonformitaet und validiereStammdaten hat ein Ziel', () => {
  const alle = meldungenAusQuelle(HTML);
  assert.ok(alle.length >= 25, 'zu wenige Meldungen gesammelt (' + alle.length + ') — die Sammlung ist blind geworden');
  assert.ok(alle.some((x) => /keine Pflichtfelder/.test(x.meldung)), 'die Anlass-Meldung fehlt in der Sammlung');
  assert.ok(alle.some((x) => /^Feld 1 \(„Name“\): Pflicht-Status fehlt\.$/.test(x.meldung)), 'Feld-Meldungen werden nicht mit Nummer gebaut');
  assert.deepEqual(ohneZiel(HTML), []);
});
test('[Empfehlung mit Weg · Wächter · Rot-Beweis] eine neue Warnung ohne Ziel wird als genau eine fehlende gemeldet', () => {
  const anker = '  return { blocker: blocker, warnungen: warnungen };';
  assert.equal(HTML.split(anker).length, 2, 'Anker nicht eindeutig');
  const kopie = HTML.replace(anker, "  warnungen.push('Neue Meldung ohne Ziel.');\n" + anker);
  assert.deepEqual(ohneZiel(kopie), ['pruefeKonformitaet: Neue Meldung ohne Ziel.']);
});
test('[Empfehlung mit Weg · Ziele] die Laufzeit-Meldungen treffen das erwartete Ziel samt Feld', () => {
  const { V } = ladeGenerator();
  const felder = [{ feldname: 'A', feldtyp: 'text', bereich: 'identity', pflicht: false },
    { feldname: 'B'.repeat(70), feldtyp: 'text', bereich: 'identity' }];
  const res = V.pruefeKonformitaet({ felder, anbieter: { anbieterName: '' }, publicKeyJwk: null });
  const ziele = [...res.blocker, ...res.warnungen].map((m) => ({ m, z: V.meldungZiel(m, felder) }));
  for (const { m, z } of ziele) assert.ok(z, 'kein Ziel für: ' + m);
  const z = (re) => nativ(ziele.find((x) => re.test(x.m)).z);
  assert.equal(z(/^Anbieter-Stammdaten/).art, 'stammdaten');
  assert.ok(z(/^Anbieter-Stammdaten/).stammFehler.includes('Bitte geben Sie die Straße an.'));
  assert.equal(z(/Schlüsselpaar/).art, 'schluessel');
  assert.deepEqual(z(/^Feld 2 .*Pflicht-Status fehlt/), { art: 'feld-pflicht', index: 1, fokus: 'ed-pflicht' });
  assert.deepEqual(z(/keine Pflichtfelder/), { art: 'feld-pflicht', index: 0, fokus: 'ed-pflicht' });
  assert.equal(z(/sehr lang/).index, 1, 'der lange Feldname gehört zu Feld 2');
  assert.equal(V.meldungZiel('Etwas ganz anderes.', felder), null);
});

/* ── (b) Assistent ───────────────────────────────────────────────────────── */
test('[Empfehlung mit Weg · Assistent] Pflicht reist mit, auch bei einem Standardfeld; der Schalter am Modell ändert die Felder', () => {
  const { V } = ladeGenerator();
  V.ASSISTENT.sprache = 'de';
  V.assistentBeispielLaden('andere');                 // „Kontaktbogen“: drei Standardfelder, keine Pflicht
  assert.deepEqual(nativ(V.assistentFelder()).map((f) => f.pflicht), [false, false, false]);
  V.ASSISTENT.fragen[0].pflicht = true;               // Standardfeld (Vorname)
  assert.ok(V.ASSISTENT.fragen[0].reg, 'Frage 1 ist ein Standardfeld');
  V.ASSISTENT.fragen.push({ frage: 'Ihre Nachricht', pflicht: true });
  const felder = nativ(V.assistentFelder());
  assert.deepEqual(felder.map((f) => f.pflicht), [true, false, false, true]);
  assert.equal(V.pruefeKonformitaet({ felder }, { nurInhalt: true }).warnungen.filter((w) => /keine Pflichtfelder/.test(w)).length, 0);
  V.ASSISTENT.fragen[0].pflicht = false; V.ASSISTENT.fragen[3].pflicht = false;
  const ohne = nativ(V.assistentFelder());
  assert.deepEqual(ohne.map((f) => f.pflicht), [false, false, false, false]);
  assert.equal(V.pruefeKonformitaet({ felder: ohne }, { nurInhalt: true }).warnungen.filter((w) => /keine Pflichtfelder/.test(w)).length, 1);
});
test('[Empfehlung mit Weg · Assistent] Liste und Karte zeigen den Schalter und das Sternchen', () => {
  const zeigen = rumpf(HTML, 'assistentZeigen');
  assert.match(zeigen, /L\('Muss ausgefüllt werden', 'Must be filled in'\)/);
  assert.match(zeigen, /type: 'checkbox', checked: f\.pflicht/);
  assert.match(zeigen, /f\.pflicht = !!\(e && e\.target && e\.target\.checked\)/);
  assert.match(rumpf(HTML, 'assistentKarte'), /assistentFrageName\(f\) \+ \(f\.pflicht \? ' \*' : ''\)/);
  assert.match(rumpf(HTML, 'assistentEinreichen'), /fertigAusAssistent = true;/);
});

/* ── (c) Schritt 3 ───────────────────────────────────────────────────────── */
test('[Empfehlung mit Weg · Schritt 3] Blocker und Warnungen laufen über pruefZeile, die bei einem Ziel „Beheben“ anhängt', () => {
  const render = rumpf(HTML, 'renderefPruefung');
  assert.match(render, /res\.blocker\.forEach\(\(b\) => ul\.appendChild\(pruefZeile\(b\)\)\)/);
  assert.match(render, /res\.warnungen\.forEach\(\(w\) => ul\.appendChild\(pruefZeile\(w\)\)\)/);
  const zeile = rumpf(HTML, 'pruefZeile');
  assert.match(zeile, /const ziel = meldungZiel\(meldung, STATE\.felder\);/);
  assert.match(zeile, /if \(ziel\) \{[\s\S]*el\('button', \{ type: 'button', class: 'link-knopf pr-beheben'[\s\S]*text: L\('Beheben', 'Fix'\), onclick: \(\) => meldungBeheben\(ziel\)/);
  const beheben = rumpf(HTML, 'meldungBeheben');
  assert.doesNotMatch(beheben, /SCHLUESSEL_TRESOR\.verwerfen|STATE\.(anbieter|publicKeyJwk|pubDownloaded|privDownloaded)\s*=/, '„Beheben“ darf nichts verwerfen');
  assert.match(beheben, /zeigeSchritt\('assistent'\)/);
  assert.match(beheben, /zeigeSchritt\('template'\)/);
});
test('[Empfehlung mit Weg · Schritt 3 · Rot-Beweis] ein Render ohne pruefZeile fällt auf', () => {
  const kopie = HTML.replace('res.warnungen.forEach((w) => ul.appendChild(pruefZeile(w)))', "res.warnungen.forEach((w) => ul.appendChild(el('li', { text: meldungL(w) })))");
  assert.notEqual(kopie, HTML);
  assert.doesNotMatch(rumpf(kopie, 'renderefPruefung'), /res\.warnungen\.forEach\(\(w\) => ul\.appendChild\(pruefZeile\(w\)\)\)/);
});
