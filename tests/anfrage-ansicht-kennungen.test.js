'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Anfrage-Ansicht nennt Angaben beim Namen, nie bei der Kennung (03.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund ANFRAGE-ANSICHT-KENNUNGEN (HOCH), Rundgang v1033 Pro, Bild 089: Fragt eine Stelle nach Angaben aus einem
   Bereich, den das Depot nicht führt (im Pro-Depot etwa „Gesundheit“), zeigte die Ansicht
     1. die rohen Feldkennungen („health.insuranceNumber, health.allergiesMedicationFoodOther“) und „Angabe(n)“,
     2. darunter „Das fehlt noch (0)“ mit „—“, obwohl oben zwei Angaben als fehlend genannt waren.
   Gehalten wird:
   · Jede erfragte Angabe, die das Depot nicht führt, steht unter „Das fehlt noch“ — mit ihrem Namen in der Sprache der
     Oberfläche (aus dem Feld oder dem Textsatz) und einer Marke, dass es sie in diesem Depot nicht gibt. Der Zähler zählt sie mit.
   · KLASSE: Keine Nutzer-Ansicht des Kerns zeigt als sichtbaren Text eine Kennung im Muster bereich.feldName — geprüft über
     die Ansichten, die ohne Argument zu öffnen sind, und jeden Bereich, nachdem eine solche Anfrage angekommen ist.
   Geladen wird das Produkt Pro (DE), das den Bereich „health“ nicht führt; sein Textsatz kennt den Namen der Felder.
   ROT-BEWEIS: die Prüffunktion findet eine Kennung und „Angabe(n)“ in einem Text (Positivkontrolle unten).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anfrage-ansicht-kennungen-pw-2026';
const VERSICHERTENNUMMER = 'health.insuranceNumber';
const ALLERGIEN = 'health.allergiesMedicationFoodOther';

async function proDepotOhneGesundheit() {
  const { V, document } = ladeKern({ produkt: 'pro-de' });
  await V.depotAnlegen(PW);
  // Der Vorname ist da, damit unter „Das fehlt noch“ genau die beiden Angaben stehen, die das Depot nicht führt.
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { givenName: 'Erika' });
  V.setData(d);
  V.zusammenstellungZuruecksetzen();
  assert.equal(V.kennungPruefen(VERSICHERTENNUMMER).ok, false, 'Vorbedingung: das Depot führt den Bereich Gesundheit nicht');
  return { V, document };
}
function anfrageAnnehmen(V, kennungen) {
  const anfrage = {
    modulTyp: 'anfrage', anfrageVersion: 1,
    von: 'Pflegeheim am Probenweg', zweck: 'Aufnahme in die Pflege', grundlage: 'Heimvertrag',
    vorgang: 'KENNUNG-1', gestelltAm: '2026-11-03', gueltigBis: '2099-12-31',
    felder: kennungen.map((k) => ({ kennung: k, zweck: 'Aufnahme', pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'aufnahme@pflegeheim.example.invalid' },
  };
  const m = V.anfrageMerken(V.anfrageAusText(JSON.stringify(anfrage)), null);
  assert.equal(m.ok, true, 'Vorbedingung: die Anfrage ist angenommen');
  return m.eintrag;
}
function sichtbarerText(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}
// Kennungen im Muster bereich.feldName, für jeden Bereich des Kerns und den nachgestellt fehlenden.
function kennungenImText(text, bereiche) {
  const muster = new RegExp('\\b(?:' + bereiche.join('|') + ')\\.[a-z][A-Za-z0-9_]*', 'g');
  return text.match(muster) || [];
}
function maengel(text, bereiche) {
  const m = kennungenImText(text, bereiche).map((k) => 'Kennung im Text: ' + k);
  if (/\w\((?:n|en|e|s)\)/.test(text)) m.push('Klammer-Plural im Text: ' + text.match(/\w+\((?:n|en|e|s)\)/)[0]);
  return m;
}
function bereichsIds(V) { return [...new Set(V.bereicheAlle().map((b) => b.id).concat(['health']))]; }

test('[Anfrage·Kennungen] fehlende Angaben stehen mit Namen unter „Das fehlt noch (2)“, keine Kennung im Text', async () => {
  const { V, document } = await proDepotOhneGesundheit();
  const eintrag = anfrageAnnehmen(V, ['identity.givenName', VERSICHERTENNUMMER, ALLERGIEN]);
  V.oeffneAnfrage(eintrag.id);
  const html = document.getElementById('content').innerHTML;
  const text = sichtbarerText(html);
  assert.deepEqual(maengel(text, bereichsIds(V)), []);
  assert.ok(text.includes(V.STRINGS.anfrageFehlendTitel + ' (2)'), 'der Zähler zählt beide: ' + text.slice(0, 600));
  const fehlt = sichtbarerText((html.split('id="anfrage-fehlend"')[1] || '').split('class="sektion"')[0]);
  for (const k of [VERSICHERTENNUMMER, ALLERGIEN]) {
    const name = V.textLesen(k + '.label');
    assert.ok(name && fehlt.includes(name), 'unter „Das fehlt noch“ steht ' + name);
  }
});

test('[Anfrage·Kennungen·Klasse] keine Nutzer-Ansicht zeigt eine Kennung bereich.feldName als Text', async () => {
  const { V, document } = await proDepotOhneGesundheit();
  const eintrag = anfrageAnnehmen(V, ['identity.givenName', VERSICHERTENNUMMER, ALLERGIEN]);
  const bereiche = bereichsIds(V);
  const ansichten = [
    ['anfrage', () => V.oeffneAnfrage(eintrag.id)],
    ['uebergabe-protokoll', () => V.oeffneUebergabeProtokoll()],
    ['zusammenstellen', () => V.oeffneZusammenstellen()],
    ['verwaltung', () => V.oeffneVerwaltung()],
    ['kartenraster', () => V.oeffneEintragenUebersicht()],
    ['mappe', () => V.oeffneMappe()],
    ['prueftermine', () => V.oeffnePrueftermine()],
    ['subdepot-konzept', () => V.oeffneSubKonzept()],
  ].concat(Object.keys(V.SEKTOR_BY_ID).map((id) => ['bereich ' + id, () => V.oeffneSektor(id)]));
  const funde = [];
  for (const [name, oeffnen] of ansichten) {
    try { oeffnen(); } catch (e) { funde.push(name + ': öffnet nicht (' + e.message + ')'); continue; }
    for (const m of maengel(sichtbarerText(document.getElementById('content').innerHTML), bereiche)) funde.push(name + ': ' + m);
  }
  assert.deepEqual(funde, []);
});

test('[Anfrage·Kennungen·Rot-Beweis] die Prüfung findet Kennung und Klammer-Plural', () => {
  const alt = 'Diese Anfrage nennt 2 Angabe(n), die es in Vivodepot nicht gibt: health.insuranceNumber, health.allergiesMedicationFoodOther.';
  assert.deepEqual(maengel(alt, ['health', 'identity']), [
    'Kennung im Text: health.insuranceNumber', 'Kennung im Text: health.allergiesMedicationFoodOther', 'Klammer-Plural im Text: Angabe(n)']);
  assert.deepEqual(maengel('Versichertennummer · gibt es in diesem Depot nicht · vivodepot.de', ['health', 'identity']), [],
    'Positivkontrolle: Klartext und eine Webadresse sind keine Kennung');
  assert.equal(sichtbarerText('<li data-anfrage-kennung="health.insuranceNumber">Versichertennummer</li>').trim(), 'Versichertennummer',
    'eine Kennung im Attribut ist kein sichtbarer Text');
});
