'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Fristen-Marke — eine Frist ist keine Gültigkeit (Kreise-Laufzettel P3)
   ────────────────────────────────────────────────────────────────────────────
   Der Unterschied ist die FOLGE, nicht das Datum: eine abgelaufene Gültigkeit
   erneuert man, die Sache besteht weiter. Eine verstrichene Frist NIMMT ETWAS
   WEG — und darum trägt sie weder einen Haken „geprüft" noch den Wortlaut, der
   zum Erneuern auffordert.

   Gebaut ist Weg 1 der Erhebung A419: die Marke auf den sechs Feldern, die das
   ENDE der Frist speichern. Die drei Felder, die den ANFANG speichern (§ 84 SGG,
   § 1944 BGB), rechnet der Kern weiterhin hart verdrahtet — ob die Marke eine
   Regel dazubekommt, ist die Vorlage und ist eine Produktentscheidung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'frist-probe-2026';
const HEUTE = new Date('2026-08-21T00:00:00Z');

async function depotMitFristen() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const d = V.getData();
  d.sektoren.housing = { moveOutDate: '2026-07-01', noticeDate: '2026-09-30' };
  d.sektoren.socialInsurance = { registeredAsJobSeekingOn: '2026-08-25' };
  V.setData(d);
  return V;
}

/* ══ Die Marke ist geschlossen und benennt, was sie nicht kennt ═══════════ */

test('[Frist] die Marke steht in der geschlossenen Werteliste — ein Modul darf sie mitbringen', () => {
  const { V } = ladeKern();
  assert.ok(V.FELD_MARKEN_ERLAUBT.includes('frist'));
  assert.deepEqual(V.feldMarkenPruefen(['frist', 'laeuftAb']), { marken: ['frist', 'laeuftAb'], verworfen: [] });
});

test('[Frist] eine unbekannte Marke wird weiterhin NAMENTLICH verworfen', () => {
  const { V } = ladeKern();
  const r = V.feldMarkenPruefen(['frist', 'faellt-nicht-vom-himmel']);
  assert.deepEqual(r.marken, ['frist']);
  assert.deepEqual(r.verworfen, ['faellt-nicht-vom-himmel'],
    'sonst sähe ein Modul mit einem Tippfehler aus wie eines, das die Marke nicht wollte');
});

test('[Frist] die sechs gemessenen Felder tragen sie — und ein Gültigkeitsfeld nicht', () => {
  const { V } = ladeKern();
  for (const [sek, feld] of [['housing', 'noticeDate'], ['housing', 'moveOutDate'],
    ['housing', 'handoverDateNewHome'], ['socialInsurance', 'registeredAsJobSeekingOn'],
    ['socialInsurance', 'registeredAsUnemployedOn'], ['socialInsurance', 'gdbReviewReAssessmentDate']]) {
    assert.equal(V.feldHatMarke(sek, feld, 'frist'), true, sek + '.' + feld + ' trägt die Frist-Marke');
    assert.equal(V.feldHatMarke(sek, feld, 'laeuftAb'), false, sek + '.' + feld + ' ist KEINE Gültigkeit');
  }
  // Schnitt Glied 3 (22.08.2026, U2-ADR-161): `identitaet.ausweis_gueltig` ist entfallen (Liste
  // `ausweis` seither, ohne Marke) — `reisepass_gueltig` ist der unveränderte Zwilling und hält
  // die Probe nicht-vakuos (ein tatsächlich existierendes `laeuftAb`-Feld, keine Frist).
  assert.equal(V.feldHatMarke('mobility', 'passportValidUntil', 'frist'), false,
    'ein Reisepass läuft ab und wird erneuert — das ist keine Frist');
});

/* ══ Die Frist steht im Prüfblatt ═════════════════════════════════════════ */

test('[Frist] eine gesetzte Frist erscheint im Prüfblatt, mit Ampelstufe', async () => {
  const V = await depotMitFristen();
  const liste = V.prueftermineFristen(HEUTE);
  const nach = Object.fromEntries(liste.map((r) => [r.name, r]));
  assert.equal(nach['Auszugstermin'].stufe, 'rot', 'verstrichen');
  assert.equal(nach['Meldung arbeitsuchend am'].stufe, 'gelb', 'in vier Tagen');
  assert.equal(nach['Kündigungstermin'].stufe, 'gruen', 'noch hin');
  for (const r of liste) assert.equal(r.istFrist, true, 'jede Zeile sagt, dass sie eine Frist ist');
});

test('[Frist] ohne Datum keine Zeile — ein leeres Feld ist keine Frist', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.housing = { moveOutDate: '', noticeDate: 'demnächst' };
  V.setData(d);
  assert.deepEqual(V.prueftermineFristen(HEUTE), [],
    'weder der leere String noch ein Freitext ergeben eine Frist');
});

test('[Frist] die Fristen liegen in DERSELBEN Liste wie die Prüftermine', async () => {
  const V = await depotMitFristen();
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `ausweis_gueltig` ist entfallen (Liste
  // `ausweis` seither) und trägt die Marke `laeuftAb` nicht mehr — `reisepass_gueltig` ist der
  // unveränderte Zwilling und erzeugt weiterhin über `sektorFeldSetzen` einen echten
  // `feldGueltigkeit`-Eintrag (s. Kommentar an `sektorFeldSetzen`, M1 Zug 5).
  V.sektorFeldSetzen('mobility', 'passportValidUntil', '2026-09-15');
  const alle = V.prueftermineAlle(HEUTE);
  assert.equal(alle.filter((r) => r.istFrist).length, 3);
  assert.ok(alle.some((r) => !r.istFrist), 'und die Gültigkeiten stehen weiter daneben');
});

/* ══ Der Unterschied, der die Marke trägt ═════════════════════════════════ */

test('[Frist·Rot-Beweis] die Zeile sagt „Frist abgelaufen", nicht „überfällig"', async () => {
  const V = await depotMitFristen();
  const h = V.prueftermineSektionHTML();
  const i = h.indexOf('Auszugstermin');
  assert.ok(i > 0, 'die Frist steht im Blatt');
  const zeile = h.slice(i - 200, i + 400);
  assert.ok(zeile.includes(V.STRINGS.fristAbgelaufen),
    'eine verstrichene Frist wird nicht erneuert — der Wortlaut muss das sagen');
  assert.ok(!zeile.includes(V.STRINGS.prueftermineZeileRot),
    'und er darf nicht der Erneuerungs-Wortlaut sein');
});

test('[Frist·Rot-Beweis] an einer Frist gibt es KEINEN Haken „geprüft" — an einer Gültigkeit schon', async () => {
  const V = await depotMitFristen();
  // s. Kommentar am Test „die Fristen liegen in DERSELBEN Liste": reisepass_gueltig statt des
  // entfallenen ausweis_gueltig.
  V.sektorFeldSetzen('mobility', 'passportValidUntil', '2026-09-15');
  const h = V.prueftermineSektionHTML();
  // Positivkontrolle zuerst: ohne sie prüfte die Zusicherung darunter ein leeres Blatt.
  assert.ok(h.includes('data-prtm-geprueft'), 'die Gültigkeitszeile trägt den Haken');
  const i = h.indexOf('Auszugstermin');
  assert.ok(!h.slice(i - 200, i + 400).includes('data-prtm-geprueft'),
    'die Frist nicht — sonst hakte die Bürgerin ab und hielte die Sache für erledigt');
});

test('[Frist] eine Frist wandert NICHT nach data.feldGueltigkeit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('housing', 'moveOutDate', '2026-07-01');
  const d = V.getData();
  assert.equal(d.sektoren.housing.moveOutDate, '2026-07-01', 'der Wert steht im Bereich');
  assert.equal(typeof ((d.feldGueltigkeit || {}).housing || {}).moveOutDate, 'undefined',
    'dort steht, was gilt und erneuert werden kann — eine Frist gehört nicht dorthin');
});

test('[Frist] die drei Felder, die den ANFANG speichern, tragen die Marke JETZT — samt Regel', () => {
  const { V } = ladeKern();
  /* Gemessen in A419, entschieden am 21.08.2026 (Laufzettel „Nach den dreizehn“, Posten 1):
     dort ist das Datum im Feld nicht die Frist, sondern ihr Startpunkt. Weg 1 (A420, Marke auf
     Endedaten) erreichte sie nicht. Weg 2 gibt der Marke eine `fristRegel` daneben — die Marke
     sagt „hier hängt eine Frist“, die Regel sagt, wie lange.
     Diese Probe stand bis heute umgekehrt und hielt die Lücke fest; sie hält jetzt fest, dass
     die Lücke geschlossen ist UND dass die Marke nie ohne Regel steht — eine Marke allein
     würde im Prüfblatt das Bescheid-Datum als Fälligkeit ausgeben. */
  for (const feldId of ['noticeDated', 'terminationDate']) {
    assert.equal(V.feldHatMarke('socialInsurance', feldId, 'frist'), true, feldId);
    const def = V.feldDefFuer('socialInsurance', feldId);
    assert.ok(V.feldFristRegelPruefen(def.fristRegel).regel,
      feldId + ' trägt die Marke ohne gültige Regel — im Prüfblatt stünde sein Rohdatum als Fälligkeit');
  }
});
