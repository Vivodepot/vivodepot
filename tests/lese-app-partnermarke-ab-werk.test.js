'use strict';
/* Befund LESE-APP-PARTNERMARKE-AB-WERK (MITTEL), 05.10.2026.
   Ein Partnerprodukt mit Branding in der Bau-Region AB_WERK_BRANDING_PRODUKT (U2-ADR-384) zeigt im Kern Logo,
   Kopfzeilenfarbe und Palette des Partners (U2-ADR-297-Nachtrag, tests/white-label-ab-werk-partner.test.js). Die
   Lese-App liest die Marke dagegen allein aus `data.brandingModule` der geöffneten Datei — und ein Depot aus dem
   Partnerprodukt trägt dort nichts: die Bau-Region wird nie in die Datei mitgeschrieben. Gemessen: Name und Farbe
   des Partners kommen in der Datei nicht vor, die Lese-App zeigt Vivodepot. Nach der White-Label-Entscheidung vom
   10.09.2026 („alles Sichtbare gehört dem Partner“, die Lese-App ausdrücklich eingeschlossen) ist das eine Lücke.
   Ein Logo-Platz fehlt der Lese-App heute ganz; die Abnahme verlangt Logo UND Kopfzeilenfarbe.
   Fix-Richtung (Entscheidung beim Eigentümer, mit Report-before-Build): welcher Weg die Marke trägt — Mitschrift
   des Partner-Brandings in die Datei beim Anlegen oder ein anderer Transport —, ohne dass eine Datei sich damit
   selbst zur Marke erklären kann. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const FARBE = '#1b3a5c';
// Erfundene Probe-Marke, kein echtes Institut.
const PARTNER = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-probe',
  name: 'Probebank Musterort', domain: 'probebank.example', farbePrimaer: FARBE,
  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
});

/* Was die Lese-App bei einem Depot aus dem Partnerprodukt falsch zeigt. Leer heißt: die Lücke ist geschlossen. */
async function verstoesse() {
  const { V } = ladeKern({ produkt: 'privat-de', brandingProdukt: PARTNER });
  await V.depotAnlegen('partnermarke-lese-app-2026!');
  const datei = JSON.parse(JSON.stringify(V.getData()));
  const L = ladeLesen();
  L.V.setData(datei);
  L.V._markeFarbeAnwenden();
  const v = [];
  if (L.V._markeName() !== PARTNER.name) v.push('die Lese-App nennt „' + L.V._markeName() + '“ statt des Partners');
  const farbe = L.document.documentElement.style.getPropertyValue('--vd-branding-topbar-primaer');
  if (farbe !== FARBE) v.push('die Kopfzeile trägt „' + farbe + '“ statt der Partnerfarbe');
  return v;
}

test('[Lese-App·Partnermarke ab Werk·Rot-Beweis] ein Depot aus einem Partnerprodukt zeigt in der Lese-App Name und Kopfzeilenfarbe des Partners',
  { todo: 'Befund LESE-APP-PARTNERMARKE-AB-WERK (MITTEL, Ratsche tools/befund-ratsche-eintraege): die Bau-Region erreicht die Datei nicht' },
  async () => {
    assert.deepEqual(await verstoesse(), []);
  });

/* Stolperdraht: ein todo-Test, der grün wird, meldet das sonst nirgends. Schließt ein Fix die Lücke, fällt DIESER Test —
   dann im selben Commit das todo oben herausnehmen, diesen Test löschen, die Obergrenze der Aussetzungen wieder senken
   (mit dem Werkzeug, das die Aussetzungen zählt) und den Ratschen-Eintrag schließen. */
test('[Lese-App·Partnermarke ab Werk·Stolperdraht] solange das todo oben steht, ist die Lücke noch offen', async () => {
  assert.notDeepEqual(await verstoesse(), [],
    'die Lücke ist geschlossen: todo herausnehmen, diesen Test löschen, Aussetzungs-Obergrenze senken, Befund schließen');
});
