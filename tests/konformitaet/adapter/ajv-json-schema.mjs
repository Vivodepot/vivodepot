/* ═══════════════════════════════════════════════════════════════════════════════════════
   ajv-json-schema.mjs — Adapter: JSON nach einem FIM-Leistungsschema (JSON Schema 2020-12) gegen Ajv (U2-ADR-465 Nachtrag)
   ───────────────────────────────────────────────────────────────────────────────────────
   WAS GEPRÜFT WIRD: die Datei, die der Kern über ein eingelassenes Format-Modul (`json@1`, Ziele als Liste von Pfadstufen,
   `schemaUri`) schreibt, gegen das JSON-Schema der Leistung — in der Form, die das FIM-Portal ausliefert (Schlüssel aus
   Kennung und Fassung wie „G99000002V1.0“, Gruppen über `$defs`, `required`).

   ZWEI LÄUFE, EIN ADAPTER (wie kosit-validator.mjs):
     · In der Suite: die ERFUNDENE Leistung S99000001 (tests/fixtures/fim-schema/S99000001_V1.0.schema.json und
       S99000001-format-modul-json.json). Kein FIM-Inhalt im Repo.
     · Echt: VD_FIM_JSON_SCHEMA (das gepinnte Schema der Leistung) und VD_FIM_JSON_MODUL (das Modul), beide außerhalb des
       Repos, solange die FITKO der Nutzung der Inhalte nicht zugestimmt hat (U2-ADR-456, U2-ADR-465).
   Das Modul gilt hier als von der Ladeprüfung nachgeprüft (gesetzt wie in den Proben, nie über ein Feld des Moduls); die
   Signaturbedingung für eine fremde `schemaUri` hält tests/fim-json-schema-weg.test.js.

   OFFLINE: Ajv lädt nichts nach (kein `loadSchema`); das Schema kommt aus der Datei, Verweise lösen nur innerhalb des
   Schemas auf. STRENGE: die Standard-Einstellung von Ajv (strict mode) — ein unbekanntes Schlüsselwort oder Format ist ein
   Fehler beim Übersetzen, kein stilles Durchwinken. Echte FIM-Schemas tragen vereinzelt `format: date`; dafür braucht es
   ajv-formats, das hier nicht eingebunden ist (benannt, nicht übergangen: der Lauf scheitert dann laut).

   GEPINNT ist ajv in package.json und package-lock.json exakt (8.20.0); `vorhanden()` misst die installierte Fassung.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HIER, '..', '..', '..');
const require = createRequire(import.meta.url);
const FX = path.join(REPO, 'tests', 'fixtures', 'fim-schema');

export const WERKZEUG = Object.freeze({ paket: 'ajv', version: '8.20.0' });
export const FIXTURE = Object.freeze({
  schema: path.join(FX, 'S99000001_V1.0.schema.json'),
  modul: path.join(FX, 'S99000001-format-modul-json.json'),
});

/** Die installierte Fassung von ajv (aus seinem package.json), oder null. */
export function ajvFassung() {
  try { return JSON.parse(fs.readFileSync(require.resolve('ajv/package.json'), 'utf8')).version || null; } catch (_) { return null; }
}

/** Ein Prüfer für genau ein Schema (Objekt). Wirft, wenn das Schema im strict mode nicht übersetzbar ist. */
export function pruefer(schema) {
  const Ajv2020 = require('ajv/dist/2020').default;
  const ajv = new Ajv2020({ allErrors: true });
  return ajv.compile(schema);
}

/** Urteil über einen Text gegen ein Schema: gelesen = JSON parsbar, gueltig = dazu kein Fehler der Schema-Prüfung. */
export function urteilText(schema, text) {
  let daten;
  try { daten = JSON.parse(text); } catch (e) { return { gelesen: false, gueltig: false, fehler: ['kein JSON: ' + e.message] }; }
  const pruefe = pruefer(schema);
  const ok = pruefe(daten);
  return { gelesen: true, gueltig: !!ok, fehler: ok ? [] : pruefe.errors.map((f) => (f.instancePath || '/') + ' ' + f.message) };
}

let _arbeit = null;
function arbeit() { return _arbeit || (_arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-ajv-'))); }

/** Die Werte des Probe-Depots — erfunden. */
export function probeWerte() {
  return { 'identity.familyName': 'Beispiel', 'identity.givenName': 'Lea', 'identity.gender': 'w', 'identity.birthDate': '1958-03-14' };
}

/** Der Text, den der Kern über das Modul schreibt (oder null). `ohne` lässt Depot-Felder leer. */
export async function kernText(modul, { ohne = [], werte = probeWerte(), sensibel = false } = {}) {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  for (const [k, wert] of Object.entries(werte)) {
    const [bereich, feld] = k.split('.');
    if (!ohne.includes(feld)) V.sektorFeldSetzen(bereich, feld, wert);
  }
  const geprueft = Object.assign({}, modul);
  V._modulBelegAlsGeprueftSetzen(geprueft, { stufe: 'extern-ungeprueft', anbieterId: null });
  const kanal = V.formatModulZuExportKanal(geprueft);
  if (!kanal) throw new Error('das Modul ergibt keinen Kanal: ' + (V.formatModulPruefen(modul).grund || '?'));
  return kanal.baue({ sensibel });
}

export async function kernDatei(modul, name, opt) {
  const text = await kernText(modul, opt);
  if (text === null) return null;
  const pfad = path.join(arbeit(), name + '.json');
  fs.writeFileSync(pfad, text);
  return pfad;
}

function quelle() {
  const schema = process.env.VD_FIM_JSON_SCHEMA, modul = process.env.VD_FIM_JSON_MODUL;
  if (schema || modul) {
    if (!schema || !modul) throw new Error('VD_FIM_JSON_SCHEMA und VD_FIM_JSON_MODUL gehören zusammen');
    return { schema: JSON.parse(fs.readFileSync(schema, 'utf8')), modul: JSON.parse(fs.readFileSync(modul, 'utf8')), echt: true };
  }
  return { schema: JSON.parse(fs.readFileSync(FIXTURE.schema, 'utf8')), modul: JSON.parse(fs.readFileSync(FIXTURE.modul, 'utf8')), echt: false };
}

export default {
  id: 'ajv-json-schema',
  familie: 'json-schema',
  autoritaet: 'Ajv — JSON-Schema-Prüfer (draft 2020-12), offline, strict mode',
  prueft: 'die JSON-Datei eines eingelassenen FIM-Format-Moduls gegen das JSON-Schema der Leistung in der Form des FIM-Portals',
  werkzeugVersion: WERKZEUG.version,
  standards: ['fim-leistungsschema-json'],

  vorhanden() {
    const v = ajvFassung();
    if (!v) return { ok: false, grund: 'ajv nicht installiert (npm ci)' };
    if (v !== WERKZEUG.version) return { ok: false, grund: 'ajv ' + v + ' installiert, gepinnt ist ' + WERKZEUG.version };
    return { ok: true };
  },

  urteile(umg, dateiPfad) { return urteilText(quelle().schema, fs.readFileSync(dateiPfad, 'utf8')); },

  async artefakte() {
    const q = quelle();
    const pfad = await kernDatei(q.modul, 'kern-' + q.modul.format);
    return [{ name: q.modul.format + '·kern', standard: 'fim-leistungsschema-json', pfad, erwartet: 'gueltig', herkunft: 'generator',
      warum: q.echt ? 'die Datei des Kerns nach dem gepinnten JSON-Schema der Leistung' : 'die Datei des Kerns nach der erfundenen Leistung S99000001' }];
  },

  // Ein Pflichtfeld fehlt im Depot: der Kern erfindet es nicht, also fehlt der Schlüssel, und das Schema lehnt ab.
  async kaputt() {
    const q = quelle();
    const feld = (q.modul.zuordnung.find((z) => z.feld) || {}).feld;
    const pfad = await kernDatei(q.modul, 'kern-ohne-' + feld, { ohne: [feld] });
    return [{ standard: 'fim-leistungsschema-json', pfad, warum: 'ohne ' + feld + ' fehlt ein Pflichtfeld; der Kern füllt es nicht' }];
  },

  aufraeumen() { if (_arbeit) { fs.rmSync(_arbeit, { recursive: true, force: true }); _arbeit = null; } },
};
