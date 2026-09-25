'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 3 · Was geschieht mit dem FHIR-Export, wenn ein Bereich mit der Kennung
   `gesundheit` aus einem Modul kommt?  (Antwort an CC, 21.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Auflage aus der Bereichssatz-Entscheidung, am Code belegt: an der Kennung
   `gesundheit` hängen Ausgabewege — FHIR/IPS, Notfallkontakt, Notfallkarte.

   DIE ANTWORT IST KÜRZER ALS DIE FRAGE: **der Fall kann nicht eintreten.**
   `bereichsModulPruefen` weist eine eingebaute Bereichs-Kennung namentlich ab
   (`grund: 'reserviert'`, A389) — ein Modul ERGÄNZT, es überschreibt nicht.
   Der FHIR-Export kann darum nie einen Modul-`gesundheit` sehen.

   GEMESSEN, NICHT GESCHLOSSEN — mit drei Gegenproben, damit „abgelehnt" nicht
   trivial ist: ein nicht reservierter Bereich wird angenommen, ein Modul
   überlebt den verworfenen Eintrag, und der eingebaute Export trägt weiter.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function depot(V) {
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
}

test('[Zug3·Positivkontrolle] der eingebaute Fall exportiert — mit angedocktem Modul im Depot', async () => {
  /* Die Auflage wörtlich: „der eingebaute Fall muss weiter exportieren". Gemessen wird er
     NICHT im leeren Depot, sondern mit einem angemeldeten Bereichsmodul daneben — sonst prüfte
     die Kontrolle einen Zustand, den die Frage gar nicht meint. */
  const { V } = ladeKern();
  await depot(V);
  const d = V.getData();
  d.bereichsModule = [{ modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'rak-koeln',
    bereiche: { obhut: { label: 'Fremde Daten in meiner Obhut' } } }];
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(d);

  const chip = V.chipAusEingabe('snomedAllergen', 'Allergie gegen Penicillin');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [chip]);
  const typen = (V.fhirIpsBundle(undefined, { sensibel: true }).entry || [])
    .map((e) => e.resource.resourceType);
  assert.ok(typen.includes('AllergyIntolerance'),
    'der eingebaute Gesundheits-Export trägt nicht mehr: ' + typen.join(', '));
});

test('[Zug3·DIE ANTWORT] ein Modul kann die Kennung `gesundheit` nicht beanspruchen', () => {
  const { V } = ladeKern();
  const g = V.bereichsModulPruefen({ moduleVersion: 1, sprache: 'de', herkunft: 'x',
    bereiche: { health: { label: 'Übernahmeversuch' } } });
  assert.equal(g.gueltig, false, 'ein Modul, das NUR `gesundheit` bringt, ist kein Modul mehr');
  assert.deepEqual(g.bereiche || [], [], 'und es bleibt kein Bereich übrig');
  assert.ok((g.verworfene || []).some((v) => v.id === 'health' && v.grund === 'reserviert'),
    'die Kennung wird nicht mehr NAMENTLICH als reserviert verworfen — dann sähe ein Tippfehler '
    + 'aus wie ein Verzicht: ' + JSON.stringify(g.verworfene));
});

test('[Zug3·Gegenprobe] ein NICHT reservierter Bereich wird angenommen', () => {
  /* Ohne sie hiesse „abgelehnt" womöglich nur, dass der Prüfer alles ablehnt. */
  const { V } = ladeKern();
  const g = V.bereichsModulPruefen({ moduleVersion: 1, sprache: 'de', herkunft: 'x',
    bereiche: { obhut: { label: 'Fremde Daten in meiner Obhut' } } });
  assert.equal(g.gueltig, true);
  assert.deepEqual(g.bereiche.map((b) => b.id), ['obhut']);
});

test('[Zug3·Gegenprobe] ein Modul ÜBERLEBT den verworfenen Eintrag — es ergänzt, es scheitert nicht', () => {
  /* Der Unterschied zählt: ein Anbieter, der versehentlich eine reservierte Kennung mitschickt,
     verliert diesen einen Bereich — nicht sein ganzes Bündel. */
  const { V } = ladeKern();
  const g = V.bereichsModulPruefen({ moduleVersion: 1, sprache: 'de', herkunft: 'x',
    bereiche: { health: { label: 'Übernahmeversuch' }, obhut: { label: 'Obhut' } } });
  assert.equal(g.gueltig, true, 'ein verworfener Eintrag verwirft nicht das Modul');
  assert.deepEqual(g.bereiche.map((b) => b.id), ['obhut']);
  assert.ok((g.verworfene || []).some((v) => v.id === 'health' && v.grund === 'reserviert'));
});

test('[Zug3] dasselbe gilt für JEDE der zwölf eingebauten Kennungen, nicht nur für `gesundheit`', () => {
  /* Die Frage galt `gesundheit`, weil dort Ausgabewege hängen. Die Antwort ist allgemeiner —
     und das gehört gemessen, statt sie auf einen Bereich zu verengen. */
  const { V } = ladeKern();
  for (const s of V.SEKTOREN) {
    const g = V.bereichsModulPruefen({ moduleVersion: 1, sprache: 'de', herkunft: 'x',
      bereiche: { [s.id]: { label: 'Versuch' }, obhut: { label: 'Obhut' } } });
    assert.ok((g.verworfene || []).some((v) => v.id === s.id && v.grund === 'reserviert'),
      s.id + ' ist nicht mehr reserviert — dann kann ein Modul einen eingebauten Bereich '
      + 'überschreiben, und die Ausgabewege daran hängen in der Luft');
  }
});
