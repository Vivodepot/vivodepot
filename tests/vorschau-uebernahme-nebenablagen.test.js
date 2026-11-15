'use strict';
/* Vorschau → echtes Depot: Ablaufdaten und „ausdrücklich keine“ bleiben (13.11.2026, Befund VORSCHAU-UEBERNAHME-VERLIERT-NEBENABLAGEN,
   HOCH). Gefunden beim Bau des Beispieldepots unter Demo.
   Befund: Nicht nur `sektoren` trägt Angaben eines Bereichs. Felder mit der Marke `laeuftAb` (etwa „Reisepass gültig bis“) liegen in
   `feldGueltigkeit[bereich][feld]`, ein „ausdrücklich keine“ in `ausdruecklichKeine[bereich]` (_RUHEND_WECKENDE_NEBENABLAGEN).
   vorschauDatenUebernehmen kannte beide nicht: wer sie in der Vorschau eintrug, verlor sie beim Anlegen des echten Depots still.
   Trug die Vorschau nur solche Angaben, sah vorschauHatDaten gar nichts und übernahm nichts. Dieselbe Liste führt das Werkzeug der
   Vorführungen (INHALTS_FELDER in tools/vorfuehrung-showcase-erzeugen.js); jede gebackene Demo verlor diese Angaben ebenso.
   Gehalten hier, über den echten Weg _depotAusPasswortFinalisieren:
   · beide Nebenablagen stehen nach dem Anlegen im Depot;
   · eine Vorschau mit nur einem Ablaufdatum gilt als Vorschau mit Daten und wird übernommen;
   · Wächter gegen die Klasse: jede Nebenablage aus _RUHEND_WECKENDE_NEBENABLAGEN steht in der Übernahmeliste des Kerns, in
     INHALTS_FELDER des Werkzeugs, und vorschauHatDaten sieht sie.
   ROT-BEWEIS: am Stand vor dem Fix (Kanon d39f4797d) ist feldGueltigkeit nach dem Anlegen {} und die Vorschau mit nur einem
   Ablaufdatum wird nicht übernommen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');
const S = require('../tools/vorfuehrung-showcase-erzeugen.js');

const PW = 'Vorschau-Nebenablagen-Probe-2026!';
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function kernMitVorschau(fuellen) {
  const k = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://vivodepot.example/app' } });
  k.V.flowVorschauBetreten();
  fuellen(k.V.getData());
  return k;
}

test('[Vorschau·Nebenablagen] Ablaufdatum und „ausdrücklich keine“ aus der Vorschau stehen nach dem Anlegen im Depot', async () => {
  const { V } = kernMitVorschau((d) => {
    d.sektoren.health = Object.assign({}, d.sektoren.health || {}, { bloodType: 'A+' });
    d.feldGueltigkeit = { mobility: { passportValidUntil: { bis: '2031-05-09' } } };
    d.ausdruecklichKeine = { health: { allergiesMedicationFoodOther: { datum: '2026-11-13' } } };
  });
  const uebernommen = await V._depotAusPasswortFinalisieren(PW, 'Anna Muster', 'Anna', 'Muster', undefined);
  assert.equal(uebernommen, true, 'die Vorschau ist übernommen');
  const d = V.getData();
  assert.deepEqual(d.feldGueltigkeit, { mobility: { passportValidUntil: { bis: '2031-05-09' } } });
  assert.deepEqual(d.ausdruecklichKeine, { health: { allergiesMedicationFoodOther: { datum: '2026-11-13' } } });
  assert.equal(d.sektoren.health.bloodType, 'A+', 'die übrigen Eintragungen bleiben');
});

test('[Vorschau·Nebenablagen] eine Vorschau mit nur einem Ablaufdatum wird übernommen', async () => {
  const { V } = kernMitVorschau((d) => { d.feldGueltigkeit = { identity: { idDocumentValidUntil: { bis: '2030-01-31' } } }; });
  const uebernommen = await V._depotAusPasswortFinalisieren(PW, 'Anna Muster', 'Anna', 'Muster', undefined);
  assert.equal(uebernommen, true, 'eine Vorschau mit Ablaufdatum hat Daten');
  assert.deepEqual(V.getData().feldGueltigkeit, { identity: { idDocumentValidUntil: { bis: '2030-01-31' } } });
});

test('[Vorschau·Nebenablagen·Klasse] jede Nebenablage steht in der Übernahmeliste des Kerns und des Werkzeugs, und vorschauHatDaten sieht sie', () => {
  const { V } = ladeKern();
  const nm = /const _RUHEND_WECKENDE_NEBENABLAGEN = Object\.freeze\(\[([^\]]*)\]\)/.exec(KERN);
  assert.ok(nm, 'Vorprüfung: der Kern nennt seine Nebenablagen');
  const neben = [...nm[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.ok(neben.length >= 2, 'Vorprüfung: mindestens zwei Nebenablagen');
  const m = /function vorschauDatenUebernehmen\(alt\) \{[\s\S]*?const inhaltsFelder = \[([\s\S]*?)\];/.exec(KERN);
  assert.ok(m, 'Vorprüfung: die Übernahmeliste im Kern ist gefunden');
  // Die Liste darf die Nebenablagen einzeln nennen oder als Ganzes einschließen (..._RUHEND_WECKENDE_NEBENABLAGEN).
  const ganz = m[1].includes('..._RUHEND_WECKENDE_NEBENABLAGEN');
  const kernListe = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  for (const n of neben) {
    assert.ok(ganz || kernListe.includes(n), n + ' fehlt in inhaltsFelder (vorschauDatenUebernehmen)');
    assert.ok(S.INHALTS_FELDER.includes(n), n + ' fehlt in INHALTS_FELDER (tools/vorfuehrung-showcase-erzeugen.js)');
    assert.equal(V.vorschauHatDaten({ [n]: { identity: { feld: { bis: '2030-01-31' } } } }), true, 'vorschauHatDaten sieht ' + n + ' nicht');
  }
});
