'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Neugestaltung A+ mit Glas, Wagen S2 (08.10.2026): die einfachen Beispiele; seit 14.11.2026 am Start der einen Arbeitsfläche
   ─────────────────────────────────────────────────────────────────────────────
   Abnahme (Bauvorlage A+ mit Glas, Proben 1, 3, 4, 8; Hängestellen 2 und 3; B1, B4):
   (1) GLEICHLAUF: jedes Beispiel des Assistenten ergibt Felder, die das Paket des Fachwegs tragen — die Vorprüfung
       (vorabUrteilVorlage, dieselbe wie „Vorab prüfen“) urteilt „bestanden“ oder „gemeldet“, nie „abgewiesen“, und das
       Einreich-Paket besteht das Schema. Die Felder entstehen über feldAusBasisBauen, denselben Weg wie die Arbeitsfläche.
   (2) B1 SICHTBAR: eine Auswahl nur mit Antworttexten („Anliegen“: drei Antworten) kommt mit allen drei im Paket an,
       jede mit einem Code; Rot-Beweis mit dem alten Filter, der Optionen ohne Code verwarf.
   (3) Keine Fachbegriffe im Assistenten (DE und EN); Kennung, Code-System und Code bleiben in der Fachebene.
   (4) Sektorstreuung: höchstens eines der Beispiele ist Gesundheit.
   (5) Die Karte zeigt nur, was die App heute zeigt: „von <Einrichtung>“ und den Chip „Vorschau“ (kein „Geprüft“ vor der Prüfung), kein
       „Erstellt mit Vivodepot“; der Herkunftssatz steht wörtlich.
   (6) Übergabe: „Weiter: Einreichen“ öffnet den Fachweg bei den Angaben, Name vorbelegt; Rechtsform nur bei „Behörde“.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

function beispiel(art) {
  const g = ladeGenerator();
  g.V.spracheFuerProbeSetzen('de');
  return Object.assign(g, { felder: nativ(g.V.beispielFelder(art)) });
}
function paketFuer(V, felder) {
  const state = { felder, anbieter: V.baueAnbieter({ anbieterName: 'Bürgerservice Musterstadt', rechtsform: 'Behörde', strasse: 'Rathausplatz 1', plz: '12345',
    ort: 'Musterstadt', land: 'Deutschland', kontaktName: 'Erika Beispiel', kontaktEmail: 'buergerservice@beispiel.example' }),
    publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
  return { state, paket: V.baueSubmission(state) };
}
function rumpf(html, name) {
  const a = html.indexOf('function ' + name + '(');
  assert.ok(a >= 0, 'keine Funktion ' + name);
  return html.slice(a, html.indexOf('\nfunction ', a + 10));
}

/* ── (1) Gleichlauf ──────────────────────────────────────────────────────── */
for (const art of ['behoerde', 'verein', 'kanzlei', 'schule', 'praxis', 'unternehmen', 'andere']) {
  test('[Assistent · Gleichlauf ' + art + '] die Felder des Beispiels bestehen die Vorprüfung des Fachwegs und das Einreich-Schema', () => {
    const { V, felder } = beispiel(art);
    assert.ok(felder.length >= 3, 'zu wenige Felder');
    const { state, paket } = paketFuer(V, felder);
    const urteil = V.vorabUrteilVorlage(state);
    assert.notEqual(urteil.urteil, 'abgewiesen', JSON.stringify(urteil.zeilen));
    assert.deepEqual(nativ(V.validiereSubmission(paket)), [], 'das Paket besteht das Einreich-Schema nicht');
  });
}
test('[Assistent · Gleichlauf] ein Register-Feld aus dem Beispiel ist dasselbe Feld wie aus der Bausteinliste', () => {
  const { V, felder } = beispiel('behoerde');
  const ausBeispiel = Object.assign({}, felder[0], { pflicht: false });   // seit Wagen 1.5 als „Muss“ vorbelegt; die Bausteinliste legt ohne Pflicht an
  const idx = V.FELDKATALOG.findIndex((k) => k.kennung === V.ASSISTENT_REGISTER.vorname);
  const ausListe = Object.assign({}, nativ(V.feldAusBasisBauen(V.feldAusKatalog(idx), [], 0).feld), { pflicht: false });
  assert.deepEqual(ausBeispiel, ausListe);
});

/* ── (2) B1 sichtbar ─────────────────────────────────────────────────────── */
test('[Assistent · B1] „Anliegen“ mit drei Antworttexten kommt mit allen drei im Paket an, jede mit Code', () => {
  const { V, felder } = beispiel('behoerde');
  const { paket } = paketFuer(V, felder);
  const anliegen = paket.templates[0].felder.find((f) => f.feldname === 'Anliegen');
  assert.ok(anliegen, 'kein Feld „Anliegen“ im Paket');
  assert.deepEqual(anliegen.codeWerte.map((c) => c.anzeige), ['Ausweis', 'Wohnsitz melden', 'Parkausweis']);
  for (const c of anliegen.codeWerte) assert.ok(c.code && c.code.trim(), 'Option ohne Code: ' + c.anzeige);
});
test('[Assistent · B1 · Rot-Beweis] der alte Filter auf den Code hätte alle drei Antworten verworfen', () => {
  const { V, felder } = beispiel('behoerde');
  const roh = nativ(V.ASSISTENT_BEISPIELE.behoerde.fragen).find((f) => Array.isArray(f.antworten)).antworten.map((a) => ({ code: '', anzeige: a[0] }));
  assert.equal(roh.length, 3);
  assert.equal(roh.filter((c) => c.code).length, 0, 'so sah es vor dem Befund aus: keine Antwort überlebte');
  assert.equal(felder.find((f) => f.feldtyp === 'auswahl').codeWerte.length, 3);
});

/* ── (3) Fachbegriffe ────────────────────────────────────────────────────── */
/* Der Start der einen Arbeitsfläche: Name und Angaben der Stelle, die einfachen Beispiele (ohne die Kacheln darunter, die
   schon vor dem 14.11.2026 zur Fachebene gehörten und ihre eigenen Proben haben). */
function startBlock(html) {
  const a = html.indexOf('<main id="raum-start"');
  assert.ok(a > 0, 'kein Start');
  const e = html.indexOf('<div class="kacheln">', a);
  assert.ok(e > a, 'keine Kacheln nach dem Start');
  return html.slice(a, e);
}
const FACHBEGRIFFE = /\b(LOINC|ICD(-10)?|SNOMED|ATC|FHIR|JSON|VC-Issuer|code system|key pair|URI|identifier)\b/i;
const FACHBEGRIFFE_DE = /\b(Kürzel|Code-System|Code|Kennung|Modul-Version|Schlüsselpaar|Submission|Template|Register)\b/;
/* Die sichtbaren Texte, die der Start zur Laufzeit setzt: das deutsche Argument jedes L('de', 'en') in seinem Code. */
function laufzeitTexteDe(html) {
  const q = html.slice(html.indexOf('const ASSISTENT = {'), html.indexOf('function assistentBinden'));
  return [...q.matchAll(/\bL\('((?:[^'\\]|\\.)*)', '/g)].map((m) => m[1]).join(' ');
}
function fachbegriffe(html) {
  const b = startBlock(html);
  const de = b.replace(/<[^>]+>/g, ' '), en = [...b.matchAll(/data-en(?:-aria|-ph)?="([^"]*)"/g)].map((m) => m[1]).join(' ');
  const js = HTML.slice(HTML.indexOf('const ASSISTENT_BEISPIELE'), HTML.indexOf('function assistentFrageName'));
  return [(de + ' ' + en + ' ' + js.replace(/[{}[\]:,']/g, ' ').replace(/\b(reg|frage|antworten|pflicht|titel|fragen|true|const|Object|freeze)\b/g, ' ')).match(FACHBEGRIFFE), de.match(FACHBEGRIFFE_DE)]
    .concat([laufzeitTexteDe(html).match(FACHBEGRIFFE_DE)])
    .filter(Boolean).map((m) => m[0]);
}
test('[Assistent · Fachbegriffe] keine Fachbegriffe am Start und in den Beispielen, deutsch und englisch', () => {
  assert.deepEqual(fachbegriffe(HTML), []);
});
test('[Assistent · Fachbegriffe · Rot-Beweis] „Register“ in einem Laufzeittext des Starts wird gefunden', () => {
  const kopie = HTML.replace("L('Land eintragen: ', 'Enter country: ')", "L('Land aus dem Register eintragen: ', 'Enter country from the register: ')");
  assert.notEqual(kopie, HTML);
  assert.deepEqual(fachbegriffe(kopie), ['Register']);
});
test('[Assistent · Fachbegriffe · Rot-Beweis] „Code-System“ am Start wird gefunden', () => {
  const kopie = HTML.replace('>Neu beginnen<', '>Welches Code-System möchten Sie nutzen?<');
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
/* Die Vorschau der Anfrage zeigt nur, was die App heute zeigt (Quellenprüfung 08.10.2026), und keine Prüfung, die noch nicht
   stattgefunden hat (Wagen S-D, 10.11.2026): sie heißt „Vorschau der Anfrage“; „Geprüft“ (Textsatz anfrageGeprueftBadge) gehört in der
   App zur geprüften Anfrage. Kein „Erstellt mit Vivodepot“, solange die App es nicht trägt. */
function vorschauBlock(html) {
  const a = html.indexOf('<div id="anfrage-vorschau"');
  assert.ok(a > 0, 'keine Vorschau der Anfrage');
  return html.slice(a, html.indexOf('<div id="eig-leer"', a));
}
function kartenBefunde(html) {
  const b = vorschauBlock(html), f = [];
  const m = b.match(/<h2 data-en="([^"]*)">([^<]*)<\/h2>/);
  if (!m) f.push('keine Überschrift');
  else { if (m[2] !== 'Vorschau der Anfrage') f.push('Überschrift DE „' + m[2] + '“ ≠ „Vorschau der Anfrage“'); if (m[1] !== 'Preview of the request') f.push('Überschrift EN „' + m[1] + '“ ≠ „Preview of the request“'); }
  if (/Geprüft|Verified/.test(b)) f.push('„Geprüft“ steht in der Vorschau, vor dem Einreichen hat keine Prüfung stattgefunden');
  if (/Erstellt mit Vivodepot|Made with Vivodepot/.test(b)) f.push('„Erstellt mit Vivodepot“ steht in der Vorschau, die App trägt es nicht');
  return f;
}
const VORSCHAU_KOPF = '<h2 data-en="Preview of the request">Vorschau der Anfrage</h2>';
test('[Assistent · Karte] „Vorschau“ statt „Geprüft“, kein „Erstellt mit Vivodepot“, „von <Stelle>“ und der Herkunftssatz wörtlich', () => {
  assert.deepEqual(kartenBefunde(HTML), []);
  assert.match(vorschauBlock(HTML), /<small data-en="from">von<\/small><b id="av-stelle"/);
  assert.ok(HTML.includes('data-en="Vivodepot confirms who the template comes from, not whether its content is correct.">Vivodepot bestätigt, von wem die Vorlage kommt, nicht ob ihr Inhalt richtig ist.'));
});
test('[Assistent · Karte · Rot-Beweis] ein „Geprüft“-Siegel, ein erfundenes Siegel und eine erfundene Fußzeile werden gefunden', () => {
  const alt = HTML.replace(VORSCHAU_KOPF, '<h2 data-en="Verified">Geprüft</h2>');
  assert.notEqual(alt, HTML);
  assert.equal(kartenBefunde(alt).length, 3);
  const kopie = HTML.replace(VORSCHAU_KOPF, '<h2 data-en="Origin checked">Herkunft geprüft</h2><div class="as-fuss">Erstellt mit Vivodepot</div>');
  assert.notEqual(kopie, HTML);
  assert.equal(kartenBefunde(kopie).length, 3);
});

/* ── (6) Übergabe in die Einreichung ─────────────────────────────────────── */
test('[Assistent · Übergabe] ein Beispiel legt die Felder an; „Fertigstellen“ belegt den Namen vor; Rechtsform nur, wo das Modul sie der Art zuordnet', () => {
  assert.match(rumpf(HTML, 'startBeispielLaden'), /STATE\.felder = beispielFelder\(art\);/);
  const q = rumpf(HTML, 'startAngabenUebernehmen');
  assert.match(q, /if \(\$\('sd-name'\) && !\$\('sd-name'\)\.value\.trim\(\)\) \$\('sd-name'\)\.value = ASSISTENT\.name\.trim\(\);/);
  // Seit U2-ADR-495 aus dem Rechtsraum-Modul: die Rechtsform, die das Modul der Art zuordnet („Behörde“ im DE-Modul), nur bei gewähltem Rechtsraum.
  assert.match(q, /rechtsformFuerArt\(\$\('sd-rechtsraum'\) && \$\('sd-rechtsraum'\)\.value, ASSISTENT\.art\)/);
  const { V } = ladeGenerator();
  assert.equal(V.rechtsformFuerArt('DE', 'behoerde'), 'Behörde');
  assert.equal(V.rechtsformFuerArt('DE', 'praxis'), '', 'keine Rechtsform, wo das Modul keine zuordnet');
  assert.equal(V.rechtsformFuerArt('', 'behoerde'), '', 'ohne Rechtsraum keine Vorbelegung');
  assert.match(rumpf(HTML, 'fertigOeffnen'), /startAngabenUebernehmen\(\);[^\n]*zeigeSchritt\(naechsterFertigSchritt\(\)\);/);
  assert.ok(HTML.includes("if (id === 'willkommen') { dlgZu('dlg-fertig'); raumZeigen('start');"), 'der Anfang ist der Start (seit S-1 ohne Kachel „Aufnahmebogen“ davor)');
});

/* ── (7) Bausteinliste ohne Doppel (iPad-Prüfung 14.10.2026) ───────────────
   Ein Standardfeld, das schon in der Vorlage steht, legt ein zweites Antippen nicht noch einmal an: sonst stünde etwa
   „Geburtsdatum“ zweimal in der Vorlage und in der Einreichung. Geprüft über ALLE Standardfelder der Beispiele (die Klasse),
   nicht nur über das eine, an dem es auffiel. Eigene Felder tragen keinen Katalog-Eintrag und bleiben außen vor. */
const katIdx = (V, reg) => V.FELDKATALOG.findIndex((k) => k.kennung === V.ASSISTENT_REGISTER[reg]);
function mitVerein(opts) {
  const g = ladeGenerator(opts);
  g.V.spracheFuerProbeSetzen('de');
  g.V.STATE.felder = g.V.beispielFelder('verein');
  return g;
}
const zahl = (V, reg) => V.STATE.felder.filter((f) => V.feldKatalogIndex(f) === katIdx(V, reg)).length;
function allesZweimal(V) {
  for (const reg of Object.keys(V.ASSISTENT_REGISTER)) { V.feldEinfuegen(V.feldAusKatalog(katIdx(V, reg)), null); V.feldEinfuegen(V.feldAusKatalog(katIdx(V, reg)), null); }
}
test('[Assistent · Doppel] „Geburtsdatum“ zu einem Beispiel, das es schon trägt, steht danach genau einmal da', () => {
  const { V } = mitVerein();
  assert.equal(zahl(V, 'geburtsdatum'), 1, 'Vorbedingung: das Beispiel trägt Geburtsdatum');
  const vorher = V.STATE.felder.length;
  V.feldEinfuegen(V.feldAusKatalog(katIdx(V, 'geburtsdatum')), null);
  assert.equal(zahl(V, 'geburtsdatum'), 1);
  assert.equal(V.STATE.felder.length, vorher);
});
test('[Assistent · Doppel] jedes Standardfeld zweimal angetippt: kein Feld doppelt, jedes einmal da', () => {
  const { V } = mitVerein();
  allesZweimal(V);
  const regs = Object.keys(V.ASSISTENT_REGISTER);
  assert.ok(regs.length >= 5, 'Positivkontrolle: es gibt Standardfelder; sonst hätte die Schleife nichts geprüft');
  for (const r of regs) assert.equal(zahl(V, r), 1, r);
});
test('[Assistent · Doppel · Rot-Beweis] mit der früheren Fassung (ohne Prüfung) steht „Geburtsdatum“ zweimal da, und die Klassenprobe findet es', () => {
  const NEU = '  const da = vorhandenesRegisterfeld(basis);\n  if (da >= 0) {';
  assert.ok(HTML.includes(NEU), 'die Prüfung steht nicht mehr an ihrer Stelle; die Probe muss mitgezogen werden');
  const { V } = mitVerein({ html: HTML.replace(NEU, '  const da = -1;\n  if (da >= 0) {') });
  V.feldEinfuegen(V.feldAusKatalog(katIdx(V, 'geburtsdatum')), null);
  assert.equal(zahl(V, 'geburtsdatum'), 2);
  allesZweimal(V);
  assert.ok(zahl(V, 'vorname') > 1);
});
