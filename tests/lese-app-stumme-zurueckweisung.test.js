'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Stumme Zurückweisungen in der Lese-App (22.09.2026) — „die Datei geht auf, der Inhalt fehlt, und nichts
   sagt der Bürgerin, dass etwas fehlte".

   DIE DREI STELLEN (vivodepot-lesen.html):
     1. logikModulAbschnitteHTML     `if (!geprueft.gueltig) continue;` — ein ungültiges Logik-Modul, keine Spur.
     2. _textsatzModuleAusDepotAnmelden  dasselbe `continue` für ein ungültiges Sprachmodul (und die stille
                                     Auslassung eines ungültigen Mitschrift-Sprachmoduls davor).
     3. ANGEHOERIGEN_VORLAGEN_VERWORFEN_LESEN wird gefüllt und von keinem Anwendungscode gelesen.
   Der Lücken-Hinweis (`_darstellungsLuecken` / `_lueckenBlockHTML`) kannte nur Bereichs-Module und zählte dabei
   auch Verwürfe, die nichts verlieren.

   DIE VIERTE PROBE IST DIE WICHTIGSTE, und sie steht hier aus einem Grund. Der Hinweis „Nicht darstellbar: Diese Datei
   trägt 52 Erweiterung(en) …" erschien bei JEDER Privat-DE-Produktdatei, und die Gegenprobe „ohne Anlass kein Hinweis"
   (tests/lese-app-darstellungsluecke-hinweis.test.js) blieb grün, weil ihr Gegenstand ein SYNTHETISCHES Depot ist:
   `{ sektoren: { identitaet: {} } }` trägt keine Ab-Werk-Mitschrift, und die Mitschrift ist genau der Ort, an dem
   ein echtes Produkt seine 13 Bereiche mitbringt. Eine synthetische Fixtur kann diesen Fall nicht sehen. Darum
   nimmt die Gegenprobe hier eine Datei, die ein ECHTES Produkt geschrieben hat. Wer sie durch eine bequemere
   synthetische ersetzt, baut den blinden Fleck wieder ein.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');
const { depotImProduktAnlegen } = require('./produkt-html-erzeugen.js');

const PW = 'stumme-zurueckweisung-pw-2026!';

/* Ein Depot durch den echten Trichter der Lese-App (Folds + Anmeldung aller Register). */
function offnen(extra) {
  const { V } = ladeLesen();
  V.setData(Object.assign({ sektoren: { identity: {} }, feldDefinitionen: [], sensibelFelder: {} }, extra));
  V._foldVollmachtenLesen(V.getData());
  return V;
}
const verlusteVon = (V) => V._darstellungsLuecken(V.getData());

/* ── (1) ein ungültiges Logik-Modul ────────────────────────────────────────────────────────────── */

const LOGIK_KAPUTT = {
  id: 'kaputt-logikmodul', titel: 'Ein kaputtes Logik-Modul', sektor: 'identity', herkunft: 'test',
  datenSchema: {}, abschnitte: [], dokAusgabe: { h1: 'Titel' },   // abschnitte leer → ungültig
};

test('[Stumm·1] ein ungültiges Logik-Modul für einen vorhandenen Bereich hinterlässt eine Spur: Hinweis sichtbar, Grund benannt', () => {
  const V = offnen({ logikModule: [LOGIK_KAPUTT] });
  V.sektorHTML('identity');   // der Renderweg, an dem das `continue` sitzt
  assert.ok(verlusteVon(V).modulAnzahl >= 1, 'der Hinweis zählt das Modul, das nicht dargestellt wird');
  assert.ok(V.sidebarHTML().includes('luecken-hinweis'), 'die Bürgerin sieht, dass etwas fehlt');
  const spur = (V._verwuerfeLesen ? V._verwuerfeLesen() : []).filter((x) => x.art === 'logik');
  assert.equal(spur.length, 1, 'genau eine Spur');
  assert.equal(spur[0].id, 'kaputt-logikmodul');
  assert.equal(spur[0].grund, 'abschnitte', 'der Grund steht dabei, nicht nur „ungültig"');
});

/* ── (2) ein ungültiges Sprachmodul ────────────────────────────────────────────────────────────── */

test('[Stumm·2] ein ungültiges Sprachmodul der Datei hinterlässt eine Spur: Hinweis sichtbar, Grund benannt', () => {
  const V = offnen({ textsatzModule: [{ sprache: 'fr', moduleVersion: 0, texte: {} }] });
  assert.ok(verlusteVon(V).modulAnzahl >= 1);
  assert.ok(V.sidebarHTML().includes('luecken-hinweis'));
  const spur = (V._verwuerfeLesen ? V._verwuerfeLesen() : []).filter((x) => x.art === 'sprache');
  assert.equal(spur.length, 1);
  assert.equal(spur[0].id, 'fr');
  assert.equal(spur[0].grund, 'moduleVersion');
});

test('[Stumm·2b] auch das ungültige Sprachmodul der Ab-Werk-Mitschrift (die Auslassung VOR der Schleife) hinterlässt eine Spur', () => {
  const V = offnen({ abWerkMitschrift: { sprache: { sprache: 'fr', moduleVersion: 0, texte: {} } } });
  assert.ok(verlusteVon(V).modulAnzahl >= 1);
  const spur = (V._verwuerfeLesen ? V._verwuerfeLesen() : []).filter((x) => x.art === 'sprache-mitschrift');
  assert.equal(spur.length, 1);
  assert.equal(spur[0].grund, 'moduleVersion');
});

/* ── (3) eine verworfene Angehörigen-Vorlage: die Liste hat jetzt einen Leser ──────────────────── */

test('[Stumm·3] eine verworfene Angehörigen-Vorlage erscheint im Hinweis (die Liste wurde gefüllt und von niemandem gelesen)', () => {
  const V = offnen({ angehoerigenVorlagenModule: [{ modulTyp: 'angehoerigenVorlage' }] });
  assert.ok(V.ANGEHOERIGEN_VORLAGEN_VERWORFEN_LESEN.length >= 1, 'Vorbedingung: die Vorlage wurde wirklich verworfen');
  assert.ok(verlusteVon(V).modulAnzahl >= 1, 'ein Leser im Anwendungscode zählt sie');
  assert.ok(V.sidebarHTML().includes('luecken-hinweis'));
});

/* ── Die Grenze „nur Verluste zählen" — was KEIN Anlass für den Hinweis ist ────────────────────── */

test('[Stumm·Grenze] ein leeres Bereichs-Modul, ein ignorierter Schlüssel und ein bewusst nicht angenommener Zusicherungssatz sind in der Spur, aber kein Anlass für den Hinweis', () => {
  const V = offnen({ bereichsModule: [{ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'leer-test', bereiche: {}, ausserhalbDesFormats: 1 }] });
  const gruende = V._verwuerfeLesen().map((x) => x.grund).sort();
  assert.deepEqual([...gruende], ['leer', 'unbekannt'], 'beide stehen in der Spur, mit Grund');
  assert.equal(verlusteVon(V).modulAnzahl, 0, 'aber es geht nichts verloren');
  assert.equal(V.sidebarHTML().includes('luecken-hinweis'), false);
});

test('[Stumm·Grenze] ein unbekannter Grund gilt als Verlust (Unbekanntes gilt als Inhalt)', () => {
  const V = offnen({});
  V.MODUL_VERWURF_SPUR_LESEN.push({ art: 'logik', id: 'x', grund: 'ein-grund-den-keiner-kennt' });
  assert.equal(verlusteVon(V).modulAnzahl, 1);
});

/* ── (4) die Gegenprobe an ECHTEN Produktdateien ───────────────────────────────────────────────── */

async function produktdateiOeffnen(slug) {
  const { umschlag } = await depotImProduktAnlegen(slug, PW);
  const { V } = ladeLesen();
  const obj = await V.leseDepotUmschlag(JSON.parse(JSON.stringify(umschlag)), PW);
  V.setData(V._foldVollmachtenLesen(obj));
  return V;
}

for (const slug of ['privat-de', 'privat-en', 'pro-de', 'pro-en']) {
  test('[Stumm·4·Gegenprobe] eine Datei, die das Produkt ' + slug + ' geschrieben hat, erzeugt KEINEN Hinweis „nicht darstellbar"', async () => {
    const V = await produktdateiOeffnen(slug);
    assert.ok(V.bereicheAlleLesen().length >= 7, 'Vorbedingung: die Datei ist wirklich geöffnet und trägt ihre Bereiche');
    const l = verlusteVon(V);
    assert.equal(l.modulAnzahl, 0, 'nichts geht verloren, also zählt der Hinweis nichts (gemessen vor dem Fix: 52)');
    assert.equal(l.bereichIds.length, 0);
    assert.equal(V.sidebarHTML().includes('luecken-hinweis'), false);
  });
}

/* ── (5) die Grundlinie der bekannten Verwürfe, gegen echte Produktdateien ─────────────────────── */
/* Nicht „es gibt Verwürfe", sondern „es gibt mehr als die bekannten". Ein Rauschen von 26 Zeilen bei jedem Öffnen ist der Ort,
   an dem ein echter Verwurf nicht auffällt; darum steht das Rauschen mit Zahl und Erklärung in tests/fixtures/lese-app-bekannte-verwuerfe.json.
   Die Grundlinie gilt für Dateien, die ein ECHTES Produkt geschrieben hat: eine synthetische Fixtur kann diese Zahlen nicht erzeugen,
   und gerade darum hatte der Hinweis „52 Erweiterungen" niemand gesehen. */
const BEKANNT = require('./fixtures/lese-app-bekannte-verwuerfe.json');

function zaehlen(V) {
  const z = {};
  for (const v of V._verwuerfeLesen()) { const k = v.art + '|' + v.grund; z[k] = (z[k] || 0) + 1; }
  return z;
}
/** @returns {string[]} die Abweichungen: mehr, weniger, neu */
function abweichungen(ist, bekannt) {
  const raus = [];
  for (const k of Object.keys(ist)) {
    if (!(k in bekannt)) raus.push('NEU ' + k + ' × ' + ist[k] + ' — mehr als die bekannten');
    else if (ist[k] > bekannt[k]) raus.push('MEHR ' + k + ': ' + ist[k] + ' statt ' + bekannt[k] + ' — mehr als die bekannten');
    else if (ist[k] < bekannt[k]) raus.push('WENIGER ' + k + ': ' + ist[k] + ' statt ' + bekannt[k] + ' — Grundlinie senken');
  }
  for (const k of Object.keys(bekannt)) if (!(k in ist)) raus.push('WEG ' + k + ' (bekannt ' + bekannt[k] + ') — Grundlinie senken');
  return raus;
}

for (const slug of Object.keys(BEKANNT.produkte)) {
  test('[Stumm·5·Grundlinie] das Produkt ' + slug + ' erzeugt beim Öffnen genau die bekannten Verwürfe — nicht mehr, nicht weniger', async () => {
    const V = await produktdateiOeffnen(slug);
    assert.deepEqual(abweichungen(zaehlen(V), BEKANNT.produkte[slug]), []);
  });
}

test('[Stumm·5·Rot-Beweis] „mehr als die bekannten": eine neue Art, eine größere Zahl, eine kleinere Zahl und ein weggefallener Eintrag sind rot', () => {
  const bekannt = BEKANNT.produkte['privat-de'];
  assert.deepEqual(abweichungen({ ...bekannt }, bekannt), [], 'Positivkontrolle: gleich ist grün');
  assert.match(abweichungen({ ...bekannt, 'logik|abschnitte': 1 }, bekannt).join('|'), /NEU logik\|abschnitte × 1 — mehr als die bekannten/);
  assert.match(abweichungen({ ...bekannt, 'bereich|unbekannt': 27 }, bekannt).join('|'), /MEHR bereich\|unbekannt: 27 statt 26/);
  assert.match(abweichungen({ ...bekannt, 'bereich|unbekannt': 25 }, bekannt).join('|'), /WENIGER bereich\|unbekannt: 25 statt 26/);
  const ohne = { ...bekannt }; delete ohne['bereich|leer'];
  assert.match(abweichungen(ohne, bekannt).join('|'), /WEG bereich\|leer/);
});

test('[Stumm·5] jede Zeile der Grundlinie ist erklärt (ein Rauschen ohne Erklärung ist ein Freibrief)', () => {
  const alle = new Set();
  for (const p of Object.values(BEKANNT.produkte)) for (const k of Object.keys(p)) alle.add(k);
  for (const k of alle) assert.ok(typeof BEKANNT.erklaerung[k] === 'string' && BEKANNT.erklaerung[k].length >= 40, k + ' ohne Erklärung');
  for (const k of Object.keys(BEKANNT.erklaerung)) assert.ok(alle.has(k), k + ': erklärt, aber in keinem Produkt vorkommend — streichen');
});
