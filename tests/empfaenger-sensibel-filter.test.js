'use strict';
/* Befund SENSIBEL-FILTER-BEREICHSBAUSTEIN (HOCH, 07.10.2026). U2-ADR-156 §3: der Sensibel-Filter bindet die engen Bausteine
   eines Fachs. Die Bereichs-Bausteine (seit 23.09.2026, betroffen v917 bis v920) sind eng, gaben aber jedes
   Bereichsfeld ins Fach — auch als sensibel markierte, in eine Datei in fremder Hand.
   Gehalten wird:
     · der Befund selbst: ein sensibles Feld eines Bereichs-Bausteins steht nicht im Zuschnitt, ein freigegebenes schon;
       sensible Unterfelder einer Liste fallen je Zeile heraus; eine Markierung der Halterin wirkt wie das Schema-Flag;
     · die Abnahme über die Datei: das Fach, mit seinem Passwort geöffnet, trägt das sensible Feld nicht;
     · das schon geschriebene Fach: beim nächsten Speichern wird es neu gebildet und verliert, was jetzt sensibel ist;
     · die Quelle der Markierung: geschrieben wird mit den Markierungen des Inhalts, der geschrieben wird (Sub-Depot);
     · der KLASSENWÄCHTER: jeder enge Baustein läuft durch den Filter, außer er steht in der Positivliste der Ab-Werk-Blätter
       (Deckel 3, je Eintrag ADR-Verweis) — mit Rot-Beweis an einem ungefilterten Baustein. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'Sensibel-Filter-2026!';
const PW_FACH = 'Fach-Sensibel-2026!';
const w = (o) => JSON.stringify(o);

async function depot(fuellen) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Anna', familyName: 'Muster' };
  fuellen(d);
  V.setData(d);
  return V;
}

test('[Sensibel-Filter·Befund] ein Bereichs-Baustein hält ein ab Werk sensibles Feld zurück und gibt ein freigegebenes heraus', async () => {
  const V = await depot((d) => {
    d.sektoren.health = { chronicConditionsDiagnoses: 'MARKER-DIAGNOSE', bloodType: 'MARKER-BLUTGRUPPE' };
    d.sensibelFelder = { health: { bloodType: false } };              // Einzelfreigabe über die Markierung
  });
  const s = w(V.empfaengerZuschnittModell({ id: 'k1', name: 'Praxis', bausteine: ['bereich:health'] }));
  assert.doesNotMatch(s, /MARKER-DIAGNOSE/, 'sensibles Feld nicht im Fach');
  assert.match(s, /MARKER-BLUTGRUPPE/, 'freigegebenes Feld im Fach');
});

test('[Sensibel-Filter·Befund] eine Markierung der Halterin wirkt wie das Schema-Flag; Unterfelder einer Liste fallen je Zeile heraus', async () => {
  const V = await depot((d) => {
    d.sektoren.housing = { ownedOrRented: 'MARKER-EIGENTUM', landlordPhone: 'MARKER-TELEFON' };
    d.sektoren.finance = { accounts: [{ iban: 'MARKER-IBAN', bank: 'MARKER-BANK' }] };
    d.sensibelFelder = { housing: { landlordPhone: true } };
  });
  const s = w(V.empfaengerZuschnittModell({ id: 'k2', name: 'Vertretung', bausteine: ['bereich:housing', 'bereich:finance'] }));
  assert.match(s, /MARKER-EIGENTUM/);
  assert.doesNotMatch(s, /MARKER-TELEFON/, 'von der Halterin markiert');
  assert.doesNotMatch(s, /MARKER-IBAN/, 'sensibles Unterfeld der Kontenliste');
});

test('[Sensibel-Filter·Abnahme] das Fach, mit seinem Passwort geöffnet, trägt das sensible Feld nicht — die Inhaberin sieht es', async () => {
  const V = await depot((d) => {
    d.sektoren.health = { chronicConditionsDiagnoses: 'MARKER-ABN-DIAGNOSE', bloodType: 'MARKER-ABN-BLUT' };
    d.sensibelFelder = { health: { bloodType: false } };
  });
  await V.empfaengerkreisSetzen({ name: 'Praxis', bausteine: ['bereich:health'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH);
  const datei = JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
  const inhaberin = ladeKern().V; await inhaberin.depotLaden(datei, PW);
  assert.match(w(inhaberin.getData()), /MARKER-ABN-DIAGNOSE/, 'Positivkontrolle: die Inhaberin sieht das Feld');
  const fach = ladeKern().V; await fach.depotLaden(datei, PW_FACH);
  assert.doesNotMatch(w(fach.getData()), /MARKER-ABN-DIAGNOSE/, 'das Fach trägt das sensible Feld nicht');
  assert.match(w(fach.getData()), /MARKER-ABN-BLUT/, 'das freigegebene Feld steht im Fach');
});

test('[Sensibel-Filter·Neu versiegeln] ein schon geschriebenes Fach wird beim nächsten Speichern neu gebildet', async () => {
  const V = await depot((d) => {
    d.sektoren.health = { bloodType: 'MARKER-NEU-BLUT' };
    d.sensibelFelder = { health: { bloodType: false } };
  });
  await V.empfaengerkreisSetzen({ name: 'Praxis', bausteine: ['bereich:health'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH);
  const oeffnen = async () => { const f = ladeKern().V; await f.depotLaden(JSON.parse(JSON.stringify(await V.depotSerialisierenV4())), PW_FACH); return w(f.getData()); };
  assert.match(await oeffnen(), /MARKER-NEU-BLUT/, 'Kontrolle: vorher freigegeben, im Fach');
  V.sensibelFeldSetzen('health', 'bloodType', true);                  // jetzt wieder sensibel
  assert.doesNotMatch(await oeffnen(), /MARKER-NEU-BLUT/, 'nach dem nächsten Speichern nicht mehr im Fach');
});

test('[Sensibel-Filter·Quelle] geschrieben wird mit den Markierungen des Inhalts, der geschrieben wird — nicht des offenen Depots', async () => {
  const V = await depot((d) => {
    d.sektoren.health = { bloodType: 'MARKER-ANKER' };
    d.sensibelFelder = { health: { bloodType: false } };              // im offenen Depot freigegeben
  });
  const sub = { schemaVersion: V.getData().schemaVersion, sektoren: { health: { bloodType: 'MARKER-SUB' } }, sensibelFelder: {} };
  const s = w(V.empfaengerZuschnittModell({ id: 'k3', name: 'Praxis', bausteine: ['bereich:health'] }, sub));
  assert.doesNotMatch(s, /MARKER-SUB/, 'im Sub-Inhalt nicht freigegeben, also zurückgehalten');
});

/* ══ Der Klassenwächter ══════════════════════════════════════════════════════════════════════════════════════════ */
// Ein Depot, in dem jedes Feld jedes Bereichs einen Wert trägt und von der Halterin als sensibel markiert ist.
function allesSensibel(V) {
  const d = V.getData();
  d.sensibelFelder = {};
  for (const s of V.bereicheAlle()) {
    const werte = d.sektoren[s.id] || (d.sektoren[s.id] = {});
    d.sensibelFelder[s.id] = {};
    for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
      if (f.typ === 'liste' || f.typ === 'ref') continue;
      werte[f.id] = 'SENSIBEL-' + s.id + '-' + f.id;
      d.sensibelFelder[s.id][f.id] = true;
    }
  }
  V.setData(d);
}
// Was ein Zuschnitt an sensiblen Werten trägt — ohne die Namensfelder fürs Banner (ausdrücklich entschieden, s. Kern).
const BANNER = new Set(['givenName', 'familyName', 'secondLastName']);
function lecks(subset) {
  const raus = [];
  for (const [sek, felder] of Object.entries(subset.sektoren || {})) {
    for (const [feld, wert] of Object.entries(felder)) {
      if (sek === 'identity' && BANNER.has(feld)) continue;
      if (/^SENSIBEL-/.test(String(wert))) raus.push(sek + '.' + feld);
    }
  }
  return raus;
}

test('[Sensibel-Filter·Klasse] jeder enge Baustein außerhalb der Blatt-Positivliste läuft durch den Filter', async () => {
  const V = await depot(() => {});
  allesSensibel(V);
  const ausnahmen = new Set(V.EMPFAENGER_BLATT_OHNE_SENSIBEL_FILTER.map((e) => e.kennung));
  const eng = V.empfaengerBausteineAlle().filter((b) => !b.weit && !ausnahmen.has(b.id));
  assert.ok(eng.length >= 7, 'Kontrolle: es gibt enge Bausteine außerhalb der Liste (' + eng.length + ')');
  for (const b of eng) {
    assert.equal(V.empfaengerSensibelFilterGilt(b), true, b.id);
    assert.deepEqual(lecks(V.empfaengerZuschnittModell({ id: 'kw', name: 'Klasse', bausteine: [b.id] })), [], b.id);
  }
});

test('[Sensibel-Filter·Klasse·Rot-Beweis] ein enger Baustein ohne Filter fällt dem Wächter auf; das Prädikat greift für jeden neuen', async () => {
  const V = await depot(() => {});
  allesSensibel(V);
  // Ein ungefilterter enger Baustein: das Notfall-Blatt (bewusste Ausnahme). Der Detektor muss ihn finden.
  assert.ok(lecks(V.empfaengerZuschnittModell({ id: 'kr', name: 'Rot', bausteine: ['notfall'] })).length > 0,
    'ohne Filter findet der Wächter sensible Werte im Zuschnitt');
  // Das Prädikat: ein neuer enger Baustein, etwa aus einem Modul, ist gefiltert — auch mit dem Namen eines Blatts als Bereich.
  assert.equal(V.empfaengerSensibelFilterGilt({ id: 'modul-blatt', weit: false }), true);
  assert.equal(V.empfaengerSensibelFilterGilt({ id: 'notfall', bereich: 'health', weit: false }), true);
  assert.equal(V.empfaengerSensibelFilterGilt({ id: 'notfall', weit: false }), false);
  assert.equal(V.empfaengerSensibelFilterGilt({ id: 'erbe', weit: true }), false, 'weit heisst weit');
});

test('[Sensibel-Filter·Positivliste] genau drei Ab-Werk-Blätter, je mit ADR-Verweis und Grund — jede weitere ist eine Lockerung', async () => {
  const { V } = ladeKern();
  const liste = V.EMPFAENGER_BLATT_OHNE_SENSIBEL_FILTER;
  assert.equal(liste.length, 3, 'Deckel: 3');
  assert.deepEqual(liste.map((e) => e.kennung).sort(), ['bestattung', 'notfall', 'pflege']);
  for (const e of liste) {
    assert.match(e.adr, /^U2-ADR-(128|435)$/, e.kennung);
    assert.match(e.grund, /^[a-z]+(?:-[a-z]+)+$/, e.kennung + ': Grund als Kennung; ausgeschrieben im Nachtrag zu U2-ADR-156 §3');
  }
  await V.depotAnlegen(PW);
  const bausteine = new Map(V.empfaengerBausteineAlle().map((b) => [b.id, b]));
  for (const e of liste) assert.ok(bausteine.has(e.kennung) && !bausteine.get(e.kennung).weit, e.kennung + ' ist ein enger Ab-Werk-Baustein');
});
