'use strict';
/* benutzersicht-ohne-technische-markierungen.test.js — keine technischen Markierungen in der Benutzersicht (Entscheidung 07.10.2026)
   Entscheidung: „keine technischen markierungen oder "leisen" Zuordnungen in der Benutzersicht!“ Standard-Kennungen, Fassungen, Codes,
   Format- und Schemanamen und interne Kennungen bleiben in Daten, Export und öffentlicher Zuordnungsliste, erscheinen aber nicht auf dem
   Bildschirm. Diese Probe hält die bekannten Wege fest, auf denen sie erschienen (Inventar vom 07.10.2026), mit Deckel 0:
     · die FIM-Zeile unter dem Feld (feldBezugZeileHTML in feldZeileHTML)
     · Codesystem und Code neben Wert und Chip (class="feld-code")
     · das Andock-Format als Tooltip oder Vorlesetext am Bereichskopf
     · die depotUUID im Einhängen-Dialog, die Dateikennung auf der Karte eines verwalteten Depots
     · Modul-Typ und -Kennung in Einstellungen und Meldungen
     · die rohe Feld- oder Bereichskennung, wenn eine Beschriftung fehlt
     · ein Platzhalter statt eines Namens („ohne Bezeichnung“, „(ohne Namen)“, „(ohne Kennung)“, „?“). Entscheidung: „auf keinen Fall steht
       irgendwo "ohne Bezeichnung"!“ Ein fehlender Name ist ein Fehler an der Quelle: eingebaute Namen hält
       tests/namen-vollstaendig.test.js, fremde Felder ohne Namen weist die Einlassprüfung ab.
   Rot-Beweis je Weg: der frühere Wortlaut ist rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;

const WEGE = [
  ['FIM-Zeile unter dem Feld', (k) => /\n\s*if \(sektorId\) h \+= feldBezugZeileHTML\(/.test(k)],
  ['Code neben Wert oder Chip', (k) => /class="feld-code"/.test(k)],
  ['Andock-Format am Bereichskopf', (k) => /bereich-format" aria-label=|andockFormatTooltip/.test(k)],
  ['depotUUID im Einhängen-Dialog', (k) => /depotUUID: <code>/.test(k)],
  ['Dateikennung auf der Depot-Karte', (k) => /subDateiKennungLabel/.test(k)],
  ['rohe Kennung statt Beschriftung', (k) => rueckfaelle(k).length > 0],
  ['Platzhalter statt Name', (k) => /ohneBezeichnung|'\(ohne Namen\)'|'\(ohne Kennung\)'|(name|label|vorname|titel)\)? \|\| '\?'/.test(k)],
];
const TEXTE = [
  ['Modul-Typ und -Kennung in Meldungen', (t) => ['moduleUngeprueftZeile', 'moduleEinlassenOk', 'moduleEinlassenUnvollstaendig'].some((s) => /\{typ\}|\{kennung\}/.test(t['strings:' + s + '.text'] || ''))],
  ['Platzhalter statt Name im Textsatz', (t) => Object.values(t).some((v) => PLATZHALTER_TEXT.test(String(v)))],
];
/* Ein Platzhalter steckt auch im Wortlaut selbst („Erweiterung ohne Namen · …“), nicht nur im Code. Deutsch und Englisch. */
const PLATZHALTER_TEXT = /ohne (Namen|Bezeichnung|Titel)\b|\bunbenannt|without (a )?(name|title|label)\b|\bunnamed\b|\buntitled\b/i;
const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;

/* Die Klasse: eine Beschriftung, die bei Fehlen auf eine Kennung zurückfällt („label || x.id“, „label || feldId“, „|| e.feld“).
   Ausgenommen sind nur drei PDF- und Dokument-Wege, die im Paket für die menschenlesbaren Ausgaben folgen (vergeben, nicht im
   Bildschirm-Wagen). Kommentare zählen nicht. */
const RUECKFALL = /\.label \|\| [a-zA-Z_$]+\.(id|feld|feldId)\b|'\(ohne Kennung\)'|label: feldId\b|return String\(feldId\);|\blabel \|\| feldId\b|\(fdef\.label \|\| fdef\.id\)|rechtsraumName \|\| blatt\.rechtsraum\b/;
const RUECKFALL_AUSNAHMEN = Object.freeze({
  situationModell: 'PDF der Lebenslage (menschenlesbare Ausgabe, vergeben an das PDF-Paket, folge5)',
  _datensatzAusEintraegen: 'PDF zum Anlass (menschenlesbare Ausgabe, vergeben an das PDF-Paket, folge5)',
  _vorlageDokAusgabe: 'Dokument aus einer Vorlage (menschenlesbare Ausgabe, vergeben an das PDF-Paket, folge5)',
  erstePartieFeldDefsPruefen: 'Verwerfen-Protokoll der Gerüst-Erlaubnis, keine Benutzersicht: die Import-Vorschau zeigt nur die Zahl (importTemplateVerworfenAnzahl); die Kennung benennt das abgewiesene Feld in Protokoll und Sicherheitsprobe (U2-ADR-292); Entfall-Bedingung keine, die Probe [Benutzersicht·Protokoll] hält es aus der Benutzersicht',
});
function rueckfaelle(kern) {
  const aus = []; let fn = '';
  kern.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n').forEach((zeile) => {
    const z = zeile.replace(/(^|[^:'"\\])\/\/.*$/, '$1');
    const m = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(z); if (m) fn = m[1];
    if (RUECKFALL.test(z) && !RUECKFALL_AUSNAHMEN[fn]) aus.push(fn);
  });
  return aus;
}

function funde(kern, texte) {
  return WEGE.filter(([, f]) => f(kern)).map(([n]) => n).concat(TEXTE.filter(([, f]) => f(texte)).map(([n]) => n));
}

test('[Benutzersicht] kein bekannter Weg zeigt eine technische Markierung (Deckel 0)', () => {
  assert.deepEqual(funde(KERN, DE), []);
  assert.deepEqual(TEXTE.filter(([, f]) => f(EN)).map(([n]) => n), [], 'auch im englischen Textsatz');
  assert.equal(DE['strings:ohneBezeichnung.text'], undefined, 'kein Platzhalter-Text im Sprachmodul');
});

test('[Benutzersicht·Rot-Beweis] jeder frühere Wortlaut ist rot', () => {
  const frueher = [
    "\n  if (sektorId) h += feldBezugZeileHTML(sektorId, feld.id);",
    ' <span class="feld-code">',
    '<span class="bereich-format" aria-label="',
    'depotUUID: <code>',
    'metaZeile(STRINGS.subDateiKennungLabel',
    "escapeHTML(f.label || f.id)",
  ];
  for (const stueck of frueher) assert.equal(funde(KERN + stueck, DE).length, 1, 'nicht erkannt: ' + stueck.trim());
  for (const stueck of ["x = f.label || STRINGS.ohneBezeichnung;", "name: name || '(ohne Namen)'", "const wer = (person && person.name) || '?';"]) {
    assert.deepEqual(funde(KERN + '\n' + stueck, DE), ['Platzhalter statt Name'], 'Platzhalter nicht erkannt: ' + stueck);
  }
  assert.deepEqual(rueckfaelle('function probe() {\n  const label = feld.label || feldId;\n}'), ['probe'], 'die Klasse greift');
  assert.deepEqual(rueckfaelle('function probe2() {\n  return String(feldId);\n}\nfunction probe3() {\n  x = { label: feldId };\n}'), ['probe2', 'probe3'], 'auch Rückgabe und Ersatzobjekt');
  assert.deepEqual(rueckfaelle('function situationModell() {\n  x = { label: f.label || f.id };\n}'), [], 'die benannte Ausnahme bleibt frei');
  const alt = Object.assign({}, DE, { 'strings:moduleEinlassenOk.text': 'Erweiterung eingelesen: {typ} · {kennung}' });
  assert.deepEqual(funde(KERN, alt), ['Modul-Typ und -Kennung in Meldungen']);
  for (const w of ['Erweiterung ohne Namen · eingelassen am {datum}', 'Extension without a name · added on {datum}']) {
    assert.deepEqual(funde(KERN, Object.assign({}, DE, { 'strings:x.text': w })), ['Platzhalter statt Name im Textsatz'], 'nicht erkannt: ' + w);
  }
});

/* Die Ausnahme erstePartieFeldDefsPruefen (Verwerfen-Protokoll) trägt die Kennung eines abgewiesenen Feldes ohne Beschriftung. Diese Probe
   hält, dass der Name nie in der Benutzersicht landet: abgewiesen über den echten Weg, dann Bereich und Einstellungen gezeichnet. */
function sichtbarerText(html) { return String(html).replace(/<[^>]+>/g, ' '); }
test('[Benutzersicht·Protokoll] die Kennung eines abgewiesenen Feldes ohne Beschriftung steht nirgends in der Benutzersicht', async () => {
  const { ladeKern } = require('./load-kern.js');
  const { V, document } = ladeKern();
  await V.depotAnlegen('benutzersicht-protokoll-1');
  const KENNUNG = 'probeKennungOhneName';
  const r = V.buergermodulSektorErsetzen('assets', [{ sektorId: 'assets', sektionId: 'einkommen-wohnsituation', feldId: KENNUNG, unterVon: null, feld: { id: KENNUNG, typ: 'text' } }]);
  assert.ok((r.verworfen || []).some((v) => v.name === KENNUNG), 'Voraussetzung: das Feld wurde abgewiesen und steht im Protokoll');
  V.renderSektor('assets');
  const bereich = document.getElementById('content').innerHTML;
  assert.ok(bereich.length > 200, 'Voraussetzung: der Bereich wurde gezeichnet');
  assert.ok(!sichtbarerText(bereich).includes(KENNUNG) && !bereich.includes(KENNUNG), 'nicht im Bereich');
  assert.ok(!V.einstellungenHTML().includes(KENNUNG), 'nicht in den Einstellungen');
});

test('[Benutzersicht·Protokoll·Rot-Beweis] eine Anzeige, die die Kennung zeigt, fällt auf', () => {
  assert.equal(sichtbarerText('<p>Abgewiesen: probeKennungOhneName</p>').includes('probeKennungOhneName'), true);
  assert.equal(sichtbarerText('<p>1 Feld wurde nicht übernommen.</p>').includes('probeKennungOhneName'), false);
});
