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
  // backen: auch über KERN_HTML_PATH (der Mutant) das Standard-Produkt — das nackte Gerüst zeigt keinen Bereich und baut keinen Gesundheitsexport.
  const { V, document } = ladeKern({ Blob: FakeBlob, backen: true });
  await V.depotAnlegen('probe-pw');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Probe');
  V.sektorFeldSetzen('identity', 'familyName', 'Person');
  V.sektorFeldSetzen('identity', 'birthDate', '1990-01-01');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  V.sensibelFeldSetzen('health', 'allergiesMedicationFoodOther', true);   // "nicht angekreuzt" im Übersichts-Dialog
  /* Häkchen in Gruppen (Entscheidung 17.11.2026): bei 0 Häkchen bleibt „Herausgeben“ gesperrt. Damit der Weg eine Datei baut, geht
     eine zweite Angabe mit, die die Person ausdrücklich als nicht sensibel führt; geprüft wird weiter nur das nicht angehakte Feld. */
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sensibelFeldSetzen('health', 'bloodType', false);

  V.flowGesundheitFhirExport();
  const okBtn = document.getElementById('m-ok');
  if (!okBtn || typeof okBtn.onclick !== 'function') { console.log('ROT: kein Modal geöffnet — Aufbau gebrochen'); process.exit(1); }
  /* A1 (11.11.2026): geht nichts mit und ist etwas zurückgehalten, stehen zwei Knöpfe da. Der Hauptknopf gibt die
     zurückgehaltenen Angaben MIT heraus und muss das in seiner Beschriftung sagen; der Weg „nichts angekreuzt“ ist der
     Zweitknopf „Ohne sie herausgeben“. Ohne zwei Wege bleibt es beim Hauptknopf. */
  const box = document.getElementById('modal-inhalt');
  const html = String((box && box.innerHTML) || '');
  let knopf = okBtn;
  if (html.includes('data-herausgabe-zwei-wege')) {
    const S = V.STRINGS;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    if (!html.includes('id="m-ok">' + esc(S.exportAlleMitgebenKnopf) + '</button>')) {
      console.log('ROT: der Hauptknopf gibt Zurückgehaltenes mit heraus, sagt das aber nicht in seiner Beschriftung');
      process.exit(1);
    }
    knopf = document.getElementById('m-zweit');
    if (!knopf || typeof knopf.onclick !== 'function') { console.log('ROT: zwei Wege ohne Zweitknopf — Aufbau gebrochen'); process.exit(1); }
  }
  // Das Versprechen der Übersicht löst erst nach dem Bau auf (Befund EXPORT-AUSWAHL-VERFAELLT-IM-MODAL): nicht vor der Sprachwahl abwarten.
  const uebersichtFertig = knopf.onclick();
  // Seit U2-ADR-458 folgt die Wahl der Exportsprache als eigener Dialog; die Voreinstellung (Englisch) bestätigen.
  const spracheOk = document.getElementById('ips-exportsprache') && document.getElementById('m-ok');
  if (!inhalt && spracheOk && typeof spracheOk.onclick === 'function') spracheOk.onclick();
  await uebersichtFertig;
  if (!inhalt) { console.log('ROT: kein Export-Blob entstanden — Aufbau gebrochen'); process.exit(1); }
  if (inhalt.includes('Penicillin')) {
    console.log('ROT: "Penicillin" steht im Export, obwohl NICHTS angekreuzt war — Datenabfluss');
    process.exit(1);
  }
  console.log('GRUEN: zurückgehaltenes Feld erscheint nicht im Export');
  process.exit(0);
})().catch((e) => { console.log('ROT: Ausnahme — ' + (e && e.message)); process.exit(1); });
