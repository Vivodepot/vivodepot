'use strict';
/* ════════════════════════════════════════════════════════════════════════
   K3 · Verständigung und Unterstützung + Freitexte auf der Notfallkarte (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Neue Sektion advanceCare#communication-support mit fünf Feldern; „Besondere Situation“ und
   „Hinweis für Rettungskräfte“ auf die Karte (gekürzt auf 160 Zeichen, entschieden
   27.09.2026) und ungekürzt ins Blatt Krankenhaus. Sensibel ist nur doNotInform
   (communicationSupport und whatHelpsMe sind für Helfende gedacht). doNotInform steht NIE auf der
   Karte und NIE in der Angehörigen-Sicht; whatHelpsMe nie auf der Karte (Länge).
   Muster: tests/ehegatten-notvertretung.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'k3-verstaendigung-pw-2026';
const LANG = 'Ich habe eine seltene Stoffwechselerkrankung und darf bei Bewusstlosigkeit keine Glukose-Infusion bekommen, '
  + 'bitte zuerst den Notfallausweis in der Brieftasche lesen und die Ärztin in der Uniklinik anrufen, sie kennt mich seit Jahren.';

async function befuellt(V, { mitGeheim = true } = {}) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Ayse Beispiel');
  V.sektorFeldSetzen('advanceCare', 'communicationLanguage', 'Türkisch; Deutsch nur einfach');
  V.sektorFeldSetzen('advanceCare', 'communicationSupport', ['dolmetschen', 'leichte-sprache']);
  V.sektorFeldSetzen('advanceCare', 'supportPerson', { ref: V.personSicherstellen('Deniz Beispiel') });
  V.sektorFeldSetzen('advanceCare', 'whatHelpsMe', 'Langsam und in kurzen Sätzen sprechen.');
  if (mitGeheim) V.sektorFeldSetzen('advanceCare', 'doNotInform', 'GEHEIM-Onkel-Beispiel');
  V.sektorFeldSetzen('emergencyPreparedness', 'specialSituation', LANG);
  V.sektorFeldSetzen('emergencyPreparedness', 'noteForEmergencyResponders', 'Hund in der Wohnung.');
}
const karte = (V) => V.notfallKernModell().map((z) => z.label + ': ' + z.wert).join(' | ');

test('[K3] die fünf Felder überleben Speichern und Laden', async () => {
  const { V } = ladeKern();
  await befuellt(V);
  const datei = await V.depotSerialisieren();
  const { V: W } = ladeKern();
  await W.depotLaden(JSON.parse(JSON.stringify(datei)), PW);
  const ac = W.getData().sektoren.advanceCare;
  assert.equal(ac.communicationLanguage, 'Türkisch; Deutsch nur einfach');
  assert.deepEqual(ac.communicationSupport, ['dolmetschen', 'leichte-sprache']);
  assert.equal(ac.whatHelpsMe, 'Langsam und in kurzen Sätzen sprechen.');
  assert.equal(ac.doNotInform, 'GEHEIM-Onkel-Beispiel');
});

test('[K3·Notfallkarte] Sprache, Unterstützung, Begleitperson als Name und die zwei Freitexte stehen auf der Karte', async () => {
  const { V } = ladeKern();
  await befuellt(V);
  const text = karte(V);
  assert.match(text, /Türkisch; Deutsch nur einfach/);
  assert.match(text, /Dolmetschen/);
  assert.match(text, /Deniz Beispiel/, 'die Begleitperson erscheint als Name, nicht als Kennung');
  assert.match(text, /Hund in der Wohnung\./);
});

test('[K3·Notfallkarte] ein langer Freitext wird am Wortende auf 160 Zeichen gekürzt und verweist auf die Datei', async () => {
  const { V } = ladeKern();
  await befuellt(V);
  const zeile = V.notfallKernModell().find((z) => String(z.wert).startsWith('Ich habe eine seltene'));
  assert.ok(zeile, 'die Besondere Situation steht auf der Karte');
  assert.ok(zeile.wert.endsWith(V.STRINGS.notfallKarteVollstaendigInDatei), 'der Verweis auf die Datei steht am Ende');
  const kern = zeile.wert.slice(0, zeile.wert.indexOf(' … '));
  assert.ok(kern.length <= 160, 'höchstens 160 Zeichen vor dem Verweis (' + kern.length + ')');
  assert.ok(LANG.startsWith(kern) && LANG[kern.length] === ' ', 'geschnitten am Wortende');
});

test('[K3·Notfallkarte·Gegenprobe] ein kurzer Freitext bleibt ungekürzt, ein leerer erscheint nicht', async () => {
  const { V } = ladeKern();
  await befuellt(V);
  V.sektorFeldSetzen('emergencyPreparedness', 'specialSituation', '');
  const text = karte(V);
  assert.doesNotMatch(text, /vollständig in der Datei/);
  assert.match(text, /Hund in der Wohnung\.(?! …)/);
});

test('[K3·Notfallkarte·Rot-Beweis] „Wer nicht informiert werden soll“ und „Was mir hilft“ stehen nie auf der Karte', async () => {
  const { V } = ladeKern();
  await befuellt(V);
  const text = karte(V);
  assert.doesNotMatch(text, /GEHEIM-Onkel-Beispiel/);
  assert.doesNotMatch(text, /Langsam und in kurzen Sätzen/);
  assert.equal(V.NOTFALL_KERN_FELDER.some((e) => e.feld === 'doNotInform' || e.feld === 'whatHelpsMe'), false);
});

test('[K3·Angehörige] das Blatt Krankenhaus trägt die vier Verständigungs-Felder und die zwei Freitexte — doNotInform nie', () => {
  const { V } = ladeKern();
  const blatt = V.angehoerigenSituationenAlle().find((s) => s.id === 'krankenhausakut');
  const auf = blatt.bloecke.flatMap((b) => b.eintraege).map((e) => e.quelle + '.' + e.feld);
  for (const k of ['advanceCare.communicationLanguage', 'advanceCare.communicationSupport', 'advanceCare.supportPerson',
    'advanceCare.whatHelpsMe', 'emergencyPreparedness.specialSituation', 'emergencyPreparedness.noteForEmergencyResponders']) {
    assert.ok(auf.includes(k), k + ' steht auf dem Blatt Krankenhaus');
    assert.ok(V._ANG_CACHE_ERLAUBT.has('krankenhausakut|' + k.replace('.', '|')), k + ' ist für die Angehörigen-Sicht freigegeben');
  }
  assert.equal(auf.includes('advanceCare.doNotInform'), false);
  assert.equal([...V._ANG_CACHE_ERLAUBT].some((x) => x.endsWith('|doNotInform')), false, 'doNotInform ist nirgends freigegeben');
});

test('[K3·Sensibel] nur doNotInform ist sensibel — communicationSupport und whatHelpsMe nicht (Entscheidung 26.09.2026)', () => {
  const { V } = ladeKern();
  const sensibel = (f) => !!(V.feldDefFuer('advanceCare', f) || {}).sensibel;
  assert.equal(sensibel('doNotInform'), true);
  for (const f of ['communicationLanguage', 'communicationSupport', 'supportPerson', 'whatHelpsMe']) assert.equal(sensibel(f), false, f);
});

test('[K3·jedes Depot gleich] im Sub-Depot gelten dieselben Felder und dieselbe Karte (U2-ADR-432)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-k3-pw-2026');
  V.akteurSelbstErklaeren('Anna Beispiel');
  const e = await V.subDepotAnlegen({ vorname: 'Ayse', nachname: 'Beispiel', vertretungsGrundlage: 'vorsorge' }, 'sub-k3-pw-2026');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'sub-k3-pw-2026');
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Anna Beispiel');
  V.sektorFeldSetzen('advanceCare', 'communicationLanguage', 'Kurdisch');
  V.sektorFeldSetzen('advanceCare', 'doNotInform', 'GEHEIM-Sub');
  assert.match(karte(V), /Kurdisch/);
  assert.doesNotMatch(karte(V), /GEHEIM-Sub/);
  await V.subKontextVerlassen();
});

test('[K3·Lese-App] die Notfallkarte der Lese-App zeigt dieselben Zeilen wie der Kern, kürzt gleich und zeigt doNotInform nie', async () => {
  const { V } = ladeKern();
  await befuellt(V);
  const kernZeilen = V.notfallKernModell().map((z) => z.wert);
  const { ladeLesen } = require('./load-lesen.js');
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  L.setData({ schemaVersion: V.getData().schemaVersion, sektoren: V.getData().sektoren, menschen: V.getData().menschen });
  const leseZeilen = L.notfallKernModell().map((z) => z.wert);
  for (const w of kernZeilen.filter((x) => /Türkisch|Dolmetschen|Deniz|Hund|seltene/.test(x))) {
    assert.ok(leseZeilen.includes(w), 'die Lese-App zeigt „' + String(w).slice(0, 40) + '“ wie der Kern');
  }
  assert.equal(leseZeilen.some((w) => /GEHEIM/.test(String(w))), false);
});
