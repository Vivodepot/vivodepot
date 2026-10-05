'use strict';
/* Erzeuger der eingefrorenen Fixture tests/fixtures/klartext-bindung-neuere-fassung.json (Klartext-Bindung, U2-ADR-156-Nachtrag,
   05.10.2026). Er läuft NUR, wenn man ihn ausdrücklich ruft (`node tests/helfer/klartext-bindung-fixture-erzeugen.js`); die Proben
   lesen die eingecheckte Datei und halten ihre Prüfsumme fest. So bleibt die Datei, was sie sein soll: eine Datei, die eine
   NEUERE Fassung geschrieben hat — ein neues Hüllenfeld, das sie kennt und darum im Geheimteil bindet. Der heutige Kern kennt das
   Feld nicht; er muss die Datei ohne Warnung öffnen und das Feld beim Speichern byte-gleich weitertragen.
   Gebaut wird die neuere Fassung als veränderte Kopie des heutigen Kerns: sie schreibt das Feld selbst und gibt es in den Hash. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ladeKern } = require('../load-kern.js');

const PW = 'geschwisterfeld-pw-2026!';
const FELD = 'wiederherstellungshuelle';
const WERT = Object.freeze({ verfahren: 'platzhalter-v1', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', eingewickelt: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' });
const ZIEL = path.join(__dirname, '..', 'fixtures', 'klartext-bindung-neuere-fassung.json');

async function erzeugen() {
  const quelle = fs.readFileSync(path.join(__dirname, '..', '..', 'vivodepot.html'), 'utf8');
  const wert = JSON.stringify(WERT);
  const ersetzungen = [
    ["    depotSalt: aktuelleDepotSalt, depotUUID: aktuelleDepotUUID }, (f && f.uuid === aktuelleDepotUUID) ? f.felder : {});",
      "    depotSalt: aktuelleDepotSalt, depotUUID: aktuelleDepotUUID }, Object.assign({}, (f && f.uuid === aktuelleDepotUUID) ? f.felder : {}, { " + FELD + ": " + wert + " }));"],
    ["  return _umschlagFremdfelderZurueckschreiben(_whcHuelleSchreiben(await depotSerialisierenV4()));",
      "  return Object.assign(_umschlagFremdfelderZurueckschreiben(_whcHuelleSchreiben(await depotSerialisierenV4())), { " + FELD + ": " + wert + " });"],
  ];
  let html = quelle;
  for (const [alt, neu] of ersetzungen) {
    if (html.split(alt).length !== 2) throw new Error('Anker nicht genau einmal: ' + alt.slice(0, 60));
    html = html.replace(alt, neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klartext-fixture-'));
  try {
    fs.writeFileSync(path.join(dir, 'kern.html'), html);
    const { V } = ladeKern({ htmlPfad: path.join(dir, 'kern.html') });
    await V.depotAnlegen(PW);
    V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
    V.sektorFeldSetzen('health', 'bloodType', 'A+');
    return V.depotSerialisieren();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

module.exports = { PW, FELD, WERT, ZIEL, erzeugen };

if (require.main === module) {
  erzeugen().then((u) => { fs.writeFileSync(ZIEL, JSON.stringify(u) + '\n'); console.log('geschrieben: ' + ZIEL); })
    .catch((e) => { console.error(e); process.exit(1); });
}
