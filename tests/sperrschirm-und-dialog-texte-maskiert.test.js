'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Sperrschirm und Dialog-Fußleiste: jeder Text aus STRINGS oder vorDepotText steht in escapeHTML
   ────────────────────────────────────────────────────────────────────────────
   Drei HTML-Senken haben mit den Zielbildern 01 und 03 neue Texte bekommen, die Seite aus Zielbild 04 eine vierte:
   (1) die Karte des Sperrschirms (renderCryptoOverlay, `el.innerHTML = '<div class="karte entsperren-karte">' …`),
   (2) die Fußleiste jedes Dialogs (ui.modal, `box.innerHTML = '<h3 id="modal-titel">' …`) mit dem Nebenweg,
   (3) der einzige Aufrufer, der einen Nebenweg übergibt (`nebenwegHTML: zs ? …`),
   (4) die Seite „Was möchten Sie erledigen?“ (renderErledigen, die zwei Anweisungen, die `html` füllen).
   Die Probe liest die Anweisung im Quelltext und verlangt: jedes Vorkommen von `STRINGS.`, `STRINGS[` und
   `vorDepotText(` liegt innerhalb eines Aufrufs von escapeHTML oder escapeTextknoten. Ein Text, der künftig
   unmaskiert in eine dieser Senken gerät, macht sie rot.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const MASKEN = new Set(['escapeHTML', 'escapeTextknoten']);

// Liest ab `start` bis zum Ende des Ausdrucks: `;` auf Tiefe 0, oder (ende: ',') ein Komma auf Tiefe 0.
// Zeichenketten und Kommentare werden übersprungen. Liefert die Vorkommen von Texten mit der Angabe, ob ein
// umschließender Aufruf eine Maske ist.
function texteImAusdruck(quelle, start, ende) {
  const stapel = [];   // je offene Klammer: der Name direkt davor
  const funde = [];
  let i = start;
  while (i < quelle.length) {
    const c = quelle[i];
    const n = quelle[i + 1];
    if (c === '/' && n === '/') { i = quelle.indexOf('\n', i); continue; }
    if (c === '/' && n === '*') { i = quelle.indexOf('*/', i) + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < quelle.length && quelle[j] !== c) j += quelle[j] === '\\' ? 2 : 1;
      i = j + 1; continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      const m = /([A-Za-z_$][\w$]*)\s*$/.exec(quelle.slice(Math.max(start, i - 40), i));
      stapel.push(c === '(' && m ? m[1] : '');
      i++; continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      if (!stapel.length) break;
      stapel.pop(); i++; continue;
    }
    if (!stapel.length && (c === ';' || (ende === ',' && c === ','))) break;
    const rest = quelle.slice(i, i + 13);
    if (/^STRINGS[.[]/.test(rest) || /^vorDepotText\(/.test(rest)) {
      const davor = quelle[i - 1];
      if (!/[\w$.]/.test(davor)) {
        funde.push({ text: quelle.slice(i, quelle.indexOf(')', i) + 1).slice(0, 60), maskiert: stapel.some((s) => MASKEN.has(s)) });
      }
    }
    i++;
  }
  return funde;
}

function stelle(quelle, anker) {
  const i = quelle.indexOf(anker);
  assert.ok(i >= 0, 'Anker nicht gefunden: ' + anker);
  return i;
}

const SENKEN = [
  { name: 'Sperrschirm (renderCryptoOverlay)', anker: "el.innerHTML =\n    '<div class=\"karte entsperren-karte\">'", ende: ';', mindestens: 6 },
  { name: 'Dialog-Fußleiste (ui.modal)', anker: "box.innerHTML =\n      '<h3 id=\"modal-titel\">'", ende: ';', mindestens: 1 },
  // Seit „Passwort festlegen“ (24.11.2026) steht im Nebenweg nur noch „Lieber ein eigenes Passwort“; das Angebot der Wörter steht im Körper.
  { name: 'Nebenweg (Anlegen-Fenster)', anker: 'nebenwegHTML: zs ?', ende: ',', mindestens: 1 },
  // Seite „Was möchten Sie erledigen?“ (renderErledigen, Zielbild 04): Titel und Einleitung, dann der Hinweis zum
  // Wiederherstellungs-Code. Beide Anweisungen füllen `html`, das danach in `c.innerHTML` geht.
  { name: 'Erledigen-Seite, Kopf (renderErledigen)', anker: "let html = '<div class=\"content-narrow erledigen\"", ende: ';', mindestens: 2 },
  { name: 'Erledigen-Seite, Code-Hinweis (renderErledigen)', anker: "html += '<div class=\"erledigen-whc\"", ende: ';', mindestens: 2 },
  { name: 'Erledigen-Seite, Sicherungskopie (renderErledigen)', anker: "html += '<div class=\"erledigen-whc\" data-erledigen-sicherung", ende: ';', mindestens: 2 },
];

for (const s of SENKEN) {
  test('[Maskiert] ' + s.name + ': jeder Text aus STRINGS oder vorDepotText steht in escapeHTML', () => {
    const funde = texteImAusdruck(KERN, stelle(KERN, s.anker), s.ende);
    assert.ok(funde.length >= s.mindestens, s.name + ': nur ' + funde.length + ' Texte gefunden — die Probe liest nicht mehr die Senke');
    assert.deepEqual(funde.filter((f) => !f.maskiert).map((f) => f.text), []);
  });
}

test('[Maskiert·Rot-Beweis] ein unmaskierter Text in jeder Senke fällt, ein maskierter nicht', () => {
  const PFLANZEN = [
    ["el.innerHTML =\n    '<div class=\"karte entsperren-karte\">'", "el.innerHTML =\n    '<div class=\"karte entsperren-karte\">' + '<p>' + vorDepotText('cryptoNeuAnfangen') + '</p>'"],
    ["box.innerHTML =\n      '<h3 id=\"modal-titel\">'", "box.innerHTML =\n      '<h3 id=\"modal-titel\">' + STRINGS.btnAbbrechen + "],
    ['nebenwegHTML: zs ?', "nebenwegHTML: zs ? STRINGS['pwVorschlagZurueck'] + "],
    ["let html = '<div class=\"content-narrow erledigen\"", "let html = '<div class=\"content-narrow erledigen\"' + STRINGS.erledigenEinleitung + '"],
    ["html += '<div class=\"erledigen-whc\"", "html += '<div class=\"erledigen-whc\"' + STRINGS.whcStatusFehlt + '"],
  ];
  PFLANZEN.forEach(([alt, neu], k) => {
    const gepflanzt = KERN.replace(alt, neu);
    assert.notEqual(gepflanzt, KERN, 'Pflanzung greift nicht: ' + alt);
    const funde = texteImAusdruck(gepflanzt, stelle(gepflanzt, alt), SENKEN[k].ende);
    assert.equal(funde.filter((f) => !f.maskiert).length, 1, SENKEN[k].name + ': der gepflanzte Text fällt nicht');
  });
  const maskiert = KERN.replace(PFLANZEN[0][0], PFLANZEN[0][0] + " + '<p>' + escapeHTML(vorDepotText('cryptoNeuAnfangen')) + '</p>'");
  assert.deepEqual(texteImAusdruck(maskiert, stelle(maskiert, PFLANZEN[0][0]), ';').filter((f) => !f.maskiert), []);
});
