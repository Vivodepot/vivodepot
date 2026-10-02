'use strict';
/* ═════════════════════════════════════════════════════════════════
   U2-ADR-467, Punkt 7 — Klassenwächter über ALLE Ausgaben, die eine Anschrift schreiben: keine verliert die bisherige
   Zeile, solange ein Teil fehlt, der sie ersetzt (`ersetztDurch` an den Feldern, gelesen von anschriftFuerAusgabe).
   Der Fall, aus dem die Probe kommt: nur der Ort ist eingetragen. Bis zum 01.10.2026 ließ die Leseregel bei einer Person
   dann die ganze bisherige Anschrift fallen, und die Personenverweise in Dokumenten lasen die rohe Zeile an der Leseregel
   vorbei — eine Person mit eingetragenen Teilen stand dort ohne Anschrift.
   ZWEI HÄLFTEN:
     1 · Verhalten: jede Ausgabe mit „nur Ort“ trägt die bisherige Zeile; mit allen Teilen trägt sie die Teile.
     2 · Vollständigkeit: jede Funktion des Kerns, die anschriftFuerAusgabe ruft, steht in AUSGABEN — eine neue Ausgabe
         ohne Zeile hier ist rot. Rot-Beweis: ein erfundener Aufrufer wird gefunden, eine Ausgabe ohne Zeile ebenso.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ALT_STRASSE = 'Lindenweg 4a';
const ALT_ORT = '80331 München';
const ALT_PERSON = 'Am Hang 12, 50667 Köln';

function mit(identity, person) {
  const { V } = ladeKern();
  V.setData(V.depotNormalisieren({ schemaVersion: 91,
    sektoren: { identity: Object.assign({ givenName: 'Maria', familyName: 'von der Heide', birthDate: '1960-01-01', streetAddress: ALT_STRASSE, postcodeCity: ALT_ORT }, identity) },
    menschen: [Object.assign({ id: 'p1', name: 'Dr. Hans-Peter Müller-Lüdenscheidt', adresse: ALT_PERSON }, person)], verwalteteDepots: [] }));
  V.akteurSelbstErklaeren('Maria von der Heide');
  return V;
}
const text = (x) => (typeof x === 'string' ? x : JSON.stringify(x));

/* Je Ausgabe: wie sie aufgerufen wird. `traeger` sagt, wessen Anschrift sie schreibt. */
const AUSGABEN = {
  _fhirPatientAusIdentitaet: { traeger: 'identity', aus: (V) => V.fhirIpsBundle(new Date('2026-10-01T10:00:00Z')).entry.map((e) => e.resource).find((r) => r.resourceType === 'Patient').address },
  sdJwtVcIdentitaet: { traeger: 'identity', aus: (V) => V.sdJwtVcIdentitaet({ inklSensibel: true }) },
  vcardIdentitaet: { traeger: 'identity', aus: (V) => V.vcardIdentitaet() },
  _identitaetPersonalienSatz: { traeger: 'identity', aus: (V) => V._identitaetPersonalienSatz() },
  _identitaetLuecken: { traeger: 'identity', nurVorhanden: true, aus: (V) => V._identitaetLuecken(['adresse']) },
  _pvEingangsformel: { traeger: 'identity', aus: (V) => V._pvEingangsformel() },
  _erbscheinSektorDaten: { traeger: 'identity', aus: (V) => V._erbscheinSektorDaten() },
  _kiEingangsformel: { traeger: 'identity', aus: (V) => V._kiEingangsformel() },
  vcardMenschen: { traeger: 'person', aus: (V) => V.vcardMenschen() },
  personVollzeile: { traeger: 'person', aus: (V) => V.personVollzeile({ ref: 'p1' }) },
  verweisExportFelder: { traeger: 'person', aus: (V) => V._verweisExportZeile('person', 'vollmacht', { ref: 'p1' }) },
};

function aufrufer(quelle) {
  const namen = new Set();
  let fn = null;
  for (const z of quelle.split('\n')) {
    const m = /^\s*(?:async\s+)?function\s+([\w$]+)/.exec(z);
    if (m) fn = m[1];
    if (/^\s*(\/\/|\*)/.test(z)) continue;
    if (/\banschriftFuerAusgabe\(/.test(z) && fn && fn !== 'anschriftFuerAusgabe') namen.add(fn);
  }
  return [...namen].sort();
}

test('[Anschrift·Spiegel·Vollständigkeit] jede Ausgabe, die die Leseregel ruft, steht in der Probe', () => {
  assert.deepEqual(aufrufer(KERN), Object.keys(AUSGABEN).sort());
});

test('[Anschrift·Spiegel] nur der Ort eingetragen: keine Ausgabe verliert die bisherige Zeile', () => {
  const V = mit({ city: 'München' }, { city: 'Köln' });
  for (const [name, a] of Object.entries(AUSGABEN)) {
    const aus = a.aus(V);
    if (a.nurVorhanden) { assert.ok(!text(aus).includes('"adresse"') && !text(aus).toLowerCase().includes('anschrift'), name + ': die Anschrift gilt als vorhanden'); continue; }
    if (a.traeger === 'identity') assert.ok(text(aus).includes(ALT_STRASSE) && text(aus).includes('80331'), name + ': eine bisherige Zeile fehlt');
    else assert.ok(text(aus).includes('Am Hang 12'), name + ': die bisherige Anschrift der Person fehlt');
  }
});

test('[Anschrift·Spiegel] alle Teile eingetragen: jede Ausgabe nimmt die Teile', () => {
  const V = mit({ street: 'Rosenweg', houseNumber: '7', postalCode: '10115', city: 'Berlin' },
    { street: 'Talweg', houseNumber: '3', postalCode: '01067', city: 'Dresden' });
  for (const [name, a] of Object.entries(AUSGABEN)) {
    if (a.nurVorhanden) continue;
    const aus = text(a.aus(V));
    if (a.traeger === 'identity') {
      assert.ok(aus.includes('Rosenweg') && aus.includes('Berlin'), name + ': die Teile fehlen');
      assert.ok(!aus.includes(ALT_STRASSE), name + ': die bisherige Zeile steht neben den Teilen');
    } else {
      assert.ok(aus.includes('Talweg') && aus.includes('Dresden'), name + ': die Teile fehlen');
      assert.ok(!aus.includes('Am Hang 12'), name + ': die bisherige Zeile steht neben den Teilen');
    }
  }
});

test('[Anschrift·Spiegel·Rot-Beweis] ein neuer Aufrufer ohne Zeile und eine Ausgabe ohne die Zeile fallen auf', () => {
  const erfunden = KERN + '\nfunction neueAusgabe() {\n  return anschriftFuerAusgabe(\'identity\').zeile;\n}\n';
  assert.notDeepEqual(aufrufer(erfunden), Object.keys(AUSGABEN).sort());
  assert.ok(aufrufer(erfunden).includes('neueAusgabe'));
  assert.ok(!aufrufer('// anschriftFuerAusgabe(p)\nfunction x() {}').length, 'ein Kommentar ist kein Aufrufer');
  // Die Leseregel von vor dem 01.10.2026 (Person: ein Teil verdrängt die Zeile) wäre hier rot:
  const alteRegel = (p) => [p.city].filter(Boolean).join(' ') || p.adresse;
  assert.ok(!alteRegel({ adresse: ALT_PERSON, city: 'Köln' }).includes('Am Hang 12'));
});
