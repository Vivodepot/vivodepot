'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   White Label — Kontakt im App-Fuß (Entscheidung 16.09.2026, U2-ADR-400 §5)
   ────────────────────────────────────────────────────────────────────────────
   Das Markenbündel trägt die Partner-Kontaktadresse (`kontakt`). Bei White Label steht sie im
   App-Fuß; fehlt sie, steht im Fuß KEINE Adresse — nie die von Vivodepot. Vivodepots Adresse
   bleibt am Herkunftsort (Einstellungen → Recht). Ohne White Label ändert sich nichts.
   Deutsch und englisch.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ladeKern } = require('./load-kern.js');

const PW = 'White-Label-Kontakt-Probe-2026';
const PARTNER = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe-white-label-kontakt',
  name: 'Probebank Musterort', domain: null, kontakt: 'beratung@probebank.example.org',
  farbePrimaer: '#1b3a5c', farbeSekundaer: '#8a9bb0', schriftart: 'Inter', logo: null,
});
const PARTNER_OHNE_KONTAKT = Object.freeze(Object.assign({}, PARTNER, { kontakt: undefined }));
/* Aktualisierungs-Link (Entscheidung 16.09.2026, dieselbe Regel wie der Kontakt). */
const PARTNER_MIT_AKTUALISIERUNGEN = Object.freeze(Object.assign({}, PARTNER, { aktualisierungen: 'https://probebank.example.org/app' }));

async function fussUndHerkunft(branding, sprache) {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  if (branding) d.brandingModule = [JSON.parse(JSON.stringify(branding))];
  if (sprache === 'en') {
    const r = V.modulEinlassen(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
    assert.equal(r.angenommen, true, 'Vorbedingung: englischer Textsatz angenommen — ' + r.grund);
    const d2 = V.getData(); d2.textsprache = 'en';
    if (branding) d2.brandingModule = [JSON.parse(JSON.stringify(branding))];
    V.setData(d2);
    V._textsatzModuleAusDepotAnmelden(V.getData());
  } else {
    V.setData(d);
  }
  V.betreteApp();
  V.renderFooter();
  return { V, fuss: document.getElementById('app-fuss').innerHTML, herkunft: V.einstellungenHTML() };
}

function kontaktPrueferVerstoesse(V) {
  const v = [];
  const gut = V.brandingModulPruefen(PARTNER);
  if (!gut.gueltig || !gut.branding || gut.branding.kontakt !== 'beratung@probebank.example.org') v.push('gültige Adresse nicht übernommen');
  if (gut.verworfene.length) v.push('gültiges Bündel verwirft: ' + JSON.stringify(gut.verworfene));
  const schlecht = V.brandingModulPruefen(Object.assign({}, PARTNER, { kontakt: 'keine adresse' }));
  if (!schlecht.branding || schlecht.branding.kontakt !== null) v.push('Nicht-Adresse übernommen');
  if (!schlecht.verworfene.some((x) => x.schluessel === 'kontakt' && x.grund === 'ungueltiger-kontakt')) v.push('Nicht-Adresse nicht benannt verworfen');
  return v;
}

/* erwartet: die Adresse, die im Fuß stehen muss, oder null für „keine Adresse". */
function kontaktFussVerstoesse(ergebnis, erwartet, sprache) {
  const { V, fuss, herkunft } = ergebnis;
  const v = [];
  const sichtbar = fuss.replace(/<[^>]*>/g, ' ');
  if (erwartet && !fuss.includes('mailto:' + erwartet)) v.push('Adresse ' + erwartet + ' fehlt im Fuß: ' + sichtbar);
  if (!erwartet && fuss.includes('mailto:')) v.push('Adresse im Fuß: ' + sichtbar);
  if (/vivodepot/i.test(sichtbar)) v.push('Vivodepot steht sichtbar im Fuß: ' + sichtbar);
  if (sprache === 'en' && /strings:/.test(sichtbar)) v.push('englischer Fuß nicht vollständig übersetzt');
  if (!herkunft.includes('mailto:' + V.STRINGS.fussKontakt)) v.push('Herkunftsort verliert die Herkunftsadresse');
  return v;
}

test('[Kontakt·Prüfer] brandingModulPruefen nimmt `kontakt` an und verwirft eine Nicht-Adresse benannt', () => {
  const { V } = ladeKern();
  const verstoesse = kontaktPrueferVerstoesse(V);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Kontakt·Fuß·de] White Label mit Kontakt: Partneradresse im Fuß, Vivodepots Adresse nicht', async () => {
  const verstoesse = kontaktFussVerstoesse(await fussUndHerkunft(PARTNER, 'de'), PARTNER.kontakt, 'de');
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Kontakt·Fuß·en] White Label mit Kontakt: Partneradresse im Fuß, Vivodepots Adresse nicht', async () => {
  const verstoesse = kontaktFussVerstoesse(await fussUndHerkunft(PARTNER, 'en'), PARTNER.kontakt, 'en');
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Kontakt·Fuß·de] White Label ohne Kontakt: keine Adresse im Fuß', async () => {
  const verstoesse = kontaktFussVerstoesse(await fussUndHerkunft(PARTNER_OHNE_KONTAKT, 'de'), null, 'de');
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Kontakt·Fuß·en] White Label ohne Kontakt: keine Adresse im Fuß', async () => {
  const verstoesse = kontaktFussVerstoesse(await fussUndHerkunft(PARTNER_OHNE_KONTAKT, 'en'), null, 'en');
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Kontakt·Fuß·de] ohne White Label: Vivodepots Adresse im Fuß wie bisher (Gegenprobe)', async () => {
  const { V, fuss } = await fussUndHerkunft(null, 'de');
  assert.ok(fuss.includes('mailto:' + V.STRINGS.fussKontakt), fuss);
});

test('[Kontakt·Fuß·en] ohne White Label: Vivodepots Adresse im Fuß wie bisher (Gegenprobe)', async () => {
  const { V, fuss } = await fussUndHerkunft(null, 'en');
  assert.ok(fuss.includes('mailto:' + V.STRINGS.fussKontakt), fuss);
});

/* erwartet: die Adresse, auf die Fuß-Link und Einstellungs-Knopf zeigen müssen, oder null für
   „kein Link, kein Knopf". Gemessen am gerenderten Fuß und an den Einstellungen. */
function aktualisierungenVerstoesse(ergebnis, erwartet) {
  const { V, fuss, herkunft } = ergebnis;
  const v = [];
  const links = (fuss.match(/href="https:[^"]*"/g) || []);
  if (erwartet && !links.includes('href="' + erwartet + '"')) v.push('Fuß-Link zeigt nicht auf ' + erwartet + ': ' + links.join(' '));
  if (!erwartet && links.length) v.push('Fuß trägt einen Aktualisierungs-Link: ' + links.join(' '));
  if (/href="https:\/\/vivodepot\.de/.test(fuss)) v.push('Fuß verlinkt vivodepot.de');
  const knopf = herkunft.includes('id="einst-version-suchen"');
  if (erwartet && !knopf) v.push('Knopf „Nach neuer Version suchen" fehlt');
  if (!erwartet && knopf) v.push('Knopf „Nach neuer Version suchen" steht ohne Partner-Adresse');
  if (!herkunft.includes('href="' + V.VIVODEPOT_HERKUNFT_LINK + '"')) v.push('Herkunftsort verliert den Herkunftslink');
  return v;
}

test('[Aktualisierungen·de] White Label mit Adresse: Fuß-Link und Knopf zeigen zum Partner', async () => {
  const verstoesse = aktualisierungenVerstoesse(await fussUndHerkunft(PARTNER_MIT_AKTUALISIERUNGEN, 'de'), PARTNER_MIT_AKTUALISIERUNGEN.aktualisierungen);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Aktualisierungen·en] White Label mit Adresse: Fuß-Link und Knopf zeigen zum Partner', async () => {
  const verstoesse = aktualisierungenVerstoesse(await fussUndHerkunft(PARTNER_MIT_AKTUALISIERUNGEN, 'en'), PARTNER_MIT_AKTUALISIERUNGEN.aktualisierungen);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Aktualisierungen·de] White Label ohne Adresse: kein Link, kein Knopf', async () => {
  const verstoesse = aktualisierungenVerstoesse(await fussUndHerkunft(PARTNER, 'de'), null);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Aktualisierungen·en] White Label ohne Adresse: kein Link, kein Knopf', async () => {
  const verstoesse = aktualisierungenVerstoesse(await fussUndHerkunft(PARTNER, 'en'), null);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[Aktualisierungen] ohne White Label: AKTUALISIERUNGEN_LINK wie bisher (Gegenprobe)', async () => {
  const e = await fussUndHerkunft(null, 'de');
  assert.ok(e.fuss.includes('href="' + e.V.AKTUALISIERUNGEN_LINK + '"'), e.fuss);
  assert.ok(e.herkunft.includes('id="einst-version-suchen"'));
});

test('[Aktualisierungen·Prüfer] brandingModulPruefen nimmt nur eine https-Adresse an', () => {
  const { V } = ladeKern();
  assert.equal(V.brandingModulPruefen(PARTNER_MIT_AKTUALISIERUNGEN).branding.aktualisierungen, 'https://probebank.example.org/app');
  const schlecht = V.brandingModulPruefen(Object.assign({}, PARTNER, { aktualisierungen: 'http://probebank.example.org' }));
  assert.equal(schlecht.branding.aktualisierungen, null);
  assert.ok(schlecht.verworfene.some((x) => x.schluessel === 'aktualisierungen' && x.grund === 'ungueltige-aktualisierungen'));
});

/* Proben-Deklaration (U2-ADR-099 B-2). */
module.exports = {
  PROBEN: [
    { fuer: '[Kontakt·Prüfer] brandingModulPruefen nimmt `kontakt` an und verwirft eine Nicht-Adresse benannt', diskriminante: kontaktPrueferVerstoesse },
    { fuer: '[Kontakt·Fuß·de] White Label mit Kontakt: Partneradresse im Fuß, Vivodepots Adresse nicht', diskriminante: kontaktFussVerstoesse },
    { fuer: '[Kontakt·Fuß·en] White Label mit Kontakt: Partneradresse im Fuß, Vivodepots Adresse nicht', diskriminante: kontaktFussVerstoesse },
    { fuer: '[Kontakt·Fuß·de] White Label ohne Kontakt: keine Adresse im Fuß', diskriminante: kontaktFussVerstoesse },
    { fuer: '[Kontakt·Fuß·en] White Label ohne Kontakt: keine Adresse im Fuß', diskriminante: kontaktFussVerstoesse },
    { fuer: '[Aktualisierungen·de] White Label mit Adresse: Fuß-Link und Knopf zeigen zum Partner', diskriminante: aktualisierungenVerstoesse },
    { fuer: '[Aktualisierungen·en] White Label mit Adresse: Fuß-Link und Knopf zeigen zum Partner', diskriminante: aktualisierungenVerstoesse },
    { fuer: '[Aktualisierungen·de] White Label ohne Adresse: kein Link, kein Knopf', diskriminante: aktualisierungenVerstoesse },
    { fuer: '[Aktualisierungen·en] White Label ohne Adresse: kein Link, kein Knopf', diskriminante: aktualisierungenVerstoesse },
  ],
};
