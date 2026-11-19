'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio · Wagen S-D (10.11.2026): Hilfe ohne Zahl von Bereichen, Hilfe nach Sicht, Vorschau-Chip statt „Geprüft“
   (Umbauplan studio-umbauplan-vergleich-2026-11-10.md, Zeilen 20 und 23).
   (1) Im sichtbaren Studio-Text steht keine Zahl von Bereichen, Kategorien, Sektoren oder Einrichtungsarten (modular, wechselt je Ausgabe).
   (2) Die Hilfe zeigt an einer Vorlage Alltagswörter; am Angehörigen-Blatt zeigt sie die technischen Begriffe (seit 14.11.2026,
       vorher der Kopf-Schalter) und behält Trust-Authority, FHIR, Code-System,
       öffentlichen und privaten Schlüssel. Im Dialog „Einreichen“ gilt dasselbe für die Hinweise zu den Schlüsseln.
   (3) Die Karte (seit 14.11.2026 die „Vorschau der Anfrage“ der Arbeitsfläche) heißt Vorschau; „Geprüft“ behauptete eine Prüfung, die vor dem Einreichen
       nicht stattgefunden hat. (Das Siegel „Geprüft“ gehört in der App zur geprüften Anfrage, a.geprueft, siehe vivodepot.html.)
   Rot-Beweis: je Probe gegen den Rückbau (die alten Texte wieder eingesetzt) im selben Lauf. Gegen den Stand davor, dessen HTML
   über VD_STUDIO_HTML eingesetzt wird, sind die Inhaltsproben rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(process.env.VD_STUDIO_HTML || path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

const ZAHL = /vierzehn|fourteen|\b14\s+(Kategorien|Bereiche|Sektoren|categories|areas|sectors)|zwölf eingebaute|twelve built-in/i;
const FACH = /Trust-Authority|FHIR|Code-System|öffentliche[nrms]? Schlüssel|private[nrms]? Schlüssel/;

function ohneKommentare(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
}
function sichtbarerText(html) { return ohneKommentare(html.replace(/<style[\s\S]*?<\/style>/g, '')); }
function dialog(html, id) {
  const a = html.indexOf('<dialog id="' + id + '"'); if (a < 0) return '';
  return html.slice(a, html.indexOf('</dialog>', a));
}
/* Was in der Einfach-Sicht sichtbar bleibt: ohne die Elemente der Klasse nur-fach (nicht verschachtelt gleichen Tags). */
function einfachSicht(block) {
  return block.replace(/<(dt|dd|p|span|details|label|li)\b[^>]*class="[^"]*\bnur-fach\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '');
}

function zahlBefunde(html) { const f = [], t = sichtbarerText(html); const m = t.match(new RegExp(ZAHL.source, 'gi')); if (m) f.push('Zahl im Studio-Text: ' + m.join(', ')); return f; }
function hilfeBefunde(html) {
  const f = [], h = dialog(html, 'dlg-hilfe'), e = einfachSicht(h);
  if (!h) return ['dlg-hilfe fehlt'];
  if (FACH.test(e)) f.push('Fachwort in der Hilfe der Einfach-Sicht: ' + e.match(FACH)[0]);
  if (!/#dlg-hilfe\.einfach \.nur-fach \{ display: none; \}/.test(html)) f.push('CSS „Hilfe Einfach blendet nur-fach aus“ fehlt');
  if (!/#dlg-hilfe:not\(\.einfach\) \.nur-einfach \{ display: none; \}/.test(html)) f.push('CSS „Hilfe Experte blendet nur-einfach aus“ fehlt');
  const fn = html.match(/function hilfeOeffnen\(\) \{([^\n]*)\}/);
  if (!fn || !/classList\.toggle\('einfach', ebeneIstEinfach\(\)\)/.test(fn[1])) f.push('hilfeOeffnen setzt die Klasse „einfach“ nicht aus der Sicht');
  if (/dlgAuf\('dlg-hilfe'\)/.test(html.replace(/function hilfeOeffnen\(\)[^\n]*\n/, ''))) f.push('ein Weg öffnet die Hilfe an hilfeOeffnen vorbei');
  return f;
}
function schluesselBefunde(html) {
  const f = [], d = einfachSicht(dialog(html, 'dlg-fertig'));
  if (FACH.test(d)) f.push('Fachwort im Dialog Einreichen (Einfach-Sicht): ' + d.match(FACH)[0]);
  if (!/ebeneIstEinfach\(\)\s*\?\s*L\('Das Passwort passt nicht[^']*Sicherungsdatei erneut herunterladen/.test(html)) f.push('Meldung der Sicherungsprüfung nennt in der Einfach-Sicht den privaten Schlüssel');
  return f;
}
/* Seit 14.11.2026 (eine Arbeitsfläche) ist die Karte die „Vorschau der Anfrage“ der Arbeitsfläche; ihr Name steht als Überschrift. */
function siegelBefunde(html) {
  const a = html.indexOf('<div id="anfrage-vorschau"');
  const f = [], k = a < 0 ? '' : html.slice(a, html.indexOf('<div id="eig-leer"', a));
  const m = k.match(/<h2 data-en="([^"]*)">([^<]*)<\/h2>/);
  if (!m) f.push('keine Überschrift auf der Karte');
  else { if (m[2] !== 'Vorschau der Anfrage') f.push('Überschrift DE „' + m[2] + '“'); if (m[1] !== 'Preview of the request') f.push('Überschrift EN „' + m[1] + '“'); }
  if (/Geprüft|Verified/.test(k)) f.push('„Geprüft“ auf der Karte');
  return f;
}

/* Rückbau: die alten Texte wieder einsetzen (Rot-Beweis ohne Git-Stand). */
const ALT = {
  hilfeBereich: ['<dd data-en="A topic in the depot, for example health, finance or advance care.">Ein Themenfeld im Depot, zum Beispiel Gesundheit, Finanzen oder Vorsorge.</dd>',
    '<dd data-en="One of the fourteen Vivodepot categories (for example health, finance, advance care).">Eine der vierzehn Vivodepot-Kategorien (z. B. Gesundheit, Finanzen, Vorsorge).</dd>'],
  fhir: ['<dt class="nur-fach">FHIR</dt><dd class="nur-fach"', '<dt>FHIR</dt><dd'],
  siegel: ['<h2 data-en="Preview of the request">Vorschau der Anfrage</h2>', '<h2 data-en="Verified">Geprüft</h2>'],
  hint: ['<span class="nur-fach" data-en="Your public key goes to Vivodepot with the submission.">', '<span data-en="Your public key goes to Vivodepot with the submission.">'],
  meldung: ['(ebeneIstEinfach()\n      ? L(', '(L('],
  institution: ['Vivodepot bringt eingebaute Institutions-Arten mit', 'Vivodepot kennt zwölf eingebaute Institutions-Arten'],
};
const rueckbau = (html, ...schluessel) => schluessel.reduce((h, k) => { assert.ok(h.includes(ALT[k][0]), k + ' fehlt im Stand'); return h.replace(ALT[k][0], ALT[k][1]); }, html);

test('[S-D · Zahl] im sichtbaren Studio-Text steht keine Zahl von Bereichen, Kategorien, Sektoren oder Einrichtungsarten', () => {
  assert.deepEqual(zahlBefunde(HTML), []);
});
test('[S-D · Zahl · Rot-Beweis] „vierzehn Vivodepot-Kategorien“ und „zwölf eingebaute Institutions-Arten“ werden gefunden', () => {
  assert.equal(zahlBefunde(rueckbau(HTML, 'hilfeBereich')).length, 1);
  assert.equal(zahlBefunde(rueckbau(HTML, 'institution')).length, 1);
});

test('[S-D · Hilfe] die Einfach-Sicht der Hilfe zeigt keine Fachwörter; die Expertensicht behält sie', () => {
  assert.deepEqual(hilfeBefunde(HTML), []);
  const h = dialog(HTML, 'dlg-hilfe');
  for (const w of ['Trust-Authority', 'FHIR', 'Code-System', 'privaten Schlüssel']) assert.ok(h.includes(w), w + ' bleibt in der Expertensicht');
  assert.ok(h.includes('Sicherungsdatei'), 'Einfach-Sicht: Alltagswort statt privater Schlüssel');
});
test('[S-D · Hilfe · Rot-Beweis] ein Fachwort ohne nur-fach-Klasse wird gefunden', () => {
  assert.equal(hilfeBefunde(rueckbau(HTML, 'fhir')).length, 1);
  assert.equal(hilfeBefunde(rueckbau(HTML, 'hilfeBereich')).length, 0, 'die Zahl ist ein anderer Befund');
});

test('[S-D · Einreichen] der Dialog nennt in der Einfach-Sicht weder öffentlichen noch privaten Schlüssel', () => {
  assert.deepEqual(schluesselBefunde(HTML), []);
  assert.match(dialog(HTML, 'dlg-fertig'), /class="nur-einfach" data-en="What Vivodepot needs to recognise your signature goes with the submission\."/);
});
test('[S-D · Einreichen · Rot-Beweis] ein Schlüssel-Hinweis ohne nur-fach-Klasse wird gefunden', () => {
  assert.equal(schluesselBefunde(rueckbau(HTML, 'hint')).length, 1);
  assert.equal(schluesselBefunde(rueckbau(HTML, 'meldung')).length, 1);
});

test('[S-D · Karte] die Karte heißt „Vorschau der Anfrage“, nirgends „Geprüft“', () => {
  assert.deepEqual(siegelBefunde(HTML), []);
});
test('[S-D · Karte · Rot-Beweis] ein „Geprüft“ auf der Karte wird gefunden', () => {
  assert.equal(siegelBefunde(rueckbau(HTML, 'siegel')).length, 3);
});
