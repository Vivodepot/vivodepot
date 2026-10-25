'use strict';
/* Herausgeben mit Anlass (entschieden 18.10.2026): Der Herausgeben-Dialog („Woraus herausgeben?“) bietet neben den
   Anlass-Blättern auch die Anlass-Kacheln mit Blatt an (Arzttermin, Krankenhaus, Notar …). Maßstab der Entscheidung:
   übersichtlicher, nicht voller. Darum gehalten:
   (a) am Beispiel-Depot stehen nie mehr als HERAUSGEBEN_ANLAESSE_SICHTBAR Anlass-Knöpfe offen — mit Rot-Beweis: dieselbe
       Aufteilung ohne Grenze liefert dort mehr, und dieselbe Prüfung schlägt dann an;
   (b) eine Kachel, deren Blatt nur Name und Geburtsdatum trägt, zählt nicht als „mit Daten“;
   (c) die Reihenfolge folgt der Zahl der eigenen Angaben, bei Gleichstand der des Katalogs;
   (d) „Weitere Anlässe“ steht genau dann da, wenn es mehr Anlässe gibt als die Grenze, und dahinter steht der Rest —
       aufgeklappt im selben Dialog, Fokus auf den ersten neu sichtbaren Knopf;
   Klassenwächter: die Grenze ist EINE Konstante und wird an EINER Stelle gelesen.
   Das Beispiel-Depot ist das der Vorführung (tools/vorfuehrung/showcase-depot.json), im deutschen Produkt: das nackte
   Gerüst trägt keine Anlass-Blätter. Die Test-DOM parst kein HTML; gezählt wird am erzeugten HTML-String. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PRODUKT = require('./produkt-html-erzeugen.js');
const SHOWCASE = require('../tools/vorfuehrung-showcase-erzeugen.js');

const HTML = PRODUKT.produktHtml('privat-de');
const BEISPIEL = SHOWCASE.vorfuehrungNutzlastErzeugen({ sprache: 'de', V: PRODUKT.kernAus(HTML).V }).depot;

function beispielKern() {
  const k = PRODUKT.kernAus(HTML);
  k.V.vorschauDepotErzeugen();
  k.V.vorschauDatenUebernehmen(JSON.parse(JSON.stringify(BEISPIEL)));
  return k;
}
async function leererKern() {
  const k = PRODUKT.kernAus(HTML);
  await k.V.depotAnlegen('anlass-probe-pw');
  k.V.akteurSelbstErklaeren('B');
  return k;
}
// Die Knöpfe des Dialogs aus dem erzeugten HTML: offene und verborgene Anlass-Knöpfe, „Weitere Anlässe“.
function dialog(k) {
  k.V.flowHerausgebenZentral();
  const box = String(k.document.getElementById('modal-inhalt').innerHTML || '');
  const knoepfe = box.match(/<button\b[^>]*>/g) || [];
  const anlass = (verborgen) => knoepfe.filter((b) => /data-hz-anlass=/.test(b) && /\shidden[\s=>]/.test(b) === verborgen)
    .map((b) => b.match(/data-hz-anlass="([^"]*)"/)[1]);
  return { box, offen: anlass(false), verborgen: anlass(true), weitere: knoepfe.filter((b) => /data-hz-weitere=/.test(b)).length };
}
// Die eine Prüfung aus (a), damit der Rot-Beweis dieselbe Prüfung fährt wie die Probe.
// Diskriminante: leer, solange die offenen Knöpfe die Grenze halten.
function grenzeVerstoesse(V, offen) {
  return offen.length <= V.HERAUSGEBEN_ANLAESSE_SICHTBAR ? []
    : [offen.length + ' offen bei Grenze ' + V.HERAUSGEBEN_ANLAESSE_SICHTBAR + ': ' + offen.join(', ')];
}

test('[Herausgeben·Anlass·a] am Beispiel-Depot stehen höchstens so viele Anlass-Knöpfe offen, wie die Grenze erlaubt', () => {
  const k = beispielKern();
  const { offen } = dialog(k);
  assert.equal(k.V.HERAUSGEBEN_ANLAESSE_SICHTBAR, 4, 'die Grenze der Entscheidung');
  assert.ok(offen.length > 0, 'Positivkontrolle: das Beispiel-Depot bietet Anlässe an');
  assert.deepEqual(grenzeVerstoesse(k.V, offen), [], 'offen: ' + offen.join(', '));
});

test('[Herausgeben·Anlass·a·Rot-Beweis] ohne Grenze stünden am Beispiel-Depot mehr offen, und die Prüfung schlüge an', () => {
  const { V } = beispielKern();
  const ungedeckelt = V.anlaesseHerausgebenAufteilen(undefined, Infinity);
  assert.equal(ungedeckelt.weitere.length, 0, 'ohne Grenze bleibt nichts für „Weitere Anlässe“');
  assert.ok(ungedeckelt.sichtbar.length > V.HERAUSGEBEN_ANLAESSE_SICHTBAR,
    'das Beispiel-Depot trägt mehr Anlässe als die Grenze (sonst bewiese die Probe nichts): ' + ungedeckelt.sichtbar.length);
  assert.equal(grenzeVerstoesse(V, ungedeckelt.sichtbar.map((a) => a.id)).length > 0, true, 'dieselbe Prüfung wird ohne Grenze rot');
});

test('[Herausgeben·Anlass·b] eine Kachel mit nur Name und Geburtsdatum zählt nicht als „mit Daten“', async () => {
  const { V } = await leererKern();
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('identity', 'familyName', 'Probe');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-02-03');
  // Gegenprobe der Bedingung: diese Blätter NENNEN Name oder Geburtsdatum — mit der früheren Regel hätten sie Daten gehabt.
  const nennen = V.anlaesseAlle().filter((k) => V.SITUATION_BY_ID[k.id] && V.anlassEintraege(k.id).some((e) => {
    const r = V.crossRefFeldUndRoh(e.quelle, e.feld);
    return !!(r && r.feld && V.feldEingetragen(r.feld, r.roh));
  })).map((k) => k.id);
  assert.ok(nennen.includes('geburt'), 'Positivkontrolle: das Blatt „Geburt“ nennt den Namen: ' + nennen.join(', '));
  assert.equal(V._anlassEigeneAngaben('geburt'), 0);
  assert.deepEqual(V.anlaesseMitDaten(), [], 'Name und Geburtsdatum machen keinen Anlass');
  // Und eine eigene Angabe daneben zählt.
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456780');
  const arzt = V.anlaesseMitDaten().find((a) => a.id === 'arzt');
  assert.ok(arzt, 'mit einer Versichertennummer steht „Arzttermin“ zur Wahl');
  assert.equal(arzt.titel, V.anlaesseAlle().find((k) => k.id === 'arzt').label, 'derselbe Wortlaut wie die Kachel');
  assert.equal(arzt.angaben, 1, 'gezählt wird nur die eigene Angabe');
});

test('[Herausgeben·Anlass·b] am Beispiel-Depot fällt „Geburt“ heraus, obwohl das Blatt den Namen trägt', () => {
  const { V } = beispielKern();
  assert.equal(V._anlassEigeneAngaben('geburt'), 0);
  assert.ok(!V.anlaesseMitDaten().some((a) => a.id === 'geburt'));
});

// Diskriminante von (c): die Nachbarpaare, die gegen Zahl, Gleichstand-Reihenfolge oder Zählung verstoßen.
function reihenfolgeVerstoesse(V, liste) {
  const katalog = [...V._angSituationen().map((d) => d.id), ...V.anlaesseAlle().map((a) => a.id)];
  const v = [];
  for (let i = 1; i < liste.length; i++) {
    const [a, b] = [liste[i - 1], liste[i]];
    if (!(a.angaben >= b.angaben)) v.push(a.id + ' (' + a.angaben + ') vor ' + b.id + ' (' + b.angaben + ')');
    if (a.angaben === b.angaben && !(katalog.indexOf(a.id) < katalog.indexOf(b.id))) v.push('Gleichstand bleibt in Katalogreihenfolge: ' + a.id + ', ' + b.id);
    if (a.angaben !== V._anlassEigeneAngaben(a.id)) v.push(a.id + ': die Zahl ist nicht die Zählung');
  }
  return v;
}
test('[Herausgeben·Anlass·c] die mit den meisten eigenen Angaben zuerst, bei Gleichstand die Katalogreihenfolge', () => {
  const k = beispielKern();
  const { V } = k;
  const liste = V.anlaesseMitDaten();
  assert.deepEqual(reihenfolgeVerstoesse(V, liste), []);
  const { offen, verborgen } = dialog(k);
  assert.deepEqual([...offen, ...verborgen], liste.map((a) => a.id), 'der Dialog zeigt dieselbe Reihenfolge');
});

test('[Herausgeben·Anlass·d] „Weitere Anlässe“ steht genau dann da, wenn es mehr gibt, und trägt den Rest', async () => {
  const k = beispielKern();
  const { V } = k;
  const liste = V.anlaesseMitDaten();
  const { box, offen, verborgen, weitere } = dialog(k);
  assert.ok(liste.length > V.HERAUSGEBEN_ANLAESSE_SICHTBAR, 'Positivkontrolle: mehr Anlässe als die Grenze');
  assert.equal(weitere, 1, 'ein Knopf „Weitere Anlässe“');
  assert.ok(box.includes(V.STRINGS.herausgebenAnlassWeitere), 'mit seinem Text');
  assert.equal(V.STRINGS.herausgebenAnlassWeitere, 'Weitere Anlässe');
  assert.deepEqual(verborgen, liste.slice(V.HERAUSGEBEN_ANLAESSE_SICHTBAR).map((a) => a.id), 'dahinter genau der Rest');
  assert.ok(box.indexOf('data-hz-weitere=') > box.lastIndexOf('data-hz-anlass="' + offen.at(-1) + '"'), 'nach den offenen Anlässen');
  // Gegenprobe: höchstens so viele wie die Grenze → kein Knopf, nichts verborgen.
  const klein = await leererKern();
  klein.V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456780');
  const n = klein.V.anlaesseMitDaten().length;
  assert.ok(n > 0 && n <= klein.V.HERAUSGEBEN_ANLAESSE_SICHTBAR, 'Gegenprobe-Depot: ' + n);
  const d2 = dialog(klein);
  assert.equal(d2.weitere, 0);
  assert.deepEqual(d2.verborgen, []);
});

test('[Herausgeben·Anlass·d] aufklappen im selben Dialog: Rest sichtbar, Knopf weg, Fokus auf den ersten neuen', () => {
  const k = beispielKern();
  const { V, document } = k;
  const { sichtbar, weitere } = V.anlaesseHerausgebenAufteilen();
  // Die Test-DOM parst kein HTML: die Knöpfe, die der Dialog verdrahtet, werden hier nachgestellt.
  let fokus = null;
  const knopf = (id, hidden) => ({ id, hidden, getAttribute: () => id, focus() { fokus = id; } });
  const anlassKnoepfe = [...sichtbar.map((a) => knopf(a.id, false)), ...weitere.map((a) => knopf(a.id, true))];
  const wt = { hidden: false };
  const box = document.getElementById('modal-inhalt');
  box.querySelectorAll = (sel) => (sel === '[data-hz-anlass]' ? anlassKnoepfe : []);
  box.querySelector = (sel) => (sel === '[data-hz-weitere]' ? wt : null);
  V.ui.modal = () => () => {};
  V.flowHerausgebenZentral();
  assert.equal(typeof wt.onclick, 'function', '„Weitere Anlässe“ ist verdrahtet');
  wt.onclick();
  assert.ok(anlassKnoepfe.every((b) => b.hidden === false), 'alle Anlässe sichtbar');
  assert.equal(wt.hidden, true, 'der Knopf selbst weicht');
  assert.equal(fokus, weitere[0].id, 'Fokus auf den ersten neu sichtbaren Knopf');
});

// Diskriminante des Klassenwächters: jede Abweichung von „eine Konstante, eine Lesestelle, keine zweite Grenze im Dialog“.
function grenzeStellenVerstoesse(src) {
  const v = [];
  const stellen = src.split('HERAUSGEBEN_ANLAESSE_SICHTBAR').length - 1;
  if (stellen !== 2) v.push('genau Erklärung und eine Lesestelle, gefunden: ' + stellen);
  if (!/const HERAUSGEBEN_ANLAESSE_SICHTBAR = 4;/.test(src)) v.push('die Konstante HERAUSGEBEN_ANLAESSE_SICHTBAR = 4 fehlt');
  if (!/function anlaesseHerausgebenAufteilen\(liste, grenze = HERAUSGEBEN_ANLAESSE_SICHTBAR\)/.test(src)) v.push('anlaesseHerausgebenAufteilen liest die Grenze nicht als Vorgabe');
  const flow = src.slice(src.indexOf('function flowHerausgebenZentral'), src.indexOf('function flowHerausgeben(sektorId)'));
  if (!/anlaesseHerausgebenAufteilen\(\)/.test(flow)) v.push('der Dialog teilt nicht über die eine Funktion auf');
  if (/\.slice\(|\b4\b/.test(flow.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))) v.push('eine zweite Grenze im Dialog');
  return v;
}
test('[Herausgeben·Anlass·Klassenwächter] die Grenze ist eine Konstante und wird an einer Stelle gelesen', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.deepEqual(grenzeStellenVerstoesse(src), []);
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   (b) und (d) bleiben draußen: Abläufe mit festen Eingaben und erwarteten Werten (Konstruktions-Form), keine Verletzungsliste. */
module.exports = {
  PROBEN: [
    { fuer: '[Herausgeben·Anlass·a] am Beispiel-Depot stehen höchstens so viele Anlass-Knöpfe offen, wie die Grenze erlaubt', diskriminante: grenzeVerstoesse },
    { fuer: '[Herausgeben·Anlass·c] die mit den meisten eigenen Angaben zuerst, bei Gleichstand die Katalogreihenfolge', diskriminante: reihenfolgeVerstoesse },
    { fuer: '[Herausgeben·Anlass·Klassenwächter] die Grenze ist eine Konstante und wird an einer Stelle gelesen', diskriminante: grenzeStellenVerstoesse },
  ],
};
