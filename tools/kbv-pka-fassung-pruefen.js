#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   kbv-pka-fassung-pruefen.js — meldet eine neue Fassung der KBV-Patientenkurzakte (U2-ADR-471, Auflage 2)
   ────────────────────────────────────────────────────────────────────────
   Die KBV-PKA-Ausgabe ist auf PKA 1.0.0 gebaut, obwohl die KBV von deren bundesweiter Umsetzung abrät und eine Überarbeitung
   beauftragt hat (mio.kbv.de, PKA 1.0.0). Erscheint eine neue Fassung, wird daraus ein Auftrag. Gelesen werden zwei Quellen:
     1. das FHIR-Paketregister: https://packages.fhir.org/kbv.mio.patientenkurzakte (dist-tags, versions)
     2. die maschinenlesbaren Definitionen der KBV unter Apache-2.0: MIOParser, Ordner src/Definitions/KBV/PKA (GitHub-API)
   Eine Fassung zählt als neu, wenn sie nicht die gebaute ist und keine ihrer bekannten Vorstufen (Suffix nach „-“).
   Das Werkzeug liest nur und läuft nicht in der Suite (Netz); die Suite fährt es gegen die Fixtures.

   Aufruf:
     node tools/kbv-pka-fassung-pruefen.js --netz                        die zwei Quellen live lesen
     node tools/kbv-pka-fassung-pruefen.js --stand <datei.json>          ein gespeicherter Stand ({ paketregister, mioparser })
     node tools/kbv-pka-fassung-pruefen.js                               ohne Argument: Fixture tests/fixtures/kbv-pka-fassung/stand-gleich.json
   Rückgabe: 0 grün · 1 neue Fassung gefunden · 2 nicht messbar (Netz, Format) — nie ein stilles Grün.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const GEBAUT = '1.0.0';
const QUELLE_PAKET = 'https://packages.fhir.org/kbv.mio.patientenkurzakte';
const QUELLE_MIOPARSER = 'https://api.github.com/repos/kassenaerztliche-bundesvereinigung/MIOParser/contents/src/Definitions/KBV/PKA';
const FIXTURE = path.join(__dirname, '..', 'tests', 'fixtures', 'kbv-pka-fassung', 'stand-gleich.json');

const istVorstufeOderGebaut = (v) => v === GEBAUT || (v.includes('-') && v.split('-')[0] === GEBAUT);

/** Prüft einen Stand. Liefert { funde: [Text], fehler: Text|null }. */
function standPruefen(stand) {
  if (!stand || typeof stand !== 'object') return { funde: [], fehler: 'kein Stand' };
  const p = stand.paketregister;
  const m = stand.mioparser;
  if (!p || typeof p.versions !== 'object' || !p['dist-tags']) return { funde: [], fehler: 'Paketregister: unbekanntes Format' };
  if (!Array.isArray(m)) return { funde: [], fehler: 'MIOParser: unbekanntes Format' };
  const funde = [];
  for (const v of Object.keys(p.versions)) if (!istVorstufeOderGebaut(v)) funde.push('Paketregister: Fassung ' + v + ' (' + QUELLE_PAKET + ')');
  const latest = p['dist-tags'].latest;
  if (latest && latest !== GEBAUT && !funde.some((f) => f.includes(' ' + latest + ' '))) funde.push('Paketregister: latest = ' + latest);
  for (const e of m) if (e && e.type === 'dir' && !istVorstufeOderGebaut(String(e.name))) funde.push('MIOParser: Ordner ' + e.name + ' (src/Definitions/KBV/PKA)');
  return { funde, fehler: null };
}

async function holen(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'vivodepot-fassungswaechter', accept: 'application/json' } });
  if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
  return r.json();
}

async function main(argv) {
  const arg = (n) => { const k = argv.indexOf(n); return k >= 0 ? argv[k + 1] : null; };
  let stand;
  let etikett;
  try {
    if (argv.includes('--netz')) {
      stand = { paketregister: await holen(QUELLE_PAKET), mioparser: await holen(QUELLE_MIOPARSER) };
      etikett = 'live';
    } else {
      const datei = arg('--stand') || FIXTURE;
      stand = JSON.parse(fs.readFileSync(datei, 'utf8'));
      etikett = path.relative(process.cwd(), datei);
    }
  } catch (e) { console.error('[kbv-pka-fassung] NICHT MESSBAR: ' + (e.message || e)); return 2; }
  const r = standPruefen(stand);
  if (r.fehler) { console.error('[kbv-pka-fassung] NICHT MESSBAR (' + etikett + '): ' + r.fehler); return 2; }
  if (!r.funde.length) { console.log('[kbv-pka-fassung] grün (' + etikett + '): nur PKA ' + GEBAUT + ' und ihre Vorstufen.'); return 0; }
  console.log('[kbv-pka-fassung] NEUE FASSUNG (' + etikett + '):');
  for (const f of r.funde) console.log('  ' + f);
  console.log('  Daraus wird ein Auftrag: Profil-Unterschiede gegen ' + GEBAUT + ' messen, U2-ADR-471 (Wiedervorlage) neu vorlegen.');
  return 1;
}

module.exports = { standPruefen, GEBAUT };
if (require.main === module) main(process.argv.slice(2)).then((c) => { process.exitCode = c; });
