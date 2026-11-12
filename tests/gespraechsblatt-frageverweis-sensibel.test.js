'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
   Befund GESPRAECHSBLATT-FRAGEVERWEIS-SENSIBEL (HOCH, 08.11.2026).
   ───────────────────────────────────────────────────────────────────────────────────────────────────
   Das Blatt für ein Gespräch trägt je Frage eine Zeile, wovon sie handelt (Bereich › Feld › Eintrag).
   Diese Zeile nannte den Eintrag mit ALLEN Unterfeldern, auch den sensiblen: auf dem Blatt für die Bank
   stand die IBAN, obwohl die Übersicht vor dem Herausgeben sie als sensibel zurückhielt. Jetzt gilt für
   die Zeile dieselbe Regel wie für die Angaben: ein sensibles Unterfeld steht nur darauf, wenn die Person
   es für dieses Blatt freigibt.

   (a) ohne Freigabe: weder Modell noch Blatt (HTML) nennen die IBAN, die Kontoart steht da;
   (b) mit Freigabe für dieses Blatt steht sie auch in der Zeile (dieselbe Regel wie die Angaben);
   (c) Wächter gegen die Klasse: jeder Aufruf von listenEintragZusammenfassung in vivodepot.html gibt
       die Sensibel-Markierung mit (drittes Argument mit `sektorId`), oder er steht in der Liste der
       Anzeigen, die nur die Person selbst auf ihrem Schirm sieht — mit Grund. Eine neue Ausgabe, die
       Unterfelder zitiert, ohne die Markierung zu beachten, wird rot.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'frageverweis-sensibel-2026!';
const IBAN = 'DE89 3704 0044 0532 0130 00';

async function depotMitKontoFrage() {
  const k = ladeKern();
  const { V } = k;
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  const bank = V.institutionHinzufuegen({ name: 'Beispielbank Nord', art: 'bank' });
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { ref: bank, override: '' }, accountType: 'Girokonto', iban: IBAN });
  const konto = V.getData().sektoren.finance.accounts[0].id;
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto },
    frage: 'Fallen neue Gebühren an?', an: { ref: bank }, gestellt: '2026-11-08' });
  return { ...k, bank };
}

const ohneLeer = (s) => String(s).replace(/\s+/g, '');

test('[Frageverweis · sensibel] (a) ohne Freigabe nennt das Blatt für die Bank die IBAN nicht, auch nicht in der Zeile der Frage', async () => {
  const { V, bank } = await depotMitKontoFrage();
  const m = V.gespraechsblattModell({ ref: bank });
  assert.equal(m.fragen.length, 1);
  assert.match(m.fragen[0].worum, /Girokonto/, 'die Zeile nennt den Eintrag');
  assert.ok(!ohneLeer(m.fragen[0].worum).includes(ohneLeer(IBAN)), 'die Zeile der Frage trägt keine IBAN: ' + m.fragen[0].worum);
  const html = V.gespraechsblattHTML(m);
  assert.ok(!ohneLeer(html).includes(ohneLeer(IBAN)), 'das Blatt trägt keine IBAN');
});

test('[Frageverweis · sensibel] (b) mit Freigabe für dieses Blatt steht die IBAN auch in der Zeile', async () => {
  const { V, bank } = await depotMitKontoFrage();
  const m = V.gespraechsblattModell({ ref: bank }, null, { sensibel: true });
  assert.ok(ohneLeer(m.fragen[0].worum).includes(ohneLeer(IBAN)), m.fragen[0].worum);
});

// Anzeigen, die nur die Person selbst auf ihrem Schirm sieht; dort darf der Eintrag ganz stehen. Schlüssel: die Funktion, die
// listenEintragZusammenfassung aufruft. Was hinausgeht (Blatt, Druck, Export, Weitergabe), steht hier nie.
// Positivliste (entschieden 08.11.2026): genau diese drei, je mit Grund und Fundstelle. Jeder weitere Eintrag
// braucht ein Wort; die Liste darf nur sinken (Deckel HOECHSTENS unten).
const NUR_EIGENER_SCHIRM = Object.freeze({
  _fragenDialogHTML: { grund: "Auswahl des Eintrags im Dialog „Fragen zu …“ der Person", fundstelle: "vivodepot.html, function _fragenDialogHTML (<option> je Eintrag)" },
  _eintragZeileText: { grund: "Zeile im Dialog zum Zusammenführen von Einträgen der Person", fundstelle: "vivodepot.html, function _eintragZeileText" },
  flowListenEintragEntfernen: { grund: "Rückfrage vor dem Entfernen eines eigenen Eintrags", fundstelle: "vivodepot.html, function flowListenEintragEntfernen" },
});
const HOECHSTENS = 3;

function aufrufeMitFunktion(text) {
  const zeilen = text.split('\n');
  const aus = [];
  let fn = '';
  zeilen.forEach((z, i) => {
    const kopf = z.match(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (kopf) fn = kopf[1];
    if (/listenEintragZusammenfassung\(/.test(z) && !/function\s+listenEintragZusammenfassung/.test(z)) aus.push({ zeile: i + 1, fn, text: z.trim() });
  });
  return aus;
}

test('[Frageverweis · sensibel] (c) Wächter: jede Stelle, die Unterfelder eines Eintrags zitiert, beachtet die Sensibel-Markierung', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const aufrufe = aufrufeMitFunktion(text);
  assert.ok(aufrufe.length >= 4, 'Aufrufe gefunden: ' + aufrufe.length);
  const ohne = aufrufe.filter((a) => !/listenEintragZusammenfassung\([^)]*,[^)]*,[^)]*\)/.test(a.text) && !/sektorId/.test(a.text)
    && !Object.prototype.hasOwnProperty.call(NUR_EIGENER_SCHIRM, a.fn));
  assert.deepEqual(ohne.map((a) => a.fn + ' (Z. ' + a.zeile + '): ' + a.text), [],
    'Aufruf ohne Sensibel-Markierung außerhalb der Liste NUR_EIGENER_SCHIRM');
  assert.ok(Object.keys(NUR_EIGENER_SCHIRM).length <= HOECHSTENS, "NUR_EIGENER_SCHIRM darf nur sinken (jeder weitere Eintrag ist eine eigene Entscheidung)");
  for (const [fn, e] of Object.entries(NUR_EIGENER_SCHIRM)) assert.ok(e.grund && e.fundstelle && e.fundstelle.includes(fn), fn + ": Grund und Fundstelle");
  const genutzt = new Set(aufrufe.map((a) => a.fn));
  assert.deepEqual(Object.keys(NUR_EIGENER_SCHIRM).filter((k) => !genutzt.has(k)), [], 'veraltete Einträge in NUR_EIGENER_SCHIRM');
});

test('[Frageverweis · sensibel] (c) Rot-Beweis des Wächters: ein Aufruf ohne Markierung in einer Ausgabe-Funktion wird gefunden', () => {
  const probe = 'function blattBauen(x) {\n  return listenEintragZusammenfassung(def, e);\n}\n';
  const a = aufrufeMitFunktion(probe);
  assert.equal(a.length, 1);
  assert.equal(a[0].fn, 'blattBauen');
  assert.ok(!Object.prototype.hasOwnProperty.call(NUR_EIGENER_SCHIRM, a[0].fn));
});
