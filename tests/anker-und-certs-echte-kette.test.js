'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A352 — die vier amtlichen Vorlagen, über die ECHTE Kette
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS steht in A285, Zug 2, und er ist heute nachgemessen und unverändert:

     „Der Melder sitzt an einer überraschenden Stelle. Die Node-Suite ginge NICHT
      rot: die einzige Probe an `basisVorlagenVerifizieren` fährt durchweg mit dem
      Test-Sentinel und eigenen Fixtures, der echte Bestand
      `STANDARD_VORLAGEN_CERTS` kommt in keiner Probe vor. Rot ginge die
      Positivkontrolle auf `.doku-wortlaut > summary` in
      `tests/e2e/a104-teil1-fuenf-klassen.spec.js` — eine Trefferflächen-Probe."

   Selbst nachgemessen am 19.08.2026: `STANDARD_VORLAGEN_CERTS` kommt in genau
   einer Testdatei vor, und dort als NEGATIV-Prüfung der Lese-App
   (`lese-app-pruefgegenstand.test.js`, „der Anker steht nicht in der Lese-App").
   Der echte Anker und die echten Zertifikate laufen zusammen in KEINER Probe.

   WARUM DAS JETZT ZÄHLT. Der Anker wird gewechselt (der alte war kompromittiert),
   und die Kette kennt genau EINEN — keine Liste, keinen Übergangsvorrat. Ein
   Commit, der den Anker ändert und die zwei Behörden-Zertifikate nicht (oder
   umgekehrt), erzeugt einen gepushten Stand, in dem die vier amtlichen Vorlagen
   fehlen. Der einzige Melder dafür wäre heute eine Trefferflächen-Probe in der
   E2E-Schicht — und wer nur `npm test` fährt, sähe nichts.

   A285 hat diese Probe als Empfehlung ausgewiesen und ausdrücklich NICHT gebaut
   („Zug 2 baut nichts"). Hier ist sie.

   WAS SIE NICHT IST: eine Probe der Verify-Logik. Die steht in
   `tests/trust-basistemplate-signatur.test.js` und fährt mit Fixtures und
   Test-Anker — richtig so, denn sie prüft die KETTE. Diese hier prüft den
   BESTAND: dass die vier ausgelieferten Vorlagen mit dem ausgelieferten Anker
   und den ausgelieferten Zertifikaten zusammenpassen.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Die vier, namentlich. Eine Zahl allein („4 Vorlagen") verschwiege, WELCHE
   fehlt — und beim Ankerwechsel ist genau das die Frage: BMJ oder BZgA? */
const ERWARTET = ['patientenverfuegung', 'betreuungsverfuegung', 'vorsorgevollmacht', 'organspende'];   // Basistemplate-Ids

/* ── DER STOLPERDRAHT, ÜBER DEN DIESE PROBE SELBST GEFALLEN IST ────────────────
   `vivodepot.html:37538` startet beim Laden `basisVorlagenVerifizieren()` als
   NICHT abgewartetes Promise. `_gepruefteBasisVorlagen` ist ein globales,
   append-only Set (A285, Zug 2). Wer danach mit einem injizierten Anker misst,
   misst gegen ein Set, das der Boot-Lauf mit dem ECHTEN Anker gerade befüllt —
   und bekommt je nach Zeitpunkt 0, 2 oder 4 Treffer.

   Beim ersten Bau dieser Probe hat genau das den Rot-Beweis grün gemacht: „mit
   fremdem Anker bestehen 2 von 4". Die Kette selbst lehnte alle vier korrekt ab
   (je Vorlage nachgemessen, „Cert ungültig: JWS: Signatur ungültig") — die zwei
   kamen aus dem Boot.

   Jede Probe, die diese Funktion mit `opts.ankerJwk` fährt, MUSS darum vorher
   leeren. Ohne diese Zeile ist sie stumpf, und zwar zeitabhängig stumpf: die
   schlechteste Sorte, weil sie manchmal grün und manchmal rot ist.

   NACHTRAG (22.09.2026): „vorher durchlaufen lassen" hieß erst eine FESTE Wartezeit
   (`setTimeout(…, 400)`) — unter Last hielt sie nicht (rot/rot/grün im Suite-Lauf,
   isoliert immer grün: das Boot-Promise brauchte länger als 400 ms). Der Kern selbst
   bleibt fire-and-forget (unverändertes Verhalten); `vivodepot.html` hält seither
   zusätzlich die REFERENZ auf dieselbe Promise fest (`_basisVorlagenBootPromise`,
   tests/load-kern.js exportiert sie als `V._basisVorlagenBootPromise`) — jede Probe
   hier wartet jetzt auf DIESE Promise, nicht auf eine geratene Dauer. Kein Umbau,
   keine Zeitgrenze, kein Wiederholungsmechanismus: dieselbe Zeile, derselbe Zweck,
   nur deterministisch statt geraten. */
function frischerLauf(V) {
  V._gepruefteBasisVorlagen.clear();
  V._veralteteBasisVorlagen.clear();
  return V;
}

test('[A352·Melder] die vier amtlichen Vorlagen bestehen die echte Kette — echter Anker, echte Zertifikate', async () => {
  const { V } = ladeKern();
  await V._basisVorlagenBootPromise;             // Boot durchlaufen lassen
  frischerLauf(V);
  const geprueft = await V.basisVorlagenVerifizieren();      // ohne Argumente = der echte Bestand
  const ids = [...geprueft].sort();
  assert.deepEqual(ids, [...ERWARTET].sort(),
    'Diese Menge ist NICHT die erwartete. Der wahrscheinlichste Grund ist ein halber Ankerwechsel:\n'
    + '  · Anker gewechselt, Zertifikate nicht (oder umgekehrt) — die Kette kennt genau EINEN Anker.\n'
    + '  · Ein Zertifikat abgelaufen — dann stünde die Vorlage in `_veralteteBasisVorlagen`.\n'
    + 'Erwartet: ' + ERWARTET.join(', ') + '\nGefunden: ' + (ids.join(', ') || '(keine)'));
});

test('[A352·Melder] keine der vier ist nur „veraltet" durchgerutscht', async () => {
  /* Ohne diese Zeile wäre die Probe oben zufrieden, wenn ein Zertifikat abläuft
     und die Vorlage über die 1F/b2-Schonfrist weiterläuft. Das ist ein gewollter
     Weg für die Bürgerin, aber es ist KEIN bestandener Ankerwechsel. */
  const { V } = ladeKern();
  await V._basisVorlagenBootPromise;             // Boot durchlaufen lassen
  frischerLauf(V);
  await V.basisVorlagenVerifizieren();
  const veraltet = [...V._veralteteBasisVorlagen];
  assert.equal(veraltet.length, 0,
    'Diese Vorlagen laufen über die Ablauf-Schonfrist, nicht über eine gültige Kette: '
    + veraltet.join(', ') + '\nFür die Bürgerin ist das gewollt; als Beleg für den Ankerwechsel taugt es nicht.');
});

test('[A352·Melder] der ausgelieferte Anker trägt die Kennungs-Form, die die Zeremonie fortführt', async () => {
  /* Der `kid` reist in jedem Zertifikat mit. Die Form ist Rolle-Fassung + TTMMJJJJ
     (A285, Zug 1) — eine abweichende Form ist keine Fortführung, sondern ein
     anderer Schlüssel, und dann stimmt die Zuordnung Cert↔Anker nicht mehr. */
  const { V } = ladeKern();
  const kid = V.TRUST_AUTHORITY_PUBLIC_JWK && V.TRUST_AUTHORITY_PUBLIC_JWK.kid;
  assert.match(String(kid), /^vivodepot-trust-authority-v\d+-\d{8}$/,
    'Der kid des ausgelieferten Ankers hat nicht die Form Rolle-Fassung + TTMMJJJJ: ' + kid);
});

test('[A352·Rot-Beweis] ein fremder Anker lässt genau diese Probe rot werden', async () => {
  /* Ohne diesen Beleg wäre der grüne Lauf oben von einer Probe, die gar nichts
     tut, nicht zu unterscheiden. Gefahren wird der Fall, der beim halben Wechsel
     eintritt: die Zertifikate bleiben, der Anker ist ein anderer. */
  const { V } = ladeKern();
  /* ERST den Boot-Lauf durchlaufen lassen, DANN leeren. Nur einmal zu leeren
     genügt nicht: das nicht abgewartete Promise aus `vivodepot.html:37538` läuft
     währenddessen weiter und trägt seine vier nach — die Probe wäre dann
     zeitabhängig grün. Genau dieser Fehler ist beim ersten Bau passiert. */
  await V._basisVorlagenBootPromise;
  frischerLauf(V);
  /* Frisch erzeugt, nicht abgeschrieben: der Test-Sentinel taugt hier NICHT als
     „fremder Anker" — er ist ein vom Kern selbst benannter Anker, und eine Probe,
     die ihn nimmt, misst die Sentinel-Behandlung statt die Ankerbindung. */
  const { webcrypto } = require('node:crypto');
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const fremd = { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: pub.x, kid: 'wegwerf-nur-fuer-diese-probe' };
  const geprueft = await V.basisVorlagenVerifizieren(undefined, undefined, { ankerJwk: fremd });
  assert.equal(geprueft.size, 0,
    'Mit einem FREMDEN Anker besteht immer noch etwas die Kette — dann prüft die Probe oben '
    + 'nicht den Anker, und ein halber Wechsel bliebe unbemerkt. Gefunden: ' + [...geprueft].join(', '));
});

test('[A352·Gegenprobe] derselbe Lauf mit dem ECHTEN Anker liefert wieder alle vier', async () => {
  /* Sonst bewiese der Rot-Beweis nur, dass irgendetwas wirft. */
  const { V } = ladeKern();
  await V._basisVorlagenBootPromise;             // Boot durchlaufen lassen
  frischerLauf(V);
  const geprueft = await V.basisVorlagenVerifizieren();
  assert.equal(geprueft.size, 4);
});

test('[A352] die Zahl der Vorlagen mit Signatur und die Zahl der Zertifikate passen zusammen', async () => {
  /* Der stille Ausfall, den `basisVorlagenVerifizieren` selbst zulässt: fehlt zu
     einer Vorlage das Zertifikat ihrer Behörde, wird sie mit `continue`
     übersprungen — ohne Fehler, ohne Zähler. Beim Ankerwechsel ist genau das der
     Handgriff, den man vergisst. */
  const { V } = ladeKern();
  const mitJws = (V.STANDARD_VORLAGEN || []).filter((v) => v && v.templateJws && v.behoerde);
  assert.equal(mitJws.length, 4, 'vier Vorlagen tragen eine Signatur');
  const behoerden = [...new Set(mitJws.map((v) => v.behoerde))].sort();
  const certs = Object.keys(V.STANDARD_VORLAGEN_CERTS || {}).sort();
  assert.deepEqual(behoerden, certs,
    'Zu jeder signierten Vorlage muss ein Zertifikat ihrer Behörde vorliegen — sonst wird sie '
    + 'still übersprungen.\nBehörden: ' + behoerden.join(', ') + '\nZertifikate: ' + certs.join(', '));
});

test('[A352·Stolperdraht] der Boot-Lauf füllt das Set — wer mit injiziertem Anker misst, muss leeren', async () => {
  /* Diese Probe hält den Grund fest, aus dem `frischerLauf` oben existiert. Fiele
     sie eines Tages, wäre der nicht abgewartete Boot-Lauf verschwunden — dann
     gehört `frischerLauf` weg, nicht diese Probe. */
  const { V } = ladeKern();
  assert.equal(V._gepruefteBasisVorlagen.size, 0, 'unmittelbar nach dem Laden ist das Set leer');
  await V._basisVorlagenBootPromise;
  assert.equal(V._gepruefteBasisVorlagen.size, 4,
    'Der Boot-Lauf aus `vivodepot.html` füllt das Set ohne Zutun — er ist ein nicht abgewartetes '
    + 'Promise. Wer danach mit `opts.ankerJwk` misst, misst gegen SEIN Ergebnis.');
});

test('[A352·Stolperdraht·Rot-Beweis] ohne Leeren wäre der Anker-Rot-Beweis stumpf', async () => {
  /* Der Beleg, dass `frischerLauf` wirklich etwas tut: derselbe fremde Anker,
     einmal ohne Leeren nach abgewartetem Boot — die Treffer stammen dann sichtbar
     aus dem Boot und nicht aus der Kette. */
  const { V } = ladeKern();
  await V._basisVorlagenBootPromise;            // Boot durchlaufen lassen
  const { webcrypto } = require('node:crypto');
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const fremd = { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: pub.x, kid: 'wegwerf' };
  const ohneLeeren = await V.basisVorlagenVerifizieren(undefined, undefined, { ankerJwk: fremd });
  assert.equal(ohneLeeren.size, 4,
    'Ohne Leeren müsste das Set die vier aus dem Boot tragen — täte es das nicht, wäre der '
    + 'Stolperdraht weg und `frischerLauf` überflüssig.');
  frischerLauf(V);
  const mitLeeren = await V.basisVorlagenVerifizieren(undefined, undefined, { ankerJwk: fremd });
  assert.equal(mitLeeren.size, 0, 'nach dem Leeren besteht mit fremdem Anker nichts mehr');
});
