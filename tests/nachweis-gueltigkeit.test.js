'use strict';
/* Gültigkeit und Status gehaltener Nachweise (v867, Befund NACHWEIS-GUELTIGKEIT-UNGELESEN).
   Ein gehaltener Nachweis (EDC, Open Badge 3.0) wurde nur nach Titel und Aussteller gelesen; ein abgelaufener oder
   widerrufbarer sah aus wie ein gültiger. Jetzt liest die App die Gültigkeit aus dem Original und sagt, dass sie den Status
   nicht prüft — ohne Netzabruf. Geprüft mit den echten Fixtures (Europass-Muster, 1EdTech-Beispiele); „abgelaufen“ an einer
   abgeleiteten Kopie von ob3-complete.json mit verschobenem validUntil, weil kein echtes Beispiel abgelaufen ist.
   Klassenwächter: jeder Typ gehaltener Nachweise hat einen Leser, und jeder Importweg, der Nachweise hält, legt einen
   solchen Typ ab. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');

const FX = path.join(__dirname, 'fixtures');
const bytesVon = (d) => fs.readFileSync(path.join(FX, d));
const textVon = (d) => new TextDecoder().decode(bytesVon(d));
const JETZT = new Date('2026-10-01T12:00:00Z');

async function mitDepot(k) { await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester'); return k; }
const ablegen = (V, text, bytes) => V.importAutoritativDokument(text, bytes ? new Uint8Array(bytes) : null);
// ob3-complete.json mit validUntil in der Vergangenheit — sonst unverändert (credentialStatus bleibt).
const ABGELAUFEN = JSON.stringify(Object.assign(JSON.parse(textVon('ob3-complete.json')), { validUntil: '2020-01-01T00:00:00Z' }));
const toasts = (V) => { const t = []; V.ui.toast = (text, art) => t.push({ text, art }); return t; };

/* ── die reine Funktion ───────────────────────────────────────────────────────────────────── */

test('[Nachweis-Gültigkeit] die Felder aller drei Datenmodelle werden gelesen; der Status wird nur festgestellt', () => {
  const { V } = ladeKern({ backen: true });
  const g = (c) => V.nachweisGueltigkeit(c, JETZT);
  assert.deepEqual(g({ validFrom: '2020-01-01T00:00:00Z', validUntil: '2030-01-01T00:00:00Z' }),
    { ab: '2020-01-01T00:00:00Z', bis: '2030-01-01T00:00:00Z', abgelaufen: false, nochNicht: false, status: false, statusTypen: [] });
  assert.equal(g({ issuanceDate: '2019-05-01', expirationDate: '2021-05-01' }).abgelaufen, true, 'VC 1.1');
  assert.equal(g({ issued: '2023-09-27T14:07:01+02:00' }).ab, '2023-09-27T14:07:01+02:00', 'EDC issued');
  assert.equal(g({ nbf: 1893456000 }).nochNicht, true, 'JWT nbf (2030)');
  assert.deepEqual(g({ credentialStatus: [{ type: 'BitstringStatusListEntry' }, { type: '1EdTechRevocationList' }] }).statusTypen,
    ['BitstringStatusListEntry', '1EdTechRevocationList']);
  assert.equal(g({ validUntil: 'irgendwann' }).bis, null, 'kein erfundenes Datum');
  assert.equal(g(null), null);
});

test('[Nachweis-Gültigkeit] die echten Fixtures: EDC nennt „gültig ab“, ob3-complete den Status, ohne Netz', () => {
  const { V } = ladeKern({ backen: true });
  const edc = V.BILDUNG_DOK_TYPEN.find((d) => d.typ === 'edc');
  const ob3 = V.BILDUNG_DOK_TYPEN.find((d) => d.typ === 'ob3');
  for (const f of ['edci-europass-certofpart-signed.jsonld', 'edci-europass-mc-signed.jsonld', 'edci-europass-certofpart-unsigned.jsonld']) {
    const g = V.nachweisGueltigkeit(edc.credential(textVon(f)), JETZT);
    assert.ok(g && g.ab && !g.bis && !g.abgelaufen && !g.status, f);
  }
  const g = V.nachweisGueltigkeit(ob3.credential(textVon('ob3-complete.json')), JETZT);
  assert.equal(g.bis, '2030-01-01T00:00:00Z');
  assert.deepEqual(g.statusTypen, ['1EdTechRevocationList']);
  const saetze = V.nachweisGueltigkeitSaetze(g).map((x) => x.text);
  assert.ok(saetze.includes(V.STRINGS.nachweisStatusUngeprueft));
  for (const f of ['ob3-simple.jwt', 'ob3-simple-jwt.png', 'ob3-simple-json.svg']) {
    assert.ok(V.nachweisGueltigkeit(ob3.credential(textVon(f)), JETZT).ab, f + ': validFrom auch aus JWT, PNG und SVG');
  }
});

/* ── sichtbar: Dialog, Liste, Ablage, Weitergabe ──────────────────────────────────────────── */

test('[Nachweis-Gültigkeit·Ansicht] ein abgelaufener Badge zeigt es im Dialog und in der Liste, mit Status-Satz; ein gültiger nicht', async () => {
  const k = await mitDepot(ladeKern({ backen: true }));
  const alt = ablegen(k.V, ABGELAUFEN);
  const gut = ablegen(k.V, textVon('ob3-complete.json'));
  assert.ok(alt && gut, 'Vorbedingung: beide liegen als Original vor');
  k.V.flowMappeVorschau(alt);
  const m = k.document.getElementById('modal-inhalt').innerHTML;
  assert.ok(m.includes(k.V.STRINGS.nachweisAbgelaufen), 'Dialog: abgelaufen');
  assert.ok(m.includes(k.V.STRINGS.nachweisStatusUngeprueft), 'Dialog: Status nicht geprüft');
  const liste = k.V.mappeListeHTML(k.V.getData().mappe || []);
  assert.equal((liste.match(/data-nachweis-abgelaufen/g) || []).length, 1, 'Liste: genau der abgelaufene trägt die Marke');
  k.V.flowMappeVorschau(gut);
  const m2 = k.document.getElementById('modal-inhalt').innerHTML;
  assert.ok(m2.includes(k.V.STRINGS.nachweisGueltigBis) && !m2.includes(k.V.STRINGS.nachweisAbgelaufen), 'gültig: „gültig bis“, nicht abgelaufen');
});

test('[Nachweis-Gültigkeit·Ablage und Weitergabe] beim Ablegen und beim Herunterladen stehen „abgelaufen“ und der Status-Satz da', async () => {
  const k = ladeMitAusgabe();
  await mitDepot(k);
  const t = toasts(k.V);
  k.V.flowImportAutoritativ('openbadges-3-extern', ABGELAUFEN, null);
  assert.ok(t.some((x) => x.art === 'warn' && x.text.startsWith(k.V.STRINGS.nachweisAbgelaufen)), 'Ablage: abgelaufen');
  assert.ok(t.some((x) => x.text === k.V.STRINGS.nachweisStatusUngeprueft), 'Ablage: Status');
  const id = (k.V.getData().mappe || []).find((e) => e.autoritativ).id;
  t.length = 0;
  await k.V.flowMappeOriginalHerunterladen(id);
  await warteAufDateien(k, 1);
  assert.ok(t.some((x) => x.art === 'warn' && x.text.startsWith(k.V.STRINGS.nachweisAbgelaufen)), 'Weitergabe: abgelaufen');
  assert.ok(t.some((x) => x.text === k.V.STRINGS.nachweisStatusUngeprueft), 'Weitergabe: Status');
  assert.equal(Buffer.compare(await k.bytes(0), Buffer.from(ABGELAUFEN)), 0, 'das Original geht unverändert hinaus — ein Hinweis, keine Sperre');
});

/* ── Klassenwächter ───────────────────────────────────────────────────────────────────────── */

// Jeder Typ gehaltener Nachweise hat einen Leser; jeder Importweg, der Nachweise hält, legt einen solchen Typ ab.
function waechter(V) {
  const m = [];
  for (const d of V.BILDUNG_DOK_TYPEN) if (typeof d.credential !== 'function') m.push('Typ ' + d.typ + ' ohne Leser credential(text)');
  const gedeckt = new Set(V.BILDUNG_DOK_TYPEN.map((d) => d.uebernahmeFormat));
  const medizin = new Set(['fhir-lab']);   // hält Befunde (FHIR), keine Credentials — eigener Typ, eigene Anzeige
  for (const f of V.IMPORT_FORMATE) if (f.autoritativDoc && !medizin.has(f.id) && !gedeckt.has(f.id)) m.push('Importweg ' + f.id + ' hält Nachweise, aber kein Typ mit Leser legt sie ab');
  return m;
}

test('[Nachweis-Gültigkeit·Wächter] jeder Typ gehaltener Nachweise hat einen Leser, jeder haltende Importweg einen Typ', () => {
  const { V } = ladeKern({ backen: true });
  assert.ok(V.BILDUNG_DOK_TYPEN.length >= 2, 'Vorbedingung: Typen gefunden');
  assert.deepEqual(waechter(V), []);
});

test('[Nachweis-Gültigkeit·Wächter·Rot-Beweis] ein Typ ohne Leser und ein haltender Importweg ohne Typ sind rot', () => {
  const { V } = ladeKern({ backen: true });
  const ohneLeser = { BILDUNG_DOK_TYPEN: [...V.BILDUNG_DOK_TYPEN, { typ: 'sdjwt', uebernahmeFormat: 'x' }], IMPORT_FORMATE: V.IMPORT_FORMATE };
  assert.deepEqual(waechter(ohneLeser), ['Typ sdjwt ohne Leser credential(text)']);
  const neuerWeg = { BILDUNG_DOK_TYPEN: V.BILDUNG_DOK_TYPEN, IMPORT_FORMATE: [...V.IMPORT_FORMATE, { id: 'sd-jwt-vc-extern', autoritativDoc: true }] };
  assert.deepEqual(waechter(neuerWeg), ['Importweg sd-jwt-vc-extern hält Nachweise, aber kein Typ mit Leser legt sie ab']);
});

test('[Nachweis-Gültigkeit] kein Netzabruf: die Funktion ruft weder fetch noch XMLHttpRequest', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const a = kern.indexOf('/* ── Gültigkeit und Status gehaltener Nachweise (v867');
  const b = kern.indexOf('// Ein autoritativer Typ — Gesundheit ODER Bildung', a);
  assert.ok(a > 0 && b > a, 'Vorbedingung: der Block ist gefunden');
  assert.doesNotMatch(kern.slice(a, b), /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/);
});
