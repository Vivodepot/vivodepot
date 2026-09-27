'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schema 39 → 40 — die zwölf `ki_*`-Werte ziehen in die Instrument-Zeile.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor der Migration geschrieben und rot.

   Block E stellt den WIZARD um. Damit ist der Altbestand aber nicht versorgt:
   Wer die KI-Verfügung vor diesem Umbau ausgefüllt hat, trägt die Werte flach
   in `verwaltung`. Ohne Migration wären sie nach dem Update unerreichbar —
   der Wizard liest ab jetzt die Zeile, und die ist leer. Die Bürgerin sähe
   ein leeres Formular und müsste alles neu eingeben, während ihre Antworten
   unsichtbar im Depot liegen. Das ist die Datenverlust-Klasse dieses Tages,
   nur zeitversetzt.

   Die Verwaisungsregel gilt: Bestandsdaten werden nie wegen einer neuen Regel
   blockiert oder verworfen. Migriert wird, was da ist — nicht mehr, nicht
   weniger, und ohne die Werte anzufassen.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

/* GOLDEN-FIXTURE: ein Depot aus der Zeit VOR Block E. Absichtlich als wörtliches
   Literal und nicht aus dem heutigen Modell erzeugt — ein aus dem Modell abgeleiteter
   Altbestand wandert mit jedem Umbau stillschweigend mit und prüft am Ende nur noch
   sich selbst. Das hier ist der Stick aus der Schublade. */
const DEPOT_39 = Object.freeze({
  schemaVersion: 39,
  sektoren: {
    verwaltung: {
      // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `bundid_email` läuft seither selbst
      // durch eine (davon unabhängige) additive Migration (`_korb1MehrwertigMigrieren`, JEDES
      // Öffnen) in die Liste `bundid` um — als Kontrollfeld für „Migration 40 rührt NUR ki_* an"
      // taugt es darum nicht mehr, es würde JEDEN Lauf verändert. `bundid_status` bleibt ein
      // unverändertes Flachfeld, unbeteiligt an beiden Migrationen.
      bundid_status: 'hoch',                              // ein echtes verwaltung-Feld, bleibt
      ki_grundentscheidung: 'erlaubnis',
      ki_zweck: ['erinnerung', 'trauer'],
      ki_raum: 'privat',
      ki_befristung: 'jahre',
      ki_befristung_jahre: '10',
      ki_verhaltensgrenze: 'keine_neuen_aussagen',
      ki_nachlassverwaltung: 'ja',
    },
    vorsorge: {},
  },
  urheberschaft: {
    verwaltung: { ki_grundentscheidung: [{ akteur: 'Maria', ts: '2026-05-01T10:00:00.000Z' }] },
  },
});

// "Englisch vor v1": die DEPOT_39-Fixture bleibt wörtlich eingefroren (Stand vor JEDER
// Umbenennung, Sektoren wie Feld-Ids). depotNormalisieren() läuft ihr Depot bis zum aktuellen
// Schema durch — inklusive der Schema-81-Sektoren-Stufe, die Sektor- UND Listenfeld-Unterfeld-Ids
// am Ende der Kette auf Englisch umschlüsselt. Übersetzt wird darum nur an der VERGLEICHS-Stelle
// (Output-Seite), nicht an der Fixture selbst — derselbe Grundsatz wie beim eingefrorenen
// ADR-319/320-Massstab.
const kiZeile = (d) =>
  ((d.sektoren.advanceCare || {}).provisionInstruments || []).find(r => r && r.instrument === 'ki-verfuegung');

test('[Mig40] die sieben belegten ki_*-Werte stehen danach IN der KI-Zeile', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(DEPOT_39)));
  const z = kiZeile(d);
  assert.ok(z, 'eine ki-verfuegung-Zeile ist entstanden');
  assert.equal(z.basicDecision, 'erlaubnis');
  assert.equal(String(z.purpose), 'erinnerung,trauer', 'Array-Werte unverändert übernommen');
  assert.equal(z.scope, 'privat');
  assert.equal(z.timeLimit, 'jahre');
  assert.equal(z.numberOfYears, '10');
  assert.equal(z.behaviouralLimit, 'keine_neuen_aussagen');
  assert.equal(z.digitalEstateAdministration, 'ja');
});

test('[Mig40] der flache Altbestand ist danach WEG — kein zweiter Ort', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(DEPOT_39)));
  const v = d.sektoren.administration || {};
  const reste = Object.keys(v).filter(k => k.startsWith('ki_')).join(',');
  assert.equal(reste, '',
    'ki_*-Flachfelder muessen verschwinden — zwei Orte fuer denselben Wert sind genau der Defekt, '
    + 'den Block E beseitigt: ' + reste);
});

test('[Mig40] fremde verwaltung-Felder bleiben unangetastet', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(DEPOT_39)));
  assert.equal((d.sektoren.administration || {}).bundidVerificationLevel, 'hoch',
    'die Migration greift NUR ki_* — alles andere in verwaltung ist unbeteiligt');
});

test('[Mig40] idempotent: zweimal normalisieren aendert nichts und legt keine zweite Zeile an', () => {
  const { V } = ladeKern();
  const einmal  = V.depotNormalisieren(JSON.parse(JSON.stringify(DEPOT_39)));
  const zweimal = V.depotNormalisieren(JSON.parse(JSON.stringify(einmal)));
  const zeilen = (zweimal.sektoren.advanceCare.provisionInstruments || [])
    .filter(r => r && r.instrument === 'ki-verfuegung');
  assert.equal(zeilen.length, 1, 'genau eine KI-Zeile, auch nach dem zweiten Lauf');
  assert.equal(JSON.stringify(zweimal.sektoren), JSON.stringify(einmal.sektoren),
    'der zweite Lauf ist ein No-Op — sonst driftet jedes Oeffnen des Depots');
});

test('[Mig40] Depot OHNE ki_*-Werte bekommt KEINE leere Zeile', () => {
  const { V } = ladeKern();
  const ohne = { schemaVersion: 39, sektoren: { verwaltung: { bundid_email: 'x@y.z' }, vorsorge: {} } };
  const d = V.depotNormalisieren(ohne);
  assert.ok(!kiZeile(d),
    'eine leere KI-Zeile waere ein Geistereintrag: Das Regal zeigte eine KI-Verfuegung an, '
    + 'die die Buergerin nie angelegt hat');
});

test('[Mig40] die Urheberschaft der migrierten Werte geht nicht verloren', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(DEPOT_39)));
  // Der Stempel sagt, WER einen Wert gesetzt hat — er traegt die Provenienz durch Export und
  // Angehoerigen-Sicht. Ein Umzug, der ihn abschneidet, macht aus fremder Auskunft still eine
  // eigene. Der Stempel zieht deshalb mit an das Listenfeld. Seit dem Kennungs-Umbau (Schema 81)
  // zieht auch der `urheberschaft`-Namensraum mit — gemessen: `advanceCare.provisionInstruments`.
  const u = (d.urheberschaft || {}).advanceCare || {};
  assert.ok(u.provisionInstruments && u.provisionInstruments.length,
    'der Umzug traegt einen Stempel am Ziel — sonst sieht der Wert wie nie gesetzt aus');
});

test('[Mig40] die Schema-Version steigt auf 40', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(DEPOT_39)));
  // Ein Depot, das bei 39 startet, laeuft durch ALLE folgenden Stufen — der Pin prueft das
  // KETTENENDE, nicht die einzelne Stufe. Darum die Konstante statt einer Zahl: die Zeile stand
  // auf 42 und fiel bei C10s 42→43, obwohl sie nie eine bestimmte Stufe meinte (29.07.2026).
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

/* ── Die Kollision: Altbestand trifft auf eine bereits vorhandene Zeile ────────────────
   Möglich, sobald jemand die KI-Verfügung per Wizard ausgefüllt (flach in `verwaltung`)
   UND später eine ki-verfuegung-Zeile von Hand in der Liste angelegt hat. Dann treffen
   zwei Werte für dasselbe Unterfeld aufeinander.

   Die erste Fassung dieser Migration nahm den Zielwert und LÖSCHTE den ankommenden —
   spurlos. Das ist derselbe Merge-Schlucker, der am Morgen beim Import gefunden wurde,
   nur in die andere Richtung. Ein Wert, den die Bürgerin selbst eingetragen hat, darf
   nicht verschwinden, weil die Migration ihn für überflüssig hält.

   Regel: Der Zielwert bleibt gültig (er ist die neuere, sichtbare Angabe), aber der
   abweichende Altwert wird SICHTBAR aufgehoben — nicht gelöscht, nicht stumm. */

test('[Mig40] Kollision: der abweichende Altwert verschwindet NICHT spurlos', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({
    schemaVersion: 39,
    sektoren: {
      verwaltung: { ki_grundentscheidung: 'untersagung', ki_raum: 'privat' },
      vorsorge: { vorsorge_instrumente: [
        { id: 'k1', typ: 'ki-verfuegung', ki_grundentscheidung: 'erlaubnis' },   // bereits belegt
      ] },
    },
  });
  const z = kiZeile(d);
  assert.equal(z.basicDecision, 'erlaubnis', 'der bestehende Zeilenwert bleibt gueltig');
  assert.equal(z.scope, 'privat', 'das unbelegte Feld wird normal uebernommen');

  // Der abweichende Altwert muss AUFFINDBAR bleiben — irgendwo im Depot, lesbar für die Bürgerin.
  const alsText = JSON.stringify(d);
  assert.ok(alsText.includes('untersagung'),
    'der abweichende Altwert ist spurlos verschwunden — genau der Merge-Schlucker, gegen den '
    + 'heute frueh schon einmal entschieden wurde');
});

test('[Mig40] Kollision: der aufgehobene Altwert steht in Sie-Form an der Zeile', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({
    schemaVersion: 39,
    sektoren: {
      verwaltung: { ki_grundentscheidung: 'untersagung' },
      vorsorge: { vorsorge_instrumente: [{ id: 'k1', typ: 'ki-verfuegung', ki_grundentscheidung: 'erlaubnis' }] },
    },
  });
  const z = kiZeile(d);
  assert.ok(z.morePreciseDescription && z.morePreciseDescription.includes('untersagung'),
    'der Altwert gehoert an die Zeile selbst — dort sieht die Buergerin ihn beim Bearbeiten');
  assert.ok(/\bSie\b|\bIhr/.test(z.morePreciseDescription),
    'Buerger-Texte durchgehend in der Sie-Form — auch Hinweise aus einer Migration');
  assert.ok(!/\bdu\b|\bdein/i.test(z.morePreciseDescription), 'keine Du-Form');
});

test('[Mig40] KEINE Kollisions-Notiz, wenn der Altwert mit dem Zeilenwert uebereinstimmt', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({
    schemaVersion: 39,
    sektoren: {
      verwaltung: { ki_grundentscheidung: 'erlaubnis' },
      vorsorge: { vorsorge_instrumente: [{ id: 'k1', typ: 'ki-verfuegung', ki_grundentscheidung: 'erlaubnis' }] },
    },
  });
  // Gleicher Wert ist kein Konflikt. Eine Notiz waere hier blosses Rauschen — und Rauschen
  // in einem Hinweis-Feld macht die echten Hinweise unglaubwuerdig.
  assert.ok(!kiZeile(d).morePreciseDescription, 'identische Werte erzeugen keine Notiz');
});

/* ── Die Praefix-Falle ─────────────────────────────────────────────────────────────────
   Die erste Fassung dieser Migration griff alle Schluessel mit `ki_`. Das trifft NICHT nur
   die zwoelf Felder der KI-Verfuegung, sondern auch die fuenf `ki_verhalten_*` — ein
   anderes, frueher entferntes Feature. Sie landeten als Waisen-Schluessel in der KI-Zeile:
   von `verwaltung` entfernt, wo die Lese-App sie noch anzeigte, und in einer Zeile
   abgelegt, in der KEINE App sie deklariert. Ein Wert, den niemand mehr sieht.

   Dieselbe Klasse wie das pauschale vvwiz→pvwiz: eine Operation, die mechanisch passt
   und semantisch falsch ist. Ein Praefix ist keine Zugehoerigkeit.

   Die Migration nimmt deshalb die DEKLARIERTEN Unterfelder als Mass, nicht das Praefix. */

test('[Mig40] die Praefix-Falle: ki_verhalten_* gehoert NICHT zur KI-Verfuegung', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({
    schemaVersion: 39,
    sektoren: {
      verwaltung: { ki_grundentscheidung: 'erlaubnis', ki_verhalten_grundsatz: 'ja', ki_verhalten_dauer: '5 Jahre' },
      vorsorge: {},
    },
  });
  const z = kiZeile(d);
  assert.equal(z.basicDecision, 'erlaubnis', 'das echte KI-Feld zieht um');
  assert.ok(!('ki_verhalten_grundsatz' in z),
    'ki_verhalten_* darf NICHT in der KI-Zeile landen — dort ist es an keiner Stelle deklariert '
    + 'und damit fuer beide Apps unsichtbar');
  assert.equal((d.sektoren.administration || {}).ki_verhalten_grundsatz, 'ja',
    'ki_verhalten_* bleibt, wo es ist — die Lese-App zeigt es dort noch, und die Verwaisungsregel '
    + 'verbietet, Bestandsdaten wegen einer fremden Migration zu verschieben');
  assert.equal((d.sektoren.administration || {}).ki_verhalten_dauer, '5 Jahre');
});

test('[Mig40] es zieht genau um, was an der Zeile deklariert ist — nicht mehr', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({
    schemaVersion: 39,
    sektoren: { verwaltung: { ki_grundentscheidung: 'erlaubnis', ki_frei_erfunden: 'x' }, vorsorge: {} },
  });
  assert.ok(!('ki_frei_erfunden' in kiZeile(d)), 'ein unbekanntes ki_-Feld zieht nicht mit');
  assert.equal((d.sektoren.administration || {}).ki_frei_erfunden, 'x', 'es bleibt unangetastet stehen');
});
