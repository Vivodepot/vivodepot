'use strict';
/* Rotmachbarkeits-Helfer für n2-zug2-gesundheit-sensibel-durchreichung.test.js (Regel 18).
   Fährt den ECHTEN End-zu-Ende-Weg: flowGesundheitFhirExport() → Übersichts-Dialog (nichts
   angekreuzt) → Bestätigen → der tatsächlich geschriebene Blob wird abgefangen (Blob-Attrappe
   über ladeKern-Optionen, s. tests/load-kern.js:625) und auf den zurückgehaltenen Text geprüft.
   Eigener Prozess, weil KERN_HTML_PATH bei require() von load-kern.js festgelegt wird.
   Exit 0 = "Penicillin" NICHT im Export (grün) · Exit 1 = doch (rot, echter Datenabfluss). */
const path = require('node:path');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

/* NUR die Ausschluss-Richtung: „nichts angekreuzt" → zurückgehalten — das ist der gemessene
   Root Cause (Hälfte b, fehlender Sensibel-Gate im Builder). Ein Browser-Test für die
   Einschluss-Richtung (Hälfte a, die verwerfende Lambda) wurde gebaut und real gegen einen
   Mutanten gefahren — er blieb GRÜN, weil `exportAuswahlEphemerAnwenden` den Ein-/Ausschluss
   je Feld schon vor `aufFortfahren` über dieselbe Markierung setzt, die Hälfte (b) prüft; der
   Test bewies also nichts, was diese Probe nicht schon zeigt, und wurde verworfen — s. Kopf
   von tests/n2-zug2-gesundheit-sensibel-durchreichung.test.js für die volle Herleitung. */
(async () => {
  let inhalt = null;
  function FakeBlob(parts) { inhalt = (parts || []).join(''); }
  const { V, document } = ladeKern({ Blob: FakeBlob });
  await V.depotAnlegen('probe-pw');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Probe');
  V.sektorFeldSetzen('identity', 'familyName', 'Person');
  V.sektorFeldSetzen('identity', 'birthDate', '1990-01-01');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  V.sensibelFeldSetzen('health', 'allergiesMedicationFoodOther', true);   // "nicht angekreuzt" im Übersichts-Dialog

  V.flowGesundheitFhirExport();
  const okBtn = document.getElementById('m-ok');
  if (typeof okBtn.onclick !== 'function') { console.log('ROT: kein Modal geöffnet — Aufbau gebrochen'); process.exit(1); }
  await okBtn.onclick();
  if (!inhalt) { console.log('ROT: kein Export-Blob entstanden — Aufbau gebrochen'); process.exit(1); }
  if (inhalt.includes('Penicillin')) {
    console.log('ROT: "Penicillin" steht im Export, obwohl NICHTS angekreuzt war — Datenabfluss');
    process.exit(1);
  }
  console.log('GRUEN: zurückgehaltenes Feld erscheint nicht im Export');
  process.exit(0);
})().catch((e) => { console.log('ROT: Ausnahme — ' + (e && e.message)); process.exit(1); });
