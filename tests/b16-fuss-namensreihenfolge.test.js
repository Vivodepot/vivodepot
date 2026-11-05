'use strict';
/* B16 (01.11.2026), Namensreihenfolge im Ausgabe-Fuß: „Erstellt von [Name]“ soll den Namen der eigenen Person so zeigen,
   wie sie ihn angezeigt haben will — bei identity.displayFamilyNameFirst den Familiennamen zuerst (identitaetAnzeigename).
   Gemessen an den Fuß-Metadaten von Situationsblatt und Gesamt-PDF (das Anlass-PDF baut seine auf dieselbe Weise), nach dem Anlegeweg: der Akteur
   „selbst“ trägt den Namen, wie er beim Anlegen eingegeben wurde, die Identität dieselben Namensteile. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function eigenesDepot(familiennameZuerst) {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const akteur = V.akteurSelbstErklaeren('Erika Mustermann');
  V.getData().inhaberPersonId = akteur.personId;
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  if (familiennameZuerst) V.sektorFeldSetzen('identity', 'displayFamilyNameFirst', true);
  return V;
}

test('[B16] Fuß: bei „Familienname zuerst“ steht der eigene Name in Anzeigereihenfolge', async () => {
  const V = await eigenesDepot(true);
  for (const [wo, meta] of [['Situationsblatt', V.situationPdfMeta('geburt')], ['Gesamt-PDF', V.vollDepotPdfMeta()]]) {
    assert.equal(meta.generierer, 'Mustermann Erika', wo + ': ' + meta.generierer);
    assert.ok(V.pdfFussText(meta).includes(V.STRINGS.pdfFussErstelltVon + ' Mustermann Erika'), wo + ' Fußtext');
  }
});

test('[B16·Gegenprobe] ohne „Familienname zuerst“ bleibt der Vorname vorn', async () => {
  const V = await eigenesDepot(false);
  assert.equal(V.situationPdfMeta('geburt').generierer, 'Erika Mustermann');
  assert.equal(V.vollDepotPdfMeta().generierer, 'Erika Mustermann');
});
