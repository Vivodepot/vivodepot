'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Anlasstest — Ereignis-Achse, Baustein `eigene-vorsorge`
   ────────────────────────────────────────────────────────────────────────────
   DER ZWEITE ANLASSTEST, und er nimmt die grösste Lücke zuerst: sieben
   Katalog-Felder gegen drei bei `umzug` (gedeckt, A34) und zwei bei
   `erbfall-abwickeln`.

   ── WAS DIESE LAGE VON `umzug` UNTERSCHEIDET ───────────────────────────────
   Bei `umzug` führte ein Wizard durch alle drei Felder. Hier führt keiner.
   Gemessen 29.07. ⟦M⟧ (A48): **0 von 7 Feldern haben einen geführten Weg** —
   kein Wizard-Schritt schreibt in eines von ihnen, und auch der volle
   `pvwiz`-Durchlauf mit `wizardAbschluss` legt keine
   `vorsorge_instrumente`-Zeile an (29 von 29 Schritten gesetzt, das Feld
   danach `undefined`). Fünf der sieben liegen in `persoenliches`
   (Bestattung), wohin überhaupt kein Wizard schreibt.

   Die Reise fährt darum den MANUELLEN Weg. Das ist kein Behelf: er ist der
   Weg, den eine Bürgerin ohne Assistenten geht, und er läuft über dieselben
   Schreiber, die auch die Formularschicht benutzt — `sektorFeldSetzen`,
   `listenEintragHinzufuegen`, `personHinzufuegen`. Regel 13, erste Hälfte:
   ein echter Weg, und die Vorprüfung unten weist ihn nach, statt ihn zu
   behaupten.

   ── DIE PFLICHTFELDER, ZUM ERSTEN MAL SCHARF ───────────────────────────────
   A31 nannte Kriterium (3) — „Pflichtfeld nicht wahrheitsgemäss füllbar" —
   und A36 hat gemessen, dass sein Anker klein ist: genau zwei Felder tragen
   `pflicht: true`, und beide gehören zu DIESER Lage
   (`vorsorge_instrumente.typ` und `.art`). Der `umzug`-Test lief an ihnen
   vorbei, weil sein Wizard keine hat. Hier greifen sie.

   Geprüft wird nicht, DASS sie Pflicht sind, sondern dass ihre Auswahl die
   Lage trifft: eine Bürgerin, die eine Patientenverfügung anlegt, muss unter
   `typ` und `art` etwas Wahres finden. Fände sie es nicht, müsste sie etwas
   Falsches eintragen, um weiterzukommen — und stünde vor einer Sackgasse.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { BAUSTEINE } = ladeKern().V;   // A58/T5: der Katalog steht im Kern, nicht mehr in `tools/`

const PW = 'anlass-vorsorge-pw';
const BAUSTEIN_ID = 'eigene-vorsorge';

function baustein() {
  const b = BAUSTEINE.find((x) => x.id === BAUSTEIN_ID);
  assert.ok(b, 'Der Katalog kennt `' + BAUSTEIN_ID + '` nicht mehr — Baustein oder Test gehört nachgezogen.');
  assert.equal(b.sorte, 'ereignis', 'Baustein `' + BAUSTEIN_ID + '` ist nicht mehr auf der Ereignis-Achse.');
  return b;
}

async function leeresDepotBetreten() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k.V;
}

/* Die Lage, wie eine Bürgerin sie schildert: sie hat eine Patientenverfügung
   und eine Vorsorgevollmacht, eine Erbin, und ihre Bestattung ist vorbedacht.
   Jede Angabe geht über den Schreiber, den auch die Formularschicht nimmt. */
function lageEintragen(V) {
  // „F3" (09.08.2026), Zug 3: „gesundheit"/„general" sind keine art-Werte mehr —
  // beides ist jetzt art:'vorsorge' mit unterschiedlichem Umfang (vm_*-Kästchen, nicht pflicht,
  // darum von pflichtOhneTreffer unten gar nicht geprüft). `art` an der Patientenverfügung war
  // ohnehin unsichtbar (sichtbarWenn typ='enduring-power-of-attorney') — entfällt ersatzlos.
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'living-will', storageLocation: 'Ordner „Vorsorge", Fach 1' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', storageLocation: 'Ordner „Vorsorge", Fach 1' });
  const erbin = V.personHinzufuegen({ name: 'Anna Klar', beziehung: 'kind' });
  V.sektorFeldSetzen('advanceCare', 'heirsBriefOverview', [{ ref: erbin }]);
  V.sektorFeldSetzen('personal', 'typeOfFuneral', bestattungWert(V, 'typeOfFuneral'));
  V.sektorFeldSetzen('personal', 'funeralAlreadyPlannedInAdvance', bestattungWert(V, 'funeralAlreadyPlannedInAdvance'));
  V.sektorFeldSetzen('personal', 'funeralHome', 'Bestattungshaus Lindner, Kiel');
  V.sektorFeldSetzen('personal', 'preferredLocationGraveUrnSite', 'Nordfriedhof Kiel, Wahlgrab 12/4');
  V.sektorFeldSetzen('personal', 'preArrangementContractStorage', 'Vorsorgevertrag Nr. 4711, Ordner „Vorsorge"');
}

/* Auswahl-Werte aus dem MODELL, nicht aus dem Test: ändert jemand die
   Optionen, fährt die Reise weiter einen gültigen Wert statt einen erfundenen. */
function bestattungWert(V, feldId) {
  const def = V.feldDefFuer('personal', feldId);
  assert.ok(def && Array.isArray(def.optionen) && def.optionen.length,
    'Feld `persoenliches.' + feldId + '` hat keine Optionen mehr — die Reise könnte nur raten.');
  return def.optionen[0].wert;
}

/* Welche Katalog-Felder stehen nach der Reise NICHT im Depot? */
function ungedeckteFelder(V, felder) {
  const d = V.getData();
  const fehlt = [];
  for (const key of felder) {
    const [sid, ...rest] = key.split('.');
    const w = ((d.sektoren || {})[sid] || {})[rest.join('.')];
    const da = Array.isArray(w) ? w.length > 0 : (w != null && String(w).trim() !== '');
    if (!da) fehlt.push(key);
  }
  return fehlt;
}

/* Kriterium (3) aus A31: ein Pflichtfeld mit fester Auswahl, unter der für
   diese Lage nichts zutrifft. Geprüft werden die Unterfelder der Liste. */
function pflichtOhneTreffer(V, lageWerte) {
  const def = V.feldDefFuer('advanceCare', 'provisionInstruments');
  const eng = [];
  for (const u of (def.unterFelder || [])) {
    if (!u.pflicht) continue;
    const opts = Array.isArray(u.optionen) ? u.optionen.map((o) => o.wert) : null;
    if (!opts) continue;                         // frei befüllbar — nie diese Falle
    if (!opts.length) { eng.push(u.id + ': Pflicht, aber keine einzige Option'); continue; }
    for (const w of lageWerte[u.id] || []) {
      if (!opts.includes(w)) eng.push(u.id + ': die Lage verlangt „' + w + '", die Auswahl bietet ' + opts.join('/'));
    }
  }
  return eng;
}

/* ════════════════════════════════════════════════════════════════════════════
   DIE REISE
   ════════════════════════════════════════════════════════════════════════════ */

test('[Anlass·vorsorge] 1) Vorprüfung: der manuelle Weg existiert und die Felder auch', async () => {
  const V = await leeresDepotBetreten();
  const b = baustein();
  assert.equal(b.felder.length, 7, 'Der Baustein führt ' + b.felder.length + ' Felder statt sieben — '
    + 'die Lücke, nach der dieser Test ausgewählt wurde, hat sich verändert.');

  const ohneDefinition = b.felder.filter((k) => {
    const [sid, ...r] = k.split('.');
    return !V.feldDefFuer(sid, r.join('.'));
  });
  assert.equal(ohneDefinition.join(', '), '',
    'Diese Katalog-Felder gibt es im Modell nicht — die Reise könnte sie nicht füllen, und ihr Grün '
    + 'wäre über einen toten Pfad erkauft:\n' + ohneDefinition.join(', '));
});

test('[Anlass·vorsorge] 2) die Reise: leeres Depot → manueller Weg → brauchbarer Stand', async () => {
  const V = await leeresDepotBetreten();
  const b = baustein();

  assert.deepEqual(ungedeckteFelder(V, b.felder), b.felder,
    'Das frische Depot ist nicht leer — dann sagt die Deckung unten nichts über die Reise.');

  lageEintragen(V);

  const fehlt = ungedeckteFelder(V, b.felder);
  assert.equal(fehlt.join('\n'), '',
    'Die Reise ist zu Ende gegangen, aber der Katalog-Baustein `' + BAUSTEIN_ID + '` ist nicht gedeckt. '
    + 'Diese Felder schreibt der Katalog der Lage zu, und kein Schritt der Reise füllt sie:\n'
    + fehlt.join('\n')
    + '\nEntweder deckt der Weg die Lage nicht ab, oder der Katalog nennt ein Feld, das nicht '
    + 'dazugehört. Beides ist ein Befund.');
});

test('[Anlass·vorsorge] 3) Sackgassen-Kriterium (3): die Pflichtfelder treffen die Lage', async () => {
  const V = await leeresDepotBetreten();
  /* Die Werte, die DIESE Lage braucht — zwei Instrumente, wie oben eingetragen. F3 Zug 3:
     „gesundheit"/„general" sind kein art-Wert mehr, beides ist jetzt art:'vorsorge'. */
  const lage = { instrument: ['living-will', 'enduring-power-of-attorney'], typeOfPowerOfAttorney: ['vorsorge'] };
  const eng = pflichtOhneTreffer(V, lage);
  assert.equal(eng.join('\n'), '',
    'Diese Pflichtangaben bieten für die Lage „eigene Vorsorge treffen" nichts Zutreffendes an — die '
    + 'Bürgerin müsste etwas Unwahres eintragen, um die Zeile speichern zu können:\n' + eng.join('\n'));
});

test('[Anlass·vorsorge] 4) die Lage ist erreichbar — und der Weg ist NICHT geführt', async () => {
  const V = await leeresDepotBetreten();
  const b = baustein();

  /* Erreichbarkeit: die Bereiche, in denen die Felder liegen, gibt es. */
  const sektoren = [...new Set(b.felder.map((k) => k.split('.')[0]))];
  for (const sid of sektoren) {
    assert.ok(V.SEKTOR_BY_ID[sid], 'Bereich `' + sid + '` fehlt — dann ist die Lage unerreichbar.');
  }

  /* Und der gemessene Befund, festgehalten statt eingefordert (A48): kein
     Wizard-Schritt schreibt in eines der sieben Felder. Das ist kein
     Fehlschlag — der manuelle Weg trägt —, aber es ist die Eigenschaft, die
     diese Lage von `umzug` unterscheidet. Kommt ein Wizard dazu, wird dieser
     Test rot und die Beschreibung oben gehört nachgezogen. */
  const gefuehrt = [];
  for (const w of V.WIZARDS) {
    for (const s of w.schritte) {
      const key = V.wizardSchrittZiel(w, s).sektor + '.' + s.feld.id;
      if (b.felder.includes(key)) gefuehrt.push(w.id + ' → ' + key);
    }
  }
  assert.equal(gefuehrt.join('\n'), '',
    'GUTE NACHRICHT, und trotzdem rot: die Lage hat jetzt einen geführten Weg, den sie beim Bau '
    + 'dieses Tests nicht hatte (A48: 0 von 7). Der Kopf dieser Datei und A48 beschreiben damit '
    + 'einen überholten Stand — beides gehört nachgezogen, und die Reise sollte den geführten Weg '
    + 'fahren statt des manuellen:\n' + gefuehrt.join('\n'));
});

/* ── POSITIVKONTROLLE ─────────────────────────────────────────────────────── */

test('[Anlass·vorsorge] 5) Gate-Nachweis: beide Erkenner werden an gepflanzten Verletzungen ROT', async () => {
  const V = await leeresDepotBetreten();

  /* Deckung: ein Feld, das die Reise nie füllt, muss gemeldet werden. */
  const luecken = ungedeckteFelder(V, ['advanceCare.gibt-es-nicht']);
  assert.deepEqual(luecken, ['advanceCare.gibt-es-nicht'],
    'Der Deckungs-Erkenner meldet ein nie gefülltes Feld nicht — dann ist Prüfung 2 blind.');

  /* Kriterium (3): eine Lage, die eine Instrument-Art verlangt, die es nicht
     gibt. Erfundener Weg, ausdrücklich als Wächter-Prüfung gekennzeichnet
     (Regel 13, zweite Hälfte). */
  const eng = pflichtOhneTreffer(V, { instrument: ['gibt-es-nicht'], typeOfPowerOfAttorney: [] });
  assert.equal(eng.length, 1,
    'Der Erkenner für Kriterium (3) findet eine gepflanzte unerfüllbare Pflichtangabe nicht — dann '
    + 'belegt sein Grün oben nichts.');

  /* Gegenprobe: die echte Lage löst ihn NICHT aus. F3 Zug 3: 'vorsorge' statt 'gesundheit'
     (kein art-Wert mehr) — 'art' ist an einer Patientenverfügung ohnehin unsichtbar/nicht
     pflicht relevant, hier zählt nur, dass ein GÜLTIGER Wert nicht faelschlich anschlaegt. */
  assert.equal(pflichtOhneTreffer(V, { instrument: ['living-will'], typeOfPowerOfAttorney: ['vorsorge'] }).length, 0,
    'Der Erkenner schlägt auf einer zutreffenden Angabe an — dann wäre er bei jeder Lage rot.');
});
