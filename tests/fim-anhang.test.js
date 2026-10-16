'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-465 Nachtrag (05.10.2026) — Anhänge im FIM-Format-Modul, eingebettet als Base64 im Element
   ────────────────────────────────────────────────────────────────────────
   Gegen die erfundene Leistung S99000001 (tests/fixtures/fim-schema/S99000001-format-modul.json).
   Zusicherungen:
     · RUNDLAUF: das Base64 im Element ergibt byte-gleich die Datei aus „Meine Dokumente“, je Rolle.
     · Der Inhalt ist gültiges xs:base64Binary — geprüft mit einer Regel DIESER Datei, nicht mit dem Kern und nicht mit
       KoSIT (xs:anyType nimmt alles an, ein KoSIT-Grün belegt dafür nichts).
     · Ohne gewählten Pflicht-Anhang, mit einem Vivodepot-Entwurf statt Urschrift, mit einer anderen Datei als der Urschrift
       der Vorsorgevollmacht entsteht KEINE Datei; der Grund wird benannt.
     · Die bevollmächtigte Person steht nur mit bestätigtem Nachweis der Vollmacht in der Datei.
     · Ein Modul nennt die Rolle, nie die Datei; Rolle, `pflicht` und `vertreter` prüft der Kern beim Andocken.
   Gegen den Validator: tests/kosit-validator-lauf.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const MODUL = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fim-schema', 'S99000001-format-modul.json'), 'utf8'));
const PDF = Buffer.from('%PDF-1.4\n% erfundener Probe-Bescheid äö\n%%EOF\n');
const SCAN = Buffer.from('%PDF-1.4\n% erfundener Scan einer Vollmacht\n%%EOF\n');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const dataUrl = (mime, b) => 'data:' + mime + ';base64,' + b.toString('base64');

/* Eigene Regel für xs:base64Binary (XML Schema 1.1 Teil 2, 3.3.17, kanonisch ohne Leerraum) — unabhängig vom Kern
   geschrieben, damit die Probe nicht prüft, was sie selbst behauptet. */
function istBase64Binary(t) {
  if (t.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) return false;
  return Buffer.from(t, 'base64').toString('base64') === t;   // nur die kanonische Form kommt unverändert zurück
}
const element = (xml, name) => { const m = new RegExp('<' + name + '>([^<]*)</' + name + '>').exec(xml); return m ? m[1] : null; };

async function depot({ vertreter = [{ familyName: 'Beispiel', givenName: 'Lea' }], scanEntwurf = false, kern = null } = {}) {
  const { V } = kern || ladeKern();
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  const ablegen = (name, mime, b, extra) => V.mappeEintragHinzufuegen(Object.assign({ beschriftung: name, dateiname: name, mime, groesse: b.length, inhalt: dataUrl(mime, b) }, extra || {}));
  const ids = {
    bescheid: ablegen('bescheid.pdf', 'application/pdf', PDF),
    lichtbild: ablegen('foto.png', 'image/png', PNG),
    scan: ablegen('vollmacht-scan.pdf', 'application/pdf', SCAN, scanEntwurf ? { erzeugtVonVivodepot: true } : {}),
    entwurf: ablegen('entwurf.pdf', 'application/pdf', PDF, { erzeugtVonVivodepot: true }),
  };
  const doc = V.dokumentAnlegen({ typ: 'enduring-power-of-attorney', sektorId: 'advanceCare', name: 'Vorsorgevollmacht' });
  V.dokumentSetzen(doc.id, 'mappeRef', { ref: ids.scan });
  const refs = vertreter.map((p) => ({ ref: V.personHinzufuegen(Object.assign({ name: p.givenName + ' ' + p.familyName }, p)) }));
  V.getData().sektoren.advanceCare = Object.assign(V.getData().sektoren.advanceCare || {}, {
    provisionInstruments: [{ instrument: 'enduring-power-of-attorney', authorizedPersons: refs }] });
  // Wie der KoSIT-Adapter: der Beleg „geprüft“ geht nur über _modulBelegAlsGeprueftSetzen, nie als Feld am Modul.
  const geprueft = Object.assign({}, MODUL);
  V._modulBelegAlsGeprueftSetzen(geprueft, { stufe: 'extern-ungeprueft', anbieterId: null });
  const kanal = V.formatModulZuExportKanal(geprueft);
  assert.ok(kanal, 'das Fixture-Modul ergibt einen Kanal');
  return { V, ids, kanal };
}
function bauen(kanal, anhaenge) {
  const gruende = [];
  const xml = kanal.baue({ anhaenge, _anhangGruende: gruende });
  return { xml, gruende };
}

test('[FIM-Anhang·Rundlauf] das Base64 im Element ergibt byte-gleich die Datei aus „Meine Dokumente“, je Rolle', async () => {
  const { ids, kanal } = await depot();
  const { xml, gruende } = bauen(kanal, { bescheid: ids.bescheid, lichtbild: ids.lichtbild, 'vollmacht-nachweis': ids.scan });
  assert.deepEqual(gruende, []);
  for (const [name, orig] of [['F99000011', PDF], ['F99000006', PNG], ['F99000008', SCAN]]) {
    const b64 = element(xml, name);
    assert.ok(b64, name + ' steht in der Datei');
    assert.ok(istBase64Binary(b64), name + ' ist xs:base64Binary (eigene Regel)');
    assert.ok(Buffer.from(b64, 'base64').equals(orig), name + ': byte-gleich');
  }
  assert.equal(element(xml, 'F99000009'), 'Beispiel');
  assert.equal(element(xml, 'F99000010'), 'Lea');
  assert.ok(xml.indexOf('<G99000007>') < xml.indexOf('<F99000011>'), 'Elementfolge wie im XSD: die Vertretung vor dem Bescheid');
  assert.doesNotMatch(xml, /<!--/, 'mit zugeordnetem Pflicht-Anhang trägt das Modul keinen Hinweis');
});

test('[FIM-Anhang·Base64·Rot-Beweis] die eigene Regel weist ab, was kein xs:base64Binary ist', () => {
  for (const schlecht of ['abc', 'ab=c', 'YQ', 'Y Q==', 'YR==', 'ä===']) assert.equal(istBase64Binary(schlecht), false, schlecht);
  for (const gut of ['', 'YQ==', 'YWI=', 'YWJj']) assert.equal(istBase64Binary(gut), true, gut);
});

test('[FIM-Anhang·Rot-Beweis] ohne gewählten Pflicht-Anhang keine Datei, der Grund ist benannt', async () => {
  const { ids, kanal } = await depot();
  const r = bauen(kanal, { lichtbild: ids.lichtbild });
  assert.equal(r.xml, null);
  assert.deepEqual(r.gruende, [{ rolle: 'bescheid', grund: 'anhang-unbestaetigt' }]);
  const ohneAlles = bauen(kanal, undefined);
  assert.equal(ohneAlles.xml, null, 'auch ohne `anhaenge` in den Optionen');
});

test('[FIM-Anhang·Rot-Beweis] ein Entwurf aus Vivodepot ist kein Nachweis — am Kennzeichen und am Merkmal in der Datei', async () => {
  const { V, ids, kanal } = await depot();
  assert.deepEqual(bauen(kanal, { bescheid: ids.entwurf }).gruende, [{ rolle: 'bescheid', grund: 'anhang-ist-entwurf' }]);
  const merkmal = V.mappeEintragHinzufuegen({ beschriftung: 'x', dateiname: 'x.pdf', mime: 'application/pdf', groesse: 1,
    inhalt: dataUrl('application/pdf', Buffer.from('%PDF-1.4\n/Creator (vivodepot-kern/v918)\n%%EOF')) });
  assert.deepEqual(bauen(kanal, { bescheid: merkmal }).gruende, [{ rolle: 'bescheid', grund: 'anhang-ist-entwurf' }]);
});

test('[FIM-Anhang·Rot-Beweis] als Nachweis der Vollmacht zählt nur die Urschrift der Vorsorgevollmacht', async () => {
  const { ids, kanal } = await depot();
  const r = bauen(kanal, { bescheid: ids.bescheid, 'vollmacht-nachweis': ids.bescheid });
  assert.equal(r.xml, null);
  assert.deepEqual(r.gruende, [{ rolle: 'vollmacht-nachweis', grund: 'anhang-keine-vollmacht' }]);
  const { ids: ids2, kanal: k2 } = await depot({ scanEntwurf: true });
  assert.deepEqual(bauen(k2, { bescheid: ids2.bescheid, 'vollmacht-nachweis': ids2.scan }).gruende,
    [{ rolle: 'vollmacht-nachweis', grund: 'anhang-ist-entwurf' }], 'ein Entwurf der Vollmacht ist keine Urschrift');
});

test('[FIM-Anhang] ohne Nachweis der Vollmacht kein Antrag in Vertretung: die Gruppe fehlt ganz', async () => {
  const { ids, kanal } = await depot();
  const { xml, gruende } = bauen(kanal, { bescheid: ids.bescheid });
  assert.deepEqual(gruende, []);
  assert.doesNotMatch(xml, /G99000007|Beispiel/, 'keine Gruppe, kein Name der bevollmächtigten Person');
  assert.doesNotMatch(xml, /F99000006/, 'das Lichtbild ist nicht Pflicht und fehlt ohne Wahl');
});

test('[FIM-Anhang·Rot-Beweis] eine private, mehrere oder keine bevollmächtigte Person: keine Datei, der Grund ist benannt', async () => {
  for (const [vertreter, grund] of [
    [[{ familyName: 'Beispiel', givenName: 'Lea', nichtMitgeben: true }], 'vertreter-privat'],
    [[{ familyName: 'Beispiel', givenName: 'Lea' }, { familyName: 'Probe', givenName: 'Tom' }], 'vertreter-mehrere'],
    [[], 'vertreter-fehlt'],
  ]) {
    const { ids, kanal } = await depot({ vertreter });
    const r = bauen(kanal, { bescheid: ids.bescheid, 'vollmacht-nachweis': ids.scan });
    assert.equal(r.xml, null, grund);
    assert.deepEqual(r.gruende, [{ rolle: 'vollmacht-nachweis', grund }]);
  }
});

test('[FIM-Anhang·Rot-Beweis] falsche Dateiart, fehlende Datei und ein Inhalt ohne Base64 werden benannt', async () => {
  const { V, ids, kanal } = await depot();
  assert.deepEqual(bauen(kanal, { bescheid: ids.bescheid, lichtbild: ids.bescheid }).gruende, [{ rolle: 'lichtbild', grund: 'anhang-art-passt-nicht' }]);
  assert.deepEqual(bauen(kanal, { bescheid: 'gibt-es-nicht' }).gruende, [{ rolle: 'bescheid', grund: 'anhang-datei-fehlt' }]);
  const roh = V.mappeEintragHinzufuegen({ beschriftung: 'r', dateiname: 'r.pdf', mime: 'application/pdf', groesse: 3, inhalt: 'data:application/pdf,%PDF' });
  assert.deepEqual(bauen(kanal, { bescheid: roh }).gruende, [{ rolle: 'bescheid', grund: 'anhang-inhalt-ungueltig' }]);
});

test('[FIM-Anhang·Modul] Rolle, pflicht und vertreter prüft der Kern beim Andocken', async () => {
  const { V } = ladeKern();
  const mit = (zuordnung) => V.formatModulPruefen(Object.assign({}, MODUL, { zuordnung }));
  const basis = [{ feld: 'familyName', ziel: 'a.b' }];
  assert.equal(V.formatModulPruefen(MODUL).gueltig, true, V.formatModulPruefen(MODUL).grund);
  const verworfen = (z) => { const g = mit(basis.concat([z])); return g.gueltig === false || (g.verworfene || []).length > 0 || g.grund; };
  assert.ok(verworfen({ anhang: 'pass', ziel: 'a.c' }), 'unbekannte Rolle');
  assert.ok(verworfen({ anhang: 'bescheid', feld: 'givenName', ziel: 'a.c' }), 'Anhang mit Feld');
  assert.ok(verworfen({ anhang: 'bescheid', pflicht: 'ja', ziel: 'a.c' }), 'pflicht kein Wahrheitswert');
  assert.ok(verworfen({ feld: 'givenName', pflicht: true, ziel: 'a.c' }), 'pflicht nur am Anhang');
  assert.ok(verworfen({ vertreter: 'birthDate', ziel: 'a.c' }), 'kein Personenfeld der Liste');
  assert.equal(mit(basis.concat([{ vertreter: 'familyName', ziel: 'a.c' }])).grund, 'vertreter-ohne-nachweis');
  assert.equal(mit(basis.concat([{ anhang: 'bescheid', ziel: 'a.c' }, { anhang: 'bescheid', ziel: 'a.d' }])).grund, 'anhang-rolle-doppelt');
  const imp = V.formatModulPruefen({ modulTyp: 'format', moduleVersion: 1, format: 'probe-imp', richtung: 'import', sektor: 'identity', label: 'x',
    leser: 'json@1', zuordnung: [{ feld: 'familyName', ziel: 'a' }, { anhang: 'bescheid', ziel: 'b' }] });
  assert.ok((imp.verworfene || []).some((v) => v.grund === 'nur-ausgabe') || imp.gueltig === false, 'ein Anhang trägt nur in der Ausgabe');
});

test('[FIM-Anhang·Wahl] die Kandidaten: nie ein Entwurf; für die Vollmacht nur die Urschrift; für das Lichtbild nur ein Bild', async () => {
  const { V, ids } = await depot();
  const k = (r) => V.formatAnhangKandidaten(r).map((m) => m.id).sort();
  assert.deepEqual(k('bescheid'), [ids.bescheid, ids.lichtbild, ids.scan].sort());
  assert.deepEqual(k('vollmacht-nachweis'), [ids.scan]);
  assert.deepEqual(k('lichtbild'), [ids.lichtbild]);
});

test('[FIM-Anhang·Wahl] der Dialog gibt die gewählte Datei weiter; ohne Pflicht-Anhang entsteht keine Datei, die Gründe stehen da', async () => {
  const dateien = [];
  const k = ladeKern({ ausgabeErfassen: (d) => dateien.push(d) });
  const { V } = k;
  const { ids, kanal } = await depot({ kern: k });
  const modale = [];
  V.ui.modal = (o) => { modale.push(o); };
  const werte = { 'fa-bescheid': ids.bescheid, 'fa-lichtbild': '', 'fa-vollmacht-nachweis': '' };
  const echt = k.document.getElementById.bind(k.document);
  k.document.getElementById = (id) => (Object.prototype.hasOwnProperty.call(werte, id) ? { value: werte[id] } : echt(id));
  let weiter = null;
  assert.equal(V._formatAnhangWahl(kanal, { sensibel: false }, (o) => { weiter = o; return 'weiter'; }), 'frage');
  assert.equal(modale.length, 1);
  assert.match(modale[0].koerperHTML, /data-anhang-rolle="bescheid"/);
  assert.match(modale[0].koerperHTML, /bescheid\.pdf/);
  assert.doesNotMatch(modale[0].koerperHTML, /entwurf\.pdf/, 'ein Entwurf steht nicht zur Wahl');
  assert.equal(modale[0].onPrimaer(() => {}), 'weiter');
  assert.deepEqual(weiter, { sensibel: false, anhaenge: { bescheid: ids.bescheid } }, 'nur gewählte Rollen, als Mappe-Kennung');

  modale.length = 0;
  V._formatExportDownload(kanal, { anhaenge: {} });
  assert.equal(dateien.length, 0, 'keine Datei');
  assert.equal(modale.length, 1, 'die Gründe werden gesagt');
  assert.match(modale[0].koerperHTML, /<li>/);
});

/* Der Dialog der Dateiwahl setzt HTML aus Namen zusammen, die die Person selbst vergibt (Beschriftung einer Datei) und aus
   Rollen, die ein Modul nennt. Jeder Wert läuft einzeln durch escapeHTML bzw. escapeAttr — der Textknoten-Wächter erkennt das
   an `optionen` und `zeilen` nicht, darum hält es diese Probe am gebauten HTML. */
const ROH_IM_HTML = (html) => /<img\b|<b>x<\/b>|"><x/i.test(String(html || ''));
test('[FIM-Anhang·Wahl·Maskierung] Beschriftung, Kennung und Rolle stehen maskiert im Dialog', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Anhang-Probe-2026!');
  V.getData().mappe = [{ id: 'm1"><x', beschriftung: '<img src=x onerror=alert(1)>', mime: 'image/png', inhalt: 'data:image/png;base64,AA==' }];
  const gesehen = [];
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { gesehen.push(opt.koerperHTML); return () => {}; };
  try {
    V._formatAnhangWahl({ label: 'Probe', anhaenge: [{ rolle: 'lichtbild' }, { rolle: '<b>x</b>', pflicht: true }] }, {}, () => {});
  } finally { V.ui.modal = echt; }
  assert.equal(gesehen.length, 1, 'Vorbedingung: der Dialog ist erschienen');
  assert.ok(/&lt;img/.test(gesehen[0]), 'Vorbedingung: die Beschriftung steht im Dialog');
  assert.equal(ROH_IM_HTML(gesehen[0]), false, 'kein Wert steht unmaskiert im Dialog: ' + gesehen[0]);
});
test('[FIM-Anhang·Wahl·Maskierung·Rot-Beweis] ein unmaskierter Wert fällt auf', () => {
  assert.equal(ROH_IM_HTML('<option value="m1"><x">a</option>'), true);
  assert.equal(ROH_IM_HTML('<option>&lt;img src=x&gt;</option>'), false);
});
test('[FIM-Anhang·Wahl·Maskierung·Rot-Beweis] ohne escapeHTML an der Beschriftung steht sie roh im Dialog', async () => {
  const os = require('node:os');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const anker = "escapeHTML(m.beschriftung || m.dateiname || m.id)";
  assert.equal(kern.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'fim-anhang-maskierung-' + process.pid + '.html');
  fs.writeFileSync(tmp, kern.replace(anker, '(m.beschriftung || m.dateiname || m.id)'));
  try {
    const { V } = ladeKern({ htmlPfad: tmp, backen: true });
    await V.depotAnlegen('Anhang-Probe-2026!');
    V.getData().mappe = [{ id: 'm1', beschriftung: '<img src=x onerror=alert(1)>', mime: 'image/png', inhalt: 'data:image/png;base64,AA==' }];
    const gesehen = [];
    V.ui.modal = (opt) => { gesehen.push(opt.koerperHTML); return () => {}; };
    V._formatAnhangWahl({ label: 'Probe', anhaenge: [{ rolle: 'lichtbild' }] }, {}, () => {});
    assert.equal(ROH_IM_HTML(gesehen[0]), true, 'die Mutation muss auffallen');
  } finally { fs.rmSync(tmp, { force: true }); }
});
