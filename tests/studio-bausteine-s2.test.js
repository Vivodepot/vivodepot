'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Studio · S-2 „Bausteine nach Anlass“ (Dummy 14.11.2026; Inventurzeilen N21, N22, N28, N39/N40, N43, N56, N68/N69)
     N21 · sechs Gruppen mit Alltagswörtern; jeder Eintrag der Bausteinliste gehört genau einer Gruppe an, keiner fällt heraus.
     N22 · keine Gesamtsuche, kein Register-Link im Kopf; der Schalter heißt „Technische Begriffe anzeigen“.
     N28 · „Anschrift“ ist ein Baustein und legt Straße, Hausnummer, Postleitzahl und Ort zusammen ab (Gruppe „Anschrift“).
     N39/N40 · „Eigene Felder“: Eigenes Textfeld, Ja-Nein-Feld, Einverständnis, mehrfach ablegbar, freiwillig.
     N43 · ein abgelegter Baustein steht blass und ist nicht ziehbar.
     N56 · ein Katalogbaustein wird als Pflicht abgelegt, außer E-Mail, Telefon, Allergien, Foto.
     N68/N69 · am Telefon öffnen die Bausteine als Blatt („＋ Baustein hinzufügen“, „Fertig“, Schleier).
   ROT-BEWEIS: die gepflanzten Fälle unten (eine Gruppe ohne Bereich; Pflicht-Vorgabe aus).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const PFAD = process.env.GENERATOR_HTML_PATH ? path.resolve(process.env.GENERATOR_HTML_PATH) : path.join(__dirname, '..', 'vivodepot-studio.html');
const HTML = fs.readFileSync(PFAD, 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));
const KAT = (V, k) => V.FELDKATALOG.findIndex((e) => e.kennung === k);

/* Liefert je Gruppe die Zahl der Einträge und die Einträge, die keiner der sechs Gruppen über ihren Bereich zugeordnet sind. */
function gruppenMessen(V) {
  const ids = nativ(V.STUDIO_GRUPPEN).map((g) => g.id);
  const zahl = {}; ids.forEach((i) => { zahl[i] = 0; });
  const ohneBereich = [];
  const bereiche = new Set(nativ(V.STUDIO_GRUPPEN).flatMap((g) => g.bereiche));
  V.paletteEintraege().forEach((e) => {
    const g = V.studioGruppeVon(e);
    assert.ok(ids.includes(g), 'unbekannte Gruppe ' + g + ' für ' + e.kennung);
    zahl[g] += 1;
    if (!bereiche.has(e.bereich)) ohneBereich.push(e.kennung);
  });
  return { zahl, ohneBereich };
}

test('[S-2 · N21] sechs Gruppen wie im Dummy; jeder Eintrag der Bausteinliste gehört genau einer an, jeder Bereich hat eine Gruppe', () => {
  const { V } = ladeGenerator();
  assert.deepEqual(nativ(V.STUDIO_GRUPPEN).map((g) => g.de), ['Zur Person', 'Erreichbarkeit', 'Nachweise und Dokumente', 'Gesundheit', 'Zahlung', 'Eigene Felder']);
  const m = gruppenMessen(V);
  assert.deepEqual(m.ohneBereich, [], 'Bereiche ohne Gruppe');
  assert.equal(Object.values(m.zahl).reduce((a, b) => a + b, 0), V.paletteEintraege().length, 'jeder Eintrag einmal');
  for (const g of nativ(V.STUDIO_GRUPPEN)) {
    for (const k of g.haeufig.filter((x) => x[0] !== '@')) {
      assert.ok(KAT(V, k) >= 0, 'häufiger Baustein fehlt im Katalog: ' + k);
      assert.equal(V.studioGruppeVon({ kennung: k, bereich: 'identity' }), g.id, k + ' steht in ' + g.id);
    }
  }
});
test('[S-2 · N21 · Rot-Beweis] eine Gruppe ohne ihren Bereich fällt auf', () => {
  const { V } = ladeGenerator({ html: HTML.replace("bereiche: ['health'],", "bereiche: [],") });
  assert.ok(gruppenMessen(V).ohneBereich.length > 0);
});

test('[S-2 · N22] keine Gesamtsuche, kein Register-Link im Kopf der Bausteine; der Schalter heißt „Technische Begriffe anzeigen“', () => {
  const kopf = HTML.slice(HTML.indexOf('<aside class="palette"'), HTML.indexOf('<div id="pal-liste"></div>'));
  assert.doesNotMatch(kopf, /id="pal-suche"|data-marke-href="register"/);
  assert.match(kopf, /<h2 id="pal-titel" data-en="Building blocks">Bausteine<\/h2>/);
  assert.match(kopf, /<label class="pal-kennungen"><input type="checkbox" id="pal-kennungen"> <span data-en="Show technical terms">Technische Begriffe anzeigen<\/span><\/label>/);
  assert.match(HTML, /'pal-weitere'[\s\S]{0,400}L\('Weitere', 'More'\)/, 'je Gruppe „Weitere“');
  assert.match(HTML, /class: 'pal-gruppen-suche', placeholder: L\('In dieser Gruppe suchen …', 'Search this group …'\)/, 'mit eigener Suche (C)');
});

test('[S-2 · N28] „Anschrift“ legt die vier Felder zusammen in die Gruppe „Anschrift“, ein zweites Mal nichts', () => {
  const { V } = ladeGenerator();
  V.STATE.felder = [];
  V.anschriftEinfuegen(null);
  const f = nativ(V.STATE.felder);
  assert.deepEqual(V.STATE.felder.map((x) => V.FELDKATALOG[V.feldKatalogIndex(x)].kennung), nativ(V.ANSCHRIFT_KENNUNGEN));
  assert.ok(f.every((x) => x.gruppe === 'Anschrift' && x.pflicht === true), 'Gruppe Anschrift, Pflicht');
  V.anschriftEinfuegen(null);
  assert.equal(V.STATE.felder.length, 4, 'kein Doppel');
  assert.deepEqual(nativ(V.paletteZiehDaten({ dataset: { baustein: 'anschrift' }, classList: { contains: () => false } })), { art: 'anschrift' });
  assert.equal(V.paletteZiehDaten({ dataset: { kat: '3' }, classList: { contains: (c) => c === 'verwendet' } }), null, 'N43: verwendet ist nicht ziehbar');
});

test('[S-2 · N56] Katalogbausteine Pflicht, freiwillig nur E-Mail, Telefon, Allergien, Foto; eigene Felder freiwillig', () => {
  const { V } = ladeGenerator();
  const pf = (k) => nativ(V.feldAusKatalog(KAT(V, k))).pflicht;
  assert.equal(pf('identity.givenName'), true);
  assert.equal(pf('health.healthInsurance'), true);
  for (const k of ['identity.email', 'identity.telephone', 'health.allergiesMedicationFoodOther', 'identity.profilePhotoCoverPage']) assert.equal(pf(k), false, k);
  assert.equal(nativ(V.feldAusTyp('jaNein', 'Einverständnis')).pflicht, false);
  assert.equal(nativ(V.feldAusTyp('jaNein', 'Einverständnis')).feldname, 'Einverständnis');
  assert.deepEqual(nativ(V.EIGENE_BAUSTEINE).map((b) => b.de), ['Eigenes Textfeld', 'Ja-Nein-Feld', 'Einverständnis']);
});
test('[S-2 · N56 · Rot-Beweis] ohne Pflicht-Vorgabe fällt es auf', () => {
  const { V } = ladeGenerator({ html: HTML.replace('    pflicht: FREIWILLIGE_KENNUNGEN.indexOf(k.kennung) < 0 };', '  };') });
  assert.notEqual(nativ(V.feldAusKatalog(KAT(V, 'identity.givenName'))).pflicht, true);
});

test('[S-2 · N68/N69] am Telefon: „＋ Baustein hinzufügen“ unter der Vorlage, Blatt von unten mit „Fertig“ und Schleier', () => {
  assert.match(HTML, /<button type="button" class="pal-auf" id="pal-auf" aria-controls="palette" data-en="＋ Add building block">＋ Baustein hinzufügen<\/button>/);
  assert.match(HTML, /<button type="button" class="knopf-klein pal-fertig" id="pal-fertig" data-en="Done">Fertig<\/button>/);
  assert.match(HTML, /<div class="pal-schleier" id="pal-schleier" hidden><\/div>/);
  const tel = HTML.slice(HTML.indexOf('@media (max-width: 760px)'), HTML.indexOf('@media (max-width: 520px)'));
  assert.match(tel, /\.bau-gitter > \.palette \{ position: fixed;[^}]*transform: translateY\(105%\)/);
  assert.match(tel, /\.bau-gitter > \.palette\.an \{ transform: none; visibility: visible; \}/);
  assert.match(HTML, /an\('pal-auf', 'click', \(\) => bausteinBlatt\(true\)\);/);
  assert.match(HTML, /an\('pal-fertig', 'click', \(\) => bausteinBlatt\(false\)\);/);
});
