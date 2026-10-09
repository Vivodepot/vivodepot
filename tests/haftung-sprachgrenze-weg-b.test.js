'use strict';
/* Befund HAFTUNG-SPRACHGRENZE (HOCH, 06.10.2026), Weg B mit Einzelwort der Gegenlesung — die Bedingungen des Worts, je mit Rot-Beweis.
   Die Abnahme selbst (Hinweis über die Sprachgrenze, beide Richtungen, Klasse) hält tests/haftung-sprachgrenze.test.js; hier steht, was
   Weg B NICHT darf und wie Weg A aussieht:
     1 nur der VOLLE Abdruck einer früheren Fassung trägt Schutztexte — ein geändertes Byte, auch außerhalb der Schutztexte, nicht;
     2 hat das Produkt für die Sprache ein eigenes Modul, gewinnt es (in beide Richtungen);
     3 ein Abdruck auf der Rücknahme-Liste trägt sie nicht — es gilt der Rückfall mit Sprachangabe (Weg A);
     4 das Vertrauen schaltet nur geschützte Kennungen frei; Sperre und Prüfung sehen weiter eine frühere Fassung, keine laufende;
     F3 die Sprachangabe steht im Textsatz (Schutzliste, jedes Produkt-Sprachmodul) und hängt an jeder Schutz-Kennung im Rückfall.
   Der Rücknahme-Wächter selbst hat eine eigene Probe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'haftung-sprachgrenze-weg-b-pw-2026';
const HAFTUNG = 'strings:dokFussHaftung.text';
const ANGABE = 'strings:rueckfallSprachangabe.text';
const NEU_SEIT_V918 = 'strings:pdfOhneSchriftHinweis.text';   // im laufenden Modul, nicht in v918 (git show b772855d2:tools/textsatz-de-modul.json)
const FIXTURE = (sprache) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mitschrift-fruehere-fassung-v918-textsatz-' + sprache + '.json'), 'utf8'));
const LAUFEND = (sprache) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + sprache + '-modul.json'), 'utf8'));
const ENDONYM = { de: 'Deutsch', en: 'English' };

/* Ein Depot, angelegt im Produkt `anlege`, mit der Mitschrift `mitschrift` in Sprache `sprache`, geöffnet in `oeffne`. `vorher(V)` läuft
   im öffnenden Kern vor dem Öffnen (Rot-Beweise, die am Kern drehen). */
async function oeffnen(anlege, oeffne, sprache, mitschrift, vorher) {
  const Q = ladeKern({ produkt: anlege }).V;
  await Q.depotAnlegen(PW);
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift || {}, { sprache: mitschrift });
  d.textsprache = sprache;
  Q.setData(d);
  const umschlag = await Q.depotSerialisieren();
  const V = ladeKern({ produkt: oeffne }).V;
  if (vorher) await vorher(V);
  await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  return V;
}
const andere = (s) => (s === 'de' ? 'en' : 'de');

test('[Weg B·1] ein geändertes Byte — auch außerhalb der Schutztexte — trägt keinen Schutztext (voller Abdruck, nie Teilabdruck)', async () => {
  for (const sprache of ['de', 'en']) {
    const m = FIXTURE(sprache);
    const frei = Object.keys(m.texte).find((k) => !k.startsWith('dok:') && !k.includes('Haftung') && /^strings:/.test(k));
    m.texte[frei] = m.texte[frei] + ' ';
    const V = await oeffnen('privat-' + sprache, 'privat-' + andere(sprache), sprache, m);
    assert.equal(V.textLesen(HAFTUNG), null, sprache + ': ein Byte in ' + frei + ' — kein Abdruck, kein Schutztext');
    const ungeaendert = await oeffnen('privat-' + sprache, 'privat-' + andere(sprache), sprache, FIXTURE(sprache));
    assert.equal(ungeaendert.textLesen(HAFTUNG), FIXTURE(sprache).texte[HAFTUNG], sprache + ': Gegenprobe — der volle Abdruck trägt ihn');
  }
});

test('[Weg B·2] hat das Produkt ein eigenes Modul der Sprache, gewinnt es — in beide Richtungen', async () => {
  for (const sprache of ['de', 'en']) {
    const V = await oeffnen('privat-' + sprache, 'privat-' + sprache, sprache, FIXTURE(sprache));
    assert.ok(!(NEU_SEIT_V918 in FIXTURE(sprache).texte), 'Vorbedingung: v918 trägt ' + NEU_SEIT_V918 + ' nicht');
    assert.equal(V.textLesen(NEU_SEIT_V918), LAUFEND(sprache).texte[NEU_SEIT_V918], sprache + ': das laufende Modul des Produkts, nicht die Mitschrift');
  }
});

test('[Weg B·3] eine auf der Rücknahme-Liste zurückgezogene Kennung steht im Rückfall mit Sprachangabe (Weg A je Kennung)', async () => {
  for (const sprache of ['de', 'en']) {
    const fp = await ladeKern({ produkt: 'privat-de' }).V._modulRezeptFingerabdruck(FIXTURE(sprache));
    const V = await oeffnen('privat-' + sprache, 'privat-' + andere(sprache), sprache, FIXTURE(sprache), (K) => { K.ABWERK_SCHUTZ_ZURUECKGEZOGEN_KERN.set(fp, [HAFTUNG]); });
    assert.equal(V.textsatzSpracheAktiv(), sprache);
    assert.equal(V.textLesen(HAFTUNG), null, sprache + ': zurückgezogen — der Schutztext der Mitschrift gilt nicht');
    const angezeigt = V.STRINGS.dokFussHaftung;
    assert.ok(angezeigt.endsWith(' [' + ENDONYM[andere(sprache)] + ']'), sprache + ': sichtbarer Rückfall mit Sprachangabe, gemessen: ' + JSON.stringify(angezeigt));
    assert.ok(angezeigt.startsWith(LAUFEND(andere(sprache)).texte[HAFTUNG].slice(0, 12)), sprache + ': der Text des Produkts');
  }
});

test('[Weg B·4] das Vertrauen schaltet nur geschützte Kennungen frei — Regeln, Rechtsraum und alle übrigen Texte gleich', () => {
  const { V } = ladeKern({ produkt: 'privat-de' });
  for (const sprache of ['de', 'en']) {
    const offen = V._textsatzModulPruefenGeruest(FIXTURE(sprache));
    const vertraut = V._textsatzModulPruefenGeruest(FIXTURE(sprache), { vertrauenswuerdig: true });
    const zusatz = Object.keys(vertraut.texte).filter((k) => !(k in offen.texte));
    assert.ok(zusatz.length > 0, 'Vorbedingung: das Vertrauen ändert etwas');
    assert.deepEqual(zusatz.filter((k) => !V._istSchutzKennung(k) && !V._istZusicherungsKennung(k)), [], sprache + ': nur Schutz- und Zusicherungs-Kennungen kommen hinzu');
    for (const k of Object.keys(offen.texte)) assert.equal(vertraut.texte[k], offen.texte[k], sprache + ': ' + k + ' unverändert');
    assert.deepEqual(vertraut.regeln, offen.regeln);
    assert.equal(vertraut.rechtsraum, offen.rechtsraum);
  }
});

test('[Weg B·4] Sperre und Prüfung sehen weiter eine FRÜHERE Fassung, keine laufende', async () => {
  for (const sprache of ['de', 'en']) {
    const V = await oeffnen('privat-' + sprache, 'privat-' + andere(sprache), sprache, FIXTURE(sprache));
    const m = V.getData().abWerkMitschrift.sprache;
    assert.equal(V._abWerkFruehereSchutz(m), true, sprache + ': als frühere Fassung mit geltendem Schutztext erkannt');
    assert.equal(V._abWerkGleich(m), false, sprache + ': nicht „ab Werk laufend“');
    assert.equal(V._abWerkHerkunft(m), true, sprache + ': Herkunft ab Werk (frühere Fassung)');
    assert.equal(V.gesperrteDepotModule().length, 0);
  }
});

test('[Weg B·F3] ein Schutztext, den die Mitschrift nicht trägt, steht im Rückfall mit Sprachangabe — nicht still in der anderen Sprache', async () => {
  for (const sprache of ['de', 'en']) {
    const V = await oeffnen('privat-' + sprache, 'privat-' + andere(sprache), sprache, FIXTURE(sprache));
    assert.ok(V._istSchutzKennung(NEU_SEIT_V918), 'Vorbedingung: Schutz-Kennung');
    const angezeigt = V.STRINGS.pdfOhneSchriftHinweis;
    assert.equal(angezeigt, LAUFEND(andere(sprache)).texte[NEU_SEIT_V918] + ' [' + ENDONYM[andere(sprache)] + ']', sprache + ': gemessen ' + JSON.stringify(angezeigt));
  }
});

test('[Weg B·F3] die Sprachangabe steht im Textsatz: Schutzliste, jedes Produkt-Sprachmodul, mit {sprache}', () => {
  for (const produkt of ['privat-de', 'privat-en', 'pro-de', 'pro-en']) {
    const { V } = ladeKern({ produkt });
    assert.ok(V._istSchutzKennung(ANGABE), produkt + ': auf der Schutzliste — ein Modul darf sie nicht ersetzen');
    const t = V.AB_WERK_SPRACHE_PRODUKT && V.AB_WERK_SPRACHE_PRODUKT.texte[ANGABE];
    assert.ok(typeof t === 'string' && t.includes('{sprache}'), produkt + ': im Produkt-Sprachmodul, mit Platzhalter');
  }
  for (const sprache of ['de', 'en']) assert.ok(LAUFEND(sprache).texte[ANGABE].includes('{sprache}'), sprache + '-Modul');
});

test('[Weg B·F3·Rot] ein Modul im Fach kann die Sprachangabe nicht setzen', () => {
  const { V } = ladeKern({ produkt: 'privat-en' });
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte: { [ANGABE]: '(geprüft)' } });
  assert.deepEqual(r.verworfene.filter((v) => v.kennung === ANGABE).map((v) => v.grund), ['schutz']);
});

/* Der Leseweg der Sprachangabe (07.10.2026, Einzelwort der Gegenlesung zu tote-strings DYNAMISCH_ERREICHBAR): sie wird über
   textLesen gelesen, nie über STRINGS. Sie ist selbst eine Schutz-Kennung; über STRINGS liefe sie durch den Rückfall, der sie
   anhängt, und hinge sich endlos an. Rot-Beweis: derselbe Fall an einer Kernkopie, die über STRINGS liest. */
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESE_ZEILE = '  try { vorlage = textLesen(K); } catch (_) { vorlage = null; }';
test('[Weg B·F3·Leseweg] die Sprachangabe wird über textLesen gelesen, nicht über STRINGS', () => {
  const a = KERN_TEXT.indexOf('function _textsatzRueckfallSprachangabe(');
  const rumpf = KERN_TEXT.slice(a, KERN_TEXT.indexOf('\n}\n', a));
  assert.ok(rumpf.includes(LESE_ZEILE), 'textLesen(K) im Rumpf');
  assert.ok(!/\bSTRINGS\.rueckfallSprachangabe\b/.test(rumpf), 'kein STRINGS-Zugriff');
});
test('[Weg B·F3·Leseweg·Rot] über STRINGS gelesen hängt sich die Sprachangabe mehrfach an', async () => {
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprachangabe-leseweg-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, KERN_TEXT.replace(LESE_ZEILE, '  try { vorlage = STRINGS.rueckfallSprachangabe; } catch (_) { vorlage = null; }'));
    const Q = ladeKern({ produkt: 'privat-de' }).V;
    await Q.depotAnlegen(PW);
    const d = JSON.parse(JSON.stringify(Q.getData()));
    d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift || {}, { sprache: FIXTURE('de') });
    d.textsprache = 'de';
    Q.setData(d);
    const umschlag = await Q.depotSerialisieren();
    const V = ladeKern({ produkt: 'privat-en', htmlPfad: pfad, backen: true }).V;
    await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
    const angezeigt = String(V.STRINGS.pdfOhneSchriftHinweis);
    assert.ok(angezeigt.split('[English]').length - 1 > 1, 'die Kopie zeigt die Schleife: ' + angezeigt.slice(-80));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* Dokument-Wortlaute (07.10.2026, Wort der Gegenlesung): ein Wortlaut im `dok:`-Raum bleibt im Rückfall byte-gleich mit seiner Quelle
   (U2-ADR-025); die Sprache nennt der eigene Hinweis im Dokumentkopf. Der Haftungshinweis (strings:) trägt die Angabe weiter im Text.
   Gemessen in einer Testsprache ohne Ab-Werk-Modul, die weder den Wortlaut noch den Haftungshinweis trägt. */
async function inTestsprache(kernOpts) {
  const V = ladeKern(kernOpts).V;
  const d = V.leeresDepot();
  d.textsprache = 'zz';
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  const g = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'zz', moduleVersion: 1, anbieterId: 'pruefstoff', texte: { 'strings:appTagline.text': 'zz' } }, { vertrauenswuerdig: true });
  V._TEXTSATZ_MODUL_REGISTRY.zz = Object.create(null);
  V._TEXTSATZ_MODUL_REGISTRY.zz[''] = g.texte;
  V.textsatzNeuAnwenden();
  return V;
}
const DOK_WORTLAUT = () => Object.keys(LAUFEND('de').texte).find((k) => k.startsWith('dok:patientenverfuegung#') && /\.(text|satz|einleitung)$/.test(k));
const SEKTIONSTITEL = () => Object.keys(LAUFEND('de').texte).find((k) => k.startsWith('pvBmj#') && k.endsWith('.sektion'));
test('[Weg B·Wortlaut] ein Dokument-Wortlaut und ein amtlicher Sektionstitel stehen im Rückfall byte-gleich mit seiner Quelle; der Haftungshinweis trägt die Angabe', async () => {
  const V = await inTestsprache({ produkt: 'privat-de' });
  const k = DOK_WORTLAUT();
  assert.ok(k && V._istSchutzKennung(k), 'Vorbedingung: ein geschützter Dokument-Wortlaut ' + k);
  assert.equal(V.textLesen(k), null, 'Vorbedingung: die Testsprache trägt ' + k + ' nicht');
  assert.equal(V._textsatzRueckfall(k), LAUFEND('de').texte[k], k + ': byte-gleich, keine Angabe im Text');
  const t = SEKTIONSTITEL();
  assert.ok(t && V._istSchutzKennung(t), 'Vorbedingung: ein geschützter amtlicher Sektionstitel ' + t);
  assert.equal(V._textsatzRueckfall(t), LAUFEND('de').texte[t], t + ': byte-gleich, keine Angabe im Text');
  assert.match(String(V._textsatzRueckfall(HAFTUNG)), / \[(Deutsch|English)\]$/, 'der Haftungshinweis nennt seine Sprache');
});
test('[Weg B·Wortlaut·Rot] ohne die Ausnahme für Dokument-Wortlaute stünde die Angabe im Wortlaut', async () => {
  const zeile = "      if (geschuetzt || (_istSchutzKennung(kennung) && _istOberflaechenKennung(kennung))) text += ' ' + _textsatzRueckfallSprachangabe(s);";
  assert.ok(KERN_TEXT.includes(zeile), 'die Zeile steht im Kern');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wortlaut-rueckfall-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, KERN_TEXT.replace(zeile, "      if (geschuetzt || _istSchutzKennung(kennung)) text += ' ' + _textsatzRueckfallSprachangabe(s);"));
    const V = await inTestsprache({ produkt: 'privat-de', htmlPfad: pfad, backen: true });
    const k = DOK_WORTLAUT();
    assert.match(String(V._textsatzRueckfall(k)), / \[(Deutsch|English)\]$/, 'die Kopie hängt die Angabe an den Wortlaut');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* Lese-App: dieselbe Grenze. Ein Deutsch-Modul ist dort reserviert (die eingebaute Sprache gewinnt) — gemessen wird die englische Mitschrift,
   an jeder Schutz-Kennung, die die Lese-App kennt (den Dokumentfuß des Kerns zeigt sie nicht; `_textsatzKennungBekannt`). */
async function leseOeffnen(mitschrift, vorher) {
  const { V, sandbox } = ladeLesen();
  if (vorher) vorher(sandbox);
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {},
    sektoren: { identity: { givenName: 'Hedwig', familyName: 'Muster' } }, textsprache: 'en', abWerkMitschrift: { sprache: mitschrift } };
  V.setData(await V._depotUebernehmenGeprueft(obj));
  sandbox.__kennungen = Object.keys(FIXTURE('en').texte);
  const schutz = vm.runInContext('__kennungen.filter((k) => _istSchutzKennung(k) && _textsatzKennungBekannt(k))', sandbox);
  return { V, schutz: Array.from(schutz) };
}
test('[Weg B·Lese-App] die englische v918-Mitschrift trägt ihre Schutztexte; ein Byte anders oder zurückgezogen nicht', async () => {
  const { V, schutz } = await leseOeffnen(FIXTURE('en'));
  assert.ok(schutz.length >= 1, 'Vorbedingung: die Lese-App kennt Schutz-Kennungen der Mitschrift');
  const fp0 = await ladeKern({ produkt: 'privat-de' }).V._modulRezeptFingerabdruck(FIXTURE('en'));
  const zurueck = vm.runInContext('Array.from(ABWERK_SCHUTZ_ZURUECKGEZOGEN_LESEN.get(' + JSON.stringify(fp0) + ') || [])', ladeLesen().sandbox);
  assert.deepEqual(schutz.filter((k) => !zurueck.includes(k) && V.textLesen(k) !== FIXTURE('en').texte[k]), [], 'voller Abdruck einer früheren Fassung: jeder nicht zurückgezogene Schutztext gilt');
  assert.deepEqual(schutz.filter((k) => zurueck.includes(k) && V.textLesen(k) !== null), [], 'eine zurückgezogene Kennung gilt nicht');
  const m = FIXTURE('en'); m.moduleVersion = m.moduleVersion + 1;
  const B = await leseOeffnen(m);
  assert.deepEqual(B.schutz.filter((k) => B.V.textLesen(k) !== null), [], 'kein Abdruck: kein Schutztext');
  const fp = await ladeKern({ produkt: 'privat-de' }).V._modulRezeptFingerabdruck(FIXTURE('en'));
  const Z = await leseOeffnen(FIXTURE('en'), (sb) => vm.runInContext('ABWERK_SCHUTZ_ZURUECKGEZOGEN_LESEN.set(' + JSON.stringify(fp) + ', ' + JSON.stringify(schutz) + ')', sb));
  assert.deepEqual(Z.schutz.filter((k) => Z.V.textLesen(k) !== null), [], 'jede Kennung zurückgezogen: kein Schutztext');
  const eine = schutz.find((k) => !zurueck.includes(k));
  const E = await leseOeffnen(FIXTURE('en'), (sb) => vm.runInContext('ABWERK_SCHUTZ_ZURUECKGEZOGEN_LESEN.set(' + JSON.stringify(fp) + ', ' + JSON.stringify([eine]) + ')', sb));
  assert.equal(E.V.textLesen(eine), null, 'die zurückgezogene Kennung gilt nicht');
  assert.deepEqual(E.schutz.filter((k) => k !== eine && !zurueck.includes(k) && E.V.textLesen(k) !== FIXTURE('en').texte[k]), [], 'je Kennung: die übrigen Schutztexte gelten weiter');
});

