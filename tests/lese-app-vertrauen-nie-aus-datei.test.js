'use strict';
/* Schutz-Wagen S2, Lese-App-Zwilling (05.10.2026, Zweitlesung). Die Lese-App hat keine eigene Belegprüfung für
   Angehörigen-Vorlagen und Situationen. Bis hierher galt dort ein Modul der Datei als geprüft, wenn es selbst
   `ungeprueft: false` trug, und ersetzte dann ein Blatt gleicher ID aus der Mitschrift des Produkts. Die Datei liegt in der
   Hand des Absenders: ein Modul der Datei ist in der Lese-App immer ungeprüft und ersetzt nie ein Blatt der Mitschrift.
   Befund LESE-APP-VERTRAUEN-AUS-DATEI. Diese Probe hält den Einzelfall; die Klasse (jede Lesestelle eines Vertrauensfelds in
   Lese-App und Kern) hält tests/vertrauen-nie-aus-selbstauskunft.test.js, mit dem alten Stand dieser Stelle als Rot-Beweis. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const HTML = fs.readFileSync(LESEN_PATH, 'utf8');

const eintrag = (quelle, feld) => ({ quelle, feld });
const blatt = (titel) => ({ titel, icon: 'users', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [eintrag('identity', 'givenName')] }] });
const VORLAGE = (titel, extra) => Object.assign({ modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
  rechtsraum: 'DE', rechtsraumName: 'Deutschland', situationen: { 'krankenhaus-de': blatt(titel) } }, extra || {});
const SITUATION = (titel, extra) => Object.assign({ modulTyp: 'situation', moduleVersion: 1, herkunft: 'probe', sprache: 'de',
  situationen: { 'probe-blatt': blatt(titel) } }, extra || {});
const SELBSTAUSKUENFTE = [{ ungeprueft: false }, { ungeprueft: false, pruefstufe: 'intern', anbieterIdGeprueft: true },
  { ungeprueft: false, abWerk: true, beleg: { providerCredentialJws: 'x', modulSignaturJws: 'y' } }];

function oeffnen(extra) {
  const { V } = ladeLesen();
  const obj = Object.assign({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {},
    sektoren: { identity: { givenName: 'Hedwig', familyName: 'Muster' } } }, extra || {});
  V._foldVollmachtenLesen(obj);
  V.setData(obj);
  return V;
}
/* Wie beim echten Öffnen: erst die Inhaltsprüfung (ab Werk nach Fingerabdruck), dann die Anmeldung. */
async function oeffnenGeprueft(extra) {
  const { V } = ladeLesen();
  const obj = Object.assign({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {},
    sektoren: { identity: { givenName: 'Hedwig', familyName: 'Muster' } } }, extra || {});
  V.setData(await V._depotUebernehmenGeprueft(obj));
  return V;
}
/* Die echte Mitschrift eines frisch angelegten Depots des Standard-Produkts: nach Inhalt ab Werk. */
let _echt = null;
function echteMitschrift() {
  if (!_echt) {
    _echt = (async () => {
      const { V: K } = ladeKern();
      await K.depotAnlegen('pw-mitschrift-echt-1');
      K.akteurSelbstErklaeren('M');
      return JSON.parse(JSON.stringify(K.ankerDaten().abWerkMitschrift));
    })();
  }
  return _echt.then((m) => JSON.parse(JSON.stringify(m)));
}
const ANG_ID = 'krankenhausakut';
const SIT_ID = 'notar';

for (const selbst of SELBSTAUSKUENFTE) {
  test('[Lese-App·Angehörige·Rot-Beweis] eine Datei-Vorlage ersetzt kein Blatt der Mitschrift, auch mit ' + JSON.stringify(selbst), async () => {
    const ms = await echteMitschrift();
    const original = ms.angehoerigen[0].situationen[ANG_ID].titel;
    const faelschung = Object.assign(VORLAGE('Fälschung', selbst), { situationen: { [ANG_ID]: blatt('Fälschung') } });
    const V = await oeffnenGeprueft({ abWerkMitschrift: { angehoerigen: ms.angehoerigen }, angehoerigenVorlagenModule: [faelschung] });
    const treffer = Array.from(V.angehoerigenSituationenAlleLesen()).filter((s) => s.id === ANG_ID);
    assert.equal(treffer.length, 1);
    assert.equal(treffer[0].titel, original);
    assert.equal(treffer[0].ungeprueft, false, 'das Blatt der Mitschrift bleibt das des Produkts');
  });
  test('[Lese-App·Situation·Rot-Beweis] ein Datei-Situationsmodul ersetzt kein Blatt der Mitschrift, auch mit ' + JSON.stringify(selbst), async () => {
    const ms = await echteMitschrift();
    const original = ms.situationen[0].situationen[SIT_ID].titel;
    const V = await oeffnenGeprueft({ abWerkMitschrift: { situationen: ms.situationen },
      situationsModule: [Object.assign(SITUATION('Fälschung', selbst), { situationen: { [SIT_ID]: blatt('Fälschung') } })] });
    const treffer = Array.from(V.situationenAlleLesen()).filter((s) => s.id === SIT_ID);
    assert.equal(treffer.length, 1);
    assert.equal(treffer[0].titel, original);
    assert.equal(treffer[0].ungeprueft, false);
  });
}

/* Befund MITSCHRIFT-AB-WERK-NACH-POSITION (05.10.2026): die Mitschrift steht in der Datei. Ein Eintrag, den der Fingerabdruck nicht als
   ab Werk erkennt, ist ungeprüft wie jedes Modul der Datei — auch wenn er an der Stelle der Mitschrift steht. */
test('[Lese-App·Mitschrift·Befund] ein Mitschrift-Eintrag, der nach Inhalt nicht ab Werk ist, trägt die Marke „ungeprüft“', async () => {
  const V = await oeffnenGeprueft({ abWerkMitschrift: { angehoerigen: [VORLAGE('Untergeschoben')], situationen: [SITUATION('Untergeschoben')] } });
  const ang = Array.from(V.angehoerigenSituationenAlleLesen()).find((s) => s.id === 'krankenhaus-de');
  const sit = Array.from(V.situationenAlleLesen()).find((s) => s.id === 'probe-blatt');
  assert.ok(ang && sit, 'beide erscheinen');
  assert.equal(ang.ungeprueft, true);
  assert.equal(sit.ungeprueft, true);
  assert.match(V.situationContentHTML('probe-blatt'), /angehoerigen-ungeprueft/);
});

test('[Lese-App·Mitschrift·Befund·Gegenprobe] die echte Mitschrift des Produkts bleibt unmarkiert', async () => {
  const ms = await echteMitschrift();
  const V = await oeffnenGeprueft({ abWerkMitschrift: { angehoerigen: ms.angehoerigen, situationen: ms.situationen } });
  assert.ok(Array.from(V.angehoerigenSituationenAlleLesen()).every((s) => s.ungeprueft === false));
  assert.ok(Array.from(V.situationenAlleLesen()).every((s) => s.ungeprueft === false));
});

test('[Lese-App·Mitschrift·Befund·Rot-Beweis] der alte Stand „nach Position“ läßt den untergeschobenen Eintrag unmarkiert', async () => {
  const neu = '    const istAbWerk = i < mitschrift.length && _abWerkHerkunftLesen(m);';
  assert.equal(HTML.split(neu).length, 3, 'Vorbedingung: beide Stellen (Angehörige, Situationen)');
  const { V } = ladeLesen({ html: HTML.split(neu).join('    const istAbWerk = i < mitschrift.length;') });
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    abWerkMitschrift: { angehoerigen: [VORLAGE('Untergeschoben')], situationen: [SITUATION('Untergeschoben')] } };
  V.setData(await V._depotUebernehmenGeprueft(obj));
  assert.equal(Array.from(V.angehoerigenSituationenAlleLesen()).find((s) => s.id === 'krankenhaus-de').ungeprueft, false);
  assert.equal(Array.from(V.situationenAlleLesen()).find((s) => s.id === 'probe-blatt').ungeprueft, false,
    'der alte Stand macht den Eintrag zum Produktblatt — genau das fängt die Probe oben');
});

test('[Lese-App·Gegenprobe] ein Datei-Modul mit neuer ID erscheint, als ungeprüft', () => {
  const V = oeffnen({ situationsModule: [SITUATION('Neu', { ungeprueft: false })] });
  const s = Array.from(V.situationenAlleLesen()).find((x) => x.id === 'probe-blatt');
  assert.ok(s, 'das Blatt erscheint');
  assert.equal(s.ungeprueft, true, 'eine Selbstauskunft macht es nicht geprüft');
});

/* Befund MITSCHRIFT-AB-WERK-NACH-POSITION, Weg 2: die Herkunftszählung. Ein fremdes Logikmodul, in `abWerkMitschrift.logikModul`
   untergebracht, erscheint als Erweiterung (ungeprüft bzw. unbekannt), nie als Teil des Produkts. */
const FREMDES_LOGIKMODUL = { modulTyp: 'logikModul', id: 'untergeschoben', titel: 'Untergeschoben', sektor: 'advanceCare', herkunft: 'vivodepot',
  abschnitte: [], ungeprueft: false, pruefstufe: 'intern' };
test('[Lese-App·Mitschrift·Befund·Zählung] ein fremdes Modul in der Mitschrift wird gezählt und gilt nie als geprüft', async () => {
  const ms = await echteMitschrift();
  const V = await oeffnenGeprueft({ abWerkMitschrift: Object.assign(ms, { logikModul: ms.logikModul.concat([FREMDES_LOGIKMODUL]) }) });
  const h = V.modulHerkunftBerechnen(V.getData());
  assert.equal(h.ungeprueft + h.unbekannt, 1, JSON.stringify(h.module));
  assert.equal(h.geprueft, 0);
  assert.equal(V.modulHerkunftGiltAlsGeprueft(h), false);
  assert.ok(h.module.some((x) => x.slot === 'abWerkMitschrift.logikModul'));
});

test('[Lese-App·Mitschrift·Befund·Zählung·Gegenprobe] die echte Mitschrift aller vier Produkte zählt nichts', async () => {
  const { produktHtml, kernAus } = require('./produkt-html-erzeugen.js');
  for (const p of ['privat-de', 'pro-de', 'privat-en', 'pro-en']) {
    const k = kernAus(produktHtml(p));
    await k.V.depotAnlegen('pw-mitschrift-' + p);
    k.V.akteurSelbstErklaeren('M');
    const V = await oeffnenGeprueft({ abWerkMitschrift: JSON.parse(JSON.stringify(k.V.ankerDaten().abWerkMitschrift)) });
    const h = V.modulHerkunftBerechnen(V.getData());
    assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0, p + ': ' + JSON.stringify(h.module));
  }
});

test('[Lese-App·Mitschrift·Befund·Zählung·Rot-Beweis] der alte Stand ohne Mitschrift-Zählung läßt das fremde Modul verschwinden', async () => {
  const a = '    for (const art of MITSCHRIFT_ARTEN_NACH_INHALT_LESEN) {';
  assert.equal(HTML.split(a).length, 2, 'Vorbedingung');
  const { V } = ladeLesen({ html: HTML.replace(a, '    for (const art of []) {') });
  const ms = await echteMitschrift();
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    abWerkMitschrift: Object.assign(ms, { logikModul: ms.logikModul.concat([FREMDES_LOGIKMODUL]) }) };
  V.setData(await V._depotUebernehmenGeprueft(obj));
  const h = V.modulHerkunftBerechnen(V.getData());
  assert.equal(h.ungeprueft + h.unbekannt, 0, 'der alte Stand zählt es nicht — genau das fängt die Probe oben');
});

/* Befund ABWERK-ABDRUCK-VERLUST-ZWISCHEN-FASSUNGEN (05.10.2026): ein Modul, dessen Inhalt einer FRÜHER ausgelieferten Fassung entspricht,
   ist ab Werk für die Herkunft (keine Warnung, keine Zählung als Erweiterung), aber nicht für den Schutz: Schutz-Kennungen gelten aus
   der laufenden Fassung, still. Die frühere Fassung wird hier mit einem geänderten Schutz-Text nachgestellt und ihr Abdruck in eine
   Probe-Kopie der Region gesetzt — echte frühere Fassungen tragen bisher dieselben Schutz-Texte wie die laufende. */
async function fruehereFassungMitAnderemSchutzText(variante) {
  const roh = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8'));
  const { V: L0 } = ladeLesen();
  const kennung = Object.keys(roh.texte).find((k) => L0._istSchutzKennung && L0._istSchutzKennung(k));
  assert.ok(kennung, 'Vorbedingung: das Modul trägt eine Schutz-Kennung');
  const modul = Object.assign({}, roh, { sprache: 'fr', texte: Object.assign({}, roh.texte, { [kennung]: 'ÜBERHOLTER SCHUTZTEXT' }) });
  const fp = await L0._modulRezeptFingerabdruck(JSON.parse(JSON.stringify(modul)));
  const region = 'const ABWERK_FRUEHERE_FASSUNGEN_LESEN = new Set([\n';
  assert.equal(HTML.split(region).length, 2, 'Vorbedingung: die Region steht genau einmal');
  let html = HTML.replace(region, region + '  "' + fp + '",\n');
  if (variante) html = variante(html);
  const { V } = ladeLesen({ html });
  const obj = { schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
    textsatzModule: [JSON.parse(JSON.stringify(modul))] };
  V.setData(await V._depotUebernehmenGeprueft(obj));
  return { V, m: V.getData().textsatzModule[0], kennung };
}
test('[Frühere Fassung·Lese-App·Befund] Herkunft ja, Schutz nein: kein überholter Schutz-Text, keine Warnung, nicht als Erweiterung gezählt', async () => {
  const { V, m, kennung } = await fruehereFassungMitAnderemSchutzText();
  assert.equal(V._abWerkHerkunftLesen(m), true);
  assert.equal(V._textsatzSchutzVertraut(m), false);
  assert.ok(!V._verwuerfeLesen().some((v) => v.grund === 'schutz'), 'still: keine Verlustmeldung für den Schutz-Text');
  const h = V.modulHerkunftBerechnen(V.getData());
  assert.equal(h.geprueft + h.ungeprueft + h.unbekannt, 0, 'zählt nicht als Erweiterung');
  V.textsatzSpracheAktiv && V.textsatzSpracheAktiv();
  assert.notEqual(V.textLesen(kennung), 'ÜBERHOLTER SCHUTZTEXT');
});
test('[Frühere Fassung·Lese-App·Befund·Rot-Beweis] ein Stand, der der früheren Fassung den Schutz glaubt, ließe den überholten Text zu', async () => {
  const a = "  return _abWerkGleichLesen(m) || _textsatzPruefstufeFuerSchutz(m) === 'intern';";
  assert.equal(HTML.split(a).length, 2, 'Vorbedingung');
  const { V, m } = await fruehereFassungMitAnderemSchutzText((h) => h.replace(a, "  return _abWerkHerkunftLesen(m) || _textsatzPruefstufeFuerSchutz(m) === 'intern';"));
  assert.equal(V._textsatzSchutzVertraut(m), true, 'der falsche Stand vertraut — genau das fängt die Probe oben');
});
