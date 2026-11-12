'use strict';
/* Auf der Notfallkarte gibt es genau eine Leerform: „nicht eingetragen“ in Grau. Ein Wert, der sich nicht auflösen lässt (ein Code, den
   die Liste nicht kennt), stand bisher als „nicht hinterlegt“ in Wertfarbe auf der Karte — für den Rettungsdienst mehrdeutig.
   ROT-BEWEIS: der zweite Test entfernt die Zeile im Notfallmodell und sieht „nicht hinterlegt“ wieder als Wert. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

async function zeilenMitUnbekanntemCode(opt) {
  const { V } = ladeKern(Object.assign({ produkt: 'privat-de' }, opt || {}));
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', ['kein-code-dieser-liste']);
  return V.notfallKernModell();
}

test('[Notfallkarte] ein nicht auflösbarer Code steht nicht als „nicht hinterlegt“ auf der Karte', async () => {
  const { V } = ladeKern({ produkt: 'privat-de' });
  const leer = V.STRINGS.leerZustand;
  const zeilen = await zeilenMitUnbekanntemCode();
  assert.equal(zeilen.filter((z) => z.wert === leer).length, 0, 'keine Zeile mit „' + leer + '“ als Wert');
  assert.equal(zeilen.filter((z) => z.feld === 'allergiesMedicationFoodOther').length, 0, 'die Allergie-Zeile fällt auf die Leerform der Karte');
});

test('[Notfallkarte·Rot-Beweis] ohne die Zeile im Modell steht „nicht hinterlegt“ als Wert', async () => {
  const anker = /    if \(wert === STRINGS\.leerZustand\) continue;\n/;
  assert.equal((KERN.match(new RegExp(anker.source, 'g')) || []).length, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'notfallkarte-leerform-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, ''));
  try {
    const zeilen = await zeilenMitUnbekanntemCode({ htmlPfad: tmp, backen: true });
    assert.ok(zeilen.some((z) => z.feld === 'allergiesMedicationFoodOther'), 'ohne die Zeile steht die Allergie mit „nicht hinterlegt“ auf der Karte');
  } finally { fs.unlinkSync(tmp); }
});
