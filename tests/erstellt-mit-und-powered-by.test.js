'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   „Erstellt mit der Software Vivodepot“ auf jeder Ausgabe, „powered by Vivodepot“ in der App (U2-ADR-496 Nr. 6,
   U2-ADR-400 Nachtrag 18.10.2026). Befund WL-AUSGABE-ERSTELLT-MIT-PARTNER (MITTEL): unter einer Partnermarke nannten
   Notfallkarte und Gesamt-PDF den Partner als Werkzeug („Erstellt mit <Partner>“, `{marke}`), drei PDF-Arten trugen gar
   keinen Hinweis.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Der Satz ist der Herkunftsort-Schlüssel `ausgabeErstelltMit` (tools/herkunftsort-angaben.json): `{urheberin}` löst aus
   HERKUNFTSORT_ANGABEN auf, nie aus dem Branding, und kein Sprachmodul darf ihn auf `{marke}` umstellen oder leeren.
   Auf Zeichenebene, weil die Test-DOM eine Attrappe ist (querySelector liefert immer ein Objekt, innerHTML parst nicht):
   (a) jede PDF-Fußquelle liest den Schlüssel (pdfFussText, Notfallkarte, Dokument-PDF, Widerruf-PDF, Deckblatt);
   (b) unter einem Partner-Branding („Berliner Sparkasse“, die Werte der Achsen-Fixture) steht die Software, nicht der Partner — DE und EN;
   (c) ein Sprachmodul-Text mit `{marke}` statt `{urheberin}` oder ohne Text wird abgewiesen;
   (d) die App-Fußzeile trägt den Anker `data-herkunft-hinweis="app"` mit herkunftPoweredBy.
   Klassenwächter: jeder jsPDF-Erzeuger erreicht den Schlüssel, und jede Funktion, die per jsPDF einen Fuß schreibt (sie liest
   einen Fuß-Träger und zeichnet Text), liest ihn selbst oder über einen direkten Aufruf. Beides aus dem Quelltext abgeleitet,
   keine Liste von Hand.
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
// Dieselben Werte wie die Achsen-Fixture „Berliner Sparkasse“ (Name und Platzhalterfarben, kein Logo), hier eingetragen wie in
// tests/dateinamen-reichweite.test.js, damit die Probe ohne zurückgehaltene Fixture läuft.
const PARTNER = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'achsentest-erstellt-mit',
  name: 'Berliner Sparkasse', domain: null,
  farbePrimaer: '#2E5C8A', farbeSekundaer: '#F2A900', schriftart: 'Inter', logo: null,
});
const ERSTELLT = { de: 'Erstellt mit der Software Vivodepot', en: 'Created with Vivodepot software' };
const LIEST = /\b_ausgabeErstelltMit\(/;
const FUSS_QUELLEN = ['pdfFussText', 'zeichneNotfallkarte', 'zeichneDokumentPdf', 'zeichneWiderrufPdf', 'zeichneVollDepotPdf'];
// Ein Fuß-Träger: was heute einen Dokument-Fuß liefert (Haftung C, Segmente, der Export-Fuß).
const FUSS_TRAEGER = /\b(pdfFussText|_dokFussHaftungMitMarke|_dokFussSegmente)\(/;
const JSPDF_SCHREIBT = /\bdoc\.text\(|\babsatz\(/;
const MAX_TIEFE = 4;

// Funktionsrümpfe des Kerns: Name → Text (top-level `function` bis zur nächsten Zeile `}`), dieselbe Bauform wie
// die Klassenprobe für Haftung C.
function rumpfe(quelle) {
  const aus = new Map();
  const re = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/gm;
  let m;
  while ((m = re.exec(quelle))) {
    const ende = quelle.indexOf('\n}\n', m.index);
    aus.set(m[1], { start: m.index, text: quelle.slice(m.index, ende < 0 ? undefined : ende + 2) });
  }
  return aus;
}
function ohneKommentare(t) { return t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, '$1'); }
function code(r, name) { const f = r.get(name); return f ? ohneKommentare(f.text).replace(new RegExp('^function ' + name + '\\('), '') : ''; }
function aufrufe(r, name) {
  return [...new Set([...code(r, name).matchAll(/\b([A-Za-z_$][\w$]*)\(/g)].map((x) => x[1]).filter((n) => n !== name && r.has(n)))];
}
function erreicht(name, r, tiefe = 0, gesehen = new Set()) {
  if (!r.has(name) || gesehen.has(name) || tiefe > MAX_TIEFE) return false;
  gesehen.add(name);
  if (LIEST.test(code(r, name))) return true;
  return aufrufe(r, name).some((n) => erreicht(n, r, tiefe + 1, gesehen));
}
// Liest selbst oder über EINEN direkten Aufruf (pdfFussZeichnen → pdfFussText).
function liestDirekt(name, r) { return LIEST.test(code(r, name)) || aufrufe(r, name).some((n) => FUSS_TRAEGER.test(n + '(') && LIEST.test(code(r, n))); }

function klassenVerstoesse(quelle) {
  const r = rumpfe(quelle);
  const erzeuger = new Set();
  for (const m of quelle.matchAll(/new window\.jspdf\.jsPDF\(/g)) {
    let bester = null;
    for (const [name, f] of r) if (f.start < m.index && f.start + f.text.length > m.index && (!bester || f.start > r.get(bester).start)) bester = name;
    erzeuger.add(bester || '(außerhalb einer Funktion)');
  }
  const fussSchreiber = [...r.keys()].filter((n) => n !== '_ausgabeErstelltMit' && FUSS_TRAEGER.test(code(r, n)) && JSPDF_SCHREIBT.test(code(r, n)));
  return {
    erzeuger: [...erzeuger].sort(),
    fussSchreiber: fussSchreiber.sort(),
    ohne: [...[...erzeuger].filter((n) => !erreicht(n, r)), ...fussSchreiber.filter((n) => !liestDirekt(n, r))].sort(),
  };
}
function quellenVerstoesse(quelle) {
  const r = rumpfe(quelle);
  const v = FUSS_QUELLEN.filter((n) => !r.has(n) || !LIEST.test(code(r, n))).map((n) => n + ' liest ausgabeErstelltMit nicht');
  if (!/_herkunftsortAusgabe\('ausgabeErstelltMit', STRINGS\.ausgabeErstelltMit\)/.test(code(r, '_ausgabeErstelltMit'))) v.push('_ausgabeErstelltMit liest nicht über den Herkunftsort-Weg');
  return v;
}

// Die Diskriminante von (d): die App-Fußzeile schreibt den Hinweisort aus herkunftPoweredBy, an keiner Markenbedingung.
function poweredByVerstoesse(quelle) {
  const fuss = code(rumpfe(quelle), 'renderFooter');
  const v = [];
  if (!/'<span class="ff-powered" data-herkunft-hinweis="app">' \+ escapeHTML\(_herkunftsortAusgabe\('herkunftPoweredBy', STRINGS\.herkunftPoweredBy\)\) \+ '<\/span>'/.test(fuss)) v.push('renderFooter schreibt den Hinweisort data-herkunft-hinweis="app" nicht aus herkunftPoweredBy');
  if (/_markeIstEingebaut[^\n]*ff-powered/.test(fuss)) v.push('der Hinweis hängt an einer Markenbedingung');
  return v;
}
// Die Diskriminante des Klassenwächters: die Erzeuger und Fuß-Schreiber, die den Schlüssel nicht erreichen.
function fussOhneSchluessel(quelle) { return klassenVerstoesse(quelle).ohne; }

// Stellvertreter-Dokument (wie in der Klassenprobe für Haftung C): nimmt jeden jsPDF-Aufruf an und schreibt jeden Text mit.
function stellvertreter(einheit) {
  const texte = [];
  let seiten = 1;
  const breite = einheit === 'mm' ? 105 : 595, hoehe = einheit === 'mm' ? 148 : 842;
  const doc = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string' || k === 'then') return undefined;
      if (k === 'internal') return { pageSize: { getWidth: () => breite, getHeight: () => hoehe, width: breite, height: hoehe }, scaleFactor: 1, getFontSize: () => 10, getNumberOfPages: () => seiten, getCurrentPageInfo: () => ({ pageNumber: 1 }) };
      if (k === 'splitTextToSize') return (s) => (Array.isArray(s) ? s : String(s == null ? '' : s).split('\n'));
      if (k === 'text') return (s) => { (Array.isArray(s) ? s : [s]).forEach((x) => texte.push(String(x))); return doc; };
      if (k === 'addPage') return () => { seiten += 1; return doc; };
      if (k === 'getNumberOfPages') return () => seiten;
      if (k === 'getTextWidth' || k === 'getStringUnitWidth' || k === 'getFontSize' || k === 'getLineHeightFactor') return () => 10;
      return () => doc;
    },
  });
  return { doc, texte };
}

// Die Diskriminante von (b): der Satz steht, und kein Text nennt den Partner als Werkzeug.
function partnerVerstoesse(ausgabe, texte, satz, partner) {
  const alles = texte.join('\n');
  const v = [];
  if (!alles.includes(satz)) v.push(ausgabe + ': „' + satz + '“ fehlt');
  const werkzeug = new RegExp('(Erstellt mit|Erzeugt mit|Created with|Software)[^·\\n]{0,12}' + partner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const treffer = alles.match(werkzeug);
  if (treffer) v.push(ausgabe + ': nennt den Partner als Werkzeug — „' + treffer[0] + '“');
  return v;
}

async function partnerDepot(produkt) {
  const { V, document } = ladeKern(produkt ? { produkt } : undefined);
  await V.depotAnlegen('erstellt-mit-und-powered-by-pw-2026');
  V.akteurSelbstErklaeren('Elisabeth Beispiel');
  const d = V.getData();
  d.brandingModule = [PARTNER];
  V.setData(d);
  return { V, document };
}
function ausgabenTexte(V) {
  const aus = {};
  aus.pdfFussText = [V.pdfFussText({ anlass: 'Probe', generierer: '', datum: '18.10.2026' })];
  let s = stellvertreter('mm');
  V.zeichneNotfallkarte(s.doc, V.notfallKernModell(), V.notfallKartenMeta(), null); aus.notfallkarte = s.texte;
  s = stellvertreter('pt');
  V.zeichneDokumentPdf(s.doc, 'vorsorgevollmacht'); aus.dokumentPdf = s.texte;
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  s = stellvertreter('mm');
  V.zeichneWiderrufPdf(s.doc, e, V.uebergabeWiderrufNutzlast(e), null); aus.widerrufPdf = s.texte;
  s = stellvertreter('pt');
  V.zeichneVollDepotPdf(s.doc, V.vollDepotModell({}), V.vollDepotPdfMeta()); aus.deckblatt = s.texte.filter((t) => t.includes(V.BUILD_VERSION));
  return aus;
}

test('[Erstellt mit·a] jede PDF-Fußquelle liest den Herkunftsort-Schlüssel ausgabeErstelltMit', () => {
  assert.deepEqual(quellenVerstoesse(KERN), []);
  const de = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  for (const [sprache, satz] of [['de', de], ['en', en]]) {
    for (const k of ['notfallKarteFuss', 'pdfHerkunftVersion']) {
      assert.ok(!/\{marke\}/.test(satz['strings:' + k + '.text']), sprache + ': ' + k + ' nennt die Marke nicht mehr als Werkzeug');
    }
  }
  assert.equal(de['strings:ausgabeErstelltMit.text'], 'Erstellt mit der Software {urheberin}');
  assert.equal(en['strings:ausgabeErstelltMit.text'], 'Created with {urheberin} software');
});

test('[Erstellt mit·a·Rot-Beweis] ohne den Aufruf in einer Fußquelle wird genau diese gemeldet', () => {
  const zeile = '    moduleStandFussText(moduleStandBerechnen()), _ausgabeErstelltMit()].filter(Boolean).join(\'   ·   \');';
  assert.ok(KERN.includes(zeile), 'die Zeile steht in pdfFussText');
  const kopie = KERN.replace(zeile, '    moduleStandFussText(moduleStandBerechnen())].filter(Boolean).join(\'   ·   \');');
  assert.deepEqual(quellenVerstoesse(kopie), ['pdfFussText liest ausgabeErstelltMit nicht']);
});

// (b) als eine Funktion, zwei Proben mit festem Titel (die Konformitätsklausel bindet den Titel wörtlich).
async function partnerProbe(sprache, produkt) {
  const { V } = await partnerDepot(produkt);
  assert.equal(V._markeName(), PARTNER.name, 'Positivkontrolle: das Branding wirkt');
  const aus = ausgabenTexte(V);
  const v = [];
  for (const [ausgabe, texte] of Object.entries(aus)) {
    assert.ok(texte.length > 0, ausgabe + ': Positivkontrolle — der Zeichenweg schrieb Text');
    v.push(...partnerVerstoesse(ausgabe, texte, ERSTELLT[sprache], PARTNER.name));
  }
  assert.deepEqual(v, [], v.join('\n'));
  // Der Partner steht weiter dort, wo er hingehört: vorn im Haftungs-Fuß (U2-ADR-400 §2).
  assert.ok(aus.pdfFussText[0].includes(PARTNER.name + ' · '), 'Positivkontrolle: der Partner steht vorn im Fuß');
}
test('[Erstellt mit·b·de] unter der Partnermarke nennt jede Ausgabe die Software, nicht den Partner', () => partnerProbe('de', null));
test('[Erstellt mit·b·en] unter der Partnermarke nennt jede Ausgabe die Software, nicht den Partner', () => partnerProbe('en', 'privat-en'));

test('[Erstellt mit·b·Diskriminante] der frühere Wortlaut „Erstellt mit <Partner>“ wird erkannt', () => {
  const alt = ['Erstellt mit ' + PARTNER.name + ' · Diese Karte ersetzt keinen amtlichen Ausweis.'];
  assert.equal(partnerVerstoesse('notfallkarte', alt, ERSTELLT.de, PARTNER.name).length, 2);
  assert.equal(partnerVerstoesse('deckblatt', ['Erzeugt mit ' + PARTNER.name + ' v1.0'], ERSTELLT.de, PARTNER.name).length, 2);
  assert.deepEqual(partnerVerstoesse('fuss', [PARTNER.name + ' · Entwurf   ·   ' + ERSTELLT.de], ERSTELLT.de, PARTNER.name), []);
});

/* (c) als Verletzungsliste: der Herkunftsort-Prüfer und der Einlass eines Sprachmoduls (beide Vertrauensstufen) lassen den Satz nur mit
   {urheberin} durch. Leer = jede Fassung mit {marke} oder ohne Platzhalter wird abgewiesen, die mit {urheberin} kommt durch. */
function abweisungVerstoesse(V, fehlt) {
  const v = [];
  const K = 'strings:ausgabeErstelltMit.text';
  if (fehlt(K, 'Created with {urheberin} software') !== null) v.push('Herkunftsort-Prüfer weist die Übersetzung mit {urheberin} ab');
  if (fehlt(K, 'Created with {marke} software') !== 'herkunftsort-marke') v.push('Herkunftsort-Prüfer lässt {marke} durch');
  if (fehlt(K, 'Created with our software') !== 'herkunftsort-angabe') v.push('Herkunftsort-Prüfer lässt einen Satz ohne {urheberin} durch');
  const modul = (text) => {
    const m = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'));
    m.texte[K] = text;
    return m;
  };
  for (const stufe of [true, 'signiert']) {
    const durch = (text) => { const r = V.textsatzModulPruefen(modul(text), { vertrauenswuerdig: stufe }); return !!(r.texte && r.texte[K] === text); };
    if (!durch('Created with {urheberin} software')) v.push(stufe + ': Einlass weist {urheberin} ab');
    if (durch('Created with {marke} software')) v.push(stufe + ': Einlass lässt {marke} durch');
    if (durch('')) v.push(stufe + ': Einlass lässt einen leeren Satz durch');
  }
  return v;
}

test('[Erstellt mit·c] ein Sprachmodul mit {marke} statt {urheberin} oder ohne Text wird abgewiesen', () => {
  const { V } = ladeKern({ zusatzBindungen: ['_herkunftsortAngabeFehlt'] });
  assert.deepEqual(abweisungVerstoesse(V, V.__zusatz._herkunftsortAngabeFehlt), []);
  // Rot-Beweis: ein Prüfer, der alles durchlässt, ergibt eine nicht leere Liste.
  assert.ok(abweisungVerstoesse(V, () => null).includes('Herkunftsort-Prüfer lässt {marke} durch'));
});

test('[Powered by·d] die App-Fußzeile trägt den Hinweisort, auch unter der Partnermarke', async () => {
  assert.deepEqual(poweredByVerstoesse(KERN), []);
  const { V, document } = await partnerDepot(null);
  V.betreteApp();
  V.renderFooter();
  const fuss = document.getElementById('app-fuss').innerHTML;
  assert.ok(fuss.includes('<span class="ff-powered" data-herkunft-hinweis="app">Bereitgestellt mit Vivodepot</span>'), 'Hinweisort steht unter der Partnermarke: ' + fuss.slice(-200));
});

test('[Erstellt mit·Klasse] jeder jsPDF-Erzeuger und jeder Fuß-Schreiber erreicht den Schlüssel', () => {
  const k = klassenVerstoesse(KERN);
  assert.ok(k.erzeuger.length >= 7, 'mindestens die sieben bekannten jsPDF-Erzeuger gefunden: ' + k.erzeuger.join(', '));
  for (const n of ['zeichneNotfallkarte', 'zeichneWiderrufPdf', 'zeichneDokumentPdf', 'pdfFussZeichnen']) assert.ok(k.fussSchreiber.includes(n), 'Positivkontrolle: ' + n + ' gilt als Fuß-Schreiber');
  assert.deepEqual(fussOhneSchluessel(KERN), []);
});

test('[Erstellt mit·Klasse·Rot-Beweis] ein Fuß-Schreiber ohne den Schlüssel wird gemeldet, samt seinem Erzeuger', () => {
  const zeile = '  absatz(_ausgabeErstelltMit(), { size: 8, zeilenhoehe: 10, abstand: 2 });';
  assert.ok(KERN.includes(zeile), 'die Zeile steht in zeichneDokumentPdf');
  const ohne = klassenVerstoesse(KERN.replace(zeile, '')).ohne;
  assert.ok(ohne.includes('zeichneDokumentPdf'), 'Fuß-Schreiber gemeldet: ' + ohne.join(', '));
  assert.ok(ohne.includes('_dokumentPdfMitPruefung'), 'Erzeuger gemeldet: ' + ohne.join(', '));
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Auch (c) trägt seine Verletzungsliste (abweisungVerstoesse). */
module.exports = {
  PROBEN: [
    { fuer: '[Erstellt mit·a] jede PDF-Fußquelle liest den Herkunftsort-Schlüssel ausgabeErstelltMit', diskriminante: quellenVerstoesse },
    { fuer: '[Erstellt mit·b·de] unter der Partnermarke nennt jede Ausgabe die Software, nicht den Partner', diskriminante: partnerVerstoesse },
    { fuer: '[Erstellt mit·b·en] unter der Partnermarke nennt jede Ausgabe die Software, nicht den Partner', diskriminante: partnerVerstoesse },
    { fuer: '[Powered by·d] die App-Fußzeile trägt den Hinweisort, auch unter der Partnermarke', diskriminante: poweredByVerstoesse },
    { fuer: '[Erstellt mit·Klasse] jeder jsPDF-Erzeuger und jeder Fuß-Schreiber erreicht den Schlüssel', diskriminante: fussOhneSchluessel },
    { fuer: '[Erstellt mit·c] ein Sprachmodul mit {marke} statt {urheberin} oder ohne Text wird abgewiesen', diskriminante: abweisungVerstoesse },
  ],
};
