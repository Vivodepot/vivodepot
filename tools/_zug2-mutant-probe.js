'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rotmachbarkeits-Helfer für tests/zug2-schliessen-drei-wege.test.js
   (Regel 18, Auftrag „Depot ist Datei", 08.08.2026, Zug 2).
   ────────────────────────────────────────────────────────────────────────
   Läuft in einem EIGENEN Prozess, weil tests/load-kern.js den Kern-Pfad
   (KERN_HTML_PATH) beim require() festlegt — ein zweiter ladeKern()-Aufruf
   im selben Prozess könnte nicht auf zwei verschiedene Quellen (echt/Mutant)
   zeigen. Exit 0 = drei Wege gefunden (grün) · Exit 1 = nicht (rot).
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

(async () => {
  const fakeHandle = { name: 'probe.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  const { V, document } = ladeKern({ showSaveFilePicker: async () => fakeHandle });
  await V.depotAnlegen('probe-pw');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');   // dirty
  V.flowAppSchliessen();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  if (!html.includes('id="m-dritt"')) {
    console.log('ROT: kein #m-dritt — „Trotzdem schließen" liegt nicht im drittAktion-Slot');
    process.exit(1);
  }
  console.log('GRUEN: #m-dritt vorhanden');
  process.exit(0);
})().catch((e) => { console.log('ROT: Ausnahme — ' + (e && e.message)); process.exit(1); });
