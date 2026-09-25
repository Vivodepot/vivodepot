/* ANG1 — die Lese-App zeigt die Angehörigen-Blätter, die die geöffnete Datei mitbringt
   (Abnahmepunkt 1): zwei Rechtsraum-Vorlagen und eine Berufs-Vorlage in EINEM Depot ergeben
   genau deren Blätter — jedes mit seiner Herkunft, keins mehr, keins weniger. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const eintrag = (quelle, feld) => ({ quelle, feld });
const blatt = (titel, eintraege) => ({ titel, icon: 'users', bloecke: [{ id: 'b1', titel: 'Block ' + titel, eintraege }] });

const RECHTSRAUM_DE = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-de', sprache: 'de', rechtsraum: 'DE', rechtsraumName: 'Deutschland',
  situationen: { 'krankenhaus-de': blatt('Krankenhaus DE', [eintrag('identity', 'givenName')]), 'nachlass-de': blatt('Nachlass DE', [eintrag('identity', 'familyName')]) },
};
const RECHTSRAUM_SCT = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-sct', sprache: 'en', rechtsraum: 'GB-SCT',
  situationen: { 'hospital-sct': blatt('Hospital Scotland', [eintrag('identity', 'givenName')]) },
};
const BERUF = {
  modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test-beruf', sprache: 'de', berufsstand: 'landwirt', berufsstandName: 'Landwirtschaft',
  situationen: { 'hof-uebergabe': blatt('Hofübergabe', [eintrag('identity', 'givenName')]) },
};

function offnen(extra) {
  const { V } = ladeLesen();
  const obj = Object.assign({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {},
    sektoren: { identity: { givenName: 'Hedwig', familyName: 'Muster' } } }, extra || {});
  V._foldVollmachtenLesen(obj);   // der echte Öffnen-Pfad, nicht setData
  V.setData(obj);
  return V;
}
const navIds = (html) => [...html.matchAll(/data-angblatt="([^"]+)"/g)].map((m) => m[1]).sort();

test('[Lese-App · Abnahme 1] zwei Rechtsraum-Vorlagen und eine Berufs-Vorlage zeigen genau ihre vier Blätter', () => {
  const V = offnen({ angehoerigenVorlagenModule: [RECHTSRAUM_DE, RECHTSRAUM_SCT, BERUF] });
  assert.deepEqual(navIds(V.sidebarHTML()), ['hof-uebergabe', 'hospital-sct', 'krankenhaus-de', 'nachlass-de']);
  assert.deepEqual(Array.from(V.angehoerigenSituationenAlleLesen(), (s) => s.id).sort(), ['hof-uebergabe', 'hospital-sct', 'krankenhaus-de', 'nachlass-de']);
});

test('[Lese-App · Abnahme 1] jedes Blatt zeigt seinen Inhalt und seine Herkunft', () => {
  const V = offnen({ angehoerigenVorlagenModule: [RECHTSRAUM_DE, RECHTSRAUM_SCT, BERUF] });
  const de = V.angehoerigenBlattHTML('krankenhaus-de');
  assert.match(de, /Krankenhaus DE/); assert.match(de, /Hedwig/);
  // Der Name kommt aus der Vorlage (rechtsraumName), nicht aus dem Code.
  assert.match(de, /angehoerigen-herkunft">Gilt für: Deutschland</);
  const sct = V.angehoerigenBlattHTML('hospital-sct');
  assert.match(sct, /Hospital Scotland/);
  // Ohne rechtsraumName in der Vorlage steht der Wert der Vorlage unverändert da.
  assert.match(sct, /angehoerigen-herkunft">Gilt für: GB-SCT</);
  const beruf = V.angehoerigenBlattHTML('hof-uebergabe');
  assert.match(beruf, /angehoerigen-herkunft">Gilt für: Landwirtschaft</); assert.doesNotMatch(beruf, /Deutschland/);
});

test('[Lese-App] die Vorlage des Produkts kommt über die Mitschrift der Datei, danach die Vorlagen der Datei', () => {
  const V = offnen({ abWerkMitschrift: { angehoerigen: [RECHTSRAUM_DE] }, angehoerigenVorlagenModule: [BERUF] });
  assert.deepEqual(navIds(V.sidebarHTML()), ['hof-uebergabe', 'krankenhaus-de', 'nachlass-de']);
});

test('[Lese-App · Gegenprobe] eine Datei ohne Vorlage zeigt keine Angehörigen-Gruppe', () => {
  const V = offnen();
  assert.deepEqual(navIds(V.sidebarHTML()), []);
  assert.doesNotMatch(V.sidebarHTML(), /Angehörigen-Blätter/);
});

test('[Lese-App] dieselbe Blatt-ID in zwei Vorlagen: die erste gewinnt, die zweite wird benannt', () => {
  const zweite = Object.assign({}, RECHTSRAUM_SCT, { situationen: { 'krankenhaus-de': blatt('Überschrieben', []) } });
  const V = offnen({ angehoerigenVorlagenModule: [RECHTSRAUM_DE, zweite] });
  const treffer = V.angehoerigenSituationenAlleLesen().filter((s) => s.id === 'krankenhaus-de');
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].titel, 'Krankenhaus DE');
  assert.ok(V.ANGEHOERIGEN_VORLAGEN_VERWORFEN_LESEN.some((v) => v.id === 'krankenhaus-de' && v.grund === 'doppelt'));
});

test('[Lese-App] eine Vorlage mit Markup wird verworfen, eine ungültige reißt die übrigen nicht mit', () => {
  const boese = Object.assign({}, RECHTSRAUM_SCT, { herkunft: 'test-boese', situationen: { 'x-blatt': blatt('<img src=x onerror=alert(1)>', []) } });
  const V = offnen({ angehoerigenVorlagenModule: [boese, RECHTSRAUM_DE, { modulTyp: 'angehoerigenVorlage' }] });
  assert.deepEqual(navIds(V.sidebarHTML()), ['krankenhaus-de', 'nachlass-de']);
  const gruende = V.ANGEHOERIGEN_VORLAGEN_VERWORFEN_LESEN.map((v) => v.grund);
  assert.ok(gruende.includes('kein-reiner-text'));
  assert.ok(gruende.includes('moduleVersion'));
});

test('[Lese-App] ein Eintrag auf ein Feld, das es nicht gibt, entfällt — er erscheint nicht mit roher Kennung', () => {
  const v = Object.assign({}, RECHTSRAUM_DE, { situationen: { 'krankenhaus-de': blatt('Krankenhaus DE', [eintrag('identity', 'givenName'), eintrag('gibtsnicht', 'x')]) } });
  const V = offnen({ angehoerigenVorlagenModule: [v] });
  const html = V.angehoerigenBlattHTML('krankenhaus-de');
  assert.match(html, /Hedwig/);
  assert.doesNotMatch(html, /gibtsnicht/);
});

test('[Lese-App · Rot-Beweis] ohne die Anmeldung im Öffnen-Pfad zeigt dieselbe Datei keine Blätter', () => {
  const original = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const zeile = '  try { _angehoerigenVorlagenAusDepotAnmeldenLesen(obj); } catch (e) { /* dito — ANG1 */ }\n';
  assert.equal(original.split(zeile).length - 1, 1, 'Vorbedingung: die Anmeldezeile steht genau einmal');
  const tmp = path.join(os.tmpdir(), 'ang-lese-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(zeile, ''));
  const zuvor = process.env.LESEN_HTML_PATH;
  process.env.LESEN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-lesen.js')];
    const { V } = require('./load-lesen.js').ladeLesen();
    const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
      angehoerigenVorlagenModule: [RECHTSRAUM_DE] };
    V._foldVollmachtenLesen(obj); V.setData(obj);
    assert.deepEqual(navIds(V.sidebarHTML()), [], 'ohne die Anmeldezeile bleibt die Gruppe leer — das ist der Beweis, dass sie wirkt');
  } finally {
    if (zuvor === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-lesen.js')];
    fs.rmSync(tmp, { force: true });
  }
});

test('[Lese-App · sit:-Verweis] „Behörden und Nachlass" zeigt die erb_*-Einträge aus data.situationen — sensible bleiben draußen', () => {
  const vorlage = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'angehoerigen-vorlagen', 'vivodepot-angehoerigen-de.json'), 'utf8'));
  const { V } = ladeLesen();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    situationen: { erbfall: { erb_wohnung: 'gekündigt zum 30.09.', erb_konten: 'Girokonto Sparkasse 4711' } },
    abWerkMitschrift: { angehoerigen: [vorlage] } };
  V._foldVollmachtenLesen(obj); V.setData(obj);
  const html = V.angehoerigenBlattHTML('behoerden_nachlass');
  assert.match(html, /gekündigt zum 30\.09\./, 'nicht-sensibles erb_wohnung aus data.situationen gezogen');
  assert.doesNotMatch(html, /Girokonto Sparkasse 4711/, 'sensibles erb_konten bleibt draußen');
  // Vorher 5 von 30 Zeilen (nur die Sektor-Quellen); die sit:-Einträge tragen jetzt dazu bei. Die Lese-App zeigt
  // sensible Felder generell nicht (Sensibel-Zurückhaltung) — darum 15 statt der 17 Zeilen des Kerns.
  const modell = V.situationModell(V.angehoerigenSituationenAlleLesen().find((s) => s.id === 'behoerden_nachlass'));
  const labels = modell.bloecke.flatMap((b) => b.zeilen.map((z) => z.label));
  assert.ok(labels.some((l) => /Mietvertrag \/ Wohnung/.test(l)), 'ein sit:-Feld steht als Zeile da: ' + labels.join(' | '));
  assert.ok(labels.length > 5, 'mehr als nur die Sektor-Quellen: ' + labels.length);
});
