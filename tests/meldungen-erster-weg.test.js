'use strict';
/* Meldungen und Sätze auf dem ersten Weg (Durchgang als fremde Nutzerin am Abnahme-Stand v1072, 24.11.2026).
   Je Logik-Zeile eine Probe mit Rot-Beweis an einer veränderten Kopie:
     P1  Nach einem Download, den der Browser nicht bestätigt, nennt der Stand das Datum und bittet, den Download-Ordner zu prüfen.
         Der Download zählt NICHT als Sicherungskopie: die Erinnerung bleibt fällig, der gesicherte Stand bleibt leer.
     A3  Fehlen Vor- und Nachname, erscheinen beide Meldungen zugleich.
     I4  Ein abgelehntes Datum nennt den Grund: andere Zeichen als Ziffern, ein Tag, den es nicht gibt, sonst der bisherige Satz.
     I5  Die Ansage nach dem Speichern nennt die Felder, die sich geändert haben, nicht das Feld, das zuletzt verlassen wurde.
     L4  Lese-App ohne Erweiterung: eine Zeile zur Herkunft, die Stand-Zeile entfällt; fehlt die Stand-Angabe, bleibt ihr Satz.
   Die Wortlaute der Textzeilen (F1, D2, O1, H1, H2, H3, L2) stehen am Ende, DE und EN. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
const TEXTE = {
  DE: JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte,
  EN: JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte,
};
const ZUSATZ = { indexedDB: {}, zusatzBindungen: ['vorschauHatDaten', 'sicherungskopieStandSatz', '_datumFehlerText', '_autosaveZeilen'] };

/* Eine Kern-Kopie mit einer Ersetzung, für die Rot-Beweise. Der Anker muss genau einmal vorkommen. */
function mitKernKopie(alt, neu, fn) {
  assert.equal(KERN.split(alt).length - 1, 1, 'Vorbedingung: Anker genau einmal — ' + alt.slice(0, 60));
  const tmp = path.join(os.tmpdir(), 'meldungen-erster-weg-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(tmp, KERN.replace(alt, () => neu));
  return Promise.resolve().then(() => fn({ htmlPfad: tmp, backen: true })).finally(() => fs.unlinkSync(tmp));
}

/* ── P1 · Sicherungskopie als Download ─────────────────────────────────────────── */

/* Funde am Zustand nach „Sicherungskopie erstellen“ ohne Datei-Auswahl des Browsers (Download-Rückfall). Leer = richtig. */
async function downloadFunde(opt) {
  const k = ladeKern(Object.assign({}, ZUSATZ, opt || {}));
  await k.V.depotAnlegen('meldungen-erster-weg-pw');
  k.V.akteurSelbstErklaeren('Maria');
  k.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await k.V.sicherungskopieErstellen();
  const aus = [];
  const m = k.V.exportErinnerungModell();
  if (m.jeExportiert) aus.push('der Download zählt als Sicherungskopie');
  if (!m.ohneSicherungskopie) aus.push('die Erinnerung ist nicht mehr fällig');
  k.V.renderErledigen();
  const html = String(k.document.getElementById('content').innerHTML);
  const zeile = /data-erledigen-sicherung="1" role="note"><p>([^<]*)<\/p>/.exec(html);
  const satz = zeile ? zeile[1] : '';
  if (!/^Sicherungskopie heruntergeladen am \d{2}\.\d{2}\.\d{4}\. Bitte prüfen Sie Ihren Download-Ordner\.$/.test(satz)) aus.push('Satz am Stand: ' + JSON.stringify(satz));
  return aus;
}

test('[P1] nach dem Download: der Stand nennt das Datum, die Erinnerung bleibt fällig, der Download zählt nicht als Sicherung', async () => {
  assert.deepEqual(await downloadFunde(), []);
});

test('[P1·Rot-Beweis] ohne den eigenen Satz und mit einem Download, der als bestätigt gilt, fällt die Probe durch', async () => {
  await mitKernKopie('  _letzterDownloadIso = new Date().toISOString();\n', '', async (opt) => {
    assert.ok((await downloadFunde(opt)).some((f) => f.startsWith('Satz am Stand')), 'ohne Datum stünde wieder „noch keine“');
  });
  await mitKernKopie('function markiereDateiSicherungUnbestaetigt() {\n', 'function markiereDateiSicherungUnbestaetigt() { return markiereAlsDateiGesichert();\n', async (opt) => {
    const f = await downloadFunde(opt);
    assert.ok(f.includes('der Download zählt als Sicherungskopie') && f.includes('die Erinnerung ist nicht mehr fällig'), JSON.stringify(f));
  });
});

test('[P1] ohne Download bleibt „noch keine“; beide Stellen lesen denselben Satz', () => {
  const { V } = ladeKern(ZUSATZ);
  assert.equal(V.__zusatz.sicherungskopieStandSatz(V.STRINGS.sicherungskopieNochKeine), 'Sicherungskopie: noch keine');
  assert.equal((KERN.match(/(?<!function )sicherungskopieStandSatz\(STRINGS\.sicherungskopieNochKeine\)/g) || []).length, 2, 'Blatt am Speicherstatus und Zeile auf der Übersicht');
  assert.equal((KERN.match(/escapeHTML\(STRINGS\.sicherungskopieNochKeine\)|textContent = ohneKopie \? STRINGS\.sicherungskopieNochKeine/g) || []).length, 0);
});

/* ── A3 · beide Namen zugleich ─────────────────────────────────────────────────── */

const dateiAttrappe = { name: 'probe.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
function sichtbarerFehler(document, id) {
  const el = document.getElementById(id);
  return !!(el && !el.hidden && String(el.textContent || '').trim());
}
async function namenFunde(opt) {
  const k = ladeKern(Object.assign({ showSaveFilePicker: async () => dateiAttrappe }, opt || {}));
  k.V.flowVorschauBetreten();
  k.V.flowEigenesDepotAusSubWunsch();
  const d = k.document;
  d.getElementById('id-vorname').value = '';
  d.getElementById('id-nachname').value = '';
  await d.getElementById('m-ok').onclick();
  const aus = [];
  if (!sichtbarerFehler(d, 'id-vorname-fehler')) aus.push('Vorname ohne Meldung');
  if (!sichtbarerFehler(d, 'id-nachname-fehler')) aus.push('Nachname ohne Meldung');
  if (String(d.getElementById('id-vorname-fehler').textContent) !== 'Bitte tragen Sie Ihren Vornamen ein.') aus.push('Wortlaut Vorname');
  if (String(d.getElementById('id-nachname-fehler').textContent) !== 'Bitte tragen Sie Ihren Nachnamen ein.') aus.push('Wortlaut Nachname');
  return aus;
}

test('[A3] Vor- und Nachname leer: beide Meldungen erscheinen zugleich', async () => {
  assert.deepEqual(await namenFunde(), []);
});

test('[A3·Rot-Beweis] eine Fassung, die nach dem ersten fehlenden Namen abbricht, fällt durch', async () => {
  await mitKernKopie(
    "_namenFehlen.forEach(([fid, text], i) => modalFeldFehlerZeigen(fid, fid + '-fehler', text, i === 0)); return;",
    "modalFeldFehlerZeigen(_namenFehlen[0][0], _namenFehlen[0][0] + '-fehler', _namenFehlen[0][1], true); return;",
    async (opt) => { assert.ok((await namenFunde(opt)).includes('Nachname ohne Meldung')); });
});

/* ── I4 · das Datum nennt den Grund ────────────────────────────────────────────── */

function datumFeld(attr) {
  const a = Object.assign({ 'data-datum-iso': '1', 'data-typ': 'datum' }, attr || {});
  return { hasAttribute: (k) => k in a, getAttribute: (k) => (k in a ? a[k] : null) };
}
function datumFunde(V) {
  const t = (inp, v) => V.__zusatz._datumFehlerText(inp, v);
  const aus = [];
  const soll = [
    [datumFeld({ 'data-datum-nichtziffern': '1' }), '', 'Bitte tragen Sie nur Ziffern ein.'],
    [datumFeld(), '1990-02-31', 'Den 31.02.1990 gibt es nicht.'],
    [datumFeld(), '2025-02-29', 'Den 29.02.2025 gibt es nicht.'],
    [datumFeld(), '1990-13-01', 'Bitte prüfen Sie Tag, Monat und Jahr.'],
    [{ hasAttribute: () => false, getAttribute: () => null }, '31.02.1990', 'Bitte tragen Sie ein Datum im Format JJJJ-MM-TT ein.'],
  ];
  for (const [inp, v, erwartet] of soll) { const ist = t(inp, v); if (ist !== erwartet) aus.push(v + ': ' + ist); }
  return aus;
}

test('[I4] die Meldung zum Datum nennt den Grund: Ziffern, ein Tag, den es nicht gibt, sonst der bisherige Satz', () => {
  const { V } = ladeKern(ZUSATZ);
  assert.deepEqual(datumFunde(V), []);
  // Zeichen, die keine Ziffern sind, lehnen auch dann ab, wenn nach dem Zusammensetzen nichts übrig bleibt.
  assert.match(KERN, /\|\| inp\.getAttribute\('data-datum-nichtziffern'\) === '1'\)\) \{\n {6}_abgelehnt = _datumFehlerText\(inp, v\);/);
  assert.match(KERN, /if \(_roh\.some\(\(x\) => \/\\D\/\.test\(x\)\)\) h\.setAttribute\('data-datum-nichtziffern', '1'\); else h\.removeAttribute\('data-datum-nichtziffern'\); \}/);
});

test('[I4·Rot-Beweis] eine Fassung mit dem einen Satz für alles fällt durch', async () => {
  await mitKernKopie("  if (inp.getAttribute('data-datum-nichtziffern') === '1') return STRINGS.feldFehlerDatumZiffern;\n", '', async (opt) => {
    const { V } = ladeKern(Object.assign({}, ZUSATZ, opt));
    assert.ok(datumFunde(V).length > 0);
  });
});

/* ── I5 · die Ansage nennt das geänderte Feld ──────────────────────────────────── */

function zeile(name) { return { name, closest: () => null }; }
function feldIn(z) { return { closest: (sel) => (sel === '.feld-zeile' ? z : null) }; }
function ansageFunde(V) {
  const zDatum = zeile('Geburtsdatum'), zJahr = zeile('Geburtsjahr (falls der Tag unbekannt ist)');
  const elemente = { birthDate: feldIn(zDatum), yearOfBirthIfTheExactDayIs: feldIn(zJahr) };
  const finde = (fid) => elemente[fid] || null;
  const aus = [];
  // Das Datum wurde erst beim Verlassen des Geburtsjahrs gefaltet: genannt wird das Datum.
  const a = V.__zusatz._autosaveZeilen(feldIn(zJahr), ['birthDate'], finde).map((z) => z.name);
  if (JSON.stringify(a) !== JSON.stringify(['Geburtsdatum'])) aus.push('Datum beim Verlassen des Jahrs: ' + JSON.stringify(a));
  // Ohne bekannte Änderung (oder ohne Fundstelle) bleibt die Zeile des auslösenden Felds.
  const b = V.__zusatz._autosaveZeilen(feldIn(zJahr), [], finde).map((z) => z.name);
  if (JSON.stringify(b) !== JSON.stringify(['Geburtsjahr (falls der Tag unbekannt ist)'])) aus.push('ohne Änderung: ' + JSON.stringify(b));
  return aus;
}

test('[I5] die Ansage nennt die Zeilen der geänderten Felder; der Speicherweg reicht sie weiter', () => {
  const { V } = ladeKern(ZUSATZ);
  assert.deepEqual(ansageFunde(V), []);
  assert.match(KERN, /_zuletztGefalteteFelder = geaendert\.slice\(\);/, 'das Falten merkt sich die geänderten Felder');
  assert.match(KERN, /const zeilen = _autosaveZeilen\(zielEl, _zuletztGefalteteFelder, finde\);/, 'die Ansage liest sie');
});

test('[I5·Rot-Beweis] eine Fassung, die nur das auslösende Feld nennt, fällt durch', async () => {
  await mitKernKopie('  for (const fid of (geaenderteIds || [])) {', '  for (const fid of []) {', async (opt) => {
    const { V } = ladeKern(Object.assign({}, ZUSATZ, opt));
    assert.ok(ansageFunde(V).length > 0);
  });
});

/* ── L4 · Lese-App ohne Erweiterung ────────────────────────────────────────────── */

function leseFunde(L) {
  const aus = [];
  const ohne = L.herkunftBlockHTML(L.modulHerkunftBerechnen({})) + L.standBlockHTML(L.moduleStandBerechnen({}));
  if (!ohne.includes('Diese Angaben stammen ganz aus Vivodepot selbst.')) aus.push('Herkunft ohne Erweiterung: ' + ohne);
  if (ohne.includes('stand-marke')) aus.push('die Stand-Zeile steht ohne Erweiterung');
  if (!L.standBlockHTML(null).includes(L.STRINGS.standSatzOhneAngabe)) aus.push('fehlende Stand-Angabe ohne eigenen Satz');
  return aus;
}

const KOPPLUNG = { PROBEN: [
  { fuer: '[L4] ohne Erweiterung eine Zeile zur Herkunft, keine Stand-Zeile; ohne Stand-Angabe bleibt ihr Satz', diskriminante: leseFunde },
] };
void KOPPLUNG;

test('[L4] ohne Erweiterung eine Zeile zur Herkunft, keine Stand-Zeile; ohne Stand-Angabe bleibt ihr Satz', () => {
  const { V: L } = ladeLesen();
  assert.equal(L.moduleStandAnzahl(L.moduleStandBerechnen({})), 0, 'Vorbedingung: kein Modul');
  assert.deepEqual(leseFunde(L), []);
});

test('[L4·Rot-Beweis] eine Lese-App, die die Stand-Zeile immer zeigt, fällt durch', () => {
  const alt = "  if (s && typeof s === 'object' && Number.isInteger(s.unbekannt) && !moduleStandAnzahl(s)) return '';\n";
  assert.equal(LESEN.split(alt).length - 1, 1, 'Vorbedingung: Anker');
  const { V: L } = ladeLesen({ html: LESEN.replace(alt, '') });
  assert.ok(leseFunde(L).includes('die Stand-Zeile steht ohne Erweiterung'));
});

/* ── Wortlaute der Textzeilen, DE und EN ───────────────────────────────────────── */

test('[Wortlaut] F1, D2, O1, H1, H2, H3 im Textsatz; L2 in der Lese-App', () => {
  const s = (sprache, k) => TEXTE[sprache]['strings:' + k + '.text'];
  assert.match(s('DE', 'anlassEigeneAngabenSatz'), /^Ihre eigenen Angaben tragen Sie unter „\{beschriftung:gruppeBereiche\}“ › „\{beschriftung:gruppeIchMensch\}“ ein\.$/);
  assert.match(s('DE', 'dokumentEigenesSatz'), /„\{beschriftung:navMappe\}“ mit „\{beschriftung:mappeHinzufuegen\}“ ab\.$/);
  assert.equal(s('DE', 'dateiErkennungAnker'), 'Das ist Ihr Depot. Geben Sie Ihr Passwort ein, dann öffnet es sich.');
  assert.equal(s('DE', 'exportHaekchenSatz'), 'Markierte Angaben kommen in die Datei.');
  for (const sprache of ['DE', 'EN']) {
    for (const k of ['exportIdentitaetLabel', 'exportVerwaltungLabel', 'exportBildungLabel', 'exportFinanzenLabel', 'exportSozialversicherungLabel', 'exportFimLabel']) {
      assert.doesNotMatch(s(sprache, k), /für Computer lesbar|machine-readable|readable by computers/, sprache + ' ' + k + ': der Zusatz steht schon im Gruppenkopf');
    }
    assert.doesNotMatch(s(sprache, 'exportHaekchenSatz') + s(sprache, 'exportHaekchenSatzStelle'), /gesendet|sent/, sprache + ': nichts wird gesendet');
    for (const k of ['anlassEigeneAngabenSatz', 'dokumentEigenesSatz', 'feldFehlerDatumZiffern', 'feldFehlerDatumGibtEsNicht', 'sicherungskopieHeruntergeladen', 'uebergabeEmpfaengerBeispiel', 'uebergabeUmfangBeispiel', 'uebergabeZweckBeispiel']) {
      assert.equal(typeof s(sprache, k), 'string', sprache + ' ' + k + ' fehlt');
    }
  }
  assert.match(s('DE', 'uebergabeProtokollTitel'), /^Wem haben Sie das herausgegeben\? Das Festhalten ist freiwillig\.$/);
  assert.match(LESEN, /dateiUnlesbar: '[^']*Erwartet wird eine Depot-Datei, meist mit der Endung \.vivodepot\.'/);
  assert.match(LESEN, /dateiUnlesbar: "[^"]*A depot file is expected, usually ending in \.vivodepot\."/);
});
