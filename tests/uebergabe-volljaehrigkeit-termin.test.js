'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergabe eines verwalteten Sub-Depots zum 18. Geburtstag (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung: der einzige Termin, der nicht übergriffig ist und genau
   berechnet werden kann, ist der 18. Geburtstag der vertretenen Person. Er
   erinnert die haltende Person, die Übergabe-Datei weiterzugeben — im Prüfblatt
   und im Kalender-Export. Kein anderer Stichtag, kein Termin ohne volles
   Geburtsdatum; nach dem Abgeben ist er weg.
   Stichtag: der erste Tag, an dem personAlter 18 ergibt — am 29.02. Geborene in
   Nichtschaltjahren am 01.03., wie die Kinder-Liste rechnet.
   ROT-BEWEIS: ein Termin mit anderem Stichtag (17. oder 19. Geburtstag, 28.02.)
   fällt; die Liste vor diesem Bau trägt keinen Termin.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function mitKind(birthDate) {
  const { V } = ladeKern();
  await V.depotAnlegen('Uebergabe-18-2026!');
  V.akteurSelbstErklaeren('Mutter');
  const p = V.personHinzufuegen({ name: 'Lea Beispiel', birthDate });
  const id = (p && p.id) || V.getData().menschen.find((m) => m.name === 'Lea Beispiel').id;
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet', vertreteneRegisterId: id }, 'Sub-Lea-2026!');
  return { V, e };
}

test('[Übergabe·18] der Termin liegt genau auf dem 18. Geburtstag, im Prüfblatt und im Kalender', async () => {
  const { V } = await mitKind('2010-05-17');
  const t = V.prueftermineUebergaben('2026-09-28');
  assert.equal(t.length, 1);
  assert.equal(t[0].faelligAm, '2028-05-17');
  assert.ok(t[0].name.includes('Lea') && t[0].hinweis.includes('Lea'), 'Name und Hinweis nennen die Person');
  assert.ok(V.prueftermineAlle('2026-09-28').some((x) => x.id === t[0].id), 'im Prüfblatt');
  const ics = V.icsKalender();
  assert.match(ics, /DTSTART;VALUE=DATE:20280517/);
  assert.ok(ics.includes('SUMMARY:' + t[0].name.replace(/,/g, '\\,')), 'eigener Name im Kalender, nicht „prüfen / aktualisieren“');
});

test('[Übergabe·18] am 29.02. Geboren: der 01.03. (ein Schaltjahr plus 18 ist nie ein Schaltjahr)', async () => {
  const { V } = ladeKern();
  assert.equal(V._volljaehrigAm('2008-02-29'), '2026-03-01');
  assert.equal(V._volljaehrigAm('2006-02-28'), '2024-02-28');
  assert.equal(V._volljaehrigAm('2012-02-29'), '2030-03-01');
  assert.equal(V._volljaehrigAm('1996-02-29'), '2014-03-01');
  assert.equal(V._volljaehrigAm('1982-02-28'), '2000-02-28');
  assert.equal(V._volljaehrigAm('2080-02-29'), '2098-03-01');
  assert.equal(V._volljaehrigAm(''), null);
  // Übereinstimmung mit der Altersrechnung des Kerns: am Tag davor 17, am Stichtag 18.
  const p = { birthDate: '2008-02-29' };
  assert.equal(V.personAlter(p, '2026-02-28'), 17);
  assert.equal(V.personAlter(p, '2026-03-01'), 18);
});

test('[Übergabe·18] am 29.02. Geboren: Kalender am 01.03., nie ein ungültiger 29.02. (§ 187 Abs. 2, § 188 Abs. 2 BGB)', async () => {
  const { V } = await mitKind('2008-02-29');
  const t = V.prueftermineUebergaben('2025-01-01');
  assert.equal(t[0].faelligAm, '2026-03-01');
  const ics = V.icsKalender();
  assert.match(ics, /DTSTART;VALUE=DATE:20260301/);
  assert.doesNotMatch(ics, /DTSTART;VALUE=DATE:20260229/);
});

test('[Übergabe·18] ohne volles Geburtsdatum kein Termin; nach dem Abgeben weg', async () => {
  const nurJahr = await mitKind('2010');
  assert.deepEqual(nurJahr.V.prueftermineUebergaben('2026-09-28'), [], 'ein Geburtsjahr allein ergibt keinen Termin');
  const { V, e } = await mitKind('2010-05-17');
  assert.equal(V.prueftermineUebergaben('2026-09-28').length, 1, 'Vorbedingung');
  V.subDepotAushaengen(e.depotUUID, { absicht: 'abgeben', empfaenger: 'Lea' });
  assert.deepEqual(V.prueftermineUebergaben('2026-09-28'), []);
  assert.ok(!/Lea: 18/.test(V.icsKalender()), 'auch nicht mehr im Kalender');
});

test('[Übergabe·18·Rot-Beweis] ein anderer Stichtag fällt', () => {
  const { V } = ladeKern();
  for (const falsch of ['2027-05-17', '2029-05-17', '2028-05-16']) assert.notEqual(V._volljaehrigAm('2010-05-17'), falsch);
  assert.notEqual(V._volljaehrigAm('2008-02-29'), '2026-02-28', 'nicht der 28.02.');
});
