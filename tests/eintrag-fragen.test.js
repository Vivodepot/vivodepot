'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
   Fragen am Eintrag und Gesprächsblatt je Adressat (U2-ADR-523).
   ───────────────────────────────────────────────────────────────────────────────────────────────────
   Eine Person bereitet ein Gespräch vor: an einem Eintrag ihres Depots notiert sie eine Frage an eine
   Stelle oder einen Menschen, nimmt das Blatt für dieses Gespräch mit und trägt die Antwort mit Quelle
   und Datum ein. Die Fragen stehen in EINEM Register `data.fragen[]` (Muster der Register aus U2-ADR-008),
   jede mit ihrem Ziel {bereich, feld, eintragId?}. Welche Felder Ziel sein dürfen, sagt FRAGEN_ZIELFELDER.

   Geprüft wird, gleichrangig an zwei Bereichen (Konten mit Eintrag, Medikation auf Feldebene):
     - eine Frage ohne Antwort ist offen; eine Antwort ohne Quelle oder Datum wird abgewiesen;
     - Rot-Beweis außerhalb der Gesundheit: eine Frage an einem Konto an die Bank;
     - die Apotheke ist eine eingebaute Art einer Stelle;
     - (a) ein entfernter Eintrag lässt seine Frage nicht still verschwinden: sie steht als verwaist da;
     - (b) eine Frage zu einem Feld außerhalb eines Ausschnitts geht nicht mit;
     - (c) das Blatt für Adressat A trägt keine Frage an Adressat B.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'fragen-am-eintrag-2026!';
async function frischesDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Testerin');
  return k;
}

// Ein Konto bei einer Bank, eine Apotheke, ein Mensch; liefert die Kennungen.
async function depotMitKontoUndStellen() {
  const k = await frischesDepot();
  const { V } = k;
  const bank = V.institutionHinzufuegen({ name: 'Beispielbank Nord', art: 'bank' });
  const apotheke = V.institutionHinzufuegen({ name: 'Apotheke am Probeplatz', art: 'apotheke' });
  const mensch = V.personHinzufuegen({ name: 'Erika Beispiel' });
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { ref: bank, override: '' }, accountType: 'Girokonto' });
  const konto = V.getData().sektoren.finance.accounts[0].id;
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Beispielmittel 100 mg', code: '' }]);
  return { ...k, bank, apotheke, mensch, konto };
}

test('[Fragen] Konten und Medikation sind gleichrangig erlaubte Ziele, sonst nichts Unbenanntes', async () => {
  const { V } = await frischesDepot();
  assert.ok(Array.isArray(V.FRAGEN_ZIELFELDER));
  assert.ok(V.FRAGEN_ZIELFELDER.includes('finance.accounts'));
  assert.ok(V.FRAGEN_ZIELFELDER.includes('health.medicationOngoing'));
  assert.ok(Object.isFrozen(V.FRAGEN_ZIELFELDER));
});

test('[Fragen] ein neues Depot trägt das Register leer', async () => {
  const { V } = await frischesDepot();
  assert.deepEqual(V.getData().fragen, []);
});

test('[Fragen·Rot-Beweis außerhalb der Gesundheit] Frage an einem Konto an die Bank, offen bis zur Antwort', async () => {
  const { V, bank, konto } = await depotMitKontoUndStellen();
  const id = V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto },
    frage: 'Welche Kündigungsfrist gilt?', an: { ref: bank }, gestellt: '2026-11-06' });
  assert.equal(typeof id, 'string');
  assert.equal(V.fragenOffen().length, 1);
  assert.equal(V.fragenOffen()[0].ziel.eintragId, konto);
  V.frageBeantworten(id, { antwort: 'Drei Monate zum Quartalsende.', antwortVon: { ref: bank }, antwortAm: '2026-11-07' });
  assert.equal(V.fragenOffen().length, 0);
});

test('[Fragen] Medikation auf Feldebene, an die Apotheke', async () => {
  const { V, apotheke } = await depotMitKontoUndStellen();
  V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' },
    frage: 'Verträgt sich das mit dem neuen Mittel?', an: { ref: apotheke }, gestellt: '2026-11-06' });
  assert.equal(V.fragenOffen({ bereich: 'health', feld: 'medicationOngoing' }).length, 1);
  assert.equal(V.fragenOffen({ bereich: 'finance', feld: 'accounts' }).length, 0);
});

test('[Fragen] Antwort ohne Quelle oder ohne Datum wird abgewiesen', async () => {
  const { V, bank, konto } = await depotMitKontoUndStellen();
  const id = V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto },
    frage: 'Gibt es eine Kontoführungsgebühr?', an: { ref: bank }, gestellt: '2026-11-06' });
  assert.throws(() => V.frageBeantworten(id, { antwort: 'Nein.', antwortAm: '2026-11-07' }), /Quelle|antwortVon/);
  assert.throws(() => V.frageBeantworten(id, { antwort: 'Nein.', antwortVon: { ref: bank } }), /Datum|antwortAm/);
  assert.equal(V.fragenOffen().length, 1, 'eine abgewiesene Antwort schließt die Frage nicht');
});

test('[Fragen] Ziel außerhalb der erlaubten Felder, unbekannter Eintrag, Adressat ohne Verweis: abgewiesen', async () => {
  const { V, bank } = await depotMitKontoUndStellen();
  assert.throws(() => V.frageAnlegen({ ziel: { bereich: 'identity', feld: 'givenName' }, frage: 'x', an: { ref: bank }, gestellt: '2026-11-06' }));
  assert.throws(() => V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: 'gibt-es-nicht' }, frage: 'x', an: { ref: bank }, gestellt: '2026-11-06' }));
  assert.throws(() => V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' }, frage: 'x', an: { ref: 'gibt-es-nicht' }, gestellt: '2026-11-06' }));
  assert.throws(() => V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' }, frage: '  ', an: { ref: bank }, gestellt: '2026-11-06' }));
  assert.equal(V.getData().fragen.length, 0);
});

test('[Fragen] die Apotheke ist eine eingebaute Art einer Stelle', async () => {
  const { V } = await frischesDepot();
  assert.ok(V.institutionsArtenAlle().some((a) => a.wert === 'apotheke'));
  assert.ok(V.INSTITUTION_ART_EINGEBAUT.includes('apotheke'));
});

test('[Fragen·a] ein entfernter Eintrag lässt seine Frage nicht still verschwinden', async () => {
  const { V, bank, konto } = await depotMitKontoUndStellen();
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto },
    frage: 'Wer ist zweite Kontoinhaberin?', an: { ref: bank }, gestellt: '2026-11-06' });
  assert.deepEqual(V.fragenZuEintrag('finance', 'accounts', konto).length, 1, 'vor dem Entfernen fragt die Oberfläche nach');
  V.listenEintragEntfernen('finance', 'accounts', 0);
  const verwaist = V.fragenVerwaist();
  assert.equal(verwaist.length, 1);
  assert.equal(V.getData().fragen.length, 1, 'die Frage ist noch da, sichtbar als verwaist');
});

test('[Fragen·b] eine Frage zu einem Feld außerhalb des Ausschnitts geht nicht mit', async () => {
  const { V, bank, apotheke, konto } = await depotMitKontoUndStellen();
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'Frage zum Konto', an: { ref: bank }, gestellt: '2026-11-06' });
  V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' }, frage: 'Frage zur Medikation', an: { ref: apotheke }, gestellt: '2026-11-06' });
  const kreis = { id: 'k-finanzen', name: 'Steuerberatung', bausteine: ['bereich:finance'], ausnahmen: [] };
  const subset = V.empfaengerZuschnittModell(kreis);
  const texte = (subset.fragen || []).map((f) => f.frage);
  assert.deepEqual(texte, ['Frage zum Konto']);
  // Rot-Beweis der reinen Funktion: ohne den Bereich im Ausschnitt geht keine Frage mit.
  assert.deepEqual(V.fragenImAusschnitt(V.getData().fragen, { sektoren: {} }), []);
});

test('[Fragen·c] das Blatt für Adressat A trägt keine Frage an Adressat B', async () => {
  const { V, bank, apotheke, konto } = await depotMitKontoUndStellen();
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'Frage an die Bank', an: { ref: bank }, gestellt: '2026-11-06' });
  V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' }, frage: 'Frage an die Apotheke', an: { ref: apotheke }, gestellt: '2026-11-06' });
  const blatt = V.gespraechsblattModell({ ref: apotheke });
  assert.deepEqual(blatt.fragen.map((f) => f.frage), ['Frage an die Apotheke']);
  assert.equal(blatt.adressat, 'Apotheke am Probeplatz');
  const html = V.gespraechsblattHTML(blatt);
  assert.match(html, /Frage an die Apotheke/);
  assert.doesNotMatch(html, /Frage an die Bank/);
  assert.match(html, /Apotheke am Probeplatz/, 'der Titel nennt den Adressaten');
});

test('[Fragen] beantwortete Fragen stehen nicht auf dem Blatt, nur offene', async () => {
  const { V, bank, konto } = await depotMitKontoUndStellen();
  const a = V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'Offen bleibt diese', an: { ref: bank }, gestellt: '2026-11-06' });
  const b = V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'Schon geklärt', an: { ref: bank }, gestellt: '2026-11-06' });
  V.frageBeantworten(b, { antwort: 'Ja.', antwortVon: { ref: bank }, antwortAm: '2026-11-07' });
  assert.ok(a);
  assert.deepEqual(V.gespraechsblattModell({ ref: bank }).fragen.map((f) => f.frage), ['Offen bleibt diese']);
});

test('[Fragen·Schema] Stufe 95 legt das leere Register an und ändert keinen Wert', async () => {
  const { V } = await frischesDepot();
  assert.equal(V.SCHEMA_VERSION_AKTUELL, 95);
  const { STUFEN } = require('./fixtures/migrations-stufen.js');
  assert.ok(STUFEN.some((st) => st.nach === 95), 'die Stufe 95 steht in den Stufen-Fixtures');
});

test('[Fragen·Oberfläche] der Knopf steht an Konten und Medikation, mit der Zahl der offenen, sonst nirgends', async () => {
  const { V, bank, apotheke, konto } = await depotMitKontoUndStellen();
  assert.equal(typeof V.frageZeileHTML, 'function');
  assert.match(V.frageZeileHTML('finance', 'accounts'), /data-fragen-sektor="finance"/);
  assert.doesNotMatch(V.frageZeileHTML('finance', 'accounts'), /· \d+ offen/);
  assert.equal(V.frageZeileHTML('identity', 'givenName'), '', 'kein Knopf an einem Feld ohne Fragen-Ziel');
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'a', an: { ref: bank }, gestellt: '2026-11-06' });
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'b', an: { ref: bank }, gestellt: '2026-11-06' });
  V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' }, frage: 'c', an: { ref: apotheke }, gestellt: '2026-11-06' });
  assert.match(V.frageZeileHTML('finance', 'accounts'), /· 2 offen/);
  assert.match(V.frageZeileHTML('health', 'medicationOngoing'), /· 1 offen/);
});

/* Maskierung an den Stellen der Textknoten-Grundlinie aus U2-ADR-523: Frage, Antwort und Namen von Stelle
   und Mensch tragen <script>, ", ' und &; Dialog und Blatt zeigen sie nur maskiert. Rot-Beweis: derselbe Lauf gegen eine
   Kopie des Kerns, deren escapeHTML nichts maskiert, findet das rohe <script>. */
const BOESE = '<script>x()</script> "zitat" \'apo\' & co';
const BOESE_MASKIERT = '&lt;script&gt;x()&lt;/script&gt; &quot;zitat&quot; &#39;apo&#39; &amp; co';
async function boeseAusgaben(opts) {
  const k = ladeKern(opts);
  const { V } = k;
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Testerin');
  const bank = V.institutionHinzufuegen({ name: 'Bank ' + BOESE, art: 'bank' });
  const mensch = V.personHinzufuegen({ name: 'Mensch ' + BOESE });
  V.listenEintragHinzufuegen('finance', 'accounts', { institution: { ref: bank, override: '' }, accountType: 'Girokonto' });
  const konto = V.getData().sektoren.finance.accounts[0].id;
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'Frage ' + BOESE, an: { ref: bank }, gestellt: '2026-11-06' });
  const b = V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts' }, frage: 'Zweite ' + BOESE, an: { ref: mensch }, gestellt: '2026-11-06' });
  V.frageBeantworten(b, { antwort: 'Antwort ' + BOESE, antwortVon: { ref: mensch }, antwortAm: '2026-11-06' });
  const apo = V.institutionHinzufuegen({ name: 'Apotheke ' + BOESE, art: 'apotheke' });
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Mittel ' + BOESE, code: '' }]);
  V.sensibelFeldSetzen('health', 'medicationOngoing', false);
  return {
    dialog: V._fragenDialogHTML('finance', 'accounts'),
    blatt: V.gespraechsblattHTML(V.gespraechsblattModell({ ref: bank })),
    blattApotheke: V.gespraechsblattHTML(V.gespraechsblattModell({ ref: apo })),
  };
}
function rohesMarkup(html) {
  return ['<script', '"zitat"', "'apo'", '& co'].filter((roh) => html.includes(roh));
}

test('[Fragen·Maskierung] Frage, Antwort und Namen stehen in Dialog und Blatt nur maskiert', async () => {
  const { dialog, blatt, blattApotheke } = await boeseAusgaben();
  assert.deepEqual(rohesMarkup(blattApotheke), [], 'Blatt für die Apotheke');
  assert.ok(blattApotheke.includes('Mittel ' + BOESE_MASKIERT), 'die Angabe aus der Medikation steht maskiert');
  assert.equal(typeof dialog, 'string');
  assert.deepEqual(rohesMarkup(dialog), [], 'Dialog');
  assert.deepEqual(rohesMarkup(blatt), [], 'Blatt');
  for (const was of ['Frage ', 'Antwort ', 'Bank ', 'Mensch ']) assert.ok(dialog.includes(was + BOESE_MASKIERT), 'Dialog trägt ' + was + 'maskiert');
  for (const was of ['Frage ', 'Bank ']) assert.ok(blatt.includes(was + BOESE_MASKIERT), 'Blatt trägt ' + was + 'maskiert');
});

test('[Fragen·Maskierung·Rot-Beweis] ohne escapeHTML steht das rohe <script> in Dialog und Blatt', async () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const alt = "  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');";
  assert.equal(quelle.split(alt).length, 2, 'die eine Zeile von escapeHTML ist auffindbar');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fragen-maskierung-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(alt, '  return String(s);'));
  try {
    const { dialog, blatt, blattApotheke } = await boeseAusgaben({ htmlPfad: datei, backen: true });
    assert.ok(rohesMarkup(blattApotheke).includes('<script'), 'Angaben auf dem Blatt ohne Maskierung');
    assert.ok(rohesMarkup(dialog).includes('<script'), 'Dialog ohne Maskierung');
    assert.ok(rohesMarkup(blatt).includes('<script'), 'Blatt ohne Maskierung');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Fragen·Blatt] das Blatt für die Apotheke trägt die laufende Medikation (Voreinstellung)', async () => {
  const { V, apotheke } = await depotMitKontoUndStellen();
  V.frageAnlegen({ ziel: { bereich: 'health', feld: 'medicationOngoing' }, frage: 'Abstand zum Frühstück?', an: { ref: apotheke }, gestellt: '2026-11-06' });
  assert.deepEqual(V.gespraechsblattAusschnittVorgabe(apotheke), ['health.medicationOngoing']);
  const zurueck = V.gespraechsblattModell({ ref: apotheke });
  assert.deepEqual(zurueck.angaben, [], 'ab Werk ist die Medikation sensibel: ohne Freigabe nicht auf dem Blatt');
  assert.equal(zurueck.zurueckgehalten, 1);
  assert.match(V.gespraechsblattHTML(zurueck), /Zurückgehalten, weil sensibel: 1/, 'das Blatt nennt die Zahl');
  assert.equal(V.gespraechsblattModell({ ref: apotheke }, null, { sensibel: true }).angaben.length, 1, 'mit Freigabe darauf');
  V.sensibelFeldSetzen('health', 'medicationOngoing', false);
  const m = V.gespraechsblattModell({ ref: apotheke });
  assert.equal(m.angaben.length, 1, 'die Person hat die Medikation als nicht sensibel eingestuft');
  assert.match(m.angaben[0].text, /Beispielmittel 100 mg/);
  assert.match(V.gespraechsblattHTML(m), /gespraechsblatt-angaben[\s\S]*Beispielmittel 100 mg[\s\S]*Abstand zum Frühstück/);
  const ohneFrage = await depotMitKontoUndStellen();
  assert.deepEqual(ohneFrage.V.gespraechsblattAusschnittVorgabe(ohneFrage.apotheke), ['health.medicationOngoing'], 'auch ohne offene Frage');
});

test('[Fragen·Blatt·Freigabe] die Medikation kommt nur aufs Blatt, wenn sie in der Übersicht vor dem Senden angekreuzt ist', async () => {
  const { V, apotheke } = await depotMitKontoUndStellen();
  const ausschnitt = V.gespraechsblattAusschnittVorgabe(apotheke);
  const m = V.exportUebersichtModell(null, null, ausschnitt);
  const kandidaten = m.enthalten.concat(m.zurueckgehalten);
  assert.deepEqual(kandidaten.map((e) => e.sektor + '/' + e.feld), ['health/medicationOngoing'], 'die Übersicht bietet die Medikation an');
  const blatt = async (gewaehlt) => {
    let modell = null;
    await V.exportAuswahlEphemerAnwenden(kandidaten, gewaehlt, (o) => { modell = V.gespraechsblattModell({ ref: apotheke }, ausschnitt, o); });
    return modell;
  };
  const ohne = await blatt(new Set());
  assert.deepEqual(ohne.angaben, [], 'nicht angekreuzt: nicht auf dem Blatt');
  const mit = await blatt(new Set(['health/medicationOngoing']));
  assert.match(mit.angaben[0].text, /Beispielmittel 100 mg/, 'angekreuzt: auf dem Blatt');
  assert.equal(V.gespraechsblattModell({ ref: apotheke }).angaben.length, 0, 'die Auswahl gilt nur für dieses Blatt');
});

test('[Fragen·Blatt·Rot-Beweis] das Blatt für die Bank trägt keine Medikation; ein eigener Ausschnitt ersetzt die Voreinstellung', async () => {
  const { V, bank, apotheke, konto } = await depotMitKontoUndStellen();
  V.frageAnlegen({ ziel: { bereich: 'finance', feld: 'accounts', eintragId: konto }, frage: 'Kündigungsfrist?', an: { ref: bank }, gestellt: '2026-11-06' });
  V.sensibelFeldSetzen('health', 'medicationOngoing', false);
  const html = V.gespraechsblattHTML(V.gespraechsblattModell({ ref: bank }));
  assert.doesNotMatch(html, /Beispielmittel/, 'die Medikation geht nicht an die Bank');
  assert.deepEqual(V.gespraechsblattAusschnittVorgabe(bank), ['finance.accounts']);
  const leer = V.gespraechsblattModell({ ref: apotheke }, []);
  assert.deepEqual(leer.angaben, [], 'ein leerer Ausschnitt trägt keine Angabe');
});

test('[Fragen·Oberfläche] der Druck des Blatts ist eine Weitergabe mit Nachfrage', () => {
  const { AUSGABEWEGE_EINORDNUNG: EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');
  const e = (EINORDNUNG || {}).flowGespraechsblatt;
  assert.ok(e, 'flowGespraechsblatt ist eingeordnet');
  assert.equal(e.klasse, 'weitergabe');
  assert.equal(e.nachfrage, 'selbst');
});
