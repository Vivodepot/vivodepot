'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Teil A · Die vier Häufungen sind Eigenschaften, nicht Namen im Code
   ────────────────────────────────────────────────────────────────────────
   Nachtrag „Die vier Häufungen" (17.08.2026). Glied 4 hatte gemessen: 31
   echte Verzweigungen hängen an einer bestimmten Bereichs-ID, geballt in
   vier Häufungen. Solange sie stehen, sitzen sechs erweiterbare Register
   auf einer festen Bereichsliste.

   DER AUFTRAG VERLANGT EINEN ROT-BELEG JE HÄUFUNG, NICHT EINEN
   STELLVERTRETEND. Darum vier Blöcke, und jeder prüft dieselben vier Dinge:
   ein Bereich MIT der Eigenschaft zeigt das Verhalten · ein Bereich OHNE sie
   zeigt es nicht · ein von außen eingebrachter Bereich mit der Eigenschaft
   verhält sich wie ein eingebauter · die zwölf eingebauten Bereiche
   verhalten sich unverändert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Kommentare maskieren, bevor am Quelltext gemessen wird. Ohne das schlug die
   Probe zu Häufung 2 an ihrem EIGENEN Beleg an: der Kommentar über der
   Bereichsdefinition zitiert `sektorId === 'identitaet'`, um zu erklären, was dort
   nicht mehr steht. Ein Anker, der Erklärungen für Code hält, misst den Text und
   nicht das Verhalten. */
function ohneKommentare(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map(z => z.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
}

/* ══ Die Form selbst: geschlossene Wertelisten ══════════════════════════ */

test('[Teil A·Form] eine unbekannte Eigenschaft wird NAMENTLICH verworfen und verwirft nicht den Bereich', () => {
  const { V } = ladeKern();
  const m = V.bereichMerkmalePruefen(['vorsorgeRegal', 'heimlichesVerhalten', 'bedarfsrechnung']);
  assert.deepEqual(m.merkmale, ['vorsorgeRegal', 'bedarfsrechnung'], 'die bekannten bleiben');
  assert.deepEqual(m.verworfen, ['heimlichesVerhalten'],
    'das unbekannte wird BENANNT — ein Modul mit einem Tippfehler sähe sonst aus wie eines, das die Eigenschaft nicht wollte');
  const r = V.bereichRollenPruefen({ instrumenteListe: 'x', irgendwasAnderes: 'y' });
  assert.deepEqual(Object.keys(r.rollen), ['instrumenteListe']);
  assert.deepEqual(r.verworfen, ['irgendwasAnderes']);
});

test('[Teil A·Form·Rot] ein Bereich ohne jede Eigenschaft kann nichts — und wirft nicht', () => {
  const { V } = ladeKern();
  for (const m of V.BEREICH_MERKMALE_ERLAUBT) {
    assert.equal(V.bereichKann('housing', m), false, 'housing kann ' + m + ' nicht');
    assert.equal(V.bereichKann('gibt-es-nicht', m), false, 'ein unbekannter Bereich kann nichts');
  }
  assert.equal(V.bereichRolle('housing', 'instrumenteListe'), null);
  assert.equal(V.bereichFeldHatRolle('housing', 'irgendein_feld', 'ankerNameFelder'), false);
});

test('[Teil A] die zwölf eingebauten Bereiche tragen genau die vier Häufungen — und sonst nichts', () => {
  const { V } = ladeKern();
  const mit = V.SEKTOREN.filter(s => (s.merkmale || []).length).map(s => s.id);
  assert.deepEqual(mit.sort(), ['advanceCare', 'emergencyPreparedness', 'identity', 'people'],
    'genau die vier gemessenen Häufungen, kein fünfter Bereich hat still eine Eigenschaft bekommen');
  // Jede gesetzte Eigenschaft ist erlaubt — sonst wäre sie im Produkt wirkungslos.
  for (const s of V.SEKTOREN) {
    const m = V.bereichMerkmalePruefen(s.merkmale);
    assert.deepEqual(m.verworfen, [], s.id + ' trägt kein unbekanntes Merkmal');
    const r = V.bereichRollenPruefen(s.rollen);
    assert.deepEqual(r.verworfen, [], s.id + ' trägt keine unbekannte Rolle');
  }
});

/* ══ Häufung 1 · krisenvorsorge → bedarfsrechnung ═══════════════════════ */

test('[Häufung 1·Rot] die Bedarfsrechnung hängt am Merkmal, nicht am Namen', () => {
  const { V } = ladeKern();
  assert.equal(V.bereichKann('emergencyPreparedness', 'bedarfsrechnung'), true, 'mit Merkmal');
  assert.equal(V.bereichKann('housing', 'bedarfsrechnung'), false, 'ohne Merkmal');
  // Der Beleg am Code selbst: die Verzweigung nennt den Namen nicht mehr.
  const { src } = ladeKern();
  assert.ok(/bereichKann\(sektorId, 'bedarfsrechnung'\)/.test(src), 'die Stelle fragt die Eigenschaft');
  assert.ok(!/sektorId === 'emergencyPreparedness'/.test(ohneKommentare(src)), 'und nicht mehr den Namen');
});

/* ══ Häufung 2 · identity → ankerIdentitaet + zwei Rollen ═════════════ */

test('[Häufung 2·Rot] Ankername und Familienstand hängen an Rollen, nicht am Bereichsnamen', () => {
  const { V, src } = ladeKern();
  assert.deepEqual(V.bereichRolle('identity', 'ankerNameFelder'), ['givenName', 'familyName', 'secondLastName', 'displayFamilyNameFirst']);   // A460 (22.08.2026) + U2-ADR-256 (04.09.2026)
  assert.equal(V.bereichRolle('identity', 'familienstandFeld'), 'maritalStatus');
  assert.equal(V.bereichFeldHatRolle('identity', 'givenName', 'ankerNameFelder'), true, 'mit Rolle');
  assert.equal(V.bereichFeldHatRolle('identity', 'bloodType', 'ankerNameFelder'), false, 'ein anderes Feld nicht');
  assert.equal(V.bereichFeldHatRolle('housing', 'givenName', 'ankerNameFelder'), false,
    'derselbe Feldname in einem Bereich OHNE die Rolle trägt nicht — der Fall, den ein blosser Feldname-Vergleich verwechselt hätte');
  const code = ohneKommentare(src);
  assert.ok(!/sektorId === 'identity'/.test(code), 'keine Namensprüfung mehr im Kern');
  assert.ok(!/stempelNs === 'identity'/.test(code), 'auch nicht im Inline-Pfad');
});

/* ══ Häufung 3 · people → personenRegister + vier Rollen ════════ */

test('[Häufung 3·Rot] Personenregister und Schutzbefohlene hängen an Merkmal und Rollen', () => {
  const { V, src } = ladeKern();
  assert.equal(V.bereichKann('people', 'personenRegister'), true);
  assert.equal(V.bereichKann('health', 'personenRegister'), false);
  assert.equal(V.bereichRolle('people', 'personenListe'), 'menschen');
  assert.equal(V.bereichRolle('people', 'schutzbefohleneListe'), 'childrenAndDependants');
  assert.equal(V.bereichRolle('people', 'personenSektion'), 'menschen-liste');
  assert.equal(V.bereichRolle('people', 'schutzbefohleneSektion'), 'kinder-sek');
  assert.ok(!/'people' &&/.test(ohneKommentare(src)), 'keine Namensprüfung mehr');
  // Vorbedingung: die Rollen zeigen auf Sektionen, die es wirklich gibt.
  const s = V.SEKTOR_BY_ID['people'];
  const sektionsIds = s.sektionen.map(x => x.id);
  assert.ok(sektionsIds.includes('menschen-liste'), 'personenSektion existiert wirklich');
  assert.ok(sektionsIds.includes('kinder-sek'), 'schutzbefohleneSektion existiert wirklich');
});

/* ══ Häufung 4 · advanceCare → vorsorgeRegal + instrumenteListe ════════════ */

test('[Häufung 4·Rot] Regal und Instrumentenliste hängen an Merkmal und Rolle', () => {
  const { V, src } = ladeKern();
  assert.equal(V.bereichKann('advanceCare', 'vorsorgeRegal'), true);
  assert.equal(V.bereichKann('finance', 'vorsorgeRegal'), false);
  assert.equal(V.bereichRolle('advanceCare', 'instrumenteListe'), 'provisionInstruments');
  assert.equal(V.bereichFeldHatRolle('advanceCare', 'provisionInstruments', 'instrumenteListe'), true);
  assert.equal(V.bereichFeldHatRolle('finance', 'provisionInstruments', 'instrumenteListe'), false);
  const code4 = ohneKommentare(src);
  assert.ok(!/sektorId === 'advanceCare'/.test(code4), 'keine Namensprüfung mehr');
  assert.ok(!/sektorId !== 'advanceCare'/.test(code4), 'auch nicht die verneinte');
});

/* ══ Der Kern der Sache: ein von AUSSEN eingebrachter Bereich ═══════════ */

test('[Teil A] ein angedockter Bereich mit derselben Eigenschaft verhält sich wie ein eingebauter', () => {
  const { V } = ladeKern();
  // Kein Modul-Einlassweg (der ist Glied 5) — geprüft wird die Leseregel, die ihn tragen wird:
  // sie liest aus SEKTOR_BY_ID und kennt kein einziges Bereichs-Literal.
  const erfunden = { id: 'ein-fremder-bereich', label: 'Fremd', merkmale: ['bedarfsrechnung', 'vorsorgeRegal'],
    rollen: { instrumenteListe: 'fremde_instrumente', ankerNameFelder: ['rufname'] } };
  const m = V.bereichMerkmalePruefen(erfunden.merkmale);
  assert.deepEqual(m.merkmale, ['bedarfsrechnung', 'vorsorgeRegal'], 'seine Merkmale werden anerkannt');
  assert.deepEqual(m.verworfen, []);
  const r = V.bereichRollenPruefen(erfunden.rollen);
  assert.equal(r.rollen.instrumenteListe, 'fremde_instrumente',
    'seine Instrumentenliste heisst anders — und genau das muss die Form aushalten');
  assert.deepEqual(r.rollen.ankerNameFelder, ['rufname']);
  assert.deepEqual(r.verworfen, []);
});

test('[Teil A·Gegenprobe] ein angedockter Bereich, der heimlich Verhalten mitbringt, kommt damit nicht durch', () => {
  const { V } = ladeKern();
  const m = V.bereichMerkmalePruefen(['darfAllesLesen', 'exportiertOhneFrage']);
  assert.deepEqual(m.merkmale, [], 'nichts davon wirkt');
  assert.deepEqual(m.verworfen, ['darfAllesLesen', 'exportiertOhneFrage'], 'beide namentlich verworfen');
});

/* ══ Die eine, die BEWUSST stehen bleibt ═══════════════════════════════ */

test('[Teil A] die Warnung an krypto_seed_ort bleibt eine namentliche Stelle — mit Grund', () => {
  const { src } = ladeKern();
  assert.ok(/sektorId === 'administration' && feld\.id === 'seedPhraseStorageLocation'/.test(src),
    'sie steht noch da');
  assert.ok(/als Ausnahme genau EINES Feldes und nicht als Muster/.test(src),
    'und der Grund steht daneben: sie zu einer Bereichs-Eigenschaft zu machen hiesse, aus der Ausnahme ein Muster zu machen');
});
