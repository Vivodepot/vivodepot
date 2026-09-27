'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — VD Privat/Pro DE/EN (07.09.2026, direkt aus der
   Ansage)
   ────────────────────────────────────────────────────────────────────────
   Prüft die MECHANIK (Zusammensetzung, Gerüst-Gleichheit, die Deutsch-Leck-
   Messung selbst — Rot-Beweis + Gegenprobe an SYNTHETISCHEN Daten), NICHT
   die reale Zahl gegen 0 — die ist heute erwartet > 0 (07.09.2026:
   "Punkt 2, dritter Spiegelstrich, wird heute noch rot sein … Das ist
   erwartet"), solange 3f's Zug 2 (echtes Andocken für 'de') nicht gelandet
   ist. Ein Hard-Assert auf 0 würde diese Suite dauerhaft rot halten, ohne
   dass ein Fehler dieses Zugs vorläge — die reale Zahl wird gemessen und
   GEMELDET (tools/vier-produkte-erzeugen.js), nicht in der Suite erzwungen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { konfektionieren, gerüstByteGleich } = require('../tools/produkt-konfektionieren.js');
const {
  PRODUKTE, DE_MODUL_PFAD, EN_MODUL_PFAD, PRO_MODUL_PFAD, PRO_MODUL_PFAD_EN, deutscheZeilenImEnglischenProdukt,
 modulDateienFuer } = require('../tools/lib/vier-produkte.js');

function tmpOrdner(praefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), praefix + '-'));
}

/* ── modulDateienFuer()s Vorgabewert (18.09.2026) ──────────────────────────
   Auflage aus dem Umschreiben-Auftrag: der neue `opts.bereichTemplateVerzeichnis`-Parameter darf
   das Verhalten OHNE Argument nicht verändern — kein bestehender Aufrufer (feldregister-bauen.js,
   register-ausliefern.js, die echten Konfektionierer) übergibt `opts`, und sie sollen es auch
   künftig nicht müssen. Diese Probe ist der Wächter dagegen, dass der Vorgabewert später verstellt
   wird. */
test('[modulDateienFuer] ohne opts.bereichTemplateVerzeichnis kommt genau der heutige Pfad heraus', () => {
  const { BEREICH_TEMPLATE_VERZEICHNIS } = require('../tools/lib/vier-produkte.js');
  const privatDe = PRODUKTE.find((p) => p.slug === 'privat-de');
  const ohneOpts = modulDateienFuer(privatDe);
  const mitLeeremOpts = modulDateienFuer(privatDe, {});
  assert.deepEqual(mitLeeremOpts, ohneOpts, 'ein leeres opts-Objekt darf nichts verändern');
  const bereichsPfade = ohneOpts.filter((p) => path.dirname(p) === BEREICH_TEMPLATE_VERZEICHNIS);
  assert.ok(bereichsPfade.length >= 6, 'Vorbedingung: mindestens die sechs Pro-Bereichs-Templates liegen im Standardverzeichnis');
});

test('[modulDateienFuer] mit opts.bereichTemplateVerzeichnis biegt NUR die Bereichs-Template-Pfade um', () => {
  const { BEREICH_TEMPLATE_VERZEICHNIS } = require('../tools/lib/vier-produkte.js');
  const privatDe = PRODUKTE.find((p) => p.slug === 'privat-de');
  const ohneOpts = modulDateienFuer(privatDe);
  const umgebogen = modulDateienFuer(privatDe, { bereichTemplateVerzeichnis: '/wegwerf/anderswo' });
  assert.equal(umgebogen.length, ohneOpts.length, 'gleiche Anzahl Dateien, nur andere Pfade');
  for (let i = 0; i < ohneOpts.length; i++) {
    if (path.dirname(ohneOpts[i]) === BEREICH_TEMPLATE_VERZEICHNIS) {
      assert.equal(umgebogen[i], path.join('/wegwerf/anderswo', path.basename(ohneOpts[i])),
        'Bereichs-Template-Pfad muss auf das neue Verzeichnis zeigen, gleicher Dateiname');
    } else {
      assert.equal(umgebogen[i], ohneOpts[i], 'Dokumentmodule/Fixtures/Sprachmodul bleiben am Standardort: ' + ohneOpts[i]);
    }
  }
});

/* ── Dasselbe Muster ein zweites Mal (18.09.2026) — die AB_WERK-Fixtures ───
   Fünf der sieben nativen Wizards liegen seit dem Schnitt in
   tests/fixtures/buergermodul-wizards-ab-werk.json, nicht mehr im Kern-Rohtext. Derselbe
   Vorgabewert-Schutz wie oben: ohne `opts.abWerkFixtureVerzeichnis` bleibt jeder Pfad, wie er ist. */
test('[modulDateienFuer] ohne opts.abWerkFixtureVerzeichnis kommt genau der heutige Pfad heraus', () => {
  const { AB_WERK_FIXTURE_VERZEICHNIS, AB_WERK_FIXTURE_PFADE_4 } = require('../tools/lib/vier-produkte.js');
  const privatDe = PRODUKTE.find((p) => p.slug === 'privat-de');
  const ohneOpts = modulDateienFuer(privatDe);
  const mitLeeremOpts = modulDateienFuer(privatDe, {});
  assert.deepEqual(mitLeeremOpts, ohneOpts, 'ein leeres opts-Objekt darf nichts verändern');
  const fixturePfade = ohneOpts.filter((p) => AB_WERK_FIXTURE_PFADE_4.includes(p));
  assert.equal(fixturePfade.length, AB_WERK_FIXTURE_PFADE_4.length, 'Vorbedingung: beide AB_WERK-Fixtures liegen im Standardverzeichnis');
});

// Seit 21.09.2026 liegt auch das Template zugang-zum-recht in tests/fixtures/; umgebogen werden nur die AB_WERK-Fixtures selbst (PFADE_4), nicht jede Datei dort.
test('[modulDateienFuer] mit opts.abWerkFixtureVerzeichnis biegt NUR die AB_WERK-Fixture-Pfade um', () => {
  const { AB_WERK_FIXTURE_PFADE_4 } = require('../tools/lib/vier-produkte.js');
  const privatDe = PRODUKTE.find((p) => p.slug === 'privat-de');
  const ohneOpts = modulDateienFuer(privatDe);
  const umgebogen = modulDateienFuer(privatDe, { abWerkFixtureVerzeichnis: '/wegwerf/anderswo' });
  assert.equal(umgebogen.length, ohneOpts.length, 'gleiche Anzahl Dateien, nur andere Pfade');
  for (let i = 0; i < ohneOpts.length; i++) {
    if (AB_WERK_FIXTURE_PFADE_4.includes(ohneOpts[i])) {
      assert.equal(umgebogen[i], path.join('/wegwerf/anderswo', path.basename(ohneOpts[i])),
        'AB_WERK-Fixture-Pfad muss auf das neue Verzeichnis zeigen, gleicher Dateiname');
    } else {
      assert.equal(umgebogen[i], ohneOpts[i], 'Bereichs-Templates/Dokumentmodule/Sprachmodul bleiben am Standardort: ' + ohneOpts[i]);
    }
  }
});

/* ── Die Zusammensetzung selbst ───────────────────────────────────────── */

test('[Vier-Produkte] genau vier Produkte, die vorgegebene Zusammensetzung', () => {
  assert.equal(PRODUKTE.length, 4);
  assert.deepEqual(PRODUKTE.map((p) => p.slug), ['privat-de', 'privat-en', 'pro-de', 'pro-en']);
  assert.equal(PRODUKTE.find((p) => p.slug === 'privat-de').proModulPfad, null, 'Privat trägt kein Pro-Modul');
  assert.equal(PRODUKTE.find((p) => p.slug === 'pro-de').proModulPfad, PRO_MODUL_PFAD);
  // "Pro-Achse englisch" (08.09.2026): pro-en trägt einen eigenen EN-Zwilling
  // des Logikmoduls, nicht mehr denselben deutschen Pfad wie pro-de.
  assert.equal(PRODUKTE.find((p) => p.slug === 'pro-en').proModulPfad, PRO_MODUL_PFAD_EN);
  assert.notEqual(PRO_MODUL_PFAD_EN, PRO_MODUL_PFAD, 'der EN-Zwilling muss ein ANDERER Pfad sein, sonst ist es kein Zwilling');
});

test('[Vier-Produkte] die Bausteine liegen als lesbares, gültiges JSON im Repo vor', () => {
  for (const pfad of [DE_MODUL_PFAD, EN_MODUL_PFAD, PRO_MODUL_PFAD, PRO_MODUL_PFAD_EN]) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(pfad, 'utf8')), pfad + ' fehlt oder ist kein gültiges JSON');
  }
});

test('[Vier-Produkte] DE trägt sein Sprachmodul eingebacken (S8, U2-ADR-428) — über den Einlassweg bleibt sprache:de weiter reserviert', () => {
  for (const p of PRODUKTE.filter((p) => p.sprache === 'de')) {
    assert.equal(p.sprachModulPfad, DE_MODUL_PFAD, p.slug + ': muss das DE-Modul tragen (das Gerüst trägt keinen Sprachsatz mehr)');
  }
  for (const p of PRODUKTE.filter((p) => p.sprache === 'en')) {
    assert.equal(p.sprachModulPfad, EN_MODUL_PFAD, p.slug + ': muss das EN-Modul tragen');
  }
});

/* ── konfektionieren() mit unsignierteModulDateien ──────────────────────── */

test('[Vier-Produkte] konfektionieren() backt eine unsignierte Textsatz-Datei in AB_WERK_SPRACHE_PRODUKT ein (U2-ADR-387, seit „Antwort ist (d)" keine Begleitdatei mehr)', () => {
  const ziel = tmpOrdner('vier-produkte-ziel');
  try {
    const r = konfektionieren({
      ziel, slug: 'privat-en', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: [EN_MODUL_PFAD],
    });
    assert.deepEqual(r.unsignierteModule, ['textsatz-en-modul.json']);
    assert.equal(fs.existsSync(path.join(r.ordner, 'textsatz-en-modul.json')), false,
      'seit U2-ADR-387 keine Begleitdatei mehr — die Nutzlast steckt im Gerüst');
    const kern = fs.readFileSync(path.join(r.ordner, 'vivodepot.html'), 'utf8');
    const enModul = JSON.parse(fs.readFileSync(EN_MODUL_PFAD, 'utf8'));
    assert.ok(kern.includes('const AB_WERK_SPRACHE_PRODUKT = ' + JSON.stringify(enModul) + ';'),
      'das EN-Modul steckt nicht wörtlich in der AB_WERK_SPRACHE_PRODUKT-Marker-Region');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Vier-Produkte] ohne unsignierteModulDateien bleibt konfektionieren() unverändert (Rückwärtskompatibilität)', () => {
  const ziel = tmpOrdner('vier-produkte-ziel');
  try {
    const r = konfektionieren({
      ziel, slug: 'privat-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    });
    assert.deepEqual(r.unsignierteModule, []);
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── Wächter: Gerüst byte-gleich über die vier realen Produkte ──────────── */

test('[Vier-Produkte·Wächter] alle vier Produkte real erzeugt, Gerüst byte-gleich über alle sechs Paare', () => {
  const ziel = tmpOrdner('vier-produkte-real');
  try {
    const ergebnisse = {};
    for (const p of PRODUKTE) {
      ergebnisse[p.slug] = konfektionieren({
        ziel, slug: p.slug, modulauswahl: [],
        vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
        unsignierteModulDateien: modulDateienFuer(p),
      });
    }
    const slugs = PRODUKTE.map((p) => p.slug);
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const w = gerüstByteGleich(ergebnisse[slugs[i]].ordner, ergebnisse[slugs[j]].ordner);
        assert.equal(w.gleich, true, slugs[i] + ' vs ' + slugs[j] + ': ' + w.abweichungen.join(','));
      }
    }
    // Modul-Zahl je Produkt — die zweite Wächter-Auflage ("genau ein Sprachmodul-Zustand").
    // U1b-Nachtrag (Schnitt, 19.09.2026): die vier Literale (1/2/3/4, U2-ADR-421-Stand) waren die
    // Zahl VOR der additiven Bereichs-Auslagerung (U2-ADR-417) — seither trägt jedes Produkt
    // zusätzlich seine Bereichs-Templates, Dokumentmodule und AB_WERK-Fixturen (modulDateienFuer()).
    // Gegen die gemessene Quelle geprüft, nicht gegen eine neu hochgezählte Zahl — sonst reißt
    // diese Zeile beim nächsten Zug wieder, ohne dass der Wächter selbst etwas aussagt.
    for (const p of PRODUKTE) {
      assert.equal(ergebnisse[p.slug].unsignierteModule.length, modulDateienFuer(p).length,
        p.slug + ': unsignierteModule muss exakt die Zutatenliste aus modulDateienFuer() tragen — kein Verlust, keine Dopplung in konfektionieren()');
    }
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ── Die Deutsch-Leck-Messung selbst — Rot-Beweis + Gegenprobe an SYNTHETISCHEN Daten ── */

test('[Vier-Produkte·Leck-Messung·Rot-Beweis] eine EN-Modul-Kennung mit wörtlich deutschem Inhalt wird als Leck gefunden', () => {
  // U2-ADR-363 (Zug 2, 07.09.2026, gelandet über den Rebase auf fd6be920) hat den stillen
  // Rückfall aus textLesen() entfernt: eine im EN-Modul FEHLENDE Kennung liefert seither null,
  // nicht mehr den deutschen AB_WERK_TEXTSATZ_DE-Wert (s. Kopf-Kommentar von textLesen im Kern).
  // Der frühere Rot-Beweis simulierte genau diesen inzwischen abgeschafften Rückfall und wurde
  // darum von diesem Umbau selbst rot — kein Fehler in deutscheZeilenImEnglischenProdukt, ein
  // veraltetes Testszenario. Der WEITERHIN reale Leck-Fall bleibt: eine Kennung, die im
  // EN-Modul VORHANDEN ist, deren Wert aber wörtlich deutsch ist (Kopierfehler o. ä.).
  // U1b-Nachtrag (18./19.09.2026): NICHT mehr `mobility.label` — die Entscheidung
  // zum U2-ADR-331-Stolperdraht-Fund schützt seither jede Kennung der Form `<eingebauterBereich>.
  // label`/`.navUnterzeile` (s. `_eingebauteBereichsBeschriftungVerwerfen`, `_BEREICH_ARTEN_OHNE_
  // MODUL`): ein unsigniertes Modul kann diese Beschriftung nicht mehr kapern, der Kern setzt den
  // eingebauten Wert kommentarlos zurück. Das ist gewollt (eigene Probe:
  // tests/eingebaute-bereichsbeschriftung-nach-pruefstufe.test.js) — der hiesige Rot-Beweis prüft
  // die allgemeine Leck-Messung, nicht diesen Schutz, und braucht darum eine Kennung AUSSERHALB
  // der geschützten Form: ein echtes Feld-Label, kein Bereichs-Label.
  const { V } = ladeKern();
  const echteKennung = 'identity.residencePermit.label';
  const deutscherWert = V.TEXTSATZ_DE_QUELLE.texte[echteKennung];
  assert.ok(typeof deutscherWert === 'string' && deutscherWert, 'Vorbedingung: die echte Kennung liefert einen deutschen Referenzwert');
  const deTexteEcht = { [echteKennung]: deutscherWert };
  const enMitDeutschemInhalt = { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte: { [echteKennung]: deutscherWert } };
  const r = deutscheZeilenImEnglischenProdukt(V, deTexteEcht, enMitDeutschemInhalt);
  assert.equal(r.anzahl, 1);
  assert.deepEqual(r.kennungen, [echteKennung]);
});

test('[Vier-Produkte·Leck-Messung] eine im EN-Modul FEHLENDE Kennung zählt seit U2-ADR-363 nicht mehr als Leck — textLesen liefert null, nicht mehr Deutsch', () => {
  const { V } = ladeKern();
  const echteKennung = 'mobility.label';
  const deutscherWert = V.TEXTSATZ_DE_QUELLE.texte[echteKennung];
  const deTexteEcht = { [echteKennung]: deutscherWert };
  const enOhneDiesenSchluessel = { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte: {} };
  const r = deutscheZeilenImEnglischenProdukt(V, deTexteEcht, enOhneDiesenSchluessel);
  assert.equal(r.anzahl, 0);
  assert.deepEqual(r.kennungen, []);
});

test('[Vier-Produkte·Leck-Messung·Gegenprobe] eine im EN-Modul ECHT übersetzte Kennung zählt NICHT als Leck', () => {
  const { V } = ladeKern();
  const echteKennung = 'mobility.label';
  const deutscherRückfall = V.TEXTSATZ_DE_QUELLE.texte[echteKennung];
  const deTexteEcht = { [echteKennung]: deutscherRückfall };
  const enMitEchterUebersetzung = {
    modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
    texte: { [echteKennung]: 'A genuinely different English sentence' },
  };
  const r = deutscheZeilenImEnglischenProdukt(V, deTexteEcht, enMitEchterUebersetzung);
  assert.equal(r.anzahl, 0);
});

test('[Vier-Produkte·Leck-Messung] liefert Gesamtzahl UND die Liste der Kennungen, nicht nur eine Zahl', () => {
  const { V } = ladeKern();
  const deTexte = { a: 'X', b: 'Y' };
  const en = { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte: { a: 'X-en' } };
  // 'a' hat eine echte EN-Übersetzung (kein Leck), 'b' fehlt im EN-Modul UND ist keine
  // echte Kern-Kennung — textLesen('b') liefert null, `null !== 'Y'`, also ebenfalls kein
  // Leck (die Funktion behauptet nichts über erfundene Kennungen). Diese Probe hält nur die
  // FORM der Rückgabe fest (anzahl + kennungen + gesamt), nicht eine bestimmte Zahl.
  const r = deutscheZeilenImEnglischenProdukt(V, deTexte, en);
  assert.equal(r.gesamt, 2);
  assert.equal(typeof r.anzahl, 'number');
  assert.ok(Array.isArray(r.kennungen));
});

/* ── Reale Messung, real gemeldet (kein Hard-Assert auf 0, s. Kopf-Kommentar) ── */

test('[Vier-Produkte·Leck-Messung·Real] die tatsächliche Zahl gegen die echten DE/EN-Module ist ermittelbar und endlich', () => {
  const { V } = ladeKern();
  const de = JSON.parse(fs.readFileSync(DE_MODUL_PFAD, 'utf8'));
  const en = JSON.parse(fs.readFileSync(EN_MODUL_PFAD, 'utf8'));
  const r = deutscheZeilenImEnglischenProdukt(V, de.texte, en);
  assert.ok(Number.isInteger(r.anzahl) && r.anzahl >= 0 && r.anzahl <= r.gesamt,
    'die Zahl muss zwischen 0 und der Gesamtmenge liegen — reale Messung: ' + r.anzahl + '/' + r.gesamt);
});
