'use strict';
/* Kinder und Schutzbefohlene: erst die Art, dann der Rest (Abnahme v998, Fund 7 der Gestaltungsleitung).
   Vorher standen im Eintrag die Person, dann die Art als Auswahlliste, dazu elf weitere Felder und über der Liste ein Hinweissatz,
   der erklärte, wie der Eintrag funktioniert. Jetzt gilt am gerenderten Listeneintrag:
   · die Art steht als erstes Feld und als Chips (Knöpfe mit aria-pressed in einer Gruppe, der Wert in einem verborgenen Eingabeelement);
   · solange die Art leer ist, ist nur die Art sichtbar (Tor „verborgen solange leer“: `verborgenWenn` mit dem Wert ''); nach der Wahl
     „pflege“ erscheinen die Angaben zur elterlichen Sorge, nach „betreuter_erwachsener“ die Betreuungsfelder; was die Zeile schon
     trägt, bleibt auch ohne Art sichtbar;
   · der Hinweissatz der Liste ist ersatzlos entfallen (in keiner Textsatz-Datei);
   · der Zweitknopf heißt „+ Weitere Person“ (englisch „+ Add another person“);
   · „Alle Angaben“ ist ein Aufklapper im Fluss (Bedienmuster 12, weitereAngabenHTML): aria-expanded, Pfeil › rechts, der beim Öffnen nach unten
     dreht, nie unterstrichen, kein Dialog (Probe dazu: tests/weitere-angaben-aufklapper.test.js).
   Rot-Beweis: derselbe Prüfer meldet die frühere Fassung (Person zuerst, Art als Auswahlliste, ohne das Tor). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const lesen = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
/* Alle Textsatz-Module, die der Baum trägt (Ordnerlesung statt fester Namen: ein Modul, das im Zuschnitt fehlt, fehlt der Probe nicht). */
const ordnerDateien = (ordner, muster) => { try { return fs.readdirSync(path.join(REPO, ordner)).filter((n) => muster.test(n)).map((n) => ordner + '/' + n); } catch (_) { return []; } };
const TEXTSATZ_DATEIEN = [...ordnerDateien('tools', /^textsatz-(de|en)-(pro-)?modul\.json$|^textsatz-en-daten\.js$/), ...fs.readdirSync(path.join(REPO, 'tools'), { withFileTypes: true }).filter((e) => e.isDirectory())
  .flatMap((e) => ordnerDateien('tools/' + e.name, /-sprache\.json$/))];
const NUR_BETREUUNG = ['basisOfRepresentation', 'areasOfResponsibility', 'careCourt', 'fileReferenceNumber', 'validSince'];
const NUR_ELTERLICH = ['legalRepresentationParental', 'custodyArrangement', 'training', 'birthCertificateStorage'];

const kinderFeld = (V) => V.SEKTOR_BY_ID['people'].sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'childrenAndDependants');
/* Zeilen des Eintrags in der Reihenfolge des Bildschirms: { id, sichtbar }. */
function zeilen(html) {
  const raus = [];
  const re = /<div class="feld-zeile feld-zeile-sub" data-sub-zeile="([^"]+)"( hidden)?>/g;
  let m;
  while ((m = re.exec(html))) raus.push({ id: m[1], sichtbar: !m[2] });
  return raus;
}
const sichtbareIds = (html) => zeilen(html).filter((z) => z.sichtbar).map((z) => z.id);

/* Rein: Funde zu einem Eintrag, der noch keine Art trägt. */
function artZuerstFunde(V, feld) {
  const aus = [];
  const html = V.listenEintragInputsHTML(feld, {});
  const z = zeilen(html);
  if (!z.length || z[0].id !== 'type') aus.push('die Art steht nicht an erster Stelle (' + (z[0] && z[0].id) + ')');
  if (!/<div class="feld-mehrfach" role="group" aria-label="[^"]*"><input type="hidden" data-edit="type"/.test(html)) aus.push('die Art ist keine Chip-Gruppe');
  const knoepfe = html.match(/<button type="button" class="feld-mehrfach-pill[^"]*" data-wahl-chip="type"[^>]*aria-pressed="(true|false)"/g) || [];
  if (knoepfe.length !== 6) aus.push('erwartet sechs Chips, gefunden ' + knoepfe.length);
  const offen = sichtbareIds(html);
  if (offen.join() !== 'type') aus.push('ohne Art sichtbar: ' + offen.join(', '));
  return aus;
}

test('[Art·zuerst] ohne Art steht nur die Art da, als erstes Feld und als sechs Chips', () => {
  const { V } = ladeKern();
  assert.deepEqual(artZuerstFunde(V, kinderFeld(V)), []);
});

test('[Art·zuerst·Chips] die Chips sind Knöpfe mit aria-pressed in einer benannten Gruppe, die gewählte ist gedrückt, der Wert liegt im verborgenen Feld', () => {
  const { V } = ladeKern();
  const html = V.listenEintragInputsHTML(kinderFeld(V), { type: 'pflege' });
  assert.match(html, /<div class="feld-mehrfach" role="group" aria-label="Art">/);
  assert.match(html, /<input type="hidden" data-edit="type" data-typ="auswahl" value="pflege">/);
  const chips = [...html.matchAll(/<button type="button" class="([^"]*)" data-wahl-chip="type" value="([^"]*)" aria-pressed="(true|false)">([^<]*)<\/button>/g)];
  assert.deepEqual(chips.map((c) => c[2]), ['leiblich', 'adoptiert', 'pflege', 'stief', 'muendel', 'betreuter_erwachsener'], 'die Werte bleiben unverändert');
  assert.deepEqual(chips.filter((c) => c[3] === 'true').map((c) => c[2]), ['pflege']);
  assert.ok(chips.filter((c) => c[3] === 'true').every((c) => c[1].split(' ').includes('aktiv')));
  assert.ok(chips.every((c) => c[4].trim()), 'jeder Chip trägt seine Beschriftung');
  assert.ok(!/<select[^>]*data-edit="type"/.test(html), 'keine Auswahlliste mehr');
});

test('[Art·zuerst·Chips] das Mindestziel der Chips ist 24 px, und sie sind Knöpfe (Tastatur: Tab, Enter, Leertaste)', () => {
  const css = lesen('tools/erscheinung/stil/grundlage.css');
  const regel = /\.feld-mehrfach-pill \{([^}]*)\}/.exec(css);
  assert.ok(regel, 'der Chip-Baustein ist im Stil');
  assert.ok(Number(/min-height:\s*(\d+)px/.exec(regel[1])[1]) >= 24);
});

test('[Art·zuerst] nach der Wahl „pflege“ erscheinen die Angaben zur elterlichen Sorge, ohne die Betreuungsfelder', () => {
  const { V } = ladeKern();
  const offen = sichtbareIds(V.listenEintragInputsHTML(kinderFeld(V), { type: 'pflege' }));
  assert.equal(offen[0], 'type');
  for (const id of ['person', 'typeAdditionalDetail', 'note', ...NUR_ELTERLICH]) assert.ok(offen.includes(id), id + ' fehlt nach der Wahl');
  for (const id of NUR_BETREUUNG) assert.ok(!offen.includes(id), id + ' gehört zur Betreuung');
});

test('[Art·zuerst] nach der Wahl „betreuter_erwachsener“ erscheinen die Betreuungsfelder, ohne die elterlichen', () => {
  const { V } = ladeKern();
  const offen = sichtbareIds(V.listenEintragInputsHTML(kinderFeld(V), { type: 'betreuter_erwachsener' }));
  for (const id of ['type', 'person', 'typeAdditionalDetail', 'note', ...NUR_BETREUUNG]) assert.ok(offen.includes(id), id + ' fehlt nach der Wahl');
  for (const id of NUR_ELTERLICH) assert.ok(!offen.includes(id), id + ' gehört zur elterlichen Sorge');
});

test('[Art·zuerst] was ein Eintrag ohne Art schon trägt, bleibt sichtbar (der frühere Freitext verschwindet nicht hinter dem Tor)', () => {
  const { V } = ladeKern();
  const feld = kinderFeld(V);
  const offen = sichtbareIds(V.listenEintragInputsHTML(feld, { note: 'Anna (12) und Lukas (9)' }));
  assert.deepEqual(offen, ['type', 'note']);
  assert.equal(V.feldSichtbar(feld.unterFelder.find((u) => u.id === 'person'), { id: 'x' }), false);
});

test('[Art·zuerst] Zusammenfassung und Reihenfolge der Definition bleiben: die Wahl steht nur am Bildschirm vorn', () => {
  const { V } = ladeKern({ zusatzBindungen: ['listeUnterfelderGeordnet', 'listeFreigabeWahl'] });
  const feld = kinderFeld(V);
  assert.equal(feld.unterFelder[0].id, 'person');
  assert.equal(V.__zusatz.listeUnterfelderGeordnet(feld)[0].id, 'type');
  assert.equal(V.__zusatz.listeFreigabeWahl({ unterFelder: [{ id: 'a', typ: 'text' }] }), null, 'ohne ein solches Tor ändert sich nichts');
});

test('[Art·zuerst·Hinweis] der Hinweissatz der Liste ist in keiner Textsatz-Datei mehr, und die Zeile trägt keinen', () => {
  for (const p of TEXTSATZ_DATEIEN) assert.ok(!lesen(p).includes('people.childrenAndDependants.hint'), p + ' trägt den Hinweissatz noch');
  const { V } = ladeKern();
  assert.ok(!kinderFeld(V).hint, 'die Felddefinition trägt keinen Hinweis');
  const html = V.feldZeileHTML(kinderFeld(V), [{ type: 'pflege' }], 'people', true);
  assert.ok(!/Legen Sie für jede Person/.test(html));
});

for (const [produkt, erwartet] of [['privat-de', '+ Weitere Person'], ['privat-en', '+ Add another person']]) {
  test('[Art·zuerst·Zweitknopf] ' + produkt + ': der Knopf unter der Liste heißt „' + erwartet + '“', () => {
    const { V } = ladeKern({ produkt });
    const html = V.feldZeileHTML(kinderFeld(V), [{ type: 'pflege' }], 'people', true);
    const m = /<button type="button" class="btn-mini liste-weitere" data-eintrag-hinzufuegen="childrenAndDependants">([^<]*)<\/button>/.exec(html);
    assert.ok(m, 'der Zweitknopf steht da');
    assert.equal(m[1], erwartet);
  });
}

test('[Art·zuerst·Aufklapper] „Alle Angaben“ ist der Kopf eines Aufklappers: aria-expanded, Pfeil › rechts dreht nach unten, ohne Unterstreichung', () => {
  const { V } = ladeKern();
  const html = V.feldZeileHTML(kinderFeld(V), [], 'people', true);
  assert.match(html, /<button type="button" class="weitere-angaben-kopf" id="weitere-childrenAndDependants-kopf" aria-expanded="false" aria-controls="weitere-childrenAndDependants-inhalt" data-weitere-angaben-kopf="weitere-childrenAndDependants">Alle Angaben<\/button>/);
  const css = lesen('tools/erscheinung/stil/grundlage.css');
  // Der Pfeil › ist ein Winkel aus zwei Rändern (das Zeichen › ist im stil-Teil nicht erlaubt), 45 Grad zu, 135 Grad auf.
  assert.match(css, /\.weitere-angaben-kopf::before \{ content: ''; display: inline-block;[^}]*border-top: 2px solid currentColor;[^}]*transform: rotate\(45deg\);/);
  assert.match(css, /\.weitere-angaben-kopf\[aria-expanded="true"\]::before \{ transform: rotate\(135deg\); \}/);
  const regeln = css.split('}').filter((r) => /\.weitere-angaben-kopf\b/.test(r));
  assert.ok(regeln.length >= 3);
  assert.ok(!regeln.some((r) => /text-decoration:\s*underline/.test(r)), 'nie unterstrichen, auch nicht beim Überfahren');
});

test('[Art·zuerst·Rot-Beweis] die frühere Fassung (Person zuerst, Art als Auswahlliste, ohne das Tor) fällt durch', () => {
  const { V } = ladeKern();
  const alt = JSON.parse(JSON.stringify(kinderFeld(V)));
  for (const u of alt.unterFelder) {
    if (!u.verborgenWenn) continue;
    if (u.verborgenWenn.wert === '') delete u.verborgenWenn;
    else if (Array.isArray(u.verborgenWenn.wert)) u.verborgenWenn.wert = u.verborgenWenn.wert.filter((w) => w !== '');
  }
  const funde = artZuerstFunde(V, alt);
  assert.ok(funde.some((f) => /nicht an erster Stelle/.test(f)));
  assert.ok(funde.some((f) => /keine Chip-Gruppe/.test(f)));
  assert.ok(funde.some((f) => /ohne Art sichtbar/.test(f)));
});

/* ── Ohne Art zeigt „Alle Angaben“ ALLE Unterfelder (Abnahme v998, Fund 7, Nachtrag U2-ADR-109) ──────────────────────────────────
   Vorher blendete _listenEintragBedingungVerdrahten den Aufklapper aus, solange nur die Wahl stand, und der Dialog öffnete ohne Art mit
   der Wahl allein: wer die Art nicht kannte, fand die übrigen Angaben nirgends. Jetzt ist der Aufklapper immer da; ist er offen
   (data-alle-angaben am Eintrag), zeigt der Eintrag ohne gewählte Art jedes Unterfeld, und die Wahl der Art schaltet danach wieder nach den
   Bedingungen. Dasselbe gilt für den Dialog „Bearbeiten“. Gemessen an der Verdrahtung mit einem Behälter, der nur die Abfragen der Verdrahtung
   kennt (der Knoten-Stub schaltet nichts um). */
function behaelter(werte, alle) {
  const zeilen = {};
  const hoerer = [];
  return {
    zeilen, werte,
    querySelectorAll: () => [],
    addEventListener: (ev, fn) => hoerer.push(fn),
    neuBewerten: () => hoerer.forEach((fn) => fn()),
    querySelector(sel) {
      let m;
      if ((m = /^\[data-sub-zeile="([^"]+)"\]$/.exec(sel))) return (zeilen[m[1]] = zeilen[m[1]] || { hidden: undefined });
      if (sel === '[data-alle-angaben]') return alle ? {} : null;
      if ((m = /^\[data-(?:eintrag-)?edit(?:-ref|-override)?="([^"]+)"\]$/.exec(sel))) return { value: werte[m[1]] || '' };
      return null;
    },
  };
}
const verborgen = (b) => Object.keys(b.zeilen).filter((id) => b.zeilen[id].hidden === true);

/* Rein: Funde zu „Alle Angaben“ ohne Art; `V` ist ein Kern mit den Zusatzbindungen unten. */
function alleAngabenFunde(V) {
  const aus = [];
  const feld = kinderFeld(V);
  const alle = feld.unterFelder.map((u) => u.id);
  // Im Bereich (erster Eintrag), Aufklapper zu: nur die Wahl steht da, alles Übrige ist verborgen.
  const zu = behaelter({}, false);
  V.__zusatz._listenEintragBedingungVerdrahten(feld, zu, 'eintrag-');
  if (verborgen(zu).join() !== alle.filter((id) => id !== 'type').join()) aus.push('Aufklapper zu: ohne Art steht mehr als die Wahl da (' + verborgen(zu).join(', ') + ')');
  // Aufklapper offen: ohne Art steht jedes Unterfeld da, mit Art gelten die Bedingungen wieder.
  const auf = behaelter({}, true);
  const neu = V.__zusatz._listenEintragBedingungVerdrahten(feld, auf, 'eintrag-');
  if (typeof neu !== 'function') aus.push('die Verdrahtung gibt die Neubewertung nicht zurück (der Aufklapper stößt sie beim Öffnen an)');
  if (verborgen(auf).length) aus.push('Aufklapper offen: ohne Art verborgen: ' + verborgen(auf).join(', '));
  if (Object.keys(auf.zeilen).sort().join() !== alle.slice().sort().join()) aus.push('der Eintrag kennt nicht jedes Unterfeld');
  auf.werte.type = 'pflege'; auf.neuBewerten();
  if (!NUR_BETREUUNG.every((id) => verborgen(auf).includes(id))) aus.push('Aufklapper offen: nach „pflege“ stehen die Betreuungsfelder noch da');
  if (NUR_ELTERLICH.some((id) => verborgen(auf).includes(id))) aus.push('Aufklapper offen: nach „pflege“ fehlen elterliche Angaben');
  // Das Markup: offen ohne Art keine verborgene Zeile; ohne den Schalter nur die Art.
  const html = V.listenEintragInputsHTML(feld, {}, { alleAngaben: true });
  if (!/<div class="liste-eintrag-form" data-alle-angaben="1">/.test(html)) aus.push('der Eintrag trägt den Schalter data-alle-angaben nicht');
  if (sichtbareIds(html).slice().sort().join() !== alle.slice().sort().join()) aus.push('das Markup zeigt offen ohne Art nicht jedes Unterfeld: ' + sichtbareIds(html).join(', '));
  if (sichtbareIds(V.listenEintragInputsHTML(feld, {})).join() !== 'type') aus.push('der erste Eintrag im Bereich zeigt ohne Art mehr als die Wahl');
  return aus;
}
const KERN_ZUSATZ = { zusatzBindungen: ['_listenEintragBedingungVerdrahten', '_listeInlineFeld', '_listeZeileSichtbar'] };

test('[Art·zuerst·Alle Angaben] ohne Art ist „Alle Angaben“ da, und der offene Aufklapper enthält jedes Unterfeld', () => {
  const { V } = ladeKern(KERN_ZUSATZ);
  assert.deepEqual(alleAngabenFunde(V), []);
  const html = V.feldZeileHTML(kinderFeld(V), [], 'people', true);
  assert.match(html, /<button type="button" class="weitere-angaben-kopf"[^>]*data-weitere-angaben-kopf="weitere-childrenAndDependants">Alle Angaben<\/button>/);
  assert.ok(!/weitere-angaben-kopf[^>]*hidden/.test(html), 'im Markup nicht verborgen');
});

test('[Art·zuerst·Alle Angaben] der Dialog über „Bearbeiten“ und „Neuer Eintrag mit allen Angaben“ öffnet ohne Art mit allen Unterfeldern', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const feld = kinderFeld(V);
  V.flowListenEintragHinzufuegen('people', feld, {}, undefined, true);
  const dialog = document.getElementById('modal-inhalt');
  assert.deepEqual(sichtbareIds(String(dialog.innerHTML)).sort(), feld.unterFelder.map((u) => u.id).sort(), 'Neuer Eintrag mit allen Angaben');
  V.flowListenEintragHinzufuegen('people', feld, {});
  assert.deepEqual(sichtbareIds(String(document.getElementById('modal-inhalt').innerHTML)), ['type'], 'der Zweitknopf „+ Weitere Person“ öffnet weiter mit der Art zuerst');
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', { note: 'Anna (12)' });
  V.flowListenEintragBearbeiten('people', feld, 0);
  assert.deepEqual(sichtbareIds(String(document.getElementById('modal-inhalt').innerHTML)).sort(), feld.unterFelder.map((u) => u.id).sort(), 'ein Eintrag ohne Art öffnet beim Bearbeiten mit allen Unterfeldern');
});

test('[Art·zuerst·Alle Angaben·Rot-Beweis] die frühere Verdrahtung (Eintrag zeigt ohne Art nur die Wahl, auch offen) fällt durch', () => {
  const os = require('node:os');
  const original = lesen('vivodepot.html');
  const a1 = "const alleAngaben = !!modalEl.querySelector('[data-alle-angaben]');";
  const a2 = 'if (alleAngaben === true) {';
  assert.equal(original.split(a1).length - 1, 1, 'Vorbedingung: Anker 1');
  assert.equal(original.split(a2).length - 1, 1, 'Vorbedingung: Anker 2');
  const alt = original
    .replace(a1, "const alleAngaben = false;   // Rot-Probe: der Eintrag kennt „Alle Angaben“ nicht")
    .replace(a2, 'if (false) {');
  assert.notEqual(alt, original);
  const tmp = path.join(os.tmpdir(), 'art-zuerst-alle-angaben-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, alt);
  try {
    const { V } = ladeKern(Object.assign({ htmlPfad: tmp, backen: true }, KERN_ZUSATZ));
    const funde = alleAngabenFunde(V);
    assert.ok(funde.some((f) => /Aufklapper offen: ohne Art verborgen/.test(f)), funde.join(' | '));
    assert.ok(funde.some((f) => /das Markup zeigt offen ohne Art nicht jedes Unterfeld/.test(f)));
  } finally { fs.unlinkSync(tmp); }
});
