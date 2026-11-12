'use strict';
/* antwort-dateiname.test.js — im Namen der heruntergeladenen Antwort und im Label von „Link senden“ steht kein Aktenzeichen (U2-ADR-520 Nr. 3, 04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Posten ANTWORT-DATEINAME (MITTEL): der Kern bildete den Dateinamen aus dem Aktenzeichen der Stelle (`vorgang`, Freitext), und das
   Label des Links fiel ohne Zweck auf das Aktenzeichen zurück. Wer die Datei oder den Link weitergibt, gab das Aktenzeichen lesbar mit.
   Jetzt: `<Marke>_Antwort_<JJJJ-MM-TT>_<Kurzkennung>.jwe`, die Kurzkennung sind die ersten sechs Zeichen der zufälligen Kennung im Kopf.
   Der Zweck bleibt im Label des Links, damit der Empfänger erkennt, wofür der Link gedacht ist; im Dateinamen steht er nicht.
   ROT-BEWEISE: ein Kern mit dem alten Namen legt das Aktenzeichen in den Dateinamen; der alte Label-Ausdruck fällt auf das Aktenzeichen zurück. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const VORGANG = 'AZ-2026-1104-Brandt';
const ZWECK = 'Heimaufnahme Frau Brandt';
const PW = 'ABCD-EFGH-JKLM-NPQR';
function anfrage() {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Pflegeheim Sonnenhof', zweck: ZWECK, grundlage: 'Heimvertrag', vorgang: VORGANG,
    gestelltAm: '2026-11-04', gueltigBis: '2099-12-31', felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }],
    antwort: { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example' } };
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

/* Antwortet über den echten Weg (Eingabe des Einmalpassworts, „Herunterladen“) und gibt die herausgegebene Datei zurück. */
async function antwortDatei(htmlPfad) {
  const gefangen = [];
  const k = ladeKern(Object.assign({ Blob, ausgabeErfassen: (x) => gefangen.push(x) }, htmlPfad ? { htmlPfad, backen: true } : {}));
  const V = k.V;
  await V.depotAnlegen('Antwort-Dateiname-2026-11-04!');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const dialoge = [];
  V.ui.modal = (o) => { dialoge.push(o); return () => {}; };
  V.ui.toast = () => {};
  const a = anfrage();
  V._anfrageAntwortAusgeben({ anfrage: a, anbieterId: null }, V.anfrageAntwortDatensatz(a, { sensibel: false }));
  assert.match(dialoge.at(-1).koerperHTML, /id="antwort-pw"/, 'Vorbedingung: die Eingabe des Einmalpassworts steht');
  k.document.getElementById('antwort-pw').value = PW;
  dialoge.at(-1).onPrimaer(() => {});
  const ende = Date.now() + 15000;
  let gewaehlt = false;
  while (!gefangen.length && Date.now() < ende) {
    const d = dialoge.at(-1);
    if (!gewaehlt && d && /id="ausgabe-datei"/.test(d.koerperHTML || '')) { gewaehlt = true; d.onPrimaer(() => {}); }
    await warte(25);
  }
  assert.equal(gefangen.length, 1, 'die Antwort geht hinaus');
  const jwe = (await gefangen[0].blob.text()).trim();
  return { V, name: gefangen[0].name, jwe };
}

test('[Antwort·Dateiname] der Name trägt Datum und Kurzkennung aus dem Kopf, kein Aktenzeichen und keinen Zweck', async () => {
  const { V, name, jwe } = await antwortDatei();
  const kennung = JSON.parse(Buffer.from(jwe.split('.')[0], 'base64url').toString('utf8')).kennung;
  assert.equal(name, V._dateiNamePraefix() + '_Antwort_' + V.heuteLokal() + '_' + kennung.slice(0, 6) + '.jwe');
  assert.match(name, /_Antwort_\d{4}-\d{2}-\d{2}_[A-Za-z0-9_-]{6}\.jwe$/, 'nur Zeichen, die in Dateinamen sicher sind');
  for (const w of [VORGANG, 'Brandt', 'Heimaufnahme', 'Sonnenhof']) assert.ok(!name.includes(w), 'nicht im Namen: ' + w);
});

test('[Antwort·Dateiname] ohne lesbare Kennung (alter Kopf, kaputte Datei) heißt die Kurzkennung „antwort“', () => {
  const { V } = ladeKern();
  const kopf = (o) => Buffer.from(JSON.stringify(o)).toString('base64url') + '.a.b.c.d';
  assert.equal(V._antwortDateinameKennung(kopf({ kennung: 'a4WHfFYRmMRfrMf88oNP-Q' })), 'a4WHfF');
  assert.equal(V._antwortDateinameKennung(kopf({ vorgang: VORGANG })), 'antwort');
  assert.equal(V._antwortDateinameKennung(kopf({ kennung: 'a/b c' })), 'antwort', 'keine Zeichen außerhalb von base64url');
  assert.equal(V._antwortDateinameKennung('kein-jwe'), 'antwort');
});

test('[Antwort·Link] das Label von „Link senden“ ist der Zweck, nie das Aktenzeichen', () => {
  const quelle = fs.readFileSync(HTML_PATH, 'utf8');
  const aufrufe = quelle.match(/flowLinkSenden\(\(o\) => antwortLinkTeile\(jwe, o\), [^{]*\{/g) || [];
  assert.equal(aufrufe.length, 1, 'genau ein Aufruf für die Antwort');
  assert.ok(!/vorgang/.test(aufrufe[0]), aufrufe[0]);
  assert.match(aufrufe[0], /eintrag\.anfrage\.zweck \|\| ''/);
  // Klasse: kein Dateiname im Kern wird aus dem Aktenzeichen gebildet.
  const namen = quelle.match(/'_Antwort_'[^;]*;/g) || [];
  assert.ok(namen.length >= 1);
  for (const n of namen) assert.ok(!/vorgang|zweck/.test(n), 'Dateiname ohne Freitext der Anfrage: ' + n);
});

test('[Antwort·Dateiname·Rot-Beweis] mit dem alten Ausdruck stünde das Aktenzeichen im Namen und im Label', async () => {
  let roh = fs.readFileSync(HTML_PATH, 'utf8');
  const alt = "_dateiNamePraefix() + '_Antwort_' + heuteLokal() + '_' + _antwortDateinameKennung(jwe) + '.jwe';";
  assert.equal(roh.split(alt).length, 2, 'Stelle genau einmal');
  roh = roh.replace(alt, "_dateiNamePraefix() + '_Antwort_' + String(eintrag.anfrage.vorgang || 'Vorgang').replace(/[^\\p{L}\\p{N}_-]+/gu, '-') + '.jwe';");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'antwort-dateiname-'));
  try {
    const kopie = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(kopie, roh);
    const { name } = await antwortDatei(kopie);
    assert.ok(name.includes(VORGANG), 'der alte Kern legt das Aktenzeichen in den Namen: ' + name);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const altesLabel = (a) => a.zweck || a.vorgang || '';
  assert.equal(altesLabel(Object.assign(anfrage(), { zweck: '' })), VORGANG, 'ohne Zweck fiel das Label auf das Aktenzeichen zurück');
});
