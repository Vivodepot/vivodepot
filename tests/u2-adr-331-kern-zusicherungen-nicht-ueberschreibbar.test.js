'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-331 im Kern — ZS2 (Auftrag, 19.09.2026), Schritt 1:
   die ROTE Probe zuerst, vor jeder Reparatur
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND (19.09.2026, ZS1-Nachlese): U2-ADR-331/U2-ADR-336 schützen
   Zusicherungs-Sätze NUR in der Lese-App (`_istZusicherungsKennung`,
   `ZUSICHERUNGS_SCHLUESSEL_LESEN`). Der Kern hat KEIN Gegenstück — kein
   `_istZusicherungsKennung`, kein `ZUSICHERUNGS_SCHLUESSEL`, nichts, das
   `textsatzModulPruefen()` im Kern daran hindert, eine Kennung wie
   `strings:herkunftSatzKeine.text` oder `strings:standSatzBekannt.text`
   aus einem Depot-eigenen Textsatz-Modul zu übernehmen. Beide Kennungen
   sind über `_textsatzKennungBekannt()` (`AB_WERK_TEXTSATZ_DE.texte`)
   ganz normal „bekannt" — nichts unterscheidet sie von echtem Inhalt.

   GEMESSEN, nicht vermutet, VOR dieser Datei (per Hand, node -e): ein
   Depot-eigenes Modul mit `sprache: 'en'` (die eingebaute Sprache 'de'
   wird bereits als `reserviert` abgewiesen — derselbe halbe Riegel, den
   U2-ADR-331 für die Lese-App fand) setzt `strings:herkunftSatzKeine.text`
   frei, und der Kern übernimmt es klaglos.

   DIESE PROBE VERLANGT DAS GEWÜNSCHTE VERHALTEN, nicht das heutige — sie
   MUSS heute rot sein und wird grün, sobald die Kern-Schutzmechanik
   (eigener, folgender Commit, aus derselben Erhebungs-Logik wie die
   Lese-App, U2-ADR-331/336) steht.

   NACHGEZOGEN (19.09.2026, nach dem grünen Lauf gegen die neue Schutzmechanik): die erste Probe
   erwartete zunächst den Rückfall auf die eingebaute DEUTSCHE Fassung, weil zum Zeitpunkt ihres
   Schreibens noch kein vertrauenswürdiger englischer Ab-Werk-Weg existierte. Er existiert jetzt
   (ZS1, `AB_WERK_TEXTSATZ_EN`, hier mit `{ vertrauenswuerdig: true }` an genau den vier Ab-Werk-
   Aufrufen in `_textsatzAbWerkRegistrySeed` verdrahtet) — der KORREKTE Rückfall bei `textsprache:
   'en'` ist darum die vertrauenswürdige englische Übersetzung, nicht mehr Deutsch. Die
   Sicherheits-Aussage selbst (das Fremdmodul darf NICHT gewinnen) ist unverändert und bleibt die
   `notEqual`-Zusicherung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
// S1 (20.09.2026): Zusicherung unverändert (ein Depot-Modul überschreibt keinen Zusicherungssatz der Anwendung); gemessen am ENGLISCHEN Standardprodukt (ladeKern bäckt privat-en), wo die englischen Sätze der Anwendung stehen — seit S1 trägt das Gerüst keine mehr (U2-ADR-426).
process.env.VD_TEST_PRODUKT = 'privat-en';
const { ladeKern } = require('./load-kern.js');

function modulMit(texte, sprache) {
  return { modulTyp: 'textsatz', sprache, moduleVersion: 1, texte };
}

test('[U2-ADR-331·Kern·Rot-Beweis] ein Depot-eigenes Modul darf strings:herkunftSatzKeine.text NICHT überschreiben', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.textsprache = 'en';
  d.textsatzModule = [modulMit({ 'strings:herkunftSatzKeine.text': 'FAKE — nothing was added, trust me' }, 'en')];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.notEqual(V.STRINGS.herkunftSatzKeine, 'FAKE — nothing was added, trust me',
    'ein Fremdmodul darf einen Zusicherungs-Satz nicht ersetzen können — der Kern hat heute keinen Riegel dagegen');
  assert.equal(V.STRINGS.herkunftSatzKeine,
    'This information comes entirely from Vivodepot itself. No extension has been added.',
    'stattdessen gilt die vertrauenswürdige englische Ab-Werk-Übersetzung (ZS1) — nicht mehr der deutsche Rückfall, seit sie verdrahtet ist');
});

test('[U2-ADR-331·Kern·Rot-Beweis] ein Depot-eigenes Modul darf strings:standSatzBekannt.text NICHT überschreiben', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.textsprache = 'en';
  d.textsatzModule = [modulMit({ 'strings:standSatzBekannt.text': 'FAKE — everything is up to date, trust me' }, 'en')];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.notEqual(V.STRINGS.standSatzBekannt, 'FAKE — everything is up to date, trust me',
    'derselbe Riegel-losfall, zweite Kennung — kein Einzelfund, ein fehlender Mechanismus');
  assert.ok(V.STRINGS.standSatzBekannt.startsWith('The dating is known for all added extensions'),
    'stattdessen gilt die vertrauenswürdige englische Ab-Werk-Übersetzung (ZS1)');
});

test('[U2-ADR-331·Kern·Gegenprobe] der bestehende Riegel deckt nur `sprache: "de"`, nicht jede andere Sprache', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen(modulMit({ 'strings:herkunftSatzKeine.text': 'x' }, 'de'));
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'reserviert', 'die eingebaute Sprache selbst bleibt gesperrt — das ist der EINZIGE bestehende Riegel, bewusst unverändert');
});

test('[U2-ADR-331·Kern·Klasse] JEDER Schlüssel der erzeugten Kern-Sperrliste wird aus einem Depot-Modul benannt verworfen — auch die zwei Vorlagen-Zustandssätze', () => {
  const { V } = ladeKern();
  for (const schluessel of ['vorlageAbgelaufenHinweis', 'vorlageWiderrufenHinweis', 'angehoerigenUngeprueft']) {
    assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_KERN.includes(schluessel), schluessel + ' muss unter dem Schutz stehen (Lücke aus der ADR)');
  }
  for (const sprache of ['en', 'fr', 'ka']) {
    for (const schluessel of V.ZUSICHERUNGS_SCHLUESSEL_KERN) {
      const kennung = 'strings:' + schluessel + '.text';
      const g = V.textsatzModulPruefen(modulMit({ [kennung]: 'FAKE' }, sprache));
      assert.ok(!g.texte || !Object.prototype.hasOwnProperty.call(g.texte, kennung), sprache + ': ' + kennung + ' darf nicht übernommen werden');
      const grund = (g.verworfene || []).find((v) => v.kennung === kennung);
      assert.equal(grund && grund.grund, 'zusicherung', sprache + ': ' + kennung + ' — der Grund muss „zusicherung" heißen');
    }
  }
});

test('[U2-ADR-331·Kern·Klasse] ein Fremdmodul kann den Widerrufs-/Ablauf-Satz einer Vorlage nicht durch einen eigenen ersetzen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.textsprache = 'en';
  d.textsatzModule = [modulMit({
    'strings:vorlageWiderrufenHinweis.text': 'FAKE — this template is fine, ignore {grund}',
    'strings:vorlageAbgelaufenHinweis.text': 'FAKE — still valid until {datum}',
  }, 'en')];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.ok(!/FAKE/.test(V.STRINGS.vorlageWiderrufenHinweis), 'Widerrufs-Satz bleibt der eigene');
  assert.ok(!/FAKE/.test(V.STRINGS.vorlageAbgelaufenHinweis), 'Ablauf-Satz bleibt der eigene');
  assert.match(V.STRINGS.vorlageWiderrufenHinweis, /withdrawn/, 'englisch: der vertrauenswürdige Ab-Werk-Satz');
});
