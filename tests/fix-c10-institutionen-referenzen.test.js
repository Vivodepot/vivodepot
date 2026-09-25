'use strict';
/* ════════════════════════════════════════════════════════════════════════
   C10 / U2-ADR-116 — vier Freitextfelder werden Institutions-Referenzen
   ────────────────────────────────────────────────────────────────────────
   Die Prüfung zum Fix, nach Regel 7 (`tests/fix-<nummer>-<kurz>.test.js`).

   DIE MIGRATION selbst liegt als Stufen-Eintrag in `tests/fixtures/migrations-stufen.js`
   (Sprung 43) — dort gehört sie hin, weil U2-ADR-108 jeden Sprung dort einfordert und
   der Governance-Wächter sonst rot wird. Hier steht, was dort NICHT hingehört:

     1 · die FELD-DEFINITIONEN — tragen die vier wirklich `ref`/`institution`?
     2 · der TYP-WÄCHTER samt Positivkontrolle (A43, zweite Hälfte)
     3 · die GRENZE des Wächters, ausdrücklich geprüft statt stillschweigend

   Zu (3): Ein Wächter, dessen Grenze niemand festhält, wird mit der Zeit für mehr
   gehalten, als er leistet. `sektorFeldSetzen` deckt Sektorfelder; Listen-Unterfelder
   laufen über `listenEintragHinzufuegen`. Diese GRENZE war hier als gepinnte Lücke
   festgehalten und ist mit A56 (30.07.2026) GESCHLOSSEN — `_listenEintragRefPruefen`
   deckt jetzt beide Listen-Schreibwege, der Import liefert über `_importEintragRefNorm`
   {override} (A55). Die letzte Prüfung unten ist darum von „deckt NICHT" auf „wirft jetzt"
   gedreht; sie bleibt stehen, damit der geschlossene Zustand bewacht ist statt nur behauptet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Die vier Ziele des Umbaus, mit ihrem beschlossenen Verweis-Zweck (U2-ADR-116 §1). */
const VIER = [
  { sektor: 'health',         feld: 'healthInsurance',  zweck: 'aerztlich' },
  { sektor: 'mobility',         feld: 'carInsurance',  zweck: 'geschaeftlich' },
  { sektor: 'socialInsurance', feld: 'longTermCareFund',       zweck: 'pflege' },
];

test('[C10] die vier Felder tragen ref/institution mit ihrem Verweis-Zweck', () => {
  const { V } = ladeKern();
  for (const z of VIER) {
    const def = V.feldDefFuer(z.sektor, z.feld);
    assert.ok(def, `${z.sektor}.${z.feld} existiert nicht`);
    assert.equal(def.typ, 'ref', `${z.sektor}.${z.feld}: typ`);
    assert.equal(def.entitaet, 'institution', `${z.sektor}.${z.feld}: entitaet`);
    assert.equal(def.verweisZweck, z.zweck, `${z.sektor}.${z.feld}: verweisZweck`);
  }
  // Das vierte Ziel ist ein UNTERfeld der Liste `konten` — eigener Suchweg, sonst faende
  // die Schleife oben es nicht und die Pruefung waere fuer dieses Feld still leer.
  const konten = V.SEKTOR_BY_ID.finance.sektionen
    .flatMap((s) => s.felder || []).find((f) => f.id === 'accounts');
  const bank = (konten.unterFelder || []).find((u) => u.id === 'institution');
  assert.equal(bank.typ, 'ref', 'konten[].bank: typ');
  assert.equal(bank.entitaet, 'institution', 'konten[].bank: entitaet');
});

/* ── Der Typ-Wächter (A43, zweite Hälfte) ──────────────────────────────────
   Beide Richtungen. Ohne die zweite waere er von einem Waechter, der IMMER wirft,
   nicht zu unterscheiden — und ein solcher waere ein Ausfall, kein Schutz. */
test('[C10] Typwächter: ein roher String in einem ref-Feld wirft', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('C10-Probe-2026!');
  V.akteurSelbstErklaeren('Marlies');
  for (const z of VIER) {
    assert.throws(
      () => V.sektorFeldSetzen(z.sektor, z.feld, 'Ein getippter Name'),
      /Verweis-Feld/,
      `${z.sektor}.${z.feld}: roher String muss werfen`);
  }
  // Und an einem BESTANDS-ref-Feld, das C10 nicht angefasst hat: der Waechter schuetzt die
  // Klasse, nicht die vier Felder dieses Umbaus. Faellt diese Zeile, ist er zu eng geraten.
  assert.throws(() => V.sektorFeldSetzen('education', 'employer', 'Siemens AG'), /Verweis-Feld/);
});

test('[C10·Positivkontrolle] die gültigen Formen gehen durch — der Wächter wirft nicht immer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('C10-Probe-2026!');
  V.akteurSelbstErklaeren('Marlies');
  const id = V.institutionHinzufuegen({ name: 'AOK Bayern', art: 'krankenkasse' });
  for (const z of VIER) {
    assert.doesNotThrow(() => V.sektorFeldSetzen(z.sektor, z.feld, { ref: id }),
      `${z.sektor}.${z.feld}: echter Verweis muss durchgehen`);
    assert.doesNotThrow(() => V.sektorFeldSetzen(z.sektor, z.feld, { override: 'Freitext' }),
      `${z.sektor}.${z.feld}: override muss durchgehen`);
    /* Und das LEEREN. Es steht hier nicht der Vollstaendigkeit halber: ein Waechter, der `''`
       mitverbietet, macht das Feld unloeschbar, und das faellt im Betrieb erst der Buergerin
       auf — nicht der Suite. */
    assert.doesNotThrow(() => V.sektorFeldSetzen(z.sektor, z.feld, ''),
      `${z.sektor}.${z.feld}: Leeren muss erlaubt bleiben`);
  }
  // Der echte Verweis loest auch wirklich auf — sonst waere „geht durch" wertlos.
  assert.equal(V.institutionName({ ref: id }), 'AOK Bayern');
});

test('[C10→A56] die Grenze ist GESCHLOSSEN: ein roher String im ref-Unterfeld wirft jetzt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('C10-Probe-2026!');
  V.akteurSelbstErklaeren('Marlies');
  /* Bis 30.07.2026 stand hier eine GEPINNTE LÜCKE: `listenEintragHinzufuegen` ging nicht durch
     `sektorFeldSetzen`, ein roher String im ref-Unterfeld kam durch, und diese Zeile hielt fest,
     dass der Wächter genau dort NICHT deckt — mit der Anweisung, sie beim Schliessen zu drehen.
     A56 hat sie geschlossen: `_listenEintragRefPruefen` sitzt jetzt in `listenEintragHinzufuegen`
     und `-Aktualisieren`. Beide Richtungen, sonst wäre er von einem Wächter, der IMMER wirft,
     nicht zu unterscheiden. */
  assert.throws(
    () => V.listenEintragHinzufuegen('finance', 'accounts', { institution: 'Sparkasse München' }),
    /Verweis-Unterfeld/,
    'ein roher String im ref-Unterfeld MUSS jetzt werfen (A56)');
  // Auch beim Aktualisieren — der zweite Schreibweg, sonst deckt der Wächter nur die Hälfte.
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Sparkasse München' } });
  assert.throws(
    () => V.listenEintragAktualisieren('finance', 'accounts', 0, { institution: 'noch ein roher Name' }),
    /Verweis-Unterfeld/,
    'auch -Aktualisieren muss werfen');
  // POSITIVKONTROLLE: die gültigen Formen gehen durch — der Wächter wirft nicht immer.
  const inst = V.institutionHinzufuegen({ name: 'Sparkasse München', art: 'bank' });
  assert.doesNotThrow(() => V.listenEintragHinzufuegen('finance', 'accounts', { institution: { ref: inst } }),
    '{ref} muss durchgehen');
  assert.doesNotThrow(() => V.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Freitext' } }),
    '{override} muss durchgehen');
  assert.doesNotThrow(() => V.listenEintragHinzufuegen('finance', 'accounts', { institution: '' }),
    'leeren (leerer String) muss erlaubt bleiben — sonst wird das Unterfeld unlöschbar');
  // Und ein Nicht-ref-Unterfeld bleibt unberührt: `iban` ist Text, ein roher String ist dort korrekt.
  assert.doesNotThrow(() => V.listenEintragHinzufuegen('finance', 'accounts', { iban: 'DE00 0000' }),
    'Text-Unterfelder tragen weiter rohe Strings — der Wächter gilt nur ref/refMehrfach');
});
