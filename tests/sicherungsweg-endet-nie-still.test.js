'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klassenwächter: kein Sicherungsweg endet ohne Ansage (13.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Aus dem Befund ERSTE-DATEISICHERUNG-SCHEITERT-STILL: scheiterte das erste
   Schreiben in die gewählte Datei, fiel der Kern still auf einen Download
   zurück. Der Einzelfall hat seine Probe; dieser Wächter fährt die ganze
   Klasse — JEDE Stelle, an der das Schreiben in eine Datei scheitern kann,
   beim ersten und bei einem späteren Sichern. Gefordert ist je Fall: die
   Sicherung kam an („datei“), oder eine Ansage steht da (Schreibfehler beim
   ersten Mal, Zielwechsel bei einem späteren), oder es wurde gar keine
   Datei gewählt (Picker abgebrochen oder gescheitert).

   Kommt eine neue Stelle dazu, an der das Schreiben scheitern kann, gehört
   sie in FEHLERSTELLEN unten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'sicherungsweg-waechter-pw-264';

function fehler(name) { const e = new Error('simuliert: ' + name); e.name = name; return e; }

// Ein Handle, der beim Aufruf Nummer `nr` an der Stelle `stelle` scheitert; davor und danach gesund.
function handleMitFehlerstelle(stelle, nr) {
  let aufrufe = 0;
  let berechtigung = 'granted';
  const handle = {
    name: 'sicherungsweg-waechter.vivodepot',
    queryPermission: async () => berechtigung,
    requestPermission: async () => berechtigung,
    createWritable: async () => {
      const dieser = aufrufe++;
      const trifft = dieser === nr;
      if (trifft && stelle === 'createWritable') throw fehler('NotAllowedError');
      return {
        write: async () => { if (trifft && stelle === 'write') throw fehler('QuotaExceededError'); },
        close: async () => { if (trifft && stelle === 'close') throw fehler('QuotaExceededError'); },
      };
    },
  };
  return { handle, entziehen: () => { berechtigung = 'denied'; } };
}

function ansageDa(V, document) {
  const html = ((document.getElementById('modal-inhalt') || {}).innerHTML) || '';
  return [V.STRINGS.schreibfehlerTitel, V.STRINGS.zielwechselTitel].some((t) => html.includes(V.escapeHTML(t)));
}

const FEHLERSTELLEN = ['createWritable', 'write', 'close'];

for (const stelle of FEHLERSTELLEN) {
  test('[Sicherungsweg·Klasse] erstes Sichern, Fehler bei ' + stelle + ': die Nutzerin erfährt es', async () => {
    const { handle } = handleMitFehlerstelle(stelle, 0);
    const { V, document } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
    await V.depotAnlegen(PW);
    V.markiereUngespeichert();
    const weg = await V.depotHerunterladen();
    assert.notEqual(weg, 'datei');
    assert.ok(ansageDa(V, document), 'nach einem Fehler bei ' + stelle + ' steht eine Ansage da');
  });

  test('[Sicherungsweg·Klasse] späteres Sichern, Fehler bei ' + stelle + ': die Nutzerin erfährt es', async () => {
    const { handle } = handleMitFehlerstelle(stelle, 1);
    const { V, document } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
    await V.depotAnlegen(PW);
    V.markiereUngespeichert();
    assert.equal(await V.depotHerunterladen(), 'datei', 'das erste Sichern gelingt');
    V.markiereUngespeichert();
    const weg = await V.depotHerunterladen();
    assert.notEqual(weg, 'datei');
    assert.ok(ansageDa(V, document), 'nach einem Fehler bei ' + stelle + ' steht eine Ansage da');
  });
}

test('[Sicherungsweg·Klasse] späteres Sichern, Berechtigung entzogen: die Nutzerin erfährt es', async () => {
  const { handle, entziehen } = handleMitFehlerstelle(null, -1);
  const { V, document } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();
  assert.equal(await V.depotHerunterladen(), 'datei');
  entziehen();
  V.markiereUngespeichert();
  const weg = await V.depotHerunterladen();
  assert.notEqual(weg, 'datei');
  assert.ok(ansageDa(V, document), 'nach entzogener Berechtigung steht eine Ansage da');
});

test('[Sicherungsweg·Klasse·Gegenprobe] Picker abgebrochen: nichts gewählt, nichts geschrieben, keine Ansage', async () => {
  const { V, document } = ladeKern({ showSaveFilePicker: async () => { throw fehler('AbortError'); }, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();
  assert.equal(await V.depotHerunterladen(), 'abgebrochen');
  assert.ok(!ansageDa(V, document));
});

test('[Sicherungsweg·Klasse·Rot-Beweis] ohne Fehlerstelle kommt die Sicherung an und keine Ansage steht da', async () => {
  const { handle } = handleMitFehlerstelle(null, -1);
  const { V, document } = ladeKern({ showSaveFilePicker: async () => handle, Blob });
  await V.depotAnlegen(PW);
  V.markiereUngespeichert();
  assert.equal(await V.depotHerunterladen(), 'datei');
  V.markiereUngespeichert();
  assert.equal(await V.depotHerunterladen(), 'datei');
  assert.ok(!ansageDa(V, document), 'ohne Fehler keine Ansage — sonst prüfte die Klasse oben nichts');
});
