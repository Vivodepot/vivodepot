'use strict';
/* ════════════════════════════════════════════════════════════════════════
   AB_WERK-Mitschrift, Fach 8/9/10 — Situationen, Dokument-Module, Wizards
   (18.09.2026, Schnitt-Nachtrag, Fund `-d2` bzw. beim Lesen des Kerns)
   ────────────────────────────────────────────────────────────────────────
   `_abWerkMitschriftErzeugen()` kannte bis heute sieben Fächer (bereich/
   sprache/logikModul/bereichsErsatz/rechtsraumKatalogQuelle/dokumente/
   basistemplate). Für AB_WERK_SITUATIONEN_QUELLEN, AB_WERK_DOKUMENT_MODULE
   und AB_WERK_WIZARD_QUELLEN — alle drei aus dem heutigen Schnitt — gab es
   keinen Eintrag: nicht falsch verdrahtet, nie eingetragen. Ein Produkt, das
   dort etwas einbäckt, gab die Struktur beim Produktwechsel/nach Kündigung
   nicht mit der Datei mit.

   FACH 10 (Wizards) ist derselbe Fund ein drittes Mal: der Kopf-Kommentar an
   `_situationModulAbWerkSeed`/`_wizardModulAbWerkSeed` nennt „situationen"
   UND „wizards" im selben Satz als „OFFEN, NICHT GEBAUT" — Fach 8 war schon
   beauftragt, Fach 10 wurde erst beim Lesen des Kerns sichtbar. Die
   dynamische Probe (tests/mitschrift-deckt-abwerk-regionen.test.js) meldet
   das NICHT: Wizard-Feld-IDs (geburt_klinik, geburt_hebamme, …) enthalten
   nie ein Leerzeichen/Bindestrich/Punkt, darum liefert ihre Probenextraktion
   für diese Region grundsätzlich null Proben — ein Methoden-blinder Fleck,
   kein Beleg für „nichts fehlt". Gemessen, nicht vermutet: pro-de UND
   privat-en backen echte 4 KB Wizard-Inhalt ein.

   DIESE PROBE HÄLT DEN RUNDLAUF, NICHT DIE VERDRAHTUNG (Auflage,
   18.09.2026): nicht „das Fach existiert", sondern in die Region einbacken
   (ein echt konfektioniertes pro-de), Depot anlegen, Depot ECHT verschlüsseln
   (depotSerialisieren), ECHT entschlüsseln (depotLaden) — und erst danach
   nachsehen, ob der Inhalt da ist. tests/mitschrift-deckt-abwerk-regionen.test.js
   prüft nur die AUSGANGSSEITE (den rohen Depot-Objekt-Zustand direkt nach
   `_abWerkStrukturInsDepot`, ohne Krypto); diese Datei hier prüft zusätzlich,
   dass der Inhalt den echten Schreib-/Lese-Weg übersteht — absichtlich NICHT
   dieselbe Probe wie dort, s. deren Kopf-Kommentar.

   GEGENPROBE PFLICHT (Auflage 1): ohne den Fix darf diese Probe nicht grün
   sein. Nachgewiesen durch echten Rot-Lauf — s. Bericht, nicht diese Datei
   (ein Rot-Beweis, der HIER als eigener Test stünde, würde beim nächsten
   Refactor mitlaufen, ohne je wieder rot zu werden — dasselbe Argument wie am
   Kopf von tests/mitschrift-deckt-abwerk-regionen.test.js gegen eine
   Positivkontrolle, die den Fix selbst nachbaut).

   PREIS: konfektioniert ein echtes Produkt (pro-de) und lädt es als Kern —
   genau wie die Schwester-Probe, aus demselben Grund (s. deren Kopf-Kommentar
   "PREIS"). ════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { ladeIssuer } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');
const PW = 'probe-passwort-ab-werk-mitschrift-8-9-2026-09-18';

/* Konfektioniert pro-de EINMAL für die ganze Datei (teuer, s. Kopf-Kommentar) und lädt es
   als Kern — derselbe Aufbau wie tests/mitschrift-deckt-abwerk-regionen.test.js. */
function proDeKernLaden() {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-werk-mitschrift-89-'));
  const ISSUER = ladeIssuer().V;
  const p = PRODUKTE.find((x) => x.slug === 'pro-de');
  const r = konfektionieren({
    ziel, slug: 'pro-de', modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: modulDateienFuer(p),
  });
  const kernPfad = path.join(r.ordner, 'vivodepot.html');

  const vorherigerPfad = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = kernPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  if (vorherigerPfad === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorherigerPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];

  fs.rmSync(ziel, { recursive: true, force: true });
  return V;
}

test('[Klasse-A] AB_WERK-Mitschrift Fach 8 (situationen): echter Rundlauf — pro-de backt ein, Depot anlegen, verschlüsseln, entschlüsseln, Inhalt ist da', async () => {
  const V = proDeKernLaden();
  assert.ok(Array.isArray(V.AB_WERK_SITUATIONEN_QUELLEN) && V.AB_WERK_SITUATIONEN_QUELLEN.length > 0,
    'Voraussetzung: pro-de muss AB_WERK_SITUATIONEN_QUELLEN wirklich backen — sonst prüft die Probe nichts');

  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();

  assert.ok(d && d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.situationen),
    'nach dem echten Lade-Rundlauf muss abWerkMitschrift.situationen ein Array sein');
  assert.ok(d.abWerkMitschrift.situationen.length > 0,
    'die eingebackene Situationen-Quelle darf im entschlüsselten Depot nicht leer ankommen');
  const situationIds = d.abWerkMitschrift.situationen
    .flatMap((datei) => Object.keys((datei && datei.situationen) || {}));
  assert.ok(situationIds.includes('geburt'),
    'eine konkrete, aus pro-de eingebackene Situation ("geburt") muss im entschlüsselten Depot stehen — Proben: ' + situationIds.join(', '));
});

test('[Klasse-A] AB_WERK-Mitschrift Fach 9 (dokumentModule): echter Rundlauf — pro-de backt ein, Depot anlegen, verschlüsseln, entschlüsseln, Inhalt ist da', async () => {
  const V = proDeKernLaden();
  assert.ok(Array.isArray(V.AB_WERK_DOKUMENT_MODULE) && V.AB_WERK_DOKUMENT_MODULE.length > 0,
    'Voraussetzung: pro-de muss AB_WERK_DOKUMENT_MODULE wirklich backen — sonst prüft die Probe nichts');

  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();

  assert.ok(d && d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.dokumentModule),
    'nach dem echten Lade-Rundlauf muss abWerkMitschrift.dokumentModule ein Array sein');
  assert.ok(d.abWerkMitschrift.dokumentModule.length > 0,
    'die eingebackene Dokument-Modul-Quelle darf im entschlüsselten Depot nicht leer ankommen');
  const kennungen = d.abWerkMitschrift.dokumentModule.map((datei) => datei && datei.kennung).filter(Boolean);
  assert.ok(kennungen.includes('vivodepot/patientenverfuegung'),
    'ein konkretes, aus pro-de eingebackenes Dokument-Modul muss im entschlüsselten Depot stehen — Proben: ' + kennungen.join(', '));
});

test('[Klasse-A] AB_WERK-Mitschrift Fach 10 (wizards): echter Rundlauf — pro-de backt ein, Depot anlegen, verschlüsseln, entschlüsseln, Inhalt ist da', async () => {
  const V = proDeKernLaden();
  assert.ok(Array.isArray(V.AB_WERK_WIZARD_QUELLEN) && V.AB_WERK_WIZARD_QUELLEN.length > 0,
    'Voraussetzung: pro-de muss AB_WERK_WIZARD_QUELLEN wirklich backen — sonst prüft die Probe nichts');

  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();

  assert.ok(d && d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.wizards),
    'nach dem echten Lade-Rundlauf muss abWerkMitschrift.wizards ein Array sein');
  assert.ok(d.abWerkMitschrift.wizards.length > 0,
    'die eingebackene Wizard-Quelle darf im entschlüsselten Depot nicht leer ankommen');
  const wizardIds = d.abWerkMitschrift.wizards
    .flatMap((datei) => Object.keys((datei && datei.wizards) || {}));
  assert.ok(wizardIds.includes('gebwiz'),
    'ein konkreter, aus pro-de eingebackener Wizard ("gebwiz") muss im entschlüsselten Depot stehen — Proben: ' + wizardIds.join(', '));
});

test('[Klasse-A] AB_WERK-Mitschrift Fach 8/9/10 · Gegenkontrolle: der VOLLEXPORT hält alle drei Fächer weiter unbedingt zurück', async () => {
  const V = proDeKernLaden();
  await V.depotAnlegen(PW);
  const d = V.getData();
  assert.ok(d.abWerkMitschrift.situationen.length > 0 && d.abWerkMitschrift.dokumentModule.length > 0 && d.abWerkMitschrift.wizards.length > 0,
    'Voraussetzung: alle drei neuen Fächer tragen nach depotAnlegen() wirklich Inhalt');
  const exportiert = V.vollExportJSON({ sensibel: true });
  const alsText = JSON.stringify(exportiert);
  assert.ok(!alsText.includes('vivodepot/patientenverfuegung'),
    'ein Dokument-Modul-Kennwert der Mitschrift darf im Vollexport nicht auftauchen — U2-ADR-398 hält abWerkMitschrift unbedingt zurück');
  assert.ok(!alsText.includes('gebwiz'),
    'ein Wizard-Kennwert der Mitschrift darf im Vollexport nicht auftauchen — U2-ADR-398 hält abWerkMitschrift unbedingt zurück');
  assert.equal(exportiert.depot.abWerkMitschrift.situationen.length, 0,
    'Fach 8 muss im Vollexport auf den Leer-Zustand zurückgesetzt sein, wie seine Geschwister');
  assert.equal(exportiert.depot.abWerkMitschrift.dokumentModule.length, 0,
    'Fach 9 muss im Vollexport auf den Leer-Zustand zurückgesetzt sein, wie seine Geschwister');
  assert.equal(exportiert.depot.abWerkMitschrift.wizards.length, 0,
    'Fach 10 muss im Vollexport auf den Leer-Zustand zurückgesetzt sein, wie seine Geschwister');
  assert.ok(exportiert._zurueckgehalten && exportiert._zurueckgehalten.abWerkMitschrift > 0,
    'der Rückhalte-Beleg muss die neuen Fächer mitzählen, sonst ist die Zahl zu klein ausgewiesen');
});

/* Gerüst-Schnitt S2+S6 / S3 (20.09.2026): kein Schnitt landet für eine Region ohne Mitschrift-Fach — und das Fach trägt
   den Inhalt über den echten Rundlauf, nicht nur als Vorkommen in der Datei. */
test('[Klasse-A] AB_WERK-Mitschrift Fach 6 (dokumente): echter Rundlauf — pro-de backt ein, Depot anlegen, verschlüsseln, entschlüsseln, PV/KI/Vollmacht sind da', async () => {
  const V = proDeKernLaden();
  assert.ok(V.AB_WERK_DOKUMENTE_DE && V.AB_WERK_DOKUMENTE_DE.dokumente,
    'Voraussetzung: pro-de muss AB_WERK_DOKUMENTE_DE wirklich backen — sonst prüft die Probe nichts');

  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();

  const dok = d && d.abWerkMitschrift && d.abWerkMitschrift.dokumente;
  assert.ok(dok && typeof dok === 'object', 'nach dem echten Lade-Rundlauf muss abWerkMitschrift.dokumente ein Objekt sein');
  for (const name of ['pvBmj', 'kiKorpus', 'vollmachtBmj']) {
    assert.ok(dok[name] && Array.isArray(dok[name].steps) && dok[name].steps.length > 0,
      name + ' muss im entschlüsselten Depot mit Schritten ankommen');
  }
});

test('[Klasse-A] AB_WERK-Mitschrift Fach 12 (rechtsraumModule): echter Rundlauf — pro-de backt ein, Depot anlegen, verschlüsseln, entschlüsseln, der deutsche Katalog ist da', async () => {
  const V = proDeKernLaden();
  assert.ok(Array.isArray(V.AB_WERK_RECHTSRAUM_PRODUKT) && V.AB_WERK_RECHTSRAUM_PRODUKT.length > 0,
    'Voraussetzung: pro-de muss AB_WERK_RECHTSRAUM_PRODUKT wirklich backen — sonst prüft die Probe nichts');

  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();

  assert.ok(d && d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.rechtsraumModule),
    'nach dem echten Lade-Rundlauf muss abWerkMitschrift.rechtsraumModule ein Array sein');
  const de = d.abWerkMitschrift.rechtsraumModule.find((m) => m && m.rechtsraum === 'DE');
  assert.ok(de && de.typen && de.typen['living-will'],
    'der deutsche Katalog muss im entschlüsselten Depot stehen — gefunden: ' + d.abWerkMitschrift.rechtsraumModule.map((m) => m && m.rechtsraum).join(', '));
});

test('[Klasse-A] AB_WERK-Mitschrift Fach 13 (standardVorlagen): echter Rundlauf — pro-de backt ein, Depot anlegen, verschlüsseln, entschlüsseln, die vier Standardvorlagen sind da', async () => {
  const V = proDeKernLaden();
  assert.equal(V.STANDARD_VORLAGEN.length, 4,
    'Voraussetzung: pro-de muss die vier Standardvorlagen aus den Moduldateien backen — sonst prüft die Probe nichts');

  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);
  const d = V.getData();

  assert.ok(d && d.abWerkMitschrift && Array.isArray(d.abWerkMitschrift.standardVorlagen),
    'nach dem echten Lade-Rundlauf muss abWerkMitschrift.standardVorlagen ein Array sein');
  assert.deepEqual(d.abWerkMitschrift.standardVorlagen.map((v) => v && v.kennung),
    ['patientenverfuegung', 'betreuungsverfuegung', 'vorsorgevollmacht', 'organspende'].map((n) => 'vivodepot/' + n),
    'die vier Standardvorlagen müssen im entschlüsselten Depot stehen, in der Backreihenfolge');
});
