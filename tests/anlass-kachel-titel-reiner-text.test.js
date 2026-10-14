'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund ANLASS-KACHEL-TITEL-ROH: der Titel einer Situation ab Werk stand unmaskiert in der Anlass-Kachel
   ────────────────────────────────────────────────────────────────────────
   Eine Anlass-Kachel ohne eigene Beschriftung trägt den Titel ihrer Situation (`_anlassAusSituation`). `renderAnlassAuswahl`
   setzte ihn roh ins Markup, und für Situationen ab Werk prüft der Kern nur die Struktur, nie den Text. Eine Zutat mit Markup
   im Titel (der Weg, auf dem Partner-Inhalt in ein Produkt kommt) hätte es auf die Startseite gebracht.
   Zwei Stellen halten jetzt, jede mit eigenem Rot-Beweis:
   (1) der Bau: eine Situations- oder Assistenten-Zutat mit einer Zeichenkette, die kein reiner Text ist, wird nicht eingebacken;
   (2) die Senke: steht ein solcher Titel trotzdem in der Datei, zeigt die Kachel ihn als Text.
   Gemessen an einem echt konfektionierten Pro-Produkt, denn dort tragen die Kacheln den Titel ihrer Situation.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const PT = require('../tools/lib/produkt-text-erzeugen.js');
const RT = require('../tools/lib/zutat-reiner-text.js');

const REPO = path.join(__dirname, '..');
const LOAD_KERN = require.resolve('./load-kern.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'anlass-kachel-titel-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const HARMLOS = 'Probe-Kachel-Titel-7f3a';
const MARKUP = '<img src=x onerror=window.__anlassKachelProbe=1>';
const PRODUKT = VP.PRODUKTE.find((x) => x.slug === 'pro-de');

/* Die Situations-Zutat von Pro mit einer zusätzlichen Situation, deren Kachel den Titel der Situation trägt. */
function zutatMitTitel(titel, name) {
  const modul = JSON.parse(fs.readFileSync(VP.PRO_SITUATIONEN_PFAD_DE, 'utf8'));
  const vorlage = modul.situationen['pro-vertretung'];
  modul.situationen['probe-kachel'] = Object.assign(JSON.parse(JSON.stringify(vorlage)), { titel });
  const pfad = path.join(TMP, name + '.json');
  fs.writeFileSync(pfad, JSON.stringify(modul));
  return pfad;
}
function bauen(name, zutat, kernQuelle) {
  const dateien = VP.modulDateienFuer(PRODUKT).filter((f) => f !== VP.PRO_SITUATIONEN_PFAD_DE).concat([zutat]);
  const r = konfektionieren({
    ziel: path.join(TMP, name), slug: PRODUKT.slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: dateien, kernQuelle,
  });
  return path.join(r.ordner, 'vivodepot.html');
}
function laden(htmlPfad) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = htmlPfad;
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}
/* Die gebaute Datei mit dem Markup-Titel an der Stelle des harmlosen: der Stand, den der Bau nicht mehr herstellt. */
function mitMarkupTitel(htmlPfad, name) {
  const text = fs.readFileSync(htmlPfad, 'utf8');
  assert.ok(text.includes(HARMLOS), 'Testvoraussetzung: der Titel der Probe-Situation steht in der gebauten Datei');
  const pfad = path.join(TMP, name + '.html');
  fs.writeFileSync(pfad, text.split(HARMLOS).join(MARKUP));
  return pfad;
}
function startseite(htmlPfad) {
  const k = laden(htmlPfad);
  k.V.renderAnlassAuswahl();
  return { k, html: k.document.getElementById('overlay-inhalt').innerHTML };
}

test('[Kachel·Senke] ein Situationstitel mit Markup steht als Text in der Kachel', () => {
  const gebaut = bauen('harmlos', zutatMitTitel(HARMLOS, 'zutat-harmlos'));
  const vorher = startseite(gebaut);
  assert.ok(vorher.k.V.anlaesseAlle().some((a) => a.id === 'probe-kachel' && a.label === HARMLOS), 'Testvoraussetzung: die Kachel trägt den Titel ihrer Situation');
  assert.ok(vorher.html.includes('<span>' + HARMLOS + '</span>'), 'Testvoraussetzung: die Kachel wird gerendert');
  const { html } = startseite(mitMarkupTitel(gebaut, 'markup'));
  assert.ok(html.includes('&lt;img src=x onerror=window.__anlassKachelProbe=1&gt;'), 'der Titel steht maskiert da');
  assert.ok(!html.includes('<img src=x'), 'kein eingeschleustes Element');
});

test('[Kachel·Senke·Rot-Beweis] ohne die Maskierung an der Kachel steht das Element im Markup', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const ohne = kern.split("'</span><span>' + escapeTextknoten(a.label) + '</span></button>'").join("'</span><span>' + a.label + '</span></button>'");
  assert.notEqual(ohne, kern, 'Testvoraussetzung: die Pflanzung greift');
  const gebaut = bauen('rot', zutatMitTitel(HARMLOS, 'zutat-rot'), ohne);
  const { html } = startseite(mitMarkupTitel(gebaut, 'rot-markup'));
  assert.ok(html.includes('<span>' + MARKUP + '</span>'), 'der Stand vor dem Fix zeigt das Markup roh');
});

test('[Kachel·Bau] eine Situations-Zutat mit Markup im Titel wird nicht eingebacken', () => {
  assert.throws(() => bauen('bau', zutatMitTitel(MARKUP, 'zutat-markup')), /Kein reiner Text in zutat-markup\.json \(situation\): situationen\.probe-kachel\.titel/);
});

test('[Kachel·Bau] die Regel gilt für jede Zeichenkette von Situationen und Assistenten, und nur für diese Arten', () => {
  assert.deepEqual(RT.NUR_REINER_TEXT_MODULTYPEN.slice(), ['situation', 'wizard']);
  for (const modulTyp of RT.NUR_REINER_TEXT_MODULTYPEN) {
    for (const wert of ['<b>x</b>', 'a &amp; b', 'sagt "x"', '</span>']) {
      assert.throws(() => RT.zutatReinerTextPruefen({ modulTyp, tief: { liste: [{ text: wert }] } }, 'probe.json'), /Kein reiner Text in probe\.json .*tief\.liste\.0\.text/, modulTyp + ': ' + wert);
    }
    for (const wert of ['a < b', 'Müller & Söhne', 'Doctor’s appointment', "can't", '„Zitat“']) {
      assert.doesNotThrow(() => RT.zutatReinerTextPruefen({ modulTyp, text: wert }, 'probe.json'), modulTyp + ': ' + wert);
    }
  }
});

test('[Kachel·Bau·Rot-Beweis] ohne die Prüfung beim Einbacken gelangt der Titel in die Datei', () => {
  // Dieselbe Zutat über den Backschritt allein, ohne die Prüfung davor: so stand es vor dem Fix.
  const modul = JSON.parse(fs.readFileSync(zutatMitTitel(MARKUP, 'zutat-rot-bau'), 'utf8'));
  const region = PT.AB_WERK_REGIONEN.find((r) => r.modulTyp === 'situation');
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { quelle } = PT._abWerkModuleAufText(kern, [{ region, roh: modul, basisname: 'zutat-rot-bau.json' }], 'vivodepot.html');
  assert.ok(quelle.includes('onerror=window.__anlassKachelProbe=1'), 'der Backschritt selbst prüft keinen Text');
});

test('[Kachel·Bau] das Muster im Bau ist dasselbe wie im Kern', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const m = /const _TAG_ODER_REFERENZ = (\/.*\/);/.exec(kern);
  assert.ok(m, 'Testvoraussetzung: _TAG_ODER_REFERENZ steht im Kern');
  assert.equal(String(RT.TAG_ODER_REFERENZ), m[1]);
});

test('[Kachel] die ausgelieferten Situations- und Assistenten-Zutaten sind reiner Text', () => {
  let geprueft = 0;
  for (const p of VP.PRODUKTE) {
    for (const f of VP.modulDateienFuer(p)) {
      const roh = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!RT.NUR_REINER_TEXT_MODULTYPEN.includes(roh.modulTyp)) continue;
      assert.deepEqual(RT.nichtReineTextStellen(roh, ''), [], path.basename(f));
      geprueft++;
    }
  }
  assert.ok(geprueft >= 2, 'Testvoraussetzung: mindestens die zwei Pro-Zutaten werden geprüft, geprüft: ' + geprueft);
});

/* escapeTextknoten maskiert weniger als escapeHTML (kein Anführungszeichen, kein Apostroph). Das ist nur zwischen zwei Tags
   richtig. Darum: jede Verwendung steht unmittelbar zwischen einem Literal, das mit `>` endet, und einem, das mit `<` beginnt,
   und die Zahl der Aufrufer steht fest. Wer eine dritte Stelle braucht, hebt die Zahl hier bewusst an. */
const TEXTKNOTEN_AUFRUFER = Object.freeze({ 'vivodepot.html': 2 });
const TEXTKNOTEN_LAGE = /'[^'\n]*>' \+ escapeTextknoten\([^()\n]*\) \+ '<[^'\n]*'/g;
function textknotenVerwendungen(text) {
  const alle = (text.match(/\bescapeTextknoten\(/g) || []).length - (text.match(/function escapeTextknoten\(/g) || []).length;
  return { alle, inTextknotenLage: (text.match(TEXTKNOTEN_LAGE) || []).length };
}
test('[Kachel·Maskierung] escapeTextknoten steht nur zwischen zwei Tags, und nur an den gezählten Stellen', () => {
  const oberflaechen = require('../tools/marken-adressen-pruefen.js').OBERFLAECHEN;
  for (const d of oberflaechen) {
    const v = textknotenVerwendungen(fs.readFileSync(path.join(REPO, d), 'utf8'));
    assert.equal(v.alle, TEXTKNOTEN_AUFRUFER[d] || 0, d + ': Zahl der Aufrufer');
    assert.equal(v.inTextknotenLage, v.alle, d + ': jede Verwendung in Textknoten-Lage');
  }
});
test('[Kachel·Maskierung·Rot-Beweis] eine Verwendung in einem Attribut oder eine weitere Stelle wäre rot', () => {
  const imAttribut = "x = '<button title=\"' + escapeTextknoten(a.label) + '\">';";
  assert.deepEqual(textknotenVerwendungen(imAttribut), { alle: 1, inTextknotenLage: 0 });
  const imTag = "x = '<span ' + escapeTextknoten(a.label) + '>';";
  assert.deepEqual(textknotenVerwendungen(imTag), { alle: 1, inTextknotenLage: 0 });
  const richtig = "x = '<span>' + escapeTextknoten(a.label) + '</span>';";
  assert.deepEqual(textknotenVerwendungen(richtig), { alle: 1, inTextknotenLage: 1 });
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(textknotenVerwendungen(kern + "\ny = '<p>' + escapeTextknoten(z) + '</p>';").alle, TEXTKNOTEN_AUFRUFER['vivodepot.html'] + 1);
});
