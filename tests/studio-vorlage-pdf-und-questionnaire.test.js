'use strict';
/* Studio-Schritt 5 (12.11.2026): „Vorlage sichern“ gibt die Vorlage im eigenen
   Format, daneben als HL7 FHIR R4 Questionnaire (4.0.1, https://hl7.org/fhir/R4/questionnaire.html) und als lesbares PDF aus.
   Das PDF trägt den Questionnaire (Beziehung Data) und die Vorlage (Beziehung Source) als Anhang.
   Gehalten, an der Beispielvorlage „verein“ (Mitgliedsantrag Sportverein):
     · vorlageQuestionnaire(state): Questionnaire mit Titel, Fassung, Herausgeber; je Baustein ein Eintrag in der Reihenfolge der
       Vorlage, Pflicht als required, Datum als date, Auswahl als choice mit den Auswahlwerten als answerOption;
     · vorlagePdfBauen(state): ein PDF mit genau diesen zwei Anhängen, ohne Schlüssel;
     · vorlageSichern(): drei Dateien, der Questionnaire byte-gleich zum Anhang im PDF.
     · im PDF stehen Titel und Beschriftungen in Inter, keine Feldkennung und kein Code-Wert; die Schrift-Region ist aktuell, und die
       SBOM führt das Studio als Träger von jsPDF und Inter.
   ROT-BEWEIS: am Stand 8c21ce09a gibt es keine der drei Funktionen; alle Proben sind rot (gefahren 12.11.2026). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeGenerator } = require('./load-generator.js');

function vorbereitet() {
  const g = ladeGenerator();
  const V = g.V;
  const vorlage = V.BEISPIEL_TEMPLATES.verein;
  const state = Object.assign({}, V.STATE, {
    felder: vorlage.felder.map((f) => Object.assign({}, f)),
    dokument: { titel: vorlage.titel }, vorlageId: 'mitgliedsantrag', version: 2,
    anbieter: Object.assign({}, V.STATE.anbieter, { anbieterName: 'TSV Probestadt' }),
  });
  Object.assign(V.STATE, state);
  return { g, V, vorlage, state };
}
const fn = (g, name) => {
  assert.equal(typeof g.sandbox[name], 'function', name + ' fehlt im Studio (Schritt 5)');
  return g.sandbox[name];
};
/* Alle Einträge mit Eingabe, in der Reihenfolge des Fragebogens (Gruppen und Hinweise ausgelassen). */
function eingaben(items, aus = []) {
  for (const it of items || []) {
    if (it.type === 'group') eingaben(it.item, aus);
    else if (it.type !== 'display') aus.push(it);
  }
  return aus;
}
/* Jede eingebettete Datei des PDF mit ihrer Beziehung, am Byte-Strom gelesen. */
function anhaenge(bytes) {
  const s = Buffer.from(bytes).toString('latin1');
  const aus = [];
  for (const m of s.matchAll(/\/Type\s*\/EmbeddedFile\b[^]*?\/Length\s+(\d+)[^]*?stream\r?\n/g)) {
    const start = m.index + m[0].length;
    aus.push(Buffer.from(s.slice(start, start + Number(m[1])), 'latin1').toString('utf8'));
  }
  return { dateien: aus, beziehungen: [...s.matchAll(/\/AFRelationship\s*\/(\w+)/g)].map((m) => m[1]) };
}

test('[Studio·Vorlage·Questionnaire] FHIR R4 Questionnaire: Kopf, Reihenfolge, Pflicht, Datum, Auswahl', () => {
  const { g, vorlage, state } = vorbereitet();
  const q = fn(g, 'vorlageQuestionnaire')(state);
  assert.equal(q.resourceType, 'Questionnaire');
  assert.ok(['draft', 'active'].includes(q.status));
  assert.equal(q.title, vorlage.titel);
  assert.equal(q.version, '2');
  assert.equal(q.publisher, 'TSV Probestadt');
  const e = eingaben(q.item);
  // Array.from: die Beispielvorlage stammt aus dem Kontext des Studios, deepEqual prüft auch den Prototyp.
  assert.deepEqual(e.map((x) => x.text), Array.from(vorlage.felder, (f) => f.feldname), 'je Baustein ein Eintrag, in der Reihenfolge der Vorlage');
  assert.equal(new Set(e.map((x) => x.linkId)).size, e.length, 'linkId eindeutig');
  const nach = (t) => e.find((x) => x.text === t);
  assert.equal(nach('Vorname').type, 'string');
  assert.equal(nach('Vorname').required, true);
  assert.ok(!nach('E-Mail').required, 'keine Pflicht ohne Pflichtangabe');
  assert.equal(nach('Geburtsdatum').type, 'date');
  const art = nach('Art der Mitgliedschaft');
  assert.equal(art.type, 'choice');
  const quelle = vorlage.felder.find((f) => f.feldname === 'Art der Mitgliedschaft').codeWerte;
  assert.deepEqual(art.answerOption.map((o) => o.valueCoding.code), quelle.map((c) => c.code));
  assert.deepEqual(art.answerOption.map((o) => o.valueCoding.display), quelle.map((c) => c.anzeige));
});

test('[Studio·Vorlage·PDF] ein PDF mit dem Questionnaire (Data) und der Vorlage (Source) als Anhang, ohne Schlüssel', async () => {
  const { g, state } = vorbereitet();
  const bytes = await fn(g, 'vorlagePdfBauen')(state);
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString('latin1'), '%PDF-');
  const { dateien, beziehungen } = anhaenge(bytes);
  assert.equal(dateien.length, 2, 'genau zwei Anhänge');
  assert.deepEqual([...beziehungen].sort(), ['Data', 'Source']);
  const json = dateien.map((d) => JSON.parse(d));
  assert.ok(json.some((d) => d.resourceType === 'Questionnaire'), 'der Questionnaire ist angehängt');
  assert.ok(json.some((d) => JSON.stringify(d).includes('vivodepot-vorlage')), 'die Vorlage im eigenen Format ist angehängt');
  for (const d of dateien) assert.ok(!/"d"\s*:/.test(d) && !/PRIVATE KEY/.test(d), 'kein Schlüssel im Anhang');
});

test('[Studio·Vorlage·Sichern] „Vorlage sichern“: drei Dateien, der Questionnaire byte-gleich zum Anhang im PDF', async () => {
  const { g } = vorbereitet();
  const hinaus = [];
  g.sandbox.blobDownload = (name, inhalt, typ) => { hinaus.push({ name, inhalt, typ }); };
  await fn(g, 'vorlageSichern')();
  assert.equal(hinaus.length, 3, 'drei Dateien: ' + hinaus.map((h) => h.name).join(', '));
  const pdf = hinaus.find((h) => /\.pdf$/.test(h.name));
  const q = hinaus.find((h) => /questionnaire\.json$/.test(h.name));
  const v = hinaus.find((h) => h !== pdf && h !== q && /\.json$/.test(h.name));
  assert.ok(pdf && q && v, 'Vorlage, Questionnaire und PDF');
  assert.equal(pdf.typ, 'application/pdf');
  assert.equal(q.typ, 'application/fhir+json');
  assert.ok(anhaenge(pdf.inhalt).dateien.includes(String(q.inhalt)), 'der Anhang im PDF ist die ausgegebene Questionnaire-Datei');
});

/* Was das PDF setzt, an der echten Bibliothek mitgeschrieben: der Konstruktor wird umhüllt, jedes doc.text und doc.setFont
   wird festgehalten. So wird der Text geprüft, ohne die komprimierten Ströme mit eingebetteter Schrift zu dekodieren. */
function mitschreiben(g) {
  const lib = g.windowStub.jspdf;
  const texte = [], schriften = [];
  Object.defineProperty(g.windowStub, 'jspdf', { configurable: true, value: { jsPDF: function (o) {
    const d = new lib.jsPDF(o);
    const text = d.text.bind(d), setFont = d.setFont.bind(d);
    d.text = (t, ...rest) => { texte.push(...[].concat(t)); return text(t, ...rest); };
    d.setFont = (f, ...rest) => { schriften.push(f); return setFont(f, ...rest); };
    return d;
  } } });
  return { texte, schriften };
}

test('[Studio·Vorlage·PDF-Text] Titel und jede Beschriftung stehen im PDF, in Inter; kein Schlüssel, keine Feldkennung', async () => {
  const { g, vorlage, state } = vorbereitet();
  const { texte, schriften } = mitschreiben(g);
  await fn(g, 'vorlagePdfBauen')(state);
  const alles = texte.join('\n');
  assert.ok(alles.includes(vorlage.titel), 'Titel');
  for (const f of vorlage.felder) assert.ok(texte.includes(f.feldname), 'Beschriftung fehlt: ' + f.feldname);
  assert.match(alles, /Fördermitglied/, 'Auswahlwerte in Alltagssprache');
  assert.match(alles, /Pflichtangabe/);
  assert.ok(schriften.length && schriften.every((s) => s === 'Inter'), 'gesetzt in Inter: ' + [...new Set(schriften)].join(', '));
  const q = fn(g, 'vorlageQuestionnaire')(state);
  for (const it of eingaben(q.item)) assert.ok(!texte.includes(it.linkId), 'Feldkennung im PDF: ' + it.linkId);
  for (const c of vorlage.felder.flatMap((f) => f.codeWerte || [])) assert.ok(!alles.includes(c.code + ' '), 'Code-Wert im PDF: ' + c.code);
  for (const wort of ['identity', 'administration', 'mitgliedsantrag', 'Questionnaire', 'linkId', 'FHIR']) assert.ok(!alles.includes(wort), 'Fachwort im PDF: ' + wort);
});

test('[Studio·PDF-Schrift] die Schrift-Region ist aktuell, und die SBOM führt das Studio als Träger von jsPDF und Inter', () => {
  const S = require('../tools/studio-pdf-schrift-bauen.js');
  const { zusaetzlicheTraeger, interPdfTraeger } = require('../tools/sbom-pflegen.js');
  const path = require('node:path');
  const fs = require('node:fs');
  const REPO = path.join(__dirname, '..');
  const studio = fs.readFileSync(S.STUDIO, 'utf8');
  const modul = JSON.parse(fs.readFileSync(S.QUELLE, 'utf8'));
  assert.equal(S.regionErsetzen(studio, S.region(modul), 'studio'), studio, 'Drift — node tools/studio-pdf-schrift-bauen.js');
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const titel = (studio.match(/<title>([^<]*)<\/title>/) || [])[1].trim();
  assert.ok(zusaetzlicheTraeger('jspdf', kern, REPO).includes(titel), 'jsPDF im Studio ist byte-gleich zum Kern');
  const sbom = JSON.parse(fs.readFileSync(path.join(REPO, 'vivodepot.sbom.cdx.json'), 'utf8'));
  const traeger = (n) => (sbom.components.find((c) => c.name === n).properties || []).filter((p) => p.name === 'vivodepot:zusaetzlicher-traeger').map((p) => p.value);
  assert.ok(traeger('jspdf').includes(titel + ' (byte-gleiche Kopie)'));
  const inter = sbom.components.find((c) => c.name === 'font-inter-pdf');
  const dateien = inter.properties.filter((p) => p.name === 'bsi:component:filename').map((p) => p.value);
  assert.deepEqual(interPdfTraeger(dateien, REPO), [titel]);
  assert.ok(traeger('font-inter-pdf').includes(titel + ' (byte-gleiche Kopie)'));
});

test('[Studio·PDF-Schrift·Rot-Beweis] ein fremder Schnitt in der Region bricht die SBOM-Pflege ab; ohne Region kein Träger', () => {
  const { interPdfTraeger } = require('../tools/sbom-pflegen.js');
  const S = require('../tools/studio-pdf-schrift-bauen.js');
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-pdf-schrift-'));
  try {
    fs.writeFileSync(path.join(tmp, 'a.ttf'), Buffer.from([0, 1, 0, 0, 7]));
    const region = (b) => '<title>Probe</title><script>\n' + S.BEGIN + '\nconst STUDIO_PDF_SCHRIFTEN = '
      + JSON.stringify([{ familie: 'Inter', art: 'normal', ttf: b.toString('base64') }]) + ';\n' + S.ENDE + '\n</script>';
    fs.writeFileSync(path.join(tmp, 'p.html'), region(Buffer.from([0, 1, 0, 0, 7])));
    assert.deepEqual(interPdfTraeger(['a.ttf'], tmp), ['Probe']);
    fs.writeFileSync(path.join(tmp, 'p.html'), region(Buffer.from([0, 1, 0, 0, 8])));
    assert.throws(() => interPdfTraeger(['a.ttf'], tmp), /keiner Datei der Komponente gleicht/);
    fs.writeFileSync(path.join(tmp, 'p.html'), '<title>Probe</title><p>ohne</p>');
    assert.deepEqual(interPdfTraeger(['a.ttf'], tmp), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
