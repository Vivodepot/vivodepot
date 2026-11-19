'use strict';
/* PDF im Depot ansehen (17.11.2026). Ein Klick auf ein PDF im Depot zeigt das Dokument selbst: die eingebettete PDF-Anzeige
   (pdf.js, Mozilla, Apache-2.0) zeichnet jede Seite in ein <canvas> in der Vorschau. Kein Rahmen, kein Nachladen, kein
   Skript aus dem PDF. Die Bibliothek ist im Kern nur window.vdPdfjs; hier steht ein Stub an ihrer Stelle, der die Aufrufe
   mitschreibt. Die Richtlinie und die Fassung der eingebetteten Bibliothek prüft tests/pdf-anzeige-richtlinie.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Probe-Passwort-PDF-ansehen-2026';
const PDF_INHALT = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4 Probe').toString('base64');

function stubPdfjs(seiten, aufrufe) {
  return {
    version: '4.10.38',
    getDocument(opt) {
      aufrufe.push(opt);
      return { promise: Promise.resolve({
        numPages: seiten,
        getPage: (n) => Promise.resolve({
          getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
          render: (r) => { aufrufe.push({ seite: n, ctx: !!r.canvasContext }); return { promise: Promise.resolve() }; },
        }),
        destroy: () => Promise.resolve(),
      }) };
    },
  };
}

/* Der Sandkasten von ladeKern ist kein DOM (makeEl ist ein Proxy ohne Kinderliste). Darum zählt die Probe an eigenen Stubs:
   ein Ziel, das angehängte Kinder mitschreibt und sich über textContent leert (wie das DOM), und ein canvas mit getContext. */
function zielStub() {
  const kinder = [];
  return {
    kinder, clientWidth: 600,
    appendChild(k) { kinder.push(k); return k; },
    get firstChild() { return kinder[0] || null; },
    removeChild(k) { kinder.splice(kinder.indexOf(k), 1); return k; },
    set textContent(t) { kinder.length = 0; },
    get textContent() { return ''; },
  };
}
function canvasEinsetzen(document, mitKontext) {
  const vorher = document.createElement;
  document.createElement = (tag) => (String(tag).toLowerCase() === 'canvas'
    ? { tag: 'canvas', width: 0, height: 0, className: '', setAttribute() {}, getContext: () => (mitKontext ? {} : null) }
    : vorher(tag));
}

async function vorschau(pdfjs) {
  const { V, document } = ladeKern(pdfjs ? { pdfjs } : {});
  canvasEinsetzen(document, true);
  await V.depotAnlegen(PW);
  const id = V.mappeEintragHinzufuegen({ beschriftung: 'Mietvertrag', dateiname: 'mietvertrag.pdf', mime: 'application/pdf', inhalt: PDF_INHALT });
  V.flowMappeVorschau(id);
  return { V, document, box: document.getElementById('modal-inhalt') };
}

test('[PDF ansehen] die Vorschau eines PDF trägt die Seitenfläche und nicht mehr „keine Vorschau“', async () => {
  const aufrufe = [];
  const { V, box } = await vorschau(stubPdfjs(2, aufrufe));
  assert.ok(box.innerHTML.includes('data-pdf-seiten'), 'die Seitenfläche fehlt');
  assert.equal(box.innerHTML.includes(V.STRINGS.mappeKeineVorschau), false, 'der Hinweis „keine Vorschau“ steht noch da');
});

test('[PDF ansehen] jede Seite wird in ein eigenes canvas gezeichnet', async () => {
  const aufrufe = [];
  const { V, document } = ladeKern({ pdfjs: stubPdfjs(3, aufrufe) });
  canvasEinsetzen(document, true);
  assert.equal(typeof V.mappePdfSeitenZeichnen, 'function', 'mappePdfSeitenZeichnen fehlt');
  const ziel = zielStub();
  const n = await V.mappePdfSeitenZeichnen(ziel, PDF_INHALT);
  assert.equal(n, 3);
  assert.equal(ziel.kinder.filter((k) => k.tag === 'canvas').length, 3);
  assert.deepEqual(aufrufe.filter((a) => a.seite).map((a) => a.seite), [1, 2, 3]);
});

test('[PDF ansehen] die Bibliothek bekommt die Bytes, nie eine Adresse, und führt nichts aus', async () => {
  const aufrufe = [];
  const { V, document } = ladeKern({ pdfjs: stubPdfjs(1, aufrufe) });
  canvasEinsetzen(document, true);
  assert.equal(typeof V.mappePdfSeitenZeichnen, 'function', 'mappePdfSeitenZeichnen fehlt');
  await V.mappePdfSeitenZeichnen(zielStub(), PDF_INHALT);
  const opt = aufrufe[0];
  assert.ok(opt && opt.data, 'keine Bytes übergeben');
  assert.equal(Buffer.from(opt.data.slice(0, 5)).toString('latin1'), '%PDF-');
  for (const k of ['url', 'cMapUrl', 'standardFontDataUrl', 'wasmUrl', 'docBaseUrl']) assert.equal(k in opt, false, k + ' gesetzt');
  assert.equal(opt.isEvalSupported, false, 'isEvalSupported muss false sein');
  assert.equal(opt.enableXfa, false, 'XFA (Formulare mit Skript) bleibt aus');
  assert.equal(opt.useWorkerFetch, false, 'kein Nachladen im Worker');
  assert.deepEqual(Object.keys(V.PDF_ANSICHT_OPTIONEN).sort(), Object.keys(opt).filter((k) => k !== 'data').sort());
});

test('[PDF ansehen] ohne Bibliothek, ohne Zeichenfläche oder bei beschädigter Datei bleibt der Hinweis, nichts bricht', async () => {
  const kaputt = { version: '4.10.38', getDocument: () => ({ promise: Promise.reject(new Error('Invalid PDF structure')) }) };
  const { V, document } = ladeKern({ pdfjs: kaputt });
  assert.equal(typeof V.mappePdfSeitenZeichnen, 'function', 'mappePdfSeitenZeichnen fehlt');
  canvasEinsetzen(document, true);
  const ziel = zielStub();
  assert.equal(await V.mappePdfSeitenZeichnen(ziel, PDF_INHALT), 0);
  assert.equal(ziel.kinder.length, 0);
  // Ohne 2d-Kontext bleibt die Fläche leer (der Fehlerzweig leert über textContent, keine Schleife über firstChild).
  const ohneKontext = ladeKern({ pdfjs: stubPdfjs(2, []) });
  canvasEinsetzen(ohneKontext.document, false);
  const ziel2 = zielStub();
  assert.equal(await ohneKontext.V.mappePdfSeitenZeichnen(ziel2, PDF_INHALT), 0);
  assert.equal(ziel2.kinder.length, 0);
  const ohne = ladeKern({});
  assert.equal(await ohne.V.mappePdfSeitenZeichnen(zielStub(), PDF_INHALT), 0);
  assert.equal(await ohne.V.mappePdfSeitenZeichnen(zielStub(), 'data:text/html;base64,PHNjcmlwdD4='), 0);
});

test('[PDF ansehen·Rot-Beweis] ein Kern, der der Bibliothek eine Adresse mitgibt, fällt in der Prüfung oben auf', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const alt = 'pdfjs.getDocument(Object.assign({ data }, PDF_ANSICHT_OPTIONEN))';
  assert.ok(quelle.includes(alt), 'Vorbedingung: der Aufruf steht so im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-ansehen-rot-'));
  try {
    const datei = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(datei, quelle.replace(alt, "pdfjs.getDocument(Object.assign({ data, url: 'https://x.invalid/a.pdf' }, PDF_ANSICHT_OPTIONEN))"));
    const aufrufe = [];
    const { V, document } = ladeKern({ htmlPfad: datei, pdfjs: stubPdfjs(1, aufrufe) });
    canvasEinsetzen(document, true);
    await V.mappePdfSeitenZeichnen(zielStub(), PDF_INHALT);
    assert.ok(aufrufe[0] && 'url' in aufrufe[0], 'die Prüfung „url gesetzt“ hätte den geänderten Kern erkannt');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
