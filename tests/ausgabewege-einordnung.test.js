'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jeder Ausgabeweg ist eingeordnet (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Weitergabe an Dritte wird gesperrt, eigene Sicherung und Notfall nie. Ein neuer Ausgabeweg ohne
   Einordnung ist rot — dieselbe Ratsche wie ab-werk-rangfolge-pruefen.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ausgabewegePruefen, ausgabewegeSammeln, grundsatzPruefen, wiedervorlagenAbgelaufen, dokumentPruefen } = require('../tools/ausgabewege-pruefen.js');
const { AUSGABEWEGE_EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Ausgabewege] jeder Ausgabeweg im Kern hat eine Zeile, jede Zeile einen Ausgabeweg', () => {
  const r = ausgabewegePruefen(KERN);
  assert.deepEqual({ uneingeordnet: r.uneingeordnet, veraltet: r.veraltet, klasseFalsch: r.klasseFalsch },
    { uneingeordnet: [], veraltet: [], klasseFalsch: [] });
});

test('[Ausgabewege] Notfallkarte und Notfallblatt sind ausdrücklich nie gesperrt, die Depot-Datei ebenso', () => {
  assert.equal(AUSGABEWEGE_EINORDNUNG.flowNotfallkartePdf.klasse, 'notfall');
  assert.equal(AUSGABEWEGE_EINORDNUNG.notfallblattOeffnen.klasse, 'notfall');
  assert.equal(AUSGABEWEGE_EINORDNUNG._depotBlobSpeichern.klasse, 'eigene-sicherung');
});

test('[Ausgabewege·Rot-Beweis] ein neuer Ausgabeweg ohne Zeile wird rot; ein Kommentar oder Stil-Block nicht', () => {
  const zusatz = '\n<script>\nfunction flowNeuerExport() {\n  dateiAusgeben(new Blob([]), "x.json");\n}\n'
    + '// window.print() nur erwähnt\n/* navigator.share( im Kommentar */\n</script>\n<style>\n/* window.print() */\n</style>\n';
  const r = ausgabewegePruefen(KERN + zusatz);
  assert.equal(r.ok, false);
  assert.deepEqual(r.uneingeordnet, ['flowNeuerExport']);
  assert.equal(ausgabewegeSammeln(zusatz).size, 1);
});

test('[Ausgabewege·Rot-Beweis] eine Zeile ohne Ausgabeweg im Kern wird rot', () => {
  const t = Object.assign({}, AUSGABEWEGE_EINORDNUNG, { gibtEsNicht: { klasse: 'weitergabe', grund: 'x' } });
  assert.deepEqual(ausgabewegePruefen(KERN, t).veraltet, ['gibtEsNicht']);
});

/* Die Sperre sitzt an genau den Wegen der Klasse `weitergabe` — und an keinem anderen. */
function funktionsKoerper(name) {
  const m = KERN.match(new RegExp('\\n(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (!m) return null;
  const start = m.index + 1;
  const ende = KERN.indexOf('\n}\n', start);
  return KERN.slice(start, ende);
}
const TUER = /\b(?:mitVereinbarung|vereinbarungFreigabeHolen)\s*\(/;
/* Code-Review Teil C, C-2 (16.09.2026): eine Sperre, die nur noch in einem KOMMENTAR steht („// mitVereinbarung(…"
   nach einem Umbau), zählte vorher als getragen. Geprüft wird darum der Rumpf ohne Kommentare. `://` in URLs
   bleibt stehen. */
function ohneKommentare(code) {
  return String(code).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const traegtSperre = (koerperText) => TUER.test(ohneKommentare(koerperText));

test('[Sperre] jede Weitergabe trägt die Sperre (oder ihr Aufrufer, `sperreIn`), keine andere Klasse tut es', () => {
  for (const [name, zeile] of Object.entries(AUSGABEWEGE_EINORDNUNG)) {
    if (zeile.klasse === 'weitergabe') {
      for (const traeger of (zeile.sperreIn || [name])) {
        const k = funktionsKoerper(traeger);
        assert.ok(k, traeger + ' nicht gefunden');
        assert.ok(traegtSperre(k), traeger + ' (Weitergabe ' + name + ') ruft die Sperre nicht');
      }
    } else if (name !== 'dateiAusgeben') {
      const k = funktionsKoerper(name);
      assert.ok(k && !traegtSperre(k), name + ' (' + zeile.klasse + ') darf nie gesperrt sein');
    }
  }
});

test('[Sperre·Rot-Beweis] eine Weitergabe ohne Sperre würde bemerkt', () => {
  const k = funktionsKoerper('flowErbscheinXmlSichern');
  assert.ok(traegtSperre(k));
  assert.equal(traegtSperre(k.replace(/vereinbarungFreigabeHolen\(/g, 'irgendwas(')), false);
});

test('[Sperre·Rot-Beweis C-2] eine Sperre, die nur noch im Kommentar steht, zählt nicht', () => {
  const k = funktionsKoerper('flowBereichPdf');
  assert.ok(traegtSperre(k), 'Vorbedingung: das Bereichs-PDF trägt die Sperre');
  const umgebaut = k.replace("mitVereinbarung('bereich-pdf:' + sektorId, (vb) => {", "((f) => f())(() => {   // war: mitVereinbarung('bereich-pdf:' + sektorId, …)");
  assert.notEqual(umgebaut, k, 'die Ersetzung muss greifen');
  assert.equal(traegtSperre(umgebaut), false, 'Zeilenkommentar');
  assert.equal(traegtSperre('function f() { /* mitVereinbarung( */ dateiAusgeben(x); }'), false, 'Blockkommentar');
  assert.equal(traegtSperre("function f() { const u = 'https://x'; mitVereinbarung('w', () => 1); }"), true, 'URL bricht nichts ab');
});

/* Grundsatz: Daten gehen an jede Stelle im anwendbaren Standard und als PDF hinaus. */
const LISTE_PFAD = path.join(__dirname, '..', 'tools', 'ausgabe-grundsatz-grundlinie.json');
const liste = () => JSON.parse(fs.readFileSync(LISTE_PFAD, 'utf8'));
const mitWeg = (name, zeile) => Object.assign({}, AUSGABEWEGE_EINORDNUNG, { [name]: Object.assign({}, AUSGABEWEGE_EINORDNUNG[name], zeile) });
const WEG = 'flowGesundheitFhirExport';

test('[Grundsatz·Bestand] der Kern steht genau auf dem Bestand der Liste', () => {
  assert.deepEqual(grundsatzPruefen(KERN), []);
  const kennungen = [...new Set(Object.values(liste().luecken).map((e) => e.kennung))].sort((a, b) => a.slice(1) - b.slice(1));
  assert.deepEqual(kennungen, ['L1', 'L2', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11']);
});

test('[Grundsatz·Rot-Beweis] eine Weitergabe ohne Standard oder ohne PDF wird rot', () => {
  assert.deepEqual(grundsatzPruefen(KERN, mitWeg(WEG, { standard: undefined })), [WEG + ': ohne Angabe zum Standard']);
  assert.deepEqual(grundsatzPruefen(KERN, mitWeg(WEG, { pdf: undefined })), [WEG + ': ohne Angabe zum PDF']);
});

test('[Grundsatz·Rot-Beweis] Standard oder PDF außerhalb der Weitergabe wird rot', () => {
  const t = Object.assign({}, AUSGABEWEGE_EINORDNUNG, { flowNotfallQR: Object.assign({}, AUSGABEWEGE_EINORDNUNG.flowNotfallQR, { pdf: 'selbst' }) });
  assert.deepEqual(grundsatzPruefen(KERN, t), ['flowNotfallQR: Standard oder PDF außerhalb der Weitergabe']);
});

test('[Grundsatz·Register] eine erfundene Kennung und eine Zeile, die nicht trägt, werden rot', () => {
  assert.match(grundsatzPruefen(KERN, mitWeg(WEG, { standard: { register: 'gibt-es-nicht' } })).join(), /gibt-es-nicht gibt es nicht/);
  assert.match(grundsatzPruefen(KERN, mitWeg(WEG, { standard: { register: 'xjustiz-erbschein' } })).join(), /xjustiz-erbschein trägt nicht/);
  assert.match(grundsatzPruefen(KERN, mitWeg(WEG, { standard: { register: 'elm-selbstauskunft' } })).join(), /elm-selbstauskunft trägt nicht/);
});

test('[Grundsatz·PDF] ein Weg oder Einstieg ohne PDF-Aufruf wird rot, ein Kommentar zählt nicht', () => {
  assert.match(grundsatzPruefen(KERN, mitWeg(WEG, { pdf: { in: ['gibtsNicht'] } })).join(), /Einstieg gibtsNicht bietet kein PDF/);
  assert.match(grundsatzPruefen(KERN, mitWeg(WEG, { pdf: 'selbst' })).join(), new RegExp(WEG + ': erzeugt kein PDF'));
  // Austausch (11.11.2026): die Formen starten im Schritt Übergabe, jede über herausgabeFormStarten.
  const pdfZeile = "if (formId === 'pdf') return flowBereichPdf(sektorId, undefined, vorab);";
  assert.ok(KERN.includes(pdfZeile), 'Vorbedingung: die Stelle zum Verändern existiert');
  const kern = KERN.replace('function herausgabeFormStarten(sektorId, formId, auswahl) {', 'function herausgabeFormStarten(sektorId, formId, auswahl) {\n  // jsPDF( nur erwähnt').replace(pdfZeile, '');
  assert.match(grundsatzPruefen(kern).join(), /Einstieg herausgabeFormStarten bietet kein PDF/);
});

test('[Grundsatz·Liste] eine Lücke außerhalb der Liste wird rot, ein neues Format und ein neuer Bereich ebenso', () => {
  assert.deepEqual(grundsatzPruefen(KERN, mitWeg(WEG, { pdf: { fehlt: 'x' } })), ['weg:' + WEG + ': Lücke (pdf) steht nicht in der Bestandsliste']);
  const format = KERN.replace('const EXPORT_FORMATE = Object.freeze([', "const EXPORT_FORMATE = Object.freeze([\n  { id: 'neu-eigen', kategorie: 'sektor', sektor: 'health' },");
  assert.deepEqual(grundsatzPruefen(format), ['format:neu-eigen: Lücke (standard) steht nicht in der Bestandsliste']);
  const bereich = KERN.replace('const BEREICH_IDS_EINGEBAUT = Object.freeze([', "const BEREICH_IDS_EINGEBAUT = Object.freeze([\n  'neuerBereich',");
  assert.deepEqual(grundsatzPruefen(bereich), ['bereich:neuerBereich: Lücke (standard) steht nicht in der Bestandsliste']);
});

test('[Grundsatz·Liste·sinkend] ein Eintrag, dessen Lücke geschlossen ist, wird rot; eine abweichende Angabe ebenso', () => {
  const g = liste();
  g.luecken['weg:gibtsNichtMehr'] = { kennung: 'L1', fehlt: ['standard'], grund: 'x' };
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, g), ['weg:gibtsNichtMehr: Lücke ist geschlossen, der Eintrag muss aus der Bestandsliste']);
  const h = liste();
  h.luecken['weg:flowSituationPdf'].fehlt = ['standard', 'pdf'];
  assert.match(grundsatzPruefen(KERN, undefined, undefined, h).join(), /weg:flowSituationPdf: Bestandsliste sagt standard, pdf, gemessen standard/);
});

test('[Grundsatz·Weg] der Grundsatz zählt im Gesamturteil des Wächters', () => {
  const r = ausgabewegePruefen(KERN, mitWeg(WEG, { pdf: undefined }));
  assert.equal(r.ok, false);
  assert.equal(r.grundsatz.length, 1);
});

test('[Grundsatz·Dokument] die Zeile Ausgabe: trägt Standard und PDF oder sagt keine', () => {
  assert.deepEqual(dokumentPruefen('Titel\nAusgabe: flowX · Standard vcard-4, RFC 6350, Fassung 4.0 · PDF flowBereichPdf\nAbnahme: x'), []);
  assert.deepEqual(dokumentPruefen('- **Ausgabe:** keine\n'), []);
  assert.deepEqual(dokumentPruefen('Titel ohne die Zeile\nAbnahme: x'), ['Zeile „Ausgabe:“ fehlt']);
  assert.equal(dokumentPruefen('Ausgabe: flowX · PDF flowBereichPdf').length, 1);
  assert.equal(dokumentPruefen('Ausgabe: flowX · Standard vcard-4').length, 1);
});

const ANLASS = 'flowAnlassExport';
const KEY = 'weg:' + ANLASS;
const mitEintrag = (aend) => { const g = liste(); Object.assign(g.keinStandard[KEY], aend); return g; };

test('[Grundsatz·Keiner·Bestand] die Einträge ohne Standard sind genau die freigegebenen', () => {
  assert.deepEqual(Object.keys(liste().keinStandard).sort(), [KEY, 'weg:flowZusammenstellungHerausgeben'].sort());
  assert.equal(liste().luecken[KEY], undefined, 'ein Weg ist Lücke oder gesucht, nicht beides');
});

test('[Grundsatz·Keiner·Rot-Beweis] ein Eintrag ohne Suchweg oder ohne öffentliche Adresse wird rot, ein interner Verweis ebenso', () => {
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, mitEintrag({ suchweg: '' })), [ANLASS + ': keinStandard ohne suchweg']);
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, mitEintrag({ suchweg: 'irgendwo gesucht' })), [ANLASS + ': Suchweg ohne öffentliche Adresse']);
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, mitEintrag({ suchweg: 'https://example.org und bericht.md' })), [ANLASS + ': Suchweg nennt eine interne Stelle']);
});

test('[Grundsatz·Keiner·Rot-Beweis] eine Ausgabe, die nicht maschinenlesbar hinausgeht, wird rot', () => {
  assert.match(grundsatzPruefen(KERN, undefined, undefined, mitEintrag({ medientyp: 'application/pdf' })).join(), /nicht maschinenlesbar/);
  assert.match(grundsatzPruefen(KERN, undefined, undefined, mitEintrag({ medientyp: 'text/csv' })).join(), /gibt keine Datei mit text\/csv aus/);
  assert.deepEqual(grundsatzPruefen(KERN, mitWeg(ANLASS, { standard: { keiner: 'vivodepot-anlass' } })), [ANLASS + ': ohne Angabe zur eigenen Ausgabe']);
  assert.match(grundsatzPruefen(KERN.replace(/application\/json/g, 'application/x'), undefined, undefined).join(), /flowAnlassExport: Einstieg flowAnlassExport gibt keine Datei/);
});

test('[Grundsatz·Keiner·PDF] der Zustand entschuldigt das PDF nicht', () => {
  assert.deepEqual(grundsatzPruefen(KERN, mitWeg(ANLASS, { pdf: undefined })), [ANLASS + ': ohne Angabe zum PDF']);
  assert.deepEqual(grundsatzPruefen(KERN, mitWeg(ANLASS, { pdf: { fehlt: 'x' } })), [KEY + ': Lücke (pdf) steht nicht in der Bestandsliste']);
});

test('[Grundsatz·Keiner·Herkunft] eine Herkunft, die nicht im Kern steht, wird rot', () => {
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, mitEintrag({ herkunft: 'gibt-es-nicht' })), [ANLASS + ': Herkunft gibt-es-nicht steht nicht im Kern']);
});

test('[Grundsatz·Keiner·Register] eine Registerzeile mit Standard trägt kein keiner; ein Eintrag ohne Zeile wird rot', () => {
  assert.match(grundsatzPruefen(KERN, mitWeg(ANLASS, { standard: { keiner: 'ips', eigenes: 'selbst' } })).join(), /Registerzeile ips steht nicht auf kein-standard-vorhanden/);
  assert.match(grundsatzPruefen(KERN, mitWeg(ANLASS, { standard: { keiner: 'gibt-es-nicht', eigenes: 'selbst' } })).join(), /gibt-es-nicht gibt es nicht/);
  const g = liste(); delete g.keinStandard[KEY];
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, g), [ANLASS + ': kein Eintrag unter keinStandard']);
  const h = liste(); h.keinStandard['weg:gibtsNicht'] = h.keinStandard[KEY];
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, h), ['weg:gibtsNicht: Eintrag unter keinStandard ohne Zeile keiner']);
});

test('[Grundsatz·Keiner·Wiedervorlage] eine abgelaufene Wiedervorlage ist ein Hinweis und färbt nichts rot', () => {
  const g = mitEintrag({ wiedervorlage: '2020-01-01' });
  assert.deepEqual(wiedervorlagenAbgelaufen(KERN, g), [KEY]);
  assert.deepEqual(grundsatzPruefen(KERN, undefined, undefined, g), []);
  assert.deepEqual(wiedervorlagenAbgelaufen(KERN), []);
});
