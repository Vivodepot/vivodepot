'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kette, Auftrag 3: der Anlass bekommt einen Ausgang
   (SP Bau, 20.08.2026 — setzt Auftrag 2 voraus: die Kennungsform steht)
   ────────────────────────────────────────────────────────────────────────
   Der Satz, um den es geht: *die zwölf Angaben einer Heimaufnahme gehen in EINER
   Ausgabe hinaus, statt in vier Dateien mit 23 Bedienschritten.*

   Gemessen am 19.08. (Bericht „Weg zur Institution"): vier getrennte Dateien,
   23 Bedienschritte, ZEHN von zwölf Angaben — Krankenkasse und Versichertennummer
   in keinem maschinenlesbaren Datensatz.

   Der Prüfstoff sind die zwölf Angaben selbst, nicht ein Prüfstück.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH, _standardProduktBaken } = require('./load-kern.js');

const PW = 'kette03-pw';

/* Die zwölf Angaben einer Heimaufnahme, wörtlich aus der Messung vom 19.08.
   Je Angabe: die Kennung (Form aus Auftrag 2) und ein Wert, den ein echter Mensch
   einträgt. Fünf Bereiche — genau der Fall, den kein heutiger Ausgabeweg trägt. */
const ZWOELF = [
  { nr: 1,  kennung: 'identity.givenName',                              wert: 'Hedwig' },
  { nr: 2,  kennung: 'identity.familyName',                             wert: 'Brandt' },
  { nr: 3,  kennung: 'identity.birthDate',                              wert: '1938-03-14' },
  { nr: 4,  kennung: 'health.healthInsurance',                          wert: { override: 'AOK Bayern' } },
  { nr: 5,  kennung: 'health.insuranceNumber',                          wert: 'A123456780' },
  { nr: 6,  kennung: 'socialInsurance.careLevel',                       wert: '3' },
  { nr: 7,  kennung: 'health.emergencyContacts',                        wert: null },   // ref → wird unten gesetzt
  { nr: 8,  kennung: 'socialInsurance.longTermCareFundPhone',           wert: '089 123456' },
  { nr: 9,  kennung: 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation', wert: null },  // Liste
  { nr: 10, kennung: 'health.medicationOngoing',                        wert: [{ text: 'Metformin 500' }] },
  { nr: 11, kennung: 'health.allergiesMedicationFoodOther',             wert: [{ text: 'Penicillin' }] },
  { nr: 12, kennung: 'health.chronicConditionsDiagnoses',               wert: [{ text: 'Diabetes Typ 2' }] },
];

async function heimaufnahmeDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  for (const a of ZWOELF) {
    if (a.wert == null) continue;
    const sel = V.kennungZuSelektor(a.kennung);
    V.sektorFeldSetzen(sel.sektorId, sel.feldId, a.wert);
  }
  // Nr. 7: ein Verweis auf eine Person aus dem Register.
  const p = V.personSicherstellen('Tochter Reiter');
  V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: (p && (p.id || p)) || 'Tochter Reiter' }]);   // refMehrfach
  // Nr. 9: ein Listen-Unterfeld — der Ablageort der Vorsorgevollmacht.
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', storageLocation: 'Ordner im Wohnzimmer' });
  return V;
}
const KENNUNGEN = ZWOELF.map((a) => a.kennung);

/* ══ Die tragende Probe ═══════════════════════════════════════════════════ */

test('[Kette 03 · tragend] alle ZWÖLF Angaben stehen in EINEM maschinenlesbaren Datensatz', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme', titel: 'Heimaufnahme' }, { sensibel: true });
  const drin = new Set(ds.felder.map((f) => f.kennung));
  const fehlt = KENNUNGEN.filter((k) => !drin.has(k));
  assert.deepEqual(fehlt, [], 'nicht zehn, nicht sechs — zwölf');
  assert.equal(ds.felder.length, 12);
  assert.equal((ds.unbekannt || []).length, 0, 'und keine der zwölf Kennungen ist unbekannt');
});

test('[Kette 03 · tragend · Rot-Beweis] fällt ein Feld aus der Zusammenstellung, schlägt die Probe an', async () => {
  const V = await heimaufnahmeDepot();
  const ohneEins = KENNUNGEN.filter((k) => k !== 'health.insuranceNumber');
  const ds = V.zusammenstellungDatensatz(ohneEins, { id: 'heimaufnahme', titel: 'Heimaufnahme' }, { sensibel: true });
  const drin = new Set(ds.felder.map((f) => f.kennung));
  assert.equal(drin.has('health.insuranceNumber'), false,
    'die Probe misst am Datensatz, nicht an der Absicht — ein entferntes Feld ist wirklich weg');
  assert.equal(ds.felder.length, 11);
});

test('[Kette 03] die zwei bis heute UNERREICHBAREN Angaben sind erreichbar', async () => {
  // Kasse und Versichertennummer standen in KEINEM maschinenlesbaren Datensatz (Messung 19.08.).
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, { sensibel: true });
  const kasse = ds.felder.find((f) => f.kennung === 'health.healthInsurance');
  const nummer = ds.felder.find((f) => f.kennung === 'health.insuranceNumber');
  assert.ok(kasse && /AOK/.test(kasse.wert), 'die Kasse geht mit');
  assert.ok(nummer && /A123456780/.test(nummer.wert), 'die Versichertennummer geht mit');
});

test('[Kette 03 · bereichsübergreifend] der Datensatz trägt Felder aus FÜNF Bereichen', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, { sensibel: true });
  const bereiche = new Set(ds.felder.map((f) => f.bereich));
  assert.ok(bereiche.size >= 4, 'mehrere Bereiche in EINER Ausgabe — gefunden: ' + [...bereiche].join(', '));
  assert.ok(bereiche.has('identity') && bereiche.has('health')
         && bereiche.has('socialInsurance') && bereiche.has('advanceCare'));
});

test('[Kette 03 · Gegenprobe] ein Bereich ohne Beitrag erscheint NICHT', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, { sensibel: true });
  const bereiche = new Set(ds.felder.map((f) => f.bereich));
  assert.equal(bereiche.has('mobilitaet'), false, 'kein leerer Bereich im Datensatz');
  assert.equal(bereiche.has('bildung'), false);
});

/* ══ Zug 2 — das schlichte eigene Format ══════════════════════════════════ */

test('[Kette 03 · Zug 2] ein Feld, das KEIN Standard kennt, ist im Datensatz — und NICHT im FHIR', async () => {
  const V = await heimaufnahmeDepot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'living-will', storageLocation: 'Tresor' });
  const eigen = 'advanceCare.provisionInstruments[living-will].storageLocation';
  const ds = V.zusammenstellungDatensatz([eigen], { id: 'heimaufnahme' }, { sensibel: true });
  assert.equal(ds.felder.length, 1, 'der Ablageort der Patientenverfügung geht mit — FHIR kennt ihn nicht');
  assert.match(ds.felder[0].wert, /Tresor/);
  const fhir = JSON.stringify(V.fhirIpsBundle(new Date('2026-08-20T10:00:00Z'), { sensibel: true }));
  assert.equal(fhir.includes('Tresor'), false, 'und er ist NICHT im FHIR-Datensatz — dort gehört er nicht hin');
});

test('[Kette 03 · Zug 2] der Datensatz nennt sein Format in der versionierten Form', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, {});
  assert.equal(ds.formatKennung, 'vivodepot-anlass@1', 'F2-Form aus U2-ADR-151 — eine Umbenennung bräche sonst jeden Empfänger');
});

/* ══ Zug 3 — die drei Ausgaben aus EINEM Lauf ═════════════════════════════ */

test('[Kette 03 · Zug 3] Datensatz, PDF und QR tragen DASSELBE — kein Feld nur im PDF', async () => {
  const V = await heimaufnahmeDepot();
  const a = V.anlassAusgaben('pflegeheimakut', { sensibel: true });
  const imDatensatz = a.datensatz.felder.map((f) => f.label);
  const imPdf = a.pdfModell.bereiche.flatMap((b) => b.sektionen.flatMap((s) => s.zeilen.map((z) => z.label)));
  assert.deepEqual(imPdf.slice().sort(), imDatensatz.slice().sort(),
    'das ist die Probe, die den heutigen Zustand aufgedeckt hätte');
  const ausQr = JSON.parse(a.qr.teile.map((t) => t.nutzlast).join(''));
  assert.deepEqual(ausQr.felder.map((f) => f.label), imDatensatz, 'der QR trägt denselben Datensatz, Feld für Feld');
});

test('[Kette 03 · Zug 3] der QR ist mehrteilig mit „Teil i von n" — und bricht nie stumm ab', async () => {
  const V = await heimaufnahmeDepot();
  const a = V.anlassAusgaben('pflegeheimakut', { sensibel: true, maxNutzlast: 200 });
  assert.ok(a.qr.anzahl > 1, 'ein langer Datensatz wird geteilt, nicht gekürzt');
  a.qr.teile.forEach((t, i) => {
    assert.equal(t.index, i + 1);
    assert.equal(t.gesamt, a.qr.anzahl);
    assert.match(t.rahmen, new RegExp('^VDQR\\|[a-z0-9]+\\|' + (i + 1) + '/' + a.qr.anzahl + '\\|'));
  });
  const zusammen = a.qr.teile.map((t) => t.nutzlast).join('');
  assert.equal(zusammen, JSON.stringify(a.datensatz), 'zusammengesetzt ist es Zeichen für Zeichen der Datensatz');
});

test('[Kette 03 · Zug 3] über der Grenze wird der Wechsel zur Datei ANGESAGT, nicht stillschweigend getan', async () => {
  const V = await heimaufnahmeDepot();
  const a = V.anlassAusgaben('pflegeheimakut', { sensibel: true, maxNutzlast: 100, maxTeile: 3 });
  assert.equal(a.qr.ueberGrenze, true, 'die Ansage ist ein Feld im Ergebnis, kein Kommentar');
  const b = V.anlassAusgaben('pflegeheimakut', { sensibel: true });
  assert.equal(b.qr.ueberGrenze, false, 'Gegenprobe: unter der Grenze (Standard) wird nichts angesagt — ' + b.qr.anzahl + ' Teile');
});

/* ══ Zug 4 — die Vertretung ═══════════════════════════════════════════════ */

test('[Kette 03 · Zug 4 · Gegenprobe] antwortet der Mensch selbst, steht KEINE Vertretung im Datensatz', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, { sensibel: true });
  assert.equal(ds.vertretung, null, 'eine leere Vertretungs-Angabe wäre eine Aussage über nichts');
});

test('[Kette 03 · Zug 4] antwortet eine Betreuerin, steht WER und IN WELCHER EIGENSCHAFT im Datensatz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-kette03');
  V.akteurSelbstErklaeren('Frau Reiter');
  const e = await V.subDepotAnlegen({ vorname: 'Hedwig', nachname: 'Brandt',
    vertretungsGrundlage: 'gesetzliche_betreuung' }, 'sub-kette03');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'sub-kette03');
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Frau Reiter');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const ds = V.zusammenstellungDatensatz(['identity.givenName'], { id: 'heimaufnahme' }, { sensibel: true });
  assert.ok(ds.vertretung, 'im Sub-Kontext trägt der Datensatz die Vertretung');
  assert.equal(ds.vertretung.eigenschaft, 'gesetzliche_betreuung', 'mit der Eigenschaft, in der sie handelt');
  assert.ok(ds.vertretung.fuer, 'und für wen');
  V.subKontextVerlassen();
});

/* ══ Zug 5 — was am Datensatz mitreist ════════════════════════════════════ */

test('[Kette 03 · Zug 5] die Teilantwort sagt, was FEHLT — sie schweigt nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const verlangt = ['identity.givenName', 'identity.familyName', 'identity.birthDate'];
  const ds = V.zusammenstellungDatensatz(verlangt, { id: 'anfrage' }, { sensibel: true });
  assert.equal(ds.felder.length, 1);
  assert.equal(ds.fehlend.length, 2, 'wer eine von drei Angaben gibt, dessen Datensatz sagt: zwei fehlen');
  assert.deepEqual(ds.fehlend.map((f) => f.kennung).sort(), ['identity.birthDate', 'identity.familyName']);
});

test('[Kette 03 · Zug 5 · Rot-Beweis] ohne Gültigkeit sieht der Empfänger Altes wie Frisches', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  // Ein Feld mit Ablaufdatum (Marke `laeuftAb`) — der Wert wohnt bei seiner Gültigkeit (U2-ADR-148).
  const mitAblauf = V.SEKTOREN.flatMap((s) => (s.sektionen || []).flatMap((sek) => (sek.felder || [])
    .filter((f) => Array.isArray(f.marken) && f.marken.indexOf('laeuftAb') >= 0).map((f) => ({ s: s.id, f: f.id }))))[0];
  assert.ok(mitAblauf, 'Vorbedingung: es gibt ein Feld mit Ablaufdatum');
  V.sektorFeldSetzen(mitAblauf.s, mitAblauf.f, 'X1234567');
  V.feldGueltigkeitSetzen(mitAblauf.s, mitAblauf.f, null, '2023-01-31');
  const k = V.kennungAusSelektor(mitAblauf.s, mitAblauf.f);
  const ds = V.zusammenstellungDatensatz([k], { id: 'anfrage' }, { sensibel: true });
  const eintrag = ds.felder.find((x) => x.kennung === k);
  assert.ok(eintrag, mitAblauf.s + '.' + mitAblauf.f + ' ist im Datensatz');
  assert.equal(String(eintrag.gueltigBis).slice(0, 10), '2023-01-31',
    'ohne dieses Datum sähe der Empfänger eine drei Jahre alte Angabe wie eine frische');
});

test('[Kette 03 · Zug 5] die Herkunft eines Werts reist mit', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(['identity.givenName'], { id: 'anfrage' }, { sensibel: true });
  assert.ok(ds.felder[0].herkunft, 'selbst eingetragen oder aus einem geprüften Nachweis — der Empfänger kann es sonst nicht wissen');
  assert.equal(ds.felder[0].herkunft.verifiziert, false, 'eine Selbstauskunft behauptet nicht, geprüft zu sein');
});

/* ══ Sensibel ═════════════════════════════════════════════════════════════ */

test('[Kette 03 · Sensibel] ein zurückgehaltenes Feld ist nicht im Datensatz — und wird GEZÄHLT', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, { sensibel: false });
  const drin = new Set(ds.felder.map((f) => f.kennung));
  assert.equal(drin.has('health.insuranceNumber'), false, 'ohne Freigabe geht die Versichertennummer nicht mit');
  assert.ok(ds.zurueckgehalten.sensibel > 0, 'und es wird gezählt statt verschwiegen — ' + ds.zurueckgehalten.sensibel);
  const mit = V.zusammenstellungDatensatz(KENNUNGEN, { id: 'heimaufnahme' }, { sensibel: true });
  assert.equal(mit.zurueckgehalten.sensibel, 0, 'Gegenprobe: mit Freigabe wird nichts zurückgehalten');
});

/* ══ Zug 1 — die Falle: der Kästchen-Zweig wird UMGANGEN ═════════════════ */

test('[Kette 03 · Zug 1] die Übersicht kennt einen dritten Fall: eine Kennungs-Liste über Bereichsgrenzen', async () => {
  const V = await heimaufnahmeDepot();
  const m = V.exportUebersichtModell(null, null, KENNUNGEN);
  const alle = m.enthalten.concat(m.zurueckgehalten);
  assert.equal(alle.length, 12, 'genau die zwölf, nicht das ganze Depot');
  assert.ok(new Set(alle.map((e) => e.sektor)).size >= 4, 'über Bereichsgrenzen hinweg');
  assert.ok(m.zurueckgehalten.length > 0, 'und die Sensibel-Prüfung trägt hier genauso');
});

test('[Kette 03 · Zug 1 · Gegenprobe] ohne Kennungs-Liste bleibt die alte Übersicht Zeile für Zeile dieselbe', async () => {
  const V = await heimaufnahmeDepot();
  V.sektorFeldSetzen('housing', 'ownedOrRented', 'Mietwohnung');   // ein Feld AUSSERHALB der Zusammenstellung
  const ganz = V.exportUebersichtModell(null, null);
  const alleGanz = ganz.enthalten.concat(ganz.zurueckgehalten);
  assert.ok(alleGanz.some((e) => e.sektor === 'housing'),
    'das ganze Depot ist unverändert das ganze Depot — auch was der Anlass nicht nennt');
  const nurAnlass = V.exportUebersichtModell(null, null, KENNUNGEN);
  assert.equal(nurAnlass.enthalten.concat(nurAnlass.zurueckgehalten).some((e) => e.sektor === 'housing'), false,
    'und die Kennungs-Liste zeigt genau ihre Felder, nicht das Depot');
  const bereich = V.exportUebersichtModell('health', null);
  assert.ok(bereich.enthalten.concat(bereich.zurueckgehalten).every((e) => e.sektor === 'health'));
});

test('[Kette 03 · Zug 1] der Kästchen-Zweig wird UMGANGEN, nicht wiederbelebt', () => {
  // Am Quelltext geprüft, weil die Weiche eine Bedienform entscheidet, die am 12.08. bewusst
  // abgeschafft wurde: die Kennungs-Liste darf NIE in den `sektorId == null`-Zweig fallen.
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(src, /if \(sektorId == null && !kennungen\) \{/,
    'die Weiche nennt die Kennungs-Liste ausdrücklich — sonst zeigte ein Anlass das ganze Depot als Kästchenliste');
});

/* ══ Zug 6 — B3: die Zuordnung verliert kein Feld still ══════════════════ */

/* DAS BEISPIEL HAT AM 21.08.2026 GEWECHSELT, der Gegenstand nicht. Bis dahin diente ein
   VERSCHACHTELTES Ziel (`tief.verschachtelt`) als der verlorene Fall — seit dem Auftrag
   „Verschachtelte Exportziele" ist genau das gültig und geht nicht mehr verloren. Geprüft wird
   hier aber die MELDUNG des Verlusts, nicht seine Ursache; das Beispiel ist darum auf einen
   verbotenen Pfad (`__proto__.…`) umgestellt, der weiterhin verworfen wird. Die Probe wurde
   nicht gelöscht und nicht weichgemacht — sie hat nur ihren Anlass gewechselt. */
test('[Kette 03 · Zug 6] ein Modul, das bei der Prüfung ein Feld verliert, kommt nicht schlicht als gültig zurück', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'kette03-kanal', richtung: 'export',
    sektor: 'finance', label: 'Probe', leser: 'json',
    zuordnung: [{ feld: 'taxIdsTaxNumbers', ziel: '__proto__.verboten' }, { feld: 'taxIdsTaxNumbers', ziel: 'flach' }] };
  const g = V.formatModulPruefen(modul);
  assert.equal(g.gueltig, true, 'angenommen bleibt es — ein Rest-Modul nützt mehr als eine pauschale Ablehnung');
  assert.equal(g.unvollstaendig, true, 'aber es wird BENANNT (U2-ADR-150 an dieser Stelle)');
  assert.equal(g.verloreneZuordnungen, 1, 'mit der Zahl, sonst hilft die Meldung niemandem');
});

test('[Kette 03 · Zug 6 · Gegenprobe] ein Modul ohne Verlust meldet nichts', () => {
  const { V } = ladeKern();
  const modul = { modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'kette03-sauber', richtung: 'export',
    sektor: 'finance', label: 'Probe', leser: 'json', zuordnung: [{ feld: 'taxIdsTaxNumbers', ziel: 'flach' }] };
  const g = V.formatModulPruefen(modul);
  assert.equal(g.unvollstaendig, false);
  assert.equal(g.verloreneZuordnungen, 0);
});

test('[Kette 03 · Zug 6] der Einlassweg reicht die Unvollständigkeit durch', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const modul = { modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'kette03-einlass', richtung: 'export',
    sektor: 'finance', label: 'Probe', leser: 'json',
    zuordnung: [{ feld: 'taxIdsTaxNumbers', ziel: '__proto__.verboten' }, { feld: 'taxIdsTaxNumbers', ziel: 'flach' }] };
  const r = V.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true);
  assert.equal(r.unvollstaendig, true, 'die Institution erfährt, dass ihr Feld nicht ankam');
  assert.equal(r.verloreneZuordnungen, 1);
});

test('[Kette 03 · Zug 6 · Rot-Beweis] ohne die Zählung ist der Verlust wieder still', async () => {
  const original = fs.readFileSync(HTML_PATH, 'utf8');
  const anker = '  const verloreneZuordnungen = modul.zuordnung.length - zuordnung.length;';
  assert.equal(original.split(anker).length - 1, 1);
  const tmp = path.join(os.tmpdir(), 'kette03-b3-' + process.pid + '.html');
  // ladeKern() bäckt eine Kopie per KERN_HTML_PATH nicht (Schnitt 17.09.2026): ohne Backen kennt
  // sie den Bereich `finance` nicht, formatModulPruefen wäre aus einem ANDEREN Grund ungültig.
  fs.writeFileSync(tmp, _standardProduktBaken(original.replace(anker, '  const verloreneZuordnungen = 0;')));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern({ backen: true });
    const g = V.formatModulPruefen({ modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'x', richtung: 'export',
      sektor: 'finance', label: 'P', leser: 'json',
      zuordnung: [{ feld: 'taxIdsTaxNumbers', ziel: '__proto__.verboten' }, { feld: 'taxIdsTaxNumbers', ziel: 'flach' }] });
    assert.equal(g.unvollstaendig, false, 'mutiert: gültig, und das verlorene Feld schweigt — der Zustand vor diesem Zug');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML_PATH, 'utf8'), original, 'das Original ist unberührt');
});

/* ══ Der Anlass selbst ════════════════════════════════════════════════════ */

test('[Kette 03] der Anlass „Pflegeheim-Aufnahme" liefert seine Kennungs-Liste', () => {
  const { V } = ladeKern();
  const k = V.anlassKennungen('pflegeheimakut');
  assert.ok(k.length >= 18, 'die Liste existiert bereits im Kern — sie wird benutzt, nicht nachgebaut: ' + k.length);
  for (const kk of k) assert.equal(V.kennungPruefen(kk).ok, true, kk + ': führt auf ein echtes Feld');
});

test('[Kette 03] abgeleitete Instrument-Zeilen gehen mit, ohne eine Kennung zu erfinden', () => {
  const { V } = ladeKern();
  const e = V.anlassEintraege('pflegeheimakut');
  const abgeleitet = e.filter((x) => x.abgeleitet);
  assert.ok(abgeleitet.length > 0, 'der Anlass enthält abgeleitete Zeilen (instrument:<typ>)');
  for (const a of abgeleitet) assert.equal(a.kennung, null, 'keine erfundene Kennung — sie haben kein Sektor-Feld');
  assert.equal(V.kennungAusSelektor('advanceCare', 'instrument:enduring-power-of-attorney'), null,
    'und die Brücke erfindet auch keine, statt den Doppelpunkt als Anbieter-Trenner zu lesen');
});
