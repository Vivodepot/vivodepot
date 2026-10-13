'use strict';
/* Studio · W4 (09.10.2026): eingegangene Antworten öffnen. Abnahme:
   (1) Fremde Eingabe bleibt Text: eine Skript-Nutzlast in Beschriftung und Wert steht im Modell als Zeichenkette, und die
       Anzeige setzt nur textContent (kein innerHTML, kein `html:` im Antwort-Teil).
   (2) Nichts wird gespeichert: der Antwort-Teil schreibt in keinen Speicher und keine Datei; das Passwortfeld wird geleert.
   (3) Jede Karte sagt, dass die Angaben von der Person stammen und nicht geprüft sind; eine Teilantwort wird benannt.
   (4) Die Anzeige sagt im Klartext, warum eine Datei nicht aufgeht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const TEIL = HTML.slice(HTML.indexOf('/* ══ Eingegangene Antworten (W4'), HTML.indexOf('/* ══ Assistent Anfrage (W1'));
/* Die Fehlerkennungen von antwortJweOeffnen: Klartext-Kennungen, kein kodierter Inhalt. */
const FEHLERCODES = ['jwe-keine-antwort', 'jwe-passwort', 'jwe-schluesselpaar', 'jwe-p2c'];
const NUTZLAST = '<img src=x onerror="globalThis.__angegriffen=1"><script>globalThis.__angegriffen=1</script>';

test('[Antworten · Text] eine Skript-Nutzlast in Beschriftung und Wert bleibt im Modell eine Zeichenkette', () => {
  const { V } = ladeGenerator();
  const m = V.antwortStudioModell({ anfrage: { vorgang: 'A-1' }, felder: [{ kennung: 'x.y', label: NUTZLAST, wert: NUTZLAST }],
    fehlend: [{ kennung: 'a.b', label: NUTZLAST }], absender: { name: NUTZLAST }, vollstaendig: false });
  assert.equal(m.felder[0].label, NUTZLAST); assert.equal(m.felder[0].wert, NUTZLAST);
  assert.equal(m.fehlend[0], NUTZLAST); assert.equal(m.absender, NUTZLAST);
  assert.equal(globalThis.__angegriffen, undefined);
});
test('[Antworten · Text] der Antwort-Teil setzt nur Text: kein innerHTML, kein `html:`', () => {
  assert.ok(TEIL.length > 2000, 'Vorbedingung: der Antwort-Teil ist gefunden');
  assert.doesNotMatch(TEIL, /innerHTML|outerHTML|insertAdjacentHTML|\bhtml\s*:/);
});
test('[Antworten · Text · Rot-Beweis] ein innerHTML im Antwort-Teil fiele auf', () => {
  const kopie = TEIL.replace("el('dd', { text: f.wert })", "el('dd', { html: f.wert })");
  assert.notEqual(kopie, TEIL);
  assert.match(kopie, /\bhtml\s*:/);
});
test('[Antworten · Speicher] der Antwort-Teil speichert nichts und leert das Passwortfeld', () => {
  assert.doesNotMatch(TEIL, /localStorage|sessionStorage|indexedDB|blobDownload|caches\.|document\.cookie/);
  assert.match(TEIL, /finally \{\n\s+passwort = null;\n\s+if \(feld\) feld\.value = '';/);
});
test('[Antworten · Herkunft] jede Karte sagt „von der Person angegeben, nicht geprüft“; eine Teilantwort wird benannt', () => {
  const { V } = ladeGenerator();
  const m = V.antwortStudioModell({ anfrage: { vorgang: 'A-1' }, felder: [], vollstaendig: false });
  assert.equal(m.herkunft, 'Von der Person angegeben, nicht geprüft.');
  assert.equal(m.vollstaendig, false);
  assert.match(TEIL, /karte\.appendChild\(el\('p', \{ class: 'as-meldung', text: L\('Das ist eine Teilantwort/);
});
test('[Antworten · Fehler] jeder Grund, warum eine Datei nicht aufgeht, steht im Klartext da', () => {
  const { V } = ladeGenerator();
  const ersatz = V.antwortFehlerText(new Error('unbekannt'));
  for (const code of FEHLERCODES) {
    const satz = V.antwortFehlerText(new Error(code));
    assert.notEqual(satz, ersatz, code + ': ein eigener Satz, nicht der Ersatztext');
    assert.equal(satz.includes(code), false, code + ': die Kennung steht nicht im Text');
  }
  assert.match(V.antwortFehlerText(new Error('OperationError')), /Passwort passt nicht/);
});
