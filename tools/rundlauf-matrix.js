'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rundlauf-matrix.js — jeder Ausgabeweg der Registry gegen jeden Einlese-Kanal
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (17.09.2026, v1-Blocker): eine Rundlauf-Messung fand eine Ausgabe, die ihr eigener
   Einlese-Kanal nicht annimmt (Menschen-vCard), und eine, deren Credential leer herauskam
   (Sozialversicherung). Die Frage „läuft jedes Format rund?" war bis dahin nirgends gestellt.

   WAS GEMESSEN WIRD, je Format aus EXPORT_FORMATE:
     1. das Referenzdepot (tests/fixtures/referenzdepot.js) in einem frisch angelegten Depot,
     2. die Ausgabe über `formatExportInhalt(def, { sensibel })` — einmal OHNE und einmal MIT
        Zustimmung zu sensiblen Angaben (die Bürgerin gibt sie im Export-Dialog einzeln frei),
     3. dieselben Bytes an JEDEN Einlese-Kanal (`importPlan`), nicht nur an den gleichnamigen,
     4. je Plan-Zeile: stimmt der eingelesene Wert mit dem Wert im Depot überein?

   „Läuft rund" heißt: der gleichnamige Kanal nimmt die Ausgabe an, liefert mindestens eine Zeile,
   und jede Zeile trägt den Wert, der im Depot steht. Ein Format mit `nurExport: true` ist als
   Einbahnstraße erklärt und wird nur aufgeführt.

   Aufruf:  node tools/rundlauf-matrix.js            (Tabelle)
            node tools/rundlauf-matrix.js --json     (Rohdaten)
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const PASSWORT = 'rundlauf-matrix-2026';

async function depotMitReferenz() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { MENSCHEN, INSTITUTIONEN, baueSektoren } = require(path.join(REPO, 'tests', 'fixtures', 'referenzdepot.js'));
  const { V } = ladeKern();
  await V.depotAnlegen(PASSWORT);
  const d = V.getData();
  d.menschen = MENSCHEN.map((m) => Object.assign({}, m));
  d.institutionen = INSTITUTIONEN.map((i) => Object.assign({}, i));
  d.sektoren = Object.assign({}, d.sektoren, baueSektoren());
  V.setData(d);
  return V;
}

function normalisiert(w) {
  return String(w == null ? '' : w).replace(/\s+/g, ' ').trim();
}

/* Ein Plan gegen das Depot: der Plan vergleicht selbst — jede Zeile trägt `status` gegen den Wert im
   Depot (`altText`). „gleich" heißt: eingelesen wird, was schon drinsteht. Listen-Einträge (Personen,
   Instrumente) stehen in `plan.listen` und zählen mit ihrer Zeilenzahl. */
function zeilenVergleichen(V, plan) {
  const gleich = [], anders = [];
  for (const z of (plan && Array.isArray(plan.zeilen)) ? plan.zeilen : []) {
    const eintrag = { sektorId: z.sektorId || plan.sektorId, feld: z.feldId, eingelesen: z.neuText, imDepot: z.altText, status: z.status };
    if (z.status === 'gleich' || normalisiert(z.neuText) === normalisiert(z.altText)) gleich.push(eintrag); else anders.push(eintrag);
  }
  /* Listen: die Menschen-Liste liegt in data.menschen, jede andere Liste im Bereich selbst. Ein Eintrag ist
     „gleich", wenn sein Name im Depot steht; ohne Namen zählt der Eintrag nur mit. */
  const d = V.getData();
  for (const l of (plan && Array.isArray(plan.listen)) ? plan.listen : []) {
    const ziel = l.feldId === 'menschen' ? (d.menschen || []) : (((d.sektoren || {})[l.sektorId] || {})[l.feldId] || []);
    const namen = new Set((Array.isArray(ziel) ? ziel : []).map((e) => normalisiert(e && e.name)));
    for (const e of Array.isArray(l.eintraege) ? l.eintraege : []) {
      const eintrag = { sektorId: l.sektorId, feld: l.feldId, eingelesen: e && e.name, imDepot: undefined, status: 'liste' };
      if (!e || e.name === undefined || namen.has(normalisiert(e.name))) gleich.push(eintrag); else anders.push(eintrag);
    }
  }
  return { gleich, anders };
}

/* Zeilen eines Plans: Feld-Zeilen plus jeder Listen-Eintrag einzeln (eine Liste mit 15 Kontakten sind 15). */
function planZeilen(plan) {
  if (!plan || plan.ungueltig) return 0;
  const z = Array.isArray(plan.zeilen) ? plan.zeilen.length : 0;
  const l = (Array.isArray(plan.listen) ? plan.listen : []).reduce((n, x) => n + (Array.isArray(x.eintraege) ? x.eintraege.length : 0), 0);
  return z + l;
}

async function messen() {
  const V = await depotMitReferenz();
  const importIds = V.IMPORT_FORMATE.map((f) => f.id);
  const raus = [];
  for (const def of V.EXPORT_FORMATE) {
    const zeile = { id: def.id, sektor: def.sektor || null, nurExport: !!def.nurExport, laeufe: {} };
    for (const sensibel of [false, true]) {
      let text = '';
      try { text = V.formatExportInhalt(def, { sensibel }); } catch (e) { zeile.laeufe[sensibel ? 'mitSensibel' : 'ohneSensibel'] = { fehler: String(e.message || e) }; continue; }
      const kanaele = {};
      for (const kid of importIds) {
        let plan = null;
        try { plan = V.importPlan(kid, text); } catch (_) { plan = null; }
        const n = planZeilen(plan);
        if (n > 0) kanaele[kid] = n;
      }
      const eigen = importIds.includes(def.id) ? (() => { try { return V.importPlan(def.id, text); } catch (_) { return null; } })() : null;
      const vergleich = eigen ? zeilenVergleichen(V, eigen) : { gleich: [], anders: [] };
      zeile.laeufe[sensibel ? 'mitSensibel' : 'ohneSensibel'] = {
        bytes: Buffer.byteLength(text, 'utf8'),
        kanaele,
        eigenerKanal: importIds.includes(def.id),
        eigeneZeilen: planZeilen(eigen),
        gleich: vergleich.gleich.length,
        anders: vergleich.anders,
      };
    }
    const m = zeile.laeufe.mitSensibel || {};
    zeile.laeuftRund = !zeile.nurExport && !!m.eigenerKanal && m.eigeneZeilen > 0 && (m.anders || []).length === 0;
    raus.push(zeile);
  }
  return raus;
}

async function main() {
  const matrix = await messen();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(matrix, null, 2)); return; }
  for (const z of matrix) {
    const o = z.laeufe.ohneSensibel || {}, m = z.laeufe.mitSensibel || {};
    console.log([z.id.padEnd(30), z.nurExport ? 'nurExport' : (z.laeuftRund ? 'rund' : 'OFFEN'),
      'ohne: ' + (o.eigeneZeilen || 0) + ' Zeilen', 'mit: ' + (m.eigeneZeilen || 0) + ' Zeilen / ' + (m.gleich || 0) + ' gleich / ' + ((m.anders || []).length) + ' anders',
      'Kanäle: ' + JSON.stringify(m.kanaele || {})].join('  '));
  }
}

module.exports = { messen, zeilenVergleichen, depotMitReferenz, planZeilen };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
