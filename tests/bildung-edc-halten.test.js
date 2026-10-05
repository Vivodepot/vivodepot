'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bildungsnachweise HALTEN — ein fremd ausgestelltes European Digital Credential
   (EDC) wird als Original verwahrt und unverändert vorgezeigt (P3 Holder, 27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Vivodepot stellt keine Bildungsnachweise aus (U2-ADR-097 §6). Es HÄLT fremd
   ausgestellte (U2-ADR-216 §4, gezogen für EDC durch die ADR „Bildungsnachweise
   halten"). Vorher (A109) wurde ein eingelesenes EDC zu EINEM Freitext in
   education.qualifications geflacht — Original, Siegel und Aussteller gingen
   verloren; vorzeigen ließ sich nur ein Satz, kein Nachweis.

   Jetzt dasselbe Muster wie die Gesundheits-Originale (U2-ADR-045/086/233):
   Rohbytes verbatim in der Mappe, read-only, byte-gleich wieder heraus. Der
   Freitext bleibt als freiwillige „Werte übernehmen"-Aktion (U2-ADR-049).

   Die drei Eingaben sind die amtlichen EU-Beispiele (tests/fixtures/edci-europass-*,
   Quelle edci-europass-QUELLE.md): Teilnahmezertifikat signiert/unsigniert,
   Micro-Credential signiert. Signiert = JWS-General-JSON (RFC 7797, unencoded
   payload) mit JAdES-Siegel des Ausstellers — das Siegel prüft, wem vorgezeigt
   wird; die Siegelprüfung in der Suite ist Paket P6 (DSS), nicht diese Datei.
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
const DATEIEN = {
  certSigniert: 'edci-europass-certofpart-signed.jsonld',
  certUnsigniert: 'edci-europass-certofpart-unsigned.jsonld',
  mcSigniert: 'edci-europass-mc-signed.jsonld',
};
const bytesVon = (n) => fs.readFileSync(path.join(FX, DATEIEN[n]));
const textVon = (n) => bytesVon(n).toString('utf8');

async function mitDepot(k) {
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
const ablegen = (V, name) => V.importAutoritativDokument(textVon(name), new Uint8Array(bytesVon(name)));

test('[Bildung halten] der Import-Kanal für ein EDC ist ein Ablage-Kanal (autoritativDoc), kein Feld-Import', () => {
  const { V } = ladeKern();
  assert.equal(V.IMPORT_FORMAT_BY_ID['edci-europass-extern'].autoritativDoc, true);
});

test('[Bildung halten] alle drei EU-Beispiele werden verbatim als Original im Bereich Bildung abgelegt — mit Aussteller und Titel aus der Datei', async () => {
  const erwartet = {
    certSigniert: { titel: 'Certificate of Participation', aussteller: 'ORGANIZACION TEST', mime: 'application/jose+json' },
    certUnsigniert: { titel: 'Certificate of Participation', aussteller: 'European Digital Credentials for Learning Support Team', mime: 'application/ld+json' },
    mcSigniert: { titel: 'Micro-Credential', aussteller: 'ORGANIZACION TEST', mime: 'application/jose+json' },
  };
  for (const [name, soll] of Object.entries(erwartet)) {
    const { V } = await mitDepot(ladeKern());
    const id = ablegen(V, name);
    assert.ok(id, name + ': nicht abgelegt');
    const e = V.mappeEintrag(id);
    assert.equal(e.autoritativ, true, name);
    assert.equal(e.bereich, 'education', name);
    assert.equal(e.beschriftung, soll.titel, name);
    assert.equal(e.aussteller, soll.aussteller, name);
    assert.equal(e.mime, soll.mime, name);
    assert.equal(e.gepruefteIG, V.EDC_AP_KONTEXT, name);
    assert.ok(e.dateiname.endsWith('.jsonld'), name + ': ' + e.dateiname);
  }
});

test('[Bildung halten] beim Ablegen wird NICHTS geflacht — kein stiller Freitext in den Bildungsfeldern', async () => {
  const { V } = await mitDepot(ladeKern());
  ablegen(V, 'certUnsigniert');
  const sd = V.getData().sektoren.education || {};
  assert.equal(sd.qualifications, undefined);
});

test('[Bildung halten] „Werte übernehmen" bleibt freiwillig möglich: der Plan liest das Original und schlägt den Titel vor', async () => {
  const { V } = await mitDepot(ladeKern());
  const id = ablegen(V, 'mcSigniert');
  const plan = V.medDokFelderPlan(id);
  assert.ok(plan && !plan.ungueltig, 'kein Plan aus dem EDC-Original');
  assert.match(JSON.stringify(plan), /Digital micro-credential creation \(University of Zed\)/);
});

test('[Bildung vorzeigen] Rundweg: Einlesen → Mappe → Herunterladen gibt JEDES Beispiel byte-gleich heraus, als .jsonld mit seinem MIME-Typ', async () => {
  for (const name of Object.keys(DATEIEN)) {
    const k = await mitDepot(ladeMitAusgabe());
    const id = ablegen(k.V, name);
    await k.V.flowMappeOriginalHerunterladen(id);
    assert.equal(await warteAufDateien(k, 1, 3000), 1, name + ': keine Datei herausgegeben');
    assert.ok(Buffer.compare(await k.bytes(0), bytesVon(name)) === 0, name + ': Bytes am Ausgang ≠ Bytes am Eingang');
    assert.equal(k.gefangen[0].blob.type, k.V.mappeEintrag(id).mime, name);
    assert.ok(k.gefangen[0].name.endsWith('.jsonld'), name + ': ' + k.gefangen[0].name);
  }
});

test('[Bildung vorzeigen] Rundweg übersteht Speichern und Wiederöffnen des Depots byte-gleich', async () => {
  const k = await mitDepot(ladeMitAusgabe());
  const id = ablegen(k.V, 'certSigniert');
  const umschlag = await k.V.depotSerialisieren();
  await k.V.depotLaden(umschlag, PW);
  await k.V.flowMappeOriginalHerunterladen(id);
  assert.equal(await warteAufDateien(k, 1, 3000), 1);
  assert.ok(Buffer.compare(await k.bytes(0), bytesVon('certSigniert')) === 0, 'nach dem Wiederöffnen verändert');
});

/* Gemessen beim Bau (27.09.2026): alle drei EU-Beispiele sind bereits kompaktes JSON —
   JSON.stringify(JSON.parse(x)) ergibt sie byte-gleich. Eine Normalisierung im Kern wäre an
   ihnen also UNSICHTBAR. Die scharfe Probe ist darum der Fehler, der wirklich schon einmal
   passiert ist (U2-ADR-233): ein führendes BOM, das der Text-Weg beim Herausgeben verliert. */
test('[Bildung vorzeigen · Rot-Beweis] ein Original mit führendem BOM kommt MIT BOM wieder heraus (die Klasse aus U2-ADR-233)', async () => {
  const k = await mitDepot(ladeMitAusgabe());
  const mitBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytesVon('certUnsigniert')]);
  const id = k.V.importAutoritativDokument(textVon('certUnsigniert'), new Uint8Array(mitBom));
  assert.ok(id, 'nicht abgelegt');
  await k.V.flowMappeOriginalHerunterladen(id);
  assert.equal(await warteAufDateien(k, 1, 3000), 1);
  const raus = await k.bytes(0);
  assert.equal(raus.length, mitBom.length, 'BOM beim Herausgeben verloren');
  assert.ok(Buffer.compare(raus, mitBom) === 0);
});

test('[Bildung vorzeigen · Rot-Beweis] die Byte-Probe sieht eine Umformatierung (Einrückung) derselben Nutzlast', () => {
  for (const name of Object.keys(DATEIEN)) {
    const neu = Buffer.from(JSON.stringify(JSON.parse(textVon(name)), null, 2), 'utf8');
    assert.notEqual(Buffer.compare(neu, bytesVon(name)), 0, name);
  }
});

test('[Bildung halten] ein EDC ist kein FHIR-Dokument: der SHL-Weg (U2-ADR-047) lehnt es ab', async () => {
  const { V } = await mitDepot(ladeKern());
  const id = ablegen(V, 'certSigniert');
  assert.ok(id && V.mappeEintrag(id).autoritativ, 'Voraussetzung: das EDC liegt als Original vor — sonst misst die Ablehnung nichts');
  await assert.rejects(() => V.shlProviderPayload(id, {}), /SHL:bildungsnachweis/);
});

/* Gefunden an der A==B-Abnahme (U2-ADR-321/372, E2E, 28.09.2026): eine erste Fassung schloss SHL für alles
   aus, was nicht `application/fhir+json` trägt — ältere autoritative Einträge tragen aber keinen MIME-Typ,
   und ihr Weg brach. Ausgeschlossen ist nur der Bildungsnachweis. */
test('[Bildung halten · Grenze] ein älteres Original ohne MIME-Typ bleibt über SHL teilbar — nur der Bildungsnachweis ist ausgenommen', async () => {
  const { V } = await mitDepot(ladeKern());
  const d = V.getData();
  d.mappe.push({ id: 'alt-ohne-mime', beschriftung: 'Laborbefund', autoritativ: true, inhalt: 'data:text/plain;base64,' + Buffer.from('Laborbefund, alt').toString('base64') });
  V.setData(d);
  const teile = await V.shlProviderPayload('alt-ohne-mime', {});
  assert.ok(teile && teile.jwe, 'ein älteres Original ohne MIME-Typ ist nicht mehr teilbar');
});

test('[Bildung halten · Ansicht] das Original zeigt den ehrlichen Hinweis, Herunterladen und „Werte übernehmen" — keinen SHL-Knopf', async () => {
  const k = await mitDepot(ladeKern());
  const id = ablegen(k.V, 'mcSigniert');
  k.V.flowMappeVorschau(id);
  const m = k.document.getElementById('modal-inhalt').innerHTML;
  assert.ok(m.includes('Das Siegel prüft, wem Sie es vorzeigen.'), 'ehrlicher Hinweis fehlt');
  assert.ok(m.includes('data-mappe-herunterladen'), 'Herunterladen fehlt');
  assert.ok(m.includes('data-mappe-uebernehmen') && m.includes('Bildungsfelder'), '„Werte übernehmen" mit Bildungs-Hinweis fehlt');
  assert.ok(!m.includes('data-mappe-shl'), 'SHL-Knopf an einem Bildungsnachweis');
  assert.ok(!m.includes('Gesundheitsfelder'), 'Gesundheits-Wortlaut an einem Bildungsnachweis');
});

/* ── U2-ADR-097 §6: kein Ausstellungspfad für Bildungsnachweise ──
   Jeder Weg der Export-Registry, auf einem Depot, das ein EDC-Original HÄLT: keine
   herausgegebene Datei darf ein EuropeanDigitalCredential sein oder enthalten. Das
   gehaltene Original liegt base64 in der Mappe und trägt den Typnamen darum nie im
   Klartext eines Exports; taucht er auf, hat ein Weg ein Bildungs-Credential gebaut. */
function stelltEdcAus(inhalt) { return /EuropeanDigitalCredential/.test(lesbar(String(inhalt))); }

test('[U2-ADR-097 §6] kein Export-Weg stellt einen Bildungsnachweis aus — auch nicht mit einem gehaltenen EDC im Depot', async () => {
  const { V } = await mitDepot(ladeKern());
  ablegen(V, 'mcSigniert');
  const funde = [];
  for (const def of V.EXPORT_FORMATE) {
    let inhalt;
    try { inhalt = await V.formatExportInhalt(def, { sensibel: true }); } catch (e) { continue; }
    if (stelltEdcAus(inhalt)) funde.push(def.id);
  }
  assert.deepEqual(funde, []);
});

test('[U2-ADR-097 §6 · Rot-Beweis] der Wächter erkennt ein ausgestelltes EDC in einer Ausgabe', () => {
  assert.equal(stelltEdcAus(textVon('certUnsigniert')), true);
  assert.equal(stelltEdcAus(JSON.stringify({ type: ['VerifiableCredential', 'EuropeanDigitalCredential'] })), true);
  assert.equal(stelltEdcAus('{"schemaVersion":"edci-1.0-vivodepot"}'), false);
});
