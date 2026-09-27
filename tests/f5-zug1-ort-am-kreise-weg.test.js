'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — F5 Zug 1 (21.08.2026): die Zusage hängt am zweiten WEG, nicht mehr
   an der Angehörigen-Abschrift.
   ────────────────────────────────────────────────────────────────────────
   Die Messung vom 21.08. (`tools/angehoerigen-cache-messen.js`) hat gefunden,
   dass `angehoerigenOrt` an beiden Serialisierern NUR gesetzt wurde, wenn
   `data.angehoerigenCache` steht. Mit der Abschrift wäre damit eine zweite,
   eigenständig entschiedene Zusage stillschweigend mitgefallen: dass die
   Vertrauensperson VOR der Passwort-Eingabe liest, wo das Passwort liegt.

   Diese Proben belegen die Zusage AM LAUF, nicht an einer Fundstellenzahl —
   so verlangt es der Laufzettel „Nach den dreizehn", Posten 2, Zug 1. Die
   Abbruchklausel dieses Postens hängt an ihnen: trägt Zug 1 die Zusage nicht
   nachweislich, hält Zug 2 an.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-passwort-12345';
const FACH_PW = 'fach-passwort-der-tante-77';
const ORT = 'Versiegelter Umschlag im Küchenschrank';

// Ein Depot MIT Empfängerkreis-Fach und OHNE jede Angehörigen-Abschrift.
async function depotMitFach(V, ort) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: [] });
  const kreis = V.empfaengerkreiseListe()[0];
  await V.empfaengerkreisFachEinrichten(kreis, FACH_PW, ort);
  assert.equal('angehoerigenCache' in V.getData(), false, 'Vorbedingung: KEINE Angehörigen-Abschrift (seit Zug 2 gibt es sie nicht mehr)');
  assert.ok(V.empfaengerkreisHatFach(V.empfaengerkreisFinden(kreis.id)), 'Vorbedingung: das Fach steht');
  return kreis;
}

test('[F5·Zug1·Rot-Beweis] ohne Abschrift, aber mit einem Fach: der Ort-Hinweis steht im Umschlag', async () => {
  const { V } = ladeKern();
  await depotMitFach(V, ORT);
  const u = await V.depotSerialisieren();
  /* DIES IST DER ROTE PUNKT. Vor F5 Zug 1 hing die Bedingung an `data.angehoerigenCache`;
     dieser Umschlag hätte `angehoerigenOrt: null` getragen, und die Zusage wäre mit der
     Abschrift gefallen, ohne dass es irgendwo geschrieben stand. */
  assert.equal(u.angehoerigenOrt, ORT, 'der Hinweis hängt am Fach, nicht an der Abschrift');
  assert.equal(V.angehoerigenOrtAusUmschlag(u), ORT, 'und er ist OHNE jede Ableitung lesbar');
});

test('[F5·Zug1] die Zurückhaltung bleibt: ein Kreis OHNE Fach legt nichts offen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  await V.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: [] });
  V.getData().angehoerigen_passwort_ort = ORT;
  assert.equal(V.empfaengerkreisHatFach(V.empfaengerkreiseListe()[0]), false, 'Vorbedingung: kein Fach');
  const u = await V.depotSerialisieren();
  assert.equal(u.angehoerigenOrt, null,
    'ohne eingerichtetes Fach gibt es niemanden, der den Hinweis brauchte — also nichts offenlegen');
});

test('[F5·Zug1] ohne jeden zweiten Weg bleibt es wie bisher: kein Hinweis im Umschlag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.getData().angehoerigen_passwort_ort = ORT;
  assert.equal((await V.depotSerialisieren()).angehoerigenOrt, null);
});

test('[F5·Zug1] der Torwächter, direkt befragt — drei Lagen, ein Ergebnis je Lage', () => {
  const { V } = ladeKern();
  const mitFach = { kennung: 'Fach 2', kdfSalt: 'x', fachSchluessel: 'y', fachKeyRoh: 'z' };
  assert.equal(V._ortHinweisFuerUmschlag({ angehoerigen_passwort_ort: ORT }), null, 'kein zweiter Weg');
  assert.equal(V._ortHinweisFuerUmschlag({ angehoerigen_passwort_ort: ORT, empfaengerkreise: [mitFach] }), ORT, 'Fach');
  assert.equal(V._ortHinweisFuerUmschlag({ angehoerigen_passwort_ort: '', empfaengerkreise: [mitFach] }), null, 'kein Ortstext');
});

test('[F5·Zug1·Rot-Beweis] der REGULÄRE Anmeldeschirm zeigt den Hinweis — dort tippt der Fach-Empfänger', async () => {
  const { V } = ladeKern();
  await depotMitFach(V, ORT);
  const u = await V.depotSerialisieren();

  // Frischer Kontext = die Lage des Empfängers: kein offenes Depot, keine Session, KEIN angModus.
  const k2 = ladeKern();
  k2.V.renderCryptoOverlay();
  /* Erst nachweisen, dass die Zeile ÜBERHAUPT gerendert wird — der DOM-Stub liefert zu jeder id
     ein Element, auch zu einer, die im Markup gar nicht vorkommt. Vor F5 Zug 1 stand die Zeile
     NUR im Angehörigen-Overlay; genau diese Zusicherung hielt hier nicht. */
  const markup = k2.document.getElementById('overlay-inhalt').innerHTML || '';
  assert.ok(markup.includes('id="co-ang-ort"'), 'die Zeile steht auch im regulären Anmeldeschirm');
  assert.ok(markup.indexOf('id="co-ang-ort"') < markup.indexOf('id="co-pw"'),
    'und ÜBER dem Passwort-Feld — sie soll gelesen werden, bevor getippt wird');

  k2.document.getElementById('co-datei').files = [{ text: async () => JSON.stringify(u) }];
  await k2.V._angOrtHinweisAuffrischen();
  const zeile = k2.document.getElementById('co-ang-ort');
  assert.equal(zeile.hidden, false, 'Zeile ist sichtbar');
  assert.ok(String(zeile.textContent).includes(ORT), 'Ortstext steht drin — ' + zeile.textContent);
});

/* Zug 1 gab dem Ort-Hinweis ZWEI Wortlaute, weil es zwei Anmeldeschirme gab. Zug 2 hat den
   Angehörigen-Schirm entfernt; es bleibt einer, und das zweite Passwort ist dort immer das eines
   Fachs. Die Probe hält das fest, damit der zweite Wortlaut nicht unbemerkt zurückkehrt. */
test('[F5·Zug2] ein Anmeldeschirm, ein Wortlaut', async () => {
  const { V } = ladeKern();
  await depotMitFach(V, ORT);
  const text = JSON.stringify(await V.depotSerialisieren());

  const k = ladeKern();
  k.V.renderCryptoOverlay();
  k.document.getElementById('co-datei').files = [{ text: async () => text }];
  await k.V._angOrtHinweisAuffrischen();
  assert.equal(String(k.document.getElementById('co-ang-ort').textContent),
    k.V.STRINGS.ortHinweisAllgemein.replace('{ort}', ORT));
});

test('[F5·Zug1] der Fach-Weg schreibt den Ortstext — und `undefined` löscht keinen bestehenden', async () => {
  const { V } = ladeKern();
  const kreis = await depotMitFach(V, ORT);
  assert.equal(V.getData().angehoerigen_passwort_ort, ORT);
  // Fach neu setzen OHNE Ort-Argument: der bestehende Hinweis bleibt stehen.
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreisFinden(kreis.id), FACH_PW);
  assert.equal(V.getData().angehoerigen_passwort_ort, ORT, 'undefined lässt stehen');
  // Leerer String löscht ihn ausdrücklich.
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreisFinden(kreis.id), FACH_PW, '   ');
  assert.equal(V.getData().angehoerigen_passwort_ort, '', 'leerer String löscht');
  assert.equal((await V.depotSerialisieren()).angehoerigenOrt, null);
});

test('[F5·Zug1·am Lauf] der Empfänger liest den Hinweis OHNE Passwort — und öffnet danach sein Fach damit', async () => {
  const { V } = ladeKern();
  await depotMitFach(V, ORT);
  const u = await V.depotSerialisieren();

  // Schritt 1 — ohne jedes Passwort: der Hinweis ist da.
  assert.equal(V.angehoerigenOrtAusUmschlag(u), ORT);

  // Schritt 2 — mit dem Passwort, das der Hinweis verortet: das Fach öffnet sich wirklich.
  const frisch = ladeKern().V;
  const inhalt = await frisch.depotLaden(u, FACH_PW);
  assert.ok(inhalt && typeof inhalt === 'object', 'das Fach öffnet sich mit dem Fach-Passwort');
});
