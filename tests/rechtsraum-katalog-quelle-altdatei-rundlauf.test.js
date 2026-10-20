'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   R1 „Rechtsraum als Modul im Kern“ (U2-ADR-504 § 3) — eine ältere Datei mit gefülltem Fach rechtsraumKatalogQuelle
   ────────────────────────────────────────────────────────────────────────────
   Seit R1 ist die Region des Gerüst-Katalogs entfallen; das Mitschrift-Fach `rechtsraumKatalogQuelle` bleibt im Depot-Schema
   und ist in neuen Dateien stets null. Ältere Dateien tragen dort noch einen Wert: das leere Objekt `{}` (zwischen Gerüst-Schnitt
   S3 und R1) oder den ganzen Katalog (vor S3). Diese Probe hält: eine solche Datei öffnet ohne Fehler, und die Angaben der Person
   sind nach „öffnen, speichern, wieder öffnen“ dieselben — auch der Rechtsraum, mit dem ein Instrument gestempelt ist.
   Echter Weg: depotSerialisieren (verschlüsselt) und depotLaden (entschlüsselt, normalisiert), je mit frischem Kern.
   ROT-BEWEIS: eine Kern-Kopie, die bei gefülltem Fach Angaben der Person verwirft, fällt auf.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const PW = 'probe-passwort-altdatei-rechtsraum-katalog-2026-10-18';
const DE_TYPEN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8')).typen;

/* Die zwei Altformen des Fachs: `{}` (S3 bis R1) und der ganze Katalog (vor S3, je Typ ein Eintrag unter dem Code). */
const ALTFORMEN = {
  'leeres Objekt (S3 bis R1)': {},
  'ganzer Katalog (vor S3)': Object.fromEntries(Object.entries(DE_TYPEN).map(([typ, e]) => [typ, { DE: e }])),
};

/* Die Angaben der Person, an denen Verlust auffiele. */
function angabenDerPerson(d) {
  return JSON.stringify({ sektoren: d.sektoren, menschen: d.menschen });
}

/* Schreibt mit `kernAlt` eine Datei, deren Mitschrift das Fach in der Altform trägt; liefert den verschlüsselten Umschlag. */
async function altdateiSchreiben(V, altform) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Partner Person', birthDate: '1961-11-02' });
  const d = V.getData();
  const partner = d.menschen.find((p) => p.name === 'Partner Person');
  d.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14' };
  d.sektoren.advanceCare = Object.assign({}, d.sektoren.advanceCare, {
    applicableSituations: ['sterbeprozess'],
    provisionInstruments: [
      { id: 'vm-1', instrument: 'enduring-power-of-attorney', rechtsraum: 'DE', authorizedPersons: [{ ref: partner.id }] },
      { id: 'bv-1', instrument: 'custodianship-declaration', rechtsraum: 'DE', proposedPerson: { ref: partner.id } },
    ],
  });
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift, { rechtsraumKatalogQuelle: JSON.parse(JSON.stringify(altform)) });
  V.setData(d);
  return V.depotSerialisieren();
}

async function rundlauf(kernLaden, altform) {
  const schreiber = ladeKern().V;
  const umschlagAlt = await altdateiSchreiben(schreiber, altform);
  const vorher = angabenDerPerson(schreiber.getData());
  // öffnen
  const V1 = kernLaden();
  await V1.depotLaden(umschlagAlt, PW);
  const nachOeffnen = angabenDerPerson(V1.getData());
  // speichern, wieder öffnen
  const umschlagNeu = await V1.depotSerialisieren();
  const V2 = kernLaden();
  await V2.depotLaden(umschlagNeu, PW);
  return { vorher, nachOeffnen, nachRundlauf: angabenDerPerson(V2.getData()), d: V2.getData() };
}

for (const [name, altform] of Object.entries(ALTFORMEN)) {
  test('[R1·Altdatei] eine Datei mit rechtsraumKatalogQuelle als ' + name + ' öffnet, und nach Speichern und Wiederöffnen sind die Angaben der Person gleich', async () => {
    const r = await rundlauf(() => ladeKern().V, altform);
    assert.equal(r.nachOeffnen, r.vorher, 'nach dem Öffnen');
    assert.equal(r.nachRundlauf, r.vorher, 'nach Speichern und Wiederöffnen');
    const instrumente = r.d.sektoren.advanceCare.provisionInstruments;
    assert.deepEqual(instrumente.map((z) => z.rechtsraum), ['DE', 'DE'], 'gestempelte Instrumente behalten ihren Rechtsraum');
  });
}

test('[R1·Altdatei·Rot-Beweis] ein Kern, der bei gefülltem Fach Angaben der Person verwirft, fällt auf', async () => {
  const kopf = 'function depotNormalisieren(d) {';
  assert.equal(KERN.split(kopf).length, 2, 'Vorbedingung: die Stelle steht genau einmal im Kern');
  const fehl = KERN.replace(kopf, kopf + '\n  if (d && d.abWerkMitschrift && d.abWerkMitschrift.rechtsraumKatalogQuelle) { d.menschen = []; }');
  const pfad = path.join(os.tmpdir(), 'rechtsraum-altdatei-rot-' + process.pid + '.html');
  fs.writeFileSync(pfad, fehl);
  try {
    const r = await rundlauf(() => ladeKern({ htmlPfad: pfad, backen: true }).V, ALTFORMEN['leeres Objekt (S3 bis R1)']);
    assert.notEqual(r.nachRundlauf, r.vorher, 'die Fehlfassung verliert Angaben — die Probe oben wäre rot');
  } finally { fs.rmSync(pfad, { force: true }); }
});
