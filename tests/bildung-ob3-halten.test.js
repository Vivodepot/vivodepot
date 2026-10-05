'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Open Badges 3.0 HALTEN — ein fremd ausgestellter Badge wird als Original
   verwahrt und unverändert vorgezeigt (U2-ADR-445, 28.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Dasselbe Muster wie das EDC (U2-ADR-443): Rohbytes verbatim in der Mappe, read-only,
   byte-gleich wieder heraus (U2-ADR-045/086/233). Vivodepot stellt keinen Badge aus
   (U2-ADR-097 §6).

   Ein OB-3.0-Credential kommt in vier Formen (Spezifikation §5 und §8): JSON-LD mit
   eingebettetem Beweis, VC-JWT (kompakte JWS), „gebacken“ in ein PNG (iTXt-Chunk
   `openbadgecredential`) oder in ein SVG (`<openbadges:credential>`). Bei PNG und SVG ist das
   BILD das Original, nicht das herausgeschälte Credential.

   Die Eingaben sind die Testdateien des offiziellen 1EdTech-Prüfers (tests/fixtures/ob3-*,
   Apache-2.0, Quelle ob3-QUELLE.md). Ob ihre Beweise gegen einen Schlüssel prüfen, ist hier
   nicht Gegenstand. Das prüft, wem der Badge vorgezeigt wird; gegen die Spezifikation prüft
   der Adapter der Konformitäts-Suite.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lesbar } = require('./helfer/sdjwt-entpacken.js');   // kompakte SD-JWT-Ausgaben vor jeder Textsuche entpacken (U2-ADR-457)
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');

const PW = 'pw';
const FX = path.join(__dirname, 'fixtures');
// titel = `name` des Credentials, aussteller = `issuer.name` — beide gemessen an den Dateien (ob3-QUELLE.md).
const BADGES = {
  json: { datei: 'ob3-simple.json', titel: 'Teamwork Badge', aussteller: 'Example Corp', mime: 'application/ld+json', endung: '.json' },
  jwt: { datei: 'ob3-simple.jwt', titel: 'Example University Degree', aussteller: 'Example University', mime: 'application/jwt', endung: '.jwt' },
  pngJson: { datei: 'ob3-simple-json.png', titel: 'Teamwork Badge', aussteller: 'Example Corp', mime: 'image/png', endung: '.png' },
  pngJwt: { datei: 'ob3-simple-jwt.png', titel: 'Teamwork Badge', aussteller: 'Example Corp', mime: 'image/png', endung: '.png' },
  svgJson: { datei: 'ob3-simple-json.svg', titel: 'Teamwork Badge', aussteller: 'Example Corp', mime: 'image/svg+xml', endung: '.svg' },
  svgJwt: { datei: 'ob3-simple-jwt.svg', titel: 'Teamwork Badge', aussteller: 'Example Corp', mime: 'image/svg+xml', endung: '.svg' },
  komplett: { datei: 'ob3-complete.json', titel: '1EdTech University Degree for Example Student', aussteller: '1EdTech University', mime: 'application/ld+json', endung: '.json' },
};
const bytesVon = (datei) => fs.readFileSync(path.join(FX, datei));
// Wie flowImportAuto: EINMAL die Rohbytes, der Text daraus mit dem Standard-Decoder.
const textVon = (datei) => new TextDecoder().decode(bytesVon(datei));

async function mitDepot(k) {
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
const ablegen = (V, datei) => V.importAutoritativDokument(textVon(datei), new Uint8Array(bytesVon(datei)));

test('[OB3 halten] jede der vier Formen wird erkannt, als eigener Ablage-Kanal (autoritativDoc) im Bereich Bildung', () => {
  const { V } = ladeKern();
  const def = V.IMPORT_FORMAT_BY_ID['openbadges-3-extern'];
  assert.ok(def, 'Import-Kanal openbadges-3-extern fehlt');
  assert.equal(def.autoritativDoc, true);
  assert.equal(def.sektor, 'education');
  for (const [name, b] of Object.entries(BADGES)) {
    assert.equal(V.importFormatErkennen(textVon(b.datei), 'education'), 'openbadges-3-extern', name);
  }
});

test('[OB3 halten] alle sieben Beispiele werden verbatim als Original abgelegt — mit Titel und Aussteller aus dem Credential', async () => {
  for (const [name, b] of Object.entries(BADGES)) {
    const { V } = await mitDepot(ladeKern());
    const id = ablegen(V, b.datei);
    assert.ok(id, name + ': nicht abgelegt');
    const e = V.mappeEintrag(id);
    assert.equal(e.autoritativ, true, name);
    assert.equal(e.bereich, 'education', name);
    assert.equal(e.beschriftung, b.titel, name);
    assert.equal(e.aussteller, b.aussteller, name);
    assert.equal(e.mime, b.mime, name);
    assert.equal(e.gepruefteIG, V.OB3_KENNUNG, name);
    assert.ok(e.dateiname.endsWith(b.endung), name + ': ' + e.dateiname);
  }
});

test('[OB3 halten] ein Credential, das kein Badge ist, wird nicht als Badge abgelegt', async () => {
  const { V } = await mitDepot(ladeKern());
  assert.notEqual(V.importFormatErkennen(textVon('ob3-simple-err-type.json'), 'education'), 'openbadges-3-extern');
  assert.equal(ablegen(V, 'ob3-simple-err-type.json'), null);
  assert.equal(V.getData().mappe.length, 0);
});

test('[OB3 halten] beim Ablegen wird NICHTS geflacht — kein stiller Freitext in den Bildungsfeldern', async () => {
  const { V } = await mitDepot(ladeKern());
  ablegen(V, BADGES.json.datei);
  const sd = V.getData().sektoren.education || {};
  assert.equal(sd.qualifications, undefined);
});

test('[OB3 halten] „Werte übernehmen" bleibt freiwillig möglich: der Plan schlägt Titel und Aussteller vor — auch aus einem gebackenen PNG', async () => {
  for (const name of ['json', 'jwt', 'pngJwt']) {
    const { V } = await mitDepot(ladeKern());
    const id = ablegen(V, BADGES[name].datei);
    const plan = V.medDokFelderPlan(id);
    assert.ok(plan && !plan.ungueltig, name + ': kein Plan aus dem Badge-Original');
    assert.ok(JSON.stringify(plan).includes(BADGES[name].titel + ' (' + BADGES[name].aussteller + ')'), name);
  }
});

test('[OB3 vorzeigen] Rundweg: Einlesen → Mappe → Herunterladen gibt JEDES Beispiel byte-gleich heraus, mit Endung und MIME-Typ des Originals', async () => {
  for (const [name, b] of Object.entries(BADGES)) {
    const k = await mitDepot(ladeMitAusgabe());
    const id = ablegen(k.V, b.datei);
    await k.V.flowMappeOriginalHerunterladen(id);
    assert.equal(await warteAufDateien(k, 1, 3000), 1, name + ': keine Datei herausgegeben');
    assert.ok(Buffer.compare(await k.bytes(0), bytesVon(b.datei)) === 0, name + ': Bytes am Ausgang ≠ Bytes am Eingang');
    assert.equal(k.gefangen[0].blob.type, b.mime, name);
    assert.ok(k.gefangen[0].name.endsWith(b.endung), name + ': ' + k.gefangen[0].name);
  }
});

test('[OB3 vorzeigen] Rundweg übersteht Speichern und Wiederöffnen des Depots byte-gleich, auch für das gebackene PNG', async () => {
  const k = await mitDepot(ladeMitAusgabe());
  const id = ablegen(k.V, BADGES.pngJwt.datei);
  const umschlag = await k.V.depotSerialisieren();
  await k.V.depotLaden(umschlag, PW);
  await k.V.flowMappeOriginalHerunterladen(id);
  assert.equal(await warteAufDateien(k, 1, 3000), 1);
  assert.ok(Buffer.compare(await k.bytes(0), bytesVon(BADGES.pngJwt.datei)) === 0, 'nach dem Wiederöffnen verändert');
});

/* Die Fehlerklasse aus U2-ADR-233, bei Binärdateien am schärfsten: wer ein PNG über den Text-Weg
   ablegt, bekommt aus TextDecoder Ersatzzeichen (U+FFFD) statt der Bytes — die Datei ist danach kaputt. */
test('[OB3 vorzeigen · Rot-Beweis] ein PNG ohne Rohbytes wird NICHT über den Text abgelegt — das Bild wäre zerstört', async () => {
  const { V } = await mitDepot(ladeKern());
  const text = textVon(BADGES.pngJson.datei);
  assert.notEqual(Buffer.compare(Buffer.from(text, 'utf8'), bytesVon(BADGES.pngJson.datei)), 0,
    'Voraussetzung: der Text-Weg verändert die PNG-Bytes — sonst misst diese Probe nichts');
  assert.equal(V.importAutoritativDokument(text, null), null);
});

test('[OB3 halten] ein Badge ist kein FHIR-Dokument: der SHL-Weg (U2-ADR-047) lehnt ihn ab', async () => {
  const { V } = await mitDepot(ladeKern());
  const id = ablegen(V, BADGES.json.datei);
  assert.ok(id && V.mappeEintrag(id).autoritativ, 'Voraussetzung: der Badge liegt als Original vor');
  await assert.rejects(() => V.shlProviderPayload(id, {}), /SHL:bildungsnachweis/);
});

test('[OB3 halten · Ansicht] das Original zeigt den ehrlichen Hinweis, Herunterladen und „Werte übernehmen" — keinen SHL-Knopf; ein Bild-Badge zeigt das Bild', async () => {
  for (const name of ['json', 'pngJson']) {
    const k = await mitDepot(ladeKern());
    const id = ablegen(k.V, BADGES[name].datei);
    k.V.flowMappeVorschau(id);
    const m = k.document.getElementById('modal-inhalt').innerHTML;
    assert.ok(m.includes(k.V.STRINGS.mappeOb3Hinweis), name + ': ehrlicher Hinweis fehlt');
    assert.ok(!m.includes('Siegel'), name + ': ein Badge trägt kein Siegel');
    assert.ok(m.includes('data-mappe-herunterladen'), name + ': Herunterladen fehlt');
    assert.ok(m.includes('data-mappe-uebernehmen'), name + ': „Werte übernehmen" fehlt');
    assert.ok(!m.includes('data-mappe-shl'), name + ': SHL-Knopf an einem Badge');
    assert.equal(m.includes('mappe-vorschau-bild'), name === 'pngJson', name + ': Bildvorschau');
  }
});

/* ── U2-ADR-097 §6: kein Ausstellungspfad, auch nicht für Badges ── */
function stelltBadgeAus(inhalt) { return /OpenBadgeCredential|AchievementCredential/.test(lesbar(String(inhalt))); }

test('[U2-ADR-097 §6 · OB3] kein Export-Weg stellt einen Badge aus — auch nicht mit einem gehaltenen Badge im Depot', async () => {
  const { V } = await mitDepot(ladeKern());
  ablegen(V, BADGES.komplett.datei);
  const funde = [];
  for (const def of V.EXPORT_FORMATE) {
    let inhalt;
    try { inhalt = await V.formatExportInhalt(def, { sensibel: true }); } catch (e) { continue; }
    if (stelltBadgeAus(inhalt)) funde.push(def.id);
  }
  assert.deepEqual(funde, []);
});

test('[U2-ADR-097 §6 · OB3 · Rot-Beweis] der Wächter erkennt einen ausgestellten Badge in einer Ausgabe', () => {
  assert.equal(stelltBadgeAus(textVon(BADGES.json.datei)), true);
  assert.equal(stelltBadgeAus(JSON.stringify({ type: ['VerifiableCredential', 'AchievementCredential'] })), true);
  assert.equal(stelltBadgeAus('{"schemaVersion":"edci-1.0-vivodepot"}'), false);
});
