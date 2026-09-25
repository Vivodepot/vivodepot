'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-269 (Auftrag A1,, 04.09.2026) — das Rollen-Vokabular gebaut
   ────────────────────────────────────────────────────────────────────────────
   Vier Rollen aus der Rollen-Vokabular-Erhebung vom selben Tag: telefonFeld/emailFeld/
   adresseFelder (identitaet, Kontaktkanäle, rechtsformneutral),
   instrumentTypUnterfeld (vorsorge — erste Rolle der LISTENZEILEN-FORM).

   Die geschlossene Liste bleibt geschlossen: eine neue Rolle ist eine Code-Änderung
   im Kern, kein Feld, das ein Modul mitbringt. Diese Proben zeigen das, statt es zu
   behaupten — ein Rollen-Name, den nur eine unbekannte Rolle nennt, muss verworfen
   werden, genau wie vor diesem Auftrag.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ══ Die vier Rollen sind erlaubt ════════════════════════════════════════════ */

test('[U2-ADR-269] alle vier neuen Rollen stehen in der geschlossenen Liste', () => {
  const { V } = ladeKern();
  for (const rolle of ['telefonFeld', 'emailFeld', 'adresseFelder', 'instrumentTypUnterfeld']) {
    assert.ok(V.BEREICH_ROLLEN_ERLAUBT.includes(rolle), rolle + ' ist erlaubt');
  }
});

/* ══ identitaet trägt vier davon ══════════════════════════════════════════════ */

test('[U2-ADR-269] identitaet: telefonFeld/emailFeld/adresseFelder lösen auf', () => {
  const { V } = ladeKern();
  assert.equal(V.bereichRolle('identity', 'telefonFeld'), 'telephone');
  assert.equal(V.bereichRolle('identity', 'emailFeld'), 'email');
  assert.deepEqual(V.bereichRolle('identity', 'adresseFelder'), ['streetAddress', 'postcodeCity']);

  assert.equal(V.bereichFeldHatRolle('identity', 'telephone', 'telefonFeld'), true);
  assert.equal(V.bereichFeldHatRolle('identity', 'email', 'emailFeld'), true);
  assert.equal(V.bereichFeldHatRolle('identity', 'streetAddress', 'adresseFelder'), true);
  assert.equal(V.bereichFeldHatRolle('identity', 'postcodeCity', 'adresseFelder'), true);
  // Gegenprobe: ein anderes Feld trägt die Rolle NICHT.
  assert.equal(V.bereichFeldHatRolle('identity', 'email', 'telefonFeld'), false);
});

/* ══ vorsorge trägt instrumentTypUnterfeld — die Listenzeilen-Form ═══════════════ */

test('[U2-ADR-269] vorsorge: instrumentTypUnterfeld löst über bereichRolle auf wie jede andere Rolle', () => {
  const { V } = ladeKern();
  assert.equal(V.bereichRolle('advanceCare', 'instrumentTypUnterfeld'), 'instrument');
});

test('[U2-ADR-269] die Listenzeilen-Form: bereichListenUnterfeldHatRolle prüft ins Unterfeld hinein', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.bereichListenUnterfeldHatRolle, 'function');
  assert.equal(V.bereichListenUnterfeldHatRolle('advanceCare', 'instrument', 'instrumentTypUnterfeld'), true);
  // Gegenprobe: ein anderes Unterfeld derselben Zeilenform trägt die Rolle NICHT.
  assert.equal(V.bereichListenUnterfeldHatRolle('advanceCare', 'art', 'instrumentTypUnterfeld'), false);
  assert.equal(V.bereichListenUnterfeldHatRolle('advanceCare', 'authorizedPersons', 'instrumentTypUnterfeld'), false);
  // Gegenprobe: ein Bereich ohne diese Rolle liefert false, wirft nicht.
  assert.equal(V.bereichListenUnterfeldHatRolle('identity', 'instrument', 'instrumentTypUnterfeld'), false);
  assert.equal(V.bereichListenUnterfeldHatRolle('gibt-es-nicht', 'instrument', 'instrumentTypUnterfeld'), false);
});

/* ══ Bit-identisch: der eine umgestellte Aufrufer verhält sich unverändert ═══════ */

test('[U2-ADR-269] _instrumentTypLabel löst reale Instrument-Typen weiterhin auf — Verhalten unverändert', () => {
  const { V } = ladeKern();
  // Vor dem Umbau stand hier `f.id === 'typ'` literal. Die Rolle löst auf denselben
  // String auf ('typ', s. o.) — löst _instrumentTypLabel das trotzdem noch auf einen
  // ECHTEN Options-Treffer auf (nicht den blossen Rückfall auf den rohen Code), ist
  // das der Beleg: die Umstellung hat NICHTS am Ergebnis geändert.
  for (const typ of ['enduring-power-of-attorney', 'living-will', 'will', 'custodianship-declaration', 'guardian-nomination']) {
    const label = V._instrumentTypLabel(typ);
    assert.notEqual(label, typ, typ + ': ein echter Options-Treffer, kein Rückfall auf den rohen Code');
    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0);
  }
  // Ein unbekannter Typ fällt weiterhin auf den rohen Code zurück (unverändertes Verhalten).
  assert.equal(V._instrumentTypLabel('gibt-es-nicht'), 'gibt-es-nicht');
});

test('[U2-ADR-269·Rot] _instrumentTypLabel fragt die Rolle, nennt \'typ\' nicht mehr literal', () => {
  const { V, src } = ladeKern();
  const rumpf = src.slice(src.indexOf('function _instrumentTypLabel'),
    src.indexOf('function _instrumentGateFeldId'));
  assert.ok(rumpf.includes("bereichListenUnterfeldHatRolle('advanceCare', f.id, 'instrumentTypUnterfeld')"),
    'sie fragt die Rolle');
  assert.ok(!/f\.id === 'typ'/.test(rumpf), 'und nennt \'typ\' NICHT mehr literal im Vergleich');
});

/* ══ Die Liste bleibt geschlossen — der Rot-Beweis des Auftrags ═════════════════ */

test('[U2-ADR-269·Rot] eine erfundene Rolle wird NAMENTLICH verworfen, kein Modul kann sie sich ausdenken', () => {
  const { V } = ladeKern();
  const r = V.bereichRollenPruefen({
    telefonFeld: 'telephone',
    einBoeserAutopilotSchluessel: 'irgendwas',
  });
  assert.equal(Object.keys(r.rollen).join(','), 'telefonFeld', 'die bekannte Rolle bleibt');
  assert.equal(r.verworfen.join(','), 'einBoeserAutopilotSchluessel',
    'die erfundene Rolle wird BENANNT verworfen, nicht still übernommen');
});

test('[U2-ADR-269] jede der vier Rollen ist einzeln auflösbar — kein Merkmal ohne Träger wirkt', () => {
  const { V } = ladeKern();
  const neu = ['telefonFeld', 'emailFeld', 'adresseFelder', 'instrumentTypUnterfeld'];
  for (const rolle of neu) {
    assert.equal(V.bereichRollenPruefen({ [rolle]: 'x' }).verworfen.length, 0, rolle + ' ist erlaubt');
  }
});

/* ══ Ein von aussen eingebrachter Bereich mit einer der neuen Rollen wird angenommen ═ */

test('[U2-ADR-269] ein von aussen eingebrachter Bereich mit telefonFeld wird angenommen', () => {
  const { V } = ladeKern();
  const fremd = { rollen: { telefonFeld: 'tel', emailFeld: 'mail' } };
  const r = V.bereichRollenPruefen(fremd.rollen);
  assert.equal(r.rollen.telefonFeld, 'tel');
  assert.equal(r.rollen.telefonFeld, 'tel');
  assert.equal(r.verworfen.join(','), '');
});
