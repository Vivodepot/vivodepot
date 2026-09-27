'use strict';
/* Befund NOTFALLKARTE-LEERER-QR (MITTEL, geschlossen), 23.09.2026, Vorlauf Durchklick-Abnahme.
   Produktentscheidung, 23.09.2026: ohne Notfallkontakt mit Telefonnummer wird KEIN QR gezeichnet
   („Wenn es nur um die Telefonnummer geht? Dann keiner."). Vorher reichte flowNotfallkartePdf() die leere
   vCard ungeprüft an qr.addData('') und druckte einen QR ohne Inhalt (gemessen an P18, echt gebackenes privat-en).
   Gegenprobe: mit anrufbarem Kontakt trägt die Karte weiterhin genau EINEN QR mit der vCard. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function spyDoc(bilder) {
  const doc = new Proxy(function () {}, {
    get: (_, k) => (k === 'internal' ? { getNumberOfPages: () => 1, pageSize: { getWidth: () => 105, getHeight: () => 148 } }
      : k === 'output' ? () => new Uint8Array(1)
      : k === 'getTextWidth' || k === 'getStringUnitWidth' ? () => 10
      : k === 'splitTextToSize' ? (t) => [String(t)]
      : k === 'addImage' ? (...a) => { bilder.push(a); return doc; }
      : () => doc),
    apply: () => doc,
  });
  return doc;
}

async function karte(mitKontakt) {
  const addData = []; const bilder = [];
  const qrcode = () => ({ addData: (d) => addData.push(d), make() {}, createDataURL: () => 'data:image/gif;base64,AAAA' });
  const jspdf = { jsPDF: function () { return spyDoc(bilder); } };
  const { V } = ladeKern({ jspdf, qrcode });
  await V.depotAnlegen('pw-notfall-qr-2026');
  V.akteurSelbstErklaeren('Ilse');
  V.sektorFeldSetzen('identity', 'givenName', 'Ilse');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  if (mitKontakt) {
    const id = V.personHinzufuegen({ name: 'Nora Kontakt', tel: '0301234567', beziehung: 'Tochter' });
    V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: id }]);
  }
  assert.ok(V.notfallKernModell().length > 0, 'Testaufbau: die Karte hat Zeilen, flowNotfallkartePdf bricht nicht vorher ab');
  try { V.flowNotfallkartePdf(); } catch (_) { /* Ausgabeweg im Harness egal — nur QR-Erzeuger und Bild zählen */ }
  return { addData, bilder, vcard: V.notfallKontakteVcard() };
}

test('[Notfallkarte·QR] ohne Notfallkontakt mit Telefonnummer: kein qr.addData, kein Bild', async () => {
  const r = await karte(false);
  assert.equal(r.vcard, '', 'Testaufbau: ohne Kontakt ist die vCard leer');
  assert.deepEqual(r.addData, [], 'der QR-Erzeuger wurde aufgerufen (leerer QR auf der Karte)');
  assert.equal(r.bilder.length, 0, 'die Karte trägt ein Bild (QR) ohne Kontakt');
});

test('[Notfallkarte·QR·Gegenprobe] mit anrufbarem Kontakt: genau EIN QR, mit der vCard', async () => {
  const r = await karte(true);
  assert.match(r.vcard, /^BEGIN:VCARD/, 'Testaufbau: mit Kontakt gibt es eine vCard');
  assert.deepEqual(r.addData, [r.vcard], 'genau ein addData, mit der vCard');
  assert.equal(r.bilder.length, 1, 'genau ein QR-Bild auf der Karte');
});
