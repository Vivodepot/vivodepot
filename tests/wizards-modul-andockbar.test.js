'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-250 · Assistenten werden andockbar — das neunte Einlass-Register
   ────────────────────────────────────────────────────────────────────────
   Paket 2a des Gerüst-Umbaus (Konzept 03.09.2026, Nachtrag 04.09.2026): vor
   diesem ADR war WIZARDS vollständig hartcodiert, `WIZARD_BY_ID` ein `const`
   ohne jede Registry-Anbindung — gemessen, nicht angenommen (Nachricht vom
   04.09.2026, "Paket 3 ist frei" nur zur Hälfte).

   WÖRTLICHER SPIEGEL von `tests/situations-modul-andockbar.test.js`
   (U2-ADR-246, das achte Register) — dieselbe Bauart, auf Assistenten
   übertragen: Registry (`_WIZARDS_MODUL_REGISTRY`) · Prüfer
   (`wizardsModulPruefen`) · Anmeldung (`_wizardsModuleAusDepotAnmelden`) ·
   Merge (`wizardsAlle`) · Einbetten (`wizardsModulEinbetten`) ·
   EINLASS_REGISTER-Eintrag `wizard`.

   NICHT ÜBERNOMMEN, weil bei Assistenten kein Vorbild existiert: die
   Vorlagen-Übersetzung eines eigenen Felds und die Render-Injektion. Ein
   Assistenten-Schritt trägt sein Feld immer inline (kein externer Katalog,
   der geschützt werden müsste) — s. Kopfkommentar bei `wizardsModulPruefen`
   im Kern. Deshalb hier zusätzlich, ohne Situations-Vorbild: die `ziel`-
   Auflösung (ein Assistent ohne auflösbares Ziel wird benannt verworfen).

   NACHTRAG U2-ADR-294 (05.09.2026): der hier offen gelassene Aufrufer-Weg ist seither gebaut
   — `renderSektor()` zieht angedockte, sektor-zielende Assistenten jetzt selbst, s.
   `tests/wizard-sektor-aufrufer-u2-adr-294.test.js`. Bewusst weiterhin offen: ein Assistent mit
   `ziel.situation` startet heute nur über die native, hartkodierte Anlass-Auswahl — sie für
   angedockte Assistenten zu öffnen bleibt ein eigenständiges, größeres Gerüst-Stück.

   NACHTRAG „Lücke 2" (07.09.2026, C2-Nachtrag): `NOTFALL_ASSISTENT` trug bis hierher
   `ziel:{situation:'geburt'}` mit einem eigenen, frei erfundenen Feld (`x_notfall_kontakt`,
   `herkunft:'test-anbieter'`) — und WURDE ANGENOMMEN. Gemessen (nicht vermutet): das war die
   Lücke selbst, festgeschrieben, nicht übersehen — kein Riegel verband `wizardsModulPruefen`
   mit der Feld-Erlaubnisliste der Zielsituation, ein Dritt-Modul-Wizard konnte darum ein
   beliebiges eigenes Feld in JEDE Situation schreiben (Befund:
   `luecke2-situations-wizard-riegel-zusammenwirken-2026-09-07.md`). Die Fixture zielt seither
   auf `ziel:{sektor:'identitaet'}` — dort ist ein Wizard-eigenes Feld ausdrücklich sanktioniert
   (Baukasten-Konzept Abschnitt III, „ergänzt Fehlendes dort, wo es hingehört"), die generische
   Andock-Mechanik, die dieser Test prüft, bleibt unberührt. Der alte Fall steht unten als
   eigener Rot-Beweis samt Gegenprobe (Abschnitt „Lücke 2").
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

const NOTFALL_ASSISTENT = {
  modulTyp: 'wizard', moduleVersion: 1, herkunft: 'test-anbieter', sprache: 'de',
  wizards: {
    'test-notfallwiz': {
      icon: 'star', titel: 'Notfall-Assistent', einleitung: 'Kurz und knapp.',
      ziel: { sektor: 'identity' },
      schritte: [{ feld: { id: 'x_notfall_kontakt', typ: 'text', label: 'Kontakt' }, frage: 'Wer ist zu erreichen?' }],
      abschluss: {},
    },
  },
};

/* ══ Register, Prüfer, Anmeldung ═══════════════════════════════════════ */

test('[Register] der Einlassweg führt ein neuntes Register, es heißt wizard', () => {
  const { V } = ladeKern();
  const typen = V.EINLASS_REGISTER.map((r) => r.typ);
  assert.ok(typen.includes('wizard'), 'Register vorhanden: ' + typen.join(','));
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'wizard');
  assert.equal(reg.slot, 'wizardsModule');
  assert.equal(reg.kennung(NOTFALL_ASSISTENT), 'test-anbieter', 'die Kennung ist die Herkunft, nicht eine Assistenten-ID');
});

test('[Migrationsstufe] legt den Slot an — und schreibt nichts um', () => {
  const { V } = ladeKern();
  const alt = Object.assign(V.leeresDepot(), { schemaVersion: 76 });
  delete alt.wizardsModule;
  alt.situationen.geburt = { klinik: 'Klinikum München' };
  const neu = V.depotNormalisieren(alt);
  assert.deepEqual(neu.wizardsModule, [], 'Slot angelegt und LEER');
  assert.ok(neu.schemaVersion >= 77, 'mindestens bis 77 gestiegen: ' + neu.schemaVersion);
  assert.equal(neu.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(neu.situationen.geburt.klinik, 'Klinikum München', 'kein Bestandswert angefasst');
});

test('[Prüfer] eine reservierte, eingebaute Assistenten-ID wird verworfen — benannt, nicht schweigend', () => {
  const { V } = ladeKern();
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    wizards: {
      gebwiz: { titel: 'Übernahmeversuch', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'y' }, frage: 'z' }] },  // eingebaut — reserviert
      // ziel:sektor statt ziel:situation (Lücke-2-Nachtrag, 07.09.2026) — dieser Test prüft die
      // reservierte-ID-Ablehnung, nicht die Situations-Feld-Erlaubnisliste; ein eigenes Feld auf
      // einem Sektor ist unverändert offen (s. Kopfkommentar).
      'x-eigen': {
        titel: 'Eigener Assistent', ziel: { sektor: 'identity' },
        schritte: [{ feld: { id: 'x', typ: 'text' }, frage: 'Frage?' }],
      },
    },
  });
  assert.equal(g.gueltig, true, 'ein verworfener Eintrag verwirft nicht das ganze Modul');
  const ids = g.wizards.map((w) => w.id);
  assert.deepEqual(ids, ['x-eigen']);
  assert.ok(g.verworfene.some((v) => v.id === 'gebwiz' && v.grund === 'reserviert'));
});

test('[Prüfer·rot] ohne moduleVersion, ohne Herkunft, ohne brauchbaren Eintrag gibt es kein Modul', () => {
  const { V } = ladeKern();
  assert.equal(V.wizardsModulPruefen(null).grund, 'kein-objekt');
  assert.equal(V.wizardsModulPruefen({ herkunft: 'x', wizards: {} }).grund, 'moduleVersion');
  assert.equal(V.wizardsModulPruefen({ moduleVersion: 1, wizards: {} }).grund, 'herkunft');
  const nurMuell = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de', wizards: { 'GROSS UND FALSCH': { titel: 'x' } },
  });
  assert.equal(nurMuell.gueltig, false, 'ein Modul ohne einen einzigen tragbaren Assistenten ist keins');
  assert.equal(nurMuell.grund, 'leer');
});

test('[Prüfer·rot] ein Assistent ohne Titel wird verworfen', () => {
  const { V } = ladeKern();
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    wizards: { 'ohne-titel': { titel: '', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] } },
  });
  assert.equal(g.gueltig, false);
  assert.equal(g.grund, 'leer');
  assert.ok(g.verworfene.some((v) => v.id === 'ohne-titel' && v.grund === 'kein-titel'));
});

test('[Prüfer·rot] ein Assistent mit unauflösbarem Ziel wird benannt verworfen — weder nativ noch angedockt', () => {
  const { V } = ladeKern();
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    wizards: {
      'x-verwaist': { titel: 'Verwaist', ziel: { situation: 'nie-existiert' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] },
    },
  });
  assert.equal(g.gueltig, false);
  assert.ok(g.verworfene.some((v) => v.id === 'x-verwaist' && v.grund === 'ziel'));
});

test('[Prüfer] ein Ziel über ziel.sektor löst genauso auf wie über ziel.situation', () => {
  const { V } = ladeKern();
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    wizards: {
      'x-sektor-ziel': { titel: 'Sektor-Ziel', ziel: { sektor: 'identity' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] },
    },
  });
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund);
  assert.equal(g.wizards[0].ziel.sektor, 'identity');
});

test('[Prüfer·rot] ein Schritt ohne feld-Objekt oder ohne Frage wird verworfen', () => {
  const { V } = ladeKern();
  const ohneFeld = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    wizards: { 'x-a': { titel: 'A', ziel: { situation: 'geburt' }, schritte: [{ frage: 'ohne Feld' }] } },
  });
  assert.equal(ohneFeld.gueltig, false);
  assert.ok(ohneFeld.verworfene.some((v) => v.id === 'x-a' && v.grund === 'schritte'));

  const ohneFrage = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x', sprache: 'de',
    wizards: { 'x-b': { titel: 'B', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'x' } }] } },
  });
  assert.equal(ohneFrage.gueltig, false);
  assert.ok(ohneFrage.verworfene.some((v) => v.id === 'x-b' && v.grund === 'schritte'));
});

test('[Sprache] ein beschrifteter Assistent ohne sprache wird verworfen — derselbe Wächter wie bei Situationen/Bereichen', () => {
  const { V } = ladeKern();
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'x',
    wizards: { 'x-a': { titel: 'A', ziel: { situation: 'geburt' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] } },
  });
  assert.equal(g.gueltig, false);
  assert.equal(g.grund, 'sprache', '_modulTraegtBeschriftung muss den wizards-Zweig kennen');
});

test('[Anmeldung] eingelassen wirkt: der Assistent steht in der Liste und im Nachschlage-Index', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.setData(d);
  const r = V.modulEinlassen(JSON.stringify(NOTFALL_ASSISTENT), d);
  assert.equal(r.angenommen, true, 'Grund bei Ablehnung: ' + r.grund);
  assert.equal(r.typ, 'wizard');
  assert.equal(r.ungeprueft, true, 'ein eingelassenes Modul zertifiziert niemanden (U2-ADR-145)');
  assert.equal(d.wizardsModule.length, 1);
  V._wizardsModuleAusDepotAnmelden(d);
  assert.equal(V.wizardsAlle().length, Object.keys(V.WIZARDS).length + 1, 'sieben eingebaute plus einen angedockten');
  assert.ok(V._wizardIndexHalter()['test-notfallwiz'], 'der Nachschlage-Index kennt den angedockten Assistenten');
});

test('[Anmeldung·Kollision] zwei Module mit derselben Assistenten-ID: das erste gewinnt, das zweite heißt doppelt — exakter Spiegel des Situations-/Bereichs-Verhaltens', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  // ziel:sektor statt ziel:situation (Lücke-2-Nachtrag, 07.09.2026) — dieser Test prüft die
  // ID-Kollision zwischen zwei Modulen, nicht die Situations-Feld-Erlaubnisliste.
  const basis = (herkunft, titel) => ({
    modulTyp: 'wizard', moduleVersion: 1, herkunft, sprache: 'de',
    wizards: { 'x-geteilt': { titel, ziel: { sektor: 'identity' }, schritte: [{ feld: { id: 'x' }, frage: 'y' }] } },
  });
  d.wizardsModule = [basis('anbieter-a', 'Von A'), basis('anbieter-b', 'Von B')];
  V._wizardsModuleAusDepotAnmelden(d);
  const alle = V.wizardsAlle();
  const treffer = alle.filter((w) => w.id === 'x-geteilt');
  assert.equal(treffer.length, 1, 'nur ein Assistent unter der geteilten ID');
  assert.equal(treffer[0].titel, 'Von A', 'die erste gewinnt');
  assert.ok(V.WIZARDS_MODUL_VERWORFEN.some((v) => v.id === 'x-geteilt' && v.grund === 'doppelt'));
});

test('[Anmeldung·Gegenprobe] fällt das Modul weg, verschwindet der Assistent aus der Registry — und kehrt zurück', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const basisZahl = Object.keys(V.WIZARDS).length;
  d.wizardsModule = [NOTFALL_ASSISTENT];
  V._wizardsModuleAusDepotAnmelden(d);
  assert.equal(V.wizardsAlle().length, basisZahl + 1);
  d.wizardsModule = [];
  V._wizardsModuleAusDepotAnmelden(d);
  assert.equal(V.wizardsAlle().length, basisZahl, 'zurück auf die eingebauten');
  assert.equal(V._wizardIndexHalter()['test-notfallwiz'], undefined);
  d.wizardsModule = [NOTFALL_ASSISTENT];
  V._wizardsModuleAusDepotAnmelden(d);
  assert.equal(V.wizardsAlle().length, basisZahl + 1, 'zurück, sobald das Modul wieder da ist');
});

test('[Gegenprobe] Sektoren/Situationen bleiben von diesem Register unberührt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  const sektorenVorher = Object.keys(V.SEKTOREN).length;
  const situationenVorher = V.situationenAlle().length;
  d.wizardsModule = [NOTFALL_ASSISTENT];
  V._wizardsModuleAusDepotAnmelden(d);
  assert.equal(Object.keys(V.SEKTOREN).length, sektorenVorher);
  assert.equal(V.situationenAlle().length, situationenVorher);
});

/* ══ Lücke 2 (07.09.2026, C2-Nachtrag) — ein Wizard-eigenes Feld auf ziel.situation ═══════
   Befund: `luecke2-situations-wizard-riegel-zusammenwirken-2026-09-07.md`. `wizardsModulPruefen`
   prüfte bislang nur, DASS `ziel.situation` existiert — nie, ob die mitgebrachte `feld.id` zu
   den Feldern gehört, die die Zielsituation selbst führt. Ein Dritt-Modul-Wizard konnte damit ein
   beliebiges eigenes Feld in JEDE Situation schreiben, obwohl ein Dritt-Modul-SITUATIONS-Upload
   für dieselbe Situation nur {quelle,feld}-Zeiger darf (`situationsModulPruefen`). Drei Fälle,
   derselbe Maßstab (`_wizardZielSituationFeldErlaubt`): erlaubt nur ein bereits geführtes Feld
   ODER dieselbe Herkunft wie die Situation. ══════════════════════════════════════════════ */

test('[Prüfer·rot·Lücke2] ein fremdes eigenes Feld auf einer NATIVEN Situation wird benannt verworfen', () => {
  const { V } = ladeKern();
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'fremder-anbieter', sprache: 'de',
    wizards: {
      'x-fremd': {
        titel: 'Fremd', ziel: { situation: 'geburt' },
        schritte: [{ feld: { id: 'x_fremd', typ: 'text' }, frage: 'Frage?' }],
      },
    },
  });
  assert.equal(g.gueltig, false);
  assert.ok(g.verworfene.some((v) => v.id === 'x-fremd' && v.grund === 'ziel-feld'),
    'verworfen: ' + JSON.stringify(g.verworfene));
});

test('[Prüfer·Gegenprobe·Lücke2] dasselbe Modul mit einer Feld-ID, die die Situation bereits führt, geht durch', () => {
  const { V } = ladeKern();
  // 'geburt_datum' ist eines der eigenen Felder, die das eingebettete Bündel der nativen
  // Situation 'geburt' mitgibt (Lücke-1-Befund) — kein Fremdfeld, sondern ein bereits geführtes.
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'fremder-anbieter', sprache: 'de',
    wizards: {
      'x-erlaubt': {
        titel: 'Erlaubt', ziel: { situation: 'geburt' },
        schritte: [{ feld: { id: 'geburt_datum', typ: 'datum' }, frage: 'Frage?' }],
      },
    },
  });
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund);
  assert.deepEqual(g.wizards.map((w) => w.id), ['x-erlaubt']);
});

test('[Prüfer·Gegenprobe·Lücke2] ein Modul darf eigene Felder in SEINER EIGENEN, selbst angedockten Situation führen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.situationsModule = [{
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'eigener-anbieter', sprache: 'de',
    situationen: { 'eigene-situation': { icon: 'star', titel: 'Eigene Situation', bloecke: [] } },
  }];
  V._situationsModuleAusDepotAnmelden(d);
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'eigener-anbieter', sprache: 'de',
    wizards: {
      'x-eigene-situation': {
        titel: 'Eigen', ziel: { situation: 'eigene-situation' },
        schritte: [{ feld: { id: 'neu_feld', typ: 'text' }, frage: 'Frage?' }],
      },
    },
  });
  assert.equal(g.gueltig, true, 'Grund bei Ablehnung: ' + g.grund
    + ' — Modul und Situation teilen dieselbe herkunft (eigener-anbieter)');
  assert.deepEqual(g.wizards.map((w) => w.id), ['x-eigene-situation']);
});

test('[Prüfer·rot·Lücke2] eine ANDERE Herkunft darf in einer fremden, selbst angedockten Situation kein Feld erfinden', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.situationsModule = [{
    modulTyp: 'situation', moduleVersion: 1, herkunft: 'anbieter-a', sprache: 'de',
    situationen: { 'situation-a': { icon: 'star', titel: 'Situation von A', bloecke: [] } },
  }];
  V._situationsModuleAusDepotAnmelden(d);
  const g = V.wizardsModulPruefen({
    moduleVersion: 1, herkunft: 'anbieter-b', sprache: 'de',
    wizards: {
      'x-fremde-situation': {
        titel: 'Fremd', ziel: { situation: 'situation-a' },
        schritte: [{ feld: { id: 'neu_feld', typ: 'text' }, frage: 'Frage?' }],
      },
    },
  });
  assert.equal(g.gueltig, false);
  assert.ok(g.verworfene.some((v) => v.id === 'x-fremde-situation' && v.grund === 'ziel-feld'),
    'verworfen: ' + JSON.stringify(g.verworfene));
});
