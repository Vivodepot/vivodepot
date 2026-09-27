'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Testament-Verzicht haelt nur, solange das Festhalten funktioniert.
   ────────────────────────────────────────────────────────────────────────
   Vivodepot erstellt kein Testament — das ist der Verzicht aus U2-ADR-033.
   Ein Abriss-Test sichert davon nur die eine Hälfte: dass kein Wizard und
   kein Generator mehr da sind. Er sagt nichts darüber, ob das, WAS
   stattdessen möglich sein soll, auch funktioniert.

   DER VERZICHT IST NUR HALTBAR, SOLANGE DAS FESTHALTEN FUNKTIONIERT. Wenn
   die Testament-Zeile oder ihr Ablageort ausfiele, stünde die Bürgerin vor
   einem Werkzeug, das ihr das Erstellen verweigert UND das Festhalten nicht
   kann — der Verzicht wäre dann keine Haltung mehr, sondern eine Lücke.
   Diese Prüfung schliesst die Gegenrichtung: Sie sichert POSITIV zu, dass
   die Grundlage existiert.

   Geprüft wird über den ECHTEN Speicher-/Öffnen-Pfad (depotSerialisieren →
   depotLaden), nicht über setData: Eine Zusicherung, die nur im Speicher
   gilt, sagt nichts über das, was die Bürgerin morgen wieder aufmacht.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');


const PW = 'klausel-pw';
const ORT = 'beim Notariat Dr. Sommer, Ordner „Wichtiges"';

async function depotMitTestament() {
  const k = ladeKern(); const K = k.V;
  await K.depotAnlegen(PW);
  K.akteurSelbstErklaeren('Maria Mustermann');
  K.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', storageLocation: ORT });
  return K;
}
const testamentZeile = (d) =>
  (((d.sektoren.advanceCare || {}).provisionInstruments) || []).find(r => r && r.instrument === 'will');

test('[Verzicht] die Testament-Zeile ist deklariert und traegt ein befuellbares ort-Unterfeld', () => {
  const { V } = ladeKern();
  const liste = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder || [])
    .find(f => f.id === 'provisionInstruments');
  assert.ok(liste, 'die Instrument-Liste existiert');
  const typen = ((liste.unterFelder || []).find(u => u.id === 'instrument').optionen || []).map(o => o.wert);
  assert.ok(typen.includes('will'),
    'Ohne Testament-Typ gaebe es nichts festzuhalten — der Verzicht waere dann eine Luecke');
  const ort = V.feldDefFuer('advanceCare', 'liste:provisionInstruments:will:storageLocation');
  assert.ok(ort, 'das ort-Unterfeld existiert');
  assert.equal(ort.typ, 'text', 'und ist ein Textfeld, also befuellbar');
});

test('[Verzicht] eine Testament-Zeile laesst sich anlegen und traegt den Ablageort', async () => {
  const K = await depotMitTestament();
  const z = testamentZeile(K.getData());
  assert.ok(z, 'die Zeile entsteht');
  assert.equal(z.storageLocation, ORT, 'der Ablageort steht daran');
});

test('[Verzicht] Ablageort ueberlebt Speichern und Oeffnen — echter Pfad, kein setData', async () => {
  const K = await depotMitTestament();
  // Der Weg, den die Datei wirklich nimmt: verschluesseln, wieder aufmachen.
  const umschlag = await K.depotSerialisieren();
  const frisch = await K.depotLaden(umschlag, PW);
  const z = testamentZeile(frisch);
  assert.ok(z, 'nach dem Oeffnen ist die Testament-Zeile noch da');
  assert.equal(z.storageLocation, ORT,
    'Der Ablageort ist das EINZIGE, was Vivodepot zum Testament beitraegt. Geht er beim '
    + 'Speichern verloren, verweigert die App das Erstellen UND kann das Festhalten nicht — '
    + 'dann ist der Verzicht keine Haltung mehr, sondern eine Luecke.');
});

test('[Verzicht] die befuellte Zeile erscheint in der Lese-App', async () => {
  // `vorsorge_instrumente.ort` traegt `sensibel: true` (Kern UND Lese-App, fuer ALLE Instrument-
  // Typen einheitlich, nicht nur Testament) — seit Befund 2 („Die Lese-App wird
  // nirgends mitgemessen", 12./13.08.2026) haelt sektorHTML() ihn zurecht aus dem HTML zurueck.
  // FESTGEHALTEN, NICHT ENTSCHIEDEN: genau hier reibt sich das mit dem Zweck dieses Tests — der
  // Ablageort ist die einzige Information, die eine Vertrauensperson braucht, um das Testament im
  // Ernstfall zu FINDEN, und die Lese-App ist die Sicht, in der diese Person liest. Ob `ort` fuer
  // vorsorge_instrumente ueberhaupt sensibel sein sollte, ist eine Schema-/Produktfrage aus einer
  // frueheren Sitzung, nicht Gegenstand dieses Auftrags — hier nur an den jetzt korrekten,
  // pruefbaren Stand angepasst. Siehe Bericht.
  const K = await depotMitTestament();
  const umschlag = await K.depotSerialisieren();
  const frisch = await K.depotLaden(umschlag, PW);
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  L.setData(L._foldVollmachtenLesen(JSON.parse(JSON.stringify(frisch))));
  const html = L.sektorHTML('advanceCare');
  assert.ok(html.includes('Testament'), 'das Instrument wird benannt');
  assert.ok(!html.includes(ORT), 'sensibler Ablageort — darf NICHT im HTML der Lese-App erscheinen');
  // Direkter Feldvergleich, kein JSON.stringify().includes(): ORT traegt ein woertliches `"`
  // (Ordner „Wichtiges") — JSON.stringify escapte es zu `\"` und liesse den Substring-Vergleich
  // falsch negativ ausfallen.
  const liste = ((L.getData().sektoren.advanceCare || {}).provisionInstruments) || [];
  const zeile = liste.find(z => z && z.instrument === 'will');
  assert.equal(zeile && zeile.storageLocation, ORT,
    'Der Ablageort muss trotzdem verlustfrei im migrierten STAND ankommen — sonst waere es echter '
    + 'Datenverlust, nicht Zurueckhaltung.');
});

test('[Verzicht] und der Verzicht selbst gilt weiter: kein Wizard, kein Generator', () => {
  const { V } = ladeKern();
  const modul = (V.VORSORGE_MODULE || []).find(m => m.instrumentTyp === 'will');
  assert.ok(modul, 'das Testament-Modul ist registriert');
  assert.equal(modul.wizardId, null, 'kein Erstellungs-Wizard (Verzicht aus U2-ADR-033)');
  assert.equal(modul.generator, null, 'kein erzeugter Verfuegungstext (U2-ADR-033)');
});
