'use strict';
/* Befund HILFE-KEIN-WEG-AN-UNS-FALSCH (HOCH, 23.10.2026): Die Hilfe sagte „Die Anwendung schickt nichts aus Ihrem Depot an uns,
   dafür gibt es keinen Weg.“ Seit „Link senden“ und „Sicher weitergeben“ lädt die Person selbst eine verschlüsselte Datei auf
   unsere Ablage (U2-ADR-183), und die Ablage sieht Größe und Zeiten. Der Satz war falsch; tests/netz-aussagen.test.js sah ihn
   nicht, weil „aus Ihrem Depot“ dort als Eingrenzung gilt.
   Gehalten wird:
   - die Hilfe „Was Vivodepot nicht sieht“ nennt beide Knöpfe mit ihrem heutigen Namen, was die Ablage sieht, und wann gelöscht wird;
   - die Hilfe zum Weitergeben nennt „Link senden“;
   - Klasse: kein Satz im DE- und EN-Textsatz sagt, dass nichts an uns oder ins Netz geht, ohne Eingrenzung („von sich aus“,
     „beim Speichern“, „wenn Sie …“). Rot-Beweis mit den alten Sätzen. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TOOLS = path.join(__dirname, '..', 'tools');
const textsatz = (datei) => JSON.parse(fs.readFileSync(path.join(TOOLS, datei), 'utf8')).texte;
const DE = textsatz('textsatz-de-modul.json');
const EN = textsatz('textsatz-en-modul.json');

const ALT = {
  de: 'Die Anwendung schickt nichts aus Ihrem Depot an uns, dafür gibt es keinen Weg.',
  en: 'The app sends nothing from your depot to us; there is no way for it to.',
  deNetz: 'Es geht nichts ins Netz.',
  enNetz: 'Nothing goes onto the network.',
};

// Eine Aussage „nichts geht an uns / ins Netz“; erlaubt nur mit einer Eingrenzung, die sagt, wann sie gilt.
const AUSSAGE = [
  /\b(?:nichts|keine\s+Daten)\b[^.!?;]{0,60}\b(?:an\s+uns|zu\s+uns|ins\s+Netz)\b/i,
  /\bdafür\s+gibt\s+es\s+keinen\s+Weg\b/i,
  /\b(?:nothing|no\s+data)\b[^.!?;]{0,60}\b(?:to\s+us|onto\s+the\s+network|over\s+the\s+network)\b/i,
  /\bno\s+way\s+for\s+it\b/i,
];
const EINGEGRENZT = /\bvon\s+sich\s+aus\b|\bbeim\s+Speichern\b|\bwenn\s+Sie\b|\bon\s+its\s+own\b|\bwhen\s+saving\b|\bif\s+you\b/i;
const saetze = (text) => text.replace(/\s+/g, ' ').split(/(?<=[.!?;])\s+/).map((s) => s.trim()).filter(Boolean);
function funde(texte) {
  const raus = [];
  for (const [k, v] of Object.entries(texte)) {
    if (typeof v !== 'string') continue;
    for (const s of saetze(v)) if (AUSSAGE.some((r) => r.test(s)) && !EINGEGRENZT.test(s)) raus.push(k + ': ' + s);
  }
  return raus;
}

test('[Hilfe·Kein-Weg] „Was Vivodepot nicht sieht“ nennt beide Knöpfe, was die Ablage sieht und wann gelöscht wird (DE, EN)', () => {
  for (const [T, sieben] of [[DE, 'sieben Tagen'], [EN, 'seven days']]) {
    const a = T['hilfe:was-vivodepot-nicht-sieht.abschnitt0'];
    assert.ok(a.includes(T['strings:linkSendenKnopf.text']), 'nennt den Knopf ' + T['strings:linkSendenKnopf.text']);
    assert.ok(a.includes(T['strings:shlKnopf.text']), 'nennt den Knopf ' + T['strings:shlKnopf.text']);
    assert.ok(a.includes(sieben));
    assert.ok(!a.includes(T === DE ? ALT.de : ALT.en), 'der alte Satz steht nicht mehr da');
  }
  assert.match(DE['hilfe:was-vivodepot-nicht-sieht.einleitung'], /von sich aus/);
  assert.match(EN['hilfe:was-vivodepot-nicht-sieht.einleitung'], /on its own/);
});

test('[Hilfe·Kein-Weg] die Hilfe zum Weitergeben nennt „Link senden“, das Speichern ist eingegrenzt (DE, EN)', () => {
  for (const T of [DE, EN]) {
    assert.ok(T['hilfe:weitergeben-empfaengerin.abschnitt0'].includes(T['strings:linkSendenKnopf.text']));
  }
  assert.match(DE['hilfe:speichern-sicherung.einleitung'], /Beim Speichern schickt die Anwendung nichts ins Netz\./);
  assert.match(EN['hilfe:speichern-sicherung.einleitung'], /When saving, the app sends nothing over the network\./);
});

test('[Hilfe·Kein-Weg·Klasse] kein Satz im Textsatz sagt ohne Eingrenzung, dass nichts an uns oder ins Netz geht (DE, EN)', () => {
  assert.deepEqual(funde(DE), []);
  assert.deepEqual(funde(EN), []);
});

test('[Hilfe·Kein-Weg·Klasse·Rot-Beweis] die alten Sätze schlagen an, die eingegrenzten nicht', () => {
  assert.equal(new Set(funde({ a: ALT.de, b: ALT.en, c: ALT.deNetz, d: ALT.enNetz }).map((f) => f.split(':')[0])).size, 4);
  assert.deepEqual(funde({ a: 'Die Anwendung schickt von sich aus keine Daten aus Ihrem Depot an einen Server.',
    b: 'Beim Speichern schickt die Anwendung nichts ins Netz.', c: 'When saving, the app sends nothing over the network.' }), []);
});
