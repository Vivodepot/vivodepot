'use strict';
/* Rotmachbarkeits-Helfer für n2-zug1-ips-nilknown-waechter.test.js (Regel 18).
   Eigener Prozess: KERN_HTML_PATH wird bei require() von load-kern.js festgelegt.
   Exit 0 = keine leere Sektion trägt nilknown (grün) · Exit 1 = doch (rot). */
const path = require('node:path');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

(async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('probe-pw');
  V.akteurSelbstErklaeren('Probe');
  const comp = V.fhirIpsBundle(new Date('2026-08-09T10:00:00Z')).entry[0].resource;
  const nilknown = comp.section.filter((s) => s.emptyReason && s.emptyReason.coding[0].code === 'nilknown');
  if (nilknown.length) {
    console.log('ROT: ' + nilknown.length + ' leere Sektion(en) tragen nilknown: ' + nilknown.map((s) => s.title).join(', '));
    process.exit(1);
  }
  console.log('GRUEN: keine leere Sektion trägt nilknown');
  process.exit(0);
})().catch((e) => { console.log('ROT: Ausnahme — ' + (e && e.message)); process.exit(1); });
