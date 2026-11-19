'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Freigabe mit Häkchen in Gruppen (Entscheidung 17.11.2026; ersetzt für die Herausgabe die Liste ohne Kästchen vom 12.08.2026)
   ───────────────────────────────────────────────────────────────────────────
   Ein Dialog für alle Wege (Bereich, Kennungen, Anlass, Anfrage), je Punkt eine Aussage am gerenderten Fenster:
   · [Häkchen·P1] Über der Liste: „Markierte Angaben werden an {stelle} gesendet.“, ohne Stelle „Markierte Angaben werden gesendet.“
   · [Häkchen·P2] Je Angabe ein Häkchen mit Label; angehakt geht mit.
   · [Häkchen·P3] Gruppen aufklappbar, mehrere offen; Gruppen-Häkchen mit aria-checked true/false/mixed und „x von y“.
     Beim Anlass sind die Gruppen seine Blöcke; ein Block ohne Angabe steht gesperrt mit „fehlt noch“ (D91).
   · [Häkchen·P4] Vorausgewählt ist, was der Weg verlangt; Sensibles nicht. Ausnahme Arzttermin (Entscheidung 17.11.2026: „Beim Arzttermin
     soll alles angehakt sein, was für eine Anamnese notwendig ist.“). Die Regel steht an einer Stelle: herausgabeVorausgewaehlt.
   · [Häkchen·P5] Über dem Knopf: „N Angaben gehen mit, M nicht.“; bei N = 0 ist „Herausgeben“ gesperrt.
   · [Häkchen·P6] WAI-ARIA APG: natives Häkchen mit <label for>, Gruppen-Häkchen role=checkbox mit Leertaste, Gruppe als <details>.
   ROT-BEWEIS: je Punkt ein gepflanzter alter Zustand, der rot werden muss.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'haekchen-gruppen-pw-2026';
const HTML = path.join(__dirname, '..', 'vivodepot.html');
const SENSIBEL = { chronicConditionsDiagnoses: 'MARKE-Rheuma', allergiesMedicationFoodOther: 'MARKE-Penicillin', medicationOngoing: 'MARKE-Methotrexat' };

async function depot(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elena Beispiel');
  for (const [feld, marke] of Object.entries(SENSIBEL)) V.sektorFeldSetzen('health', feld, [{ text: marke }]);
  return V;
}
function fenster(V, fn) {
  const modale = [];
  const echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(); } finally { V.ui.modal = echt; }
  assert.ok(modale.length >= 1, 'ein Fenster öffnet sich');
  return modale[modale.length - 1];
}
const haken = (html) => [...String(html).matchAll(/<input type="checkbox" class="export-haken" id="([^"]+)" data-sektor="([^"]+)" data-feld="([^"]+)"( checked)?>/g)]
  .map((m) => ({ id: m[1], schluessel: m[2] + '/' + m[3], an: !!m[4] }));
const angehakt = (html) => haken(html).filter((h) => h.an).map((h) => h.schluessel);
const kennungenSensibel = (V) => Object.keys(SENSIBEL).map((f) => V.anlassKennungen('arzt').find((k) => V.kennungZuSelektor(k).feldId === f));

/* Die Prüfungen je Punkt: true, wenn gebaut. */
const P = {
  P1: ({ S, mitStelle, ohneStelle }) => mitStelle.includes('<p class="export-haekchen-satz">' + S.exportHaekchenSatzStelle.replace('{stelle}', 'Praxis Dr. Beispiel') + '</p>')
    && ohneStelle.includes('<p class="export-haekchen-satz">' + S.exportHaekchenSatz + '</p>'),
  P2: ({ anlass }) => haken(anlass).length >= 3 && haken(anlass).every((h) => new RegExp('<label for="' + h.id + '">').test(anlass)),
  P3: ({ anlass, S }) => {
    const koepfe = [...anlass.matchAll(/<span class="export-gruppen-haken" role="checkbox"[^>]*aria-checked="(true|false|mixed)"/g)];
    const zahl = new RegExp('<span class="export-gruppe-zahl">\\d+ ' + S.exportZaehlzeileTeil1 + ' \\d+</span>').test(anlass);
    const fehlt = anlass.includes('<span class="export-gruppe-zahl">' + S.exportGruppeFehltNoch + '</span>') && /aria-disabled="true"/.test(anlass);
    return koepfe.length >= 2 && zahl && fehlt && /<details class="export-gruppe"/.test(anlass);
  },
  P4: ({ arztAn, kennungenAn }) => Object.keys(SENSIBEL).every((f) => arztAn.includes('health/' + f)) && !Object.keys(SENSIBEL).some((f) => kennungenAn.includes('health/' + f)),
  P5: ({ S, null0, anlass }) => null0.html.includes('id="export-zusammenfassung" aria-live="polite">' + S.exportZusammenfassung.replace('{n}', '0').replace('{m}', '3') + '<')
    && null0.gesperrt && /id="export-zusammenfassung"/.test(anlass),
  P6: ({ anlass, quelle }) => /role="checkbox" tabindex="0"/.test(anlass) && /<summary class="export-gruppe-kopf">/.test(anlass)
    && /ev\.key === ' '/.test(quelle) && !/mehrere offen[^]*?andere\.open = false/.test(quelle),
};

async function lage(V) {
  V = await depot(V);
  const S = V.STRINGS;
  const anlass = fenster(V, () => V.flowAnlassExport('arzt')).koerperHTML;
  const kenn = kennungenSensibel(V);
  const mitStelle = fenster(V, () => V.flowExportUebersicht({ kennungen: kenn, stelle: 'Praxis Dr. Beispiel', titel: 'Probe', aufFortfahren: () => {} })).koerperHTML;
  const ohne = fenster(V, () => V.flowExportUebersicht({ kennungen: kenn, titel: 'Probe', aufFortfahren: () => {} }));
  // P5: „0 gehen mit“ → der Hauptknopf gibt nichts heraus.
  let raus = 0;
  const f0 = fenster(V, () => V.flowExportUebersicht({ kennungen: kenn, titel: 'Probe', aufFortfahren: () => { raus++; } }));
  await f0.onPrimaer(() => {});
  return { V, S, anlass, mitStelle, ohneStelle: ohne.koerperHTML, arztAn: angehakt(anlass), kennungenAn: angehakt(ohne.koerperHTML),
    null0: { html: f0.koerperHTML, gesperrt: raus === 0 }, quelle: fs.readFileSync(HTML, 'utf8') };
}

test('[Häkchen·P1–P6] jeder Punkt der Entscheidung ist gebaut', async () => {
  const l = await lage(ladeKern().V);
  const fehlt = Object.entries(P).filter(([, pruefe]) => !pruefe(l)).map(([k]) => k);
  assert.deepEqual(fehlt, []);
});

test('[Häkchen·P4] die Regel an einer Stelle: nicht sensibel immer, sensibel nur im Zweck des Arzttermins', () => {
  const { V } = ladeKern();
  assert.equal(V.herausgabeVorausgewaehlt(false, false, null), true);
  assert.equal(V.herausgabeVorausgewaehlt(true, false, null), false, 'Sensibles ohne Anlass: nicht angehakt');
  assert.equal(V.herausgabeVorausgewaehlt(true, true, 'geburt'), false, 'Sensibles beim anderen Anlass: nicht angehakt');
  assert.equal(V.herausgabeVorausgewaehlt(true, false, 'arzt'), false, 'Sensibles außerhalb des Zwecks: nicht angehakt');
  assert.equal(V.herausgabeVorausgewaehlt(true, true, 'arzt'), true, 'Arzttermin, Anamnese: angehakt');
});

test('[Häkchen·P2] Abhaken nimmt eine Angabe aus der Herausgabe; die Wahl geht in den Datensatz', async () => {
  const V = await depot(ladeKern().V);
  const kennungen = V.anlassKennungen('arzt');
  let ds = null;
  const f = fenster(V, () => V.flowExportUebersicht({ kennungen, titel: 'Probe', vorauswahl: V.anlassZweckFelder('arzt'), vorauswahlAnlassId: 'arzt',
    aufFortfahren: (o) => { ds = V.zusammenstellungDatensatz(kennungen, null, o); } }));
  await f.onPrimaer(() => {});
  assert.ok(ds, 'die Herausgabe lief');
  for (const m of Object.values(SENSIBEL)) assert.ok(JSON.stringify(ds).includes(m), m + ' geht beim Arzttermin mit');
});

test('[Häkchen·P5] eine Angabe: Einzahl in der Zusammenfassung', async () => {
  const V = await depot(ladeKern().V);
  const f = fenster(V, () => V.flowExportUebersicht({ kennungen: kennungenSensibel(V), zuwahl: [kennungenSensibel(V)[0]], titel: 'Probe', aufFortfahren: () => {} }));
  assert.ok(f.koerperHTML.includes(V.STRINGS.exportZusammenfassungEinzahl.replace('{n}', '1').replace('{m}', '2')), 'Einzahl: ' + f.koerperHTML.slice(-300));
});

/* ── Rot-Beweise ── */
const PFLANZEN = {
  P1: ['    h += \'<p class="export-haekchen-satz">\'', () => '    h += \'<p class="alt">\''],
  P3: ['  for (const g of ((opt && Array.isArray(opt.gruppen)) ? opt.gruppen : [])) {\n', () => '  for (const g of []) {\n'],
  P4: ["const HERAUSGABE_SENSIBLE_VORAUSGEWAEHLT_BEI = Object.freeze(['arzt']);", () => 'const HERAUSGABE_SENSIBLE_VORAUSGEWAEHLT_BEI = Object.freeze([]);'],
  P5: ['      onPrimaer: (schliessen) => (mitZahl() > 0 ? ausgeben(schliessen) : undefined) };', () => '      onPrimaer: ausgeben };'],
};
function gepflanzt(art) {
  const original = fs.readFileSync(HTML, 'utf8');
  const [anker, ersatz] = PFLANZEN[art];
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal: ' + anker);
  const tmp = path.join(os.tmpdir(), 'haekchen-gruppen-' + art + '-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ersatz(anker)));
  try { return ladeKern({ htmlPfad: tmp, backen: true }).V; } finally { fs.rmSync(tmp, { force: true }); }
}

for (const art of Object.keys(PFLANZEN)) {
  test('[Häkchen·Rot-Beweis] ' + art + ' gepflanzt → rot', async () => {
    const l = await lage(gepflanzt(art));
    assert.equal(P[art](l), false, art + ' muss am gepflanzten Kern rot sein');
  });
}

test('[Häkchen·Rot-Beweis] P2/P6 an gepflanztem HTML', async () => {
  const l = await lage(ladeKern().V);
  assert.equal(P.P2(Object.assign({}, l, { anlass: l.anlass.replace(/<label for="[^"]+">/g, '<span>') })), false, 'ohne Label → rot');
  assert.equal(P.P6(Object.assign({}, l, { anlass: l.anlass.replace(/role="checkbox" tabindex="0"/g, 'role="button"') })), false, 'ohne role=checkbox → rot');
});

/* Die Häkchen tragen dynamische IDs (exp-haken-<nr> in der Übersicht, anfrage-haken-<kennung> in der Anfrage-Ansicht), damit das
   Label über `for` an seinem Häkchen hängt. Zugelassen sind sie nur, wenn sie zur Laufzeit je Seite eindeutig sind: diese Probe
   rendert beide Ansichten und zählt. Gegenprobe: zwei gleiche IDs im Markup fallen durch. */
const idsDoppelt = (html) => {
  const ids = [...String(html).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  return ids.filter((id, i) => ids.indexOf(id) !== i);
};
test('[Häkchen·IDs] exp-haken und anfrage-haken sind zur Laufzeit je Seite eindeutig', async () => {
  const l = await lage(ladeKern().V);
  for (const [name, html] of [['Anlass', l.anlass], ['mit Stelle', l.mitStelle], ['ohne Stelle', l.ohneStelle]]) {
    assert.ok((html.match(/id="exp-haken-\d+"/g) || []).length >= 3, name + ': Vorbedingung, mindestens drei Häkchen');
    assert.deepEqual(idsDoppelt(html), [], name + ': keine ID doppelt');
  }
  const { V, document } = ladeKern();
  await depot(V);
  const kenn = kennungenSensibel(V);
  const anfrage = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Praxis am Probenweg', zweck: 'Erstaufnahme', grundlage: 'Behandlungsvertrag',
    vorgang: 'IDS-1', gestelltAm: '2026-11-17', gueltigBis: '2099-12-31', felder: kenn.map((k) => ({ kennung: k, zweck: 'Anamnese', pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'aufnahme@praxis.example.invalid' } };
  const m = V.anfrageMerken(V.anfrageAusText(JSON.stringify(anfrage)), null);
  assert.equal(m.ok, true, 'Vorbedingung: die Anfrage ist angenommen');
  V.oeffneAnfrage(m.eintrag.id);
  const seite = document.getElementById('content').innerHTML;
  assert.equal((seite.match(/id="anfrage-haken-[^"]+"/g) || []).length, kenn.length, 'je vorhandener Angabe ein Häkchen mit eigener ID');
  assert.deepEqual(idsDoppelt(seite), [], 'Anfrage-Ansicht: keine ID doppelt');
  assert.deepEqual(idsDoppelt(seite + ' ' + seite.match(/id="anfrage-haken-[^"]+"/)[0]), [seite.match(/id="anfrage-haken-([^"]+)"/)[0].slice(4, -1)],
    'Gegenprobe: eine zweite gleiche ID fällt auf');
});
