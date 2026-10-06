'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Einmal-Dialoge in Reihe (05.10.2026, Befund VERSIONSTOR-HINWEIS-AIR-ROT)

   Auf einem belasteten Prüfrechner fehlte der Hinweis „nur lesen“ zu einer Datei aus einer neueren Fassung
   (tests/e2e/journey-versionstor-anker.spec.js). Zwei Wege führen zu genau diesem Bild, beide sind hier
   festgeschrieben:
     (a) der Dialog-Platz ist länger als 10 s belegt; der Hinweis gab nach 40 × 250 ms still auf;
     (b) der Hinweis steht und ein späterer ui.modal-Aufruf überschreibt ihn, denn ui.modal stapelt nicht.
   Jetzt wartet er in der Reihe der Einmal-Dialoge (_wennDialogFrei) ohne Frist und kehrt nach einem
   Überschreiben zurück. Reihe und Spur fallen mit dem Depot.
   Klassenwächter: im Kern liest außer _modalBelegt/_wennDialogFrei und dem WHC-Weg (Frist, weil die
   Closure das Passwort hält) niemand den Belegt-Zustand und plant dazu mit setTimeout nach.
   ROT-BEWEIS (a) und (b): am Kern vor diesem Befund fallen die ersten beiden Proben (Bericht).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');
const { depotImProduktAnlegen } = require('./produkt-html-erzeugen.js');

const PW = 'einmal-dialoge-reihe-2026!';
const ZUSATZ = ['neuereFassungHinweisZeigen', '_dialogSpur', '_depotSpeicherZuruecksetzen', '_whcWennDialogFrei', 'migrationsHinweisZeigen'];

/* Eine Uhr, die der Kern beim Laden übernimmt: bis `manuell()` läuft sie echt (das Laden braucht sie),
   danach nur noch, wenn die Probe vorspult. So dauern 11 s Belegung keine 11 s. */
function steuerbareUhr() {
  const echt = globalThis.setTimeout;
  let manuell = false, jetzt = 0;
  const warte = [];
  const uhr = (fn, ms) => {
    if (!manuell) return echt(fn, ms);
    warte.push({ t: jetzt + (ms || 0), fn });
    return warte.length;
  };
  return {
    uhr,
    manuell: () => { manuell = true; },
    vorspulen(ms) {
      const ziel = jetzt + ms;
      for (;;) {
        warte.sort((a, b) => a.t - b.t);
        if (!warte.length || warte[0].t > ziel) break;
        const e = warte.shift(); jetzt = e.t; e.fn();
      }
      jetzt = ziel;
    },
  };
}

function classListMitZustand() {
  const s = new Set();
  return { add: (k) => s.add(k), remove: (k) => s.delete(k), toggle: (k) => (s.has(k) ? s.delete(k) : s.add(k)), contains: (k) => s.has(k) };
}

let _neuereDatei = null;
async function neuereDatei() {
  if (!_neuereDatei) {
    const { umschlag } = await depotImProduktAnlegen('privat-de', PW, (V) => { V.getData().schemaVersion = V.SCHEMA_VERSION_AKTUELL + 1; });
    _neuereDatei = umschlag;
  }
  return _neuereDatei;
}

async function kernMitNeuererDatei() {
  const umschlag = await neuereDatei();
  const u = steuerbareUhr();
  const vorher = globalThis.setTimeout;
  globalThis.setTimeout = u.uhr;
  let k;
  try { k = ladeKern({ zusatzBindungen: ZUSATZ }); } finally { globalThis.setTimeout = vorher; }
  k.document.getElementById('modal-rueck').classList = classListMitZustand();
  await k.V.depotLaden(umschlag, PW);
  assert.equal(k.V.neuereFassungNurLesen(), true, 'Vorbedingung: die Datei stammt aus einer neueren Fassung');
  u.manuell();
  const box = k.document.getElementById('modal-inhalt');
  return { V: k.V, Z: k.V.__zusatz, u, hinweisSteht: () => String(box.innerHTML).includes('id="neuere-fassung-hinweis"') };
}

const fremd = (V, titel) => V.ui.modal({ titel, koerperHTML: '<p>fremd</p>', primaerLabel: 'OK', onPrimaer: (s) => s(), ohneAbbrechen: true });

test('[Einmal-Dialoge·(a)] der Dialog-Platz ist 11 s belegt: der Hinweis „nur lesen“ kommt danach, statt still auszufallen', async () => {
  const { V, Z, u, hinweisSteht } = await kernMitNeuererDatei();
  const zu = fremd(V, 'Ein anderer Dialog');
  Z.neuereFassungHinweisZeigen();
  assert.equal(hinweisSteht(), false, 'Vorbedingung: der Platz ist belegt, der Hinweis wartet');
  u.vorspulen(11000);
  zu();
  u.vorspulen(1);
  assert.equal(hinweisSteht(), true, 'nach 11 s Belegung erscheint der Hinweis nicht mehr');
});

test('[Einmal-Dialoge·(b)] ein späterer Dialog überschreibt den Hinweis: nach dessen Schließen steht der Hinweis wieder', async () => {
  const { V, Z, u, hinweisSteht } = await kernMitNeuererDatei();
  Z.neuereFassungHinweisZeigen();
  assert.equal(hinweisSteht(), true, 'Vorbedingung: der Platz war frei, der Hinweis steht');
  const zu = fremd(V, 'Ein späterer Dialog');
  assert.equal(hinweisSteht(), false, 'Vorbedingung: ui.modal hat ihn überschrieben');
  zu();
  u.vorspulen(1);
  assert.equal(hinweisSteht(), true, 'der überschriebene Hinweis kommt nicht zurück');
});

test('[Einmal-Dialoge·zusammenlegen] zweimal angestoßen, während der Platz belegt ist: genau ein Dialog', async () => {
  const { V, Z, u } = await kernMitNeuererDatei();
  const zu = fremd(V, 'Ein anderer Dialog');
  Z.neuereFassungHinweisZeigen();
  Z.neuereFassungHinweisZeigen();
  const echt = V.ui.modal; let n = 0;
  V.ui.modal = (o) => { n += 1; return echt(o); };
  try { zu(); u.vorspulen(1); } finally { V.ui.modal = echt; }
  assert.equal(n, 1, 'der Hinweis kam ' + n + '-mal');
});

test('[Einmal-Dialoge·Depot fällt] nach dem Zurücksetzen (Schließen, Hintergrund-Wipe) erscheint kein wartender Dialog, und die Spur ist leer', async () => {
  const { V, Z, u, hinweisSteht } = await kernMitNeuererDatei();
  const zu = fremd(V, 'Ein anderer Dialog');
  Z.neuereFassungHinweisZeigen();
  assert.ok(Z._dialogSpur().length >= 1, 'Vorbedingung: die Spur führt den offenen Dialog');
  Z._depotSpeicherZuruecksetzen();
  assert.deepEqual(Z._dialogSpur(), [], 'die Spur überlebt das Depot');
  zu();
  u.vorspulen(1000);
  assert.equal(hinweisSteht(), false, 'ein Dialog aus dem geschlossenen Depot erscheint danach');
});

test('[Einmal-Dialoge·Spur] die Spur hält nur Schlüssel, nie Text: ein freier Titel mit einem Namen erscheint nicht, höchstens acht', async () => {
  const { V, Z } = await kernMitNeuererDatei();
  fremd(V, 'Vollmacht für Erna Beispielname')();
  fremd(V, V.STRINGS.neuereFassungNurLesenTitel)();
  Z.neuereFassungHinweisZeigen();
  const spur = Z._dialogSpur();
  assert.ok(!JSON.stringify(spur).includes('Beispielname'), 'ein freier Titel steht im Klartext in der Spur: ' + JSON.stringify(spur));
  assert.deepEqual(spur.slice(-3), ['(frei)', 'neuereFassungNurLesenTitel', 'neuere-fassung']);
  for (let i = 0; i < 12; i++) fremd(V, 'Titel ' + i)();
  assert.equal(Z._dialogSpur().length, 8);
});

test('[Einmal-Dialoge·WHC] ein Depot-Reset während des Wartens: das Angebot mit dem Passwort feuert danach nicht, die Referenz fällt', async () => {
  const { V, Z, u } = await kernMitNeuererDatei();
  const zu = fremd(V, 'Ein anderer Dialog');
  let gefeuert = false;
  const w = Z._whcWennDialogFrei(() => { gefeuert = true; });
  assert.equal(gefeuert, false, 'Vorbedingung: der Platz ist belegt, das Angebot wartet');
  Z._depotSpeicherZuruecksetzen();
  zu();
  u.vorspulen(2000);
  assert.equal(gefeuert, false, 'das Angebot des geschlossenen Depots ist erschienen');
  assert.ok(w && typeof w.wartet === 'function', 'der Weg sagt, ob er noch eine Referenz hält');
  assert.equal(w.wartet(), false, 'die Closure mit dem Passwort wird noch gehalten');
});

test('[Einmal-Dialoge·Marke] fällt das Depot, bevor der Migrations-Hinweis dran war, bleibt seine Marke im Depot gesetzt', async () => {
  const { V, Z } = await kernMitNeuererDatei();
  const d = V.getData();
  d._migrationHinweisNoetig = true;
  fremd(V, 'Ein anderer Dialog');
  Z.migrationsHinweisZeigen();
  assert.equal(d._migrationHinweisNoetig, true, 'die Marke ist beim Einreihen verbraucht; mit der Datei gesichert, ginge der Hinweis für immer verloren');
});

/* ── Klassenwächter ───────────────────────────────────────────────────────── */
// Im Register der Gegenlesung als einmal-dialoge-erlaubt geführt (Richtung L).
const ERLAUBT_NAMEN = [
  '_modalBelegt', '_wennDialogFrei', '_dialogReiheAbarbeiten',
  // Frist bewusst: fn hält das eben gesetzte Passwort; eine Reihe ohne Frist hielte es unbegrenzt.
  '_whcWennDialogFrei',
];
const ERLAUBT = new Set(ERLAUBT_NAMEN);
const BELEGT_LESEN = /_modalBelegt\(|getElementById\(\s*['"]modal-rueck['"]\s*\)[\s\S]{0,400}?classList\.contains\(\s*['"]an['"]\s*\)/;

function oberstFunktionen(quelle) {
  const aus = [];
  const kopf = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  // Eine oberste Funktion endet im Kern mit „}“ am Zeilenanfang; Klammern zählen hieße Zeichenketten und Regex parsen.
  while ((m = kopf.exec(quelle))) {
    const ende = quelle.indexOf('\n}', m.index);
    aus.push({ name: m[1], rumpf: quelle.slice(m.index, ende < 0 ? quelle.length : ende + 2) });
  }
  return aus;
}

function verstoesse(quelle) {
  return oberstFunktionen(quelle)
    .filter((f) => !ERLAUBT.has(f.name) && BELEGT_LESEN.test(f.rumpf) && /\bsetTimeout\s*\(/.test(f.rumpf))
    .map((f) => f.name);
}

test('[Einmal-Dialoge·Klasse] im Kern plant niemand außerhalb der Reihe mit setTimeout nach, weil der Dialog-Platz belegt ist', () => {
  const quelle = fs.readFileSync(HTML_PATH, 'utf8');
  assert.ok(oberstFunktionen(quelle).some((f) => f.name === '_wennDialogFrei'), 'Positivkontrolle: der Helfer wird gefunden');
  assert.deepEqual(verstoesse(quelle), [], 'über _wennDialogFrei einreihen');
});

/* Die acht Stellen, die am 05.10.2026 nach 40 × 250 ms still aufgaben (sieben an fc1a002f1, die achte kam mit dem
   Krypto-Strang): sieben warten jetzt in der Reihe, der WHC-Weg behält seine Frist und lässt beim Aufgeben los. */
const ACHT = {
  neuereFassungHinweisZeigen: 'reihe', abWerkErsetztHinweisZeigen: 'reihe', erweiterungenGesperrtHinweisZeigen: 'reihe',
  migrationsHinweisZeigen: 'reihe', akteurBootstrapFehlerHinweisZeigen: 'reihe', notfallblattAnbieten: 'reihe',
  klartextBindungHinweisZeigen: 'reihe', _whcWennDialogFrei: 'frist',
};
test('[Einmal-Dialoge·acht Stellen] alle acht früheren Warteschleifen sind umgestellt: sieben in der Reihe, der WHC-Weg mit Frist', () => {
  const f = new Map(oberstFunktionen(fs.readFileSync(HTML_PATH, 'utf8')).map((x) => [x.name, x.rumpf]));
  assert.equal(Object.keys(ACHT).length, 8);
  for (const [name, art] of Object.entries(ACHT)) {
    const rumpf = f.get(name);
    assert.ok(rumpf, 'die Stelle gibt es nicht mehr: ' + name);
    if (art === 'reihe') assert.match(rumpf, /_wennDialogFrei\(\s*'[^']+'/, name + ' wartet nicht in der Reihe');
    else assert.match(rumpf, /_dialogGeneration/, name + ' verfällt nicht mit dem Depot');
  }
});

test('[Einmal-Dialoge·Klasse·Rot-Beweis] eine umgeschriebene Warteschleife fällt, gleich wie sie formuliert ist', () => {
  const alt = "function hinweisA(versuch) {\n  const host = document.getElementById('modal-rueck');\n  if (host.classList.contains('an')) { if ((versuch || 0) < 40) setTimeout(() => hinweisA((versuch || 0) + 1), 250); return; }\n}\n";
  const umgeschrieben = "function hinweisB() {\n  let runden = 0;\n  const nochmal = () => { if (_modalBelegt() && runden++ <= 39) { setTimeout(nochmal, 300); } else ui.modal({}); };\n  nochmal();\n}\n";
  const sauber = "function hinweisC() {\n  _wennDialogFrei('c', () => ui.modal({}));\n}\n";
  assert.deepEqual(verstoesse(alt + umgeschrieben + sauber), ['hinweisA', 'hinweisB']);
});
