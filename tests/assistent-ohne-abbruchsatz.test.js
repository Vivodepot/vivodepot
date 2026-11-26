'use strict';
/* Befund ASSISTENT-ALT-UND-ABBRUCHSATZ (21.11.2026): im Assistenten Umzug stand wieder „Sie können jederzeit pausieren“ in der Einleitung und
   „Sie können jederzeit abbrechen — …“ über der Knopfzeile, obwohl die Klasse am 31.10.2026 schon einmal gestrichen war. Entscheidung vom
   21.11.2026: die ganze Klasse fällt weg, deutsch und englisch, privat und Pro, in allen Assistenten, Seiten und Dialogen. Der Abbrechen-Knopf und
   die Anzeige oben sagen, was der Satz sagen wollte. Die Zeile unter jedem Schritt fällt ganz weg; die Aussage über das Speichern steht einmal,
   mit der Einleitung im ersten Schritt (Entscheidung 21.11.2026).
   Wächter gegen die Klasse: kein Text in den vier Sprachmodulen und kein Satz im Kern (ohne Kommentare) sagt der Person, dass sie jederzeit
   pausieren, abbrechen, aufhören oder unterbrechen darf. Ausgenommen ist, was eine Befugnis oder ein Recht beschreibt (eine benannte Person darf
   eine Nachbildung pausieren, eine Einwilligung lässt sich widerrufen): das sind keine Sätze an die Person über den Ablauf.
   Rot-Beweis: der alte Satz wird erkannt, in beiden Sprachen. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const { istOeffentlich } = require('./helfer/nur-privat.js');
// Im öffentlichen Zuschnitt fehlen die Pro-Textsätze; dort prüft die Probe die beiden Privat-Textsätze.
const MODULE = istOeffentlich() ? ['textsatz-de-modul.json', 'textsatz-en-modul.json']
  : ['textsatz-de-modul.json', 'textsatz-de-pro-modul.json', 'textsatz-en-modul.json', 'textsatz-en-pro-modul.json'];

const KLASSE = [
  /(Sie können|Du kannst)\s+(jederzeit|zwischendurch|immer)\s+(pausieren|abbrechen|aufhören|unterbrechen|eine Pause (machen|einlegen))/i,
  /\bYou can\s+(pause|cancel|stop|quit|take a break)\s+(at any time|anytime|whenever)/i,
  /\bYou can\s+(always|at any time)\s+(pause|cancel|stop|quit)/i,
];

function abbruchsaetze(texte) {
  const funde = [];
  for (const [k, v] of Object.entries(texte)) {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (KLASSE.some((re) => re.test(s))) funde.push(k);
  }
  return funde;
}

function ohneKommentare(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((z) => !/^\s*\/\//.test(z)).join('\n');
}

test('[ASSISTENT-ABBRUCHSATZ] kein Sprachmodul trägt einen Satz der Klasse „Sie können jederzeit pausieren/abbrechen“', () => {
  for (const m of MODULE) {
    const texte = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', m), 'utf8')).texte;
    assert.deepEqual(abbruchsaetze(texte), [], m + ': Sätze der gestrichenen Klasse');
  }
});

test('[ASSISTENT-ABBRUCHSATZ] der Kern trägt keinen Satz der Klasse und keine Pausen-Zeile im Assistenten', () => {
  for (const d of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const code = ohneKommentare(fs.readFileSync(path.join(WURZEL, d), 'utf8'));
    const treffer = KLASSE.map((re) => (code.match(new RegExp(re.source, 'gi')) || [])).flat();
    assert.deepEqual(treffer, [], d + ': Sätze der gestrichenen Klasse');
  }
  const kern = ohneKommentare(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8'));
  assert.deepEqual(speicherZeilen(kern), ['einleitung'], 'die Speicher-Aussage des Assistenten steht genau einmal, mit der Einleitung im ersten Schritt');
});

// Wo der Assistent seine Speicher-Aussage setzt: „einleitung“ (nur im ersten Schritt) oder „jeder-schritt“.
// Seit dem Assistenten als Anlass-Seite (U-AS, 23.11.2026) gibt es keine Schritte mehr: alle Fragen stehen in EINER
// `.wizard-liste`, die Seite wird einmal gezeichnet — eine Zeile ohne Schritt-Bedingung steht dort genau einmal, bei der Einleitung.
function speicherZeilen(kern) {
  const seite = kern.includes('<div class="wizard-liste">');
  return kern.split('\n').filter((z) => z.includes("speicherSatz('assistentPause')")).map((z) => ((/if \(idx === 0\)/.test(z) || seite) ? 'einleitung' : 'jeder-schritt'));
}

test('[ASSISTENT-ABBRUCHSATZ] Rot-Beweis: die Zeile unter jedem Schritt (Stand vor dem 21.11.2026) wird erkannt', () => {
  const alt = "  html += '</div>';\n  html += '<p class=\"pause-erlaubnis\">' + escapeHTML(speicherSatz('assistentPause')) + '</p>';\n";
  assert.deepEqual(speicherZeilen(alt), ['jeder-schritt']);
  // Gegenprobe: dieselbe Zeile in der Seitenform (eine Liste, einmal gezeichnet) steht einmal bei der Einleitung.
  assert.deepEqual(speicherZeilen(alt + "  html += '<div class=\"wizard-liste\">';\n"), ['einleitung']);
});

test('[ASSISTENT-ABBRUCHSATZ] Rot-Beweis: der alte Satz wird erkannt, deutsch und englisch; Befugnisse bleiben unberührt', () => {
  assert.deepEqual(abbruchsaetze({
    a: 'Sie können jederzeit abbrechen — was Sie eingetragen haben, ist auf diesem Gerät gespeichert.',
    b: 'Wir gehen die Punkte durch. Sie können jederzeit pausieren.',
    c: 'Sie können jederzeit aufhören: Was Sie eintragen, speichert sich von selbst.',
    d: 'You can cancel at any time — what you\'ve entered is saved on this device.',
    e: 'We\'ll go through the points. You can pause at any time.',
    f: 'Diese Person ist bevollmächtigt, die Nachbildung jederzeit zu pausieren oder zu löschen.',
    g: 'You can withdraw consent at any time; the withdrawal applies only to the future.',
  }), ['a', 'b', 'c', 'd', 'e']);
});
