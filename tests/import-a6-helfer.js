'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   IMPORT A6 · Hilfen für einen Wurf der Migration (07.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Eine Migration wirft heute bei keinem bekannten Depot; die Probe braucht aber einen Wurf, der kommt, NACHDEM eine Stufe
   schon geschrieben hat — genau der halb gehobene Stand des Befunds. Darum ein Kern mit einer zusätzlichen ersten Zeile in
   depotNormalisieren: trägt das Depot `zzProbeMigrationWurf`, schreibt sie `zzProbeHalbGehoben` und wirft. Sonst ist der
   Kern derselbe. Genutzt von tests/import-a6-migrationswurf.test.js und tests/import-anzeige-modell-klasse.test.js.
   `aendern` nimmt den Kerntext und gibt ihn verändert zurück (für den Rot-Beweis: das Zurückholen herausgenommen).
   ═════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'zz-probe-A6-Passwort-2026!';
const SUB_PW = 'zz-probe-A6-Sub-2026!';
const ANKER = "function depotNormalisieren(d) {\n  const ziel = d || data;\n  if (!ziel || typeof ziel !== 'object') return ziel;\n";
const WURF = "  if (ziel.zzProbeMigrationWurf) { ziel.zzProbeHalbGehoben = true; throw new Error('zz-probe-migrationswurf'); }\n";

/* Das Zurückholen in _migrationVersuchen und sein Ergebnis — der Rot-Beweis nimmt beides heraus und hat dann das alte
   Verhalten: der Wurf wird geschluckt, der halb gehobene Stand bleibt, nichts ist nur lesend. */
const ZURUECK = "    if (vorher && ziel && typeof ziel === 'object') { for (const k of Object.keys(ziel)) delete ziel[k]; Object.assign(ziel, vorher); }\n"
  + "    return { ok: false, grund: 'migration-fehler', verworfene: [], fehler: String((e && e.message) || e) };\n";
function ohneZurueckholen(quelle) {
  if (!quelle.includes(ZURUECK)) throw new Error('die Stelle in _migrationVersuchen steht nicht mehr im Kern');
  return quelle.replace(ZURUECK, "    return { ok: true, grund: null, verworfene: [] };\n");
}

const _pfade = new Map();
function kernPfadMitWurf(aendern) {
  const schluessel = aendern ? aendern.name || 'geaendert' : 'heute';
  if (_pfade.has(schluessel)) return _pfade.get(schluessel);
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  if (!quelle.includes(ANKER)) throw new Error('der Kopf von depotNormalisieren steht nicht mehr so im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-a6-'));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  const pfad = path.join(dir, 'kern.html');
  fs.writeFileSync(pfad, (aendern ? aendern(quelle) : quelle).replace(ANKER, ANKER + WURF));
  _pfade.set(schluessel, pfad);
  return pfad;
}
const kernMitWurf = (aendern, zusatz) => ladeKern({ ...zusatz, htmlPfad: kernPfadMitWurf(aendern), backen: true });

/* Eine Datei, deren Migration wirft (mitWurf) oder nicht, gespeichert vom heutigen Kern, geöffnet über depotLaden. */
async function ankerOeffnen({ mitWurf = true, aendern = null } = {}) {
  const schreiber = ladeKern().V;
  await schreiber.depotAnlegen(PW);
  const personId = schreiber.personHinzufuegen({ name: 'Ada Probe', birthDate: '1950-03-04' });
  if (mitWurf) schreiber.getData().zzProbeMigrationWurf = true;
  const umschlag = await schreiber.depotSerialisieren();
  const { V } = kernMitWurf(aendern);
  await V.depotLaden(umschlag, PW);
  return { V, personId };
}

/* Ein Sub, dessen Migration wirft, eingehängt in einen beschreibbaren Anker und betreten. */
async function subBetreten({ mitWurf = true, aendern = null } = {}) {
  const { V } = kernMitWurf(aendern);
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tochter');
  const inhalt = { schemaVersion: V.SCHEMA_VERSION_AKTUELL, sektoren: {}, menschen: [{ id: 'p-sub', name: 'Ida Sub', birthDate: '1940-01-01' }] };
  if (mitWurf) inhalt.zzProbeMigrationWurf = true;
  const umschlag = await V.subDepotVersiegeln(inhalt, SUB_PW);
  const e = V.subDepotEinhaengen(V.depotDateiAusUmschlag(umschlag), { bezeichnung: 'Ida', inhaberin: 'Ida Sub' });
  const umschlagVorher = JSON.stringify(V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID).umschlag);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  return { V, depotUUID: e.depotUUID, umschlagVorher };
}

/* Ein Voll-Export mit älterer schemaVersion, dessen Migration wirft — eingelesen über „Ganzes Depot“. */
function vollExportText(V, { mitWurf = true } = {}) {
  const depot = JSON.parse(JSON.stringify(V.getData()));
  depot.schemaVersion = V.SCHEMA_VERSION_AKTUELL - 1;
  if (mitWurf) depot.zzProbeMigrationWurf = true;
  return JSON.stringify({ _typ: 'vivodepot-klartext-export', depot });
}

module.exports = { PW, kernMitWurf, ohneZurueckholen, ankerOeffnen, subBetreten, vollExportText };
