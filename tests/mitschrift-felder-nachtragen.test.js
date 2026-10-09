'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Posten 54 (Entscheidung 23.09.2026): fehlende Feldbeschreibungen werden beim Öffnen in die Mitschrift nachgetragen
   ────────────────────────────────────────────────────────────────────────────
   Die Mitschrift (`abWerkMitschrift.bereich`) entsteht beim Anlegen und ist für die Lese-App die einzige Quelle der
   Bereichsdefinitionen. Bekommt ein Bereich später ein Feld, füllt der Kern es — die Lese-App derselben Datei kannte es
   nicht. Entschieden: beim Öffnen werden fehlende Sektionen und Felder aus dem öffnenden Produkt ergänzt, Bestehendes wird
   nie verändert. Gemessen an einem ECHT konfektionierten pro-de:
   (1) eine Datei, deren Mitschrift ein Feld und eine Sektion noch nicht kennt, trägt beide nach dem Öffnen, mit
       Beschriftung; die Lese-App zeigt den Wert, kein „nicht dargestellt";
   (2) alles, was in der Mitschrift schon stand, ist byte-gleich;
   (3) idempotent: ein zweites Öffnen ändert nichts;
   (4) ein Bereich, den die Mitschrift nicht führt, wird nur nachgetragen, wenn die Datei Werte in ihm trägt.
   Rot-Beweis: vor dem Bau scheitert (1) (gemessen: Feld fehlt in der Mitschrift, Lese-App meldet es als nicht dargestellt).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { ladeLesen } = require('./load-lesen.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Mitschrift-Nachtragen-2026';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mitschrift-nachtragen-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const BEREICH = 'pro-vertretung-vollmachten';
const FELD = 'tpl_registernummer';

let gebaut = null;
function kern() {
  if (!gebaut) {
    const p = VP.PRODUKTE.find((x) => x.slug === 'pro-de');
    const r = konfektionieren({
      ziel: path.join(TMP, 'pro-de'), slug: 'pro-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: VP.modulDateienFuer(p),
    });
    gebaut = path.join(r.ordner, 'vivodepot.html');
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut;
  delete require.cache[LOAD_KERN];
  // `blank`: das Produkt ist oben schon konfektioniert, ladeKern backt nichts dazu (tests/kern-html-path-absicht.test.js).
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}
const bereichIn = (mitschrift, id) => {
  for (const m of mitschrift || []) if (m && m.bereiche && m.bereiche[id]) return m.bereiche[id];
  return null;
};
const feldIn = (def, feldId) => (def.sektionen || []).flatMap((s) => s.felder || []).find((f) => f && f.id === feldId) || null;

/* Eine Datei „aus einem älteren Produkt": ihre Mitschrift kennt FELD und die letzte Sektion von BEREICH noch nicht. */
async function alteDatei() {
  const { V } = kern();
  await V.depotAnlegen(PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  V.sektorFeldSetzen(BEREICH, FELD, 'HRB 4711');
  const umschlag = await V.depotSerialisieren();
  const d = JSON.parse(JSON.stringify(V.getData()));
  const def = bereichIn(d.abWerkMitschrift.bereich, BEREICH);
  for (const s of def.sektionen) s.felder = s.felder.filter((f) => f.id !== FELD);
  const letzte = def.sektionen.pop();
  return { V, umschlag, d, letzte };
}
/* Die präparierte Mitschrift in den Umschlag zurück: über den Kern selbst (setData + Serialisieren). */
async function mitMitschrift(V, d) {
  const aktuell = V.getData();
  aktuell.abWerkMitschrift = JSON.parse(JSON.stringify(d.abWerkMitschrift));
  return JSON.parse(JSON.stringify(await V.depotSerialisieren()));
}
async function oeffnen(umschlag) {
  const k = kern();
  await k.V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  return k.V;
}

test('[Nachtragen] fehlendes Feld und fehlende Sektion stehen nach dem Öffnen in der Mitschrift, mit Beschriftung; die Lese-App zeigt den Wert', async () => {
  const { V, d, letzte } = await alteDatei();
  assert.equal(feldIn(bereichIn(d.abWerkMitschrift.bereich, BEREICH), FELD), null, 'Vorbedingung: die alte Mitschrift kennt das Feld nicht');
  const neu = await oeffnen(await mitMitschrift(V, d));
  const def = bereichIn(neu.getData().abWerkMitschrift.bereich, BEREICH);
  const feld = feldIn(def, FELD);
  assert.ok(feld, 'das Feld ist nachgetragen');
  assert.ok(typeof feld.label === 'string' && feld.label.trim(), 'mit Beschriftung');
  assert.ok(def.sektionen.some((s) => s.id === letzte.id), 'die Sektion ist nachgetragen');

  const L = ladeLesen({ ohneSaat: true }).V;
  L.setData(L._foldVollmachtenLesen(JSON.parse(JSON.stringify(neu.getData()))));
  assert.deepEqual(JSON.parse(JSON.stringify(L._darstellungsLuecken())).felder, [], 'kein „nicht dargestellt"');
  assert.ok(String(L.sektorHTML(BEREICH)).includes('HRB 4711'), 'die Lese-App zeigt den Wert');
});

test('[Byte-gleich] was in der Mitschrift schon stand, bleibt unverändert; nur angehängt wird', async () => {
  const { V, d } = await alteDatei();
  const neu = await oeffnen(await mitMitschrift(V, d));
  const nach = neu.getData().abWerkMitschrift.bereich;
  assert.equal(nach.length >= d.abWerkMitschrift.bereich.length, true);
  d.abWerkMitschrift.bereich.forEach((m, i) => {
    for (const [id, alt] of Object.entries(m.bereiche || {})) {
      const jetzt = nach[i].bereiche[id];
      const { sektionen: altS, ...altRest } = alt;
      const { sektionen: neuS, ...neuRest } = jetzt;
      assert.deepEqual(neuRest, altRest, id + ': Bereichskopf unverändert');
      altS.forEach((s, j) => {
        const { felder: altF, ...sRest } = s;
        const { felder: neuF, ...nRest } = neuS[j];
        assert.deepEqual(nRest, sRest, id + '#' + s.id + ': Sektionskopf unverändert, gleiche Stelle');
        assert.deepEqual(neuF.slice(0, altF.length), altF, id + '#' + s.id + ': vorhandene Felder unverändert, gleiche Stelle');
      });
    }
  });
  assert.deepEqual(neu.getData().abWerkMitschrift.sprache, d.abWerkMitschrift.sprache, 'Fach sprache unverändert');
});

test('[Idempotent] ein zweites Öffnen ändert die Mitschrift nicht mehr', async () => {
  const { V, d } = await alteDatei();
  const einmal = await oeffnen(await mitMitschrift(V, d));
  const nach1 = JSON.stringify(einmal.getData().abWerkMitschrift);
  const zweimal = await oeffnen(JSON.parse(JSON.stringify(await einmal.depotSerialisieren())));
  assert.equal(JSON.stringify(zweimal.getData().abWerkMitschrift), nach1);
});

test('[Fremder Bereich] ein Bereich, den die Mitschrift nicht führt, wird nur nachgetragen, wenn die Datei Werte in ihm trägt', async () => {
  const { V, d } = await alteDatei();
  for (const m of d.abWerkMitschrift.bereich) if (m.bereiche) delete m.bereiche['pro-kontakte-vertretungsplan'];
  const leer = await oeffnen(await mitMitschrift(V, d));
  assert.equal(bereichIn(leer.getData().abWerkMitschrift.bereich, 'pro-kontakte-vertretungsplan'), null, 'ohne Werte: nicht nachgetragen');

  V.sektorFeldSetzen('pro-aufbewahrung-ordnung', 'tpl_depot_zuletzt_durchgesehen_am', '2026-10-02');
  for (const m of d.abWerkMitschrift.bereich) if (m.bereiche) delete m.bereiche['pro-aufbewahrung-ordnung'];
  const mitWert = await oeffnen(await mitMitschrift(V, d));
  assert.ok(bereichIn(mitWert.getData().abWerkMitschrift.bereich, 'pro-aufbewahrung-ordnung'), 'mit Werten: nachgetragen');
});

test('[Nur aus dem Produkt] erfundene Felder und Werte in der Mitschrift der Datei werden nicht übernommen; angehängt wird nur, was das Produkt selbst führt', async () => {
  const { V, d } = await alteDatei();
  const def = bereichIn(d.abWerkMitschrift.bereich, BEREICH);
  def.sektionen[0].felder.push({ id: 'erfundenesFeld', typ: 'text', label: 'Erfunden', hint: 'aus der Datei' });
  def.sektionen[0].felder[0].label = 'In der Datei geändert';
  const vorher = JSON.parse(JSON.stringify(d.abWerkMitschrift.bereich));
  const neu = await oeffnen(await mitMitschrift(V, d));
  const produkt = bereichIn(neu._abWerkMitschriftErzeugen().bereich, BEREICH);
  const nachDef = bereichIn(neu.getData().abWerkMitschrift.bereich, BEREICH);
  // Vorhandenes bleibt byte-gleich, auch das Erfundene (die Datei gehört der Person) — es wird nur nicht gehoben oder verbreitet.
  assert.deepEqual(nachDef.sektionen[0].felder.slice(0, def.sektionen[0].felder.length), vorher.find((m) => m.bereiche && m.bereiche[BEREICH]).bereiche[BEREICH].sektionen[0].felder);
  // Jedes angehängte Feld stammt aus dem Produkt, mit dessen Wortlaut.
  for (const s of nachDef.sektionen) {
    const altS = def.sektionen.find((x) => x.id === s.id);
    const angehaengt = altS ? s.felder.slice(altS.felder.length) : s.felder;
    for (const f of angehaengt) assert.deepEqual(f, feldIn(produkt, f.id), 'angehängt nur aus dem Produkt: ' + f.id);
  }
  assert.equal(feldIn(produkt, 'erfundenesFeld'), null, 'das Produkt kennt das erfundene Feld nicht');
  assert.ok(!neu.bereicheAlle().some((b) => b.id === BEREICH && JSON.stringify(b).includes('erfundenesFeld')), 'der Kern übernimmt das erfundene Feld nicht in seine Bereiche');
});
