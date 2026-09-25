'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-253 · Paket 3, Commit A — die Konsumenten werden entkoppelt, bevor
   irgendein Inhalt zieht
   ────────────────────────────────────────────────────────────────────────
   Der Beleg für Commit A lautet: das Verhalten der laufenden App bleibt
   IDENTISCH, weil bereicheAlle()/situationenAlle()/wizardsAlle()/
   ereignisAchseFelderAlle() ohne angemeldetes Modul exakt das native Array
   zurückgeben — kein „sollte passen", ein Beleg, der geführt wird.

   Vier reservierte Namensräume (BEREICH_IDS_EINGEBAUT/SITUATION_IDS_EINGEBAUT/
   WIZARD_IDS_EINGEBAUT/EREIGNIS_ACHSE_TRIPEL_EINGEBAUT) sind jetzt fest
   verdrahtet statt aus den nativen Arrays abgeleitet — sonst liefe die Sperre
   ins Leere, sobald SEKTOREN/SITUATIONEN/WIZARDS/EREIGNIS_ACHSE_FELDER sich in
   Paket 3 Commit B leeren. Der vierte (ereignisAchse) ist NEU — dort fehlte
   die reservierte-Namensraum-Prüfung bislang ganz (ADR-251 §4, bewusste
   Lücke; der Zensus 04.09.2026 schließt sie).

   U2-ADR-275 (04.09.2026): ein FÜNFTER Namensraum, INSTITUTION_ART_EINGEBAUT,
   bekommt dieselbe Korrektur — er war bislang `Object.freeze(Object.values(
   INSTITUTION_ART))`, also weiterhin abgeleitet, nicht Teil von Commit A oben
   (institutionsArt ist eines der vier älteren Register, keins der beiden neuen
   aus U2-ADR-246/250/251). Gefunden bei der Vorbereitung des Paket-5-Teilauszugs
   (Messung "kann institutionsArt heute schon als Modul heraus" — ja, aber nur
   mit dieser Korrektur zuerst, sonst entstünde beim Herauslösen genau die Lücke,
   die hier für die anderen vier bereits geschlossen wurde). Berührt NICHT
   `INSTITUTION_ART` selbst — der Handkopien-Wächter (U2-ADR-262,
   tools/handkopien-gegen-original-pruefen.js) vergleicht dessen Werte weiterhin
   gegen die unveränderte Kopie in vivodepot-template-generator.html.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* ══ Die vier reservierten Listen — Werte fest, gegen den bisherigen
   `<Array>.map(...)`-Stand geprüft ════════════════════════════════════ */

test('[Entkopplung] BEREICH_IDS_EINGEBAUT trägt exakt die dreizehn nativen Sektor-IDs, in Datei-Reihenfolge', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.BEREICH_IDS_EINGEBAUT, [
    'identity', 'people', 'mobility', 'finance', 'assets', 'health',
    'education', 'socialInsurance', 'advanceCare', 'administration', 'housing', 'emergencyPreparedness',
    'personal',
  ]);
});

test('[Entkopplung] SITUATION_IDS_EINGEBAUT trägt exakt die zehn nativen Situations-IDs', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.SITUATION_IDS_EINGEBAUT, [
    'geburt', 'volljaehrig', 'hauskauf', 'notar', 'arzt', 'einfach-so', 'krankenhaus',
    'pflegeheim', 'erbfall', 'todesfall-uebernahme',
  ]);
});

test('[Entkopplung] WIZARD_IDS_EINGEBAUT trägt exakt die sieben nativen Assistenten-IDs', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.WIZARD_IDS_EINGEBAUT,
    ['gebwiz', 'pvwiz', 'kiwiz', 'anamwiz', 'pflwiz', 'heirwiz', 'umzwiz']);
});

test('[Entkopplung·neu] EREIGNIS_ACHSE_TRIPEL_EINGEBAUT trägt alle 33 nativen Tripel — vorher gab es diese Liste gar nicht', () => {
  const { V } = ladeKern();
  assert.equal(V.EREIGNIS_ACHSE_TRIPEL_EINGEBAUT.length, 33);
  const ausDenFeldern = V.EREIGNIS_ACHSE_FELDER.map((e) => e.sektorId + '.' + e.feldId + '.' + (e.unterFeldId || ''));
  assert.deepEqual(V.EREIGNIS_ACHSE_TRIPEL_EINGEBAUT.slice().sort(), ausDenFeldern.slice().sort(),
    'die feste Liste muss exakt dieselben Tripel tragen wie EREIGNIS_ACHSE_FELDER selbst');
});

test('[Entkopplung·U2-ADR-275] INSTITUTION_ART_EINGEBAUT trägt exakt die zwölf nativen Institutions-Kennungen, in Datei-Reihenfolge', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.INSTITUTION_ART_EINGEBAUT, [
    'krankenkasse', 'pflegekasse', 'pflegedienst', 'krankenhaus', 'arztpraxis', 'bestatter',
    'bank', 'versicherung', 'standesamt', 'meldebehoerde', 'behoerde', 'arbeitgeber',
  ]);
  assert.deepEqual(V.INSTITUTION_ART_EINGEBAUT.slice().sort(), Object.values(V.INSTITUTION_ART).slice().sort(),
    'dieselben zwölf Werte wie das (weiterhin vorhandene) INSTITUTION_ART-Objekt, nur nicht mehr davon abgeleitet');
});

/* ══ *Alle() ohne angemeldetes Modul == das native Array — der eigentliche
   Beleg, dass Commit A ein reiner Refactor ist, kein Verhaltens-Change ══ */

test('[Refactor-Beleg] bereicheAlle()/situationenAlle()/wizardsAlle()/ereignisAchseFelderAlle() liefern ohne Modul exakt das native Array', () => {
  const { V } = ladeKern();
  /* STUFE 2 HAT DIESE EINE ZUSICHERUNG GEÄNDERT (09.09.2026), und das ist kein Nachgeben,
     sondern der Gegenstand des Umbaus.

     Die Probe belegt: ohne angedocktes Modul liefern die `…Alle()`-Funktionen exakt den
     nativen Bestand — sie fügen nichts hinzu und lassen nichts weg. Für Situationen, Wizards
     und die Ereignis-Achse gilt das unverändert; ihre Zeilen stehen darunter wörtlich wie
     zuvor.

     FÜR BEREICHE GILT ES NICHT MEHR, weil der native Bestand nicht mehr in EINER Liste liegt:
     `wohnen` kommt über die Ab-Werk-Saat und damit über die Registry, nicht über das Bündel.
     `bereicheAlle()` führt beide zusammen — genau das ist seine Aufgabe. Ein `deepEqual` gegen
     `SEKTOREN` würde jetzt verlangen, dass die Saat leer bleibt, und damit den Umzug selbst
     verbieten.

     WAS AN SEINE STELLE TRITT, und es ist die schärfere Aussage: `bereicheAlle()` ist die
     VEREINIGUNG aus Bündel-Liste und Registry, ohne Zutat und ohne Verlust. Die alte Fassung
     war der Sonderfall davon, solange die Registry leer war. */
  const ausRegistry = V.bereicheAlle().filter((b) => !V.SEKTOREN.some((s) => s.id === b.id));
  assert.deepEqual(
    V.bereicheAlle().map((b) => b.id).slice().sort(),
    V.SEKTOREN.map((s) => s.id).concat(ausRegistry.map((b) => b.id)).sort(),
    'bereicheAlle() ist Bündel-Liste plus Registry — nichts erfunden, nichts verloren');
  assert.deepEqual(V.SEKTOREN.filter((s) => !V.bereicheAlle().some((b) => b.id === s.id)), [],
    'und kein Bereich der Bündel-Liste fällt dabei heraus');
  assert.deepEqual(V.situationenAlle(), V.SITUATIONEN);
  assert.deepEqual(V.wizardsAlle(), V.WIZARDS);
  assert.deepEqual(V.ereignisAchseFelderAlle(), V.EREIGNIS_ACHSE_FELDER);
});

/* ══ Der obige Beleg allein würde einen Rückfall auf SEKTOREN NICHT fangen: ohne
   angemeldetes Modul ist bereicheAlle() === SEKTOREN, wertgleich, in JEDEM der acht
   Proben oben. Erst ein wirklich angedocktes Modul trennt die beiden Wege — genau das
   prüft dieser Block, gezielt für _textsatzOrteBegehen (Einwand, 04.09.2026):
   ein echter Rot-Lauf beweist, dass eine Probe LÄUFT — nicht, dass sie den Mangel
   FINDET, den sie bewachen soll (Unterschied gemessen am 04.09. mit dem fehlenden
   load-kern.js-Export: der Rot-Lauf dort war ein Infrastruktur-Fehler, kein Fund).
   Rot-Beweis erbracht, nicht nur behauptet: `_textsatzOrteBegehen` wurde testweise
   auf `_textsatzAufSektorenAnwenden(SEKTOREN, tun)` (roh, ohne bereicheAlle())
   zurückgenommen — die Probe unten lief ROT (der Spion sah `x-textsatz-spion-bereich`
   nicht), danach sofort zurückgenommen und erneut GRÜN bestätigt. ═══════════════ */

test('[Rot-Beweis] _textsatzOrteBegehen besucht ein angedocktes Bereichs-Modul wirklich, nicht nur bereicheAlle() selbst', () => {
  const { V } = ladeKern();
  const modul = {
    moduleVersion: 1, herkunft: 'test-anbieter', sprache: 'de',
    bereiche: { 'x-textsatz-spion-bereich': { label: 'Spion-Bereich', merkmale: [], rollen: [], sektionen: [] } },
  };
  const n = V._bereichsModuleAusDepotAnmelden({ bereichsModule: [modul] });
  assert.equal(n, 1, 'Modul wirklich angemeldet, Grund bei 0: ' + JSON.stringify(V.BEREICHS_MODUL_VERWORFEN));
  assert.ok(V.bereicheAlle().some((s) => s.id === 'x-textsatz-spion-bereich'), 'bereicheAlle() trägt das Modul');

  const besucht = [];
  V._textsatzOrteBegehen((knoten, kennung) => { besucht.push(kennung); return []; });

  assert.ok(besucht.includes('x-textsatz-spion-bereich'),
    'ROT ERWARTET, sobald _textsatzOrteBegehen wieder das rohe SEKTOREN statt bereicheAlle() besucht: '
    + 'der Spion sähe das angedockte Modul dann nicht — besuchte Kennungen: ' + JSON.stringify(besucht.slice(0, 5)) + '…');
  assert.ok(besucht.includes('identity'), 'natives Feld bleibt weiter besucht, keine Regression');
});

/* ══ Die neue Sperre bei ereignisAchse: ein Modul darf kein natives Tripel
   beanspruchen — wörtlicher Spiegel von Bereich/Situation/Assistent ═══ */

test('[Prüfer·neu] ein Modul-Eintrag mit einem NATIVEN Tripel wird verworfen — grund:reserviert, wie bei den anderen drei Registern', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'test-anbieter',
    eintraege: [{ sektorId: 'advanceCare', feldId: 'provisionInstruments', unterFeldId: 'authorizedPersons', ereignisse: ['tod'] }],
  });
  assert.equal(g.gueltig, false);
  assert.ok(g.verworfene.some((v) => v.grund === 'reserviert' && v.sektorId === 'advanceCare' && v.feldId === 'provisionInstruments'));
});

test('[Prüfer·neu·Positivkontrolle] ein Modul-Eintrag mit einem NICHT-reservierten Tripel bleibt gültig', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'test-anbieter',
    eintraege: [{ sektorId: 'identity', feldId: 'x_neues_test_feld', ereignisse: ['tod'] }],
  });
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund);
});

test('[Prüfer·neu] reserviert wird VOR doppelt-im-modul geprüft — kein Eintrag fällt stattdessen auf die schwächere Meldung', () => {
  const { V } = ladeKern();
  const g = V.ereignisAchseModulPruefen({
    moduleVersion: 1, herkunft: 'test-anbieter',
    eintraege: [
      { sektorId: 'advanceCare', feldId: 'provisionInstruments', unterFeldId: 'authorizedPersons', ereignisse: ['tod'] },
      { sektorId: 'advanceCare', feldId: 'provisionInstruments', unterFeldId: 'authorizedPersons', ereignisse: ['geburt'] },
    ],
  });
  assert.equal(g.verworfene.length, 2);
  assert.ok(g.verworfene.every((v) => v.grund === 'reserviert'),
    'beide reserviert, keins fällt auf doppelt-im-modul: ' + JSON.stringify(g.verworfene));
});
