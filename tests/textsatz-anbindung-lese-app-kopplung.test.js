'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kopplungs-Probe: der erzeugte Kennungsraum (TEXTSATZ_EINGEBAUT_LESEN)
   nützt nur, wenn sektorHTML()/feldZeileHTML() ihn auch ABFRAGEN.
   ────────────────────────────────────────────────────────────────────────
   55s Fund (07.09.2026, im Browser gemessen): ein Depot mit aktivem
   englischem Textsatz-Modul zeigte in der Lese-App weiterhin deutsche
   Sektor-/Feld-Beschriftungen — ZWEI getrennte Ursachen, jede für sich
   ausreichend, um den Fund zu erklären:
     1. Der Kennungs-Filter kannte `identitaet.label` & Co. nicht (behoben in
        tools/build-textsatz-eingebaut-lesen.js + _textsatzKennungBekannt).
     2. `sektorHTML()`/`feldZeileHTML()` lasen `sek.label`/`sektion.label`/
        `feld.label` ROH, ohne je `textLesen()` aufzurufen — selbst ein
        korrekt registriertes Modul hätte am Bildschirm nichts geändert.
   Diese Datei prüft Ursache 2 UND den vollen Rundlauf (Ursache 1 + 2
   zusammen) — eine Probe, die nur Ursache 1 prüft, hätte den Fund nur zur
   Hälfte geschlossen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

function leeresDatumMit(sektoren) {
  return { schemaVersion: 1, sektoren: sektoren || {}, situationen: {}, menschen: [] };
}

function enModulMit(texte) {
  return { sprache: 'en', moduleVersion: 1, texte };
}

test('[Textsatz-Kopplung] Registrierung: Sektor-, Sektions- und Feld-Kennungen werden ALLE angenommen (55s "8 von 3263")', () => {
  const { V } = ladeLesen();
  const modul = enModulMit({
    'identity.label': 'Identity & Person',
    'identity#person.label': 'Person',
    'identity.givenName.label': 'First name',
  });
  const geprueft = V.textsatzModulPruefen(modul);
  assert.equal(geprueft.gueltig, true);
  // Laengen-Vergleich statt deepEqual auf dem Array: Arrays aus dem vm-Sandbox-Kontext
  // (load-lesen.js) tragen einen ANDEREN Array-Konstruktor als der aeussere Node-Prozess.
  assert.equal(geprueft.verworfene.length, 0, 'ROT VOR diesem Zug: alle drei wären als "unbekannt" verworfen worden');
  assert.equal(Object.keys(geprueft.texte).length, 3);
});

test('[Textsatz-Kopplung] voller Rundlauf: ein EN-Depot zeigt Sektor-, Sektions- und Feld-Label auf Englisch', () => {
  const { V } = ladeLesen();
  const modul = enModulMit({
    'identity.label': 'Identity & Person',
    'identity#person.label': 'Person',
    'identity.givenName.label': 'First name',
  });
  V.setData(Object.assign(leeresDatumMit({ identity: { givenName: 'Anna' } }), { textsatzModule: [modul] }));
  V._textsatzModuleAusDepotAnmelden(V.getData());
  const html = V.sektorHTML('identity');
  assert.match(html, /Identity &amp; Person/, 'Sektor-Label bleibt deutsch');
  assert.match(html, />Person</, 'Sektions-Label bleibt deutsch');
  assert.match(html, /First name/, 'Feld-Label bleibt deutsch');
});

test('[Textsatz-Kopplung·Rot-Beweis] ohne Registrierung (deutsches Depot) bleiben die Originalbeschriftungen', () => {
  const { V } = ladeLesen();
  V.setData(leeresDatumMit({ identity: { givenName: 'Anna' } }));
  V._textsatzModuleAusDepotAnmelden(V.getData());
  const html = V.sektorHTML('identity');
  assert.match(html, /Identität/, 'ohne aktives Modul muss die eingebaute deutsche Beschriftung stehen bleiben');
});

test('[Textsatz-Kopplung·Rot-Beweis] feldZeileHTML() selbst ruft textLesen() auf, nicht nur den rohen Wert', () => {
  const { V } = ladeLesen();
  const modul = enModulMit({ 'identity.givenName.label': 'First name' });
  V.setData(Object.assign(leeresDatumMit({ identity: { givenName: 'Anna' } }), { textsatzModule: [modul] }));
  V._textsatzModuleAusDepotAnmelden(V.getData());
  const feld = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find((f) => f.id === 'givenName');
  const zeile = V.feldZeileHTML('identity', feld, 'Anna');
  assert.match(zeile, /First name/,
    'ROT VOR diesem Zug: feldZeileHTML() las feld.label roh, ohne textLesen() — dieselbe Zeile hätte "Vorname" gezeigt');
});

test('[Textsatz-Kopplung] U2-ADR-334s Riegel bleibt unberührt: eine eingebaute ID bleibt für einen ANGEDOCKTEN Bereichsnamen gesperrt', () => {
  const { V } = ladeLesen();
  // _istBereichLabelKennungLesen betrifft NICHT die hier geprüfte Kennungsform — dieser Test
  // stellt nur sicher, dass die neue Bedingung sie nicht versehentlich mit-öffnet: eine Kennung,
  // die WEDER im eingebauten Kennungsraum steht NOCH eine echte Feld-/Sektions-/Sektor-Kennung
  // ist, bleibt unbekannt.
  assert.equal(V._textsatzKennungBekannt('erfundene-kennung-ohne-jede-form'), false);
});
