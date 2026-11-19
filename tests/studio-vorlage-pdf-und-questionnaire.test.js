'use strict';
/* Studio-Schritt 5 (12.11.2026): „Vorlage sichern“ gibt die Vorlage im eigenen
   Format, daneben als HL7 FHIR R4 Questionnaire (4.0.1, https://hl7.org/fhir/R4/questionnaire.html) und als lesbares PDF aus.
   Das PDF trägt den Questionnaire (Beziehung Data) und die Vorlage (Beziehung Source) als Anhang.
   Gehalten, an der Beispielvorlage „verein“ (Mitgliedsantrag Sportverein):
     · vorlageQuestionnaire(state): Questionnaire mit Titel, Fassung, Herausgeber; je Baustein ein Eintrag in der Reihenfolge der
       Vorlage, Pflicht als required, Datum als date, Auswahl als choice mit den Auswahlwerten als answerOption;
     · vorlagePdfBauen(state): ein PDF mit genau diesen zwei Anhängen, ohne Schlüssel;
     · vorlageSichern(): S-4 (16.11.2026) — die Ausgabe folgt dem Bereich der Felder (FHIR Questionnaire bei health/advanceCare,
       SD-JWT VC bei identity, vCard 4.0 bei people, sonst das Vorlagenformat), je Bereich eine Datei, dazu immer PDF und QR-Code;
       der QR-Code der Vorlage entsteht ohne Signatur; Sichern verlangt nur den Namen, fehlt er, steht der Hinweis am Namensfeld.
       Eine Datei im Standard steht byte-gleich als Anhang im PDF.
     · im PDF stehen Titel und Beschriftungen in Inter, keine Feldkennung und kein Code-Wert; die Schrift-Region ist aktuell, und die
       SBOM führt das Studio als Träger von jsPDF und Inter.
   ROT-BEWEIS: am Stand 8c21ce09a gibt es keine der drei Funktionen; alle Proben sind rot (gefahren 12.11.2026).
   ROT-BEWEIS S-4: die Fälle „[Studio·Vorlage·S-4 …]“ am Kanon-Stand e8beeab2e (GENERATOR_HTML_PATH auf eine Kopie dieses Stands):
   alle Fälle „S-4“ dieser Datei (10) sind rot; die übrigen vier Proben der Datei bleiben grün (gefahren 16.11.2026). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

// Der QR-Block des Studios in denselben Sandkasten (der Lader nimmt nur die zwei Haupt-Skripte), wie in der Probe zum Anfrage-QR.
function mitQr(geladen) {
  const html = fs.readFileSync(GEN_PATH, 'utf8');
  const a = html.indexOf('<script id="qrcode_VivodepotInline">');
  const b = html.indexOf('</script>', a);
  vm.runInContext(html.slice(html.indexOf('>', a) + 1, b), geladen.sandbox);
  return geladen;
}

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

/* S-4: Vorlagen je Anlass. Jede trägt die Felder eines Bereichs; „gemischt“ mehrere. Die Stelle hat Namen, Ansprechperson, Anschrift. */
const FELD = (feldname, bereich, mehr) => Object.assign({ feldname, feldtyp: 'text', pflicht: false, bereich, gruppe: 'Angaben' }, mehr || {});
const ANLASS = {
  health: [FELD('Allergien', 'health', { pflicht: true }), FELD('Patientenverfügung vorhanden', 'advanceCare', { feldtyp: 'jaNein' })],
  identity: [FELD('Vorname', 'identity', { pflicht: true }), FELD('Nachname', 'identity', { pflicht: true })],
  people: [FELD('Name der Ansprechperson', 'people', { pflicht: true }), FELD('Telefon der Ansprechperson', 'people')],
  gemischt: [FELD('Vorname', 'identity', { pflicht: true }), FELD('Allergien', 'health'), FELD('Name der Ansprechperson', 'people'), FELD('Mitgliedsnummer', 'administration')],
  ohneStandard: [FELD('Mitgliedsnummer', 'administration'), FELD('Kennzeichen', 'mobility')],
};
function fuerAnlass(felder, name = 'TSV Probestadt', ohneQr) {
  const g = ohneQr ? ladeGenerator() : mitQr(ladeGenerator());
  const V = g.V;
  const anbieter = g.sandbox.baueAnbieter({ anbieterName: name, strasse: 'Vereinsweg 1', plz: '12345', ort: 'Probestadt', land: 'Deutschland',
    kontaktName: 'Erika Muster', kontaktEmail: 'erika@probestadt.example', kontaktTelefon: '+49 30 123456' });
  Object.assign(V.STATE, { felder: felder.map((f) => Object.assign({}, f)), dokument: { titel: 'Probe-Vorlage' }, vorlageName: 'Probe-Vorlage', vorlageId: 'probe', version: 1, anbieter });
  const hinaus = [];
  g.sandbox.blobDownload = (n, inhalt, typ) => { hinaus.push({ name: n, inhalt, typ }); };
  return { g, V, hinaus };
}
const nachEndung = (hinaus, re) => hinaus.filter((h) => re.test(h.name));
/* Dateien der Ausgabe, nach Art sortiert: das Vorlagenformat, die Dateien im Standard, das PDF, der QR-Code, die Entwurfsdatei. */
function sortiert(hinaus) {
  const pdf = nachEndung(hinaus, /\.pdf$/), qr = nachEndung(hinaus, /-qr\.(png|gif)$/), entwurf = nachEndung(hinaus, /-entwurf\.json$/);
  const standard = nachEndung(hinaus, /-(questionnaire|sd-jwt-vc)\.json$|-kontakt\.vcf$/);
  const vorlage = hinaus.filter((h) => !pdf.includes(h) && !qr.includes(h) && !standard.includes(h) && !entwurf.includes(h));
  return { pdf, qr, standard, vorlage, entwurf };
}

test('[Studio·Vorlage·S-4 health] Gesundheit und Vorsorge: FHIR Questionnaire R4 mit allen Feldern, dazu Vorlage, PDF und QR-Code', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.health);
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  assert.equal(s.vorlage.length, 1, 'das Vorlagenformat geht unverändert hinaus');
  assert.equal(s.standard.length, 1, 'eine Datei im Standard: ' + hinaus.map((h) => h.name).join(', '));
  assert.match(s.standard[0].name, /-questionnaire\.json$/);
  assert.equal(s.standard[0].typ, 'application/fhir+json');
  const q = JSON.parse(s.standard[0].inhalt);
  assert.equal(q.resourceType, 'Questionnaire');
  assert.deepEqual(eingaben(q.item).map((x) => x.text), ['Allergien', 'Patientenverfügung vorhanden']);
  assert.equal(s.pdf.length, 1); assert.equal(s.qr.length, 1);
  assert.ok(anhaenge(s.pdf[0].inhalt).dateien.includes(String(s.standard[0].inhalt)), 'der Questionnaire ist byte-gleich als Anhang im PDF');
});

test('[Studio·Vorlage·S-4 identity] Identität: SD-JWT VC mit den verlangten Angaben als Claims, ohne Questionnaire und ohne vCard', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.identity);
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  assert.deepEqual(s.standard.map((h) => h.name.replace(/^.*(?=-sd-jwt)/, '')), ['-sd-jwt-vc.json'], hinaus.map((h) => h.name).join(', '));
  const vc = JSON.parse(s.standard[0].inhalt);
  assert.match(vc.vct, /^urn:vivodepot:vorlage:/);
  assert.deepEqual(vc.claims.map((c) => c.display[0].label), ['Vorname', 'Nachname']);
  assert.deepEqual(vc.claims.map((c) => c.mandatory), [true, true]);
  assert.ok(vc.claims.every((c) => Array.isArray(c.path) && c.path.length === 1 && c.sd === 'always'));
  assert.ok(!/"d"\s*:|PRIVATE KEY|signature/.test(s.standard[0].inhalt), 'unsigniert, ohne Schlüssel');
  assert.ok(anhaenge(s.pdf[0].inhalt).dateien.includes(String(s.standard[0].inhalt)), 'als Anhang im PDF');
  assert.equal(s.qr.length, 1);
});

test('[Studio·Vorlage·S-4 people] Erreichbarkeit und Ansprechpersonen: vCard 4.0 der Stelle, ohne Questionnaire und ohne SD-JWT VC', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.people);
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  assert.deepEqual(s.standard.map((h) => h.name.replace(/^.*(?=-kontakt)/, '')), ['-kontakt.vcf'], hinaus.map((h) => h.name).join(', '));
  assert.equal(s.standard[0].typ, 'text/vcard');
  const v = String(s.standard[0].inhalt);
  assert.match(v, /^BEGIN:VCARD\r\nVERSION:4\.0\r\n/);
  assert.match(v, /\r\nFN:Erika Muster\r\n/);
  assert.match(v, /\r\nORG:TSV Probestadt\r\n/);
  assert.match(v, /\r\nTEL;TYPE=work:\+49 30 123456\r\n/);
  assert.match(v, /\r\nEMAIL;TYPE=work:erika@probestadt\.example\r\n/);
  assert.match(v, /\r\nADR;TYPE=work:;;Vereinsweg 1;Probestadt;;12345;Deutschland\r\n/);
  assert.match(v, /END:VCARD\r\n$/);
  assert.ok(anhaenge(s.pdf[0].inhalt).dateien.includes(v), 'als Anhang im PDF');
});

test('[Studio·Vorlage·S-4 gemischt] Mischt die Vorlage Bereiche: je Bereich eine Datei im Standard mit den Feldern dieses Bereichs, dazu ein PDF', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.gemischt);
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  const art = (re) => s.standard.find((h) => re.test(h.name));
  assert.equal(s.standard.length, 3, hinaus.map((h) => h.name).join(', '));
  assert.deepEqual(eingaben(JSON.parse(art(/questionnaire/).inhalt).item).map((x) => x.text), ['Allergien'], 'Questionnaire: nur Gesundheit');
  assert.deepEqual(JSON.parse(art(/sd-jwt-vc/).inhalt).claims.map((c) => c.display[0].label), ['Vorname'], 'SD-JWT VC: nur Identität');
  assert.match(art(/kontakt/).inhalt, /^BEGIN:VCARD/);
  assert.equal(s.vorlage.length, 1, 'das Vorlagenformat trägt alle Felder, auch Verwaltung');
  assert.equal(JSON.parse(s.vorlage[0].inhalt).felder.length, 4);
  assert.equal(s.pdf.length, 1, 'ein PDF');
  const dateien = anhaenge(s.pdf[0].inhalt).dateien;
  for (const h of [...s.standard, ...s.vorlage]) assert.ok(dateien.includes(String(h.inhalt)), 'als Anhang im PDF: ' + h.name);
  assert.equal(dateien.length, 4);
});

test('[Studio·Vorlage·S-4 sonst] Ein Bereich ohne Standard: das Vorlagenformat, dazu PDF und QR-Code', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.ohneStandard);
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  assert.equal(s.standard.length, 0);
  assert.equal(s.vorlage.length, 1); assert.equal(s.pdf.length, 1); assert.equal(s.qr.length, 1);
});

test('[Studio·Vorlage·S-4 Oberfläche] kein Fachwort im Ergebnis und im Status: „Als Datei“, „Als PDF“, „QR-Code“', async () => {
  const { g } = fuerAnlass(ANLASS.gemischt);
  await fn(g, 'vorlageSichern')();
  const text = String(g.document.getElementById('bau-status').textContent);
  assert.match(text, /Als Datei/); assert.match(text, /PDF/); assert.match(text, /QR-Code/);
  for (const wort of ['FHIR', 'Questionnaire', 'SD-JWT', 'vCard', 'JSON', 'Schema']) assert.ok(!text.includes(wort), 'Fachwort im Status: ' + wort);
  const box = g.document.getElementById('sichern-ergebnis');
  assert.equal(box.hidden, false);
});

test('[Studio·Vorlage·S-4 QR] fehlt die QR-Bibliothek, gehen Vorlage und PDF trotzdem hinaus; das Ergebnis sagt es', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.identity, 'TSV Probestadt', true);
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  assert.deepEqual([s.vorlage.length, s.standard.length, s.pdf.length, s.qr.length], [1, 1, 1, 0]);
  assert.equal(g.document.getElementById('sichern-ergebnis').hidden, false, 'das Ergebnis steht da, auch ohne QR-Code');
});

const b64uRoh = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

test('[Studio·Vorlage·S-4 QR] der QR-Code der Vorlage entsteht ohne Signatur: kurzer Link mit Inhalt, sonst Link auf die Abholseite', async () => {
  const zlib = require('node:zlib');
  // Eine kleine Vorlage: die kompakte Form passt in die kurze Adresse, der Code trägt den Inhalt.
  const klein = fuerAnlass([FELD('Name', 'identity')]);
  const tK = klein.g.sandbox.baueTemplateObjekt(Object.assign({}, klein.V.STATE)).template;
  const rK = await fn(klein.g, 'vorlageQr')(tK);
  assert.equal(rK.art, 'inhalt', 'Link: ' + rK.link.length + ' Zeichen');
  assert.ok(rK.link.startsWith(klein.g.sandbox.markeAdresse('anfrageAblage') + '#vorlage='));
  assert.ok(klein.g.sandbox.kurzlinkGueltig(rK.link), 'eine kurze https-Adresse, wie sie kurzlinkQrDataUrl verlangt');
  assert.deepEqual(JSON.parse(zlib.inflateRawSync(b64uRoh(rK.link.split('#vorlage=')[1])).toString('utf8')), JSON.parse(JSON.stringify(tK)), 'der Inhalt im Link ist die Vorlage');
  assert.ok(rK.qr.dataUrl.startsWith('data:image/gif;base64,') && rK.qr.module > 20);
  // Eine große Vorlage: der Inhalt passt nicht, der Code trägt den Link auf die Abholseite.
  const gross = fuerAnlass(ANLASS.gemischt.concat(Array.from({ length: 12 }, (_, i) => FELD('Zusatzangabe Nummer ' + (i + 1), 'administration', { hilfetext: 'Bitte nur ausfüllen, wenn es auf Sie zutrifft (' + i + ').' }))));
  const tG = gross.g.sandbox.baueTemplateObjekt(Object.assign({}, gross.V.STATE)).template;
  const rG = await fn(gross.g, 'vorlageQr')(tG);
  assert.equal(rG.art, 'abholseite');
  assert.ok(rG.link.startsWith(gross.g.sandbox.markeAdresse('anfrageAblage') + '#vorlage='));
  assert.ok(gross.g.sandbox.kurzlinkGueltig(rG.link));
  assert.deepEqual(JSON.parse(Buffer.from(rG.link.split('#vorlage=')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')), { vorlageId: 'probe', version: 1 });
});

test('[Studio·Vorlage·S-4 QR] „Vorlage sichern“ gibt den QR-Code als Bild aus und zeigt die Adresse lesbar daneben; im PDF steht dieselbe Adresse', async () => {
  const { g, hinaus } = fuerAnlass(ANLASS.identity);
  const { texte } = mitschreiben(g);
  await fn(g, 'vorlageSichern')();
  const qr = nachEndung(hinaus, /-qr\.(png|gif)$/);
  assert.equal(qr.length, 1);
  assert.equal(Buffer.from(qr[0].inhalt).subarray(0, 3).toString('latin1'), 'GIF', 'die Datei ist das Bild, nicht der Text der Bild-Adresse');
  const adresse = texte.find((t) => /^https:\/\//.test(t));
  assert.ok(adresse && adresse.includes('#vorlage='), 'die Adresse steht im PDF');
});

test('[Studio·Vorlage·S-4 Name] fehlt der Name, steht der Hinweis am Namensfeld und nichts geht hinaus; sonst blockiert nichts', async () => {
  const { g, V, hinaus } = fuerAnlass(ANLASS.identity, '');
  const feld = g.document.getElementById('sd-name');
  const gesetzt = [];
  feld.setAttribute = (k, v) => gesetzt.push([k, v]);
  feld.value = '';
  await fn(g, 'vorlageSichern')();
  assert.equal(hinaus.length, 0, 'ohne Namen geht nichts hinaus: ' + hinaus.map((h) => h.name).join(', '));
  assert.deepEqual(gesetzt, [['aria-invalid', 'true']], 'das Namensfeld trägt aria-invalid');
  assert.equal(g.document.getElementById('sd-name-meldung').hidden, false, 'die Meldung steht am Namensfeld');
  assert.match(String(g.document.getElementById('bau-status').textContent), /Name/);
  // Mit dem Namen im Feld (statt in den Angaben) geht alles hinaus, die Meldung geht.
  V.STATE.anbieter = null;
  feld.value = 'Bürgerservice Probestadt';
  feld.removeAttribute = () => {};
  await fn(g, 'vorlageSichern')();
  assert.equal(g.document.getElementById('sd-name-meldung').hidden, true);
  assert.equal(sortiert(hinaus).pdf.length, 1);
  assert.ok(sortiert(hinaus).qr.length === 1);
  // Sonst blockiert nichts: auch eine Vorlage ohne Felder und ohne Wortlaut wird gesichert.
  hinaus.length = 0;
  V.STATE.felder = [];
  await fn(g, 'vorlageSichern')();
  assert.deepEqual([sortiert(hinaus).vorlage.length, sortiert(hinaus).pdf.length, sortiert(hinaus).qr.length], [1, 1, 1]);
});

/* Gesichert heißt wieder zu öffnen (17.11.2026): „Vorlage sichern“ gibt die Entwurfsdatei mit. Sie trägt Name, Zweck und Stelle,
   die das Vorlagenformat nicht trägt; in einem frischen Studio geöffnet, steht die Vorlage wieder da, wie sie gesichert wurde.
   ROT-BEWEIS: am Stand d254dbe34 geht keine Entwurfsdatei hinaus und entwurfAnwenden fehlt; dieser Fall ist rot. */
test('[Studio·Vorlage·Wiederöffnen] „Vorlage sichern“ gibt die Entwurfsdatei mit; geöffnet steht die Vorlage samt Name, Zweck und Stelle wieder da', async () => {
  const { g, V, hinaus } = fuerAnlass(ANLASS.gemischt, 'TSV Probestadt');
  Object.assign(V.STATE, { vorlageName: 'Aufnahme in den Verein', vorlageZweck: 'Mitgliedschaft beantragen' });
  await fn(g, 'vorlageSichern')();
  const s = sortiert(hinaus);
  assert.equal(s.entwurf.length, 1, 'genau eine Entwurfsdatei: ' + hinaus.map((h) => h.name).join(', '));
  assert.equal(s.vorlage.length, 1, 'das Vorlagenformat geht daneben unverändert hinaus');
  const text = String(s.entwurf[0].inhalt);
  assert.ok(!/"d"\s*:|PRIVATE KEY|privateKey/.test(text), 'kein Schlüssel in der Entwurfsdatei');
  // In einem frischen Studio öffnen: dieselbe Übernahme wie „Entwurf fortsetzen“.
  const g2 = ladeGenerator();
  fn(g2, 'entwurfAnwenden')(JSON.parse(text));
  const st = g2.V.STATE;
  assert.deepEqual(Array.from(st.felder, (f) => f.feldname), ANLASS.gemischt.map((f) => f.feldname), 'die Felder stehen in derselben Reihenfolge wieder da');
  assert.deepEqual(Array.from(st.felder, (f) => !!f.pflicht), ANLASS.gemischt.map((f) => !!f.pflicht), 'die Pflichtangaben stehen wieder da');
  assert.equal(st.vorlageName, 'Aufnahme in den Verein');
  assert.equal(st.vorlageZweck, 'Mitgliedschaft beantragen');
  // Die Stelle steht wie bei „Entwurf fortsetzen“ wieder in den Feldern der Stelle, und das nächste Sichern nimmt sie von dort.
  assert.equal(String(g2.document.getElementById('sd-name').value), 'TSV Probestadt', 'der Name der Stelle steht wieder im Feld');
  assert.equal(String(g2.document.getElementById('sd-ort').value), 'Probestadt', 'die Anschrift der Stelle steht wieder im Feld');
  assert.equal(fn(g2, 'vorlageName')(fn(g2, '_vorlageStateAktuell')()), 'TSV Probestadt', 'das nächste Sichern nennt dieselbe Stelle');
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
