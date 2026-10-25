'use strict';
/* ════════════════════════════════════════════════════════════════════════
   @rechtslage lpa-england-wales
   Stand: LP1F und LP1H, Fassung 08.25 (Office of the Public Guardian), gov.uk-Publikation
   https://www.gov.uk/government/publications/lasting-power-of-attorney-forms (so heißt die Seite seit 20.04.2026),
   abgerufen 02.10.2026, am 18.10.2026 unter denselben PDF-Adressen byte-gleich bestätigt. Gepinnt per SHA-256 in tools/lpa-formular-wortlaut-pruefen.js
   (LPA_FORMULARE) und docs/fremdquellen.md; im Repo liegt nur der extrahierte Text (tests/fixtures/opg/),
   die PDFs nicht. Lizenz: Open Government Licence v3.0.
   Anlass zur Neuprüfung: eine neue Formularfassung — oder das Inkrafttreten von s. 1 Powers of
   Attorney Act 2023 (legislation.gov.uk/ukpga/2023/42/section/1, heute „Prospective"); s. U2-ADR-477.
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-477 — der Wortlaut-Wächter der LPA-Ausfüllhilfe, nach dem Muster von U2-ADR-343: jeder Abschnittstitel, jede Feldbezeichnung,
   jede Antwortmöglichkeit und jedes Zitat in den Moduldateien steht wörtlich im PDF-Text des gepinnten
   Formularstands. Eigener Text ist nur Bedienung und steht in einer geschlossenen Liste im Erzeuger.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/lpa-formular-wortlaut-pruefen.js');

const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lpa-wortlaut-'));
after(() => { fs.rmSync(TEMP, { recursive: true, force: true }); });
const kopie = (o) => JSON.parse(JSON.stringify(o));

function pinBefund() { return W.pinsPruefen(); }
function wortlautBefund() {
  const r = W.wortlautPruefen();
  return r.geprueft > 800 ? r.fehler : ['Positivkontrolle: nur ' + r.geprueft + ' Stellen gesammelt'].concat(r.fehler);
}

test('[U2-ADR-477·Wortlaut] LP1F und LP1H (08.25) sind per SHA-256 gepinnt, ihr Text liegt als Fixture', () => {
  assert.deepEqual(pinBefund(), []);
  assert.deepEqual(Object.keys(W.LPA_FORMULARE).sort(), ['LP1F', 'LP1H']);
  assert.deepEqual(fs.readdirSync(path.join(__dirname, 'fixtures', 'opg')).filter((n) => n.endsWith('.pdf')), [],
    'die PDFs liegen nicht im Repo, nur ihre Prüfsumme');
});

test('[U2-ADR-477·Wortlaut] jeder amtliche Text der fünf Module steht wörtlich im PDF-Text', () => {
  assert.deepEqual(wortlautBefund(), []);
});

test('[U2-ADR-477·Wortlaut] die Text-Fixtures tragen keine Steuerzeichen, nur Wortlaut und Leerraum', () => {
  for (const f of Object.values(W.LPA_FORMULARE)) {
    assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(fs.readFileSync(f.text, 'utf8')), path.basename(f.text));
  }
});

/* ── Die Logik des --dokument-Pfads, mit erfundenen Bytes und eingespritztem Extraktor ──
   Die amtlichen PDFs liegen nicht im Repo. Die echte Prüfung gegen sie ist ein Werkzeuglauf
   (`node tools/lpa-formular-wortlaut-pruefen.js --dokument <pdf>`, Prüfweg in docs/fremdquellen.md); hier wird nur
   geprüft, dass der Pfad richtig urteilt: Pin per SHA-256, Textgleichheit, „übersprungen" ohne Extraktor, rot bei
   einem anderen Byte oder einem anderen Text. Nichts wird übersprungen. */
const ERFUNDEN = Buffer.from('%PDF-erfunden — kein amtliches Formular, nur Bytes fuer die Probe\n');
const ERFUNDEN_TEXT = 'Section 1\fThe donor\u0007Title\n';
function erfundenesFormular() {
  const pdf = path.join(TEMP, 'erfunden.pdf');
  const text = path.join(TEMP, 'erfunden.txt');
  fs.writeFileSync(pdf, ERFUNDEN);
  fs.writeFileSync(text, W.extraktNormalisieren(ERFUNDEN_TEXT));
  return { pdf, formulare: { ERF: { sha256: W.sha256(pdf), text } } };
}
const extraktor = (antwort) => () => antwort;

function dokumentBefund() {
  const { pdf, formulare } = erfundenesFormular();
  const r = W.dokumentPruefen(pdf, { formulare, extraktor: extraktor(ERFUNDEN_TEXT) });
  const u = W.dokumentUrteil(r, 'erfunden.pdf');
  const raus = [];
  if (r.formular !== 'ERF') raus.push('Pin per SHA-256 nicht getroffen');
  if (r.fehler.length || r.uebersprungen || u.exit !== 0) raus.push('gleicher Text nicht grün: ' + u.meldung);
  return raus;
}

test('[U2-ADR-477·Wortlaut·Dokument] der Dokument-Pfad trifft den Pin per SHA-256 und verlangt denselben Text', () => {
  assert.deepEqual(dokumentBefund(), []);
});

test('[U2-ADR-477·Wortlaut·Dokument] ohne Extraktor ist das Urteil „übersprungen“ mit Exit 2, nie grün', () => {
  const { pdf, formulare } = erfundenesFormular();
  const r = W.dokumentPruefen(pdf, { formulare, extraktor: extraktor(null) });
  assert.deepEqual(r, { fehler: [], formular: 'ERF', uebersprungen: true });
  const u = W.dokumentUrteil(r, 'erfunden.pdf');
  assert.equal(u.exit, 2);
  assert.match(u.meldung, /ÜBERSPRUNGEN/);
});

/* ── Rot-Beweise ── */
test('[U2-ADR-477·Wortlaut·Rot-Beweis] ein verändertes Byte im PDF ist ein anderer Formularstand', () => {
  const { pdf, formulare } = erfundenesFormular();
  const bytes = fs.readFileSync(pdf);
  bytes[3] ^= 0x01;
  fs.writeFileSync(pdf, bytes);
  const r = W.dokumentPruefen(pdf, { formulare, extraktor: extraktor(ERFUNDEN_TEXT) });
  assert.equal(r.fehler.length, 1);
  assert.match(r.fehler[0], /keiner der gepinnten Stände/);
  assert.equal(W.dokumentUrteil(r, 'erfunden.pdf').exit, 1);
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] ein extrahierter Text, der nicht die Fixture ist, wird im Dokument-Pfad rot', () => {
  const { pdf, formulare } = erfundenesFormular();
  const r = W.dokumentPruefen(pdf, { formulare, extraktor: extraktor('Section 1 The donor First name') });
  assert.equal(r.fehler.length, 1);
  assert.match(r.fehler[0], /weicht von der Fixture ab/);
  assert.equal(W.dokumentUrteil(r, 'erfunden.pdf').exit, 1);
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] ein Pin ohne gültige Prüfsumme wird rot', () => {
  const formulare = { LP1F: Object.assign({}, W.LPA_FORMULARE.LP1F, { sha256: 'abc' }) };
  assert.equal(W.pinsPruefen(formulare).length, 1);
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] eine verfälschte Feldbezeichnung wird gefunden', () => {
  const m = W.moduleLesen();
  const v = kopie(m);
  v.bereichEn.bereiche['lpa-england-wales'].sektionen.find((s) => s.id === 'section-1').felder[1].label = 'First name';
  const r = W.wortlautPruefen({ module: v });
  assert.equal(r.fehler.length, 1, r.fehler.join('\n'));
  assert.match(r.fehler[0], /„First name"/);
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] ein Text, den nur LP1F kennt, als allgemeiner Text wird gegen LP1H rot', () => {
  const v = kopie(W.moduleLesen());
  const a = v.listeDe.abschnitte.find((x) => x.titel.startsWith('Section 10'));
  a.bloecke[0].texte.push('This attorney is a trust corporation.');   // nur in LP1F; ohne Formularbindung
  const r = W.wortlautPruefen({ module: v });
  assert.equal(r.fehler.length, 1, r.fehler.join('\n'));
  assert.match(r.fehler[0], /steht nicht wörtlich in LP1H/);
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] ein eigener Satz, der nicht als Bedienung eingetragen ist, gilt als Zitat und wird rot', () => {
  const v = kopie(W.moduleLesen());
  v.listeEn.abschnitte[3].bloecke.unshift({ typ: 'immer', texte: ['Your attorneys should always agree.'] });
  const r = W.wortlautPruefen({ module: v });
  assert.equal(r.fehler.length, 1, r.fehler.join('\n'));
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] eine Gebühr ohne Abrufdatum oder eine Quelle ohne OGL wird rot', () => {
  const v = kopie(W.moduleLesen());
  const regel = v.rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln.find((x) => /£/.test(x.text));
  delete regel.abgerufen;
  assert.equal(W.wortlautPruefen({ module: v }).fehler.length, 1);
  const q = kopie(W.moduleLesen());
  q.rechtsraum.quelle.lizenz = 'frei';
  assert.equal(W.wortlautPruefen({ module: q }).fehler.length, 1);
});

/* Die Quelle nennt die Publikationsseite der gepinnten Formulare — nicht die frühere Adresse, die seit 20.04.2026 nur
   weiterleitet —, und das Register der Fremdquellen nennt dieselbe Seite. */
function quellenBefund(module, fremdquellenText) {
  const raus = W.wortlautPruefen({ module }).fehler.filter((f) => /quelle/.test(f));
  const url = module.rechtsraum.quelle && module.rechtsraum.quelle.url;
  if (!fremdquellenText.includes('Publikationsseite ' + url)) raus.push('docs/fremdquellen.md nennt die Publikationsseite ' + url + ' nicht');
  for (const alt of W.ALTE_SEITENADRESSEN) if (fremdquellenText.includes('Publikationsseite ' + alt)) raus.push('docs/fremdquellen.md nennt die Weiterleitung ' + alt + ' als Publikationsseite');
  return raus;
}
const FREMDQUELLEN = () => fs.readFileSync(path.join(__dirname, '..', 'docs', 'fremdquellen.md'), 'utf8');

test('[U2-ADR-477·Wortlaut] die Quelle nennt die heutige Publikationsseite, im Modul und im Register der Fremdquellen', () => {
  assert.deepEqual(quellenBefund(W.moduleLesen(), FREMDQUELLEN()), []);
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] die frühere Seitenadresse (nur noch Weiterleitung) als Quelle wird rot', () => {
  const v = kopie(W.moduleLesen());
  v.rechtsraum.quelle.url = W.ALTE_SEITENADRESSEN[0];
  assert.ok(quellenBefund(v, FREMDQUELLEN()).length >= 1, 'die alte Adresse im Modul fällt nicht auf');
  const alt = FREMDQUELLEN().replace('Publikationsseite ' + W.LPA_FORMULARE.LP1F.url, 'Publikationsseite ' + W.ALTE_SEITENADRESSEN[0]);
  assert.ok(quellenBefund(W.moduleLesen(), alt).length >= 1, 'die alte Adresse im Register fällt nicht auf');
});

test('[U2-ADR-477·Wortlaut·Rot-Beweis] ein Gesetzeszitat ohne legislation.gov.uk-Adresse wird rot', () => {
  const v = kopie(W.moduleLesen());
  const regel = v.rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln.find((x) => /section 9\(2\)\(b\)/.test(x.fundstelle));
  assert.ok(regel, 'Vorbedingung: das Zitat zu s. 9(2)(b) steht im Modul');
  delete regel.uri;
  assert.equal(W.wortlautPruefen({ module: v }).fehler.length, 1);
});

/* Proben-Kopplung (Prüfstand U2-ADR-099): jede Klausel-Probe nennt die Funktion, die ihr Urteil trägt. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-477·Wortlaut] LP1F und LP1H (08.25) sind per SHA-256 gepinnt, ihr Text liegt als Fixture', diskriminante: pinBefund },
    { fuer: '[U2-ADR-477·Wortlaut] jeder amtliche Text der fünf Module steht wörtlich im PDF-Text', diskriminante: wortlautBefund },
    { fuer: '[U2-ADR-477·Wortlaut·Dokument] der Dokument-Pfad trifft den Pin per SHA-256 und verlangt denselben Text', diskriminante: dokumentBefund },
    { fuer: '[U2-ADR-477·Wortlaut] die Quelle nennt die heutige Publikationsseite, im Modul und im Register der Fremdquellen', diskriminante: quellenBefund },
  ],
};
