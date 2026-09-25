'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-364 — nur lateinische Schrift im DE-Sprachmodul
   ────────────────────────────────────────────────────────────────────────
   Anlass: die Produktentscheidung fand „z. B. 王芳 statt Fang Wang" im ersten Block des
   deutschen Produkts. Behoben (Beispiel getauscht); dieser Wächter hält fest,
   dass der nächste Fall nicht wieder von ihr selbst gefunden werden muss.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { pruefeModul, fremdeZeichen } = require('../tools/textsatz-de-nur-lateinisch-pruefen.js');
const REPO = path.join(__dirname, '..');
const ECHTES_MODUL = path.join(REPO, 'tools', 'textsatz-de-modul.json');

test('[U2-ADR-364·Positivkontrolle] das echte DE-Sprachmodul trägt kein Zeichen außerhalb Latin/Common/Inherited', () => {
  const { geprueft, funde } = pruefeModul(ECHTES_MODUL);
  assert.ok(geprueft > 1000, 'Vorbedingung: die Messung sieht wirklich den ganzen Bestand (' + geprueft + ' Werte)');
  assert.deepEqual(funde, [], 'Unerwarteter Fund fremder Schrift: ' + JSON.stringify(funde.slice(0, 3)));
});

test('[U2-ADR-364·Ausgetauschtes Beispiel] die frühere chinesische Beispielzeichenkette ist verschwunden, das neue ungarische Beispiel steht da', () => {
  const modul = JSON.parse(fs.readFileSync(ECHTES_MODUL, 'utf8'));
  const hint = modul.texte['identity.displayFamilyNameFirst.hint'];
  assert.ok(hint, 'Vorbedingung: der Hinweistext existiert noch');
  assert.equal(fremdeZeichen(hint).length, 0, 'der Hinweistext selbst darf keine fremde Schrift mehr tragen');
  assert.match(hint, /Nagy Peter/, 'das neue, lateinische Beispiel muss stehen');
  assert.doesNotMatch(hint, /王芳/, 'das alte chinesische Beispiel darf nicht mehr stehen');
});

/* ── Rot-Beweis: ein chinesisches Zeichen in einen Wert schreiben → rot ──── */
test('[U2-ADR-364·Rot-Beweis] ein chinesisches Zeichen in einem Wert wird gefunden', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-adr-364-'));
  const modulPfad = path.join(tmp, 'modul.json');
  const echtesModul = JSON.parse(fs.readFileSync(ECHTES_MODUL, 'utf8'));
  const gepflanzt = JSON.parse(JSON.stringify(echtesModul));
  gepflanzt.texte['identity.givenName.beispiel'] = '王芳';
  fs.writeFileSync(modulPfad, JSON.stringify(gepflanzt), 'utf8');
  try {
    const { funde } = pruefeModul(modulPfad);
    assert.ok(funde.some((f) => f.pfad === 'texte.identity.givenName.beispiel'),
      'die gepflanzte chinesische Zeichenkette muss als Fund erscheinen');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[U2-ADR-364·Rot-Beweis] kyrillische und arabische Zeichen werden ebenfalls gefunden', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-adr-364-'));
  const modulPfad = path.join(tmp, 'modul.json');
  const gepflanzt = { texte: { a: 'Пример', b: 'مثال', c: 'normal deutsch' } };
  fs.writeFileSync(modulPfad, JSON.stringify(gepflanzt), 'utf8');
  try {
    const { funde } = pruefeModul(modulPfad);
    const pfade = funde.map((f) => f.pfad);
    assert.ok(pfade.includes('texte.a'), 'Kyrillisch muss gefunden werden');
    assert.ok(pfade.includes('texte.b'), 'Arabisch muss gefunden werden');
    assert.ok(!pfade.includes('texte.c'), 'reiner deutscher Text darf nicht mitgezählt werden');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ── Gegenprobe: die vom Auftrag benannten Grenzfälle dürfen NICHT rot machen ──
   Vorher geprüft, nicht nur behauptet — s. Kopf-Kommentar des Werkzeugs für die
   Begründung (Latin/Common/Inherited als generische, universelle Klassen). */
test('[U2-ADR-364·Grenzfälle-Gegenprobe] Währung, Mittelpunkt, Gedankenstrich, Anführungszeichen, Ballot-Box, Diakritika bleiben grün', () => {
  const grenzfaelle = {
    waehrung: 'Kosten: 1.850 EUR, Preis: 200 €, oder $50',
    mittelpunkt: 'Girokonto · Sparkonto · Tagesgeld',
    gedankenstrich: 'Für Namen, die in dieser Reihenfolge geschrieben werden — z. B. Nagy Peter',
    anfuehrungszeichen_deutsch: 'ein Text mit „deutschen“ Anführungszeichen',
    anfuehrungszeichen_englisch: "ein Text mit 'einfachen' und ‘typografischen’ Zeichen",
    ballotbox: 'Status: ☐ noch offen, ☑ erledigt',
    diakritika_eigenname: 'García, Peter Müller, Björk Guðmundsdóttir, Nagy Péter',
  };
  for (const [name, text] of Object.entries(grenzfaelle)) {
    const funde = fremdeZeichen(text);
    assert.deepEqual(funde, [], name + ' hätte NICHT rot machen dürfen, aber: ' + JSON.stringify(funde) + ' in „' + text + '"');
  }
});

test('[U2-ADR-364·Ausnahme-Schlüssel] modulTyp/sprache/moduleVersion/anbieterId werden nicht mitgezählt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-adr-364-'));
  const modulPfad = path.join(tmp, 'modul.json');
  // 'sprache':'de' selbst ist unkritisch, aber die Ausnahme wird mit einem echten
  // Fremdschrift-Wert IN einem Metadaten-Feld geprüft, damit der Rot-Beweis etwas beweist.
  const gepflanzt = { modulTyp: '王', sprache: 'de', moduleVersion: 1, anbieterId: 'vivodepot',
    texte: { a: 'ganz normaler deutscher Text' } };
  fs.writeFileSync(modulPfad, JSON.stringify(gepflanzt), 'utf8');
  try {
    const { funde } = pruefeModul(modulPfad);
    assert.deepEqual(funde, [], 'Metadaten-Schlüssel dürfen nicht mitgezählt werden — sie sind keine bürgersichtbaren Texte');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
