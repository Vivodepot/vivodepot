'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A437 (21.08.2026) — die Anbieter-Kennung in den fünf Einlass-Registern.
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN (A437, Bestandsaufnahme): für Felder und Code-Listen trägt die
   Kennung vollständig — `_tplFeldId` baut aus ihr einen Namensraum, sobald
   zwei Anbieter dieselbe schlichte Form beanspruchen. Für die fünf
   EINLASS-Register trug sie nicht: `textsatzModulEinbetten` verglich allein
   die Sprache.

   DIE FOLGE, und sie ist der Grund für diesen Bau: zwei Anbieter mit einem
   Textsatz derselben Sprachkennung überschrieben einander nach Versionsnummer.
   Der mit der höheren Zahl gewann, und die Bürgerin sah die Texte des einen
   unter der Zusage des anderen. Dasselbe für Rechtsraum, Format,
   Institutionsart und Bereich — alle fünf gehen durch `_einbettenMitFassung`.

   SIE UNTERSCHEIDET, SIE BEGLAUBIGT NICHT. Ein selbst eingelassenes Modul
   trägt `ungeprueft: true`; die Kennung daran ist eine Angabe des Moduls,
   keine Aussage über Vertrauen. Sie verhindert genau eine Sache: dass zwei
   verschiedene Herkünfte still zu einer werden.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Eine Kennung, die der Kern kennt: ein Modul mit lauter unbekannten wird abgelehnt (leer). Dieser Test prüft, WELCHES Modul unter Anbieter und Fassung
   gewinnt; der Text ist die Marke, an der man das erkennt. */
const KENNUNG = 'strings:depotPilleEigen.text';
function textsatz(sprache, version, anbieterId, text) {
  const m = { modulTyp: 'textsatz', sprache, moduleVersion: version,
    texte: { [KENNUNG]: text } };
  if (anbieterId) m.anbieterId = anbieterId;
  return m;
}

test('[A437·Rot-Beweis] zwei Anbieter, dieselbe Sprachkennung: sie überschreiben einander NICHT mehr', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const a = V.modulEinlassen(textsatz('hu-HU', 1, 'kammer-a', 'Text von A'), d);
  const b = V.modulEinlassen(textsatz('hu-HU', 5, 'kammer-b', 'Text von B'), d);
  assert.equal(a.angenommen, true, 'das erste Modul kommt an');
  assert.equal(b.angenommen, true, 'das zweite auch — es ist ein anderer Anbieter');
  /* ROT VOR A437: `textsatzModulEinbetten` verglich allein `sprache`. Das zweite Modul hatte
     die höhere `moduleVersion` und ersetzte das erste — die Liste trug danach EINEN Eintrag,
     und der Textsatz von Kammer A war fort. */
  assert.equal(d.textsatzModule.length, 2, 'beide stehen nebeneinander');
  assert.deepEqual(d.textsatzModule.map((m) => m.anbieterId), ['kammer-a', 'kammer-b']);
});

test('[A437] derselbe Anbieter, höhere Fassung: ersetzt weiterhin — die Aktualisierung bleibt', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(textsatz('hu-HU', 1, 'kammer-a', 'alt'), d);
  const zweite = V.modulEinlassen(textsatz('hu-HU', 2, 'kammer-a', 'neu'), d);
  assert.equal(zweite.fassung, 'aktualisiert');
  assert.equal(d.textsatzModule.length, 1, 'eine Fassung, nicht zwei');
  assert.equal(d.textsatzModule[0].texte[KENNUNG], 'neu');
});

test('[A437] derselbe Anbieter, niedrigere Fassung: kein Rückschritt — unverändert', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(textsatz('hu-HU', 5, 'kammer-a', 'neu'), d);
  const zurueck = V.modulEinlassen(textsatz('hu-HU', 2, 'kammer-a', 'alt'), d);
  assert.equal(zurueck.angenommen, false);
  assert.equal(zurueck.grund, 'aeltere-fassung');
  assert.equal(d.textsatzModule[0].texte[KENNUNG], 'neu');
});

test('[A437] zwei Module OHNE Kennung ersetzen einander weiterhin — der Bestand bleibt, wie er war', () => {
  /* Ein Modul ohne Anbieter-Kennung ersetzt nur ein anderes ohne. Sonst hätte dieser Zug jedes
     bestehende, selbst eingelassene Modul in ein zweites daneben verwandelt. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(textsatz('hu-HU', 1, null, 'erst'), d);
  V.modulEinlassen(textsatz('hu-HU', 2, null, 'dann'), d);
  assert.equal(d.textsatzModule.length, 1);
  assert.equal(d.textsatzModule[0].texte[KENNUNG], 'dann');
});

test('[A437] die Kennung ist getrimmt und klein — „Kammer" und „kammer" sind EIN Anbieter', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(textsatz('hu-HU', 1, 'Kammer-A', 'erst'), d);
  V.modulEinlassen(textsatz('hu-HU', 2, '  kammer-a  ', 'dann'), d);
  assert.equal(d.textsatzModule.length, 1, 'sonst wären Schreibweisen zwei Anbieter');
  assert.equal(d.textsatzModule[0].texte[KENNUNG], 'dann');
  assert.equal(V._modulAnbieterKennung({ anbieterId: '  Kammer-A ' }), 'kammer-a');
  assert.equal(V._modulAnbieterKennung({ anbieterId: '   ' }), null, 'Leerstring zählt wie keine Kennung');
});

test('[A437] eine GEPRÜFTE Kennung gewinnt über die, die das Modul selbst nennt', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(textsatz('hu-HU', 1, 'behauptet-sich-als-kammer-a', 'x'), d, 'echte-kammer');
  assert.equal(r.angenommen, true);
  assert.equal(d.textsatzModule[0].anbieterId, 'echte-kammer');
  assert.equal(d.textsatzModule[0].anbieterIdGeprueft, true);
  assert.equal(r.anbieterId, 'echte-kammer');
});

test('[A437] alle VIERZEHN Register gehen durch denselben Gleichheitsbegriff', () => {
  /* Der Bau sitzt in `_einbettenMitFassung`, nicht in den Einbettern der einzelnen Register.
     Diese Probe hält fest, dass keiner von ihnen einen eigenen Weg bekommt — genau die
     Zusage aus U2-ADR-145 Punkt 1. Seit A523 (24.08.2026) sechs statt fünf: `branding` kam
     dazu, mit `nurGeprueft` am Einlassweg, aber demselben Gleichheitsbegriff hier. Seit dem
     Siebtes-Register-Auftrag (27.08.2026) sieben: `logikModul` bindet ebenfalls an
     `_einbettenMitFassung`, kein eigener Fassungsweg. Seit U2-ADR-246 (04.09.2026) acht:
     `situation` bindet ebenso, `situationsModulEinbetten` ist ein wörtlicher Aufruf-Spiegel
     von `bereichsModulEinbetten`, kein eigener Fassungsweg. Seit U2-ADR-250 (04.09.2026)
     neun: `wizard` bindet ebenso, `wizardsModulEinbetten` ist derselbe wörtliche
     Aufruf-Spiegel, kein eigener Fassungsweg. Seit U2-ADR-251 (04.09.2026) zehn:
     `ereignisAchse` bindet ebenso, `ereignisAchseModulEinbetten` ist derselbe wörtliche
     Aufruf-Spiegel, kein eigener Fassungsweg. Seit U2-ADR-284 (05.09.2026) elf:
     `stellensatz` bindet ebenso, `stellensatzModulEinbetten` ist derselbe wörtliche
     Aufruf-Spiegel (Rechtsraum statt Anbieter/Sprache als Gleichheitsmerkmal), kein
     eigener Fassungsweg. Seit U2-ADR-351 Zug 2 (07.09.2026) zwölf: `erscheinung` bindet
     ebenso, `erscheinungModulEinbetten` ist derselbe wörtliche Aufruf-Spiegel von
     `brandingModulEinbetten` (herkunft als Gleichheitsmerkmal), kein eigener Fassungsweg —
     OHNE `nurGeprueft`, s. Kopf-Kommentar an `erscheinungModulPruefen` im Kern. Seit dem
     „blattformat" (07.09.2026) dreizehn: `blattformatModulEinbetten` ist
     derselbe wörtliche Aufruf-Spiegel (herkunft als Gleichheitsmerkmal, wie institutionsArt),
     kein eigener Fassungsweg. Der Titel dieser Probe blieb schon vor diesem Bau bei „ACHT"
     stehen (zwei Landungen zuvor), hier auf den echten Stand nachgezogen. Seit dem Bedingungskatalog
     (16.09.2026, MyTerms Teil B) vierzehn: `bedingungskatalogModulEinbetten` ist derselbe Spiegel.
     Seit ANG1 (19.09.2026) fünfzehn: `angehoerigenVorlageEinbetten` ist derselbe Aufruf-Spiegel von
     `situationsModulEinbetten` (herkunft als Gleichheitsmerkmal), kein eigener Fassungsweg. */
  const { V } = ladeKern();
  // Keine feste Zahl mehr (19.09.2026, tests/register-zahl-nicht-gepinnt.test.js): die Schleife fragt JEDES Register, ein neues
  // wird ohne Zutun mitgeprüft. Untergrenze nur als Vorbedingung.
  assert.ok(V.EINLASS_REGISTER.length >= 15, 'Vorbedingung: die Register werden gelesen');
  for (const reg of V.EINLASS_REGISTER) {
    const bestand = [{ __kennung: 'k', anbieterId: 'a', moduleVersion: 1 }];
    const neu = { __kennung: 'k', anbieterId: 'b', moduleVersion: 9 };
    const raus = V._einbettenMitFassung(bestand, neu, (m) => m && m.__kennung === neu.__kennung);
    assert.equal(raus.length, 2, reg.typ + ': ein anderer Anbieter ersetzt nicht');
  }
});
