'use strict';
/* Sub-Depot-Ansicht nach der Abnahme der Gestaltungsleitung (31.10.2026, C04), erster Teil (C04a):
   · der Leerzustand zeigt ein Zeichen und „Noch keine Sub-Depots.“, ohne den Satz zum eigenen Passwort;
   · diese Aussage trägt das Schloss an jeder aktiven Sub-Depot-Karte (Name über aria-label und title).
   Der Leerzustand nutzt Designs Klasse leer-platzhalter, kein eigenes Muster. „Was ein Sub-Depot ist“ als Aufklapper
   (C04b) kommt mit Designs Baustein und ist hier nicht Gegenstand.
   Rot-Beweis: die frühere Form (hinweis-box mit dem langen Satz, Karte ohne Schloss) fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const CSS = fs.readFileSync(path.join(REPO, 'tools/erscheinung/stil/grundlage.css'), 'utf8');
const DE = require('../tools/textsatz-de-modul.json').texte;
const EN = require('../tools/textsatz-en-modul.json').texte;

function ansicht(kern) {
  const a = kern.indexOf('function renderVerwalteteDepots() {');
  assert.ok(a > 0, 'renderVerwalteteDepots fehlt');
  return kern.slice(a, kern.indexOf('\n}\n', a));
}

function pruefe(kern) {
  const f = ansicht(kern);
  assert.match(f, /<div class="leer-platzhalter" id="verwaltete-leer">' \+ icon\('users', 24\) \+ '<p>' \+ escapeHTML\(STRINGS\.verwalteteLeer\)/, 'Leerzustand mit Zeichen');
  assert.doesNotMatch(f, /hinweis-box">' \+ STRINGS\.verwalteteLeer/, 'kein grauer Kasten mit dem Satz');
  assert.match(f, /class="sd-schloss" role="img" aria-label="' \+ escapeAttr\(STRINGS\.subSchlossEigenesPasswort\) \+ '" title="' \+ escapeAttr\(STRINGS\.subSchlossEigenesPasswort\)/, 'Schloss an der Karte');
}

test('[Sub-Depot·C04a] Leerzustand ohne Satz zum Passwort, Schloss an der Karte', () => {
  pruefe(KERN);
});

test('[Sub-Depot·C04a] kein zweites Muster: leer-platzhalter ist Designs vorhandene Regel, nur einmal definiert', () => {
  assert.equal((CSS.match(/^\s*\.leer-platzhalter \{/gm) || []).length, 1);
});

test('[Sub-Depot·C04a] ein Zeichen, eine Farbe: das Schloss im Kartenkopf trägt die Farbe des Schlosses bei „Verschlossen“', () => {
  const regel = CSS.match(/^\s*\.sd-schloss \{([^}]*)\}/m);
  assert.ok(regel, 'Regel .sd-schloss');
  const farbe = (regel[1].match(/(?:^|;)\s*color:\s*([^;]+);/) || [])[1];
  const verschlossen = (ansicht(KERN).match(/<p class="gesperrt" style="color:([^;"]+)/) || [])[1];
  assert.ok(verschlossen, 'Zeile „Verschlossen“ mit Farbe');
  assert.equal(farbe && farbe.trim(), verschlossen.trim());
});

test('[Sub-Depot·C04a] die Texte: kurzer Leerzustand, die Aussage zum Passwort steht am Schloss, deutsch und englisch', () => {
  assert.equal(DE['strings:verwalteteLeer.text'], 'Noch keine Sub-Depots.');
  assert.equal(EN['strings:verwalteteLeer.text'], 'No sub-depots yet.');
  assert.match(DE['strings:subSchlossEigenesPasswort.text'], /eigenem Passwort/);
  assert.match(EN['strings:subSchlossEigenesPasswort.text'], /own password/);
  assert.doesNotMatch(DE['strings:verwalteteLeer.text'], /Passwort/);
});

test('[Sub-Depot·C04a·Rot-Beweis] die frühere Form mit grauem Kasten und ohne Schloss fällt durch', () => {
  const ohneLeer = KERN
    .replace("'<div class=\"leer-platzhalter\" id=\"verwaltete-leer\">' + icon('users', 24) + '<p>' + escapeHTML(STRINGS.verwalteteLeer) + '</p></div></div>'",
      "'<div class=\"hinweis-box\">' + STRINGS.verwalteteLeer + '</div></div>'");
  assert.notEqual(ohneLeer, KERN);
  assert.throws(() => pruefe(ohneLeer));
  const ohneSchloss = KERN.replace(/<span class="sd-schloss"[^\n]*?<\/span>/, '');
  assert.notEqual(ohneSchloss, KERN);
  assert.throws(() => pruefe(ohneSchloss));
});
