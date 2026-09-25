'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rotmachbarkeits-Helfer für tests/zug4-datei-sichtbar.test.js
   (Regel 18, Auftrag „Depot ist Datei", 08.08.2026, Zug 4).
   ────────────────────────────────────────────────────────────────────────
   Eigener Prozess aus demselben Grund wie tools/_zug2-mutant-probe.js:
   KERN_HTML_PATH wird bei require() von tests/load-kern.js festgelegt.
   Exit 0 = Dateiname + Zeitpunkt in der Depot-Liste gefunden (grün) ·
   Exit 1 = nicht (rot).
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

(async () => {
  const fakeHandle = { name: 'z4-probe.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  const { V, document } = ladeKern({ showSaveFilePicker: async () => fakeHandle, indexedDB: {} });
  await V.depotAnlegen('probe-pw');
  V.akteurSelbstErklaeren('Probe');
  await V.depotInDateiSichern();
  V.flowDepotListe();
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  const hatName = html.includes('z4-probe.vivodepot');
  const hatZeitpunkt = html.includes('depot-datei-info');
  if (!hatName || !hatZeitpunkt) {
    console.log('ROT: Depot-Liste zeigt Dateiname/Zeitpunkt nicht (hatName=' + hatName + ' hatZeitpunkt=' + hatZeitpunkt + ')');
    process.exit(1);
  }
  console.log('GRUEN: Dateiname + Zeitpunkt in der Depot-Liste vorhanden');
  process.exit(0);
})().catch((e) => { console.log('ROT: Ausnahme — ' + (e && e.message)); process.exit(1); });
