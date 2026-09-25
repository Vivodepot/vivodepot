'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Mein Behandlungsweg — die vier Waechter, bevor es die Vorlage gibt
   (Bauplan zur Vorlage Mein Behandlungsweg, 15.09.2026, Abschnitt 4)
   ────────────────────────────────────────────────────────────────────────
   DIE LAGE: Der Feldinhalt der Vorlage ist eine Produktentscheidung und stand
   noch aus. Ein Waechter, der nur ueber eine LEERE Liste laeuft, ist
   vakuum — er gruent, weil nichts da ist. Darum traegt JEDER der vier
   Waechter hier eine POSITIVKONTROLLE: ein erfundener, absichtlich
   kaputter Satz, den er ablehnen MUSS. Die echte Quelle wird zusaetzlich
   geprueft; kommt die Feldliste, greifen dieselben vier Proben ohne
   Aenderung an dieser Datei.

   W1 Einlass      — das Situations-Modul wird angenommen, und JEDE gelieferte
                     Situation kommt an (Zahl gegen Zahl, Muster A376).
   W2 Schutzmarke  — jedes Feld ausser den Kontaktlisten traegt `sensibel`,
                     und ohne Freigabe steht nichts davon im IPS.
   W3 Zweisprachig — zu jeder Situation ein englischer Titel im Textsatz.
   W4 Quellenpflicht — kein Hinweistext ueber Frist oder Anspruch ohne
                     Fundstelle. Vivodepot beraet nicht.
   W5 Grenze zur Medizin — kein Feld traegt ein Merkmal, mit dem es einen
                     Befund statt eines Verweises hielte (Produktentscheidung
                     16.09.2026; U2-ADR-025).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const W = require('../tools/behandlungsweg-modul-erzeugen.js');

const SITUATIONEN = W.lese(W.Q_SITUATIONEN);
const FELDER_QUELLE = W.lese(W.Q_FELDER);
const TEXTSATZ_EN = W.lese(W.Q_TEXTSATZ_EN);

test('W1 — das Situations-Modul wird eingelassen, und jede Situation kommt an', () => {
  const { V } = ladeKern();
  const r = W.situationenPruefen(V, SITUATIONEN);
  assert.equal(r.ok, true, 'Grund: ' + r.grund + ' — ' + JSON.stringify(r.verworfene || []));
  assert.equal(r.angekommen, r.geliefert);
  assert.deepEqual(r.ids.slice().sort(), ['reha', 'zweitmeinung']);
});

test('W1 Positivkontrolle — eine Situation mit reservierter ID kommt NICHT an', () => {
  const { V } = ladeKern();
  const kaputt = JSON.parse(JSON.stringify(SITUATIONEN));
  kaputt.situationen.krankenhaus = { icon: 'heartPulse', titel: 'Doppelt belegt', bloecke: [] };
  const r = W.situationenPruefen(V, kaputt);
  assert.equal(r.ok, false);
});

test('W1 Positivkontrolle — ein eigenes Feld direkt im Modul wird verworfen (nur signierte Vorlage)', () => {
  const { V } = ladeKern();
  const kaputt = JSON.parse(JSON.stringify(SITUATIONEN));
  kaputt.situationen.zweitmeinung.bloecke[0].eintraege.push({ feld: { id: 'geschmuggelt', typ: 'text', label: 'Geschmuggelt' } });
  const r = W.situationenPruefen(V, kaputt);
  assert.equal(r.ok, false);
});

test('W1 — die Situationen ziehen nur Felder, die es im Kern gibt', () => {
  const { V } = ladeKern();
  const vorhanden = new Set();
  for (const s of V.SEKTOREN) for (const sek of s.sektionen) for (const f of (sek.felder || [])) vorhanden.add(s.id + '.' + f.id);
  const fehlend = [];
  for (const id of Object.keys(SITUATIONEN.situationen)) {
    for (const blk of SITUATIONEN.situationen[id].bloecke) {
      for (const e of blk.eintraege) {
        const schluessel = e.quelle + '.' + e.feld;
        if (!vorhanden.has(schluessel)) fehlend.push(id + ' -> ' + schluessel);
      }
    }
  }
  assert.deepEqual(fehlend, [], 'Die Situation zieht Felder, die der Kern nicht kennt: ' + fehlend.join(', '));
});

test('W2 — die Schutzmarke greift an der echten Quelle', () => {
  const r = W.schutzPruefen(FELDER_QUELLE.felder);
  assert.equal(r.ok, true, 'ohne `sensibel`: ' + r.fehlend.join(', '));
});

test('W2 Positivkontrolle — ein Gesundheitsfeld ohne `sensibel` faellt durch', () => {
  const r = W.schutzPruefen([
    { feldname: { de: 'Meine Beobachtungen', en: 'My observations' }, feldtyp: 'liste' },
    { feldname: { de: 'Behandelnde Stellen', en: 'Treating providers' }, feldtyp: 'liste' },
  ]);
  assert.equal(r.ok, false);
  assert.deepEqual(r.fehlend, ['Meine Beobachtungen'], 'die Kontaktliste ist ausgenommen, das Beobachtungsfeld nicht');
});

test('W2 — ohne Freigabe steht kein geschuetztes Gesundheitsfeld im IPS', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { givenName: 'Probe', familyName: 'Probe', birthDate: '1979-05-09' });
  d.sektoren.health = Object.assign({}, d.sektoren.health, {
    chronicConditionsDiagnoses: [{ text: 'Beispiel-Diagnose' }],
    medicationOngoing: [{ text: 'Beispiel-Medikament' }],
  });
  V.setData(d);
  const ohne = JSON.stringify(V.fhirIpsBundle(new Date('2026-09-16T08:00:00Z'), { sensibel: false }));
  const mit = JSON.stringify(V.fhirIpsBundle(new Date('2026-09-16T08:00:00Z'), { sensibel: true }));
  assert.equal(ohne.includes('Beispiel-Diagnose'), false, 'ohne Freigabe darf die Diagnose nicht im Bundle stehen');
  assert.equal(ohne.includes('Beispiel-Medikament'), false, 'ohne Freigabe darf die Medikation nicht im Bundle stehen');
  assert.equal(mit.includes('Beispiel-Diagnose'), true, 'mit Freigabe muss sie drinstehen — sonst prueft der Test nichts');
});

test('W3 — zu jeder Situation gibt es einen englischen Titel, und der Textsatz ist gueltig', () => {
  const { V } = ladeKern();
  const r = W.sprachenPruefen(SITUATIONEN, TEXTSATZ_EN, FELDER_QUELLE);
  assert.equal(r.ok, true, 'ohne englische Beschriftung: ' + r.fehlend.join(', '));
  const tsr = V.textsatzModulPruefen(TEXTSATZ_EN);
  assert.equal(tsr.gueltig, true, 'Grund: ' + tsr.grund);
});

test('W3 Positivkontrolle — ein einsprachiges Feld faellt durch', () => {
  const r = W.sprachenPruefen({ situationen: {} }, TEXTSATZ_EN, {
    bereichId: 'treatmentJourney',
    felder: [{ feldname: 'Nur deutsch', feldtyp: 'text' }],
  });
  assert.equal(r.ok, false, 'ein Feld mit nur einem String ist einsprachig und muss auffallen');
});

test('W3 Positivkontrolle — fehlt ein englischer Titel, faellt die Probe', () => {
  const ohneEn = { texte: { 'reha.label': 'Rehabilitation and follow-up care' } };
  const r = W.sprachenPruefen(SITUATIONEN, ohneEn, null);
  assert.equal(r.ok, false);
  assert.deepEqual(r.fehlend, ['zweitmeinung']);
});

test('W4 — kein Hinweistext ueber Frist oder Anspruch ohne Fundstelle', () => {
  const funde = W.quellenpflichtPruefen(SITUATIONEN).concat(W.quellenpflichtPruefen(FELDER_QUELLE));
  assert.deepEqual(funde, [], funde.map((f) => f.pfad).join(', '));
});

test('W4 Positivkontrolle — eine Fristaussage ohne Quelle faellt durch, mit Quelle nicht', () => {
  const ohne = W.quellenpflichtPruefen({ felder: [{ id: 'krankengeldSeit', hinweis: 'Das Krankengeld laeuft nach 78 Wochen aus.' }] });
  assert.equal(ohne.length, 1);
  const mit = W.quellenpflichtPruefen({ felder: [{ id: 'krankengeldSeit', hinweis: 'Das Krankengeld laeuft nach 78 Wochen aus.', quelle: '§ 48 SGB V' }] });
  assert.deepEqual(mit, []);
});

test('Die Feldliste ist eine Datei, kein getippter Code — und traegt die bestaetigten Felder', () => {
  assert.equal(path.basename(W.Q_FELDER), 'felder.json');
  assert.equal(Array.isArray(FELDER_QUELLE.felder), true);
  assert.ok(FELDER_QUELLE.felder.length >= 11, 'die bestaetigte Liste hat mindestens elf Felder');
  assert.equal(FELDER_QUELLE.bereichId, 'treatmentJourney');
  /* Der Arbeitstitel steht an genau zwei Stellen: deutsch am Bereichs-Modul,
     englisch im Textsatz. Beide zusammen sind der bestaetigte Titel. */
  assert.equal(FELDER_QUELLE.bereich.bereiche.treatmentJourney.label, 'Mein Behandlungsweg');
  assert.equal(TEXTSATZ_EN.texte['treatmentJourney.label'], 'My treatment journey');
});

test('W5 — kein Feld der Vorlage traegt ein medizinisches Mess-Merkmal', () => {
  const r = W.medizinMerkmalePruefen(FELDER_QUELLE.felder);
  assert.equal(r.ok, true, r.funde.join('; '));
});

test('W5 Positivkontrolle — ein Messwert-Feld faellt durch, auch als Unterfeld', () => {
  const obenauf = W.medizinMerkmalePruefen([
    { feldname: { de: 'Tumormarker', en: 'Tumour marker' }, feldtyp: 'zahl', einheit: 'U/ml', sensibel: true },
  ]);
  assert.equal(obenauf.ok, false);
  const tief = W.medizinMerkmalePruefen([
    { feldname: { de: 'Verlauf', en: 'Course' }, feldtyp: 'liste', sensibel: true,
      unterFelder: [{ feldname: 'Wert', feldtyp: 'zahl', referenzbereich: '0 bis 35' }] },
  ]);
  assert.equal(tief.ok, false, 'auch ein Unterfeld darf keinen Befund halten');
  const sauber = W.medizinMerkmalePruefen([
    { feldname: { de: 'Zweitmeinung', en: 'Second opinion' }, feldtyp: 'liste', sensibel: true,
      unterFelder: [{ feldname: 'Bericht', feldtyp: 'ref', entitaet: 'mappe' }] },
  ]);
  assert.equal(sauber.ok, true, 'ein Verweis auf ein Dokument bleibt erlaubt — sonst prueft der Waechter zu viel');
});

test('Die erzeugte Vorlage kommt durch validateTemplate', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: FELDER_QUELLE.felder }), null);
});
