'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Empfänger-QR-Übergabe (b16-Wiedereinbau, Krisenvorsorge-Auftrag
   24.08.2026, Zug 3c)
   ────────────────────────────────────────────────────────────────────────
   Das entfernte Bereichs-QR-Verfahren (U2-ADR-077/082/085) leckte Klartext,
   weil sein eigenes Rahmenformat von der nativen Kamera nicht als Link
   erkannt wurde. Dieses Verfahren ist strukturell anders: eine echte URL
   (`register.vivodepot.de/lesen/#eqr=…`, seit 23.09.2026) mit der Nutzlast im
   URL-Fragment (erreicht laut Web-Standard nie den Server) und echter
   PBKDF2(600k)/AES-256-GCM-Verschlüsselung, wie bei der Empfänger-Datei
   (`EMPFAENGER_PW_MIN`), nicht b16s vierstellige PIN.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const KERN_PW = 'kern-passwort-1234!!';
const EMPFAENGER_PW = 'empfaenger-pw-12';

async function depotMitKreis(bausteine) {
  const { V } = ladeKern();
  await V.depotAnlegen(KERN_PW);
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  await V.empfaengerkreisSetzen({ id: 'k1', name: 'Tochter', bausteine });
  return { V, kreis: V.empfaengerkreisFinden('k1') };
}

test('[QR-Übergabe] echtes URL-Format, kein eigenes Rahmenformat (Kernbefund gegen U2-ADR-077/082/085)', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const ergebnis = await V.empfaengerQrHerausgeben(kreis, EMPFAENGER_PW);
  assert.equal(ergebnis.zuGross, false);
  assert.ok(ergebnis.url.startsWith(V.EMPFAENGER_QR_LESE_URL + '#' + V.EMPFAENGER_QR_HASH_PRAEFIX),
    'die URL beginnt mit der Lese-App-Adresse, kein VDQR-eigenes Rahmenformat');
  const u = new URL(ergebnis.url);
  assert.equal(u.hash.length > 1, true, 'die Nutzlast liegt im Fragment (#), nicht in Query/Pfad');
});

test('[QR-Übergabe] Passwort-Mindestlänge ist die der Empfänger-Datei (8), nicht b16s vierstellige PIN', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  assert.equal(V.EMPFAENGER_PW_MIN, 8);
  await assert.rejects(() => V.empfaengerQrPayloadBauen(kreis, '1234'), /mindestens 8 Zeichen/);
});

test('[QR-Übergabe] die Feldauswahl ist dieselbe wie die Datei — ein Kreis gibt an beiden Wegen dasselbe frei', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const { inhalt } = await V.empfaengerQrPayloadBauen(kreis, EMPFAENGER_PW);
  const direkterZuschnitt = V.empfaengerZuschnittModell(kreis);
  assert.deepEqual(inhalt.sektoren, direkterZuschnitt.sektoren);
});

test('[QR-Übergabe] Ablauf liegt 24 Stunden in der Zukunft, nicht länger', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const vor = Date.now();
  const { ablauf } = await V.empfaengerQrPayloadBauen(kreis, EMPFAENGER_PW);
  const spanneMs = ablauf - vor;
  assert.ok(spanneMs > 23.9 * 60 * 60 * 1000 && spanneMs <= 24 * 60 * 60 * 1000 + 5000,
    'Ablauf-Spanne liegt bei rund 24 Stunden, gemessen ' + (spanneMs / 3600000).toFixed(2) + ' h');
});

test('[QR-Übergabe·Rot-Beweis] eine zu große Feldauswahl meldet zuGross statt einen unlesbaren QR-Code zu erzeugen', async () => {
  const { V, kreis } = await depotMitKreis(['erbe']);   // "erbe" ist der weite Baustein — nimmt alles
  // Viele Felder befüllen, damit die Nutzlast über die Ein-QR-Grenze wächst.
  for (let i = 0; i < 40; i++) {
    V.sektorFeldSetzen('personal', 'whatElseIWantToSayWhatElse',
      'Ein langer Freitext, der die Nutzlast künstlich über die QR-Kapazitätsgrenze wachsen lässt. '.repeat(20));
  }
  const ergebnis = await V.empfaengerQrHerausgeben(kreis, EMPFAENGER_PW);
  assert.equal(ergebnis.zuGross, true, 'eine überlange Nutzlast wird erkannt, nicht stillschweigend als kaputter QR ausgegeben');
});

test('[QR-Empfang] Lese-App entschlüsselt dieselbe Nutzlast, die der Kern erzeugt hat', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const ergebnis = await V.empfaengerQrHerausgeben(kreis, EMPFAENGER_PW);
  const payloadB64 = ergebnis.url.split('#')[1].slice(V.EMPFAENGER_QR_HASH_PRAEFIX.length);

  const Lr = ladeLesen();
  const entschluesselt = await Lr.V._empfaengerQrEntschluesseln(payloadB64, EMPFAENGER_PW);
  assert.equal(entschluesselt.kreis, 'Tochter');
  assert.equal(entschluesselt.inhalt.sektoren.identity.givenName, 'Anna');
});

test('[QR-Empfang·Rot-Beweis] ein falsches Passwort entschlüsselt NICHT', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const ergebnis = await V.empfaengerQrHerausgeben(kreis, EMPFAENGER_PW);
  const payloadB64 = ergebnis.url.split('#')[1].slice(V.EMPFAENGER_QR_HASH_PRAEFIX.length);

  const Lr = ladeLesen();
  await assert.rejects(() => Lr.V._empfaengerQrEntschluesseln(payloadB64, 'falsches-passwort'));
});

test('[QR-Empfang] boot() erkennt den QR-Fragment-Hash und zeigt das Passwort-Formular, nicht die Startseite', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const ergebnis = await V.empfaengerQrHerausgeben(kreis, EMPFAENGER_PW);
  const hashTeil = ergebnis.url.split('#')[1];

  const Lr = ladeLesen();
  Lr.location.hash = '#' + hashTeil;
  Lr.V.boot();
  const html = Lr.document.getElementById('app').innerHTML;
  assert.ok(html.includes('pw-form'), 'zeigt das Passwort-Formular');
  assert.ok(!html.includes('welcome'), 'zeigt NICHT die normale Startseite');
});

test('[QR-Empfang] ohne Fragment-Hash liest _empfaengerQrHashLesen() nichts — boot() bliebe beim Startbildschirm', () => {
  const Lr = ladeLesen();
  Lr.location.hash = '';
  assert.equal(Lr.V._empfaengerQrHashLesen(), null);
  Lr.location.hash = '#irgendwas-anderes';
  assert.equal(Lr.V._empfaengerQrHashLesen(), null, 'ein Hash ohne eqr=-Präfix wird nicht als QR-Übergabe gelesen');
});

test('[QR-Empfang] nach erfolgreicher Entschlüsselung ist der Zuschnitt renderfähig wie ein geöffnetes Sub-Depot', async () => {
  const { V, kreis } = await depotMitKreis(['notfall']);
  const ergebnis = await V.empfaengerQrHerausgeben(kreis, EMPFAENGER_PW);
  const payloadB64 = ergebnis.url.split('#')[1].slice(V.EMPFAENGER_QR_HASH_PRAEFIX.length);

  const Lr = ladeLesen();
  const entschluesselt = await Lr.V._empfaengerQrEntschluesseln(payloadB64, EMPFAENGER_PW);
  // Derselbe Schritt, den der (DOM-Stub-bedingt nicht auslösbare) Formular-Submit-Handler ausführt.
  const gefaltet = Lr.V._foldVollmachtenLesen(entschluesselt.inhalt);
  Lr.V.setData(gefaltet);
  Lr.V.setLeseModus('sub');
  Lr.V.setSubInfo({ inhaberin: '', bezeichnung: entschluesselt.kreis || '' });
  assert.equal(Lr.V.getLeseModus(), 'sub');
  assert.equal(Lr.V.getData().sektoren.identity.givenName, 'Anna');
  assert.equal(Lr.V.getSubInfo().bezeichnung, 'Tochter');
});
