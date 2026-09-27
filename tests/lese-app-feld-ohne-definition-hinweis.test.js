'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Wert ohne Definition in einem BEKANNTEN Bereich — die dritte Quelle des
   Hinweises „Nicht darstellbar" (23.09.2026).

   DER BEFUND, gemessen durch Lesen: `_darstellungsLuecken` prüfte auf
   Bereichsebene (unbekannte Bereichs-Id) und auf Modulebene (verworfene Module).
   Ein Bereich, den die Lese-App kennt, zählte nie — auch wenn er Werte trug, zu
   denen die Datei keine Feld-Definition mitbringt. `sektorHTML` zeichnet nur, was
   eine Definition hat. Der Wert stand in der Datei und erschien nirgends, ohne
   Spur.

   WIE DAS ENTSTEHT: ein Pro-Depot trägt die Definitionen seiner Bereiche als
   Mitschrift (`abWerkMitschrift.bereich`, die Bereichs-Module des Produkts; bei
   älteren Dateien auch `.bereichsErsatz`), geschrieben nur beim Anlegen.
   Bekommt ein Pro-Bereich später ein Feld, füllt der Kern es — die Lese-App
   derselben Datei kennt es nicht. Die Probe baut genau diese Lage mit der echten
   Definition eines Pro-Bereichs aus `tools/vivodepot-bereiche-bekannt.json` (dort mit
   Beschriftungen, wie sie der Kern in den Schnappschuss schreibt), in der Form des
   Fachs `abWerkMitschrift.bereich`.

   ROT-BEWEIS per Mutation (Muster aus tests/lese-app-altdatei-kennungen.test.js):
   dieselbe Lese-App ohne die Zeile, die die dritte Quelle einhängt, zeigt für
   dieselbe Datei keinen Hinweis — so sah es vor dem Fix aus.

   POSITIVKONTROLLE: das volle v515-Testdepot (über 50 angezeigte Werte, s. dort)
   erzeugt aus dieser Quelle keinen Hinweis. Ein Hinweis ohne Anlass ist Rauschen
   (U2-ADR-145); schlüge diese Quelle bei einer gewöhnlichen vollen Datei an,
   läse jede Empfängerin ihn als Fehler.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
const EINHAENGEZEILE = 'raus.felder = _felderOhneDefinition(d);';
const BEKANNT = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'vivodepot-bereiche-bekannt.json'), 'utf8'));
const NEUES_FELD = 'probe_feld_ohne_definition';

function leseAus(pfad) {
  const vorher = process.env.LESEN_HTML_PATH;
  if (pfad) process.env.LESEN_HTML_PATH = pfad; else delete process.env.LESEN_HTML_PATH;
  delete require.cache[require.resolve('./load-lesen.js')];
  const x = require('./load-lesen.js').ladeLesen();
  if (vorher === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = vorher;
  delete require.cache[require.resolve('./load-lesen.js')];
  return x.V;
}

/* Der erste Pro-Bereich der Mitschrift-Quelle und sein erstes Textfeld — aus der Datei gelesen,
   nicht abgeschrieben, damit die Probe eine Umbenennung (Stufe 89) ohne Nachpflege übersteht. */
function proBereich() {
  const id = Object.keys(BEKANNT.neu)[0];
  const def = BEKANNT.neu[id];
  let feld = null;
  for (const s of def.sektionen || []) for (const f of s.felder || []) if (!feld && f.typ === 'text') feld = f.id;
  return { id, def, feld };
}

function proDepot(werte, extra) {
  const { id, def } = proBereich();
  return Object.assign({
    sektoren: { [id]: werte },
    abWerkMitschrift: { bereich: [{ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de', bereiche: { [id]: JSON.parse(JSON.stringify(def)) } }] },
  }, extra || {});
}

/* JSON-Kopie: die Lese-App läuft in einem eigenen vm-Kontext, ihre Arrays sind für
   deepStrictEqual nie gleich einem Node-Array (anderer Realm) — gemessen beim ersten Lauf. */
function oeffnen(V, depot) {
  V.setData(V._foldVollmachtenLesen(depot));
  return JSON.parse(JSON.stringify(V._darstellungsLuecken()));
}

test('[Feld ohne Definition·Vorbedingung] die Probe nimmt einen echten Pro-Bereich mit Textfeld', () => {
  const { id, feld } = proBereich();
  assert.ok(id && /^pro-/.test(id), 'erster Bereich der Mitschrift-Quelle ist ein Pro-Bereich: ' + id);
  assert.ok(feld, 'der Bereich hat ein Textfeld');
  const V = leseAus(null);
  const l = oeffnen(V, proDepot({ [feld]: 'bekannt' }));
  assert.ok(V.bereicheAlleLesen().some((b) => b.id === id), 'die Lese-App kennt den Bereich aus der Mitschrift');
  assert.deepEqual(l.bereichIds, [], 'Quelle (a) schweigt — der Bereich ist bekannt');
});

test('[Feld ohne Definition] ein Wert ohne Definition in einem bekannten Bereich erzeugt einen sichtbaren Hinweis', () => {
  const { id, feld } = proBereich();
  const V = leseAus(null);
  const l = oeffnen(V, proDepot({ [feld]: 'bekannt', [NEUES_FELD]: 'steht in der Datei' }));
  assert.deepEqual(l.felder, [{ bereichId: id, feldIds: [NEUES_FELD] }]);
  const sb = V.sidebarHTML();
  assert.ok(sb.includes('luecken-hinweis'), 'der Block steht in der Sidebar');
  assert.ok(sb.includes('nicht dargestellt'), 'trifft das Stichwort aus tools/lese-app-bereichsluecke-messen.js');
  assert.ok(sb.includes(NEUES_FELD), 'nennt die Kennung, nicht nur eine Zahl');
  assert.ok(!String(V.sektorHTML(id)).includes('steht in der Datei'), 'Vorbedingung des Befunds: der Wert selbst erscheint nicht');
});

/* {f} zählt FELDER mit Wert, nicht Listeneinträge — sonst stünde „6 Angaben" neben einer Liste mit
   zwei Kennungen. Ein Listenfeld mit fünf Einträgen ist eine Angabe. Und der
   Satz sagt, dass nichts verloren ist: die Lese-App schreibt die geöffnete Datei nie zurück
   (einzige Download-Stelle ist `antwortWeitergeben`, eine neue Antwort-Datei). */
test('[Feld ohne Definition·Zahl und Liste] {f} zählt Felder, {liste} nennt genau diese', () => {
  const { id, feld } = proBereich();
  const V = leseAus(null);
  const l = oeffnen(V, proDepot({ [feld]: 'bekannt', [NEUES_FELD]: 'a',
    probe_liste_ohne_definition: [{ x: '1' }, { x: '2' }, { x: '3' }, { x: '4' }, { x: '5' }] }));
  assert.deepEqual(l.felder, [{ bereichId: id, feldIds: [NEUES_FELD, 'probe_liste_ohne_definition'] }]);
  const block = V._lueckenBlockHTML(l);
  assert.ok(block.includes('trägt diese Datei 2 Angabe(n)'), 'zwei Felder, nicht sechs Einträge: ' + block);
  assert.ok(block.includes(id + ' (' + NEUES_FELD + ', probe_liste_ohne_definition)'));
  assert.ok(block.includes('Sie bleiben in der Datei erhalten.'));
});

/* Die Grenze der Mitschrift-Ergänzung (sie ändert keine bestehende Definition, trägt also kein neues
   Unterfeld nach) darf nicht still sein. GEMESSEN (23.09.2026): eine Unterfeld-Erkennung schlug am
   v515-Testdepot an Strukturschlüsseln an (`id`, `katalogStand`, `rechtsraum`), für die es keine
   abgeleitete Quelle gibt — darum heute NICHT gebaut. Diese Probe steht als todo mit Befund-Kennung
   I1-UF (Befund-Ratsche, offen, mit Eigentümer) und wird grün, sobald die Unterfeld-Ebene ohne
   Fehlalarm steht; die Positivkontrolle unten ist dann die Abnahme. */
function listenFeld() {
  const { def } = proBereich();
  for (const s of def.sektionen || []) for (const f of s.felder || []) {
    if (f.typ === 'liste' && Array.isArray(f.unterFelder) && f.unterFelder.length) return { id: f.id, unter: f.unterFelder[0].id };
  }
  return null;
}

test('[Feld ohne Definition·Unterfeld] ein unbekanntes Unterfeld in einem bekannten Listenfeld löst den Hinweis aus', { todo: 'I1-UF — Unterfeld-Ebene ohne Fehlalarm auf Strukturschlüssel, s. Befund-Ratsche' }, () => {
  const { id } = proBereich();
  const lf = listenFeld();
  assert.ok(lf, 'Vorbedingung: der Pro-Bereich hat ein Listenfeld mit Unterfeldern');
  const V = leseAus(null);
  const l = oeffnen(V, proDepot({ [lf.id]: [{ [lf.unter]: 'Bekannter Eintrag', probe_unterfeld_neu: 'Unbekannter Unterwert' }] }));
  assert.deepEqual(l.felder, [{ bereichId: id, feldIds: [lf.id + '/probe_unterfeld_neu'] }]);
  const html = String(V.sektorHTML(id));
  assert.ok(html.includes('Bekannter Eintrag'), 'Vorbedingung: das Listenfeld selbst wird gezeigt');
  assert.ok(!html.includes('Unbekannter Unterwert'), 'Befund: der Unterwert erscheint nicht');
  assert.ok(V.sidebarHTML().includes(lf.id + '/probe_unterfeld_neu'), 'der Hinweis nennt Feld und Unterfeld');
});

test('[Feld ohne Definition·Unterfeld·Gegenprobe] nur bekannte oder leere Unterfelder: kein Hinweis', () => {
  const lf = listenFeld();
  const V = leseAus(null);
  const l = oeffnen(V, proDepot({ [lf.id]: [{ [lf.unter]: 'Bekannt', probe_unterfeld_leer: '' }, { [lf.unter]: 'Zweiter' }] }));
  assert.deepEqual(l.felder, []);
});

test('[Feld ohne Definition·Rot-Beweis] ohne die dritte Quelle zeigt dieselbe Datei keinen Hinweis', () => {
  const quelle = fs.readFileSync(LESEN, 'utf8');
  assert.equal(quelle.split(EINHAENGEZEILE).length, 2, 'die Einhängezeile steht genau einmal — sonst trifft die Mutation nichts');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feld-ohne-definition-'));
  const mutant = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(mutant, quelle.replace(EINHAENGEZEILE, '/* MUTATION: dritte Quelle entfernt */'));
  try {
    const V = leseAus(mutant);
    const { feld } = proBereich();
    oeffnen(V, proDepot({ [feld]: 'bekannt', [NEUES_FELD]: 'steht in der Datei' }));
    assert.ok(!V.sidebarHTML().includes('luecken-hinweis'), 'ohne die Quelle bleibt die Lücke still — die Probe misst, was der Fix leistet');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[Feld ohne Definition·Gegenprobe] nur definierte Felder, ein leerer unbekannter Schlüssel, ein Template-Feld: kein Hinweis', () => {
  const { id, feld } = proBereich();
  const V = leseAus(null);
  const l = oeffnen(V, proDepot(
    { [feld]: 'bekannt', leer_ohne_definition: '', [NEUES_FELD]: 'über feldDefinitionen bekannt' },
    { feldDefinitionen: [{ sektorId: id, feldId: NEUES_FELD, typ: 'text', label: 'Aus einer Vorlage' }] }));
  assert.deepEqual(l.felder, [], 'leer zählt nicht, und eine Vorlagen-Definition ist eine Definition');
  assert.equal(V._lueckenBlockHTML(l), '');
});

test('[Feld ohne Definition·Positivkontrolle] das volle v515-Testdepot erzeugt aus dieser Quelle keinen Hinweis', () => {
  const f = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'v515-testdepot.json'), 'utf8'));
  const V = leseAus(null);
  const l = oeffnen(V, JSON.parse(JSON.stringify(f.export.depot)));
  assert.deepEqual(l.felder, [], 'eine gewöhnliche volle Datei trägt keinen Wert ohne Definition');
});

test('[Feld ohne Definition·Sprachen] der Satz steht deutsch und englisch, mit denselben Platzhaltern', () => {
  const V = leseAus(null);
  for (const satz of [V.STRINGS.lueckenSatzFelder, V.ZUSICHERUNG_TEXTE_EN.lueckenSatzFelder]) {
    assert.equal(typeof satz, 'string');
    for (const p of ['{k}', '{f}', '{liste}']) assert.ok(satz.includes(p), p + ' fehlt in: ' + satz);
  }
  assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_LESEN.includes('lueckenSatzFelder'), 'als Zusicherung verankert, von keinem Modul überschreibbar');
});
