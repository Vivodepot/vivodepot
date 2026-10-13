'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Neugestaltung A+ mit Glas, Wagen S2 (08.10.2026): der Assistent Aufnahmebogen, Schritte 1 und 2
   ─────────────────────────────────────────────────────────────────────────────
   Abnahme (Bauvorlage A+ mit Glas, Proben 1, 3, 4, 8; Hängestellen 2 und 3; B1, B4):
   (1) GLEICHLAUF: jedes Beispiel des Assistenten ergibt Felder, die das Paket des Fachwegs tragen — die Vorprüfung
       (vorabUrteilVorlage, dieselbe wie „Vorab prüfen“) urteilt „bestanden“ oder „gemeldet“, nie „abgewiesen“, und das
       Einreich-Paket besteht das Schema. Die Felder entstehen über feldAusBasisBauen, denselben Weg wie die Arbeitsfläche.
   (2) B1 SICHTBAR: eine Auswahl nur mit Antworttexten („Anliegen“: drei Antworten) kommt mit allen drei im Paket an,
       jede mit einem Code; Rot-Beweis mit dem alten Filter, der Optionen ohne Code verwarf.
   (3) Keine Fachbegriffe im Assistenten (DE und EN); Kennung, Code-System und Code bleiben in der Fachebene.
   (4) Sektorstreuung: höchstens eines der Beispiele ist Gesundheit.
   (5) Die Karte zeigt nur, was die App heute zeigt: „von <Einrichtung>“ und das Siegel der App (Textsatz), kein „Erstellt mit
       Vivodepot“; der Herkunftssatz steht wörtlich.
   (6) Übergabe: „Weiter: Einreichen“ öffnet den Fachweg bei den Angaben, Name vorbelegt; Rechtsform nur bei „Behörde“.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

function assistentMitBeispiel(art, sprache) {
  const g = ladeGenerator();
  g.V.ASSISTENT.sprache = sprache || 'de';
  g.V.assistentBeispielLaden(art);
  return g;
}
function paketFuer(V, felder) {
  const state = { felder, anbieter: V.baueAnbieter({ anbieterName: 'Bürgerservice Musterstadt', rechtsform: 'Behörde', strasse: 'Rathausplatz 1', plz: '12345',
    ort: 'Musterstadt', land: 'Deutschland', kontaktName: 'Erika Beispiel', kontaktEmail: 'buergerservice@beispiel.example' }),
    publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
  return { state, paket: V.baueSubmission(state) };
}

/* ── (1) Gleichlauf ──────────────────────────────────────────────────────── */
for (const art of ['behoerde', 'verein', 'kanzlei', 'schule', 'praxis', 'unternehmen', 'andere']) {
  test('[Assistent · Gleichlauf ' + art + '] die Felder des Beispiels bestehen die Vorprüfung des Fachwegs und das Einreich-Schema', () => {
    const { V } = assistentMitBeispiel(art);
    const felder = nativ(V.assistentFelder());
    assert.ok(felder.length >= 3, 'zu wenige Fragen');
    const { state, paket } = paketFuer(V, felder);
    const urteil = V.vorabUrteilVorlage(state);
    assert.notEqual(urteil.urteil, 'abgewiesen', JSON.stringify(urteil.zeilen));
    assert.deepEqual(nativ(V.validiereSubmission(paket)), [], 'das Paket besteht das Einreich-Schema nicht');
  });
}
test('[Assistent · Gleichlauf] ein Register-Feld aus dem Assistenten ist dasselbe Feld wie aus der Palette', () => {
  const { V } = assistentMitBeispiel('behoerde');
  const ausAssistent = nativ(V.assistentFelder())[0];
  const idx = V.FELDKATALOG.findIndex((k) => k.kennung === V.ASSISTENT_REGISTER.vorname);
  const ausPalette = nativ(V.feldAusBasisBauen(V.feldAusKatalog(idx), [], 0).feld);
  assert.deepEqual(ausAssistent, ausPalette);
});

/* ── (2) B1 sichtbar ─────────────────────────────────────────────────────── */
test('[Assistent · B1] „Anliegen“ mit drei Antworttexten kommt mit allen drei im Paket an, jede mit Code', () => {
  const { V } = assistentMitBeispiel('behoerde');
  const { paket } = paketFuer(V, nativ(V.assistentFelder()));
  const anliegen = paket.templates[0].felder.find((f) => f.feldname === 'Anliegen');
  assert.ok(anliegen, 'kein Feld „Anliegen“ im Paket');
  assert.deepEqual(anliegen.codeWerte.map((c) => c.anzeige), ['Ausweis', 'Wohnsitz melden', 'Parkausweis']);
  for (const c of anliegen.codeWerte) assert.ok(c.code && c.code.trim(), 'Option ohne Code: ' + c.anzeige);
});
test('[Assistent · B1 · Rot-Beweis] der alte Filter auf den Code hätte alle drei Antworten verworfen', () => {
  const { V } = assistentMitBeispiel('behoerde');
  const roh = V.ASSISTENT.fragen.find((f) => Array.isArray(f.antworten)).antworten.map((a) => ({ code: '', anzeige: a[0] }));
  assert.equal(roh.filter((c) => c.code).length, 0, 'so sah es vor dem Befund aus: keine Antwort überlebte');
  const felder = nativ(V.assistentFelder());
  assert.equal(felder.find((f) => f.feldtyp === 'auswahl').codeWerte.length, 3);
});

/* ── (3) Fachbegriffe ────────────────────────────────────────────────────── */
function assistentBlock(html) {
  const a = html.indexOf('<main id="raum-assistent"');
  assert.ok(a > 0, 'kein Assistent');
  return html.slice(a, html.indexOf('</main>', a));
}
const FACHBEGRIFFE = /\b(LOINC|ICD(-10)?|SNOMED|ATC|FHIR|JSON|VC-Issuer|code system|key pair|URI|identifier)\b/i;
const FACHBEGRIFFE_DE = /\b(Kürzel|Code-System|Code|Kennung|Modul-Version|Schlüsselpaar|Submission|Template|Register)\b/;
/* Die sichtbaren Texte, die der Assistent zur Laufzeit setzt: das deutsche Argument jedes L('de', 'en') in seinem Code. */
function laufzeitTexteDe(html) {
  const q = html.slice(html.indexOf('const ASSISTENT = {'), html.indexOf('function assistentBinden'));
  return [...q.matchAll(/\bL\('((?:[^'\\]|\\.)*)', '/g)].map((m) => m[1]).join(' ');
}
function fachbegriffe(html) {
  const b = assistentBlock(html);
  const de = b.replace(/<[^>]+>/g, ' '), en = [...b.matchAll(/data-en(?:-aria|-ph)?="([^"]*)"/g)].map((m) => m[1]).join(' ');
  const js = HTML.slice(HTML.indexOf('const ASSISTENT_BEISPIELE'), HTML.indexOf('function assistentFrageName'));
  return [(de + ' ' + en + ' ' + js.replace(/[{}[\]:,']/g, ' ').replace(/\b(reg|frage|antworten|pflicht|titel|fragen|true|const|Object|freeze)\b/g, ' ')).match(FACHBEGRIFFE), de.match(FACHBEGRIFFE_DE)]
    .concat([laufzeitTexteDe(html).match(FACHBEGRIFFE_DE)])
    .filter(Boolean).map((m) => m[0]);
}
test('[Assistent · Fachbegriffe] keine Fachbegriffe in Schritten, Beispielen und Karte, deutsch und englisch', () => {
  assert.deepEqual(fachbegriffe(HTML), []);
});
test('[Assistent · Fachbegriffe · Rot-Beweis] „Register“ in einem Laufzeittext des Assistenten wird gefunden (Fachebene und Kopf-Link ausgenommen)', () => {
  const kopie = HTML.replace("L('Standardfeld', 'Standard field')", "L('Feld aus dem Register', 'Register field')");
  assert.notEqual(kopie, HTML);
  assert.deepEqual(fachbegriffe(kopie), ['Register']);
});
test('[Assistent · Fachbegriffe · Rot-Beweis] „Code-System“ in einem Schritt wird gefunden', () => {
  const kopie = HTML.replace('Was soll auf dem Bogen stehen?', 'Welches Code-System soll der Bogen nutzen?');
  assert.notEqual(kopie, HTML);
  assert.ok(fachbegriffe(kopie).length);
});

/* ── (4) Sektorstreuung ──────────────────────────────────────────────────── */
const GESUNDHEIT = /Gesundheit|Pflege|Patient|Arzt|Klinik|Kranken|Termin.*Arzt|Anamnese|Praxis|health|medical|patient/i;
test('[Assistent · Sektorstreuung] höchstens eines der Beispiele ist Gesundheit', () => {
  const { V } = ladeGenerator();
  const ges = Object.entries(V.ASSISTENT_BEISPIELE).filter(([art, b]) => GESUNDHEIT.test(art + ' ' + JSON.stringify(b)));
  assert.ok(ges.length <= 1, ges.map((x) => x[0]).join(', '));
  assert.ok(Object.keys(V.ASSISTENT_BEISPIELE).length >= 6);
});

/* ── (5) Karte ───────────────────────────────────────────────────────────── */
/* Die Karte zeigt nur, was die App heute zeigt (Quellenprüfung 08.10.2026): das Siegel ist der Textsatz-Wert der App
   (strings:anfrageGeprueftBadge.text, DE und EN, am Sprachmodul gelesen), kein „Erstellt mit Vivodepot“, solange die App es nicht trägt. */
const TS_DE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8'));
const TS_EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const tsText = (m, k) => m.texte[k + '.text'];
function kartenBefunde(html) {
  const b = assistentBlock(html), f = [];
  const de = tsText(TS_DE, 'strings:anfrageGeprueftBadge'), en = tsText(TS_EN, 'strings:anfrageGeprueftBadge');
  const m = b.match(/<span class="as-siegel" data-en="([^"]*)">([^<]*)<\/span>/);
  if (!m) f.push('kein Siegel');
  else { if (m[2] !== de) f.push('Siegel DE „' + m[2] + '“ ≠ App „' + de + '“'); if (m[1] !== en) f.push('Siegel EN „' + m[1] + '“ ≠ App „' + en + '“'); }
  if (/Erstellt mit Vivodepot|Made with Vivodepot/.test(b)) f.push('„Erstellt mit Vivodepot“ steht auf der Karte, die App trägt es nicht');
  return f;
}
test('[Assistent · Karte] Siegel = App-Text (Textsatz anfrageGeprueftBadge, DE und EN), kein „Erstellt mit Vivodepot“, „von <Einrichtung>“ und der Herkunftssatz wörtlich', () => {
  assert.deepEqual(kartenBefunde(HTML), []);
  const b = assistentBlock(HTML);
  assert.match(b, /<small data-en="from">von<\/small><b id="as-k-name"/);
  assert.ok(b.includes('data-en="Vivodepot confirms who the template comes from, not whether its content is correct.">Vivodepot bestätigt, von wem die Vorlage kommt, nicht ob ihr Inhalt richtig ist.'));
});
test('[Assistent · Karte · Rot-Beweis] ein erfundenes Siegel und eine erfundene Fußzeile werden gefunden', () => {
  const kopie = HTML.replace('<span class="as-siegel" data-en="Verified">Geprüft</span>', '<span class="as-siegel" data-en="Origin checked">Herkunft geprüft</span><div class="as-fuss">Erstellt mit Vivodepot</div>');
  assert.notEqual(kopie, HTML);
  assert.equal(kartenBefunde(kopie).length, 3);
});

/* ── (6) Übergabe in den Fachweg ─────────────────────────────────────────── */
test('[Assistent · Übergabe] „Weiter: Einreichen“ legt die Felder an, belegt den Namen vor und öffnet die Angaben; Rechtsform nur bei Behörde', () => {
  const q = HTML.slice(HTML.indexOf('function assistentEinreichen'), HTML.indexOf('function assistentBinden'));
  assert.match(q, /STATE\.felder = assistentFelder\(\);/);
  assert.match(q, /if \(\$\('sd-name'\) && !\$\('sd-name'\)\.value\.trim\(\)\) \$\('sd-name'\)\.value = ASSISTENT\.name\.trim\(\);/);
  // Seit U2-ADR-495 aus dem Rechtsraum-Modul: die Rechtsform, die das Modul der Art zuordnet („Behörde“ im DE-Modul), nur bei gewähltem Rechtsraum.
  assert.match(q, /rechtsformFuerArt\(\$\('sd-rechtsraum'\) && \$\('sd-rechtsraum'\)\.value, ASSISTENT\.art\)/);
  const { V } = ladeGenerator();
  assert.equal(V.rechtsformFuerArt('DE', 'behoerde'), 'Behörde');
  assert.equal(V.rechtsformFuerArt('DE', 'praxis'), '', 'keine Rechtsform, wo das Modul keine zuordnet');
  assert.equal(V.rechtsformFuerArt('', 'behoerde'), '', 'ohne Rechtsraum keine Vorbelegung');
  assert.match(q, /zeigeSchritt\('stammdaten'\);/);
  assert.ok(HTML.includes("an('ein-aufnahme', 'click', () => { assistentNeu(); zeigeSchritt('assistent'); });"), 'die Kachel „Aufnahmebogen“ führt in den Assistenten');
});
