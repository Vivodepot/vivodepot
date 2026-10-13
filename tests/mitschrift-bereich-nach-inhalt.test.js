'use strict';
/* Befund MITSCHRIFT-AB-WERK-NACH-POSITION, Teil Bereich und Bereichsersatz (11.10.2026). Die Fächer `bereich` und `bereichsErsatz` der
   Mitschrift stehen in der Datei. Gesät wird eine Bereichsdefinition nur nach INHALT: ihre Struktur (die Definition mit geleerten
   Texten) steht in BEREICHSSTRUKTUREN_AUSGELIEFERT_KERN und jeder ihrer Texte, gebunden an Bereich, Stelle und Eigenschaft, in
   BEREICHSTEXTE_AUSGELIEFERT_KERN (beide erhoben aus den ausgelieferten Ständen). Alles andere wird beim Namen genannt, nicht gesät, und der Person gezeigt; die
   Angaben bleiben in der Datei. Das Nachtragen ersetzt eine erkannte Definition durch die Form des Produkts, statt anzuhängen.
   Die übrigen Fächer: tests/mitschrift-ab-werk-nach-inhalt.test.js. Lese-App: tests/lese-app-vertrauen-nie-aus-datei.test.js. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const { produktHtml, kernAus, depotImProduktAnlegen, depotImProduktLaden } = require('./produkt-html-erzeugen.js');
/* Wörtlicher Spiegel von `_kanonischJSON` im Kern, für die Rot-Beweise, die einen Abdruck von Hand rechnen. */
function kanonischJSON(x) {
  if (Array.isArray(x)) return '[' + x.map(kanonischJSON).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + kanonischJSON(x[k])).join(',') + '}';
  return JSON.stringify(x === undefined ? null : x);
}

const _wegwerf = [];
after(() => { for (const d of _wegwerf) fs.rmSync(d, { recursive: true, force: true }); });
const wegwerfDir = (praefix) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), praefix)); _wegwerf.push(d); return d; };

const PW = 'probe-passwort-mitschrift-bereich-2026-10-11';
const kopie = (x) => JSON.parse(JSON.stringify(x));
const KERN_HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESE_HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
const BEKANNT = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'vivodepot-bereiche-bekannt.json'), 'utf8')).neu;
const PRO_BEREICH = 'pro-betrieb-zugaenge';
/* Gesät und gezeigt wird jede strukturell gültige Definition der Mitschrift. Diese zwei Leser sagen, welche davon NICHT als
   ausgeliefert erkannt ist und darum „aus der Datei“ gilt: nach einer Saat an einem Kern (`ausDerDatei`), und an einem geöffneten
   Depot über die Herkunft je Bereich (`herkunftDatei`). */
const _letzteSaat = new WeakMap();
const ausDerDatei = (V) => (_letzteSaat.get(V) || []).filter((b) => V._bereichAusDatei(b)).map((b) => b.id).sort();
const gesaet = (V, id) => (_letzteSaat.get(V) || []).find((b) => b.id === id) || null;
const herkunftDatei = (V) => Object.keys(V._sektorIndexHalter()).filter((id) => V._bereichFremdeMarkeHerkunft(id) === 'datei').sort();
const FREMD = Object.freeze({ id: 'untergeschoben', icon: 'star', label: 'Untergeschoben', sektionen: [{ id: 's', felder: [{ id: 'f', typ: 'text' }] }] });
const fremdModul = () => ({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de', bereiche: { untergeschoben: kopie(FREMD) } });
const ersatzAus = (neu) => ({ modulTyp: 'bereichsErsatz', ersetzt: [], neu });

let _proMitschrift = null;
async function proMitschrift() {
  if (!_proMitschrift) _proMitschrift = kopie((await depotImProduktAnlegen('pro-de', PW)).V.getData().abWerkMitschrift);
  return kopie(_proMitschrift);
}
/* Öffnen (Inhaltsprüfung) und Saat an einem Kern, für eine handgebaute Datei. */
async function saat(V, d) {
  await V._depotModuleAbWerkPruefen(d, true);
  V.BEREICHS_MODUL_VERWORFEN.length = 0;
  const bereiche = V._bereichModulAbWerkSeed(d);
  _letzteSaat.set(V, bereiche);
  return bereiche.map((b) => b.id);
}
const kernVariante = (praefix, aendern) => {
  const p = path.join(wegwerfDir(praefix), 'vivodepot.html');
  const neu = aendern(KERN_HTML);
  assert.notEqual(neu, KERN_HTML, 'Vorbedingung: die Stelle des Rot-Beweises steht im Kern');
  fs.writeFileSync(p, neu);
  return ladeKern({ htmlPfad: p }).V;
};

/* ── 1 · Rundreise ─────────────────────────────────────────────────────────────────────────────────────────────────── */
test('[Mitschrift·Bereich·Rundreise] Pro-Datei im Privat-Produkt öffnen, ändern, speichern, im Pro-Produkt öffnen, zurück: alles da, nichts gilt als „aus der Datei“', async () => {
  let feld = null;
  const { umschlag } = await depotImProduktAnlegen('pro-de', PW, (V) => {
    V.akteurSelbstErklaeren('Amina');
    const def = V._sektorIndexHalter()[PRO_BEREICH];
    for (const s of def.sektionen) for (const f of s.felder) if (!feld && f.typ === 'text') feld = f.id;
    assert.ok(feld, 'Vorbedingung: der Pro-Bereich führt ein Textfeld');
    V.sektorFeldSetzen(PRO_BEREICH, feld, 'Probe-Wert');
  });
  const privat = await depotImProduktLaden('privat-de', kopie(umschlag), PW);
  assert.ok(privat.V._sektorIndexHalter()[PRO_BEREICH], 'das Privat-Produkt zeigt den Pro-Bereich der Datei');
  assert.equal(privat.d.sektoren[PRO_BEREICH][feld], 'Probe-Wert');
  assert.deepEqual(herkunftDatei(privat.V), [], 'in einer echten Datei gilt kein Bereich als „aus der Datei“');
  privat.V.akteurSelbstErklaeren('Amina');
  privat.V.sektorFeldSetzen('identity', 'givenName', 'Amina');

  const pro = await depotImProduktLaden('pro-de', kopie(await privat.V.depotSerialisieren()), PW);
  assert.equal(pro.d.sektoren[PRO_BEREICH][feld], 'Probe-Wert', 'der Pro-Wert hat das Speichern im Privat-Produkt überstanden');
  assert.equal(pro.d.sektoren.identity.givenName, 'Amina', 'die Änderung aus dem Privat-Produkt ist da');
  assert.deepEqual(herkunftDatei(pro.V), []);

  const nochmal = await depotImProduktLaden('privat-de', kopie(await pro.V.depotSerialisieren()), PW);
  assert.ok(nochmal.V._sektorIndexHalter()[PRO_BEREICH], 'der Pro-Bereich bleibt nach der zweiten Runde sichtbar');
  assert.equal(nochmal.d.sektoren[PRO_BEREICH][feld], 'Probe-Wert');
  assert.deepEqual(herkunftDatei(nochmal.V), []);
});

/* ── 2 · Fach `bereich` ────────────────────────────────────────────────────────────────────────────────────────────── */
test('[Mitschrift·Bereich·Kern] echte Bereichs-Mitschrift bleibt Saat; ein untergeschobenes Modul wird gezeigt und gilt als „aus der Datei“', async () => {
  const { V } = ladeKern({ blank: true });
  const ms = await proMitschrift();
  assert.ok(ms.bereich.length >= 1, 'Vorbedingung: das Pro-Produkt schreibt Bereichs-Module mit');
  ms.bereich.push(fremdModul());
  const ids = await saat(V, { abWerkMitschrift: ms, sektoren: {} });
  assert.ok(ids.includes(PRO_BEREICH), 'der echte Pro-Bereich wird gesät: ' + JSON.stringify(ids));
  assert.ok(ids.includes('untergeschoben'), 'auch der untergeschobene wird gesät');
  assert.deepEqual(ausDerDatei(V), ['untergeschoben'], 'genau der untergeschobene gilt als „aus der Datei“');
});

test('[Mitschrift·Bereich·Kern] eine echte Definition mit einem geänderten Zeichen wird gezeigt und gilt als „aus der Datei“', async () => {
  const { V } = ladeKern({ blank: true });
  const ms = await proMitschrift();
  const m = ms.bereich.find((x) => x.bereiche[PRO_BEREICH]);
  m.bereiche[PRO_BEREICH].icon = String(m.bereiche[PRO_BEREICH].icon) + 'x';
  const ids = await saat(V, { abWerkMitschrift: ms, sektoren: {} });
  assert.ok(ids.includes(PRO_BEREICH));
  assert.deepEqual(ausDerDatei(V), [PRO_BEREICH]);
});

test('[Mitschrift·Bereich·Kern·Rot-Beweis] im Stand „nach Position“ gilt das untergeschobene Modul nicht als „aus der Datei“', async () => {
  const neu = 'mitschrift = _mitschriftBereicheFuerSaat(d.abWerkMitschrift.bereich, mitschriftAusDatei);';
  assert.equal(KERN_HTML.split(neu).length, 2, 'Vorbedingung: die Zeile des Fixes steht genau einmal');
  const V = kernVariante('mitschrift-bereich-alt-', (h) => h.replace(neu, 'mitschrift = d.abWerkMitschrift.bereich;'));
  const ms = await proMitschrift();
  ms.bereich.push(fremdModul());
  assert.ok((await saat(V, { abWerkMitschrift: ms, sektoren: {} })).includes('untergeschoben'));
  assert.deepEqual(ausDerDatei(V), [], 'der alte Stand führt ihn wie einen ausgelieferten — genau das fängt die Probe oben');
});

/* ── 3 · Fach `bereichsErsatz` ─────────────────────────────────────────────────────────────────────────────────────── */
test('[Mitschrift·Bereichsersatz·Kern] alle drei werden gesät; die geänderte und die fremde Definition gelten als „aus der Datei“', async () => {
  const { V } = ladeKern({ blank: true });
  const bekannt = BEKANNT();
  const geaendert = kopie(bekannt['pro-aufbewahrung-ordnung']);
  geaendert.icon = String(geaendert.icon || '') + 'x';
  const ids = await saat(V, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({
    [PRO_BEREICH]: kopie(bekannt[PRO_BEREICH]), 'pro-aufbewahrung-ordnung': geaendert, untergeschoben: kopie(FREMD) }) } });
  assert.ok(ids.includes(PRO_BEREICH), 'ausgeliefert: gesät');
  assert.ok(ids.includes('pro-aufbewahrung-ordnung') && ids.includes('untergeschoben'), 'gezeigt werden alle');
  assert.deepEqual(ausDerDatei(V), ['pro-aufbewahrung-ordnung', 'untergeschoben'], 'beide gelten als „aus der Datei“, die ausgelieferte nicht');
});

test('[Mitschrift·Bereichsersatz·Kern·Rot-Beweis] ohne die Inhaltsprüfung in der Saat des Bereichsersatzes gilt die fremde Definition nicht als „aus der Datei“', async () => {
  const pruefung = 'bereiche[id] = _mitschriftBereichFuerSaat(id, e.neu[id], ersatzAusDatei);';
  assert.equal(KERN_HTML.split(pruefung).length, 2, 'Vorbedingung: die Zeile des Fixes steht genau einmal');
  const V = kernVariante('bereichsersatz-nach-position-', (h) => h.replace(pruefung, 'bereiche[id] = JSON.parse(JSON.stringify(e.neu[id]));'));
  const ids = await saat(V, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ untergeschoben: kopie(FREMD) }) } });
  assert.ok(ids.includes('untergeschoben'));
  assert.deepEqual(ausDerDatei(V), [], 'der Stand „nach Position“ führt sie wie eine ausgelieferte — genau das fängt die Probe oben');
});

test('[Mitschrift·Bereichsersatz·Kern] dieselbe Definition unter anderer Kennung ist kein Treffer', async () => {
  const { V } = ladeKern({ blank: true });
  const ids = await saat(V, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'andere-kennung': kopie(BEKANNT()[PRO_BEREICH]) }) } });
  assert.ok(ids.includes('andere-kennung'), 'gezeigt wird sie');
  assert.deepEqual(ausDerDatei(V), ['andere-kennung']);
});

/* Wie der Kern zerlegt (wörtlicher Spiegel von `_bereichsDefinitionZerlegen`), für Abdrücke, die ein Rot-Beweis von Hand rechnet. */
const TEXT_SCHLUESSEL = ['label', 'hint', 'beispiel'];
function zerlegen(definition) {
  const texte = [];
  const gehe = (w, ort) => {
    if (Array.isArray(w)) return w.map((x) => gehe(x, ort));
    if (!w || typeof w !== 'object') return w;
    const marke = typeof w.id === 'string' ? w.id : (typeof w.format === 'string' ? w.format : (typeof w.wert === 'string' ? w.wert : null));
    const hier = marke === null ? ort : ort.concat([marke]);
    const raus = {};
    for (const k of Object.keys(w)) {
      if (TEXT_SCHLUESSEL.indexOf(k) >= 0 && typeof w[k] === 'string') { texte.push({ ort: hier, schluessel: k, text: w[k] }); raus[k] = ''; }
      else raus[k] = gehe(w[k], hier);
    }
    return raus;
  };
  return { struktur: gehe(definition, []), texte };
}
const sha = (form) => 'sha256:' + crypto.createHash('sha256').update(kanonischJSON(form), 'utf8').digest('hex');
const STRUKTUR_REGION = 'const BEREICHSSTRUKTUREN_AUSGELIEFERT_KERN = new Set([\n';
const TEXT_REGION = 'const BEREICHSTEXTE_AUSGELIEFERT_KERN = new Set([\n';
const STRUKTUR_FORM = "_kanonischJSON({ art: 'bereichsstruktur', id, definition: z.struktur })";
const TEXT_FORM = "_kanonischJSON({ art: 'bereichstext', id, ort: t.ort, schluessel: t.schluessel, text: t.text })";

test('[Mitschrift·Bereichsersatz·Kern·Rot-Beweis] ohne die Kennung in den Bytes ginge dieselbe Definition unter anderer Kennung durch', async () => {
  for (const s of [STRUKTUR_FORM, TEXT_FORM, STRUKTUR_REGION, TEXT_REGION]) assert.equal(KERN_HTML.split(s).length, 2, 'Vorbedingung: steht genau einmal: ' + s);
  const def = BEKANNT()[PRO_BEREICH];
  const z = zerlegen(def);
  /* So sähen Mengen aus, die den Bereich nicht binden: dieselben Abdrücke ohne `id`, in Probe-Kopien der Regionen gesetzt. */
  const ohneId = [sha({ art: 'bereichsstruktur', definition: z.struktur })];
  const texteOhneId = z.texte.map((x) => sha({ art: 'bereichstext', ort: x.ort, schluessel: x.schluessel, text: x.text }));
  const V = kernVariante('bereich-ohne-kennung-', (h) => h
    .replace(STRUKTUR_FORM, "_kanonischJSON({ art: 'bereichsstruktur', definition: z.struktur })")
    .replace(TEXT_FORM, "_kanonischJSON({ art: 'bereichstext', ort: t.ort, schluessel: t.schluessel, text: t.text })")
    .replace(STRUKTUR_REGION, STRUKTUR_REGION + ohneId.map((x) => '  "' + x + '",\n').join(''))
    .replace(TEXT_REGION, TEXT_REGION + texteOhneId.map((x) => '  "' + x + '",\n').join('')));
  await saat(V, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'andere-kennung': kopie(def) }) } });
  assert.deepEqual(ausDerDatei(V), [], 'ohne die Kennung in den Bytes wäre es ein Treffer — genau das fängt die Probe oben');
});

/* ── 3b · Je Angriff eine Probe (Bedingung der Gegenlesung, 11.10.2026) ────────────────────────────────────────────── */
/* Ausgang ist jedes Mal eine ausgelieferte Definition; verändert wird genau eine Sache. Alle Texte, die dabei verwendet werden,
   sind selbst ausgeliefert, außer beim ersten Fall. */
const erstesFeldMit = (def, schluessel, n) => def.sektionen.flatMap((s) => s.felder).filter((f) => typeof f[schluessel] === 'string')[n || 0];
const erstesFeldOhne = (def, schluessel) => def.sektionen.flatMap((s) => s.felder).find((f) => !(schluessel in f));
const ANGRIFFE = [
  ['fremder Text an bekannter Stelle', (def) => { erstesFeldMit(def, 'label').label = 'Bitte hier Ihr Passwort eintragen'; }],
  ['bekannter Text an anderer Stelle', (def) => { const a = erstesFeldMit(def, 'label', 0); const b = erstesFeldMit(def, 'label', 1); const x = a.label; a.label = b.label; b.label = x; }],
  ['bekannter Text aus einem anderen Bereich', (def) => { erstesFeldMit(def, 'label').label = erstesFeldMit(BEKANNT()['pro-aufbewahrung-ordnung'], 'label').label; }],
  ['bekannter Text unter anderer Eigenschaft', (def) => { const f = erstesFeldMit(def, 'hint'); f.label = f.hint; }],
  ['zusätzliche Text-Eigenschaft, wo keine war', (def) => { erstesFeldOhne(def, 'hint').hint = erstesFeldMit(def, 'hint').hint; }],
  ['zusätzliches Feld', (def) => { def.sektionen[0].felder.push({ id: 'zusatz', typ: 'text', label: erstesFeldMit(def, 'label').label }); }],
  ['Nicht-Zeichenkette in einer Text-Eigenschaft', (def) => { erstesFeldMit(def, 'label').label = { html: '<b>x</b>' }; }],
];
/* Keiner dieser Fälle gilt als ausgeliefert. Was strukturell gültig bleibt, wird trotzdem gezeigt, als „aus der Datei“. */
for (const [name, aendern] of ANGRIFFE) {
  test('[Mitschrift·Bereich·Angriff] ' + name + ': die Definition gilt nicht als ausgeliefert', async () => {
    const { V } = ladeKern({ blank: true });
    const def = kopie(BEKANNT()[PRO_BEREICH]);
    const vorher = JSON.stringify(def);
    aendern(def);
    assert.notEqual(JSON.stringify(def), vorher, 'Vorbedingung: der Angriff verändert die Definition');
    const ids = await saat(V, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ [PRO_BEREICH]: def }) } });
    if (ids.includes(PRO_BEREICH)) assert.deepEqual(ausDerDatei(V), [PRO_BEREICH], 'gezeigt, aber „aus der Datei“');
    else assert.ok(V.BEREICHS_MODUL_VERWORFEN.some((v) => v.id === PRO_BEREICH), 'strukturell ungültig: vom Prüfer beim Namen genannt');
  });
}
test('[Mitschrift·Bereich·Angriff·Rot-Beweis] ohne die Text-Prüfung ginge fremder Text durch; ohne den Ort in den Bytes ein vertauschter', async () => {
  const pruefung = ' && textHexe.every((hex) => _fingerabdruckBekannt(texte, hex));';
  assert.equal(KERN_HTML.split(pruefung).length, 2, 'Vorbedingung: die Text-Prüfung steht genau einmal');
  const ohnePruefung = kernVariante('bereich-ohne-textpruefung-', (h) => h.replace(pruefung, ';'));
  const fremd = kopie(BEKANNT()[PRO_BEREICH]);
  ANGRIFFE[0][1](fremd);
  await saat(ohnePruefung, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ [PRO_BEREICH]: fremd }) } });
  assert.deepEqual(ausDerDatei(ohnePruefung), [], 'fremder Text gälte als ausgeliefert');

  const def = BEKANNT()[PRO_BEREICH];
  const ohneOrt = zerlegen(def).texte.map((x) => sha({ art: 'bereichstext', id: PRO_BEREICH, schluessel: x.schluessel, text: x.text }));
  const V = kernVariante('bereich-ohne-ort-', (h) => h
    .replace(TEXT_FORM, "_kanonischJSON({ art: 'bereichstext', id, schluessel: t.schluessel, text: t.text })")
    .replace(TEXT_REGION, TEXT_REGION + ohneOrt.map((x) => '  "' + x + '",\n').join('')));
  const vertauscht = kopie(def);
  ANGRIFFE[1][1](vertauscht);
  await saat(V, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ [PRO_BEREICH]: vertauscht }) } });
  assert.deepEqual(ausDerDatei(V), [], 'vertauschte Beschriftungen gälten als ausgeliefert');
});

test('[Mitschrift·Bereichsersatz·Kern] ein passender Abdruck macht nichts ab Werk: `ersetzt` wirkt nicht, die Definition ist für den Schutz nicht ab Werk', async () => {
  const { V } = kernAus(produktHtml('privat-de'));
  const d = { sektoren: {}, abWerkMitschrift: { bereichsErsatz: { modulTyp: 'bereichsErsatz', ersetzt: ['identity', 'health'], neu: { [PRO_BEREICH]: kopie(BEKANNT()[PRO_BEREICH]) } } } };
  const ids = await saat(V, d);
  assert.ok(ids.includes(PRO_BEREICH) && ids.includes('identity') && ids.includes('health'), 'die eingebauten Bereiche bleiben: ' + JSON.stringify(ids));
  assert.equal(V._abWerkGleich(d.abWerkMitschrift.bereichsErsatz.neu[PRO_BEREICH]), false);
  assert.equal(V._abWerkHerkunft(d.abWerkMitschrift.bereichsErsatz.neu[PRO_BEREICH]), false);
});

test('[Mitschrift·Bereichsersatz·Kern] was das Produkt selbst in das Fach schreibt, gilt beim nächsten Anmelden nicht als „aus der Datei“', async () => {
  const { V } = kernAus(produktHtml('privat-de'));
  const d = { abWerkMitschrift: {}, sektoren: { [PRO_BEREICH]: { irgendein: 'Wert' } } };
  assert.ok((await saat(V, d)).includes(PRO_BEREICH), 'Stufe 5 sät den bekannten Bereich');
  assert.ok(d.abWerkMitschrift.bereichsErsatz && d.abWerkMitschrift.bereichsErsatz.neu[PRO_BEREICH], 'und schreibt ihn in das Fach');
  assert.deepEqual(V._bereichModulAbWerkSeed(d).filter((b) => V._bereichAusDatei(b)).map((b) => b.id), [], 'zweites Anmelden in derselben Sitzung');
});

/* ── 4 · Nachtragen ersetzt, statt anzuhängen ──────────────────────────────────────────────────────────────────────── */
/* Die Bereichs-Mitschrift, wie v923 sie nach dem Nachtragen speichert (Ausgang und Weg stehen in der Datei), erzeugt aus den
   ausgelieferten Ständen. */
const V923 = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mitschrift-bereich-nach-nachtragen-v923.json'), 'utf8'));
const produktForm = (V, id) => { for (const m of V._abWerkMitschriftErzeugen().bereich) if (m.bereiche[id]) return m.bereiche[id]; return null; };

test('[Mitschrift·Nachtragen] eine von v923 ergänzte Definition ist erkannt und wird durch die Form des Produkts ersetzt', async () => {
  const fx = V923();
  assert.ok(fx.ohneAusgelieferteForm.length >= 1, 'Vorbedingung: die Datei trägt Definitionen, die kein Produkt beim Anlegen so schreibt');
  const { V } = kernAus(produktHtml(fx.weg.split('·')[1]));
  const d = { abWerkMitschrift: { bereich: kopie(fx.bereich) }, sektoren: {} };
  await V._depotModuleAbWerkPruefen(d, true);
  for (const m of d.abWerkMitschrift.bereich) for (const id of Object.keys(m.bereiche)) assert.equal(V._bereichsDefinitionAusgeliefert(m.bereiche[id]), true, id + ': als ausgeliefert erkannt (Abschluss unter dem Nachtragen)');
  V._abWerkMitschriftFelderNachtragen(d);
  for (const id of fx.ohneAusgelieferteForm) {
    const m = d.abWerkMitschrift.bereich.find((x) => x.bereiche[id]);
    assert.deepEqual(kopie(m.bereiche[id]), kopie(produktForm(V, id)), id + ': jetzt die Form des Produkts');
    assert.equal(V._bereichsDefinitionAusgeliefert(m.bereiche[id]), true, id + ': bleibt in dieser Sitzung erkannt');
  }
  assert.deepEqual(V._abWerkMitschriftFelderNachtragen(d), [], 'idempotent');
});

test('[Mitschrift·Nachtragen] nicht erkannt, andere Sprache oder ein Feld, das die Form des Produkts nicht führt: die Definition bleibt stehen', async () => {
  const { V } = kernAus(produktHtml('privat-de'));
  const fx = V923();
  const id = fx.ohneAusgelieferteForm[0];
  const lage = async (aendern) => {
    const d = { abWerkMitschrift: { bereich: kopie(fx.bereich) }, sektoren: {} };
    const m = d.abWerkMitschrift.bereich.find((x) => x.bereiche[id]);
    const vorErkennung = aendern.vorher ? aendern.vorher(m) : null;
    await V._depotModuleAbWerkPruefen(d, true);
    if (aendern.nachher) aendern.nachher(m);
    const vorher = kopie(m.bereiche[id]);
    const nachgetragen = V._abWerkMitschriftFelderNachtragen(d);
    return { unveraendert: JSON.stringify(vorher) === JSON.stringify(m.bereiche[id]), nachgetragen, vorErkennung };
  };
  const nichtErkannt = await lage({ vorher: (m) => { m.bereiche[id].icon = String(m.bereiche[id].icon) + 'x'; } });
  assert.equal(nichtErkannt.unveraendert, true, 'nicht erkannt: bleibt');
  assert.ok(!nichtErkannt.nachgetragen.includes(id));
  const andereSprache = await lage({ nachher: (m) => { m.sprache = 'en'; } });
  assert.equal(andereSprache.unveraendert, true, 'andere Sprache: bleibt');
  /* Erkannt, aber die Definition führt ein Feld, das die Form des Produkts nicht kennt. Den Fall gibt es in keiner ausgelieferten
     Fassung; nachgestellt, indem die Definition NACH der Erkennung ein Feld bekommt (dasselbe Objekt bleibt erkannt). */
  const fremdesFeld = await lage({ nachher: (m) => { m.bereiche[id].sektionen[0].felder.push({ id: 'nurInDerAltenForm', typ: 'text' }); } });
  assert.equal(fremdesFeld.unveraendert, true, 'führt ein Feld, das die Form des Produkts nicht kennt: bleibt');
});

test('[Mitschrift·Nachtragen·Rot-Beweis] ohne die Feld-Sperre ersetzt das Nachtragen eine Definition, die ein unbekanntes Feld führt', async () => {
  const a = '      if (!fuehrtAlleFelder(lebend, alt)) continue;';
  const html = fs.readFileSync(produktHtml('privat-de'), 'utf8');
  assert.equal(html.split(a).length, 2, 'Vorbedingung: die Sperre steht genau einmal');
  const p = path.join(wegwerfDir('nachtragen-ohne-feldsperre-'), 'vivodepot.html');
  fs.writeFileSync(p, html.replace(a, ''));
  const { V } = kernAus(p);
  const fx = V923();
  const id = fx.ohneAusgelieferteForm[0];
  const d = { abWerkMitschrift: { bereich: kopie(fx.bereich) }, sektoren: {} };
  const m = d.abWerkMitschrift.bereich.find((x) => x.bereiche[id]);
  await V._depotModuleAbWerkPruefen(d, true);
  m.bereiche[id].sektionen[0].felder.push({ id: 'nurInDerAltenForm', typ: 'text' });
  V._abWerkMitschriftFelderNachtragen(d);
  assert.ok(!JSON.stringify(m.bereiche[id]).includes('nurInDerAltenForm'), 'ohne die Sperre ginge die Feldbeschreibung verloren — genau das fängt die Probe oben');
});

/* ── 4b · Das Öffnen einer fremden Datei verändert ihre Mitschrift nicht ───────────────────────────────────────────── */
/* Sät ein Produkt einen Bereich aus der Mitschrift einer Datei, die ein anderes Produkt angelegt hat, schreibt der Text-Sweep
   aufgelöste Sätze in die Feld-Objekte, die er bekommt (den Markennamen statt des Platzhalters). Bis v923 waren das die Objekte der
   Datei: nach dem Speichern stand in der Mitschrift eine Definition, die kein Produkt so geschrieben hat. Jetzt bekommt die Saat
   Kopien. Verglichen werden die Bereiche, die das öffnende Produkt nicht selbst führt (die eigenen ersetzt das Nachtragen durch
   seine Form). */
const KOPIE_ZEILE = 'bereiche[id] = _mitschriftBereichFuerSaat(id, m.bereiche[id], ausDatei);';
async function privatDateiImProProdukt(proHtml) {
  const { V, umschlag } = await depotImProduktAnlegen('privat-de', PW);
  const vorher = kopie(V.getData().abWerkMitschrift.bereich);
  const pro = kernAus(proHtml).V;
  await pro.depotLaden(kopie(umschlag), PW);
  const eigene = new Set(pro._abWerkMitschriftErzeugen().bereich.flatMap((m) => Object.keys(m.bereiche)));
  const fremde = (module) => Object.fromEntries(module.flatMap((m) => Object.entries(m.bereiche)).filter(([id]) => !eigene.has(id)));
  return { vorher: fremde(vorher), nachher: fremde(kopie(pro.getData().abWerkMitschrift.bereich)) };
}
test('[Mitschrift·Bereich·Öffnen] eine Privat-Datei im Pro-Produkt: die Mitschrift der Bereiche, die Pro nicht führt, ist danach byte-gleich', async () => {
  const { vorher, nachher } = await privatDateiImProProdukt(produktHtml('pro-de'));
  assert.ok(Object.keys(vorher).length >= 10 && JSON.stringify(vorher).includes('{marke}'), 'Vorbedingung: die Mitschrift trägt Sätze mit Platzhalter');
  assert.deepEqual(nachher, vorher);
});
test('[Mitschrift·Bereich·Öffnen·Rot-Beweis] bekommt die Saat die Objekte der Datei, steht danach der Markenname in der Mitschrift', async () => {
  const html = fs.readFileSync(produktHtml('pro-de'), 'utf8');
  assert.equal(html.split(KOPIE_ZEILE).length, 2, 'Vorbedingung: die Zeile mit der Kopie steht genau einmal');
  const p = path.join(wegwerfDir('saat-ohne-kopie-'), 'vivodepot.html');
  fs.writeFileSync(p, html.replace(KOPIE_ZEILE, 'bereiche[id] = m.bereiche[id];'));
  const { vorher, nachher } = await privatDateiImProProdukt(p);
  assert.notDeepEqual(nachher, vorher, 'ohne die Kopie verändert das Öffnen die Mitschrift — genau das fängt die Probe oben');
});

/* ── 5 · Jede Datei öffnet in jedem Produkt: gezeigt wird jeder Bereich, Rechte hat nur der erkannte ────────────────── */
/* U2-ADR-160 („Der Bereichssatz ist … eine Eigenschaft der Datei“), U2-ADR-398 („Jede Datei öffnet in jedem Produkt, und alles muss
   drin sein“). Die Proben dieses Abschnitts sind der Wächter dagegen, dass ein Bereich der Datei je wieder ausgeblendet wird
   (Befund DATEI-BEREICH-AUSGEBLENDET, Teil A), und halten zugleich, dass ein Bereich aus der Datei kein Vorrecht erlangt. */
const URTEIL_MIT_MENGEN = '_bereichsDefinitionUrteil(BEREICHSSTRUKTUREN_AUSGELIEFERT_KERN, BEREICHSTEXTE_AUSGELIEFERT_KERN, ';
/* Ein Produkt, das KEINE Definition als ausgeliefert erkennt — so steht eine ältere Anwendung vor der Datei einer neueren. */
const _ohneMengen = new Map();
function produktOhneMengen(slug) {
  if (!_ohneMengen.has(slug)) {
    const html = fs.readFileSync(produktHtml(slug), 'utf8');
    assert.equal(html.split(URTEIL_MIT_MENGEN).length, 2, 'Vorbedingung: der Aufruf des Urteils steht genau einmal im Produkt');
    const p = path.join(wegwerfDir('produkt-ohne-mengen-' + slug + '-'), 'vivodepot.html');
    fs.writeFileSync(p, html.replace(URTEIL_MIT_MENGEN, '_bereichsDefinitionUrteil(new Set(), new Set(), '));
    _ohneMengen.set(slug, p);
  }
  return _ohneMengen.get(slug);
}
async function ladenIn(htmlPfad, umschlag) {
  const { V, document } = kernAus(htmlPfad);
  await V.depotLaden(kopie(umschlag), PW);
  return { V, document, d: V.getData() };
}
const gezeigt = (k, id) => { k.V.renderSektor(id); return String(k.document.getElementById('content').innerHTML); };
const blattWerte = (w, raus = []) => {
  if (Array.isArray(w)) w.forEach((x) => blattWerte(x, raus));
  else if (w && typeof w === 'object') Object.values(w).forEach((x) => blattWerte(x, raus));
  else if (typeof w === 'string' && w.trim()) raus.push(w);
  return raus;
};
/* Ein Bereich, wie eine künftige Fassung ihn brächte: die ausgelieferte Definition, ein Feld mehr, ein neuer Text. */
const NEUERE_FASSUNG = () => {
  const def = kopie(BEKANNT()[PRO_BEREICH]);
  def.sektionen[0].felder.push({ id: 'spaeterDazu', typ: 'text', label: 'Später hinzugekommen' });
  return def;
};
const PARTNER = Object.freeze({ id: 'partner-werkstatt', icon: 'wrench', label: 'Werkstatt & Lager',
  sektionen: [{ id: 'lager', label: 'Lager', felder: [{ id: 'regal', typ: 'text', label: 'Regal' }, { id: 'bestand', typ: 'text', label: 'Bestand' }] }] });
const MIT_VORRECHTEN = () => Object.assign(kopie(PARTNER), {
  merkmale: ['ankerIdentitaet', 'personenRegister', 'vorsorgeRegal'], rollen: { ankerNameFelder: ['regal'], telefonFeld: 'bestand' },
  wizardId: 'vorsorge', wizards: ['vorsorge'], exporte: ['pdf'], standardDokumente: ['x'], deckblatt: { foto: 'regal' }, format: 'IDENTITAET' });

for (const fach of ['bereich', 'bereichsErsatz']) {
  const dateiMit = (bereiche, sektoren) => ({ sektoren, abWerkMitschrift: fach === 'bereich'
    ? { bereich: [{ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de', bereiche }] }
    : { bereichsErsatz: ersatzAus(bereiche) } });

  test('[Datei öffnet überall·Kern·' + fach + '] eine Datei aus einer neueren Fassung zeigt alle Bereiche mit ihren Angaben', async () => {
    const { V, document } = kernAus(produktHtml('privat-de'));
    await V.depotAnlegen(PW);
    const d = V.getData();
    Object.assign(d, dateiMit({ [PRO_BEREICH]: NEUERE_FASSUNG() }, Object.assign({}, d.sektoren, { [PRO_BEREICH]: { spaeterDazu: 'Angabe im neuen Feld' } })));
    await V._depotModuleAbWerkPruefen(d, true);
    V._bereichsModuleAusDepotAnmelden(d);
    assert.ok(V._sektorIndexHalter()[PRO_BEREICH], 'der Bereich ist angemeldet');
    assert.ok(gezeigt({ V, document }, PRO_BEREICH).includes('Angabe im neuen Feld'), 'die Angabe im Feld, das diese Anwendung nicht kennt, steht da');
    assert.deepEqual(herkunftDatei(V), [PRO_BEREICH], 'und der Bereich gilt als „aus der Datei“');
  });

  test('[Datei öffnet überall·Kern·' + fach + '] der Bereich eines Partners oder einer Institution erscheint mit seinen Angaben', async () => {
    const { V, document } = kernAus(produktHtml('privat-de'));
    await V.depotAnlegen(PW);
    const d = V.getData();
    Object.assign(d, dateiMit({ 'partner-werkstatt': kopie(PARTNER) }, Object.assign({}, d.sektoren, { 'partner-werkstatt': { regal: 'Regal 7', bestand: 'vierzig Stück' } })));
    await V._depotModuleAbWerkPruefen(d, true);
    V._bereichsModuleAusDepotAnmelden(d);
    const html = gezeigt({ V, document }, 'partner-werkstatt');
    assert.ok(html.includes('Regal 7') && html.includes('vierzig Stück') && html.includes('Bestand'), 'Angaben und Beschriftungen stehen da');
    assert.ok(html.includes('marke-fremd'), 'mit dem Rand „fremd“');
  });

  test('[Datei öffnet überall·Kern·' + fach + '] ein Bereich aus der Datei erlangt kein Ab-Werk-Recht', async () => {
    const { V } = kernAus(produktHtml('privat-de'));
    await V.depotAnlegen(PW);
    const d = V.getData();
    const inDatei = { 'partner-werkstatt': MIT_VORRECHTEN(), identity: Object.assign(kopie(PARTNER), { id: 'identity' }) };
    Object.assign(d, dateiMit(inDatei, Object.assign({}, d.sektoren, { 'partner-werkstatt': { regal: 'Regal 7' } })));
    if (fach === 'bereichsErsatz') d.abWerkMitschrift.bereichsErsatz.ersetzt = ['health'];
    const vorher = JSON.stringify(d.abWerkMitschrift);
    const ohne = V.modulHerkunftBerechnen(Object.assign({}, d, { abWerkMitschrift: {} }));
    const ids = await saat(V, d);
    const b = gesaet(V, 'partner-werkstatt');
    assert.ok(b, 'gezeigt wird er');
    for (const k of V._BEREICH_VERWEISE) assert.equal(b[k], undefined, 'kein Verweis aus der Datei: ' + k);
    assert.deepEqual(kopie(b.merkmale), ['personenRegister'], 'von den Merkmalen bleibt nur die Darstellung eines Registers');
    assert.equal(b.rollen, undefined, 'keine Rolle, die etwas zuspricht');
    assert.deepEqual(ausDerDatei(V), ['partner-werkstatt']);
    assert.ok(V.BEREICHS_MODUL_VERWORFEN.some((v) => v.id === 'identity' && v.grund === 'reserviert'), 'eine eingebaute Kennung bleibt dem Produkt vorbehalten');
    assert.ok(ids.includes('health') && ids.includes('identity'), '`ersetzt` aus der Datei verdrängt nichts; die eingebauten Bereiche kommen weiter vom Produkt');
    assert.ok(!V._bereichAusDatei(gesaet(V, 'identity')), 'und der eingebaute Bereich ist der des Produkts, nicht der der Datei');
    assert.equal(V._abWerkGleich(d.abWerkMitschrift[fach === 'bereich' ? 'bereich' : 'bereichsErsatz']), false, 'für den Schutz nicht ab Werk');
    const h = V.modulHerkunftBerechnen(d);
    assert.equal(h.ungeprueft, ohne.ungeprueft + 1, 'der Herkunftssatz zählt ihn als Erweiterung ohne geprüfte Herkunft');
    assert.ok(h.module.some((m) => m.typ === 'bereich' && m.kennung === 'partner-werkstatt' && m.stand === 'ungeprueft'));
    assert.notEqual(V.modulHerkunftSatz(h), V.STRINGS.herkunftSatzKeine, 'der Satz sagt nicht „keine Erweiterung“');
    assert.equal(JSON.stringify(d.abWerkMitschrift), vorher, 'die Definition in der Datei bleibt unverändert, samt Merkmalen, Rollen und Verweisen');
  });
}

test('[Datei öffnet überall·Kern·Rot-Beweis] mit dem Filter „nur Erkanntes säen“ fehlt der Bereich der neueren Fassung; ohne das Abstreifen behielte er seine Vorrechte', async () => {
  const saatZeile = 'bereiche[id] = _mitschriftBereichFuerSaat(id, e.neu[id], ersatzAusDatei);';
  const mitFilter = kernVariante('nur-erkanntes-saeen-', (h) => h.replace(saatZeile, 'if (BEREICH_IDS_EINGEBAUT.indexOf(id) < 0 && !_bereichsDefinitionAusgeliefert(e.neu[id])) continue; ' + saatZeile));
  assert.ok(!(await saat(mitFilter, { sektoren: { [PRO_BEREICH]: { spaeterDazu: 'x' } }, abWerkMitschrift: { bereichsErsatz: ersatzAus({ [PRO_BEREICH]: NEUERE_FASSUNG() }) } })).includes(PRO_BEREICH),
    'der Filter blendet den Bereich aus — genau das fangen die Proben oben');
  const abstreifen = '_bereichAusDateiSchlicht(kopie);\n  ausDatei[id] = true;';
  assert.equal(KERN_HTML.split(abstreifen).length, 2, 'Vorbedingung: das Abstreifen steht genau einmal');
  const ohneAbstreifen = kernVariante('vorrechte-bleiben-', (h) => h.replace(abstreifen, ';\n  ausDatei[id] = true;'));
  await saat(ohneAbstreifen, { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'partner-werkstatt': MIT_VORRECHTEN() }) } });
  assert.ok(gesaet(ohneAbstreifen, 'partner-werkstatt').merkmale.includes('ankerIdentitaet'), 'ohne das Abstreifen trüge der Datei-Bereich das Merkmal');
  const zaehlung = "if (_bereichsDefinitionAusgeliefert(definition)) continue;\n      gezaehlt[id] = true;";
  assert.equal(KERN_HTML.split(zaehlung).length, 2, 'Vorbedingung: die Zählung steht genau einmal');
  const ohneZaehlung = kernVariante('herkunft-ohne-mitschrift-', (h) => h.replace(zaehlung, 'continue;\n      gezaehlt[id] = true;'));
  const d = { sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'partner-werkstatt': kopie(PARTNER) }) } };
  await saat(ohneZaehlung, d);
  assert.equal(ohneZaehlung.modulHerkunftBerechnen(d).ungeprueft, 0, 'ohne die Zählung bliebe er in der Herkunft unsichtbar');
});

/* Was „aus der Datei“ behält, steht in drei geschlossenen Listen. Diese Probe schlägt an, sobald eine wächst (dann braucht es ein
   neues Einzelwort der Gegenlesung), und hält je abgestreiftem Merkmal, je abgestreifter Rolle und je Verweis den Rot-Beweis. */
const ABSTREIFEN_AUFRUF = "if (kopie && typeof kopie === 'object' && !Array.isArray(kopie)) _bereichAusDateiSchlicht(kopie);";
const ROLLEN_WERT = (rolle) => (/Felder$/.test(rolle) ? ['regal'] : (/Sektion$/.test(rolle) ? 'lager' : 'regal'));
test('[Datei öffnet überall·Rechte] die behaltene Menge ist geschlossen; jedes andere Merkmal, jede andere Rolle und jeder Verweis fällt, mit Rot-Beweis', async () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_MERKMALE), ['personenRegister', 'stellenRegister']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_SEKTIONS_ROLLEN), ['personenSektion', 'schutzbefohleneSektion', 'stellenSektion']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_SPEICHER), { stellenListe: 'institutionen' });
  assert.deepEqual(kopie(V._BEREICH_VERWEISE), ['wizardId', 'wizards', 'exporte', 'standardDokumente', 'deckblatt', 'format']);
  assert.equal(KERN_HTML.split(ABSTREIFEN_AUFRUF).length, 2, 'Vorbedingung: das Abstreifen steht genau einmal');
  const ohne = kernVariante('ohne-abstreifen-', (h) => h.replace(ABSTREIFEN_AUFRUF, ''));
  const behalteneRollen = kopie(V._BEREICH_AUS_DATEI_SEKTIONS_ROLLEN).concat(Object.keys(V._BEREICH_AUS_DATEI_SPEICHER));
  const faelle = []
    .concat(kopie(V.BEREICH_MERKMALE_ERLAUBT).filter((m) => !V._BEREICH_AUS_DATEI_MERKMALE.includes(m)).map((m) => ['Merkmal ' + m, { merkmale: [m] }, (b) => (b.merkmale || []).includes(m)]))
    .concat(kopie(V.BEREICH_ROLLEN_ERLAUBT).filter((r) => !behalteneRollen.includes(r)).map((r) => ['Rolle ' + r, { rollen: { [r]: ROLLEN_WERT(r) } }, (b) => !!b.rollen && r in b.rollen]))
    .concat(kopie(V._BEREICH_VERWEISE).map((k) => ['Verweis ' + k, { [k]: k === 'format' ? 'IDENTITAET' : (k === 'deckblatt' ? { foto: 'regal' } : (k === 'wizardId' ? 'vorsorge' : ['vorsorge'])) }, (b) => b[k] !== undefined]));
  assert.ok(faelle.length >= 3 + 9 + 6, 'Vorbedingung: jede abgestreifte Eigenschaft ist ein Fall (' + faelle.length + ')');
  for (const [name, zusatz, traegt] of faelle) {
    const datei = () => ({ sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'partner-werkstatt': Object.assign(kopie(PARTNER), kopie(zusatz)) }) } });
    await saat(V, datei());
    assert.ok(gesaet(V, 'partner-werkstatt') && !traegt(gesaet(V, 'partner-werkstatt')), name + ': aus der Datei nicht übernommen');
    await saat(ohne, datei());
    assert.ok(traegt(gesaet(ohne, 'partner-werkstatt')), name + ': ohne das Abstreifen trüge der Bereich es — genau das fängt die Zeile darüber');
  }
});

test('[Datei öffnet überall·Rechte] eine Sektions-Rolle zählt nur für eine Sektion desselben Bereichs, der Speicher des Stellen-Registers ist fest', async () => {
  const { V } = kernAus(produktHtml('privat-de'));
  const fremdeSektion = V._sektorIndexHalter().people.sektionen[0].id;
  const def = (rollen) => Object.assign(kopie(PARTNER), { merkmale: ['personenRegister', 'stellenRegister'], rollen });
  const datei = (rollen) => ({ sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'partner-werkstatt': def(rollen) }) } });
  await saat(V, datei({ personenSektion: 'lager', stellenSektion: 'lager', stellenListe: 'institutionen' }));
  assert.deepEqual(kopie(gesaet(V, 'partner-werkstatt').rollen), { personenSektion: 'lager', stellenSektion: 'lager', stellenListe: 'institutionen' }, 'eigene Sektion und fester Speicher bleiben');
  await saat(V, datei({ personenSektion: fremdeSektion, stellenSektion: 'gibt-es-nicht', schutzbefohleneSektion: 'kinder-sek', stellenListe: 'menschen' }));
  assert.equal(gesaet(V, 'partner-werkstatt').rollen, undefined, 'Sektion eines eingebauten oder fremden Bereichs und ein anderer Speicher: nicht übernommen');

  const sektionsPruefung = " && eigeneSektionen.indexOf(roh[k]) >= 0) rollen[k] = roh[k];";
  const speicherPruefung = "if (roh[k] === _BEREICH_AUS_DATEI_SPEICHER[k]) rollen[k] = roh[k];";
  for (const z of [sektionsPruefung, speicherPruefung]) assert.equal(KERN_HTML.split(z).length, 2, 'Vorbedingung: steht genau einmal: ' + z);
  const ohneSektion = kernVariante('rolle-fremde-sektion-', (h) => h.replace(sektionsPruefung, ") rollen[k] = roh[k];"));
  await saat(ohneSektion, datei({ personenSektion: fremdeSektion }));
  assert.equal(gesaet(ohneSektion, 'partner-werkstatt').rollen.personenSektion, fremdeSektion, 'Rot-Beweis: ohne die Prüfung zeigte die Rolle in einen fremden Bereich');
  const ohneSpeicher = kernVariante('rolle-fremder-speicher-', (h) => h.replace(speicherPruefung, "if (typeof roh[k] === 'string') rollen[k] = roh[k];"));
  await saat(ohneSpeicher, datei({ stellenListe: 'menschen' }));
  assert.equal(gesaet(ohneSpeicher, 'partner-werkstatt').rollen.stellenListe, 'menschen', 'Rot-Beweis: ohne die Prüfung läse das Register einen anderen Speicher des Depots');
});

/* Ein Bereich aus der Datei mit beiden Registern, dem Anker-Merkmal und den Anker-Rollen: die Register zeigen ihre Zeilen, und
   nichts, was dort oder in seinen Feldern geschieht, erreicht Ankernamen, Familienstand oder einen Auszug. */
const REGISTER_BEREICH = () => ({ id: 'partner-kontakte', icon: 'users', label: 'Partner-Kontakte',
  merkmale: ['stellenRegister', 'personenRegister', 'ankerIdentitaet'],
  rollen: { stellenListe: 'institutionen', stellenSektion: 'stellen', personenListe: 'menschen', personenSektion: 'leute',
    ankerNameFelder: ['notiz'], familienstandFeld: 'stand', auszugSektion: 'leute' },
  sektionen: [{ id: 'stellen', label: 'Stellen', felder: [{ id: 'notiz', typ: 'text', label: 'Notiz' }] },
    { id: 'leute', label: 'Leute', felder: [{ id: 'stand', typ: 'text', label: 'Stand' }] }] });
async function registerBereichOffen() {
  const { V, document } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  const d = V.getData();
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift, { bereichsErsatz: ersatzAus({ 'partner-kontakte': REGISTER_BEREICH() }) });
  d.sektoren['partner-kontakte'] = { notiz: 'Notiz im Bereich' };
  d.institutionen = (d.institutionen || []).concat([{ id: 'i-probe', name: 'Stadtwerke Stellenzeile' }]);
  d.menschen = (d.menschen || []).concat([{ id: 'm-probe', name: 'Bruno Personenzeile' }]);
  await V._depotModuleAbWerkPruefen(d, true);
  V._bereichsModuleAusDepotAnmelden(d);
  return { V, document, d };
}
test('[Datei öffnet überall·Lesbar] ein Register-Bereich aus der Datei zeigt jede Angabe: Feld, Stellen-Zeile und Personen-Zeile', async () => {
  const k = await registerBereichOffen();
  assert.equal(k.V._bereichFremdeMarkeHerkunft('partner-kontakte'), 'datei', 'Vorbedingung: der Bereich gilt als „aus der Datei“');
  const html = gezeigt(k, 'partner-kontakte');
  for (const w of ['Notiz im Bereich', 'Stadtwerke Stellenzeile', 'Bruno Personenzeile']) assert.ok(html.includes(w), 'steht da: ' + w);
  assert.ok(html.includes('marke-fremd'), 'mit dem Rand „fremd“');
  assert.ok(k.V.modulHerkunftBerechnen(k.d).module.some((m) => m.typ === 'bereich' && m.kennung === 'partner-kontakte' && m.stand === 'ungeprueft'), 'und zählt als Erweiterung ohne geprüfte Herkunft');
});
test('[Datei öffnet überall·Rechte] Eingaben im Register-Bereich aus der Datei erreichen weder Ankernamen noch Familienstand noch einen Auszug', async () => {
  const { V, d } = await registerBereichOffen();
  const id = 'partner-kontakte';
  assert.equal(V.bereichKann(id, 'ankerIdentitaet'), false, 'das Anker-Merkmal ist wirkungslos');
  for (const [feld, rolle] of [['notiz', 'ankerNameFelder'], ['stand', 'familienstandFeld']]) assert.equal(V.bereichFeldHatRolle(id, feld, rolle), false, rolle);
  assert.equal(V.bereichRolle(id, 'auszugSektion'), null, 'kein Auszug hängt an einer Sektion des Bereichs');
  assert.equal(V.bereichRolle(id, 'personenListe'), null, 'die Listen-Rolle der Personen, die Ausgaben speist, ist nicht übernommen');
  const oderNull = (x) => (x === undefined ? null : kopie(x));
  const stand = () => ({ menschenVorher: oderNull(d.menschen.filter((m) => m.id !== 'm-probe' && m.id !== 'm-neu')), identity: oderNull(d.sektoren.identity), ereignisse: oderNull(d.ereignisse) });
  const vorher = stand();
  V.sektorFeldSetzen(id, 'notiz', 'Ein anderer Name');
  V.sektorFeldSetzen(id, 'stand', 'geschieden');
  d.menschen.push({ id: 'm-neu', name: 'Neue Person über das Register' });
  d.institutionen.push({ id: 'i-neu', name: 'Neue Stelle über das Register' });
  assert.deepEqual(stand(), vorher, 'Ankername (die Person der Inhaberin), Identität und Ereignisse sind unverändert');
  assert.equal(d.sektoren[id].notiz, 'Ein anderer Name', 'die Eingabe steht im Bereich selbst');
});

/* Regal und Instrumente-Liste werden abgestreift: die Zeilen sind ein Feld des Bereichs und stehen in der Abschnittsliste. */
test('[Datei öffnet überall·Lesbar] ohne das Regal stehen die Zeilen der Instrumente-Liste in der schlichten Abschnittsliste', async () => {
  const quelle = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'bereich-templates', 'vivodepot-advanceCare.json'), 'utf8')).bereiche.advanceCare;
  const liste = quelle.rollen.instrumenteListe;
  const def = Object.assign(kopie(quelle), { id: 'partner-vorsorge', label: 'Partner-Vorsorge' });
  const { V, document } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  const d = V.getData();
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift, { bereichsErsatz: ersatzAus({ 'partner-vorsorge': def }) });
  d.sektoren['partner-vorsorge'] = { [liste]: [{ instrument: 'will', morePreciseDescription: 'Testament Zeile Eins' }, { instrument: 'living-will', morePreciseDescription: 'Verfügung Zeile Zwei' }] };
  await V._depotModuleAbWerkPruefen(d, true);
  V._bereichsModuleAusDepotAnmelden(d);
  const b = V._sektorIndexHalter()['partner-vorsorge'];
  assert.ok(b && b.merkmale === undefined && b.rollen === undefined, 'Vorbedingung: schlicht, ohne Regal und ohne Listen-Rolle');
  const html = gezeigt({ V, document }, 'partner-vorsorge');
  for (const w of ['Testament Zeile Eins', 'Verfügung Zeile Zwei']) assert.ok(html.includes(w), 'steht da: ' + w);
});

/* ── 5b · Feld, Unterfeld und Option eines Bereichs „aus der Datei“ ───────────────────────────────────────────────── */
/* Befund DATEI-BEREICH-FELD-EIGENSCHAFTEN (11.10.2026): am Bereich selbst fiel alles mit Wirkung weg, seine Felder gingen aber
   mit allen Eigenschaften durch. Ein Feld mit der Marke `frist` oder ein Unterfeld mit der Marke `laeuftAb` setzte damit einen
   Termin in die Prüftermine des Depots, also außerhalb seines Bereichs. */
const HEUTE_PROBE = new Date('2026-10-11T00:00:00Z');
const TERMIN_BEREICH = () => Object.assign(kopie(PARTNER), { sektionen: [{ id: 'lager', label: 'Lager', felder: [
  { id: 'ablauf', typ: 'datum', label: 'Ablauf', marken: ['frist'] },
  { id: 'posten', typ: 'liste', label: 'Posten', unterFelder: [{ id: 'name', typ: 'text', label: 'Name' }, { id: 'bis', typ: 'datum', label: 'Gültig bis', marken: ['laeuftAb'] }] },
] }] });
const TERMIN_WERTE = () => ({ ablauf: '2026-10-20', posten: [{ id: 'z-1', name: 'Posten eins', bis: '2026-10-20' }] });
async function termineAusDateiBereich(V, fach) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  const d = V.getData();
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift, fach === 'bereich'
    ? { bereich: (d.abWerkMitschrift.bereich || []).concat([{ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de', bereiche: { 'partner-werkstatt': TERMIN_BEREICH() } }]) }
    : { bereichsErsatz: ersatzAus({ 'partner-werkstatt': TERMIN_BEREICH() }) });
  d.sektoren['partner-werkstatt'] = TERMIN_WERTE();
  await V._depotModuleAbWerkPruefen(d, true);
  V._bereichsModuleAusDepotAnmelden(d);
  assert.equal(V._bereichFremdeMarkeHerkunft('partner-werkstatt'), 'datei', 'Vorbedingung: der Bereich ist angemeldet und gilt als „aus der Datei“');
  return kopie(V.prueftermineFristen(HEUTE_PROBE).concat(V.prueftermineZeilen(HEUTE_PROBE))).filter((t) => String(t.id).includes('partner-werkstatt')).map((t) => t.id).sort();
}
for (const fach of ['bereich', 'bereichsErsatz']) {
  test('[Datei öffnet überall·Felder·' + fach + '] ein Feld eines Bereichs aus der Datei setzt keinen Termin in die Prüftermine des Depots', async () => {
    const { V } = kernAus(produktHtml('privat-de'));
    assert.deepEqual(await termineAusDateiBereich(V, fach), [], 'weder über die Marke „frist“ am Feld noch über „laeuftAb“ am Unterfeld');
  });
}

/* Die vier Listen sind geschlossen und wörtlich gepinnt; je gestrichener Eigenschaft der Rot-Beweis gegen eine Kern-Variante,
   die Felder nicht abstreift. */
const FELD_ABSTREIFEN = 'if (Array.isArray(raus.felder)) raus.felder = raus.felder.map((f) => _feldAusDateiSchlicht(f, _BEREICH_AUS_DATEI_FELD));';
const GESTRICHEN_FELD = Object.freeze({ marken: ['frist'], fristRegel: { dauer: 'monat' }, pruefIntervallMonate: 12, gueltigkeitVorschlag: { regel: 'ausweisdauer' },
  verweisZweck: 'wohnen', rolle: 'arzt', quelle: 'identity', codeListe: 'iso-3166', ersetztDurch: ['regal'], sichtbarWenn: { feld: 'regal', wert: 'x' },
  verborgenWenn: { feld: 'regal', wert: 'x' }, verweisKontextFeld: 'regal', mitGeburt: true, art: 'anschrift', unbekannteEigenschaftVonMorgen: true });
test('[Datei öffnet überall·Felder] die Listen für Abschnitt, Feld, Unterfeld und Option sind geschlossen; jede andere Eigenschaft fällt, mit Rot-Beweis', async () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_ABSCHNITT), ['id', 'label', 'hint', 'felder']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_FELD), ['id', 'typ', 'label', 'hint', 'beispiel', 'optionen', 'unterFelder', 'entitaet', 'eingabeTyp', 'inputmode',
    'vorschlaege', 'ebene', 'zusammenfassungFelder', 'nurAnzeige', 'nurMitWert', 'sensibel', 'pflicht', 'keineZukunft', 'datumJahrMin']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_UNTERFELD), ['id', 'typ', 'label', 'hint', 'beispiel', 'optionen', 'entitaet', 'eingabeTyp', 'inputmode', 'vorschlaege',
    'ebene', 'zusammenfassungFelder', 'unterdrueckeInZusammenfassungWennGesetzt', 'nurAnzeige', 'nurMitWert', 'sensibel', 'pflicht', 'keineZukunft', 'datumJahrMin']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_OPTION), ['wert', 'label']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_FELDTYPEN), ['text', 'textarea', 'zahl', 'datum', 'auswahl', 'mehrfachauswahl', 'checkbox', 'liste', 'hinweis', 'ref', 'refMehrfach']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_ENTITAET), ['institution']);
  assert.deepEqual(kopie(V._BEREICH_AUS_DATEI_VERWEISTYPEN), ['ref', 'refMehrfach']);
  assert.equal(KERN_HTML.split(FELD_ABSTREIFEN).length, 2, 'Vorbedingung: das Abstreifen der Felder steht genau einmal');
  const ohne = kernVariante('felder-ohne-abstreifen-', (h) => h.replace(FELD_ABSTREIFEN, ''));
  const def = () => Object.assign(kopie(PARTNER), { sektionen: [{ id: 'lager', label: 'Lager', nichtVorgesehen: 1, felder: [
    Object.assign({ id: 'regal', typ: 'text', label: 'Regal' }, kopie(GESTRICHEN_FELD)),
    { id: 'wahl', typ: 'auswahl', label: 'Wahl', optionen: [Object.assign({ wert: 'a', label: 'A' }, { nichtVorgesehen: 1 })] },
    { id: 'posten', typ: 'liste', label: 'Posten', unterFelder: [Object.assign({ id: 'name', typ: 'text', label: 'Name' }, kopie(GESTRICHEN_FELD))] },
    { id: 'karte', typ: 'passport', label: 'Karte' }, { id: 'wer', typ: 'ref', label: 'Wer', entitaet: 'person' },
    { id: 'wo', typ: 'ref', label: 'Wo', entitaet: 'institution' }, { id: 'akte', typ: 'ref', label: 'Akte', entitaet: 'mappe' },
  ] }] });
  const datei = () => ({ sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ 'partner-werkstatt': def() }) } });
  const feld = (W, id) => gesaet(W, 'partner-werkstatt').sektionen[0].felder.find((f) => f.id === id);
  await saat(V, datei());
  await saat(ohne, datei());
  for (const k of Object.keys(GESTRICHEN_FELD)) {
    assert.equal(feld(V, 'regal')[k], undefined, 'Feld: ' + k + ' fällt');
    assert.notEqual(feld(ohne, 'regal')[k], undefined, 'Feld: ohne das Abstreifen trüge das Feld ' + k + ' — genau das fängt die Zeile darüber');
    assert.equal(feld(V, 'posten').unterFelder[0][k], undefined, 'Unterfeld: ' + k + ' fällt');
    assert.notEqual(feld(ohne, 'posten').unterFelder[0][k], undefined, 'Unterfeld: Rot-Beweis ' + k);
  }
  assert.equal(feld(V, 'wahl').optionen[0].nichtVorgesehen, undefined, 'Option: nur wert und label');
  assert.equal(feld(ohne, 'wahl').optionen[0].nichtVorgesehen, 1, 'Option: Rot-Beweis');
  assert.equal(feld(V, 'karte').typ, 'text', 'ein Typ außerhalb der Typenliste wird als Text gezeigt');
  assert.equal(feld(ohne, 'karte').typ, 'passport', 'Typ: Rot-Beweis');
  assert.equal(feld(V, 'wer').entitaet, undefined, 'die Art „person“ fällt: der Name bleibt ohne sie lesbar, und kein Sammler von Personen-Verweisen sieht das Feld');
  assert.equal(feld(V, 'akte').entitaet, undefined, 'jede andere Art fällt');
  assert.equal(feld(V, 'wo').entitaet, 'institution', 'die Art „institution“ bleibt, sonst wäre die Stelle nicht als Name lesbar');
  for (const id of ['wer', 'wo', 'akte']) assert.equal(feld(V, id).nurAnzeige, true, id + ': ein Verweis wird nur gelesen');
  assert.equal(feld(ohne, 'wer').entitaet, 'person', 'Art des Verweises: Rot-Beweis');
  assert.equal(feld(ohne, 'wer').nurAnzeige, undefined, 'Nur-Lesen des Verweises: Rot-Beweis');
});

/* Klassenwächter: jede Eigenschaft, die in einer Bereichsdefinition des Repos an Feld, Unterfeld oder Option vorkommt oder in den
   zwei Schlüssellisten des Kerns für Vorlagen-Felder steht, ist eingeordnet. Eine neue Eigenschaft ohne Einordnung ist rot: wer sie
   einführt, entscheidet hier, ob ein Bereich aus der Datei sie behält (dann Einzelwort für die Liste im Kern) oder verliert. */
const FAELLT_BENANNT = Object.freeze(['marken', 'fristRegel', 'pruefIntervallMonate', 'gueltigkeitVorschlag', 'verweisZweck', 'rolle', 'quelle', 'codeListe',
  'ersetztDurch', 'sichtbarWenn', 'verborgenWenn', 'verweisKontextFeld', 'mitGeburt', 'art',
  /* nur in den Schlüssellisten des Kerns für Vorlagen-Felder; an einem Bereichs-Feld aus der Datei ohne Wirkung vorgesehen */
  'feldname', 'feldtyp', 'bereich', 'gruppe', 'mehrzeilig', '_vorlageVersion', 'einheit', 'referenzbereich', 'warnWennJa', 'mitMessdatum',
  'hilfetext', 'codeWerte', 'codeSystem', 'provenienzPflichtig', 'situation', 'ziel']);
test('[Datei öffnet überall·Felder·Klasse] jede Feld-Eigenschaft des Repos ist eingeordnet: bleibt oder fällt, nichts dazwischen', () => {
  const E = require('../tools/bereich-eigenschaften-lesestellen-messen.js');
  const { V } = ladeKern({ blank: true });
  const repo = path.join(__dirname, '..');
  const dateien = fs.readdirSync(path.join(repo, 'tools', 'bereich-templates')).filter((f) => f.endsWith('.json')).map((f) => path.join(repo, 'tools', 'bereich-templates', f))
    .concat(fs.readdirSync(path.join(repo, 'tools', 'berufsmodule')).filter((f) => /bereich.*\.json$/.test(f)).map((f) => path.join(repo, 'tools', 'berufsmodule', f)))
    .concat([path.join(repo, 'tools', 'vivodepot-bereiche-bekannt.json')]);
  const ebenen = E.eigenschaftenJeEbene(dateien.flatMap((f) => E.definitionenAus(JSON.parse(fs.readFileSync(f, 'utf8')))));
  assert.ok(ebenen.feld.size >= 20 && ebenen.unterfeld.size >= 15 && ebenen.option.size >= 2, 'Vorbedingung: die Definitionen des Repos sind gelesen');
  const kernListen = E.schluesselListe(KERN_HTML, '_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL').concat(E.schluesselListe(KERN_HTML, '_TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL'));
  assert.ok(kernListen.length >= 40, 'Vorbedingung: die zwei Schlüssellisten des Kerns sind gelesen');
  const bleibt = { abschnitt: kopie(V._BEREICH_AUS_DATEI_ABSCHNITT), feld: kopie(V._BEREICH_AUS_DATEI_FELD), unterfeld: kopie(V._BEREICH_AUS_DATEI_UNTERFELD), option: kopie(V._BEREICH_AUS_DATEI_OPTION) };
  const ohneEinordnung = [];
  for (const ebene of Object.keys(ebenen)) for (const k of ebenen[ebene]) if (!bleibt[ebene].includes(k) && !FAELLT_BENANNT.includes(k)) ohneEinordnung.push(ebene + ':' + k);
  for (const k of kernListen) if (!bleibt.feld.includes(k) && !bleibt.unterfeld.includes(k) && !FAELLT_BENANNT.includes(k)) ohneEinordnung.push('kern:' + k);
  assert.deepEqual([...new Set(ohneEinordnung)].sort(), []);
  /* Rot-Beweis: eine Eigenschaft, die niemand eingeordnet hat, fällt auf. */
  const mitNeuer = E.eigenschaftenJeEbene([{ sektionen: [{ id: 's', felder: [{ id: 'f', typ: 'text', neueEigenschaftOhneEinordnung: 1 }] }] }]);
  assert.ok([...mitNeuer.feld].some((k) => !bleibt.feld.includes(k) && !FAELLT_BENANNT.includes(k)), 'eine neue Eigenschaft wird gefunden');
  /* Keine Eigenschaft steht in beiden Lagern. */
  assert.deepEqual(FAELLT_BENANNT.filter((k) => bleibt.feld.includes(k) || bleibt.unterfeld.includes(k) || bleibt.option.includes(k)), []);
});

/* „Lesbar bleibt alles“ auf Feld-Ebene: eine Angabe hinter einer Sichtbarkeitsbedingung steht da, ein Verweis auf eine Stelle zeigt
   ihren Namen, und ein Feld mit fremdem Typ zeigt seinen Wert. */
test('[Datei öffnet überall·Felder·Lesbar] Bedingung, Verweis auf eine Stelle und fremder Typ: jede Angabe steht da', async () => {
  const { V, document } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  const d = V.getData();
  const def = Object.assign(kopie(PARTNER), { sektionen: [{ id: 'lager', label: 'Lager', felder: [
    { id: 'schalter', typ: 'text', label: 'Schalter' },
    { id: 'versteckt', typ: 'text', label: 'Nur bei Schalter', sichtbarWenn: { feld: 'schalter', wert: 'an' } },
    { id: 'verborgen', typ: 'text', label: 'Nicht bei Schalter', verborgenWenn: { feld: 'schalter', wert: 'aus' } },
    { id: 'stelle', typ: 'ref', label: 'Stelle', entitaet: 'institution', verweisZweck: 'wohnen', rolle: 'vermieter' },
    { id: 'mensch', typ: 'ref', label: 'Mensch', entitaet: 'person', verweisZweck: 'vollmacht', rolle: 'bevollmaechtigte' },
    { id: 'menschen', typ: 'refMehrfach', label: 'Menschen', entitaet: 'person', rolle: 'bevollmaechtigte' },
    { id: 'karte', typ: 'passport', label: 'Karte' },
  ] }] });
  d.institutionen = (d.institutionen || []).concat([{ id: 'i-probe', name: 'Stadtwerke Verweisname' }]);
  d.menschen = (d.menschen || []).concat([{ id: 'm-probe', name: 'Bruno Verweisname' }, { id: 'm-zwei', name: 'Carla Verweisname' }]);
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift, { bereichsErsatz: ersatzAus({ 'partner-werkstatt': def }) });
  const werte = { schalter: 'aus', versteckt: 'Angabe hinter der Bedingung', verborgen: 'Angabe hinter der zweiten Bedingung', stelle: { ref: 'i-probe' }, mensch: { ref: 'm-probe' }, menschen: [{ ref: 'm-probe' }, { ref: 'm-zwei' }], karte: 'Wert im fremden Typ' };
  /* Was außerhalb des Bereichs entsteht, gemessen ohne und mit dem Bereich an demselben Depot. */
  const aussen = () => ({ vcard: String(V.vcardMenschen({})), vollmacht: JSON.stringify(V.kbvPkaVollmacht({}) || null), ereignisFelder: kopie(V._ereignisAlleEntitaetPersonFelder()).filter((x) => x.sektorId === 'partner-werkstatt'),
    menschen: kopie(d.menschen), institutionen: kopie(d.institutionen) });
  const vorher = aussen();
  d.sektoren['partner-werkstatt'] = werte;
  await V._depotModuleAbWerkPruefen(d, true);
  V._bereichsModuleAusDepotAnmelden(d);
  const html = gezeigt({ V, document }, 'partner-werkstatt');
  for (const w of ['Angabe hinter der Bedingung', 'Angabe hinter der zweiten Bedingung', 'Stadtwerke Verweisname', 'Bruno Verweisname', 'Carla Verweisname', 'Wert im fremden Typ']) assert.ok(html.includes(w), 'steht da: ' + w);
  /* Ein Verweisfeld eines Bereichs aus der Datei wirkt nicht außerhalb seines Bereichs: keine Zeile in der vCard der Personen, nichts in
     der Vollmacht-Ausgabe, kein Feld für die Ereignis-Achse, kein neuer Eintrag in den Registern. Die Rückverweis-Anzeige
     („wird verwendet in“) nennt den Bereich bei der Stelle: sie zeigt nur, was in der Datei steht. */
  assert.deepEqual(aussen(), vorher, 'vCard, Vollmacht-Ausgabe, Ereignis-Felder und Register sind mit dem Bereich dieselben wie ohne');
  assert.deepEqual(kopie(V.institutionReferenzStellen('i-probe')).map((x) => x.sektor), ['partner-werkstatt'], 'die Rückverweis-Anzeige zeigt die Fundstelle, mehr nicht');
});

/* Sicherbarkeit: eine Anwendung, die die Definition nicht erkennt, zeigt sie schlicht und lässt sie beim Sichern unverändert; die
   erkennende Anwendung zeigt danach wieder alles. Eingabe in der schlichten Darstellung verformt die Angaben nicht. */
const REGAL_BEREICH = 'pro-vertretung-vollmachten';
test('[Datei öffnet überall·Sichern] öffnen, eingeben und sichern in einer Anwendung, die die Definition nicht erkennt: Definition und Angaben bleiben, die erkennende Anwendung zeigt danach alles', async () => {
  let feld = null;
  const pro = await depotImProduktAnlegen('pro-de', PW, (V) => {
    V.akteurSelbstErklaeren('Amina');
    for (const s of V._sektorIndexHalter()[PRO_BEREICH].sektionen) for (const f of s.felder) if (!feld && f.typ === 'text') feld = f.id;
    V.sektorFeldSetzen(PRO_BEREICH, feld, 'Wert aus Pro');
  });
  const definitionen = (d) => Object.fromEntries(d.abWerkMitschrift.bereich.flatMap((m) => Object.entries(m.bereiche)).filter(([id]) => id.indexOf('pro-') === 0));
  const vorher = kopie(definitionen(pro.V.getData()));
  assert.ok(vorher[REGAL_BEREICH] && vorher[REGAL_BEREICH].merkmale.includes('vorsorgeRegal'), 'Vorbedingung: die Pro-Datei trägt einen Bereich mit Merkmal');

  const alt = await ladenIn(produktOhneMengen('privat-de'), pro.umschlag);
  assert.deepEqual(herkunftDatei(alt.V).filter((id) => id.indexOf('pro-') === 0), Object.keys(vorher).sort(), 'die nicht erkennende Anwendung zeigt jeden Pro-Bereich, als „aus der Datei“');
  assert.equal(alt.V._sektorIndexHalter()[REGAL_BEREICH].merkmale, undefined, 'schlicht: ohne das Merkmal');
  assert.ok(gezeigt(alt, PRO_BEREICH).includes('Wert aus Pro'), 'die Angabe steht da');
  alt.V.akteurSelbstErklaeren('Amina');
  alt.V.sektorFeldSetzen(PRO_BEREICH, feld, 'Wert geändert in der schlichten Darstellung');
  alt.V.sektorFeldSetzen('identity', 'givenName', 'Amina');
  const gesichert = await alt.V.depotSerialisieren();

  const neu = await ladenIn(produktHtml('privat-de'), gesichert);
  assert.deepEqual(kopie(definitionen(neu.d)), vorher, 'die Definitionen stehen unverändert in der Datei, samt Merkmalen');
  assert.equal(neu.d.sektoren[PRO_BEREICH][feld], 'Wert geändert in der schlichten Darstellung', 'die Eingabe ist da, in derselben Form');
  assert.deepEqual(Object.keys(neu.d.sektoren[PRO_BEREICH]), Object.keys(pro.V.getData().sektoren[PRO_BEREICH]), 'kein Feld dazu, keins weg');
  assert.deepEqual(herkunftDatei(neu.V), [], 'die erkennende Anwendung führt die Bereiche wieder als ausgeliefert');
  assert.ok(neu.V._sektorIndexHalter()[REGAL_BEREICH].merkmale.includes('vorsorgeRegal'), 'mit voller Darstellung');
});

/* ── 6 · Lese-App ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const { ladeLesen } = require('./load-lesen.js');
async function leseAppMit(d) {
  const { V } = ladeLesen({ ohneSaat: true });
  V.setData(await V._depotUebernehmenGeprueft(kopie(d)));
  return V;
}
async function proDateiMitWert() {
  let feld = null;
  const { V } = await depotImProduktAnlegen('pro-de', PW, (K) => {
    K.akteurSelbstErklaeren('Amina');
    for (const s of K._sektorIndexHalter()[PRO_BEREICH].sektionen) for (const f of s.felder) if (!feld && f.typ === 'text') feld = f.id;
    K.sektorFeldSetzen(PRO_BEREICH, feld, 'Probe-Wert-Lese');
  });
  return kopie(V.getData());
}

test('[Mitschrift·Bereich·Lese-App] die echte Pro-Datei zeigt ihren Bereich; ein untergeschobener Bereich wird gezeigt, schlicht, und zählt in der Herkunft', async () => {
  const echt = await proDateiMitWert();
  const L1 = await leseAppMit(echt);
  assert.ok(String(L1.sektorHTML(PRO_BEREICH)).includes('Probe-Wert-Lese'), 'die echte Datei: der Wert steht im Bereich');
  const ohne = kopie(L1.modulHerkunftBerechnen());

  const d = kopie(echt);
  const modul = fremdModul();
  Object.assign(modul.bereiche.untergeschoben, { merkmale: ['vorsorgeRegal'], rollen: { telefonFeld: 'f' }, wizards: ['vorsorge'], exporte: ['pdf'] });
  d.abWerkMitschrift.bereich.push(modul);
  d.sektoren.untergeschoben = { f: 'Wert bleibt' };
  const L2 = await leseAppMit(d);
  assert.ok(L2.SEKTOR_BY_ID.untergeschoben, 'angemeldet');
  assert.ok(String(L2.sektorHTML('untergeschoben')).includes('Wert bleibt'), 'die Angabe steht da');
  assert.deepEqual(Object.keys(L2.SEKTOR_BY_ID.untergeschoben).sort(), ['angedockt', 'herkunft', 'id', 'label', 'sektionen'], 'die Lese-App übernimmt aus einem Datei-Bereich nur Kennung, Beschriftung und Abschnitte');
  assert.ok(!kopie(L2._darstellungsLuecken()).bereichIds.includes('untergeschoben'), 'ein gezeigter Bereich ist keine Lücke');
  assert.equal(kopie(L2.modulHerkunftBerechnen()).ungeprueft, ohne.ungeprueft + 1, 'die Herkunft zählt ihn als Erweiterung ohne geprüfte Herkunft');
  assert.ok(String(L2.sektorHTML(PRO_BEREICH)).includes('Probe-Wert-Lese'), 'die echten Bereiche bleiben');
});

test('[Mitschrift·Bereichsersatz·Lese-App] aus dem Fach bereichsErsatz wird jede Definition gezeigt; nur die ausgelieferte zählt nicht in der Herkunft', async () => {
  const echt = await proDateiMitWert();
  const d = kopie(echt);
  d.abWerkMitschrift.bereich = [];
  d.abWerkMitschrift.bereichsErsatz = ersatzAus({ [PRO_BEREICH]: kopie(BEKANNT()[PRO_BEREICH]), untergeschoben: kopie(FREMD) });
  d.sektoren.untergeschoben = { f: 'Wert bleibt' };
  const L = await leseAppMit(d);
  assert.ok(L.SEKTOR_BY_ID[PRO_BEREICH] && L.SEKTOR_BY_ID.untergeschoben, 'beide werden angemeldet');
  assert.ok(String(L.sektorHTML('untergeschoben')).includes('Wert bleibt'));
  assert.deepEqual(kopie(L.modulHerkunftBerechnen()).module.filter((m) => m.slot === 'abWerkMitschrift.bereichsErsatz').length, 1, 'gezählt wird genau der nicht erkannte');
});

test('[Mitschrift·Bereich·Lese-App·Rot-Beweis] ohne die Inhaltsprüfung zählt die Herkunft den untergeschobenen Bereich nicht; mit dem Filter fehlte er', async () => {
  const zaehlung = "BEREICH_IDS_EINGEBAUT_LESEN.indexOf(id) >= 0 || _bereichsDefinitionAusgeliefertLesen(bereiche[id])) continue;";
  assert.equal(LESE_HTML.split(zaehlung).length, 2, 'Vorbedingung: die Zeile der Zählung steht genau einmal');
  const d = await proDateiMitWert();
  d.abWerkMitschrift.bereich.push(fremdModul());
  const L = await leseAppMit(d);
  const alt = ladeLesen({ ohneSaat: true, html: LESE_HTML.replace(zaehlung, "BEREICH_IDS_EINGEBAUT_LESEN.indexOf(id) >= 0 || true) continue;") }).V;
  alt.setData(await alt._depotUebernehmenGeprueft(kopie(d)));
  assert.equal(kopie(alt.modulHerkunftBerechnen()).ungeprueft, kopie(L.modulHerkunftBerechnen()).ungeprueft - 1, 'der alte Stand führt ihn wie einen ausgelieferten — genau das fängt die Probe oben');
  const anmeldung = "  const liste = eigene.concat(_mitschriftBereichsQuellenLesen(ziel));";
  assert.equal(LESE_HTML.split(anmeldung).length, 2, 'Vorbedingung: die Zeile der Anmeldung steht genau einmal');
  const mitFilter = ladeLesen({ ohneSaat: true, html: LESE_HTML.replace(anmeldung,
    "  const liste = eigene.concat(_mitschriftBereichsQuellenLesen(ziel).map((m) => Object.assign({}, m, { bereiche: Object.fromEntries(Object.entries(m.bereiche || {}).filter(([id, def]) => BEREICH_IDS_EINGEBAUT_LESEN.indexOf(id) >= 0 || _bereichsDefinitionAusgeliefertLesen(def))) })));") }).V;
  mitFilter.setData(await mitFilter._depotUebernehmenGeprueft(kopie(d)));
  assert.ok(L.SEKTOR_BY_ID.untergeschoben && !mitFilter.SEKTOR_BY_ID.untergeschoben, 'der Filter blendet ihn aus — genau das fängt die Probe oben');
});

/* ── 6b · Der synchrone Weg des Laders urteilt wie das echte Öffnen ────────────────────────────────────────────────── */
/* tests/load-lesen.js fährt vor dem Falten dieselbe Inhaltsprüfung in synchroner Form (die Funktionen der Lese-App, nur der SHA-256
   aus Node). Je Definition müssen beide Wege dasselbe Urteil geben: über die ausgelieferten Definitionen, die zwei Vorlagen der
   früheren Fassungen und jeden Angriffsfall. */
test('[Mitschrift·Bereich·Lader] der synchrone Weg des Laders und der echte Öffnen-Weg geben je Definition dasselbe Urteil', async () => {
  const faelle = [];
  for (const [id, def] of Object.entries(BEKANNT())) faelle.push(['ausgeliefert ' + id, id, def]);
  for (const datei of ['mitschrift-bereich-nach-nachtragen-v923.json', 'mitschrift-bereich-nach-nachtragen-v923-pro.json']) {
    const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', datei), 'utf8'));
    for (const fach of ['bereichBeimAnlegen', 'bereich']) for (const m of fx[fach]) for (const [id, def] of Object.entries(m.bereiche)) faelle.push([datei + ' ' + fach + ' ' + id, id, def]);
  }
  for (const [name, aendern] of ANGRIFFE) { const def = kopie(BEKANNT()[PRO_BEREICH]); aendern(def); faelle.push(['Angriff: ' + name, PRO_BEREICH, def]); }
  faelle.push(['erfunden', 'untergeschoben', kopie(FREMD)], ['andere Kennung', 'andere-kennung', kopie(BEKANNT()[PRO_BEREICH])]);
  const urteil = { synchron: [], echt: [] };
  for (const [, id, def] of faelle) {
    const a = { sektoren: {}, abWerkMitschrift: { bereich: [], bereichsErsatz: ersatzAus({ [id]: kopie(def) }) } };
    const L1 = ladeLesen({ ohneSaat: true }).V;
    L1._bereichsDefinitionenPruefenSynchronLesen(a);
    urteil.synchron.push(L1._bereichsDefinitionAusgeliefertLesen(a.abWerkMitschrift.bereichsErsatz.neu[id]));
    const b = { sektoren: {}, abWerkMitschrift: { bereich: [], bereichsErsatz: ersatzAus({ [id]: kopie(def) }) } };
    const L2 = ladeLesen({ ohneSaat: true }).V;
    const definition = b.abWerkMitschrift.bereichsErsatz.neu[id];
    await L2._depotUebernehmenGeprueft(b);
    urteil.echt.push(L2._bereichsDefinitionAusgeliefertLesen(definition));
  }
  assert.deepEqual(urteil.synchron, urteil.echt, faelle.map((f, i) => f[0] + ': ' + urteil.synchron[i] + '/' + urteil.echt[i]).filter((z) => /true\/false|false\/true/.test(z)).join('; '));
  assert.ok(urteil.echt.filter(Boolean).length >= 6 && urteil.echt.filter((x) => !x).length >= ANGRIFFE.length + 2, 'beide Urteile kommen vor: ' + JSON.stringify(urteil.echt));
});

/* ── 6c · Jede Aufrufstelle übergibt dem Urteil die EIGENEN zwei Mengen ────────────────────────────────────────────── */
/* `_bereichsDefinitionUrteil(strukturen, texte, strukturHex, textHexe)` ist in Kern und Lese-App byte-gleich und kennt keine Menge
   mehr beim Namen. Welche Mengen gelten, entscheidet damit die Aufrufstelle: die Prüfung im Kern, die in der Lese-App und der
   synchrone Weg des Laders. Jede muss die zwei Mengen IHRER Datei in dieser Reihenfolge übergeben. */
const URTEIL_AUFRUF = '_bereichsDefinitionUrteil(';
const urteilAufrufe = (text) => {
  const raus = [];
  for (let i = text.indexOf(URTEIL_AUFRUF); i >= 0; i = text.indexOf(URTEIL_AUFRUF, i + 1)) {
    if (text.slice(i - 9, i) !== 'function ') raus.push(text.slice(i, text.indexOf('\n', i)));
  }
  return raus;
};
const eigeneMengen = (endung) => URTEIL_AUFRUF + 'BEREICHSSTRUKTUREN_AUSGELIEFERT_' + endung + ', BEREICHSTEXTE_AUSGELIEFERT_' + endung + ', ';
const fremdeUrteilAufrufe = (text, endung) => urteilAufrufe(text).filter((z) => !z.startsWith(eigeneMengen(endung)));
const LADER_TEXT = fs.readFileSync(path.join(__dirname, 'load-lesen.js'), 'utf8');
const URTEIL_STELLEN = [['Kern', KERN_HTML, 'KERN'], ['Lese-App', LESE_HTML, 'LESEN'], ['Lader', LADER_TEXT, 'LESEN']];
const urteilFunktion = (text) => { const a = text.indexOf('function ' + URTEIL_AUFRUF); assert.ok(a >= 0, 'das Urteil steht da'); return text.slice(a, text.indexOf('\n}', a) + 2); };

test('[Mitschrift·Bereich·Urteil] jede Aufrufstelle übergibt die eigenen zwei Mengen; das Urteil ist in Kern und Lese-App byte-gleich', () => {
  for (const [name, text, endung] of URTEIL_STELLEN) {
    assert.equal(urteilAufrufe(text).length, 1, name + ': genau eine Aufrufstelle');
    assert.deepEqual(fremdeUrteilAufrufe(text, endung), [], name + ': Struktur-Menge, dann Text-Menge, beide die eigenen');
  }
  assert.equal(urteilFunktion(LESE_HTML), urteilFunktion(KERN_HTML));
  assert.ok(!/AUSGELIEFERT_(KERN|LESEN)/.test(urteilFunktion(KERN_HTML)), 'das Urteil nennt keine Menge beim Namen');
});

const URTEIL_FEHLER = [
  ['vertauschte Menge', (endung) => URTEIL_AUFRUF + 'BEREICHSTEXTE_AUSGELIEFERT_' + endung + ', BEREICHSSTRUKTUREN_AUSGELIEFERT_' + endung + ', '],
  ['leere Menge', (endung) => URTEIL_AUFRUF + 'BEREICHSSTRUKTUREN_AUSGELIEFERT_' + endung + ', new Set(), '],
];
for (const [fehler, falsch] of URTEIL_FEHLER) {
  test('[Mitschrift·Bereich·Urteil·Rot-Beweis] ' + fehler + ': die Probe oben schlägt an jeder Aufrufstelle an, und die ausgelieferte Definition gilt nicht mehr', async () => {
    for (const [name, text, endung] of URTEIL_STELLEN) {
      assert.equal(text.split(eigeneMengen(endung)).length, 2, 'Vorbedingung: ' + name + ' trägt den Aufruf genau einmal');
      assert.equal(fremdeUrteilAufrufe(text.replace(eigeneMengen(endung), falsch(endung)), endung).length, 1, name);
    }
    const def = () => ({ sektoren: {}, abWerkMitschrift: { bereichsErsatz: ersatzAus({ [PRO_BEREICH]: kopie(BEKANNT()[PRO_BEREICH]) }) } });
    const V = kernVariante('bereich-urteil-mengen-', (h) => h.replace(eigeneMengen('KERN'), falsch('KERN')));
    await saat(V, def());
    assert.deepEqual(ausDerDatei(V), [PRO_BEREICH], 'Kern: die ausgelieferte Definition gilt nicht mehr als ausgeliefert');
    const L = ladeLesen({ ohneSaat: true, html: LESE_HTML.replace(eigeneMengen('LESEN'), falsch('LESEN')) }).V;
    const d = def();
    const definition = d.abWerkMitschrift.bereichsErsatz.neu[PRO_BEREICH];
    await L._depotUebernehmenGeprueft(d);
    assert.equal(L._bereichsDefinitionAusgeliefertLesen(definition), false, 'Lese-App: die ausgelieferte Definition ist nicht mehr erkannt');
  });
}

/* ── 7 · Spiegel der Zerlegung in Kern und Lese-App ────────────────────────────────────────────────────────────────── */
test('[Mitschrift·Bereich·Spiegel] die Zerlegung ist in Kern und Lese-App zeichengleich, und beide tragen dieselben zwei Mengen', () => {
  const anfang = "const _BEREICHS_TEXT_SCHLUESSEL = Object.freeze(['label', 'hint', 'beispiel']);\nfunction _bereichsDefinitionZerlegen(definition) {";
  const ende = "    texte: z.texte.map((t) => _kanonischJSON({ art: 'bereichstext', id, ort: t.ort, schluessel: t.schluessel, text: t.text })),\n  };\n}";
  const funktion = (text) => { const a = text.indexOf(anfang); const e = text.indexOf(ende, a); assert.ok(a >= 0 && e > a, 'die Zerlegung steht da'); return text.slice(a, e + ende.length); };
  assert.equal(funktion(LESE_HTML), funktion(KERN_HTML));
  const menge = (text, name) => JSON.parse(text.slice(text.indexOf('const ' + name + ' = new Set(')).match(/new Set\((\[[\s\S]*?\])\)/)[1]);
  for (const [k, l, mindestens] of [['BEREICHSSTRUKTUREN_AUSGELIEFERT_KERN', 'BEREICHSSTRUKTUREN_AUSGELIEFERT_LESEN', 60], ['BEREICHSTEXTE_AUSGELIEFERT_KERN', 'BEREICHSTEXTE_AUSGELIEFERT_LESEN', 3000]]) {
    const kern = menge(KERN_HTML, k);
    assert.ok(kern.length >= mindestens && kern.every((x) => /^sha256:[0-9a-f]{64}$/.test(x)), k + ': jeder Eintrag trägt die Hash-Kennung');
    assert.deepEqual(menge(LESE_HTML, l), kern);
  }
  const { V } = ladeKern({ blank: true });
  const def = BEKANNT()[PRO_BEREICH];
  assert.deepEqual(kopie(V._bereichsDefinitionZerlegen(def)), kopie(zerlegen(def)), 'die Probe zerlegt wie der Kern');
});
