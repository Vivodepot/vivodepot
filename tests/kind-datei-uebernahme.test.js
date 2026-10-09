'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kind-Datei — das Kind übernimmt sein Sub-Depot ohne Mitwirkung der Eltern (U2-ADR-454)
   ────────────────────────────────────────────────────────────────────────
   Das Versprechen: „Ihr Kind kann es später übernehmen, ohne dass Sie mitwirken
   müssen.“ Mitwirken heisst: einmal beim Einrichten, nicht beim Übernehmen
   (Produktentscheidung 29.09.2026).

   Jede Probe hier läuft den Weg des Kindes ALLEIN: ein frischer Kern ohne
   Anker-Sitzung, nur die geschriebene Kind-Datei und das Sub-Passwort.

   ROT-BEWEIS: gegen den Kern vor diesem Bau fehlen `kindDateiEinrichten`,
   `kindDateienMitschreiben` und `KIND_DATEI_ORTE` — jede Probe fällt. Die
   Klassenprobe am Ende fällt, sobald ein Text „ohne mitwirken“ verspricht, ohne
   hier eine Probe zu haben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'Anker-Kind-Datei-2026!';
const SUB_PW = 'Sub-Kind-Datei-2026!';

// Ein Datei-Picker, der mitschreibt: jedes Handle hält, was zuletzt hineingeschrieben wurde.
function fsaMitschrieb() {
  const handles = [];
  let aufrufe = 0;
  const showSaveFilePicker = async (opt) => {
    aufrufe++;
    const h = {
      name: (opt && opt.suggestedName) || 'x', inhalt: null, schreibvorgaenge: 0,
      getFile: async () => ({ size: h.inhalt == null ? 0 : h.inhalt.length, text: async () => h.inhalt || '' }),   // wie ein echtes Handle
      createWritable: async () => {
        const teile = [];
        return { write: async (b) => { teile.push(typeof b === 'string' ? b : await b.text()); },
          close: async () => { h.inhalt = teile.join(''); h.schreibvorgaenge++; } };
      },
    };
    handles.push(h);
    return h;
  };
  return { showSaveFilePicker, handles, aufrufe: () => aufrufe };
}

async function elternMitKind(opts) {
  const k = ladeKern(Object.assign({ Blob }, opts || {}));
  const { V } = k;
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  return { ...k, e };
}

// Das Kind allein: frischer Kern, keine Anker-Sitzung, nur Datei + eigenes Passwort.
async function kindOeffnet(dateiText) {
  const { V } = ladeKern();
  assert.equal(V.getData(), null, 'Vorbedingung: das Kind hat keine Sitzung der Eltern');
  const roh = JSON.parse(dateiText);
  await V.depotLaden(V.umschlagEntpacken(roh), SUB_PW);
  return V;
}

async function imSubSetzen(V, uuid, feld, wert) {
  await V.subDepotVertrauenOeffnen(uuid, SUB_PW);
  V.subKontextBetreten(uuid);
  V.sektorFeldSetzen('identity', feld, wert);
  await V.subKontextVerlassen();                 // versiegelt die Bearbeitung in den Umschlag
}

test('[Kind-Datei·1] einmal eingerichtet, öffnet das Kind die Datei allein als eigenes Depot', async () => {
  const fsa = fsaMitschrieb();
  const { V, e } = await elternMitKind({ showSaveFilePicker: fsa.showSaveFilePicker });
  await imSubSetzen(V, e.depotUUID, 'givenName', 'Lea');

  assert.equal(await V.kindDateiEinrichten(e.depotUUID, 'datei'), 'geschrieben');
  assert.equal(fsa.aufrufe(), 1, 'genau eine Geste: der Ort wird einmal gewählt');
  const h = fsa.handles[0];
  assert.ok(h.inhalt, 'die Kind-Datei ist geschrieben');
  assert.doesNotMatch(h.name, /Lea/, 'der Dateiname nennt die Person nicht');

  const eintrag = V.ankerDaten().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID);
  assert.equal(eintrag.kindDatei.ort, 'datei');
  assert.equal(eintrag.kindDatei.ziel, null, 'ein Datei-Handle überdauert die Sitzung nicht (U2-ADR-031)');
  assert.ok(eintrag.delegationsGeschichte.some((g) => g.art === 'kind-datei-eingerichtet'), 'das Einrichten steht im Verlauf');

  const kind = await kindOeffnet(h.inhalt);
  assert.equal(kind.getData().sektoren.identity.givenName, 'Lea', 'das Kind sieht seine Daten ohne die Eltern');
});

test('[Kind-Datei·2] danach zieht jedes Sichern der Sitzung die Kind-Datei still nach, ohne neue Geste', async () => {
  const fsa = fsaMitschrieb();
  const { V, e } = await elternMitKind({ showSaveFilePicker: fsa.showSaveFilePicker });
  await V.kindDateiEinrichten(e.depotUUID, 'datei');
  const h = fsa.handles[0];
  assert.equal(h.schreibvorgaenge, 1);

  await imSubSetzen(V, e.depotUUID, 'givenName', 'Lea-Marie');
  V.markiereGespeichert();                        // ein gelungenes Sichern stösst das Mitschreiben an
  await V.kindDateienMitschreiben();
  assert.equal(fsa.aufrufe(), 1, 'kein zweiter Picker: dasselbe Handle der Sitzung');
  assert.equal(h.schreibvorgaenge, 2, 'die Kind-Datei ist nachgezogen');
  const eintrag = V.ankerDaten().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID);
  assert.equal(V.kindDateiVeraltet(eintrag), false, 'der festgehaltene Stand ist der jetzige');

  const kind = await kindOeffnet(h.inhalt);
  assert.equal(kind.getData().sektoren.identity.givenName, 'Lea-Marie', 'das Kind bekommt den neuen Stand');
});

test('[Kind-Datei·3] ohne Ziel in der Sitzung schreibt nichts still — das Prüfblatt sagt es, ein Klick zieht nach', async () => {
  const fsa = fsaMitschrieb();
  const { V, e } = await elternMitKind({ showSaveFilePicker: fsa.showSaveFilePicker });
  await V.kindDateiEinrichten(e.depotUUID, 'datei');
  V._kindDateiSitzungsZiele.clear();              // neue Sitzung: das Handle ist fort

  await imSubSetzen(V, e.depotUUID, 'givenName', 'Neu');
  V.markiereGespeichert();
  assert.equal(await V.kindDateienMitschreiben(), 0, 'nichts geschrieben — es gibt kein Ziel ohne Geste');
  const zeile = V.prueftermineAlle(new Date()).find((t) => t.id === 'kind-datei-' + e.depotUUID);
  assert.ok(zeile, 'das Prüfblatt zeigt die ältere Kind-Datei');
  assert.match(zeile.name, /Lea/);

  assert.equal(await V.kindDateiAktualisieren(e.depotUUID), 'geschrieben');
  assert.equal(fsa.aufrufe(), 2, 'ein Klick je Sitzung, wie bei der Anker-Datei');
  assert.ok(!V.prueftermineAlle(new Date()).some((t) => t.id === 'kind-datei-' + e.depotUUID), 'nach dem Nachziehen ist die Zeile weg');
  const kind = await kindOeffnet(fsa.handles[1].inhalt);
  assert.equal(kind.getData().sektoren.identity.givenName, 'Neu');
});

test('[Kind-Datei·4] ohne Datei-Picker (Safari, iOS) wird ausgegeben und nie still geschrieben', async () => {
  const gefangen = [];
  const { V, e } = await elternMitKind({ Blob, ausgabeErfassen: (x) => gefangen.push(x) });
  assert.equal(V.kindDateiOrtVorschlag(), 'ausgabe');
  assert.equal(await V.kindDateiEinrichten(e.depotUUID), 'geschrieben');
  assert.equal(gefangen.length, 1, 'die Kind-Datei ist ausgegeben');
  await imSubSetzen(V, e.depotUUID, 'givenName', 'Später');
  V.markiereGespeichert();
  assert.equal(await V.kindDateienMitschreiben(), 0, 'eine Ausgabe braucht immer eine Geste');
  assert.equal(gefangen.length, 1);
  assert.ok(V.prueftermineAlle(new Date()).some((t) => t.id === 'kind-datei-' + e.depotUUID), 'die Erinnerung steht');
  const kind = await kindOeffnet(await gefangen[0].blob.text());
  assert.ok(kind.getData(), 'auch die ausgegebene Datei öffnet das Kind allein');
});

test('[Kind-Datei·5] nach dem Abgeben gibt es keine Kind-Datei und keine Erinnerung mehr', async () => {
  const fsa = fsaMitschrieb();
  const { V, e } = await elternMitKind({ showSaveFilePicker: fsa.showSaveFilePicker });
  await V.kindDateiEinrichten(e.depotUUID, 'datei');
  V._kindDateiSitzungsZiele.clear();
  await imSubSetzen(V, e.depotUUID, 'givenName', 'X');
  V.subDepotAushaengen(e.depotUUID, { absicht: 'abgeben' });
  assert.ok(!V.prueftermineAlle(new Date()).some((t) => t.id === 'kind-datei-' + e.depotUUID));
  await assert.rejects(() => V.kindDateiEinrichten(e.depotUUID, 'datei'), /nicht mehr verwaltet/);
});

test('[Kind-Datei·6] jeder Ort erfüllt dieselbe Schnittstelle — ein weiterer (Solid Pod) dockt ohne Umbau an', () => {
  const { V } = ladeKern();
  const orte = V.KIND_DATEI_ORTE;
  assert.deepEqual(Object.keys(orte).sort(), ['ausgabe', 'datei']);
  for (const [name, ort] of Object.entries(orte)) {
    for (const f of ['verfuegbar', 'einrichten', 'sitzungsbereit', 'schreiben']) {
      assert.equal(typeof ort[f], 'function', name + '.' + f + ' fehlt');
    }
  }
});

/* ── Klasse: kein Text verspricht „ohne mitwirken“, ohne dass hier der Weg des Kindes läuft ── */
const VERSPRECHEN = /ohne dass Sie mitwirken|without (needing you|your involvement)/i;
const GEHALTEN = {
  // Kennung → die Probe, die den Weg allein durchläuft
  'strings:gebwizSubDepotVorschlagText.text': '[Sub-Selbst·1] — Passwort selbst ändern',
  'strings:kindDateiHinweis.text': '[Kind-Datei·1]',
};
test('[Kind-Datei·Klasse] jede Kennung, die „ohne mitwirken“ verspricht, hat eine Probe des Alleinwegs', () => {
  for (const datei of ['textsatz-de-modul.json', 'textsatz-en-modul.json']) {
    const texte = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', datei), 'utf8')).texte;
    const treffer = Object.keys(texte).filter((k) => VERSPRECHEN.test(String(texte[k])));
    assert.ok(treffer.length >= 1, datei + ': Vorbedingung — mindestens ein Versprechen gefunden (sonst prüft die Probe nichts)');
    for (const k of treffer) assert.ok(GEHALTEN[k], datei + ': ' + k + ' verspricht „ohne mitwirken“ ohne Probe des Alleinwegs');
  }
});

test('[Kind-Datei·7] der Dialog sagt, was die Kind-Datei ist und wo ihre Grenze liegt, und schreibt auf einen Klick', async () => {
  const fsa = fsaMitschrieb();
  const { V, document: dok, e } = await elternMitKind({ showSaveFilePicker: fsa.showSaveFilePicker });
  V.flowKindDateiEinrichten(e.depotUUID);
  const html = dok.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes(V.STRINGS.kindDateiHinweis.replaceAll('{name}', 'Lea')), 'der Hinweis mit dem Weg des Kindes steht im Dialog');
  assert.ok(html.includes(V.STRINGS.kindDateiGrenze.replaceAll('{name}', 'Lea')), 'die ehrliche Grenze steht im Dialog');
  await dok.getElementById('m-ok').onclick();
  for (let i = 0; i < 100 && !fsa.handles.length; i++) await new Promise((r) => setTimeout(r, 10));
  for (let i = 0; i < 100 && !(fsa.handles[0] && fsa.handles[0].inhalt); i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(fsa.handles[0] && fsa.handles[0].inhalt, 'ein Klick hat die Kind-Datei geschrieben');
});
