'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   css-zerlegen.js — ein Stylesheet in seine Teile, ohne Inhalt zu verlieren (v894, 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Für den Umzug des Stylesheets ins Erscheinungsbild-Modul (U2-ADR-473 Nachtrag v894, Lesart B) und für die Prüfung des
   Modulabschnitts `stil`. Kein vollständiger CSS-Parser — er kennt genau, was das Stylesheet des Kerns trägt: Kommentare,
   Regeln (Selektor { Deklarationen }), Block-At-Regeln (@media, @supports, @keyframes, @font-face) und Anweisungs-At-Regeln
   (@import …;). Jeder Teil behält seinen Originaltext; zusammengesetzt ergibt die Zerlegung den Eingabetext Byte für Byte
   (`zusammensetzen`, Probe in tests/css-zerlegen.test.js).
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */

function _blockEnde(text, auf) {
  let tiefe = 0;
  let q = null;
  for (let i = auf; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 1; continue; }
    if (c === '{') tiefe++;
    else if (c === '}' && --tiefe === 0) return i;
  }
  throw new Error('css-zerlegen: Block ohne schließende Klammer ab ' + auf);
}

/* Liefert [{ art: 'leer'|'kommentar'|'regel'|'at-block'|'at-anweisung', text, selektor?, innen?, name?, kopf? }] */
function zerlegen(text) {
  const teile = [];
  let i = 0;
  while (i < text.length) {
    const ws = /^\s+/.exec(text.slice(i, i + 200));
    if (ws) { teile.push({ art: 'leer', text: ws[0] }); i += ws[0].length; continue; }
    if (text.startsWith('/*', i)) {
      const e = text.indexOf('*/', i + 2);
      const ende = e < 0 ? text.length : e + 2;
      teile.push({ art: 'kommentar', text: text.slice(i, ende) }); i = ende; continue;
    }
    if (text[i] === '@') {
      const name = /^@([a-zA-Z-]+)/.exec(text.slice(i, i + 40))[1].toLowerCase();
      const semi = text.indexOf(';', i);
      const auf = text.indexOf('{', i);
      if (auf < 0 || (semi >= 0 && semi < auf)) {
        teile.push({ art: 'at-anweisung', name, text: text.slice(i, semi + 1) }); i = semi + 1; continue;
      }
      const zu = _blockEnde(text, auf);
      teile.push({ art: 'at-block', name, kopf: text.slice(i, auf), innen: text.slice(auf + 1, zu), text: text.slice(i, zu + 1) });
      i = zu + 1; continue;
    }
    const auf = text.indexOf('{', i);
    if (auf < 0) { teile.push({ art: 'rest', text: text.slice(i) }); break; }
    const zu = _blockEnde(text, auf);
    teile.push({ art: 'regel', selektor: text.slice(i, auf), innen: text.slice(auf + 1, zu), text: text.slice(i, zu + 1) });
    i = zu + 1;
  }
  return teile;
}

function zusammensetzen(teile) { return teile.map((t) => t.text).join(''); }

/* Deklarationen eines Regelinneren, getrennt an `;` außerhalb von Klammern und Anführungszeichen; Kommentare bleiben am
   folgenden Stück. */
function deklarationen(innen) {
  const raus = [];
  let tiefe = 0; let q = null; let start = 0;
  for (let i = 0; i < innen.length; i++) {
    const c = innen[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '/' && innen[i + 1] === '*') { const e = innen.indexOf('*/', i + 2); i = e < 0 ? innen.length : e + 1; continue; }
    if (c === '(') tiefe++;
    else if (c === ')') tiefe--;
    else if (c === ';' && tiefe === 0) { raus.push(innen.slice(start, i)); start = i + 1; }
  }
  if (innen.slice(start).trim()) raus.push(innen.slice(start));
  return raus.map((d) => d.replace(/\/\*[\s\S]*?\*\//g, '').trim()).filter(Boolean);
}

const ohneKommentare = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

module.exports = { zerlegen, zusammensetzen, deklarationen, ohneKommentare };

/* Die Anzeige-Mechanik eines Stylesheets: jede display-Deklaration (nur Schlüsselwörter) mit ihrem Selektor und ihren
   @media/@supports-Hüllen, in Reihenfolge. Das Gerüst trägt genau diese Zeilen (v894, Lesart B) — was zu sehen ist und was
   nicht, muss auch ohne Erscheinungsbild-Modul und im Rückfall stimmen. Probe: tests/erscheinungsbild-pruefung.test.js. */
function anzeigeMechanik(text, einzug = '  ') {
  const raus = [];
  for (const x of zerlegen(text)) {
    if (x.art === 'regel') {
      const d = deklarationen(x.innen).filter((y) => /^display\s*:/i.test(y));
      if (d.length) raus.push(einzug + ohneKommentare(x.selektor).trim().replace(/\s+/g, ' ') + ' { ' + d.join('; ') + '; }');
    } else if (x.art === 'at-block' && (x.name === 'media' || x.name === 'supports')) {
      const inn = anzeigeMechanik(x.innen, einzug + '  ');
      if (inn.length) raus.push(einzug + x.kopf.trim() + ' {\n' + inn.join('\n') + '\n' + einzug + '}');
    }
  }
  return raus;
}
module.exports.anzeigeMechanik = anzeigeMechanik;
