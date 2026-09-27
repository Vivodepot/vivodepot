'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sicht „Verwaltete Depots" (Bruch A/B/C/D)
   ────────────────────────────────────────────────────────────────────────
   A) Erklärtext (Sie-Form) über der Liste.
   B) Knopf-Hierarchie: primär gefüllt (btn-vertretung), sekundär klein
      (btn-sek btn-klein), tertiär dezent (btn-dezent).
   C) Keine technische depotUUID in der Bürger-Sicht (intern weiter als Schlüssel
      in data-*-Attributen erlaubt, nur nicht als sichtbarer Text/Label).
   D) Vertretungs-Grundlage statt „Typ: Verwaltet"; Anzeige-Schicht mit Leerwert
      „nicht hinterlegt" (Befüllung erst mit T2-Wizard) — KEIN Schema geschrieben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

function legeVerwaltetesDepot(V, ueberschreibung = {}) {
  const d = V.getData();
  d.verwalteteDepots = [Object.assign({
    depotUUID: 'e9146357-aaaa-bbbb-cccc-1234567890ab',
    bezeichnung: 'Depot meiner Mutter',
    inhaberin: 'Erika Mustermann',
    verwaltungsTyp: 'verwaltet',
    status: 'aktiv',
    verselbststaendigungMoeglich: false,
    delegationsGeschichte: [],
    umschlag: {},
  }, ueberschreibung)];
  return d.verwalteteDepots[0];
}

test('vertretungsGrundlageLabel: bekannte Schlüssel → Label, leer/unbekannt → "nicht hinterlegt"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  /* E1 (Kette Auftrag 2, Zug 3, 20.08.2026): Ein Eintrag OHNE den Schlüssel ist seither ein
     versiegeltes Sub-Depot — der Anker kann nicht wissen, ob dort eine Grundlage steht.
     Ein Leerwert wäre an dieser Stelle eine Behauptung; der Satz sagt jetzt, was los ist. */
  assert.equal(V.vertretungsGrundlageLabel({}), 'hinter dem Passwort dieses Depots', 'kein Feld → versiegelt');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: null }), 'nicht hinterlegt',
    'ausdrücklich leer (Bestand, Umzug offen) → weiterhin der Leerwert');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'vorsorge' }), 'Vorsorgevollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'gesundheit' }), 'Gesundheitsvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'bank' }), 'Bankvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'betreuung' }), 'Betreuungsvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'general' }), 'Generalvollmacht');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'elterliche_sorge' }), 'elterliche Sorge (minderjähriges Kind)');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'unbekannt_xyz' }), 'nicht hinterlegt', 'unbekannt → Leerwert');
  // Prototype-Schlüssel dürfen kein Label liefern (hasOwnProperty-Schutz).
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'toString' }), 'nicht hinterlegt');
  assert.equal(V.vertretungsGrundlageLabel({ vertretungsGrundlage: 'constructor' }), 'nicht hinterlegt');
});

test('renderVerwalteteDepots — Bruch A: Erklärtext + Sicht-Container', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  legeVerwaltetesDepot(V);
  V.oeffneVerwaltung();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('verwaltete-sicht'), 'Sicht-Container-Klasse gesetzt');
  assert.ok(html.includes('sektor-intro'), 'Erzähl-Absatz vorhanden');
  assert.ok(html.includes('als Bevollmächtigte'), 'Intro-Wortlaut vorhanden');
});

test('renderVerwalteteDepots — Bruch C: keine depotUUID als sichtbarer Text/Label', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  legeVerwaltetesDepot(V);
  V.oeffneVerwaltung();
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('depotUUID'), 'kein „depotUUID"-Label in der Sicht');
  assert.ok(!html.includes('<code'), 'keine Code-Anzeige der UUID');
  // Intern als Schlüssel weiter erlaubt: die UUID lebt in data-*-Attributen.
  assert.ok(html.includes('data-sub="e9146357-aaaa-bbbb-cccc-1234567890ab"'), 'UUID intern als Schlüssel');
});

test('renderVerwalteteDepots — Bruch D: Grundlage-Zeile, Leerwert ohne T2', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  legeVerwaltetesDepot(V);
  V.oeffneVerwaltung();
  let html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('<div class="feld-label">Grundlage</div>'), 'Grundlage-Zeile da');
  assert.ok(html.includes('hinter dem Passwort dieses Depots'), 'versiegelt: E1-Satz statt Leerwert-Behauptung');
  // Die alte technische „Typ: Verwaltet"-Zeile ist weg (Titel „Verwaltete Depots" bleibt erlaubt).
  assert.ok(!html.includes('<div class="feld-label">Typ</div>'), 'keine technische Typ-Zeile mehr');

  // Mit gefüllter Grundlage (so wie T2 sie später setzt) erscheint das Klartext-Label.
  legeVerwaltetesDepot(V, { vertretungsGrundlage: 'vorsorge' });
  V.oeffneVerwaltung();
  html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Vorsorgevollmacht'), 'gefüllte Grundlage → Klartext-Label');
  assert.ok(!html.includes('hinter dem Passwort dieses Depots'), 'kein Versiegelt-Satz bei sichtbarer Grundlage');
});

test('renderVerwalteteDepots — Bruch B: Knopf-Hierarchie (primär/sekundär/tertiär)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  legeVerwaltetesDepot(V);   // versiegelt (kein sessionSubKey) → Öffnen-Knopf ist primär
  V.oeffneVerwaltung();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('btn-vertretung'), 'primärer Schieferblau-Knopf');
  assert.ok(html.includes('btn-sek btn-klein'), 'sekundärer kleiner Umriss-Knopf');
  assert.ok(html.includes('btn-dezent'), 'tertiärer dezenter Textlink');
  // Der Aushäng-Knopf ist der dezente (tertiär), nicht mehr ein voller btn-sek-Block.
  assert.ok(/class="btn-dezent" data-aushaengen=/.test(html), 'Aushängen ist tertiär dezent');
});

test('[Frischer-Blick·Fund] renderVerwalteteDepots — "Wieder aufnehmen" bleibt bei archivierten Depots voll deckend, nicht mitgedimmt', async () => {
  /* Fund: der Knopf sah bei archivierten Sub-Depots deaktiviert aus. Ursache: die
     GESAMTE Karte trägt inline opacity:.55 (gewollt für den ruhenden, nicht-bedienbaren
     Kartenrest — s. Kommentar an der Zeile), der Reaktivieren-Knopf ist aber das EINZIGE
     tatsächlich aktive Element dieser Karte ("Nur 'Wieder aufnehmen' ist möglich") und darf
     davon nicht mitbetroffen sein. opacity wirkt auf den gesamten Nachfahren-Baum — ein
     opacity:1 direkt am Knopf kann eine gedimmte Vorfahren-Opacity NICHT aufheben, darum muss
     der Knopf strukturell AUSSERHALB der gedimmten Fläche liegen. */
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  legeVerwaltetesDepot(V, { status: 'uebergeben-archiviert', archiviertAm: '2026-08-01T00:00:00.000Z' });
  V.oeffneVerwaltung();
  const html = document.getElementById('content').innerHTML;
  const opaI = html.indexOf('opacity:.55');
  assert.ok(opaI > -1, 'die gedimmte Fläche muss existieren (Vorbedingung)');
  const btnI = html.indexOf('data-reaktivieren');
  assert.ok(btnI > opaI, 'Vorbedingung: der Knopf steht im Markup nach der Dimmungs-Deklaration');
  // Strukturprüfung ohne echtes DOM (dieser Test-Harnisch liefert nur ein Attrappen-`document` —
  // querySelector/parentElement sind No-ops, s. tests/load-kern.js): zwischen der Dimmungs-
  // Deklaration und dem Knopf muss mindestens ein </div> MEHR liegen als <div> — das schließende
  // </div> der gedimmten Fläche selbst, dessen öffnendes <div bereits VOR opaI liegt und darum
  // hier nicht mitgezählt wird. Ohne diesen Überschuss liegt der Knopf noch im selben,
  // ungeschlossenen gedimmten Element.
  const zwischen = html.slice(opaI, btnI);
  const offen = (zwischen.match(/<div/g) || []).length;
  const geschlossen = (zwischen.match(/<\/div>/g) || []).length;
  assert.ok(geschlossen > offen,
    'der Knopf muss AUSSERHALB der gedimmten Fläche liegen (ein zusätzliches schließendes </div> davor) — sonst wird er mitgedimmt und wirkt deaktiviert');
});
