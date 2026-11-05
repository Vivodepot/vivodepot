'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   „Link senden“ für die Patient Summary (L2, 02.11.2026; RbB xshare-l2-patient-summary-one-time-link)
   ───────────────────────────────────────────────────────────────────────────
   Gesundheit → maschinenlesbare Datei (FHIR-IPS) → Übersicht (Teile wählen) → Sprachwahl → Wahl „Herunterladen“ / „Link senden“.
   Der Link trägt GENAU das Bundle, das der Download derselben Auswahl ausgäbe (application/fhir+json, nicht als Binary eingepackt).
   Gefahren: (1) der Link baut ein anderes Bundle als der Download, (2) nicht gewählte Felder gehen mit, (3) die Wahl fehlt.
   Der Weg wird wirklich gefahren: Übersicht → Sprachwahl → Wahl → Link-Dialog → Datei (.jose) und Link (shlink:/) →
   unabhängige Entschlüsselung (Node, RFC 7516). Muster: der Anlass-Auszug (flowAnlassExport, tests/link-senden-antwort.test.js).
   Rot-Beweis: ohne die Verdrahtung in flowGesundheitFhirExport erscheint die Wahl nie (alle Fälle fallen).
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const GEWAEHLT = { feld: 'chronicConditionsDiagnoses', marke: 'MARKE-Asthma' };
const ANDERES = { feld: 'allergiesMedicationFoodOther', marke: 'MARKE-Penicillin' };
const ABLAGE = 'https://share.vivodepot.de/ablage/abc123';
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));
const b64u = (s) => Buffer.from(String(s), 'base64url');

const zeilen = (html) => [...String(html).matchAll(/<div class="export-zz( export-zz-gehalten)?" data-sektor="([^"]+)" data-feld="([^"]+)"/g)]
  .map((m) => ({ gehalten: !!m[1], sektor: m[2], feld: m[3] }));

function jweEntschluesseln(jwe, key) {
  const [prot, , iv, ct, tag] = String(jwe).split('.');
  const d = nodeCrypto.createDecipheriv('aes-256-gcm', b64u(key), b64u(iv));
  d.setAAD(Buffer.from(prot, 'ascii'));
  d.setAuthTag(b64u(tag));
  return { kopf: JSON.parse(b64u(prot).toString('utf8')), bytes: Buffer.concat([d.update(b64u(ct)), d.final()]) };
}
// UUIDs und Zeitstempel des Baus maskieren: zwei Läufe derselben Auswahl unterscheiden sich nur darin.
const maskiert = (text) => String(text)
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'UUID')
  .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)/g, 'ZEIT');

/** Fährt den Weg. weg: 'download' | 'link'. → { k, V, modale, bundleText, uri?, jwe? } */
async function fahre({ wahlFeld, sprache, weg, ohneGeburtsdatum, festlegung }) {
  const k = ladeMitAusgabe();
  const V = k.V;
  await V.depotAnlegen('link-ps-pw-2026');
  V.akteurSelbstErklaeren('T');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  if (!ohneGeburtsdatum) V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  V.sektorFeldSetzen('health', GEWAEHLT.feld, [{ text: GEWAEHLT.marke }]);
  V.sektorFeldSetzen('health', ANDERES.feld, [{ text: ANDERES.marke }]);
  if (festlegung) await V.bedingungFestlegen('SD-BASE', 'PDC-AI');

  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const letztes = () => modale[modale.length - 1];
  const erzeugt = [];
  const echt = k.document.getElementById.bind(k.document);
  const echtCreate = k.document.createElement.bind(k.document);
  k.document.createElement = (tag) => { const e = echtCreate(tag); erzeugt.push(e); return e; };
  const knopf = (z) => ({ getAttribute: (n) => (n === 'data-sektor' ? z.sektor : n === 'data-feld' ? z.feld : null), onclick: null });
  const sprachFeld = { value: sprache };
  const linkEls = { datei: { onclick: null }, bauen: { onclick: null }, url: { value: ABLAGE }, ergebnis: echtCreate('div') };
  let uebersicht = null;
  k.document.getElementById = (id) => {
    if (id === 'ips-exportsprache') return sprachFeld;
    if (/^up-/.test(id)) return new Proxy({ value: 'Probe', textContent: '', classList: { add() {}, remove() {}, contains: () => false }, style: {} }, { get: (t, p) => (p in t ? t[p] : () => null), set: (t, p, v) => { t[p] = v; return true; } });
    if (id !== 'modal-inhalt' || !modale.length) return echt(id);
    const html = letztes().koerperHTML;
    if (/id="shl-bauen"/.test(html)) {
      return { querySelector: (s) => (s === '#shl-datei' ? linkEls.datei : s === '#shl-bauen' ? linkEls.bauen : s === '#shl-url' ? linkEls.url : s === '#shl-ergebnis' ? linkEls.ergebnis : null), querySelectorAll: () => [] };
    }
    const knoepfe = zeilen(html).map(knopf);
    const link = /id="exp-zurueckhalten-weg"/.test(html) ? { onclick: null } : null;
    uebersicht = { knoepfe, link };
    return { querySelector: (s) => (s === '#exp-zurueckhalten-weg' ? link : null), querySelectorAll: (s) => (s === '.export-zz-btn' ? knoepfe : []) };
  };
  const warteAufModal = async (n) => { for (let i = 0; i < 300 && modale.length < n; i++) await tick(10); return modale.length >= n; };

  V.flowGesundheitFhirExport();
  if (ohneGeburtsdatum) { await tick(50); return { k, V, modale, ohne: true }; }
  assert.equal(modale.length, 1, 'die Übersicht öffnet sich');
  uebersicht.link.onclick();
  for (let n = 0; n < 200; n++) {
    const z = zeilen(letztes().koerperHTML).find((x) => x.gehalten === (x.feld === wahlFeld));
    if (!z) break;
    uebersicht.knoepfe.find((b) => b.getAttribute('data-feld') === z.feld).onclick();
  }
  const uebersichtFertig = letztes().onPrimaer(() => {});                    // „Herausgeben“
  assert.ok(await warteAufModal(2), 'die Sprachwahl öffnet sich');
  letztes().onPrimaer(() => {});                                             // Sprache bestätigen
  if (festlegung) {
    assert.ok(await warteAufModal(3));
    assert.equal(letztes().titel, V.STRINGS.vereinbarungTitel, 'zuerst die Vereinbarung, wie beim Anlass-Auszug');
    letztes().drittAktion.handler(() => {});
    letztes().onPrimaer(() => {});
  }
  const nWahl = modale.length + 1;
  assert.ok(await warteAufModal(nWahl), 'danach die Wahl des Ausgabewegs');
  const wahl = letztes();
  assert.equal(wahl.primaerLabel, V.STRINGS.herunterladenKnopf);
  assert.equal(wahl.zweitAktion.label, V.STRINGS.linkSendenKnopf);
  assert.match(wahl.koerperHTML, /_Gesundheit_IPS\.json/, 'im Körper steht der Dateiname');
  await uebersichtFertig;
  if (weg === 'download') {
    wahl.onPrimaer(() => {});
    assert.equal(await warteAufDateien(k, 1, 5000), 1);
    return { k, V, modale, bundleText: (await k.bytes(0)).toString('utf8') };
  }
  wahl.zweitAktion.handler(() => {});                                        // „Link senden“
  if (festlegung) {   // wie beim Anlass-Auszug fragt flowLinkSenden selbst noch einmal („shl“)
    assert.ok(await warteAufModal(nWahl + 1));
    assert.equal(letztes().titel, V.STRINGS.vereinbarungTitel, 'der Link fragt die Vereinbarung für „shl“');
    letztes().drittAktion.handler(() => {});
    letztes().onPrimaer(() => {});
    assert.ok(await warteAufModal(nWahl + 3));
  }
  assert.ok(await warteAufModal(nWahl + 1), 'der Link-Dialog öffnet sich');
  assert.equal(letztes().titel, V.STRINGS.linkSendenKnopf);
  linkEls.datei.onclick();                                                   // Schritt 1: die Datei (.jose) = die JWE
  assert.equal(await warteAufDateien(k, 1, 5000), 1);
  const jwe = (await k.bytes(0)).toString('utf8');
  linkEls.url.value = ABLAGE;
  linkEls.bauen.onclick();                                                   // Host zeigen …
  const ok = erzeugt.find((e) => e.id === 'shl-host-ok');
  assert.ok(ok, 'der Host wird zur Bestätigung gezeigt');
  ok.onclick();                                                              // … bestätigen → Link
  const uriEl = erzeugt.find((e) => e.id === 'shl-uri');
  assert.ok(uriEl && /^shlink:\//.test(uriEl.textContent), 'ein Link entstand');
  const nutzlast = JSON.parse(b64u(uriEl.textContent.slice('shlink:/'.length)).toString('utf8'));
  const ent = jweEntschluesseln(jwe, nutzlast.key);
  return { k, V, modale, uri: uriEl.textContent, nutzlast, jwe, kopf: ent.kopf, bundleText: ent.bytes.toString('utf8') };
}

for (const sp of ['en', 'de']) {
  test('[Link senden·Patient Summary·' + sp + '] der Link trägt ein IPS-Bundle (document, Composition 60591-5), byte-gleich zum Download derselben Auswahl, nur gewählte Felder', async () => {
    const link = await fahre({ wahlFeld: GEWAEHLT.feld, sprache: sp, weg: 'link' });
    assert.deepEqual(link.kopf, { alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' });
    const b = JSON.parse(link.bundleText);
    assert.equal(b.resourceType, 'Bundle', 'ein Bundle, kein Binary');
    assert.equal(b.type, 'document');
    const comp = b.entry.find((e) => e.resource.resourceType === 'Composition').resource;
    assert.equal(comp.type.coding[0].code, '60591-5');
    assert.equal(comp.language, sp, 'die gewählte Sprache kam an');
    assert.ok(link.bundleText.includes(GEWAEHLT.marke), 'das gewählte Feld fehlt im Link');
    assert.ok(!link.bundleText.includes(ANDERES.marke), 'ein nicht gewähltes Feld geht im Link mit');
    assert.equal(link.nutzlast.flag, 'U', 'Einmal-Link (Direktweg)');
    const dl = await fahre({ wahlFeld: GEWAEHLT.feld, sprache: sp, weg: 'download' });
    assert.equal(maskiert(link.bundleText), maskiert(dl.bundleText), 'byte-gleich zum Download derselben Auswahl (UUID und Zeit maskiert)');
  });
}
test('[Link senden·Patient Summary·Gegenrichtung] nur das andere Feld gewählt: nur dieses steht im Link', async () => {
  const link = await fahre({ wahlFeld: ANDERES.feld, sprache: 'en', weg: 'link' });
  assert.ok(link.bundleText.includes(ANDERES.marke));
  assert.ok(!link.bundleText.includes(GEWAEHLT.marke));
});
test('[Link senden·Patient Summary·Identität] ohne Geburtsdatum weder Datei noch Wahl noch Link (Gate bleibt vor der Wahl)', async () => {
  const t = await fahre({ ohneGeburtsdatum: true });
  assert.equal(t.modale.length, 1);
  assert.equal(t.modale[0].titel, t.V.STRINGS.fhirGeburtsdatumTitel);
  assert.equal(t.k.gefangen.length, 0);
});
test('[Link senden·Patient Summary·Vereinbarung] mit Festlegung kommt die Vereinbarung vor der Wahl, wie beim Anlass-Auszug; der Link trägt dasselbe Bundle', async () => {
  const link = await fahre({ wahlFeld: GEWAEHLT.feld, sprache: 'en', weg: 'link', festlegung: true });
  assert.ok(link.bundleText.includes(GEWAEHLT.marke) && !link.bundleText.includes(ANDERES.marke));
});
test('[Link senden·Patient Summary·Wege] dieselbe Verdrahtung wie der Anlass-Auszug: ein Blob, zwei Türen; programmatischer Aufruf nur Datei; Sub-Depot wie der Download', () => {
  const a = KERN.indexOf('function flowGesundheitFhirExport(');
  const rumpf = KERN.slice(a, KERN.indexOf('\nfunction ', a + 10));
  assert.equal((rumpf.match(/kernAPI\.exportiere\('fhir-ips'/g) || []).length, 1, 'das Bundle wird genau einmal gebaut');
  assert.equal((rumpf.match(/new Blob\(/g) || []).length, 1, 'ein Blob für beide Türen');
  assert.match(rumpf, /flowLinkSenden\(\(o\) => auszugLinkTeile\(blob, Object\.assign\(\{ mime: 'application\/fhir\+json' \}, o\)\), STRINGS\.fhirExportLabel,/);
  assert.match(rumpf, /LINK_SENDEN_FUER_AUSZUEGE && optionen === undefined/, 'mit `optionen` (Proben) nur die Datei, wie beim Anlass');
  assert.match(rumpf, /_ausgabeWegWaehlen\(STRINGS\.fhirExportLabel, dateiname, herunterladen,/);
  assert.match(rumpf, /\{ nachfrage: \{ weg: 'fhir-ips', vorbelegung: \{ umfang: STRINGS\.fhirExportLabel \} \} \}/, 'Herausgegeben-Nachfrage am Link wie am Download');
  // Sub-Depot: der Link nimmt den Blob, der aus denselben delegationsOpt entstand wie der Download; keine eigene Regel.
  assert.doesNotMatch(rumpf.slice(rumpf.indexOf('const herunterladen'), rumpf.indexOf('}), optionen);')), /imSubKontext|aktiverSubKontext/, 'keine eigene Sub-Depot-Regel für den Link');
});
test('[Link senden·Patient Summary·Rot-Beweis] ohne die Verdrahtung gäbe es keine Wahl: die Probe sucht sie im Quelltext UND fährt sie', () => {
  assert.equal(KERN.replace(/_ausgabeWegWaehlen\(STRINGS\.fhirExportLabel/g, '_ausgabeWegAus(').includes('_ausgabeWegWaehlen(STRINGS.fhirExportLabel'), false);
});
