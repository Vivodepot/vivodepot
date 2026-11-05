'use strict';
/* Wächter am Zuschnitt: die Freigabe in der Datei der Angehörigen (31.10.2026, Befund UX-NOTFALLPAKET-OHNE-MEDIKAMENTE, HOCH)
   Jede Datei an einen Empfängerkreis nennt in `empfaengerFreigabe` genau die geschützten Angaben, die sie enthält, und in
   `empfaengerZurueckgehalten` nur abgewählte, die nicht in ihr stehen. Keine der beiden Listen nennt eine Angabe, deren Dasein
   schon ihr Inhalt ist (Schwangerschaft, Weglaufgefährdung samt Termin und Umständen): eine zurückgenommene Schwangerschaft
   hinterlässt weder Adresse noch Satz (Antwort Rechtsraum und Krypto vom 30.10.2026). Geprüft wird an der entschlüsselten
   Nutzlast und an der Lese-App. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'freigabe-zuschnitt-inhaberin';
const PW_FACH = 'freigabe-zuschnitt-fach-pw';
const kopie = (o) => JSON.parse(JSON.stringify(o));
const DASEIN = ['pregnancy', 'pregnancyEstimatedDueDate', 'wanderingRisk', 'wanderingRiskDetails'];

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erika Beispiel');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'MARKER-ALLERGIE', code: '' }]);
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'MARKER-MEDIKAMENT', code: '' }]);
  V.sektorFeldSetzen('health', 'pregnancy', 'ja');
  V.sektorFeldSetzen('health', 'pregnancyEstimatedDueDate', '2027-03-01');
  V.sektorFeldSetzen('health', 'wanderingRisk', 'ja');
  V.sektorFeldSetzen('health', 'wanderingRiskDetails', 'MARKER-UMSTAENDE');
  return V;
}
async function kreis(V, bausteine, ausnahmen) {
  await V.empfaengerkreisSetzen({ name: 'Sabine', bausteine, ausnahmen: ausnahmen || [] });
  return V.empfaengerkreiseListe().find((k) => k.name === 'Sabine');
}
async function nutzlast(V, k) {
  const datei = await V.empfaengerDateiErzeugen(k, PW_FACH);
  const L = ladeLesen().V;
  return { L, offen: await L.leseDepotUmschlag(kopie(datei.umschlag), PW_FACH) };
}

// Die Regel als Prüfung, damit der Rot-Beweis dieselbe Prüfung kippen kann.
function freigabeFehler(V, subset) {
  const fehler = [];
  const frei = Array.isArray(subset.empfaengerFreigabe) ? subset.empfaengerFreigabe : null;
  if (!frei) return ['keine Liste empfaengerFreigabe'];
  const zurueck = Array.isArray(subset.empfaengerZurueckgehalten) ? subset.empfaengerZurueckgehalten : [];
  const teile = (a) => { const i = a.indexOf('.'); return [a.slice(0, i), a.slice(i + 1)]; };
  for (const a of frei) {
    const [sek, feld] = teile(a);
    const traeger = feld.startsWith('liste:') ? feld.split(':')[1] : feld;   // ein Unterfeld hängt an seiner Liste
    if (!(subset.sektoren[sek] && Object.prototype.hasOwnProperty.call(subset.sektoren[sek], traeger))) fehler.push('freigegeben ohne Wert: ' + a);
  }
  for (const sek of Object.keys(subset.sektoren)) {
    for (const feld of Object.keys(subset.sektoren[sek])) {
      if (V.feldIstSensibel(V.feldDefFuer(sek, feld) || { id: feld }, sek) && !V.feldDaseinIstInhalt(sek, feld) && frei.indexOf(sek + '.' + feld) < 0) fehler.push('geschützt in der Datei, nicht freigegeben: ' + sek + '.' + feld);
    }
  }
  for (const a of zurueck) {
    const [sek, feld] = teile(a);
    if (subset.sektoren[sek] && Object.prototype.hasOwnProperty.call(subset.sektoren[sek], feld)) fehler.push('abgewählt, aber in der Datei: ' + a);
  }
  for (const a of frei.concat(zurueck)) {
    const [sek, feld] = teile(a);
    if (V.feldDaseinIstInhalt(sek, feld)) fehler.push('Dasein ist Inhalt, steht in einer Liste: ' + a);
  }
  return fehler;
}

test('[Freigabe·Dasein] Schwangerschaft und Weglaufgefährdung samt Termin und Umständen gelten als Angaben, deren Dasein ihr Inhalt ist', async () => {
  const V = await depot();
  for (const f of DASEIN) assert.equal(V.feldDaseinIstInhalt('health', f), true, f);
  for (const f of ['bloodType', 'allergiesMedicationFoodOther', 'medicationOngoing']) assert.equal(V.feldDaseinIstInhalt('health', f), false, f);
  // Die Klasse: jede Auswahl mit genau einem Wert in jedem Bereich, ohne Aufzählung.
  for (const b of V.bereicheAlle()) {
    for (const s of (b.sektionen || [])) {
      for (const f of (s.felder || [])) {
        if (f.typ === 'auswahl' && Array.isArray(f.optionen) && f.optionen.length === 1) assert.equal(V.feldDaseinIstInhalt(b.id, f.id), true, b.id + '.' + f.id);
      }
    }
  }
});

test('[Freigabe·Klasse] jede Datei an einen Kreis nennt genau ihre geschützten Angaben — Notfall, Pflege, Bestattung, Bereich, weit', async () => {
  const V = await depot();
  for (const [bausteine, ausnahmen] of [[['notfall'], []], [['notfall'], ['health.allergiesMedicationFoodOther']], [['pflege'], []],
    [['bestattung'], []], [['bereich:health'], []], [['erbe'], []], [['notfall', 'bereich:health'], ['health.medicationOngoing']]]) {
    const k = await kreis(V, bausteine, ausnahmen);
    const { offen } = await nutzlast(V, k);
    assert.deepEqual(freigabeFehler(V, offen), [], bausteine.join('+') + ' / ' + ausnahmen.join(','));
  }
});

test('[Freigabe·Rot-Beweis] die Prüfung schlägt an, wenn eine Liste lügt', async () => {
  const V = await depot();
  const { offen } = await nutzlast(V, await kreis(V, ['notfall'], []));
  assert.deepEqual(freigabeFehler(V, offen), []);
  const ohneAllergie = kopie(offen); ohneAllergie.empfaengerFreigabe = ohneAllergie.empfaengerFreigabe.filter((a) => a !== 'health.allergiesMedicationFoodOther');
  assert.ok(freigabeFehler(V, ohneAllergie).some((f) => /nicht freigegeben/.test(f)));
  const mitSchwangerschaft = kopie(offen); mitSchwangerschaft.empfaengerZurueckgehalten = ['health.pregnancy'];
  assert.ok(freigabeFehler(V, mitSchwangerschaft).some((f) => /Dasein ist Inhalt/.test(f)));
  const ohneListe = kopie(offen); delete ohneListe.empfaengerFreigabe;
  assert.deepEqual(freigabeFehler(V, ohneListe), ['keine Liste empfaengerFreigabe']);
});

test('[Freigabe·Sensibel-einzeln] eine zurückgenommene Schwangerschaft hinterlässt weder Adresse noch Satz', async () => {
  const V = await depot();
  for (const bausteine of [['notfall'], ['erbe']]) {
    const { L, offen } = await nutzlast(V, await kreis(V, bausteine, DASEIN.map((f) => 'health.' + f)));
    // Werte und Listen; die mitgegebenen Beschriftungen (Textsatz, Kataloge) nennen jedes Feld und sagen nichts über die Person.
    const text = JSON.stringify([offen.sektoren, offen.situationen, offen.empfaengerFreigabe, offen.empfaengerZurueckgehalten || []]);
    for (const f of DASEIN) assert.ok(!text.includes(f), bausteine + ': ' + f + ' steht nicht in der Datei');
    assert.ok(!text.includes('MARKER-UMSTAENDE'), bausteine + ': die Umstände stehen nicht in der Datei');
    L.setData(await L._depotUebernehmenGeprueft(offen));
    const html = String(L.sektorHTML('health'));
    assert.ok(!html.includes(L.STRINGS.freigabeNicht) && !html.includes('nicht freigegeben'), bausteine + ': kein Satz zu einer zurückgenommenen Angabe dieser Art');
  }
});

test('[Freigabe·alt] eine Datei ohne die Listen liest sich wie bisher', async () => {
  const V = await depot();
  const { L, offen } = await nutzlast(V, await kreis(V, ['notfall'], []));
  const alt = kopie(offen); delete alt.empfaengerFreigabe; delete alt.empfaengerZurueckgehalten;
  L.setData(await L._depotUebernehmenGeprueft(alt));
  const html = String(L.sektorHTML('health'));
  assert.ok(!html.includes('MARKER-ALLERGIE'), 'ohne Freigabe kein Wert');
  assert.ok(html.includes(L.STRINGS.zurueckgehaltenVorhanden), 'der alte Satz');
});

test('[Freigabe·Bereich] ein Bereichsbaustein filtert weiter: die geschützte Angabe ist weder in der Datei noch freigegeben', async () => {
  const V = await depot();
  const { offen } = await nutzlast(V, await kreis(V, ['bereich:health'], []));
  assert.ok(!JSON.stringify(offen.sektoren).includes('MARKER-ALLERGIE'));
  assert.ok(!offen.empfaengerFreigabe.includes('health.allergiesMedicationFoodOther'));
});

test('[Freigabe·Sub-Depot] im gepflegten Depot einer anderen Person steht der Satz ohne Namen', async () => {
  const V = await depot();
  const k = await kreis(V, ['notfall'], ['health.allergiesMedicationFoodOther']);
  const gepflegt = V.empfaengerZuschnittModell(k, Object.assign({}, V.getData(), { verwaltungsTyp: 'verwaltet' }));
  assert.equal(gepflegt.empfaengerAusschnitt.freigabeDurchInhaberin, false);
  const { L, offen } = await nutzlast(V, k);
  assert.equal(offen.empfaengerAusschnitt.freigabeDurchInhaberin, true);
  const fremd = kopie(offen); fremd.empfaengerAusschnitt.freigabeDurchInhaberin = false;
  L.setData(await L._depotUebernehmenGeprueft(fremd));
  const html = String(L.sektorHTML('health'));
  assert.ok(html.includes(L.STRINGS.freigabeNicht), 'der Satz ohne Namen');
  assert.ok(!/Erika[^<]*nicht freigegeben/.test(html), 'keine Entscheidung, die die Person nicht getroffen hat');
});

test('[Freigabe·Dialog] der Kreisdialog nennt die gefüllten geschützten Angaben eines Ab-Werk-Blatts, ein Häkchen weg schreibt die Ausnahme', async () => {
  const V = await depot();
  const angaben = V._kreisGeschuetzteAngaben(['notfall']).map((a) => a.adresse);
  for (const a of ['health.bloodType', 'health.allergiesMedicationFoodOther', 'health.medicationOngoing']) assert.ok(angaben.includes(a), a + ' steht im Block');
  assert.ok(!angaben.includes('health.chronicConditionsDiagnoses'), 'eine leere Angabe steht nicht im Block');
  assert.ok(V._kreisGeschuetzteAngaben(['notfall'])[0].label, 'jede Zeile trägt den Namen der Angabe');
  assert.deepEqual(V._kreisGeschuetzteAngaben(['bereich:health']), [], 'ein Bereichsbaustein filtert ohnehin');
  // Im Dialog: offen, vorab angekreuzt bis auf die Ausnahmen, beim Wechsel der Bausteine neu gezeichnet; gespeichert wird die Menge.
  const quelle = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const a = quelle.indexOf('function _kreisGeschuetztVerdrahten'); const block = quelle.slice(a, quelle.indexOf('\nfunction ', a + 10));
  assert.match(block, /el\.checked = !abgewaehlt\.has\(a\.adresse\)/);
  assert.match(block, /abgewaehlt\.add\(a\.adresse\)/);
  assert.match(block, /addEventListener\('change', zeichnen\)/);
  assert.match(quelle, /ausnahmen: \[\.\.\.abgewaehlt\]/);
});
