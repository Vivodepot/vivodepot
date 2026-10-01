'use strict';
/* Befund VORFUEHRUNGSKARTE-VERDECKT (24.09.2026): die Erklärkarte der Vorführung lag halbdurchsichtig über den Kacheln. Jetzt hat
   sie ihren eigenen Platz — ein Band unten, die Ansicht endet darüber. Das Verhalten (in jeder Station, Desktop und Handy, liegt
   nichts unter der Karte) prüft tests/e2e/vorfuehrung-karte-und-kacheln.spec.js im Browser. Diese Probe hält die Bauform im Kern
   fest, damit sie in der Befund-Ratsche läuft: die Fangfläche ist durchsichtig, die Karte deckend mit Rand in der Markenfarbe, und
   im Band-Modus enden Ansicht und Dialog-Rücken über dem Band. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const css = () => [...KERN.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
function regel(selektor) {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  const m = new RegExp('(^|[}\\s])' + esc + '\\s*\\{([^{}]*)\\}').exec(css());
  return m ? m[2] : null;
}

test('[Vorführungskarte·Bauform] die Fangfläche ist durchsichtig, die Karte deckend mit kräftigem Rand in der Markenfarbe', () => {
  const flaeche = regel('#vorfuehrung-schleife');
  assert.ok(flaeche, 'Regel #vorfuehrung-schleife gefunden');
  assert.match(flaeche, /background:\s*transparent/, 'die Fangfläche verdeckt nichts');
  const karte = regel('.vorfuehrung-karte');
  assert.match(karte, /background:\s*var\(--white\)/, 'deckend weiß, nicht halbdurchsichtig');
  assert.match(karte, /border-left:\s*6px solid var\(--salbei-dunkel\)/, 'Rand in der vorhandenen Markenfarbe');
  assert.doesNotMatch(karte, /rgba\(255,\s*255,\s*255,\s*0\.\d+\)/, 'kein halbdurchsichtiges Weiß');
});

test('[Vorführungskarte·Bauform·Rot-Beweis] im Band-Modus enden Ansicht und Dialog-Rücken über dem Band, und der Kern misst das Band', () => {
  // Oben: Streifen (26px) plus, auf schmalen Bildschirmen, der Block der Spalte „Die Situation" — gemessen in --vorfuehrung-oben (U2-ADR-413, Nachtrag (3)).
  assert.match(regel('html.vorfuehrung-band #app') || '', /height:\s*calc\(100vh - var\(--vorfuehrung-oben, 26px\) - var\(--vorfuehrung-band/, '#app endet über dem Band');
  assert.match(regel('html.vorfuehrung-band #modal-rueck') || '', /bottom:\s*calc\(var\(--vorfuehrung-band/, 'der Dialog-Rücken endet über dem Band');
  assert.match(regel('html.vorfuehrung-band #modal-rueck') || '', /top:\s*var\(--vorfuehrung-oben, 26px\)/, 'der Dialog-Rücken beginnt unter Streifen und Spalten-Block');
  assert.match(KERN, /function _vorfuehrungBandMessen\(\)/, 'die Messung der Bandhöhe steht im Kern');
  assert.match(KERN, /_vorfuehrungBandLoesen\(\);\s*\n\s*_vorfuehrungModalZu\(\);/, 'beim Beenden der Schleife fällt der Band-Modus zurück');
});

/* Die Spalte „Die Situation" (U2-ADR-413 Nachtrag (3)): eine Stelle statt drei. Die Reihenfolge ist die Aussage — erst die Lage, dann
   wer man ist, dann die Schritte mit dem aktuellen aufgeklappt, dann die Knöpfe. Breit liegt die Spalte links neben der Anwendung und
   schiebt Ansicht und Dialog-Rücken zur Seite; schmal ist sie ein Block oben. Die Lese-App zeichnet dieselbe Form. */
const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
test('[Vorführung·Spalte] Rolle, Situation, Schritte, Knöpfe in dieser Reihenfolge an einer Stelle; breit links neben der Anwendung', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const texte = { situationTitel: 'Die Situation', ueberblick: 'Situation und alle Schritte', schrittVon: 'Schritt {n} von {m}', zurueck: 'Zurück', weiter: 'Weiter', selbstAusprobieren: 'Selbst ausprobieren' };
  const html = (nr) => V._vorfuehrungSpalteHTML({ situation: 'Die Lage.', rolle: { art: 'vollmacht', text: 'Sie sind: Anna' }, titel: ['Eins', 'Zwei', 'Drei'],
    nr, gesamt: 3, station: { titel: ['Eins', 'Zwei', 'Drei'][nr - 1], text: 'Der Satz.' }, text: (k) => texte[k] }, V.escapeHTML);
  const h = html(2);
  const stelle = (x) => { const i = h.indexOf(x); assert.ok(i >= 0, 'fehlt: ' + x); return i; };
  // Seit der Durchsicht vom 28.09.2026 („Wer bin ich?“): zuerst die Rolle, dann die Lage (vorher umgekehrt).
  assert.ok(stelle('class="vorfuehrung-rolle-text"') < stelle('class="vorfuehrung-situation-titel"'), 'erst die Rolle, dann die Lage');
  assert.ok(stelle('class="vorfuehrung-situation"') < stelle('<ol class="vorfuehrung-schritte">'), 'dann die Schritte');
  assert.ok(stelle('<ol class="vorfuehrung-schritte">') < stelle('class="vorfuehrung-leiste"'), 'dann die Knöpfe');
  assert.match(h, /vorfuehrung-spalte--vollmacht/, 'die Farbe folgt der Rolle');
  // Die Person, die selbst antwortet (Heimeinzug, 26.09.2026), steht auf der Seite des Depots — dieselbe Farbe wie die bevollmächtigte.
  const alsPerson = V._vorfuehrungSpalteHTML({ situation: 'Die Lage.', rolle: { art: 'person', text: 'Sie sind: Hildegard' }, titel: ['Eins'],
    nr: 1, gesamt: 1, station: { titel: 'Eins', text: 'Der Satz.' }, text: (k) => texte[k] }, V.escapeHTML);
  assert.match(alsPerson, /vorfuehrung-spalte--vollmacht/, 'die Person selbst: die Seite des Depots');
  assert.doesNotMatch(alsPerson, /vorfuehrung-spalte--empfaenger/, 'nicht die Farbe der fragenden Stelle');
  assert.match(h, /<li class="aktiv" aria-current="step"><span class="vorfuehrung-schritt-nr">2<\/span><div><p class="vorfuehrung-karte-titel">Zwei<\/p><\/div>/, 'der aktuelle Schritt mit seinem Titel');
  // Seit 30.09.2026 (Abnahme der Demo „Patientin“): der Satz des Schritts steht als Notiz am Element, nicht in der Spalte.
  assert.ok(!h.includes('Der Satz.'), 'der Erklärtext steht nicht in der Spalte');
  assert.doesNotMatch(h, /vorfuehrung-spalte--vollmacht (offen|erster)/, 'ab Schritt 2 eingeklappt, ohne die Lage');
  assert.match(html(1), /vorfuehrung-spalte--vollmacht erster"/, 'Schritt 1 zeigt die Lage auch eingeklappt (schmal: zwei Zeilen)');
  assert.match(KERN, /\.vorfuehrung-spalte\.erster:not\(\.offen\) \.vorfuehrung-situation \{[^}]*-webkit-line-clamp: 2/, 'zwei Zeilen, nicht ganz');
  assert.match(regel('html.vorfuehrung-hand body') || '', /padding-left:\s*404px/, 'breit: die Anwendung rückt neben die Spalte');
  assert.match(regel('html.vorfuehrung-hand #modal-rueck') || '', /left:\s*404px/, 'breit: Dialoge liegen über der Anwendung, nicht über der Spalte');
  for (const k of ['vorfuehrung-situation-titel', 'vorfuehrung-situation', 'vorfuehrung-rolle-text', 'vorfuehrung-ueberblick', 'vorfuehrung-schritte', 'vorfuehrung-leiste'])
    assert.ok(LESEN.includes('class="' + k + '"'), 'die Lese-App zeichnet dieselbe Form: ' + k);
  assert.doesNotMatch(KERN + LESEN, /id = 'vorfuehrung-rolle'/, 'kein zweiter Ort mehr für die Rolle');
});
