'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-477 — die LPA-Ausfüllhilfe England und Wales, Stufe 1, über den echten Andockweg
   ────────────────────────────────────────────────────────────────────────
   Die fünf Moduldateien in tools/lpa-england-wales/ (erzeugt von tools/lpa-england-wales-erzeugen.js)
   werden wie jedes Fremdmodul eingelassen: Rechtsraum, Bereich (die Fragen), Logikmodul (die
   Übertragungsliste). Geprüft wird, was die Gegenlesung am 02.10.2026 zur Auflage gemacht hat:
     (a) der amtliche Online-Dienst des OPG steht als erster Schritt, mit Adresse;
     (b) die zwei Sachsätze zu „Unterschreiben" und „Registrieren" stehen zeichengenau im Ablauf;
   dazu, dass die Liste kein Formular ist, dass keine Wartefrist nach LP3 als Zahl im Modul steht und
   die Gebühr nur mit Quelle und Abrufdatum.
   Jede Probe ist eine Funktion; ihr Rot-Beweis fährt sie gegen eine bewusst verdorbene Kopie.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const E = require('../tools/lpa-england-wales-erzeugen.js');

const DATEIEN = ['rechtsraum-gb-eng-wls.json', 'bereich-de.json', 'bereich-en.json', 'uebertragungsliste-de.json', 'uebertragungsliste-en.json'];
function lies(name) { return JSON.parse(fs.readFileSync(path.join(E.ZIEL, name), 'utf8')); }

async function angedockt(spr) {
  const { V } = ladeKern();
  await V.depotAnlegen('LPA-England-Wales-2026-10-03!');
  V.akteurSelbstErklaeren('Prüfung');
  const ergebnisse = [];
  for (const name of ['rechtsraum-gb-eng-wls.json', 'bereich-' + spr + '.json', 'uebertragungsliste-' + spr + '.json']) {
    ergebnisse.push(V.modulEinlassen(fs.readFileSync(path.join(E.ZIEL, name), 'utf8'), V.getData()));
    V._bereichsModuleAusDepotAnmelden(V.getData());
    V._rechtsraumModuleAusDepotAnmelden(V.getData());
  }
  return { V, ergebnisse };
}
function dokumentText(V) {
  return V.dokumentHTML(E.LOGIK_ID).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '\n').replace(/\n\s*\n+/g, '\n');
}

/* ── Proben über die Moduldateien ── */
/* Was im Dokument stehen muss (und was nicht), als Liste der Verstöße. Die Werte im Depot setzt der Aufrufer:
   Formular LP1F, Vorname Anna, gemeinsames Handeln „Jointly“, trust corporation angekreuzt. */
function keinFormularBefund(text, spr) {
  const raus = [];
  const muss = (bed, was) => { if (!bed) raus.push(was); };
  muss(text.includes(E.B[spr].h1), 'Überschrift der Übertragungsliste fehlt');
  muss(text.includes(E.B[spr].keinFormular), 'der Satz „kein Formular“ fehlt');
  muss(text.includes(E.OGL_ZEILE), 'die Attribution nach OGL v3.0 fehlt');
  muss(!/Only valid with the official stamp/.test(text), 'Anschein amtlichen Status (Stempelvermerk)');
  muss(text.includes('First names: Anna'), 'eingetragener Wert fehlt');
  muss(text.includes('How do you want your attorneys to work together? (tick one only): Jointly'), 'Antwort ohne amtlichen Wortlaut der Option');
  muss(text.includes('☒ This attorney is a trust corporation.'), 'angekreuztes Kästchen fehlt');
  muss(text.includes('When can your attorneys make decisions?') && !text.includes('Life-sustaining treatment'), 'Abschnitt 5 folgt nicht dem gewählten Formular');
  return raus;
}
function probeOnlineDienstZuerst(liste, spr) {
  const erster = liste.abschnitte[0];
  const texte = erster.bloecke.filter((b) => b.typ === 'immer').flatMap((b) => b.texte);
  return erster.titel === E.B[spr].schritt0 && !/^Section /.test(erster.titel)
    && texte[0] === E.B[spr].onlineDienst && texte.some((t) => t.includes(E.ONLINE_DIENST));
}
function probeSachsatz(liste, spr, schritt, abschnittNr) {
  const a = liste.abschnitte.find((x) => x.titel.split(E.TRENNER)[0] === 'Section ' + abschnittNr);
  if (!a) return false;
  const erste = a.bloecke[0];
  return erste.typ === 'immer' && !erste.sichtbarWenn && erste.texte[0] === E.SACHSATZ[spr][schritt];
}
const SACHSAETZE_ZEICHENGENAU = Object.freeze({
  de: { unterschreiben: 'Unterschreiben, Bezeugen und Bescheinigen geschieht auf dem gedruckten Formular. Vivodepot übernimmt diese Schritte nicht.',
    registrieren: 'Registriert wird beim Office of the Public Guardian. Vivodepot reicht nichts ein.' },
  en: { unterschreiben: 'Signing, witnessing and certifying happen on the printed form. Vivodepot does not do these steps.',
    registrieren: 'Registration is with the Office of the Public Guardian. Vivodepot does not submit anything.' },
});
/* Keine Wartefrist nach LP3 als Zahl: die amtlichen Quellen nennen drei und vier Wochen. */
function probeKeineWartefrist(rohTexte) {
  return rohTexte.every((t) => !/\b(weeks?|Wochen?|three|four|drei|vier)\b/i.test(t) && !/\b\d+\s*(weeks?|Wochen?)\b/i.test(t));
}
/* Die Gebühr steht nur zusammen mit gov.uk-Adresse und Abrufdatum. */
function probeGebuehrMitQuelle(module) {
  const regel = module.rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln.find((r) => /£\d/.test(r.text));
  if (!regel || regel.fundstelle !== E.GEBUEHR.url || !/^\d{4}-\d{2}-\d{2}$/.test(regel.abgerufen || '')) return false;
  for (const liste of [module.listeDe, module.listeEn]) {
    for (const a of liste.abschnitte) {
      const texte = a.bloecke.filter((b) => b.typ === 'immer').flatMap((b) => b.texte);
      const i = texte.findIndex((t) => /£\d/.test(t));
      if (i < 0) continue;
      if (i === 0 || !texte[i - 1].includes(E.GEBUEHR.url) || !/2026/.test(texte[i - 1])) return false;
    }
  }
  return true;
}
function module() {
  return { rechtsraum: lies('rechtsraum-gb-eng-wls.json'), bereichDe: lies('bereich-de.json'), bereichEn: lies('bereich-en.json'),
    listeDe: lies('uebertragungsliste-de.json'), listeEn: lies('uebertragungsliste-en.json') };
}
function alleTexte(o) {
  const raus = [];
  const lauf = (x) => { if (typeof x === 'string') raus.push(x); else if (Array.isArray(x)) x.forEach(lauf); else if (x && typeof x === 'object') Object.values(x).forEach(lauf); };
  lauf(o);
  return raus;
}

test('[U2-ADR-477·LPA] die fünf Moduldateien sind genau das, was der Erzeuger heute erzeugt', () => {
  const erzeugt = E.alleDateien();
  assert.deepEqual(Object.keys(erzeugt).sort(), DATEIEN.slice().sort());
  for (const name of DATEIEN) assert.equal(fs.readFileSync(path.join(E.ZIEL, name), 'utf8'), erzeugt[name], name + ' weicht ab — node tools/lpa-england-wales-erzeugen.js');
});

  async function andockenPruefen(spr) {
    const { V, ergebnisse } = await angedockt(spr);
    for (const r of ergebnisse) {
      assert.equal(r.angenommen, true, r.typ + ': ' + r.grund);
      assert.deepEqual(r.verworfene, [], r.typ + ' hat Teile verloren');
    }
    assert.equal(ergebnisse[0].kennung, 'GB-ENG,GB-WLS');
    assert.ok(V.getRechtsraumModulRegistry()['GB-ENG,GB-WLS']['enduring-power-of-attorney']);
    assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'GB-ENG,GB-WLS', 'rechtsgrundlage', 'uri'),
      'https://www.legislation.gov.uk/ukpga/2005/9/section/9');
    const roh = V.getData().rechtsraumModule.find((m) => Array.isArray(m.rechtsraum));
    assert.deepEqual(roh.rechtsraum, ['GB-ENG', 'GB-WLS']);
    assert.equal(roh.quelle.lizenz, 'Open Government Licence v3.0');
    assert.deepEqual(roh.name, { de: 'England und Wales', en: 'England and Wales' }, 'der Anzeigename je Sprache (Feld `name`, U2-ADR-495)');
  }

  async function onlineDienstPruefen(spr) {
    const liste = lies('uebertragungsliste-' + spr + '.json');
    assert.equal(probeOnlineDienstZuerst(liste, spr), true);
    const bereich = lies('bereich-' + spr + '.json').bereiche[E.BEREICH_ID];
    assert.ok(bereich.einfuehrungstext.startsWith(E.B[spr].onlineDienst), 'der Bereich beginnt mit dem Online-Dienst');
    assert.equal(bereich.sektionen[0].id, 'formular');
    assert.ok(bereich.sektionen[0].hint.startsWith(E.B[spr].onlineDienst));
    const { V } = await angedockt(spr);
    const text = dokumentText(V);
    assert.ok(text.indexOf(E.ONLINE_DIENST) >= 0 && text.indexOf(E.ONLINE_DIENST) < text.indexOf('Section 1'),
      'im Dokument steht die Adresse des Dienstes vor dem ersten Abschnitt des Formulars');
  }

  async function sachsaetzePruefen(spr) {
    assert.deepEqual(E.SACHSATZ[spr], SACHSAETZE_ZEICHENGENAU[spr], 'der Erzeuger trägt die Sätze der Gegenlesung nicht zeichengenau');
    const liste = lies('uebertragungsliste-' + spr + '.json');
    assert.equal(probeSachsatz(liste, spr, 'unterschreiben', 9), true, 'Schritt Unterschreiben (Abschnitt 9)');
    assert.equal(probeSachsatz(liste, spr, 'registrieren', 12), true, 'Schritt Registrieren (Abschnitt 12)');
    const sektionen = lies('bereich-' + spr + '.json').bereiche[E.BEREICH_ID].sektionen;
    assert.equal(sektionen.find((s) => s.id === 'section-9').hint, SACHSAETZE_ZEICHENGENAU[spr].unterschreiben);
    assert.equal(sektionen.find((s) => s.id === 'section-12').hint, SACHSAETZE_ZEICHENGENAU[spr].registrieren);
    const { V } = await angedockt(spr);
    const text = dokumentText(V);
    for (const satz of Object.values(SACHSAETZE_ZEICHENGENAU[spr])) assert.ok(text.includes(satz), 'im Dokument fehlt: ' + satz);
  }

  async function keinFormularPruefen(spr) {
    const { V } = await angedockt(spr);
    V.sektorFeldSetzen(E.BEREICH_ID, 'tpl_lpa_formular', 'lp1f');
    V.sektorFeldSetzen(E.BEREICH_ID, 'tpl_lpa_s1_firstNames', 'Anna');
    V.sektorFeldSetzen(E.BEREICH_ID, 'tpl_lpa_s3_how', 'jointly');
    V.sektorFeldSetzen(E.BEREICH_ID, 'tpl_lpa_s2_1_trust', true);
    assert.deepEqual(keinFormularBefund(dokumentText(V), spr), []);
  }

test('[U2-ADR-477·LPA] Rechtsraum, Bereich und Übertragungsliste docken über den echten Einlassweg an, ohne Verwurf (de und en)', async () => { for (const spr of ['de', 'en']) await andockenPruefen(spr); });
test('[U2-ADR-477·LPA] der amtliche Online-Dienst des OPG ist der erste Schritt, mit Adresse (de und en)', async () => { for (const spr of ['de', 'en']) await onlineDienstPruefen(spr); });
test('[U2-ADR-477·LPA] die Sachsätze zu Unterschreiben und Registrieren stehen zeichengenau im Ablauf (de und en)', async () => { for (const spr of ['de', 'en']) await sachsaetzePruefen(spr); });
test('[U2-ADR-477·LPA] die Übertragungsliste ist ein eigenes Dokument, kein Formular, mit Quellenangabe (de und en)', async () => { for (const spr of ['de', 'en']) await keinFormularPruefen(spr); });

test('[U2-ADR-477·LPA] keine Wartefrist nach LP3 als Zahl in irgendeinem der fünf Module', () => {
  const texte = DATEIEN.flatMap((n) => alleTexte(lies(n)));
  assert.ok(texte.length > 500, 'Positivkontrolle: die Texte sind gesammelt');
  assert.equal(probeKeineWartefrist(texte), true);
});

test('[U2-ADR-477·LPA] die Gebühr steht nur mit gov.uk-Adresse und Abrufdatum', () => {
  assert.equal(probeGebuehrMitQuelle(module()), true);
});

test('[U2-ADR-477·LPA] kein Modul fasst die Produkte an: tools/lib/vier-produkte.js nennt die LPA-Dateien nicht', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'tools', 'lib', 'vier-produkte.js'), 'utf8');
  assert.ok(!/lpa-england-wales/.test(text), 'Rechtsinhalt eines fremden Landes geht erst mit einer eigenen Entscheidung über das Produkt in eine Auslieferung');
});

/* ── Rot-Beweise ── */
test('[U2-ADR-477·LPA·Rot-Beweis] ein Sachsatz mit einem anderen Zeichen macht die Probe rot', () => {
  const liste = JSON.parse(JSON.stringify(lies('uebertragungsliste-de.json')));
  const a = liste.abschnitte.find((x) => x.titel.startsWith('Section 9'));
  a.bloecke[0].texte[0] = a.bloecke[0].texte[0].replace('nicht.', 'nicht');
  assert.equal(probeSachsatz(liste, 'de', 'unterschreiben', 9), false);
});

test('[U2-ADR-477·LPA·Rot-Beweis] ein Sachsatz als Randhinweis hinter dem Ablauf macht die Probe rot', () => {
  const liste = JSON.parse(JSON.stringify(lies('uebertragungsliste-en.json')));
  const a = liste.abschnitte.find((x) => x.titel.startsWith('Section 12'));
  a.bloecke.push(a.bloecke.shift());
  assert.equal(probeSachsatz(liste, 'en', 'registrieren', 12), false);
});

test('[U2-ADR-477·LPA·Rot-Beweis] ohne den Schritt „Online-Dienst“ vorn ist die Probe rot', () => {
  const liste = JSON.parse(JSON.stringify(lies('uebertragungsliste-de.json')));
  liste.abschnitte.push(liste.abschnitte.shift());
  assert.equal(probeOnlineDienstZuerst(liste, 'de'), false);
});

test('[U2-ADR-477·LPA·Rot-Beweis] eine eingeschmuggelte Wartefrist macht die Probe rot', () => {
  assert.equal(probeKeineWartefrist(['A person to notify has three weeks to raise concerns.']), false);
  assert.equal(probeKeineWartefrist(['Einwände binnen 4 Wochen.']), false);
});

test('[U2-ADR-477·LPA·Rot-Beweis] die Gebühr ohne Abrufdatum oder ohne Quelle davor macht die Probe rot', () => {
  const m = module();
  const ohneDatum = JSON.parse(JSON.stringify(m));
  delete ohneDatum.rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln.find((r) => /£/.test(r.text)).abgerufen;
  assert.equal(probeGebuehrMitQuelle(ohneDatum), false);
  const ohneQuelle = JSON.parse(JSON.stringify(m));
  const a = ohneQuelle.listeEn.abschnitte.find((x) => x.titel.startsWith('Section 14'));
  for (const b of a.bloecke) if (b.typ === 'immer') b.texte = b.texte.filter((t) => !t.includes(E.GEBUEHR.url));
  assert.equal(probeGebuehrMitQuelle(ohneQuelle), false);
});

test('[U2-ADR-477·LPA·Rot-Beweis] ein Dokument mit Stempelvermerk und ohne Attribution macht die Probe rot', () => {
  const text = 'Transfer list: Lasting power of attorney, England and Wales\nOnly valid with the official stamp here.';
  const befund = keinFormularBefund(text, 'en');
  assert.ok(befund.includes('Anschein amtlichen Status (Stempelvermerk)'));
  assert.ok(befund.includes('die Attribution nach OGL v3.0 fehlt'));
});

/* Proben-Kopplung (Prüfstand U2-ADR-099): jede Klausel-Probe nennt die Funktion, die ihr Urteil trägt. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-477·LPA] der amtliche Online-Dienst des OPG ist der erste Schritt, mit Adresse (de und en)', diskriminante: probeOnlineDienstZuerst },
    { fuer: '[U2-ADR-477·LPA] die Sachsätze zu Unterschreiben und Registrieren stehen zeichengenau im Ablauf (de und en)', diskriminante: probeSachsatz },
    { fuer: '[U2-ADR-477·LPA] die Übertragungsliste ist ein eigenes Dokument, kein Formular, mit Quellenangabe (de und en)', diskriminante: keinFormularBefund },
    { fuer: '[U2-ADR-477·LPA] keine Wartefrist nach LP3 als Zahl in irgendeinem der fünf Module', diskriminante: probeKeineWartefrist },
    { fuer: '[U2-ADR-477·LPA] die Gebühr steht nur mit gov.uk-Adresse und Abrufdatum', diskriminante: probeGebuehrMitQuelle },
  ],
};
