'use strict';
/* Studio-Schritt 5 (12.11.2026): der Wächter über die Ausgabewege des Studios (tools/studio-ausgabewege-pruefen.js).
   Gehalten:
     · am Studio: jeder Weg ist geschlossen oder als Lücke geführt, und der geschlossene Weg „Vorlage sichern“ ruft
       Questionnaire und PDF — ROT, bis Schritt 5 gebaut ist;
     · die Grundlinie führt jede gemessene Lücke genau einmal und keine, die es nicht gibt;
     · Rot-Beweise an erfundenen Quelltexten: ein neuer Weg, eine verschwundene Lücke, ein geschlossener Weg ohne PDF-Aufruf.
   S-4 (16.11.2026): „Vorlage sichern“ wählt die Datei nach dem Bereich der Felder und geht über studioStandardUndPdfAusgeben aus;
   die Fälle am Ende fahren das Studio je Anlass (health, identity, people, gemischt), dazu den QR-Code ohne Signatur und den
   Namenshinweis. Inhalt der Dateien: tests/studio-vorlage-pdf-und-questionnaire.test.js.
   ROT-BEWEIS S-4: am Kanon-Stand e8beeab2e (GENERATOR_HTML_PATH auf eine Kopie) sind alle Fälle „[Studio·Ausgabeweg·S-4 …]“ (6) rot
   (gefahren 16.11.2026); health zählt mit, weil der QR-Code fehlte. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const W = require('../tools/studio-ausgabewege-pruefen.js');

const GL = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));
const studio = () => fs.readFileSync(W.STUDIO, 'utf8');

test('[Studio·Ausgabewege] jeder Weg ist geschlossen oder geführt; „Vorlage sichern“ gibt Questionnaire und PDF aus', () => {
  const { befunde } = W.pruefen({ quelle: studio(), grundlinie: GL });
  assert.deepEqual(befunde, []);
});

test('[Studio·Ausgabewege·Grundlinie] die Lücken sind genau die gemessenen Wege ohne Standard und PDF', () => {
  const wege = W.wegeMessen(studio());
  const gemessen = Object.keys(wege).filter((n) => !GL.geschlossen[n]).sort();
  assert.deepEqual(Object.keys(GL.luecken).sort(), gemessen);
  for (const [n, grund] of Object.entries(GL.luecken)) assert.ok(typeof grund === 'string' && grund.length > 10, 'Grund fehlt: ' + n);
  // S-4 (16.11.2026): „Vorlage sichern“ wählt die Datei nach dem Bereich und gibt über denselben Weg wie die anderen aus.
  assert.deepEqual(GL.geschlossen.vorlageSichern.ruft, ['vorlageDateienNachBereich', 'studioStandardUndPdfAusgeben']);
});

const FIX = [
  'function blobDownload(dateiname, text, typ) { }',
  'function altWeg() {',
  "  blobDownload('a.json', '{}');",
  '}',
  'function vorlageSichern() {',
  "  blobDownload('v.json', '{}');",
  "  blobDownload('v-qr.png', new Uint8Array(), 'image/png');",
  "  studioStandardUndPdfAusgeben({ standard: vorlageDateienNachBereich() });",
  '}',
].join('\n');
const FIX_GL = { geschlossen: { vorlageSichern: { standard: 'nach Bereich', ruft: ['vorlageDateienNachBereich', 'studioStandardUndPdfAusgeben'] } }, luecken: { altWeg: 'Probe' } };

test('[Studio·Ausgabewege·Rot-Beweis] neuer Weg, verschwundene Lücke und fehlender PDF-Aufruf werden rot', () => {
  assert.deepEqual(W.pruefen({ quelle: FIX, grundlinie: FIX_GL }).befunde, [], 'Vorbedingung: die Fixture ist grün');
  assert.deepEqual(W.wegeMessen(FIX), { altWeg: 1, vorlageSichern: 2 }, 'die Deklaration zählt nicht');
  const neu = FIX + "\nfunction nochEiner() {\n  blobDownload('n.txt', 'x');\n}\n";
  assert.match(W.pruefen({ quelle: neu, grundlinie: FIX_GL }).befunde.join('\n'), /neuer Ausgabeweg ohne Standard und PDF: nochEiner/);
  const ohneAlt = FIX.replace("  blobDownload('a.json', '{}');\n", '');
  assert.match(W.pruefen({ quelle: ohneAlt, grundlinie: FIX_GL }).befunde.join('\n'), /Lücke altWeg gibt es nicht mehr/);
  const ohnePdf = FIX.replace('studioStandardUndPdfAusgeben(', 'Promise.resolve(');
  assert.match(W.pruefen({ quelle: ohnePdf, grundlinie: FIX_GL }).befunde.join('\n'), /vorlageSichern ruft studioStandardUndPdfAusgeben nicht/);
  const ohneWeg = FIX.replace('function vorlageSichern', 'function andererName');
  assert.match(W.pruefen({ quelle: ohneWeg, grundlinie: FIX_GL }).befunde.join('\n'), /geschlossener Weg vorlageSichern fehlt/);
});

/* ── S-4: die Ausgabe je Anlass, am laufenden Studio ───────────────────────────────────────────────────────────────────── */
const fsm = require('node:fs');
const vm = require('node:vm');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

function studioGeladen() {
  const g = ladeGenerator();
  const html = fsm.readFileSync(GEN_PATH, 'utf8');
  const a = html.indexOf('<script id="qrcode_VivodepotInline">');
  vm.runInContext(html.slice(html.indexOf('>', a) + 1, html.indexOf('</script>', a)), g.sandbox);
  /* Gemessen wird die Ausgabe in drei Wegen, wie sie mit hochgeladener Abholseite gilt (Schalter ABHOLSEITE_LIVE im Studio). */
  vm.runInContext('ABHOLSEITE_LIVE = true', g.sandbox);
  return g;
}
const F = (feldname, bereich) => ({ feldname, feldtyp: 'text', pflicht: false, bereich, gruppe: 'Angaben' });
const ANLAESSE = {
  health: { felder: [F('Allergien', 'health')], standard: ['questionnaire.json'] },
  identity: { felder: [F('Vorname', 'identity')], standard: ['sd-jwt-vc.json'] },
  people: { felder: [F('Ansprechperson', 'people')], standard: ['kontakt.vcf'] },
  gemischt: { felder: [F('Vorname', 'identity'), F('Allergien', 'advanceCare'), F('Ansprechperson', 'people'), F('Nummer', 'administration')],
    standard: ['questionnaire.json', 'sd-jwt-vc.json', 'kontakt.vcf'] },
};
async function gesichert(felder, name) {
  const g = studioGeladen();
  const anbieter = g.sandbox.baueAnbieter({ anbieterName: name, kontaktEmail: 'a@probe.example' });
  Object.assign(g.V.STATE, { felder, dokument: { titel: 'Probe' }, vorlageName: 'Probe', vorlageId: 'probe', version: 1, anbieter });
  const hinaus = [];
  g.sandbox.blobDownload = (n, inhalt, typ) => { hinaus.push({ name: n, inhalt, typ }); };
  await g.sandbox.vorlageSichern();
  return { g, hinaus };
}

for (const [anlass, soll] of Object.entries(ANLAESSE)) {
  test('[Studio·Ausgabeweg·S-4 ' + anlass + '] die Dateien: Vorlage, je Bereich eine im Standard, PDF mit allen als Anhang, QR-Code', async () => {
    const { hinaus } = await gesichert(soll.felder, 'TSV Probestadt');
    const namen = hinaus.map((h) => h.name);
    const ende = (e) => namen.filter((n) => n.endsWith(e));
    for (const e of soll.standard) assert.equal(ende(e).length, 1, e + ' fehlt: ' + namen.join(', '));
    // Seit 17.11.2026 geht die Entwurfsdatei mit (zum Wiederöffnen im Studio); sie steht nicht als Anhang im PDF.
    assert.equal(ende('-entwurf.json').length, 1, 'die Entwurfsdatei fehlt: ' + namen.join(', '));
    assert.equal(namen.length, soll.standard.length + 4, 'Vorlage, Entwurf, ' + soll.standard.length + ' im Standard, PDF, QR-Code: ' + namen.join(', '));
    assert.equal(ende('.pdf').length, 1);
    assert.equal(namen.filter((n) => /-qr\.(png|gif)$/.test(n)).length, 1);
    const pdf = Buffer.from(hinaus.find((h) => /\.pdf$/.test(h.name)).inhalt).toString('latin1');
    assert.equal((pdf.match(/\/Type\s*\/EmbeddedFile\b/g) || []).length, soll.standard.length + 1, 'alle Dateien als Anhang im PDF');
  });
}

test('[Studio·Ausgabeweg·S-4 Name] ohne Namen geht nichts hinaus, mit Namen alles', async () => {
  const ohne = await gesichert(ANLAESSE.identity.felder, '');
  assert.deepEqual(ohne.hinaus.map((h) => h.name), []);
  assert.equal(ohne.g.document.getElementById('sd-name-meldung').hidden, false);
  const mit = await gesichert(ANLAESSE.identity.felder, 'TSV Probestadt');
  assert.equal(mit.hinaus.length, 5, 'Vorlage, Entwurf, SD-JWT VC, PDF, QR-Code');
});

test('[Studio·Ausgabeweg·S-4 QR] der QR-Code der Vorlage trägt eine kurze https-Adresse der Marke und entsteht ohne Signatur und ohne Schlüssel', async () => {
  const { g, hinaus } = await gesichert(ANLAESSE.identity.felder, 'TSV Probestadt');
  assert.ok(hinaus.some((h) => /-qr\.(png|gif)$/.test(h.name)));
  const t = g.sandbox.baueTemplateObjekt(Object.assign({}, g.V.STATE)).template;
  const r = await g.sandbox.vorlageQr(t);
  assert.ok(g.sandbox.kurzlinkGueltig(r.link) && r.link.startsWith(g.sandbox.markeAdresse('anfrageAblage') + '#vorlage='), r.link);
});
