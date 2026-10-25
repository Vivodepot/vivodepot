'use strict';
/* ═══════════════════════════════════════════════════════════
   Die Lese-App öffnet das Fach eines Empfängerkreises (Befund LESEAPP-FACH-NUR-ANKER, HOCH, 19.10.2026)
   ───────────────────────────────────────────────────────────
   U2-ADR-156 §1c legt das Fach eines Empfängerkreises IN die Datei der Inhaberin: eine eigene Tür je Eintrag der
   Umschlagstabelle, geöffnet mit dem Passwort der Vertretung. Der Kern liest es (`_zerfallLesen`: erst der Anker auf Platz 0,
   bei einem Krypto-Fehlschlag jedes Fach mit seiner eigenen Tür-Ableitung). Die Lese-App las nur Platz 0
   (`_zerfallLesenLeseApp`, heute fort), und ihr Öffnen-Weg ruft genau `leseDepotUmschlag`. Wer kein Vivodepot hat und die Datei der
   Inhaberin mit dem Fach-Passwort in der Lese-App öffnet, bekommt sie nicht auf.
   Gehalten wird:
   · Gegenprobe Kern: dieselbe Datei geht mit dem Fach-Passwort im Kern auf und zeigt den Wert des Fachs;
   · Positivkontrolle Lese-App: dieselbe Datei geht mit dem Passwort der Inhaberin in der Lese-App auf;
   · die eigene Empfänger-Datei (U2-ADR-156 §1b) geht mit dem Fach-Passwort in der Lese-App auf;
   · das Fach in der Datei geht mit dem Fach-Passwort in der Lese-App auf. Das war der Befund; geschlossen mit dem
     ZERFALL-LESER-BLOCK, der in Kern und Lese-App zeichengleich steht (Wächter: tests/zerfall-leser-block.test.js).
   Gemessen über den echten Öffnen-Weg der Lese-App (`leseDepotUmschlag`, `_depotUebernehmenGeprueft`, `sektorHTML`).
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'Inhaberin-Fach-2026!';
const PW_FACH = 'Vertretung-Fach-2026!';
const MARKER = 'MARKER-LESEAPP-FACH';
const kopie = (o) => JSON.parse(JSON.stringify(o));

let _dateien = null;
function dateien() {
  if (_dateien) return _dateien;
  _dateien = (async () => {
    const { V } = ladeKern();
    await V.depotAnlegen(PW);
    const d = V.getData();
    d.sektoren.identity = { givenName: MARKER, familyName: 'Muster' };
    V.setData(d);
    await V.empfaengerkreisSetzen({ name: 'Vertretung', bausteine: ['bereich:identity'] });
    const kreis = V.empfaengerkreiseListe()[0];
    await V.empfaengerkreisFachEinrichten(kreis, PW_FACH);
    const fach = kopie(await V.depotSerialisierenV4());
    const eigeneDatei = kopie((await V.empfaengerDateiErzeugen(V.empfaengerkreiseListe()[0], PW_FACH)).umschlag);
    return { fach, eigeneDatei };
  })();
  return _dateien;
}

async function imKern(umschlag, pw) {
  const { V } = ladeKern();
  await V.depotLaden(kopie(umschlag), pw);
  return JSON.stringify(V.getData().sektoren.identity || {}).includes(MARKER);
}
async function inLeseApp(umschlag, pw) {
  const L = ladeLesen().V;
  const offen = await L.leseDepotUmschlag(kopie(umschlag), pw);
  L.setData(await L._depotUebernehmenGeprueft(offen));
  return String(L.sektorHTML('identity')).includes(MARKER);
}

test('[Lese-App·Fach·Gegenprobe Kern] das Fach geht mit dem Fach-Passwort im Kern auf', async () => {
  const { fach } = await dateien();
  assert.equal(fach.kryptoVersion, 4, 'Vorbedingung: eine v4-Datei mit Umschlagstabelle');
  assert.ok(fach.umschlagTabelle.length >= 2, 'Vorbedingung: Anker und mindestens ein Fach');
  assert.equal(await imKern(fach, PW_FACH), true);
});

test('[Lese-App·Fach·Positivkontrolle] dieselbe Datei geht mit dem Passwort der Inhaberin in der Lese-App auf', async () => {
  const { fach } = await dateien();
  assert.equal(await inLeseApp(fach, PW), true);
});

test('[Lese-App·Fach·eigene Datei] die eigene Empfänger-Datei geht mit dem Fach-Passwort in der Lese-App auf', async () => {
  const { eigeneDatei } = await dateien();
  assert.equal(await inLeseApp(eigeneDatei, PW_FACH), true);
});

test('[Lese-App·Fach] das Fach in der Datei der Inhaberin geht mit dem Fach-Passwort in der Lese-App auf',
  {},
  async () => {
    const { fach } = await dateien();
    assert.equal(await inLeseApp(fach, PW_FACH), true);
  });
