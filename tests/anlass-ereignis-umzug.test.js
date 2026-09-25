'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Anlasstest — Ereignis-Achse, Baustein `umzug`
   ────────────────────────────────────────────────────────────────────────────
   DER ERSTE ANLASSTEST. Er prüft eine LEBENSLAGE, nicht ein Bauteil: die Reise
   vom leeren Depot bis zu einem Stand, mit dem eine Bürgerin ihren Umzug
   tatsächlich beisammen hat.

   ── WARUM DAS NICHT `wizard-umzwiz.test.js` DOPPELT (Regel 10) ─────────────
   Es gibt bereits eine Prüfung für denselben Wizard, und sie zu übersehen wäre
   genau der „zweite Gegenstand", vor dem die Regel warnt. Sie ist geprüft
   worden; die Gegenstände sind verschieden:

     `wizard-umzwiz.test.js`  prüft die MECHANIK — ist umzwiz registriert,
                              stimmen die Schritt-Ziele, trägt der Roundtrip
                              über drei Bereiche, greift der Sub-Modus. Er
                              beginnt bei `wizardSchrittSetzen` und trägt seine
                              Feldliste im Test.

     dieser Test             prüft die LAGE — deckt der Katalog-Baustein
                              `umzug` seine Felder über einen ERREICHBAREN Weg
                              ab, vom leeren Depot aus, und läuft die Reise
                              unterwegs in keine Sackgasse.

   Der tragende Unterschied ist die QUELLE der Soll-Felder: dieser Test liest
   sie aus dem Lebenslagen-Katalog im KERN, nicht aus einer Liste in sich selbst.
   (Bis A58/T5 lag der Katalog in `tools/`; seit dem 29.07.2026 im Kern, damit
   Produkt und Prüfung dieselbe Quelle lesen.)
   Nimmt jemand dem Baustein ein Feld weg oder gibt ihm eines dazu, ohne dass
   der Weg es abdeckt, wird DIESER Test rot und der andere nicht — der andere
   kennt den Katalog nicht.

   ── DIE SACKGASSEN-KRITERIEN (A31) ─────────────────────────────────────────
   A31 hat gemessen, welche der drei Kriterien im Code feststellbar sind. Zwei
   sind es, und nur die zwei stehen hier:

     (1) Kein Weg nach vorn        — geprüft: jeder Schritt hat ein Ziel, das
                                     es gibt; der Abschluss führt in einen
                                     Bereich, den das Modell kennt.
     (3) Pflichtfeld nicht wahr-   — geprüft: kein Schritt verlangt ein
         heitsgemäß füllbar          Pflichtfeld, dessen `optionen` die Lage
                                     nicht treffen.

   ── KRITERIUM (1) KANNTE NUR EINE VON VIER ZIELFORMEN (A49) ────────────────
   Bis zum 29.07.2026 stand der Erkenner hier inline und prüfte allein
   `ziel.sektor`. Er war grün — aber nur, weil `umzwiz` zufällig ausschließlich
   Sektor-Ziele trägt. Gemessen über alle sieben Wizards ⟦M⟧ irrte er in BEIDE
   Richtungen:

     falsch ROT   alle 6 `gebwiz`-Schritte ({situation}) — ein Weg, den es
                  gibt, als Sackgasse gemeldet
     falsch GRÜN  {sektor,liste,typ} und {sektor,liste,unterfeld}: er sah den
                  Sektor und schwieg, während Liste, Unterfeld und die
                  Einzigartigkeit des Typs ungeprüft blieben

   Er wohnt seither in `tests/wizard-zielraum.js` — bei den vier Formen und dem
   Leser, der sie schon kannte. Zwei Stellen, die dasselbe wissen müssen und es
   getrennt tun, sind genau die Bauart, die diesen Blindfleck erzeugt hat.

   (2) — eine falsche Aussage der Anwendung — steht hier ABSICHTLICH NICHT.
   A31 hat gemessen, dass sie nicht mechanisch feststellbar ist; wer sie hier
   einbaute, führte eine Zusage, die kein Werkzeug hält. Sie gehört an E1 und
   die Testerrunde.

   ── EIN BEFUND, DEN DIE REISE ERZEUGT HAT ──────────────────────────────────
   `umzug` hat KEINE Anlass-Kachel. `ANLAESSE` führt zehn Einstiege; ein Umzug
   ist keiner davon. Die Lage ist allein über den Startknopf in einem der drei
   Bereiche erreichbar — wer umzieht, muss selbst darauf kommen, „Identität" zu
   öffnen. Das ist KEIN Fehlschlag: ein Weg existiert, und ein fehlender
   Einstieg ist ein Auffindbarkeits-, kein Erreichbarkeitsmangel. Der Test hält
   die Bauart darum fest, statt sie einzufordern — und wird rot, wenn AUCH der
   Startknopf-Weg verschwindet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { BAUSTEINE } = ladeKern().V;   // A58/T5: der Katalog steht im Kern, nicht mehr in `tools/`
const { ohneWegNachVorn } = require('./wizard-zielraum.js');

const PW = 'anlass-umzug-pw';
const BAUSTEIN_ID = 'umzug';
const WIZARD_ID = 'umzwiz';

/* Der Baustein aus dem Katalog — die einzige Quelle der Soll-Felder. */
function baustein() {
  const b = BAUSTEINE.find((x) => x.id === BAUSTEIN_ID);
  assert.ok(b, 'Der Katalog kennt den Baustein `' + BAUSTEIN_ID + '` nicht mehr. '
    + 'Dieser Test prüft eine Lage, die es nicht gibt — Baustein oder Test gehört nachgezogen.');
  assert.equal(b.sorte, 'ereignis', 'Baustein `' + BAUSTEIN_ID + '` ist nicht mehr auf der '
    + 'Ereignis-Achse. Dieser Test ist der erste der EREIGNIS-Achse; wandert der Baustein, '
    + 'wandert seine Begründung mit.');
  return b;
}

/* Das leere Depot — der Anfang jeder Reise. Kein Fixture: die Lage entsteht
   unterwegs, sonst prüft der Test den Schreiber und nicht den Weg. */
async function leeresDepotBetreten() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

/* ── Die zwei Sackgassen-Erkenner, je als Funktion ──────────────────────────
   Als Funktion und nicht inline, weil die Positivkontrolle unten sie gegen
   einen fingierten Wizard führen muss. Ein Erkenner, der nie an etwas Rotem
   vorbeikommt, belegt nichts.

   (1) steht in `wizard-zielraum.js` (s. Kopf), (3) hier — sie hat mit dem
   Zielraum nichts zu tun und wäre dort ein Fremdkörper. */

/* (3) Pflichtfeld nicht wahrheitsgemäß füllbar: ein Pflichtfeld mit fester
   Auswahl, unter der nichts zutrifft, zwingt zu einer falschen Angabe. Ein
   Pflichtfeld OHNE `optionen` ist frei befüllbar und darum nie diese Falle. */
function pflichtOhneWahreOption(def) {
  const eng = [];
  for (const [i, s] of def.schritte.entries()) {
    const f = s.feld;
    if (!f || !f.pflicht) continue;
    if (Array.isArray(f.optionen) && f.optionen.length === 0) {
      eng.push('Schritt ' + i + ' (Feld `' + f.id + '`) ist Pflicht, hat aber keine einzige Option');
    }
  }
  return eng;
}

/* Die Deckungsfrage der Reise: welche Katalog-Felder stehen nach der Reise
   NICHT im Depot. Als Funktion, aus demselben Grund wie die zwei Erkenner —
   die Positivkontrolle unten muss sie an einer gepflanzten Lücke rot sehen.
   Das ist die tragende Prüfung dieses Tests; sie ungeprüft zu lassen hieße,
   die eine Zusage nicht zu belegen, für die es ihn gibt. */
function ungedeckteFelder(daten, felder) {
  const fehlt = [];
  for (const key of felder) {
    const [sid, ...rest] = key.split('.');
    const wert = ((daten.sektoren || {})[sid] || {})[rest.join('.')];
    if (wert == null || String(wert).trim() === '') fehlt.push(key);
  }
  return fehlt;
}

/* ════════════════════════════════════════════════════════════════════════════
   DIE REISE
   ════════════════════════════════════════════════════════════════════════════ */

test('[Anlass·umzug] 1) die Lage ist überhaupt erreichbar — Kachel oder Startknopf', async () => {
  const { V } = await leeresDepotBetreten();
  const kachel = (V.ANLAESSE || []).find((a) => a.ziel && a.ziel.wizard === WIZARD_ID);
  const knopf = V.wizardStartHTML(WIZARD_ID);

  assert.ok(kachel || knopf,
    'Die Lage „Umzug" ist von nirgends aus erreichbar: keine Anlass-Kachel zeigt auf `'
    + WIZARD_ID + '`, und `wizardStartHTML` gibt keinen Startknopf her. Ein Baustein im '
    + 'Katalog, zu dem kein Weg führt, ist eine Zusage ohne Tür.');

  /* Die heutige Bauart, festgehalten statt eingefordert (s. Kopf): der Weg
     führt über den Bereichs-Startknopf, nicht über den Anlass-Einstieg. */
  assert.ok(knopf.includes('data-wizard-start="' + WIZARD_ID + '"'),
    'Der Startknopf ist der EINZIGE Weg zu dieser Lage (es gibt keine Anlass-Kachel für den '
    + 'Umzug). Fällt er weg, ist die Lage unerreichbar.');
});

test('[Anlass·umzug] 2) die Reise: leeres Depot → Einstieg → Schritte → brauchbarer Stand', async () => {
  const b = baustein();
  const { V } = await leeresDepotBetreten();

  /* Der Einstieg, über den echten Weg — nicht durch Direktaufruf der Schritte. */
  V.wizardLauf(WIZARD_ID);
  assert.equal(V.getViewState().aktiveAnsicht, 'wizard', 'Der Einstieg öffnet die geführte Sicht');
  assert.equal(V.getWizardState().aktiverWizardId, WIZARD_ID);

  /* Die Lage, wie eine Bürgerin sie schildert — je Schritt eine wahre Angabe. */
  const def = V.WIZARD_BY_ID[WIZARD_ID];
  const antworten = [
    'Lindenweg 4',
    '80331 München',
    'Termin Bürgerbüro 12.07. — noch offen',
    'Strom und Gas ummelden; Internet umziehen; Bank und Arbeitgeber informieren',
    'alte Wohnung zum 30.09. gekündigt; Übergabe mit Protokoll; Kaution zurückfordern',
    // F5 Posten 3 („F4 und F5", 09.08.2026): drei neue Termin-Schritte.
    '2026-06-30', '2026-09-30', '2026-10-01',
  ];
  assert.equal(antworten.length, def.schritte.length,
    'Der Wizard hat ' + def.schritte.length + ' Schritte, die Reise kennt ' + antworten.length
    + ' Antworten. Wer einen Schritt hinzufügt, beantwortet ihn hier mit — sonst prüft die Reise '
    + 'einen Weg, den sie nicht zu Ende geht.');
  for (const [i, wert] of antworten.entries()) V.wizardSchrittSetzen(WIZARD_ID, i, wert);

  /* Der brauchbare Stand: JEDES Feld, das der Katalog dieser Lage zuschreibt,
     steht im Depot. Die Soll-Menge kommt aus dem Katalog, nicht von hier. */
  const d = V.getData();
  const fehlt = ungedeckteFelder(d, b.felder);
  assert.equal(fehlt.join('\n'), '',
    'Die Reise ist zu Ende gegangen, aber der Katalog-Baustein `' + BAUSTEIN_ID + '` ist nicht '
    + 'gedeckt. Diese Felder schreibt der Katalog der Lage zu, und kein Schritt des Weges füllt '
    + 'sie:\n' + fehlt.join('\n')
    + '\nEntweder deckt der Weg die Lage nicht ab, oder der Katalog nennt ein Feld, das nicht '
    + 'dazugehört. Beides ist ein Befund — grün wird es nur, wenn beide dasselbe sagen.');
});

test('[Anlass·umzug] 3) Sackgassen-Kriterium (1): kein Schritt führt ins Leere', async () => {
  const { V } = await leeresDepotBetreten();
  const def = V.WIZARD_BY_ID[WIZARD_ID];
  const tot = ohneWegNachVorn(V, def);
  assert.equal(tot.join('\n'), '',
    'Diese Schritte zielen auf einen Bereich, den das Modell nicht kennt — die Eingabe hätte '
    + 'keinen Ort, an den sie ginge:\n' + tot.join('\n'));
});

test('[Anlass·umzug] 4) Sackgassen-Kriterium (3): kein Pflichtfeld ohne wahre Antwort', async () => {
  const { V } = await leeresDepotBetreten();
  const def = V.WIZARD_BY_ID[WIZARD_ID];
  const eng = pflichtOhneWahreOption(def);
  assert.equal(eng.join('\n'), '',
    'Diese Schritte verlangen eine Pflichtangabe, bieten aber keine zutreffende Antwort an — '
    + 'die Bürgerin müsste etwas Unwahres eintragen, um weiterzukommen:\n' + eng.join('\n'));
});

/* ── POSITIVKONTROLLE ───────────────────────────────────────────────────────
   Die zwei Erkenner oben laufen heute über einen Weg, der beide Kriterien
   erfüllt — sie sind grün, ohne je an etwas Rotem vorbeigekommen zu sein. Ein
   Erkenner, von dem niemand weiß, ob er auslösen KANN, ist keine Prüfung,
   sondern eine Vermutung. Darum je eine gepflanzte Verletzung, die nachweist,
   dass er sie findet. */

test('[Anlass·umzug] 5) Gate-Nachweis: alle drei Erkenner werden an einer gepflanzten Verletzung ROT', async () => {
  const { V } = await leeresDepotBetreten();

  /* (1) — JE ZIELFORM eine gepflanzte Sackgasse UND ein heiler Fall.
     Beide Richtungen, weil der Erkenner bis zum 29.07. in beide irrte: er
     meldete gültige {situation}-Ziele als Sackgasse und übersah kaputte
     Listen-Ziele. Eine Prüfung nur auf „findet er den Defekt?" hätte den
     ersten Fehler nicht gesehen. */
  const wiz = (ziel) => ({ schritte: [{ frage: 'fingiert', ziel,
    feld: { id: 'x', label: 'x', typ: 'text' } }] });

  const SACKGASSEN = [
    ['{sektor} — Bereich, den es nicht gibt', { sektor: 'gibt-es-nicht' }],
    ['{situation} — Situationsblatt, das es nicht gibt', { situation: 'gibt-es-nicht' }],
    ['{sektor,liste,typ} — Liste, die es im Bereich nicht gibt',
      { sektor: 'advanceCare', liste: 'gibt-es-nicht', instrument: 'ki-verfuegung' }],
    ['{sektor,liste,typ} — Typ nicht einzigartig, der Schreiber wirft',
      { sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'enduring-power-of-attorney' }],
    ['{sektor,liste,unterfeld} — Unterfeld, das die Liste nicht führt',
      { sektor: 'health', liste: 'operationsProcedures', unterfeld: 'gibt-es-nicht' }],
    ['fünfte Form — unbekannt, darf nicht still durchrutschen', { bereich: 'neu-erfunden' }],
    ['gar kein Ziel', undefined],
  ];
  for (const [name, ziel] of SACKGASSEN) {
    assert.equal(ohneWegNachVorn(V, wiz(ziel)).length, 1,
      'Der Erkenner für Kriterium (1) hat eine gepflanzte Sackgasse NICHT gefunden: ' + name
      + '. Dann belegt sein Grün oben nichts — für diese Zielform jedenfalls.');
  }

  const HEIL = [
    ['{sektor}', { sektor: 'advanceCare' }],
    ['{situation}', { situation: 'geburt' }],
    ['{sektor,liste,instrument}', { sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'ki-verfuegung' }],
    ['{sektor,liste,unterfeld}', { sektor: 'health', liste: 'operationsProcedures', unterfeld: 'procedure' }],
  ];
  for (const [name, ziel] of HEIL) {
    assert.equal(ohneWegNachVorn(V, wiz(ziel)).join('\n'), '',
      'Der Erkenner meldet ein INTAKTES Ziel der Form ' + name + ' als Sackgasse. Genau so war '
      + 'er bis zum 29.07. gebaut — er kannte nur `ziel.sektor` und erklärte alle sechs '
      + '`gebwiz`-Schritte für tot. Ein Erkenner, der Gesundes meldet, macht die Prüfung '
      + 'unbrauchbar, nicht strenger.');
  }

  /* (3) — ein Pflichtfeld mit leerer Auswahl. */
  const kaputt3 = {
    schritte: [{ frage: 'fingiert',
      feld: { id: 'y', label: 'y', typ: 'auswahl', pflicht: true, optionen: [] } }],
  };
  const gefunden3 = pflichtOhneWahreOption(kaputt3);
  assert.equal(gefunden3.length, 1,
    'Der Erkenner für Kriterium (3) hat ein gepflanztes unbeantwortbares Pflichtfeld NICHT '
    + 'gefunden. Dann belegt sein Grün oben nichts.');

  /* Die Deckungsprüfung — der Kern dieses Tests. Zwei gepflanzte Lücken: ein
     Feld, das die Reise nie füllt, und eines, das leer bleibt. Beide muss sie
     melden, sonst wäre Prüfung 2 auch dann grün, wenn die Lage ungedeckt ist. */
  const nachDerReise = { sektoren: { identity: { reRegistrationWithTheResidents: 'erledigt', leer_geblieben: '   ' } } };
  const luecken = ungedeckteFelder(nachDerReise, [
    'identity.reRegistrationWithTheResidents',      // gefüllt — darf NICHT gemeldet werden
    'identity.leer_geblieben',       // nur Leerraum — muss gemeldet werden
    'wohnen.nie_gefuellt',             // fehlt ganz — muss gemeldet werden
  ]);
  assert.deepEqual(luecken, ['identity.leer_geblieben', 'wohnen.nie_gefuellt'],
    'Der Deckungs-Erkenner meldet die gepflanzten Lücken nicht genau — entweder übersieht er '
    + 'eine (dann ist Prüfung 2 blind) oder er meldet ein gefülltes Feld mit (dann ist sie '
    + 'unbrauchbar). Gemeldet wurde: ' + JSON.stringify(luecken));

  /* Und die Gegenprobe: der echte Weg ist NICHT deshalb grün, weil die
     Erkenner alles durchwinken. */
  const def = V.WIZARD_BY_ID[WIZARD_ID];
  assert.equal(ohneWegNachVorn(V, def).length, 0);
  assert.equal(pflichtOhneWahreOption(def).length, 0);
});
