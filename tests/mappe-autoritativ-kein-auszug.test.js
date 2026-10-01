'use strict';
/* Autoritative Gesundheitsdokumente in der Mappe. Ein autoritativ eingelesenes Gesundheitsdokument (etwa ein Entlassbrief
   über importAutoritativDokument) ist Gesundheitsdatum nach DSGVO Art. 9 und trägt ab dem Import sensibel:true (Entscheidung
   29.09.2026). Vorher setzte der Import das Flag nicht.
   Gemessen am 28.09.2026: auch ohne das Flag gelangte der Brief in keinen Auszug. Ein Fach mit Bereichsbaustein übernimmt
   nur die Felder des Bereichs, nicht die Mappe; eine Anfrage-Antwort nur die gefragten Kennungen; der Vollexport „ohne
   sensible Daten“ trägt den Eintrag nicht. Allein der weite Baustein („erbe“) nimmt die ganze Mappe mit, gleich, wie das
   Flag steht. Er IST die ausdrückliche Freigabe „alles“, und die Markierung hält dort nichts zurück.
   Diese Probe hält beides fest: das Flag nach dem Import, und dass die Markierung den weiten Baustein nicht beschneidet.
   GERÜST-TEST: der Rot-Beweis entfernt die Voreinstellung im QUELLTEXT des Kerns; ausgeführt wird der gebackene Kern. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const HDR = fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-eu-hdr.json'), 'utf8');
const ANFRAGE = Object.freeze({
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Klinik', zweck: 'Probe', grundlage: 'Probe', vorgang: 'MAPPE-PROBE',
  gestelltAm: '2026-09-28', gueltigBis: '2099-12-31',
  felder: [{ kennung: 'health.chronicConditionsDiagnoses', zweck: 'Probe', pflicht: true }],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@probe.example' },
});

async function depotMitBrief(lade) {
  const { V } = (lade || require('./load-kern.js').ladeKern)();
  await V.depotAnlegen('Mappe-Probe-2026!');
  V.akteurSelbstErklaeren('Gerda Beispiel');
  const id = V.importAutoritativDokument(HDR);
  assert.ok(id, 'Vorbedingung: die Fixture wird als autoritatives Gesundheitsdokument erkannt');
  return { V, eintrag: V.getData().mappe.find((m) => m.id === id) };
}
const traegt = (o, e) => JSON.stringify(o || {}).includes(e.inhalt.slice(40, 90));
const weiterBaustein = (V) => V.empfaengerBausteineAlle().filter((b) => b.weit).map((b) => b.id)[0];

test('[Mappe·autoritativ] ein eingelesener Entlassbrief trägt sensibel:true (DSGVO Art. 9)', async () => {
  const { eintrag } = await depotMitBrief();
  assert.equal(eintrag.autoritativ, true);
  assert.equal(eintrag.bereich, 'health');
  assert.equal(eintrag.sensibel, true);
});

test('[Mappe·autoritativ] Fach mit Bereichsbaustein Gesundheit, Anfrage-Antwort, Vollexport ohne Sensibles: der Brief ist in keinem', async () => {
  const { V, eintrag } = await depotMitBrief();
  assert.equal(traegt(V.empfaengerZuschnittModell({ id: 'k1', name: 'Klinik', bausteine: ['bereich:health'] }), eintrag), false, 'Fach Gesundheit');
  assert.equal(traegt(V.anfrageAntwortDatensatz(ANFRAGE, { sensibel: false }), eintrag), false, 'Anfrage-Antwort');
  const x = V.vollExportJSON({ sensibel: false });
  assert.equal(traegt(typeof x === 'string' ? JSON.parse(x) : x, eintrag), false, 'Vollexport ohne sensible Daten');
});

test('[Mappe·autoritativ] der weite Baustein („erbe“) trägt den Brief trotz sensibel:true — die Markierung hält dort nichts zurück', async () => {
  const { V, eintrag } = await depotMitBrief();
  const weit = weiterBaustein(V);
  assert.ok(weit, 'es gibt einen weiten Baustein');
  assert.equal(eintrag.sensibel, true);
  assert.equal(traegt(V.empfaengerZuschnittModell({ id: 'k2', name: 'Alles', bausteine: [weit] }), eintrag), true);
});

test('[Mappe·autoritativ·Rot-Beweis] ohne die Voreinstellung im Import trägt der Brief wieder sensibel:false', async () => {
  const original = fs.readFileSync(KERN, 'utf8');
  const anker = '    sensibel: true,\n    autoritativ: true,\n    aussteller: _medDokAussteller(bundle),';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: die Voreinstellung steht genau einmal im Kern');
  const tmp = path.join(os.tmpdir(), 'mappe-sensibel-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, anker.replace('    sensibel: true,\n', '')));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const lade = (o) => require('./load-kern.js').ladeKern(Object.assign({ backen: true }, o || {}));
    const { eintrag } = await depotMitBrief(lade);
    assert.equal(eintrag.sensibel, false, 'genau der alte Stand: der Import setzt das Flag nicht');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
});

/* ── Klassenwächter: wer liest `sensibel` an einem Mappe-Eintrag? ─────────────────────────────────────────────────────
   Die Markierung filtert heute keinen Ausgabeweg (gemessen 29.09.2026), darum gibt es keine Migration für den Altbestand:
   vor v832 eingelesene Gesundheitsdokumente tragen sensibel:false. Das ist nur sicher, solange es so bleibt. Filtert später
   ein Ausgabeweg nach der Markierung, gingen genau diese alten Einträge hinaus. Dieser Wächter findet jede Kern-Funktion,
   die mit Mappe-Einträgen umgeht und `.sensibel` liest, und hält sie gegen eine gemessene Liste. Kommt eine hinzu, ist die
   Frage zu beantworten, BEVOR sie landet: Wertet sie die Markierung für einen Ausgabeweg aus, braucht der Altbestand eine
   Migration (Schema-Reservierung, Migrationsschritt, der autoritative Gesundheits-Einträge auf sensibel:true hebt) — erst
   dann gehört sie in die Liste. Nur-Anzeige oder Schreiben darf mit Begründung hinein. */
const LESER_GEMESSEN = Object.freeze({
  mappeEintragHinzufuegen: 'schreibt das Flag beim Anlegen (Voreinstellung), liest es nicht für eine Ausgabe',
  mappeListeHTML: 'zeigt die Markierung in der Mappe-Liste an, gibt nichts heraus',
});
function kommentareLeeren(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}
function mappeSensibelLeser(src) {
  const ohne = kommentareLeeren(src);
  const re = /\n(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const starts = [];
  let m;
  while ((m = re.exec(ohne))) starts.push({ name: m[1], at: m.index });
  const raus = [];
  for (let i = 0; i < starts.length; i++) {
    const rumpf = ohne.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : ohne.length);
    if (/\bmappe\b|\.mappe\b|mappeEintrag/.test(rumpf) && /\.sensibel\b/.test(rumpf)) raus.push(starts[i].name);
  }
  return raus;
}

test('[Mappe·sensibel·Klasse] jede Funktion, die sensibel an Mappe-Einträgen liest, steht mit Begründung in der gemessenen Liste', () => {
  const neu = mappeSensibelLeser(fs.readFileSync(KERN, 'utf8')).filter((n) => !Object.prototype.hasOwnProperty.call(LESER_GEMESSEN, n));
  assert.deepEqual(neu, [], 'Neuer Leser der Mappe-Markierung: ' + neu.join(', ') + '. Wertet er sie für einen Ausgabeweg aus, '
    + 'braucht der Altbestand (vor v832 eingelesene Gesundheitsdokumente, sensibel:false) zuerst eine Migration; dann erst hier eintragen.');
});

test('[Mappe·sensibel·Klasse·Rot-Beweis] ein gepflanzter Ausgabeweg, der nach der Markierung filtert, wird gefunden', () => {
  const kern = fs.readFileSync(KERN, 'utf8');
  const gepflanzt = kern.replace('\nfunction mappeEintragHinzufuegen(',
    '\nfunction _gepflanzterExport() { return (data.mappe || []).filter((m) => !m.sensibel); }\nfunction mappeEintragHinzufuegen(');
  assert.notEqual(gepflanzt, kern, 'Vorbedingung: der Anker steht im Kern');
  assert.ok(mappeSensibelLeser(gepflanzt).includes('_gepflanzterExport'));
});
