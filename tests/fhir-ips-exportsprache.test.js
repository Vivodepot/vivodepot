'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Exportsprache des IPS-Begleittexts (U2-ADR-458, entschieden am 30.09.2026)
   ───────────────────────────────────────────────────────────────────────────
   Die festen Sätze des FHIR-IPS-Exports stehen in der Sprache, die die Bürgerin beim Export wählt; Voreinstellung Englisch
   (acae26f90, 28.08.2026: ein Empfänger im Ausland muss den Auszug lesen können). Sie kommen aus einem eingebackenen Modul
   (tools/ips-begleittext-modul.json), nie als Literal. Angeboten wird nur eine Sprache mit vollständigem Fach — ein IPS in
   zwei Sprachen gemischt ist für einen Arzt schlechter als ein englischer. Eine ungeprüfte Übersetzung sagt das im Export.

   DIE KLASSE, gegen die dieser Wächter steht: ein fester Satz, der am Modul vorbei als Literal in den Export geht — dann
   steht er in jeder Exportsprache englisch (so lief es am 28.09. in die Demo-Prüfung, nur umgekehrt).
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PRODUKT = require('./produkt-html-erzeugen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const MODUL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'ips-begleittext-modul.json'), 'utf8'));

// Die Argumente jedes _ipsNarrative(…)-Aufrufs, mit verschachtelten Klammern.
function narrativArgumente(quelle) {
  const aus = [];
  let i = 0;
  for (;;) {
    i = quelle.indexOf('_ipsNarrative(', i);
    if (i < 0) return aus;
    let j = i + '_ipsNarrative('.length, tiefe = 1;
    while (j < quelle.length && tiefe > 0) { if (quelle[j] === '(') tiefe++; else if (quelle[j] === ')') tiefe--; j++; }
    const arg = quelle.slice(i + '_ipsNarrative('.length, j - 1);
    if (!/^text\)?$/.test(arg.trim()) && !quelle.slice(Math.max(0, i - 9), i).includes('function ')) aus.push(arg);
    i = j;
  }
}
// Ein fester Satz ist ein Literal mit Buchstaben; Satzzeichen-Literale wie ' (' oder ' ' setzen nur zusammen.
const literalFunde = (quelle) => narrativArgumente(quelle).filter((a) => (a.replace(/_ipsSatz\('[A-Za-z]+'\)/g, '').match(/'[^']*'|"[^"]*"|`[^`]*`/g) || []).some((l) => /\p{L}/u.test(l)));

test('[IPS-Sprache·Literal] kein fester Satz geht als Literal in eine Narrative', () => {
  const args = narrativArgumente(KERN);
  assert.ok(args.length >= 15, 'Ausbeute: die Narrative-Aufrufe werden gefunden (' + args.length + ')');
  assert.deepEqual(literalFunde(KERN), []);
  assert.doesNotMatch(KERN, /let provText = '/, 'auch der Herkunfts-Satz kommt aus dem Modul');
  const rot = literalFunde(KERN + "\nfoo(_ipsNarrative('No known allergies.'));\n");
  assert.equal(rot.length, 1, 'Rot-Beweis im Test: ein Literal würde gefunden');
});

test('[IPS-Sprache·Kennungen] jede benutzte Kennung ist eine Modul-Kennung, und Englisch und Deutsch tragen alle', () => {
  const benutzt = [...new Set([...KERN.matchAll(/_ipsSatz\('([A-Za-z]+)'\)/g)].map((m) => m[1]))];
  const liste = KERN.match(/const IPS_BEGLEITTEXT_KENNUNGEN = Object\.freeze\(\[([\s\S]*?)\]\);/)[1].match(/'([A-Za-z]+)'/g).map((x) => x.slice(1, -1));
  assert.deepEqual(benutzt.filter((k) => !liste.includes(k)), [], 'jede benutzte Kennung steht in IPS_BEGLEITTEXT_KENNUNGEN');
  for (const sp of ['en', 'de']) {
    const texte = MODUL.sprachen[sp].texte;
    assert.deepEqual(liste.filter((k) => typeof texte[k] !== 'string' || !texte[k].trim()), [], sp + ': das Fach ist vollständig');
  }
  assert.equal(MODUL.sprachen.en.geprueft, true, 'Englisch ist die geprüfte Ausgangsfassung');
});

function bundle(slug, sprache) {
  const { V } = PRODUKT.kernAus(PRODUKT.produktHtml(slug));
  return { V, b: V.fhirIpsBundle(undefined, sprache ? { sprache } : undefined) };
}
const divs = (b) => JSON.stringify(b).match(/<div xmlns=\\"http:\/\/www\.w3\.org\/1999\/xhtml\\"[^>]*>/g) || [];

test('[IPS-Sprache·Voreinstellung] ohne Wahl ist der Begleittext englisch — auch im deutschen Produkt', () => {
  const { b } = bundle('privat-de');
  const comp = b.entry.find((e) => e.resource.resourceType === 'Composition').resource;
  assert.equal(comp.language, 'en');
  assert.ok(divs(b).length > 3 && divs(b).every((d) => d.includes('lang=\\"en\\"') && d.includes('xml:lang=\\"en\\"')), 'jede Narrative trägt die Sprache');
  assert.ok(JSON.stringify(b).includes(MODUL.sprachen.en.texte.leerAllergien), 'der englische Leer-Satz (eHDSI) steht drin');
});

test('[IPS-Sprache·Wahl] gewählt Deutsch: Composition.language, lang und alle festen Sätze deutsch — keiner englisch', () => {
  const { V, b } = bundle('privat-de', 'de');
  assert.ok(V.ipsExportSprachen().includes('de') && V.ipsExportSprachen()[0] === 'en', 'angeboten, Englisch zuerst');
  const comp = b.entry.find((e) => e.resource.resourceType === 'Composition').resource;
  assert.equal(comp.language, 'de');
  assert.ok(divs(b).every((d) => d.includes('lang=\\"de\\"')), 'jede Narrative trägt de');
  const text = JSON.stringify(b);
  // Die englischen Sektionsnamen stehen absichtlich weiter in section.title (Struktur, wie die Codes); geprüft wird der Text für Menschen.
  const englischeSaetze = (t) => Object.entries(MODUL.sprachen.en.texte).filter(([k, s]) => !k.startsWith('sektion') && s !== MODUL.sprachen.de.texte[k] && s.length > 8 && t.includes(s)).map(([k]) => k);
  const englisch = englischeSaetze(text);
  const titel = b.entry.find((e) => e.resource.resourceType === 'Composition').resource.section.map((x) => x.text.div);
  assert.ok(titel.every((d) => !d.includes('>Allergies and Intolerances<')), 'die Sektions-Narrative steht deutsch, auch wenn title englisch bleibt');
  assert.deepEqual(englisch, [], 'kein englischer fester Satz im deutschen Begleittext');
  const rot = englischeSaetze(JSON.stringify(bundle('privat-de').b));
  assert.ok(rot.length > 0, 'Rot-Beweis im Test: im englischen Begleittext findet dieselbe Suche englische Sätze');
  assert.ok(text.includes(MODUL.sprachen.de.texte.leerAllergien));
  const { b: unbekannt } = bundle('privat-de', 'xx');
  assert.equal(unbekannt.entry.find((e) => e.resource.resourceType === 'Composition').resource.language, 'en', 'eine unbekannte Sprache fällt auf Englisch, nicht auf eine Mischung');
});

/* Die Verfallsbedingung der Mitschrift-Zeile AB_WERK_IPS_BEGLEITTEXT („fuehrt-nicht“ im Register der Mitschrift-Regionen):
   die Region reist nicht mit der Datei, WEIL jedes Produkt dasselbe Modul trägt. Trägt eines ein anderes oder keines, stimmt die
   Zeile nicht mehr — dann wird diese Probe rot und die Region ein Fach. */
function ipsModulAbweichungen(produkte, dateienFuer, lesen) {
  const abweichungen = [];
  let erste = null;
  for (const p of produkte) {
    const ips = dateienFuer(p).filter((f) => JSON.parse(lesen(f)).modulTyp === 'ips-begleittext');
    if (ips.length !== 1) { abweichungen.push(p.slug + ': ' + ips.length + ' IPS-Module statt einem'); continue; }
    const inhalt = lesen(ips[0]);
    if (erste === null) erste = inhalt;
    else if (inhalt !== erste) abweichungen.push(p.slug + ': anderes IPS-Modul als ' + produkte[0].slug);
  }
  return abweichungen;
}

test('[IPS·Modul·Produkte] alle vier Produkte tragen byte-gleich dasselbe IPS-Modul', () => {
  const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  const lesen = (f) => fs.readFileSync(f, 'utf8');
  assert.equal(PRODUKTE.length, 4);
  assert.deepEqual(ipsModulAbweichungen(PRODUKTE, modulDateienFuer, lesen), []);
  // Rot-Beweis: ein Produkt mit einer anderen Fassung des Moduls fällt auf, eines ohne Modul auch.
  const anders = path.join(__dirname, '..', 'ANDERES-IPS-MODUL.json');
  const gefaelscht = (f) => (f === anders ? JSON.stringify(Object.assign({}, MODUL, { stand: 'anders' })) : lesen(f));
  const mitAnderem = (p) => modulDateienFuer(p).map((f) => (p.slug === 'pro-en' && JSON.parse(lesen(f)).modulTyp === 'ips-begleittext' ? anders : f));
  assert.deepEqual(ipsModulAbweichungen(PRODUKTE, mitAnderem, gefaelscht), ['pro-en: anderes IPS-Modul als privat-de']);
  const ohne = (p) => modulDateienFuer(p).filter((f) => !(p.slug === 'privat-en' && JSON.parse(lesen(f)).modulTyp === 'ips-begleittext'));
  assert.deepEqual(ipsModulAbweichungen(PRODUKTE, ohne, lesen), ['privat-en: 0 IPS-Module statt einem']);
});
