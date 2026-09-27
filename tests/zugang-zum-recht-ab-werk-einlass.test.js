'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Beratungshilfe-Vorbereitungsauszug ab Werk — U2-ADR-326
   ────────────────────────────────────────────────────────────────────────────
   Zweiter Zweck der Template-Familie `zugang-zum-recht`. Gleiche Bauart wie der
   Erbschein-Auszug (U2-ADR-288): das Bündel reist als Konstante in der
   ausgelieferten Datei mit und lässt sich über den echten, unveränderten
   `modulEinlassen()`-Pfad selbst ein — kein zweiter Mechanismus.

   DIE MIGRATIONSSTUFE FILTERT AUF EINE KENNUNG, und das ist keine Feinheit:
   liefe sie über alle Ab-Werk-Bündel, bekäme eine Bürgerin, die einen früher
   nachgelieferten Auszug selbst ENTFERNT hat, ihn beim nächsten Versionssprung
   wieder. Das wäre ein Zurückdrehen ihrer Entscheidung. Eigene Probe unten.

   UND EIN BESTANDSDEPOT MUSS AUFGEHEN, ALS WÄRE NICHTS GEWESEN: sechs neue
   Felder im Bürgermodul ändern den Bestand JEDER Bürgerin, auch derer, die nie
   einen Antrag stellt. Die letzte Probe hält fest, dass ein Depot mit altem
   Schema hochkommt, die neuen Felder leer sind und kein bestehender Wert sich
   verändert.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { depotImProduktAnlegen } = require('./produkt-html-erzeugen.js');

const QUELLE = path.join(__dirname, 'fixtures', 'zugang-zum-recht-beratungshilfe-logikmodul.json');
const ID = 'zugang-zum-recht-beratungshilfe';

test('[U2-ADR-326] der Kern bettet den Zugangs-Auszug nicht mehr ein — die einzige Quelle ist das Template-Rezept', () => {
  const { V } = ladeKern();
  assert.equal(V.ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT, undefined,
    'die Kern-Konstante ist weg: der Auszug steht als Template im Rezept (U2-ADR-427), nicht zusätzlich im Kern');
  assert.equal(JSON.parse(fs.readFileSync(QUELLE, 'utf8')).id, ID, 'die Quelldatei ist zugleich die Template-Datei der Produkte');
});

test('[U2-ADR-326] der Kern trägt keinen Ab-Werk-Auszug mehr — auch der Erbschein-Auszug ist seit Schema 87 ein Template im Rezept', () => {
  const { V } = ladeKern();
  assert.equal(V.AB_WERK_AUSZUG_BUNDLE_TEXTE, undefined);
  assert.deepEqual(V.AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN, []);
});

test('[U2-ADR-326] frisch angelegte Bürgerin: kein Auszug steht in logikModule — beide kommen als Ab-Werk-Saat des Produkts', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Beratungshilfe-Ab-Werk-2026!');
  const d = V.getData();
  assert.ok(!(d.logikModule || []).some((m) => m && m.id === 'erbschein-vorbereitung'), 'der Erbschein-Auszug kommt nicht mehr aus dem Kern');
  assert.ok(!(d.logikModule || []).some((m) => m && m.id === ID), 'der Zugangs-Auszug kommt nicht mehr aus dem Kern');
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[U2-ADR-326] frisch angelegte Bürgerin im gebauten privat-de und privat-en: der Auszug steht ab Werk da, ohne Kopie im Depot', async () => {
  for (const slug of ['privat-de', 'privat-en']) {
    const { V } = await depotImProduktAnlegen(slug, 'Beratungshilfe-Produkt-2026!');
    const d = V.getData();
    assert.ok(V._logikModuleAlle(d).some((m) => m && m.id === ID), slug + ': der Auszug fehlt in der Ab-Werk-Saat des Produkts');
    assert.ok(!(d.logikModule || []).some((m) => m && m.id === ID), slug + ': das Depot trägt keine eigene Kopie');
  }
});

test('[U2-ADR-326] Bestandsdepot auf Schema 79: die Stufe liefert den Zugangs-Auszug NICHT mehr nach', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Beratungshilfe-Migration-2026!');
  const d = V.getData();
  d.logikModule = (d.logikModule || []).filter((m) => m && m.id !== ID);
  d.schemaVersion = 79;
  V.depotNormalisieren(d);
  assert.ok(!(d.logikModule || []).some((m) => m && m.id === ID), 'der Auszug kommt als Ab-Werk-Saat des Produkts, nicht per Migrationsstufe');
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[U2-ADR-326·Rot-Beweis] ein selbst entfernter Erbschein-Auszug kommt beim Sprung auf 80 NICHT zurück', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Beratungshilfe-Entscheidung-2026!');
  const d = V.getData();
  d.logikModule = (d.logikModule || []).filter((m) => m && m.id !== 'erbschein-vorbereitung' && m.id !== ID);
  d.schemaVersion = 79;
  V.depotNormalisieren(d);
  assert.equal((d.logikModule || []).some((m) => m && m.id === 'erbschein-vorbereitung'), false,
    'die Stufe darf nur nachliefern, was MIT IHR dazukommt — sonst dreht sie eine Entscheidung der Bürgerin zurück');
  assert.equal((d.logikModule || []).some((m) => m && m.id === ID), false);
});

test('[U2-ADR-326] Bestandsdepot mit altem Schema geht auf: neue Felder leer, bestehende Werte unverändert', async () => {
  const { V } = ladeKern();
  // Ein Depot, wie es vor diesem Zug entstand: alte Schema-Zahl, gefüllte Bestandsfelder,
  // keine der sechs neuen Kennungen. Gemessen wird, was `depotNormalisieren` daraus macht.
  const alt = {
    schemaVersion: 75,
    sektoren: {
      assets: { livingSituation: 'alleine', housingCostsTotal: '1.450 EUR', numberOfPeopleInTheHome: '3' },
      administration: { ongoingAdministrativeCases: [{ authority: 'Deutsche Rentenversicherung', typeOfCase: 'Rentenantrag', fileReferenceNumber: 'RV-2026-00417' }] },
    },
    menschen: [], institutionen: [], logikModule: [],
  };
  const vorherVermoegen = JSON.parse(JSON.stringify(alt.sektoren.assets));
  const vorherVorgang = JSON.parse(JSON.stringify(alt.sektoren.administration.ongoingAdministrativeCases));
  V.depotNormalisieren(alt);                       // darf nicht werfen

  for (const feld of ['yourOwnIncomeNetMonthly', 'maintenanceObligations', 'incomeOfOtherPeopleInThe', 'monthlyCommitments']) {
    const wert = alt.sektoren.assets[feld];
    assert.ok(wert === undefined || wert === '', 'das neue Feld ' + feld + ' muss leer bleiben, nicht erfunden werden');
  }
  for (const [k, v] of Object.entries(vorherVermoegen)) {
    assert.equal(alt.sektoren.assets[k], v, 'bestehender Wert ' + k + ' hat sich verändert');
  }
  assert.equal(alt.sektoren.administration.ongoingAdministrativeCases[0].authority, vorherVorgang[0].authority);
  assert.equal(alt.sektoren.administration.ongoingAdministrativeCases[0].fileReferenceNumber, vorherVorgang[0].fileReferenceNumber);
  for (const u of ['opposingParty', 'alreadyAdvisedBy']) {
    const wert = alt.sektoren.administration.ongoingAdministrativeCases[0][u];
    assert.ok(wert === undefined || wert === '', 'das neue Unterfeld ' + u + ' muss leer bleiben');
  }
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});
