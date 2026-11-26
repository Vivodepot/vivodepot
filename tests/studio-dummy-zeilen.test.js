'use strict';
/* Studio nach dem Vorgabe-Dummy vom 14.11.2026: je Zeile der Inventur (Kennung N.. aus dem Dummy, S.. aus dem älteren
   Studio-Dummy) eine Aussage am Text von vivodepot-studio.html. Die Probe ist die Fundstelle der Zeile.
   Gebaut in S-1 (eine Arbeitsfläche); die Zeilen von S-2 (Bausteine) und S-3 (Wortlaut) stehen in der Liste OFFEN, bis ihr
   Wagen sie baut. Das Verhalten im Browser prüfen tests/e2e/studio-eine-flaeche.spec.js und die Rundgang-Ansichten studio:*.
   ROT-BEWEIS: unten je gepflanztem Fall eine Zeile, die rot werden muss. Gegen den Stand vor S-1 ist die erste Prüfung rot
   (`git show 943e97d19:vivodepot-studio.html` neben eine Kopie dieser Datei legen und sie fahren): es fehlen alle Zeilen außer N65. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

/* Schneidet ein Element mit dieser id samt Inhalt aus dem Text (gleichnamige Tags werden gezählt). */
function block(html, tag, id) {
  const von = html.search(new RegExp('<' + tag + '\\b[^>]*\\bid="' + id + '"'));
  if (von < 0) return '';
  const re = new RegExp('<(/?)' + tag + '\\b', 'g');
  re.lastIndex = von;
  let tiefe = 0, m;
  while ((m = re.exec(html))) {
    tiefe += m[1] ? -1 : 1;
    if (tiefe === 0) return html.slice(von, html.indexOf('>', m.index) + 1);
  }
  return '';
}
const hatId = (text, id) => new RegExp('\\bid="' + id + '"').test(text);
const ohneDetails = (text) => text.replace(/<details\b[\s\S]*?<\/details>/g, '');

/* Die Zeilen von S-1: Kennung → Prüfung am Text. Jede Prüfung gibt true zurück, wenn die Zeile gebaut ist. */
const ZEILEN_S1 = {
  N02: (h) => !hatId(h, 'kopf-einfach') && !hatId(h, 'kopf-fachebene'),
  N03: (h) => /<main id="raum-start" class="raum">/.test(h) && !hatId(h, 'raum-eingang')
    && /if \(id === 'willkommen'\) \{ dlgZu\('dlg-fertig'\); raumZeigen\('start'\);/.test(h),
  N04: (h) => />Vorlage erstellen</.test(block(h, 'main', 'raum-start')),
  N05: (h) => block(h, 'main', 'raum-start').includes('Legt fest, welche Daten Ihre Stelle erhält.'),
  N06: (h) => hatId(block(h, 'main', 'raum-start'), 'as-name') && block(h, 'main', 'raum-start').includes('>Name Ihrer Stelle<'),
  N07: (h) => { const s = block(h, 'main', 'raum-start');
    return s.includes('>Neu beginnen<') && s.includes('>Mit einem Beispiel beginnen<') && !/Womit möchten Sie anfangen\?/.test(s); },
  N12: (h) => /function beispielKachelText\(id\)/.test(h) && /\n {2}beispielKachelnFelderNennen\(\);\n/.test(h),
  N13: (h) => { const s = ohneDetails(block(h, 'main', 'raum-start'));
    const wahl = ['start-leer', 'tpl-csv', 'bsp-bibliothek', 'bsp-verein', 'bsp-praxis'];
    const rest = ['start-blatt', 'bsp-kommune', 'bsp-arbeitgeber', 'bsp-pflegeheim', 'bsp-notariat', 'ent-datei', 'ein-anfrage'];
    return wahl.every((id) => hatId(s, id)) && rest.every((id) => !hatId(s, id) && hatId(block(h, 'details', 'start-weitere'), id)); },
  N16: (h) => hatId(block(h, 'div', 'raum-bau'), 'bau-ort') && /function bauOrtSetzen\(\)/.test(h),
  N19: (h) => /\.bau-gitter \{ display: grid; grid-template-columns: 290px minmax\(0, 1fr\) 320px;/.test(h)
    && /<aside class="eigenschaften" id="eigenschaften" aria-label="Vorschau der Anfrage"/.test(h),
  N48: (h) => /function ziehGeistMaus\(e, n\)/.test(h) && /setDragImage\(g, 12, 12\)/.test(h) && /st\.geist = ziehGeist\(/.test(h),
  N49: (h) => hatId(block(h, 'div', 'tafel-felder'), 'tpl-name'),
  N50: (h) => hatId(block(h, 'div', 'tafel-felder'), 'tpl-zweck'),
  N54: (h) => /class: 'vk-name-eingabe'/.test(h),
  N55: (h) => /class: 'vk-pflicht-wahl'/.test(h) && /\[\[true, L\('Pflicht', 'Required'\)\], \[false, L\('Freiwillig', 'Optional'\)\]\]/.test(h),
  N59: (h) => /aria-label="Vorschau der Anfrage"/.test(h),
  N60: (h) => hatId(block(h, 'div', 'anfrage-vorschau'), 'av-stelle'),
  N61: (h) => hatId(block(h, 'div', 'anfrage-vorschau'), 'av-titel'),
  N62: (h) => hatId(block(h, 'div', 'anfrage-vorschau'), 'av-zweck'),
  N63: (h) => hatId(block(h, 'div', 'anfrage-vorschau'), 'av-felder'),
  N64: (h) => h.includes("L('Hier erscheinen die Datenfelder Ihrer Vorlage.', 'The data fields of your template appear here.')"),
  N65: (h) => !/Beispielperson/.test(block(h, 'aside', 'eigenschaften')),
  N67: (h) => hatId(h, 'tel-vorlage') && hatId(h, 'tel-vorschau') && /\.bau-gitter\.zeig-vorschau > :not\(\.eigenschaften\) \{ display: none; \}/.test(h),
  S02: (h) => ZEILEN_S1.N13(h),
  /* S-3: Wortlaut der Arbeitsfläche aus Sicht der Stelle (gelandet mit S-2/S-3, hier als Zeile geführt). */
  N20: (h) => /<h2 id="pal-titel" data-en="Building blocks">Bausteine<\/h2>/.test(h),
  N51: (h) => /<h3 class="vorlage-ueberschrift" data-en="Data fields in this template">Datenfelder in dieser Vorlage<\/h3>/.test(h),
  N66: (h) => { const s = ohneDetails(block(h, 'div', 'raum-bau')).replace(/<[^>]*>/g, ' ');
    return s.length > 0 && !/\bFrage(n)?\b/.test(s) && !/\b(Schema|JSON|Credential|Claim)\b/.test(s); },
  /* S-1c: die Wahl auf dem Start steht als Zeilen mit „›“, die Beispiel-Kacheln tragen die Titel des Dummys aus Sicht der Stelle. */
  N10: (h) => />Aufnahme in einen Verein<\/span>/.test(block(h, 'button', 'bsp-verein')),
  N11: (h) => />Anmeldung in einer Praxis<\/span>/.test(block(h, 'button', 'bsp-praxis')),
  S1c: (h) => /<section class="start-wahl" aria-labelledby="start-titel">/.test(h)
    && /\.start-wahl > \.kacheln \{ grid-template-columns: 1fr;/.test(h)
    && /\.start-wahl > \.kacheln > \.kachel::after \{ content: "›";/.test(h),
  S03: (h) => /<header class="app">[\s\S]*?id="ein-antworten"[\s\S]*?<\/header>/.test(h),
};

/* Zeilen, die ihr Wagen noch baut (S-2, S-3) oder die mit Wort in einen anderen Posten gehen (S12 → S-5). */
const OFFEN = {
  N21: 'S-2', N22: 'S-2', N28: 'S-2', N39: 'S-2', N40: 'S-2', N43: 'S-2', N56: 'S-2', N68: 'S-2', N69: 'S-2',
  S12: 'S-5',
};

function fehlend(html) {
  return Object.keys(ZEILEN_S1).filter((k) => !ZEILEN_S1[k](html));
}

test('[Studio·Dummy] alle Zeilen von S-1 stehen im Studio', () => {
  assert.deepEqual(fehlend(HTML), []);
});

/* Die offenen Zeilen sind keine Aussetzung, sondern eine Liste: jede hat ihren Wagen, keine steht zugleich als gebaut da.
   Baut ein Wagen eine Zeile, wandert sie von OFFEN in die Prüfungen dieses Wagens. */
test('[Studio·Dummy] jede offene Zeile hat ihren Wagen und steht nicht zugleich unter den gebauten', () => {
  for (const [k, wagen] of Object.entries(OFFEN)) {
    assert.match(wagen, /^S-\d$/, k + ': ohne Wagen');
    assert.ok(!(k in ZEILEN_S1), k + ': zugleich gebaut und offen');
  }
});

test('[Studio·Dummy·Rot-Beweis] ein zurückgekehrter Eingang, ein fehlender Kopf-Ort und eine Karte ohne Pflicht-Schalter werden rot', () => {
  const eingang = HTML.replace('<main id="raum-start" class="raum">', '<main id="raum-eingang" class="raum"></main>\n<main id="raum-start" class="raum" hidden>');
  assert.ok(fehlend(eingang).includes('N03'));
  const ohneOrt = HTML.replace('<span class="bau-ort" id="bau-ort"></span>', '');
  assert.ok(fehlend(ohneOrt).includes('N16'));
  const ohneWahl = HTML.replace("class: 'vk-pflicht-wahl'", "class: 'vk-x'");
  assert.ok(fehlend(ohneWahl).includes('N55'));
  const sechsteWahl = HTML.replace('<details class="start-weitere" id="start-weitere">', '<button id="bsp-kommune"></button>\n    <details class="start-weitere" id="start-weitere">');
  assert.ok(fehlend(sechsteWahl).includes('N13'));
  const fragen = HTML.replace('>Datenfelder in dieser Vorlage</h3>', '>Fragen in dieser Vorlage</h3>');
  assert.ok(fehlend(fragen).includes('N51') && fehlend(fragen).includes('N66'));
  const alterTitel = HTML.replace('>Anmeldung in einer Praxis</span>', '>Anamnese-Bogen</span>');
  assert.ok(fehlend(alterTitel).includes('N11'));
  const raster = HTML.replace('<section class="start-wahl" aria-labelledby="start-titel">', '<section aria-labelledby="start-titel">');
  assert.ok(fehlend(raster).includes('S1c'));
});
