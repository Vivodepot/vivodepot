'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-124, Zug 2 — Sub-Depot allein öffnen (Lesepfad-Umpacken)
   ────────────────────────────────────────────────────────────────────────
   Der Lesepfad lernt eine zweite Hüllen-Form. `umschlagEntpacken(roh)` erkennt
   eine Blackbox-Export-Datei (`dateiTyp: 'vivodepot-blackbox-export'`) und hebt
   ihre drei verschachtelten Umschlag-Felder auf die oberste Ebene — genau die
   Form, die `istGueltigerUmschlag`/`depotLaden` ohnehin verlangen. Das
   Exportformat selbst ändert sich nicht (Zug 2 fügt hinzu, ersetzt nicht) —
   alte, bereits exportierte Blackbox-Dateien bleiben unverändert gültig.

   KEIN RE-ENCRYPT: `ct`/`iv`/beide Salts wandern verbatim. Geprüft: Datei durch
   beide Wege geführt, Inhalt byte-identisch · altes Passwort öffnet, falsches
   nicht · eine manipulierte Datei wird abgewiesen.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ── 1 · umschlagEntpacken ist eine reine Funktion ───────────────────────── */

test('[U2-124·Zug2·1] entpackt eine Blackbox-Hülle auf die oberste Ebene', () => {
  const { V } = ladeKern();
  const roh = {
    dateiTyp: 'vivodepot-blackbox-export',
    formatVersion: 1,
    umschlag: { kryptoVersion: 3, depotUUID: 'x', pbkdf2: { salt: 'AAA' }, depotSalt: 'BBB', iv: 'CCC', ct: 'DDD' },
  };
  const entpackt = V.umschlagEntpacken(roh);
  assert.equal(entpackt.kryptoVersion, 3);
  assert.equal(entpackt.depotUUID, 'x');
  assert.equal(entpackt.pbkdf2.salt, 'AAA');
  assert.equal(entpackt.depotSalt, 'BBB');
  assert.equal(entpackt.iv, 'CCC');
  assert.equal(entpackt.ct, 'DDD');
  assert.equal(entpackt.dateiTyp, undefined, 'der Wrapper selbst darf nicht mit hochwandern');
  assert.equal(roh.dateiTyp, 'vivodepot-blackbox-export', 'das Original bleibt unangetastet — reine Funktion');
});

test('[U2-124·Zug2·1] eine reguläre Hülle (kein Blackbox-Wrapper) kommt unverändert zurück', () => {
  const { V } = ladeKern();
  const roh = { kryptoVersion: 3, depotUUID: 'x', pbkdf2: { salt: 'AAA' }, depotSalt: 'BBB', iv: 'CCC', ct: 'DDD' };
  assert.equal(V.umschlagEntpacken(roh), roh);
});

test('[U2-124·Zug2·1] null/undefined/leer werfen nicht, kommen unverändert zurück', () => {
  const { V } = ladeKern();
  assert.equal(V.umschlagEntpacken(null), null);
  assert.equal(V.umschlagEntpacken(undefined), undefined);
});

/* ── 2 · Ende-zu-Ende gegen depotLaden: byte-identisch, Passwort, Manipulation ── */

async function subUmschlagAlsBlackbox(V, pw) {
  const { V: bau } = ladeKern();
  await bau.depotAnlegen('Werkzeug-Anker-2026!');
  bau.akteurSelbstErklaeren('Bauwerkzeug');
  bau.sektorFeldSetzen('identity', 'givenName', 'Test');
  const sub = await bau.subDepotVersiegeln(bau.getData(), pw);
  return V.blackboxDateiAusUmschlag(sub);
}

test('[U2-124·Zug2·2] die entpackte Datei öffnet über depotLaden — Inhalt byte-identisch zum Sub-Depot-Weg', async () => {
  const { V } = ladeKern();
  const PW = 'Sub-Umpacken-2026!';
  const blackboxDatei = await subUmschlagAlsBlackbox(V, PW);
  const entpackt = V.umschlagEntpacken(blackboxDatei);
  assert.ok(V.istGueltigerUmschlag(entpackt), 'die entpackte Hülle muss die reguläre Prüfung bestehen');

  await V.depotLaden(entpackt, PW);
  assert.equal(V.getData().sektoren.identity.givenName, 'Test', 'derselbe Inhalt, über den regulären Lesepfad geladen');
});

test('[U2-124·Zug2·2] die unveränderte Blackbox-Hülle besteht die reguläre Prüfung NICHT (Vorbedingung, belegt den Bau-Grund)', async () => {
  const { V } = ladeKern();
  const blackboxDatei = await subUmschlagAlsBlackbox(V, 'Egal-2026!');
  assert.equal(V.istGueltigerUmschlag(blackboxDatei), false,
    'ohne Umpacken scheitert die Blackbox-Datei am regulären Lesepfad — genau die gemessene Grenze aus dem Auftrag');
});

test('[U2-124·Zug2·2] ein falsches Passwort wird auf dem entpackten Weg abgewiesen', async () => {
  const { V } = ladeKern();
  const blackboxDatei = await subUmschlagAlsBlackbox(V, 'Richtiges-Passwort-2026!');
  const entpackt = V.umschlagEntpacken(blackboxDatei);
  await assert.rejects(() => V.depotLaden(entpackt, 'Falsches-Passwort-2026!'));
});

test('[U2-124·Zug2·2] eine manipulierte entpackte Datei wird abgewiesen (GCM-Auth-Tag)', async () => {
  const { V } = ladeKern();
  const PW = 'Manipulations-Probe-2026!';
  const blackboxDatei = await subUmschlagAlsBlackbox(V, PW);
  const entpackt = V.umschlagEntpacken(blackboxDatei);
  // U2-ADR-002 (23.09.2026, S1): V4 — gekippt wird das Chiffrat EINER Einheit (dieselbe Auth-Tag-Probe wie vorher am ct).
  const manipuliert = JSON.parse(JSON.stringify(entpackt));
  const adr = Object.keys(manipuliert.einheiten)[0];
  const ct0 = manipuliert.einheiten[adr].ct;
  manipuliert.einheiten[adr].ct = ct0.slice(0, -4) + (ct0.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
  await assert.rejects(() => V.depotLaden(manipuliert, PW), 'ein gekipptes Chiffrat muss am Auth-Tag scheitern');
});

/* ── 3 · Alte Dateien bleiben unberührt — Regressionsprobe ────────────────── */

test('[U2-124·Zug2·3] eine unveränderte Blackbox-Datei bleibt weiterhin über subDepotEinhaengen einhängbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Fuehrende-Person-2026!');
  V.akteurSelbstErklaeren('Fuehrend');
  const blackboxDatei = await subUmschlagAlsBlackbox(V, 'Sub-Passwort-2026!');
  const ergebnis = V.subDepotEinhaengen(blackboxDatei, { bezeichnung: 'Test', inhaberin: 'Test' });
  assert.ok(ergebnis && ergebnis.depotUUID, 'das Einhängen läuft unverändert — Zug 2 ist additiv, kein Ersatz');
});
