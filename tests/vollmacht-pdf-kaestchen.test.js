'use strict';
/* VOLLMACHT-PDF-KAESTCHEN (25.09.2026, HOCH, gefunden beim Bau der Betreuungs-Vorführung): die Vorsorgevollmacht als PDF
   (flowDokumentDateiSichern('vorsorgevollmacht', …)) entsteht NICHT, sobald eine Frage der Gesundheitssorge mit ja/nein
   beantwortet ist — Rückgabe 'schrift-luecke', Dialog „PDF nicht erstellt … 1. Gesundheitssorge/Pflegebedürftigkeit: ☒ ☐".
   Die Kästchen erzeugt die Generator-Engine SELBST (MODUL_BLOCK_HANDLER.auswahlPaar und .auswahlPaarGruppe: '☒'/'☐',
   U+2612/U+2610), der PDF-Zuschnitt sagt sie nicht zu. tests/pdf-schrift-deckung-klasse.test.js nahm ☐ aus („steht nur im
   Wortlaut, den zeichnet kein PDF-Erzeuger") — die Gegenprobe dort sah nur auf `wortlaut`, nicht auf die Engine.
   Gemessen am 25.09.2026 über alle Dokumentmodule unter tools/dokument-module/: betroffen ist allein
   vivodepot-dokumentmodul-vorsorgevollmacht.json (nur es nutzt auswahlPaar/auswahlPaarGruppe); Betreuungsverfügung,
   Patientenverfügung, KI-Verfügung und die vier Standardvorlagen nicht. Die übrigen PDF-Zeichenfunktionen des Kerns
   (zeichne*, _pdf*, pdf*) erzeugen keine Zeichen außerhalb der Zusage.
   Gemessen wird ohne jsPDF: ein Stellvertreter-Dokument nimmt jeden Zeichenaufruf an, davor der ECHTE Torwächter des
   Kerns (_pdfSchriftPruefungInstallieren / _pdfSchriftLueckenBuendeln) — derselbe, der im Browser die PDF-Erzeugung abbricht.
   Die beiden roten Proben standen als `todo`, bis der Fix landete (25.09.2026): die Kästchen werden seit v796 als
   Vektor gezeichnet (PDF_KAESTCHEN, U2-ADR-263-Nachtrag); der Klassenwächter lässt darum „zugesagt ODER Vektor“ gelten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

// Nimmt jeden jsPDF-Aufruf an; `text` und `splitTextToSize` verhalten sich wie jsPDF (Umbruch am Zeilenende).
function stellvertreter() {
  const zahl = new Set(['getTextWidth', 'getStringUnitWidth', 'getFontSize', 'getLineHeightFactor', 'getNumberOfPages']);
  const doc = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string' || k.startsWith('_') || k === 'then') return undefined;
      if (k === 'internal') return { pageSize: { getWidth: () => 595, getHeight: () => 842, width: 595, height: 842 }, scaleFactor: 1, getFontSize: () => 10, getCurrentPageInfo: () => ({ pageNumber: 1 }) };
      if (k === 'splitTextToSize') return (s) => (Array.isArray(s) ? s : String(s).split('\n'));
      if (k === 'text') return () => doc;
      if (zahl.has(k)) return () => (k === 'getNumberOfPages' ? 1 : 10);
      return () => doc;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return doc;
}
async function vollmachtFunde({ gesundheitssorge, name = 'Anna Beispiel' }) {
  const { V } = ladeKern();
  await V.depotAnlegen('vollmacht-kaestchen-pw-2026');
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  const anna = V.personHinzufuegen({ name, beziehung: 'kind' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', Object.assign(
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: anna }] },
    gesundheitssorge ? { healthCareGeneralDecision: gesundheitssorge } : {}));
  const e = V.getData().sektoren.advanceCare.provisionInstruments[0];
  const doc = stellvertreter();
  V._pdfSchriftPruefungInstallieren(doc);
  V.zeichneDokumentPdf(doc, 'vorsorgevollmacht', e.id);
  return V._pdfSchriftLueckenBuendeln(doc);
}

test('[VOLLMACHT-PDF-KAESTCHEN] eine Vorsorgevollmacht mit beantworteter Gesundheitssorge wird als PDF erzeugt — der Torwächter meldet keine Lücke',
  async () => {
    for (const antwort of ['ja', 'nein']) assert.deepEqual(await vollmachtFunde({ gesundheitssorge: antwort }), [], 'Gesundheitssorge = ' + antwort);
  });

test('[VOLLMACHT-PDF-KAESTCHEN·Klasse] jedes Zeichen, das ein Blocktyp der Generator-Engine SELBST erzeugt, sagt der PDF-Zuschnitt zu oder wird als Vektor gezeichnet',
  () => {
    const { V } = ladeKern();
    const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
    const a = kern.indexOf('const MODUL_BLOCK_HANDLER = {');
    const quelle = kern.slice(a, kern.indexOf('\n};\n', a)).replace(/\/\/[^\n]*/g, '');
    const literale = [...quelle.matchAll(/'([^'\\]*)'/g)].map((m) => m[1]).join('');
    const aus = [...new Set([...literale].map((z) => z.codePointAt(0)))].filter((cp) => cp >= 0x20 && !V.pdfZeichenUnterstuetzt(cp) && !V.PDF_KAESTCHEN[String.fromCodePoint(cp)]);
    assert.deepEqual(aus.map((cp) => 'U+' + cp.toString(16).toUpperCase()), []);
  });

test('[VOLLMACHT-PDF-KAESTCHEN·Gegenprobe] ohne beantwortete Gesundheitssorge entsteht dieselbe Vollmacht ohne Lücke — die Probe misst die Kästchen, nichts anderes', async () => {
  assert.deepEqual(await vollmachtFunde({ gesundheitssorge: null }), []);
});

test('[VOLLMACHT-PDF-KAESTCHEN·Rot-Beweis] der Torwächter am Stellvertreter ist nicht blind: ein Zeichen außerhalb des Zuschnitts, über den Namen hereingetragen, wird gemeldet', async () => {
  const funde = (await vollmachtFunde({ gesundheitssorge: null, name: 'Олена Коваленко' })).flatMap((f) => f.zeichen);
  assert.ok(funde.includes('О'), 'der kyrillische Name wird gemeldet: ' + JSON.stringify(funde));
});
