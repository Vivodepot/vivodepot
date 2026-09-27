'use strict';
/* Beschriftungs-Platzhalter `{beschriftung:schluessel}` (19.09.2026): eine Beschriftung wird an EINER Stelle geführt, jeder Satz, der sie nennt, holt sie beim Lesen.
   Anlass und Klasse: tools/zitierte-beschriftung-pruefen.js.
   GERÜST-TEST: die Kernkopien laden bewusst das nackte Gerüst (`blank: true`), weil nur die Texte gemessen werden, kein Bereich — roh ist hier Absicht. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const P = require('../tools/zitierte-beschriftung-pruefen.js');

const PAARE = [
  // Update-Anleitung Schritt 3 (23.09.2026): zeigte auf „Daten einlesen“ (Import je Bereich) — in einer
  // frisch geöffneten neuen Fassung gibt es den nicht; der Wiedereinstieg ist der Datei-öffnen-Knopf.
  ['einstUpdateSchritt3', 'welcomeDateiOeffnen'],
  ['einstGesamtExportWegweiser', 'navWeitergeben'],
  ['einstGesamtExportWegweiser', 'herausgebenGanzesDepot'],
  ['anlegenSpeicherHinweisRuhig', 'sicherungskopieMenuepunkt'],
  ['prueftermineEinfuehrung', 'dokumentPanelTitel'],
  ['vereinbarungAnnahmeUngeprueftText', 'vereinbarungStatusUngeprueft'],
  ['vereinbarungOhneText', 'vereinbarungStatusOhne'],
  ['wiedereinstiegHinweisText', 'welcomeDateiOeffnen'],
];

function kernMit(ersetzungen, fn, opts) {
  // opts.quelle: Pfad des Kern-Textes (Vorgabe: das Gerüst), opts.laden: ladeKern-Optionen (Vorgabe: nacktes Gerüst).
  // Seit S8 (U2-ADR-428) steht der deutsche Satz nicht mehr im Gerüst, sondern als Sprachmodul im gebackenen deutschen Produkt (compact JSON: "schluessel":"text").
  const quelle = fs.readFileSync((opts && opts.quelle) || require('./produkt-html-erzeugen.js').produktHtml('privat-de'), 'utf8');
  let text = quelle;
  for (const [alt, neu] of ersetzungen) {
    assert.equal(text.split(alt).length - 1, 1, 'Anker steht genau einmal: ' + alt.slice(0, 50));
    text = text.replace(alt, neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beschriftung-'));
  const kopie = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(kopie, text);
  const vorher = process.env.KERN_HTML_PATH;
  const LOAD = require.resolve('./load-kern.js');
  process.env.KERN_HTML_PATH = kopie;
  delete require.cache[LOAD];
  try { return fn(require(LOAD).ladeKern((opts && opts.laden) || {}).V); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD];
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('[Beschriftung·Platzhalter] jeder umgestellte Satz nennt die HEUTIGE Beschriftung des anderen Textes, ohne Rest-Platzhalter', () => {
  const { V } = ladeKern();
  for (const [satz, beschriftung] of PAARE) {
    const t = V.STRINGS[satz];
    assert.ok(typeof t === 'string' && t.length > 10, satz + ': der Satz ist lesbar');
    assert.ok(!/\{beschriftung:/.test(t), satz + ': kein unaufgelöster Platzhalter — ' + t);
    assert.ok(t.includes(V.STRINGS[beschriftung]), satz + ' nennt „' + V.STRINGS[beschriftung] + '“ (' + beschriftung + ')');
  }
});

test('[Beschriftung·Platzhalter·Rot-Beweis] wird der Knopf umbenannt, zieht der Satz mit — das ist der Fall, der beim Rückweg-Hinweis schiefging', () => {
  kernMit([[`"strings:welcomeDateiOeffnen.text":"Schon ein Depot? Datei öffnen"`, `"strings:welcomeDateiOeffnen.text":"Vorhandenes Depot öffnen"`]], (V) => {
    assert.equal(V.STRINGS.welcomeDateiOeffnen, 'Vorhandenes Depot öffnen', 'Vorbedingung: der Knopf trägt die neue Beschriftung');
    assert.ok(V.STRINGS.einstUpdateSchritt3.includes('„Vorhandenes Depot öffnen“'), 'der Satz nennt die neue Beschriftung: ' + V.STRINGS.einstUpdateSchritt3);
    assert.ok(!V.STRINGS.einstUpdateSchritt3.includes('Schon ein Depot? Datei öffnen'), 'die alte Beschriftung steht nicht als Kopie im Satz');
  });
});

test('[Beschriftung·Platzhalter] jeder Platzhalter der Textquellen zeigt auf einen Schlüssel, den es gibt — Deutsch und Englisch', () => {
  let gesamt = 0;
  for (const [sprache, pfad] of Object.entries(P.QUELLEN)) {
    const t = P.texte(pfad);
    for (const v of Object.values(t)) gesamt += (v.match(/\{beschriftung:/g) || []).length;
    assert.deepEqual(P.platzhalterLuecken(t), [], sprache + ': Platzhalter ohne Ziel');
  }
  assert.ok(gesamt >= 16, 'Suchraum besetzt: ' + gesamt + ' Platzhalter (Sätze × Sprachen)');
});

test('[Beschriftung·Platzhalter·Rot-Beweis] ein Platzhalter mit unbekanntem Schlüssel wird gefunden', () => {
  assert.deepEqual(P.platzhalterLuecken({ satz: 'Tippen Sie auf „{beschriftung:gibtEsNicht}“.', knopf: 'Daten einlesen' }), ['satz → gibtEsNicht']);
  assert.deepEqual(P.platzhalterLuecken({ satz: 'Tippen Sie auf „{beschriftung:knopf}“.', knopf: 'Daten einlesen' }), []);
});

test('[Beschriftung·Platzhalter] ein unbekannter Schlüssel bleibt SICHTBAR stehen, ein Zirkel hängt nicht', () => {
  kernMit([
    [`"strings:welcomeDateiOeffnen.text":"Schon ein Depot? Datei öffnen"`, `"strings:welcomeDateiOeffnen.text":"Knopf {beschriftung:einstUpdateSchritt3}"`],
    [`"strings:navWeitergeben.text":"Daten herausgeben"`, `"strings:navWeitergeben.text":"Daten {beschriftung:gibtEsNicht}"`],
  ], (V) => {
    assert.ok(V.STRINGS.einstGesamtExportWegweiser.includes('{beschriftung:gibtEsNicht}'), 'der unbekannte Schlüssel steht sichtbar da, kein stilles Leer: ' + V.STRINGS.einstGesamtExportWegweiser);
    const zirkel = V.STRINGS.einstUpdateSchritt3;   // einstUpdateSchritt3 → welcomeDateiOeffnen → einstUpdateSchritt3 …
    assert.equal(typeof zirkel, 'string', 'der Zirkel endet (Tiefe 3) und liefert einen Text');
    assert.ok(zirkel.length < 2000, 'kein Wuchern');
  });
});

/* ── Zusicherungs-Sätze (U2-ADR-331): ein Fremdmodul darf einen geschützten Satz nicht über eine ungeschützte Beschriftung ändern ── */

test('[Beschriftung·Platzhalter·Zusicherung] jeder geschützte Satz verweist nur auf geschützte Schlüssel — Deutsch und Englisch', () => {
  const { V } = ladeKern({ blank: true });
  let geprueft = 0;
  for (const [sprache, pfad] of Object.entries(P.QUELLEN)) {
    for (const [schluessel, text] of Object.entries(P.texte(pfad))) {
      if (!V._istZusicherungsKennung('strings:' + schluessel + '.text')) continue;
      for (const m of text.matchAll(/\{beschriftung:([A-Za-z0-9_]+)\}/g)) {
        geprueft += 1;
        assert.ok(V._istZusicherungsKennung('strings:' + m[1] + '.text'),
          sprache + ': der geschützte Satz „' + schluessel + '“ zeigt auf „' + m[1] + '“, und der steht nicht auf der Zusicherungsliste — '
          + 'entweder auch dorthin (tools/zusicherungs-schluessel-erheben.js) oder den Verweis durch Text ersetzen');
      }
    }
  }
  assert.ok(geprueft >= 2, 'Suchraum besetzt: ' + geprueft + ' Verweise aus geschützten Sätzen (mindestens vereinbarungAnnahmeUngeprueftText, deutsch und englisch)');
});

/* Der Angriff: ein Depot-eigenes Modul (Sprache en) überschreibt die UNGESCHÜTZTE Beschriftung einlesenKnopf; ein geschützter Satz, der (hier absichtlich
   umgebogen) auf sie zeigt, dürfte sich dadurch nicht ändern. Umgebogen wird an einer Kernkopie, weil im echten Kern kein geschützter Satz so zeigt — das
   zeigt die Probe darüber. */
const ANKER_EN_SATZ = '{beschriftung:vereinbarungStatusUngeprueft}”';
function angriff(zusatzErsetzungen) {
  // S1 (20.09.2026, U2-ADR-426): der englische geschützte Satz steht nicht mehr im Gerüst, sondern im Sprachmodul
  // des ENGLISCHEN Produkts (eingebacken in AB_WERK_SPRACHE_PRODUKT). Umgebogen wird darum an dessen Kern-Text;
  // der Angriff und alle Assertions sind unverändert.
  const produktPfad = require('./produkt-html-erzeugen.js').produktHtml('privat-en');
  const quelle = fs.readFileSync(produktPfad, 'utf8');
  const i = quelle.indexOf('"strings:vereinbarungAnnahmeUngeprueftText.text":"The organisation accepted');   // eingebacken: kompakte Form ohne Leerzeichen
  assert.ok(i > 0, 'Anker: der englische geschützte Satz steht im Kern');
  const j = quelle.indexOf(ANKER_EN_SATZ, i);
  assert.ok(j > 0 && j - i < 600, 'Anker: sein Platzhalter steht darin');
  return kernMit([[ quelle.slice(i, j + ANKER_EN_SATZ.length),
    quelle.slice(i, j) + '{beschriftung:einlesenKnopf}”' ], ...zusatzErsetzungen], (V) => {
    const d = V.leeresDepot();
    d.textsprache = 'en';
    d.textsatzModule = [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte: { 'strings:einlesenKnopf.text': 'EVIL-BUTTON' } }];
    V.setData(d);
    V._textsatzModuleAusDepotAnmelden(d);
    return { knopf: V.STRINGS.einlesenKnopf, satz: V.STRINGS.vereinbarungAnnahmeUngeprueftText };
  }, { quelle: produktPfad, laden: {} });
}

test('[Beschriftung·Platzhalter·Zusicherung·Rot-Beweis] das Modul ändert den Knopf, aber NICHT den geschützten Satz, der auf ihn zeigt', () => {
  const r = angriff([]);
  assert.equal(r.knopf, 'EVIL-BUTTON', 'Vorbedingung: das Fremdmodul hat die ungeschützte Beschriftung wirklich überschrieben');
  assert.ok(!r.satz.includes('EVIL-BUTTON'), 'der geschützte Satz übernimmt die Fremd-Beschriftung nicht: ' + r.satz);
  assert.ok(r.satz.includes('{beschriftung:einlesenKnopf}'), 'der Verweis bleibt sichtbar stehen (kein stilles Leer): ' + r.satz);
});

test('[Beschriftung·Platzhalter·Zusicherung·Rot-Beweis] OHNE die Schutzzeile übernimmt der geschützte Satz die Fremd-Beschriftung — die Probe kann rot werden', () => {
  const r = angriff([[ "    if (geschuetzt && !_istZusicherungsKennung('strings:' + schluessel + '.text')) return voll;\n", '' ]]);
  assert.ok(r.satz.includes('EVIL-BUTTON'), 'ohne die Zeile wirkt der Angriff (sonst prüft die Probe nichts): ' + r.satz);
});

test('[Beschriftung·Platzhalter·Fremdmodul] unter einem aktiven Sprachmodul des Depots steht kein roher Platzhalter — der Rückfall löst ihn wie der Modul-Pfad auf', () => {
  // S1 (20.09.2026, U2-ADR-426): der Rückfall löst den englischen Text auf — dafür braucht das Depot ein englisches Produkt; Assertions unverändert.
  const { V } = ladeKern({ produkt: 'privat-en' });
  const d = V.leeresDepot();
  d.textsprache = 'en';
  d.textsatzModule = [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte: { 'strings:navWeitergeben.text': 'Hand over' } }];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  for (const [satz] of PAARE) {
    const t = V.STRINGS[satz];
    assert.ok(!/\{beschriftung:/.test(t), satz + ' zeigt einen rohen Platzhalter: ' + t);
  }
  assert.ok(V.STRINGS.einstGesamtExportWegweiser.includes('Hand over'), 'das Fremdmodul-Wort für navWeitergeben steht im Rückfall-Satz: ' + V.STRINGS.einstGesamtExportWegweiser);
});
