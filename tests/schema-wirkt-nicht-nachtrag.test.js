'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Das Einreich-Schema prüft nichts — Nachtrag 23.08.2026, Zug 2
   ────────────────────────────────────────────────────────────────────────
   Anlass: `tools/pruefstoff-betriebsuebergabe-messen.js`, ZUG 4 (Prüfstoff-Nachtrag,
   23.08.2026) hatte gezeigt, dass eine erfundene Feld-Eigenschaft (`kardinalitaet`)
   weder verworfen noch gemeldet wird — sie verschwindet still, schon im Erzeuger,
   bevor `validateTemplate`/`importPlanGeprueft` sie je sehen.

   DREI STELLEN, DREI PROBEN-GRUPPEN (Auftrag „Das Einreich-Schema prüft nichts"):
   1. Generator — `normalisiereFeldBefund` meldet jede unbekannte Feld-/Unterfeld-
      Eigenschaft NAMENTLICH (generische Ergänzung zu A351s benannter Liste).
   2. Generator — `baueSubmission` trägt die Meldung nicht-aufzählbar am Paket
      (`paket._angeglichen`), `submissionErzeugen` (UI) zeigt sie, OHNE zu sperren.
   3. Kern — `_templateFeldZuModell` WEIST das Feld ab (Nachtrag 23.08.2026, Auftrag
      „Die automatisierte Modulprüfung schließen", Posten 1 — Produktentscheidung: „es gibt keine Bestandsbündel", die ursprüngliche Fassung dieses
      Auftrags hatte hier noch "melden, nicht sperren" nach Muster A376 gebaut).

   Rot-Beleg-Pflicht (A348 Zug 4): [Rot-Beleg] markiert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');
const { webcrypto } = require('node:crypto');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

/* ══ 1 · Generator meldet, generisch ══════════════════════════════════════ */

test('[Zug2·1] eine erfundene Feld-Eigenschaft wird generisch gemeldet, namentlich', () => {
  const { V } = ladeGenerator();
  const bef = V.normalisiereFeldBefund({ feldname: 'X', feldtyp: 'liste', bereich: 'finance', kardinalitaet: '0..1', unterFelder: [{ feldname: 'Y', feldtyp: 'text' }] });
  const fund = bef.angeglichen.find((a) => a.was === 'kardinalitaet');
  assert.ok(fund, 'die Eigenschaft wird gemeldet');
  assert.match(fund.klartext, /kardinalitaet/, 'der Schluessel steht namentlich in der Meldung');
  assert.equal(fund.von, '0..1');
});

test('[Zug2·1] eine erfundene UNTERFELD-Eigenschaft wird generisch gemeldet, mit Feld- UND Unterfeldname', () => {
  const { V } = ladeGenerator();
  const bef = V.normalisiereFeldBefund({ feldname: 'X', feldtyp: 'liste', bereich: 'finance', unterFelder: [{ feldname: 'Y', feldtyp: 'text', obergrenze: 3 }] });
  const fund = bef.angeglichen.find((a) => a.was === 'obergrenze');
  assert.ok(fund);
  assert.equal(fund.feldname, 'X / Y');
});

test('[Zug2·1·Rot-Beleg] eine bekannte Eigenschaft (z. B. `einheit`) wird NICHT gemeldet', () => {
  const { V } = ladeGenerator();
  const bef = V.normalisiereFeldBefund({ feldname: 'X', feldtyp: 'text', bereich: 'health', einheit: 'mg/dl' });
  assert.equal(bef.angeglichen.length, 0, 'eine bekannte, tatsaechlich kopierte Eigenschaft loest keine Meldung aus');
});

test('[Zug2·1] leere/false/undefined-Werte einer unbekannten Eigenschaft loesen KEINE Meldung aus (keine Angabe, kein Fund)', () => {
  const { V } = ladeGenerator();
  const bef = V.normalisiereFeldBefund({ feldname: 'X', feldtyp: 'text', bereich: 'finance', erfunden: '', erfunden2: false, erfunden3: [] });
  assert.equal(bef.angeglichen.length, 0);
});

/* ══ 2 · Die Meldung reist am Paket mit, nicht-aufzaehlbar ═══════════════════ */

test('[Zug2·2] baueSubmission traegt die Meldung als paket._angeglichen — nicht enumerable, nicht im JSON', () => {
  const { V } = ladeGenerator();
  const paket = V.baueSubmission({ felder: [{ feldname: 'X', feldtyp: 'liste', bereich: 'finance', kardinalitaet: '0..1', unterFelder: [{ feldname: 'Y', feldtyp: 'text' }] }], anbieter: { anbieterName: 'Probe' } });
  assert.ok(Array.isArray(paket._angeglichen) && paket._angeglichen.length === 1, 'die Meldung ist da');
  assert.equal(paket._angeglichen[0].was, 'kardinalitaet');
  assert.ok(!Object.keys(paket).includes('_angeglichen'), 'nicht aufzaehlbar — kein Object.keys-Treffer');
  assert.ok(!JSON.stringify(paket).includes('_angeglichen'), 'JSON.stringify (der Downloadweg) sieht die Meldung nicht');
});

test('[Zug2·2·Rot-Beleg] ohne unbekannte Eigenschaft ist paket._angeglichen eine leere Liste', () => {
  const { V } = ladeGenerator();
  const paket = V.baueSubmission({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'finance', pflicht: true }], anbieter: { anbieterName: 'Probe' } });
  assert.equal(paket._angeglichen.length, 0);
});

test('[Zug2·2] baueSubmissionSigniert reicht dieselbe Meldung durch (der Weg, den ein Skript wie tools/pruefstoff-betriebsuebergabe-messen.js tatsaechlich nimmt)', async () => {
  const { V } = ladeGenerator();
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const paket = await V.baueSubmissionSigniert({
    felder: [{ feldname: 'X', feldtyp: 'liste', bereich: 'finance', kardinalitaet: '0..1', unterFelder: [{ feldname: 'Y', feldtyp: 'text' }] }],
    anbieter: { anbieterName: 'Probe' }, publicKeyJwk: pubJwk,
  }, privJwk);
  assert.equal(paket._angeglichen.length, 1, 'die Meldung ueberlebt das Signieren');
});

/* ══ 3 · Kern weist ab (Nachtrag 23.08.2026, Auftrag „Die automatisierte Modulprüfung
   schließen", Posten 1 — Produktentscheidung: „es gibt keine Bestandsbündel", die
   ursprüngliche „melden, nicht sperren"-Haltung für DIESEN Fall ist aufgehoben) ═══════════ */

// Handgebautes Template, UNTER UMGEHUNG des Erzeugers/`felderAngleichungen` — dieselbe Methode
// wie die ZUG-4-Gegenprobe des Prüfstoff-Nachtrags. Der Erzeuger filtert unbekannte Eigenschaften
// bereits VOR der Signatur (Zug 2.1/2.2 oben) — wer den KERN-Wächter isoliert prüfen will, muss
// ihn also am rohen, nie-normalisierten Template messen, sonst kommt die Zusatzangabe nie an.
async function mitProbeFeld(extraFeld, extraUnterfeld) {
  const { V } = ladeKern();
  const { V: I } = ladeIssuer();
  await V.depotAnlegen('schema-nachtrag-pw!');
  V.akteurSelbstErklaeren('Probe');
  const feld = { feldname: 'Kardinalitaets-Probe', feldtyp: 'liste', bereich: 'finance', gruppe: 'G1',
    unterFelder: [{ feldname: 'Wert', feldtyp: 'text' }] };
  if (extraFeld) Object.assign(feld, extraFeld);
  if (extraUnterfeld) Object.assign(feld.unterFelder[0], extraUnterfeld);
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const template = { felder: [feld] };
  const signKey = await I._jwsImportSignKey(privJwk);
  const templateJws = await I._signJWS(template, signKey, {});
  const d = { anbieterId: 'institution/schluessel-probe-de', anbieterName: 'Schluessel-Probe', anbieterTyp: 'kammer',
    publicKeyJwk: pubJwk, template, templateJws };
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, template: d.template,
    issuanceDate: '2026-08-01T00:00:00Z', expirationDate: '2027-08-01T00:00:00Z',
  });
  const taSign = await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const bundle = I.baueAuslieferungsBundle(await I.stelleProviderCredentialAus(vc, taSign), d.templateJws);
  const teil = V._importEingabeAufteilen(JSON.stringify(bundle));
  const plan = await V.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: '2026-08-23T00:00:00Z', ankerJwk: SENTINEL_PUBLIC_JWK }));
  return { V, plan };
}

test('[Zug2·3·Rot-Beleg] eine roh (nicht ueber den Erzeuger) mitgefuehrte unbekannte Feld-Eigenschaft weist das Feld VOLLSTAENDIG ab', async () => {
  const { plan } = await mitProbeFeld({ kardinalitaet: '0..1' });
  assert.equal(plan.ungueltig, false, 'nicht der GANZE Import faellt — nur dieses eine Feld');
  assert.equal(plan.feldDefinitionen.length, 0, 'keine Definition entsteht');
  const eintrag = plan.verworfeneFelder.find((v) => v.grund === 'unbekannte-eigenschaft');
  assert.ok(eintrag, 'ein echter Verwerfungs-Eintrag steht in verworfeneFelder: ' + JSON.stringify(plan.verworfeneFelder));
  assert.match(eintrag.name, /kardinalitaet/, 'der Schluessel steht namentlich im Verwerfungsgrund');
});

test('[Zug2·3] eine unbekannte UNTERFELD-Eigenschaft weist das Feld ebenfalls ab, mit Feld/Unterfeld-Pfad im Namen', async () => {
  const { plan } = await mitProbeFeld(null, { obergrenze: 3 });
  assert.equal(plan.feldDefinitionen.length, 0);
  const eintrag = plan.verworfeneFelder.find((v) => v.grund === 'unbekannte-eigenschaft');
  assert.ok(eintrag && eintrag.name.includes('Wert.obergrenze'), JSON.stringify(plan.verworfeneFelder));
});

test('[Zug2·3·Gegenprobe] ohne unbekannte Eigenschaft entsteht die Definition ganz normal', async () => {
  const { plan } = await mitProbeFeld();
  assert.equal(plan.feldDefinitionen.length, 1);
  assert.equal((plan.verworfeneFelder || []).length, 0);
});

// `provenienzPflichtig` ist KEIN unbekannter Schlüssel — er ist schema-legal, nur heute nicht
// verdrahtet (A345), und bereits EIGENSTÄNDIG in `tools/schema-wirkung-pruefen.js` als bekannter
// Fall geführt. Er darf darum weder gemeldet noch abgewiesen werden — sonst träfe die Verschärfung
// aus Posten 1 einen Fall, den sie nicht meint.
test('[Zug2·3·Gegenprobe] `provenienzPflichtig` wird NICHT abgewiesen — schema-legal, eigenständig in schema-wirkung-pruefen.js geführt', async () => {
  const { plan } = await mitProbeFeld({ provenienzPflichtig: false });
  assert.equal(plan.feldDefinitionen.length, 1);
  assert.equal((plan.verworfeneFelder || []).length, 0);
});

test('[Zug2·3] die zwei bekannten Konstanten fuer Feld/Unterfeld sind exportiert und disjunkt zu den erfundenen Namen', () => {
  const { V } = ladeKern();
  assert.ok(V._TEMPLATE_FELD_BEKANNTE_SCHLUESSEL.has('einheit'));
  assert.ok(!V._TEMPLATE_FELD_BEKANNTE_SCHLUESSEL.has('kardinalitaet'));
  assert.ok(V._TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL.has('sensibel'));
  assert.ok(!V._TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL.has('obergrenze'));
});

/* U2-ADR-246, Auflage 2 (04.09.2026): die beiden Proben oben pruefen nur EINZELNE
   Mitglieder — ein neuer, unbedacht ergaenzter Schluessel faellt ihnen nie auf, weil kein Test
   das GANZE Set kennt. Diese Probe haelt den vollstaendigen, sortierten Inhalt fest: wer einen
   Schluessel hinzufuegt (wie hier `situation`, U2-ADR-246) oder entfernt, muss diese Liste
   ausdruecklich mitziehen — kein stilles Weiten des Namensraums mehr. */
test('[U2-ADR-246] _TEMPLATE_FELD_BEKANNTE_SCHLUESSEL — der vollstaendige Inhalt, nicht nur Stichproben', () => {
  const { V } = ladeKern();
  // U2-ADR-253 Teil 2 (04.09.2026): entitaet/rolle/verweisZweck ergaenzt — Personen-/
  // Institutions-Verweis als Geruest-Faehigkeit, Struktur ja (entitaet geschlossen),
  // Vokabular nein (rolle/verweisZweck offen).
  // U2-ADR-253 Teil 3 (04.09.2026): der gebuendelte Rest (16 Schluessel, mechanisch,
  // gemessene Formen, keine eigene Design-Frage) — beispiel/ebene/eingabeTyp/inputmode/
  // vorschlaege/keineZukunft/datumJahrMin/gueltigkeitVorschlag/fristRegel/codeListe/art/
  // verweisKontextFeld/zusammenfassungFelder/mitGeburt/
  // unterdrueckeInZusammenfassungWennGesetzt/sichtbarWenn.
  assert.deepEqual([...V._TEMPLATE_FELD_BEKANNTE_SCHLUESSEL].sort(), [
    '_vorlageVersion', 'art', 'beispiel', 'bereich', 'codeListe', 'codeSystem', 'codeWerte',
    'datumJahrMin', 'ebene', 'einheit', 'eingabeTyp', 'entitaet', 'feldname', 'feldtyp',
    'fristRegel', 'gruppe', 'gueltigkeitVorschlag', 'hilfetext', 'inputmode', 'keineZukunft',
    'marken', 'mehrzeilig', 'mitGeburt', 'mitMessdatum', 'pflicht', 'pruefIntervallMonate',
    'provenienzPflichtig', 'referenzbereich', 'rolle', 'sensibel', 'sichtbarWenn', 'situation',
    'unterFelder', 'unterdrueckeInZusammenfassungWennGesetzt', 'verborgenWenn',
    'verweisKontextFeld', 'verweisZweck', 'vorschlaege', 'warnWennJa', 'zusammenfassungFelder',
    'ziel',   // Nachtrag 16.09.2026: externe Adresse eines verweis-Felds, vorher am Tor unbekannt
  ].sort());
});
test('[U2-ADR-246] _TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL — der vollstaendige Inhalt', () => {
  const { V } = ladeKern();
  // U2-ADR-253 Teil 2/3 (04.09.2026): wörtlicher Spiegel der Feld-Ebene oben.
  assert.deepEqual([...V._TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL].sort(), [
    'art', 'beispiel', 'codeListe', 'codeWerte', 'datumJahrMin', 'ebene', 'eingabeTyp',
    'entitaet', 'feldname', 'feldtyp', 'fristRegel', 'gueltigkeitVorschlag', 'inputmode',
    'keineZukunft', 'mitGeburt', 'pflicht', 'rolle', 'sensibel', 'sichtbarWenn',
    'unterdrueckeInZusammenfassungWennGesetzt', 'verweisKontextFeld', 'verweisZweck',
    'vorschlaege', 'zusammenfassungFelder',
  ].sort());
});
