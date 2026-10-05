'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klartext-Bindung des Umschlags (U2-ADR-156-Nachtrag Klartext-Bindung,
   05.10.2026).
   ────────────────────────────────────────────────────────────────────────
   Der Umschlag trägt Felder im Klartext: den Ort-Hinweis zum zweiten
   Passwort (vor dem Passwort angezeigt) und Felder einer neueren Fassung,
   die diese Fassung unverändert weiterträgt. Beide ließen sich in der Datei
   ändern, ohne dass GCM es merkt. Jetzt steht ihr Soll im Geheimteil jedes
   Eintrags: der Ort normalisiert, die Felder außerhalb der eingefrorenen
   Basismenge als Hash. Nach dem Öffnen wird verglichen; bei Abweichung
   warnt der Kern, und veränderte Fremdfelder werden nicht weitergetragen.
   Altdateien ohne Marke werden nicht geprüft und warnen nicht.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-bindung-12345';
const FACH_PW = 'fach-passwort-der-anja-1';
const ORT = 'Versiegelter Umschlag im Tresor';
const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

async function depotMitFach(V, ort) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], FACH_PW, ort);
  return V.depotSerialisieren();
}
async function oeffnen(u, pw) {
  const { V } = ladeKern();
  await V.depotLaden(JSON.parse(JSON.stringify(u)), pw);
  return V;
}
function kernMit(ersetzungen) {
  let html = KERN_QUELLE;
  for (const [alt, neu] of ersetzungen) {
    assert.equal(html.split(alt).length - 1, 1, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt.trim().slice(0, 80));
    html = html.replace(alt, neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klartext-bindung-'));
  const datei = path.join(dir, 'kern.html');
  fs.writeFileSync(datei, html);
  try { return ladeKern({ htmlPfad: datei, backen: true }).V; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[Klartext-Bindung] unveränderte Datei: kein Befund, weder für die Inhaberin noch über das Fach', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  assert.equal(u.angehoerigenOrt, ORT, 'Voraussetzung: der Ort steht im Klartext');
  assert.equal((await oeffnen(u, PW))._klartextBindungBefund(), null);
  assert.equal((await oeffnen(u, FACH_PW))._klartextBindungBefund(), null);
});

test('[Klartext-Bindung·Rot] veränderter Ort: das Fach warnt und nennt den gebundenen Ort', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  u.angehoerigenOrt = 'Rufen Sie 0123 456 an';
  const W = await oeffnen(u, FACH_PW);
  const b = W._klartextBindungBefund();
  assert.ok(b && b.ortAbweichung, 'die Abweichung ist erkannt');
  assert.equal(b.ortGebunden, ORT);
  assert.ok(W.klartextBindungHinweisText(b).includes(ORT), 'die Warnung nennt den gebundenen Ort');
  assert.ok((await oeffnen(u, PW))._klartextBindungBefund().ortAbweichung, 'auch die Inhaberin sieht es');
});

test('[Klartext-Bindung·Rot] eingefügter Ort in einer gebundenen Datei ohne Hinweis: Warnung, dass es keinen gab', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, '');
  assert.equal(u.angehoerigenOrt == null || u.angehoerigenOrt === '', true, 'Voraussetzung: kein Hinweis');
  u.angehoerigenOrt = 'Rufen Sie 0123 456 an';
  const W = await oeffnen(u, FACH_PW);
  const b = W._klartextBindungBefund();
  assert.ok(b && b.ortAbweichung);
  assert.equal(b.ortGebunden, null);
  assert.equal(W.klartextBindungHinweisText(b), String(W.STRINGS.klartextBindungOrtKeinText));
});

test('[Klartext-Bindung] Altdatei ohne Marke: ein veränderter Ort warnt nicht (kein Fehlalarm), sagt aber auch nichts', async () => {
  // Eine Fassung vor der Bindung: derselbe Kern, nur ohne die Marke im Geheimteil.
  const Alt = kernMit([["  if (bindung) { kern.ortGebunden = true; kern.fremdHash = bindung.fremdHash; }", '']]);
  const u = await depotMitFach(Alt, ORT);
  u.angehoerigenOrt = 'Rufen Sie 0123 456 an';
  assert.equal((await oeffnen(u, FACH_PW))._klartextBindungBefund(), null);
});

/* Die eingefrorene Datei einer NEUEREN Fassung: sie trägt ein Hüllenfeld, das der heutige Kern nicht kennt, und bindet es im
   Geheimteil. Erzeugt einmal mit tests/helfer/klartext-bindung-fixture-erzeugen.js; die Prüfsumme hält sie fest. */
const FIX = require('./helfer/klartext-bindung-fixture-erzeugen.js');
const FIXTURE_SHA256 = 'e814ab5219f771fccfe72c7a0ba2c3fa43a77e12141b8a396181021f0a5742ea';
function neuereFassung() {
  const roh = fs.readFileSync(FIX.ZIEL);
  const sha = require('node:crypto').createHash('sha256').update(roh).digest('hex');
  assert.equal(sha, FIXTURE_SHA256, 'die eingefrorene Datei ist unverändert');
  return JSON.parse(roh.toString('utf8'));
}

test('[Klartext-Bindung·Vorwärts] eine neuere Fassung mit neuem Feld öffnet ohne Warnung, und das Feld bleibt byte-gleich', async () => {
  const u = neuereFassung();
  assert.deepEqual(u[FIX.FELD], FIX.WERT, 'Voraussetzung: die neuere Fassung trägt das Feld');
  const W = await oeffnen(u, FIX.PW);
  assert.equal(W._klartextBindungBefund(), null, 'kein Fehlalarm');
  const zurueck = await W.depotSerialisieren();
  assert.equal(JSON.stringify(zurueck[FIX.FELD]), JSON.stringify(u[FIX.FELD]), 'das Feld wird byte-gleich weitergetragen');
  assert.equal((await oeffnen(zurueck, FIX.PW))._klartextBindungBefund(), null, 'und die neu geschriebene Datei bindet es selbst');
});

test('[Klartext-Bindung·Rot] geändertes Fremdfeld: Warnung mit Feldnamen, das Feld wird nicht weitergetragen', async () => {
  const u = neuereFassung();
  u[FIX.FELD] = Object.assign({}, u[FIX.FELD], { verfahren: 'untergeschoben' });
  const W = await oeffnen(u, FIX.PW);
  const b = W._klartextBindungBefund();
  assert.ok(b && b.fremdAbweichung);
  assert.deepEqual(b.fremdFelder, [FIX.FELD]);
  assert.ok(W.klartextBindungHinweisText(b).includes(FIX.FELD), 'die Warnung nennt den Feldnamen');
  assert.equal(W._umschlagFremdfelder(), null, 'nichts davon wird gemerkt');
  assert.equal(FIX.FELD in (await W.depotSerialisieren()), false, 'und nichts davon geschrieben');
});

test('[Klartext-Bindung·Rot] eingefügtes Fremdfeld in einer aktuellen Datei: Warnung, nicht weitergetragen', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  u.eingeschleust = 'x';
  const W = await oeffnen(u, PW);
  const b = W._klartextBindungBefund();
  assert.ok(b && b.fremdAbweichung && !b.ortAbweichung);
  assert.deepEqual(b.fremdFelder, ['eingeschleust']);
  assert.equal('eingeschleust' in (await W.depotSerialisieren()), false);
});

test('[Klartext-Bindung] die Basismenge ist eingefroren: genau der Stand vom 05.10.2026, nie erweitert', () => {
  const { V } = ladeKern();
  assert.deepEqual([...V.UMSCHLAG_FELDER_BASIS], ['kryptoVersion', 'depotUUID', 'pbkdf2', 'depotSalt', 'iv', 'ct', 'einheiten',
    'umschlagTabelle', 'angehoerigenOrt', 'wiederherstellung', 'stand_marke', 'gespeichert_am'],
    'eine erweiterte Basismenge ließe eine ältere Fassung neue Felder als Fälschung verwerfen');
  assert.equal(Object.isFrozen(V.UMSCHLAG_FELDER_BASIS), true);
  // Jedes Basisfeld schreibt der Kern selbst: im Serialisieren (bekannt) oder als Hüllfeld beim Herunterladen.
  const huelle = ['stand_marke', 'gespeichert_am'];
  for (const k of V.UMSCHLAG_FELDER_BASIS) assert.ok(V.UMSCHLAG_FELDER_BEKANNT.includes(k) || huelle.includes(k), 'Basis ⊆ bekannt ∪ Hülle: ' + k);
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(quelle, /Object\.assign\(\{\}, umschlag, marke \? \{ stand_marke: marke \} : \{ gespeichert_am: ts \}\)/,
    'die Hüllfelder der Basis sind genau die, die depotHerunterladen anhängt — ändert sich das, gehört die Basis neu entschieden');
});

test('[Klartext-Bindung] die Warnung steht deutsch und englisch im Textsatz und auf der Schutzliste', () => {
  const de = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  const { V } = ladeKern();
  for (const k of ['klartextBindungTitel', 'klartextBindungOrtText', 'klartextBindungOrtKeinText', 'klartextBindungFremdText']) {
    const kennung = 'strings:' + k + '.text';
    assert.ok(de[kennung], 'DE: ' + kennung);
    assert.ok(en[kennung], 'EN: ' + kennung);
    assert.ok(V.SCHUTZ_SCHLUESSEL_KERN.has(kennung), 'Schutzliste: ' + kennung);
  }
});

test('[Klartext-Bindung·Rot am Code] ohne den Abgleich nach dem Öffnen bleibt ein veränderter Ort unbemerkt — die Proben oben messen ihn', async () => {
  const Ohne = kernMit([['  await _klartextBindungAnwenden(umschlag, gelesenerGeheimteil);\n', '']]);
  const u = await depotMitFach(Ohne, ORT);
  u.angehoerigenOrt = 'Rufen Sie 0123 456 an';
  u.eingeschleust = 'x';
  const W = kernMit([['  await _klartextBindungAnwenden(umschlag, gelesenerGeheimteil);\n', '']]);
  await W.depotLaden(JSON.parse(JSON.stringify(u)), FACH_PW);
  assert.equal(W._klartextBindungBefund(), null, 'ohne Abgleich kein Befund');
  // Gegenprobe mit dem echten Kern: dieselbe Datei wird erkannt.
  const b = (await oeffnen(u, FACH_PW))._klartextBindungBefund();
  assert.ok(b && b.ortAbweichung && b.fremdAbweichung);
});

test('[Klartext-Bindung·Code-Weg] wer mit dem Wiederherstellungs-Code öffnet, bekommt dieselbe Prüfung', async () => {
  const { V } = ladeKern();
  await depotMitFach(V, ORT);
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(PW, code.slice(0, V.WHC_STELLEN));
  const u = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  const sauber = ladeKern().V;
  await sauber.depotMitCodeLaden(JSON.parse(JSON.stringify(u)), V.whcCodeGruppiert(code), 'neues-passwort-nach-code-1');
  assert.equal(sauber._klartextBindungBefund(), null, 'unverändert: kein Befund');
  u.angehoerigenOrt = 'Rufen Sie 0123 456 an';
  const W = ladeKern().V;
  await W.depotMitCodeLaden(u, V.whcCodeGruppiert(code), 'neues-passwort-nach-code-1');
  const b = W._klartextBindungBefund();
  assert.ok(b && b.ortAbweichung && b.ortGebunden === ORT);
});

test('[Klartext-Bindung·Sub-Depot] ein eingeschleustes Fremdfeld wird beim Neuversiegeln nicht gewaschen, und die Warnung erscheint', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  const eintrag = await V.subDepotAnlegen({ bezeichnung: 'Depot Vater', inhaberin: 'Vater', verwaltungsTyp: 'verwaltet' }, 'sub-pw-vater-1234');
  const e = V.getData().verwalteteDepots.find((x) => x.depotUUID === eintrag.depotUUID);
  e.umschlag.eingeschleust = { a: 1 };                          // im gespeicherten Sub-Umschlag verändert
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, 'sub-pw-vater-1234');
  const b = V._klartextBindungBefund();
  assert.ok(b && b.fremdAbweichung, 'die Warnung des Sub-Depots ist gesetzt');
  const neu = await V.subDepotNeuVersiegeln(eintrag.depotUUID);
  assert.equal('eingeschleust' in neu, false, 'das Feld ist nicht neu gebunden, sondern verworfen');
});

test('[Klartext-Bindung·Rot] ein Feldname mit HTML erscheint in der Warnung als Text, nicht als Element', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  const boes = '<img src=x onerror=alert(1)>';
  u[boes] = 'x';
  const { V: W, document } = ladeKern();
  await W.depotLaden(JSON.parse(JSON.stringify(u)), PW);
  const b = W._klartextBindungBefund();
  assert.ok(b && b.fremdFelder.includes(boes));
  let html = '';
  W.ui.modal = (o) => { html = o.koerperHTML; };
  W.klartextBindungHinweisZeigen();
  assert.ok(html.includes('&lt;img'), 'der Name steht escaped im Text');
  assert.equal(/<img/i.test(html), false, 'kein Element im Hinweis');
  assert.ok(document, 'Voraussetzung: der Lader liefert ein Dokument');
});

test('[Klartext-Bindung·kein Fehlalarm] die heruntergeladene Datei mit Stand-Marke und die Browser-Kopie ohne Ort warnen nicht; ein entfernter Ort zeigt keinen falschen', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  // So hängt depotHerunterladen die Hüllfelder an (neu: stand_marke, alt: gespeichert_am).
  assert.equal((await oeffnen(Object.assign({}, u, { stand_marke: 'abc' }), FACH_PW))._klartextBindungBefund(), null);
  assert.equal((await oeffnen(Object.assign({}, u, { gespeichert_am: '2026-10-05T00:00:00.000Z' }), PW))._klartextBindungBefund(), null);
  // So legt depotInIdbSichern die Browser-Kopie ab: ohne den Ort-Hinweis (Entscheidung 16.09.2026).
  const browserKopie = V._umschlagOhneKlartextHinweise(JSON.parse(JSON.stringify(u)));
  assert.equal('angehoerigenOrt' in browserKopie, false, 'Voraussetzung: die Browser-Kopie trägt keinen Ort');
  assert.equal((await oeffnen(browserKopie, PW))._klartextBindungBefund(), null);
  // Ort aus der Datei entfernt: kein Alarm — und auch kein falscher Ort, denn vor dem Passwort wird dann keiner angezeigt.
  const ohneOrt = JSON.parse(JSON.stringify(u)); delete ohneOrt.angehoerigenOrt;
  assert.equal(V.angehoerigenOrtAusUmschlag(ohneOrt), null, 'vor dem Passwort steht kein Ort');
  assert.equal((await oeffnen(ohneOrt, FACH_PW))._klartextBindungBefund(), null, 'und nach dem Öffnen kein Alarm');
});

/* Die zweite Runde (Befund KLARTEXT-BINDUNG-HUELLFELD-FEHLALARM, gefunden am Air-Lauf über zug-folge1 in
   tests/e2e/geraet-datei-zusammenfuehren.spec.js): wer eine heruntergeladene Datei öffnet und wieder speichert, merkt
   `stand_marke` als Fremdfeld (das Merken folgt UMSCHLAG_FELDER_BEKANNT, ohne die Hüllfelder). Ging es dann in den
   `fremdHash`, warnte JEDES nächste Öffnen — mit leerer Feldliste („–“), denn beim Lesen zählen die Hüllfelder nicht. */
test('[Klartext-Bindung·kein Fehlalarm] eine Datei mit Hüllfeld geöffnet und neu gespeichert warnt beim nächsten Öffnen nicht', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  for (const huelle of [{ stand_marke: 'abc' }, { gespeichert_am: '2026-10-05T00:00:00.000Z' }]) {
    const W = await oeffnen(Object.assign({}, u, huelle), PW);
    assert.equal(W._klartextBindungBefund(), null, 'Voraussetzung: die erste Runde warnt nicht');
    const neu = await W.depotSerialisieren();
    // Datei (depotHerunterladen setzt die Hülle neu) und Browser-Kopie (ohne Ort): beide ohne Befund.
    assert.equal((await oeffnen(Object.assign({}, neu, { stand_marke: 'def' }), PW))._klartextBindungBefund(), null,
      'die neu gespeicherte Datei mit frischer Stand-Marke warnt nicht (' + Object.keys(huelle)[0] + ')');
    assert.equal((await oeffnen(V._umschlagOhneKlartextHinweise(JSON.parse(JSON.stringify(neu))), PW))._klartextBindungBefund(), null,
      'die neu gespeicherte Browser-Kopie warnt nicht (' + Object.keys(huelle)[0] + ')');
    assert.equal((await oeffnen(neu, FACH_PW))._klartextBindungBefund(), null, 'auch das Fach sieht keinen Befund');
  }
});
test('[Klartext-Bindung·kein Fehlalarm·Rot am Code] hasht das Schreiben über eine andere Menge als das Lesen, warnt die zweite Runde mit leerer Liste', async () => {
  const Ohne = kernMit([['fremdHash: await _umschlagFremdHash(_umschlagFelderAusserBasis(opt.fremdFelder || {}))',
    'fremdHash: await _umschlagFremdHash(opt.fremdFelder || {})']]);
  const u = await depotMitFach(Ohne, ORT);
  await Ohne.depotLaden(Object.assign(JSON.parse(JSON.stringify(u)), { stand_marke: 'abc' }), PW);
  const neu = await Ohne.depotSerialisieren();
  const b = (await oeffnen(Object.assign({}, neu, { stand_marke: 'def' }), PW))._klartextBindungBefund();
  assert.ok(b && b.fremdAbweichung, 'ohne den Filter entsteht der Fehlalarm');
  assert.deepEqual(b.fremdFelder, [], 'und er nennt kein einziges Feld');
});
test('[Klartext-Bindung·Rot] nach Öffnen und Neuspeichern mit Hüllfeld warnt ein eingeschleustes Nicht-Basis-Feld weiter', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  const neu = await (await oeffnen(Object.assign({}, u, { stand_marke: 'abc' }), PW)).depotSerialisieren();
  const b = (await oeffnen(Object.assign({}, neu, { stand_marke: 'def', eingeschleust: 'Rufen Sie 0123 456 an' }), PW))._klartextBindungBefund();
  assert.ok(b && b.fremdAbweichung, 'das echte Fremdfeld wird erkannt — der Filter schwächt die Bindung nicht');
  assert.deepEqual(b.fremdFelder, ['eingeschleust'], 'genannt wird genau das eingeschleuste Feld, nie das Hüllfeld');
});

/* Klassenwächter (KLARTEXT-BINDUNG-HUELLFELD-FEHLALARM): Schreiben und Lesen hashen über DIESELBE Mengenfunktion. Jeder
   Aufruf von `_umschlagFremdHash(` im Kern bekommt `_umschlagFelderAusserBasis(…)` direkt oder einen Namen, der wenige
   Zeilen davor aus ihr entstand. Ein neuer Aufrufer, der ungefiltert hasht, wird hier rot — bevor er Fehlalarme baut. */
function fremdHashAufrufeOhneBasisFilter(quelle) {
  const zeilen = quelle.split('\n');
  const funde = [];
  zeilen.forEach((z, i) => {
    for (const m of z.matchAll(/_umschlagFremdHash\(([^)]*)/g)) {
      if (/^\s*async function _umschlagFremdHash/.test(z)) continue;
      const arg = m[1].trim();
      if (arg.startsWith('_umschlagFelderAusserBasis(')) continue;
      const name = /^[A-Za-z_$][\w$]*$/.test(arg) ? arg : null;
      const davor = zeilen.slice(Math.max(0, i - 5), i).join('\n');
      if (name && new RegExp('\\bconst ' + name + ' = _umschlagFelderAusserBasis\\(').test(davor)) continue;
      funde.push((i + 1) + ': ' + z.trim());
    }
  });
  return funde;
}
test('[Klartext-Bindung·Klasse] jeder Fremd-Hash im Kern läuft über _umschlagFelderAusserBasis', () => {
  assert.ok(KERN_QUELLE.split('_umschlagFremdHash(').length - 1 >= 3, 'Vorbedingung: Definition, Schreiben und Lesen stehen im Kern');
  assert.deepEqual(fremdHashAufrufeOhneBasisFilter(KERN_QUELLE), []);
});
test('[Klartext-Bindung·Klasse·Rot] der Wächter findet einen ungefilterten Aufruf', () => {
  const kaputt = KERN_QUELLE.replace('_umschlagFremdHash(_umschlagFelderAusserBasis(opt.fremdFelder || {}))',
    '_umschlagFremdHash(opt.fremdFelder || {})');
  assert.notEqual(kaputt, KERN_QUELLE, 'Vorbedingung: die Schreibstelle steht im Kern');
  assert.equal(fremdHashAufrufeOhneBasisFilter(kaputt).length, 1);
});

/* ── Schärfungen nach der Zweitlesung (05.10.2026) ─────────────────────────────────────────────────────── */

test('[Klartext-Bindung·Grenzen] die Warnung nennt höchstens fünf Feldnamen, jeden mit höchstens 40 Zeichen', async () => {
  const { V } = ladeKern();
  const u = await depotMitFach(V, ORT);
  const lang = 'L'.repeat(60);
  const namen = [lang, 'f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
  for (const n of namen) u[n] = 'x';
  const W = await oeffnen(u, PW);
  const b = W._klartextBindungBefund();
  assert.deepEqual(b.fremdFelder, [...namen].sort(), 'Voraussetzung: alle sieben sind erkannt');
  const text = W.klartextBindungHinweisText(b);
  const genannt = text.match(/„[^“]*“/g) || [];
  assert.equal(genannt.length, 5, 'genau fünf Namen: ' + text);
  assert.ok(text.includes('…'), 'die übrigen sind mit … angedeutet');
  assert.ok(text.includes('„' + 'L'.repeat(40) + '“'), 'der lange Name ist auf 40 Zeichen gekürzt');
  assert.equal(text.includes('L'.repeat(41)), false, 'kein 41. Zeichen');
});

test('[Klartext-Bindung·Grenzen·Rot am Code] ohne die Grenzen stehen alle Namen in voller Länge in der Warnung', async () => {
  const Ohne = kernMit([["const namen = b.fremdFelder.slice(0, 5).map((n) => auf + String(n).slice(0, 40) + zu);",
    "const namen = b.fremdFelder.map((n) => auf + String(n) + zu);"]]);
  const u = await depotMitFach(Ohne, ORT);
  for (const n of ['L'.repeat(60), 'f1', 'f2', 'f3', 'f4', 'f5', 'f6']) u[n] = 'x';
  await Ohne.depotLaden(JSON.parse(JSON.stringify(u)), PW);
  const text = Ohne.klartextBindungHinweisText(Ohne._klartextBindungBefund());
  assert.equal((text.match(/„[^“]*“/g) || []).length, 7, 'ohne Grenze sieben Namen: die Probe oben kann rot werden');
  assert.ok(text.includes('L'.repeat(60)));
});

test('[Klartext-Bindung·Code-Weg·Rot] ein eingefügtes Fremdfeld wird auch beim Öffnen mit dem Wiederherstellungs-Code gemeldet und nicht weitergetragen', async () => {
  const { V } = ladeKern();
  await depotMitFach(V, ORT);
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(PW, code.slice(0, V.WHC_STELLEN));
  const u = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  u.eingeschleust = { a: 1 };
  const W = ladeKern().V;
  await W.depotMitCodeLaden(u, V.whcCodeGruppiert(code), 'neues-passwort-nach-code-1');
  const b = W._klartextBindungBefund();
  assert.ok(b && b.fremdAbweichung && !b.ortAbweichung, 'nur das Fremdfeld weicht ab');
  assert.deepEqual(b.fremdFelder, ['eingeschleust']);
  assert.equal(W._umschlagFremdfelder(), null, 'nichts davon gemerkt');
  assert.equal('eingeschleust' in (await W.depotSerialisieren()), false, 'und nichts davon geschrieben');
});

/* Der NFC-Zweig von subDepotEntsiegeln: ein Sub-Depot, dessen Schlüssel aus dem NFD-Passwort stammt, öffnet über den Rückfall und
   wird unter NFC neu versiegelt. Dabei gilt der alte fremdHash (_subFremdfelderGeprueft): ein eingeschleustes Feld wird verworfen, ein
   gebundenes Feld einer neueren Fassung bleibt. */
describe('[Klartext-Bindung·Sub-Depot·NFC-Rückfall]', () => {
  const { webcrypto } = require('node:crypto');
  const randB64 = (n) => { const a = new Uint8Array(n); webcrypto.getRandomValues(a); return Buffer.from(a).toString('base64'); };
  const NFC = 'Müller-Sub-Bindung-2026'.normalize('NFC');
  const NFD = NFC.normalize('NFD');
  const NEU = { verfahren: 'neuere-fassung', wert: 1 };
  // Wie craftLegacyZerfallUmschlag in tests/adr-235-subdepot-umschlag-versionsfest.test.js, dazu ein gebundenes Feld einer neueren Fassung.
  async function nfdSub(V) {
    const pbkdf2SaltB64 = randB64(16), depotSaltB64 = randB64(32), depotUUID = V.uuidV4();
    const master = await V.importMasterHkdfKey(await V.deriveMasterBits(NFD, V.base64ToBytes(pbkdf2SaltB64)));
    const inhalt = V.leeresDepot();
    const neu = await V._zerfallSchreiben(inhalt, { hkdfKey: master, pbkdf2Salt: V.base64ToBytes(pbkdf2SaltB64),
      depotSalt: V.base64ToBytes(depotSaltB64), depotUUID, fachName: null, ortHinweis: null, faecher: [], fremdFelder: { neuFeld: NEU } });
    return { kryptoVersion: neu.kryptoVersion, depotUUID, pbkdf2: { salt: pbkdf2SaltB64 }, depotSalt: depotSaltB64,
      einheiten: neu.einheiten, umschlagTabelle: neu.umschlagTabelle, neuFeld: NEU };
  }

  test('unverändert: das gebundene Feld der neueren Fassung wird beim Neuversiegeln byte-gleich weitergetragen', async () => {
    const { V } = ladeKern();
    const u = await nfdSub(V);
    const r = await V.subDepotEntsiegeln(JSON.parse(JSON.stringify(u)), NFD);
    assert.equal(r.bindungBefund, null, 'kein Befund');
    assert.ok(r.reEncryptUmschlag, 'Voraussetzung: der NFC-Rückfall hat neu versiegelt');
    assert.equal(JSON.stringify(r.reEncryptUmschlag.neuFeld), JSON.stringify(NEU));
    assert.equal((await V.subDepotEntsiegeln(r.reEncryptUmschlag, NFC)).bindungBefund, null, 'und unter NFC neu gebunden');
  });

  test('Rot: ein eingeschleustes Feld wird beim Neuversiegeln verworfen, nicht gewaschen', async () => {
    const { V } = ladeKern();
    const u = await nfdSub(V);
    u.eingeschleust = 'x';
    const r = await V.subDepotEntsiegeln(JSON.parse(JSON.stringify(u)), NFD);
    assert.ok(r.bindungBefund && r.bindungBefund.fremdAbweichung, 'die Abweichung ist erkannt');
    assert.ok(r.reEncryptUmschlag, 'Voraussetzung: der NFC-Rückfall hat neu versiegelt');
    assert.equal('eingeschleust' in r.reEncryptUmschlag, false, 'das eingeschleuste Feld ist nicht neu gebunden');
    assert.equal('neuFeld' in r.reEncryptUmschlag, false, 'bei einer Abweichung wird keines der Fremdfelder weitergetragen');
  });

  test('Rot am Code: ohne _subFremdfelderGeprueft im NFC-Zweig würde das eingeschleuste Feld neu gebunden', async () => {
    const Ohne = kernMit([['      const fremd = _subFremdfelderGeprueft(umschlag, r.bindungBefund);\n',
      '      const fremd = _umschlagUnbekannteFelder(umschlag);\n']]);
    const u = await nfdSub(Ohne);
    u.eingeschleust = 'x';
    const r = await Ohne.subDepotEntsiegeln(JSON.parse(JSON.stringify(u)), NFD);
    assert.ok('eingeschleust' in r.reEncryptUmschlag, 'ohne die Prüfung steht das Feld im neuen Umschlag: die Probe oben kann rot werden');
    assert.equal((await Ohne.subDepotEntsiegeln(r.reEncryptUmschlag, NFC)).bindungBefund, null, 'und ist danach gültig gebunden — gewaschen');
  });
});
