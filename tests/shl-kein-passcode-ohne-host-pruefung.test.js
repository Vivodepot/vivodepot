'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter — kein Passcode-Flag (P), solange die Ablage keinen Passcode prüft (02.11.2026)
   ────────────────────────────────────────────────────────────────────────
   SMART Health Links: „P Indicates the SMART Health Link requires a Passcode to resolve“. Den Passcode
   prüft der Resource Server, nicht der Empfänger: er lehnt falsche Passcodes mit 401 ab und zählt die
   Fehlversuche über die ganze Lebensdauer. Die Ablage share.vivodepot.de prüft keinen Passcode. Ein Link
   mit P, dessen Datei dort liegt, gäbe die Datei also ohne Passcode heraus: die Bürgerin glaubte sich
   geschützt und wäre es nicht (offen statt gesperrt).

   Darum: der Kern setzt nie P. Der Wächter prüft das dreifach:
     1. kein Eintrag in SHL_FREIGABEWEGE trägt P;
     2. für jeden Freigabeweg kommt aus shlUriBauen kein P;
     3. im Quelltext des Kerns weist keine Stelle einem Flag ein P zu.
   Rot-Beweis: ein Kern mit einem erfundenen Weg `passcode` (flag 'P') fällt an 1 bis 3.

   AUFHEBEN erst, wenn die Ablage den Passcode prüft wie die
   Spezifikation es verlangt (401, Zählung der Fehlversuche, Sperre); dann wird dieser Wächter durch
   eine Probe der Passcode-Prüfung ersetzt, nicht gelöscht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const PW = 'pw';
const FIXTURE = path.join(__dirname, 'fixtures', 'eigenprobe-eu-lab.json');
const TEST_URL = 'https://shl.example.org/f/' + 'a'.repeat(40);
const b64uToBuf = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// Jede Zuweisung eines Text-Literals mit P an ein Flag: `flag: 'P'`, `flag = 'UP'`, `.flag += "P"`.
const P_ZUWEISUNG = /\bflag\s*(?:\+?=|:)\s*(['"`])[^'"`\n]*P[^'"`\n]*\1/g;
const pZuweisungen = (text) => [...text.matchAll(P_ZUWEISUNG)].map((m) => m[0]);

const kernText = () => fs.readFileSync(HTML_PATH, 'utf8');

async function befunde(V) {
  const funde = [];
  for (const [id, weg] of Object.entries(V.SHL_FREIGABEWEGE)) {
    if (String(weg.flag).includes('P')) funde.push(`SHL_FREIGABEWEGE.${id}.flag = ${weg.flag}`);
  }
  await V.depotAnlegen(PW);
  const eintrag = V.importAutoritativDokument(fs.readFileSync(FIXTURE, 'utf8'));
  assert.ok(eintrag, 'Fixture wird als autoritativer Eintrag erkannt');
  for (const id of Object.keys(V.SHL_FREIGABEWEGE)) {
    const teile = await V.shlProviderPayload(eintrag, { weg: id });
    const uri = V.shlUriBauen(teile, TEST_URL);
    const payload = JSON.parse(b64uToBuf(uri.slice(V.SHL_URI_PRAEFIX.length)).toString('utf8'));
    if (String(payload.flag || '').includes('P')) funde.push(`shlUriBauen, Weg ${id}: flag = ${payload.flag}`);
  }
  return funde;
}

test('[SHL·kein P] der Kern setzt nie das Passcode-Flag', async () => {
  const { V } = ladeKern();
  assert.ok(V.SHL_FREIGABEWEGE && Object.keys(V.SHL_FREIGABEWEGE).length > 0, 'Freigabewege geladen');
  assert.deepEqual(await befunde(V), []);
  assert.deepEqual(pZuweisungen(kernText()), [], 'Flag-Zuweisung mit P im Kern');
});

test('[SHL·kein P·Rot-Beweis] ein Kern mit erfundenem Passcode-Weg fällt an Tabelle, Payload und Quelltext', async () => {
  const echt = kernText();
  const anker = "  manifest: Object.freeze({ id: 'manifest', flag: '' }),\n";
  assert.ok(echt.includes(anker), 'Anker der Freigabewege gefunden');
  const falsch = echt.replace(anker, anker + "  passcode: Object.freeze({ id: 'passcode', flag: 'P' }),\n");
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'shl-kein-p-'));
  try {
    const pfad = path.join(ordner, 'kern.html');
    fs.writeFileSync(pfad, falsch);
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    const funde = await befunde(V);
    assert.ok(funde.some((f) => f.startsWith('SHL_FREIGABEWEGE.passcode')), funde.join('; '));
    assert.ok(funde.some((f) => f.startsWith('shlUriBauen, Weg passcode')), funde.join('; '));
    assert.deepEqual(pZuweisungen(falsch), ["flag: 'P'"]);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  // Die Quelltext-Suche trifft auch andere Schreibweisen.
  assert.equal(pZuweisungen("x.flag = 'UP'; y.flag += \"P\"; z = { flag: `P` }; w = { flag: 'U' };").length, 3);
});
