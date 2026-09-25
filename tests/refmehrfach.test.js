'use strict';
/* ════════════════════════════════════════════════════════════════════════
   refMehrfach (U2-ADR-065) — generischer Render-Typ „mehrere Register-Personen,
   umsortierbar" + Umsortier-Mutation listenEintragVerschieben + Vertretungs-Modus
   (nur bei >1 Person, via feldSichtbar minAnzahl). Erstanwendung: Vollmacht.
   Der Typ ist bewusst generisch — Erben/Notfallkontakte sitzen später darauf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

// Synthetisches refMehrfach-Feld (entkoppelt vom konkreten Vollmacht-Record).
const RM = { id: 'personen', label: 'Personen', typ: 'refMehrfach', entitaet: 'person', rolle: 'bevollmaechtigte' };

/* ── Engine: eingetragen / Anzeige / Validierung ─────────────────────────── */
test('feldEingetragen: leeres Array + leere Zeilen = nicht eingetragen; eine echte Person = eingetragen', () => {
  const { V } = ladeKern();
  assert.equal(V.feldEingetragen(RM, []), false);
  assert.equal(V.feldEingetragen(RM, [{ ref: '', override: '' }]), false, 'leere Zeile zählt nicht');
  assert.equal(V.feldEingetragen(RM, [{ ref: '', override: 'Anna' }]), true);
  assert.equal(V.feldEingetragen(RM, { ref: 'x', override: '' }), false, 'Nicht-Array = leer (tolerant)');
});

test('Anzeige: Array → Namen „, "-getrennt, nie roh (Text + HTML)', () => {
  const { V } = ladeKern();
  const arr = [{ ref: '', override: 'Anna' }, { ref: '', override: 'Bea' }];
  assert.equal(V.feldWertText(RM, arr), 'Anna, Bea');
  const html = V.feldWertHTML(RM, arr);
  assert.ok(html.includes('Anna') && html.includes('Bea'), 'beide Namen');
  assert.ok(!/[\[\]{}]/.test(html), 'kein rohes Array/JSON im HTML');
  assert.equal(V.feldWertText(RM, []), V.STRINGS.leerZustand);
});

/* ── Reihenfolge in der reinen Anzeige (Fund: Krisenvorsorge-Bestandsaufnahme 02.08.2026) ──
   Die gespeicherte Reihenfolge (↑/↓, U2-ADR-065-Familie) war im Bearbeiten-Zustand längst
   bedienbar, aber in feldWertHTML() nicht erkennbar — „Anna, Bea" sieht identisch aus wie
   „Bea, Anna". Betrifft u. a. `emergencyContacts` (Notfallkontakte): im Notfall ist wichtig,
   WER an erster Stelle steht. */
test('Anzeige: ab zwei Einträgen sichtbar nummeriert (<ol>), Reihenfolge = Array-Reihenfolge', () => {
  const { V } = ladeKern();
  const arr = [{ ref: '', override: 'Anna' }, { ref: '', override: 'Bea' }, { ref: '', override: 'Cara' }];
  const html = V.feldWertHTML(RM, arr);
  assert.match(html, /<ol[^>]*class="[^"]*refm-anzeige-liste[^"]*"[^>]*>/, 'sichtbar als nummerierte Liste');
  // Reihenfolge im Markup selbst geprüft, nicht nur "kommen alle drei vor": Anna vor Bea vor Cara.
  const posAnna = html.indexOf('Anna'), posBea = html.indexOf('Bea'), posCara = html.indexOf('Cara');
  assert.ok(posAnna > -1 && posBea > posAnna && posCara > posBea, 'Reihenfolge im Markup erhalten');
  assert.equal((html.match(/<li>/g) || []).length, 3, 'drei <li>, ein Eintrag pro Person');
});

test('Anzeige: EIN Eintrag bleibt schlichter Name, keine Ein-Punkt-Liste', () => {
  const { V } = ladeKern();
  const html = V.feldWertHTML(RM, [{ ref: '', override: 'Anna' }]);
  assert.ok(html.includes('Anna'), 'Name da');
  assert.ok(!/<ol|<li/.test(html), 'keine Liste bei nur einem Eintrag — Reihenfolge wäre bedeutungslos');
});

test('feldValidieren: Array ref/override ok; Nicht-Array wird als leer toleriert', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren(RM, [{ ref: '', override: 'Anna' }, { ref: 'p1', override: '' }]).ok, true);
  assert.equal(V.feldValidieren(RM, []).ok, true, 'leer + nicht-Pflicht = ok');
  // ein Array-Element ohne ref UND ohne override (Objekt) ist noch tolerierbar (leere Zeile);
  // ein Nicht-Objekt-Element ist ungültig.
  const feldPflicht = Object.assign({}, RM, { pflicht: true });
  assert.equal(V.feldValidieren(feldPflicht, []).ok, false, 'Pflicht + leer → nicht ok');
});

test('feldInputHTML (Personen-Widget): EIN Combobox-Feld + verborgene ref + weiche Vorschlagsliste, kein System-Select', () => {
  const { V } = ladeKern();
  const html = V.feldInputHTML(RM, [{ ref: '', override: 'Anna' }]);
  assert.ok(html.includes('data-refm="personen"'), 'Widget-Marker');
  assert.ok(html.includes('data-edit-refm-override="personen"'), 'sichtbares Eingabe-/Such-Feld');
  assert.ok(html.includes('data-edit-refm="personen"'), 'verborgenes ref-Feld (trägt die Register-Auswahl)');
  assert.ok(html.includes('role="combobox"'), 'ein Feld = Eingabe + Suche');
  assert.ok(html.includes('refm-combo') && html.includes('refm-vorschlaege'), 'Container + Vorschlagsliste');
  assert.ok(!/<select\b/.test(html), 'KEIN System-Select mehr (Zwei-Felder-Widget ersetzt)');
  assert.ok(html.includes('data-refm-hoch') && html.includes('data-refm-runter'), 'Umsortier-Pfeile');
  assert.ok(html.includes('data-refm-weg'), 'Entfernen-Knopf');
  assert.ok(html.includes('data-refm-add="personen"'), 'Hinzufügen-Knopf (neue leere Zeile)');
  assert.ok(html.includes('data-refm-uebernehmen'), 'Chip-Input (Zusatz 2): „Übernehmen"-Haken pro Zeile');
  assert.ok(html.includes('refm-knoepfe'), 'Knöpfe als eine Gruppe (eine Grid-Spalte)');
  assert.ok(!html.includes('__neu__'), 'kein „+ Neu"-Zweischritt');
  // Der getippte Freitext erscheint als Wert des EINEN Feldes (Eingabe + Suche zugleich).
  assert.ok(html.includes('value="Anna"'), 'Freitext im sichtbaren Feld');
  // leeres roh → genau eine leere Zeile (nicht null)
  const leer = V.feldInputHTML(RM, undefined);
  assert.equal((leer.match(/data-refm-zeile/g) || []).length, 1, 'genau eine Startzeile');
});

/* ── feldSichtbar minAnzahl (Vertretungs-Modus-Gate) ─────────────────────── */
test('feldSichtbar minAnzahl: Feld erscheint erst ab N Einträgen; Einzel-Wert bleibt rückwärtskompatibel', () => {
  const { V } = ladeKern();
  const modus = { id: 'm', typ: 'auswahl', sichtbarWenn: { feld: 'personen', minAnzahl: 2 } };
  assert.equal(V.feldSichtbar(modus, { personen: [{ override: 'A' }] }), false, 'bei 1 verborgen');
  assert.equal(V.feldSichtbar(modus, { personen: [{ override: 'A' }, { override: 'B' }] }), true, 'ab 2 sichtbar');
  assert.equal(V.feldSichtbar(modus, {}), false, 'kein Array → verborgen');
  // Rückwärtskompatibilität: klassisches sichtbarWenn (Gleichheit, auch Array-Wert) unberührt.
  const alt = { id: 'x', sichtbarWenn: { feld: 'form', wert: ['beurkundet', 'beglaubigt'] } };
  assert.equal(V.feldSichtbar(alt, { form: 'beurkundet' }), true);
  assert.equal(V.feldSichtbar(alt, { form: 'privat' }), false);
});

/* ── listenEintragVerschieben (Vollmacht-Einträge umsortieren) ───────────── */
test('listenEintragVerschieben: tauscht Nachbarn, respektiert die Ränder, prüft den Index', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { typeOfPowerOfAttorney: 'vorsorge' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { typeOfPowerOfAttorney: 'bank' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { typeOfPowerOfAttorney: 'general' });
  const arten = () => V.getData().sektoren.advanceCare.provisionInstruments.map(e => e.typeOfPowerOfAttorney).join(',');
  assert.equal(arten(), 'vorsorge,bank,general');
  assert.equal(V.listenEintragVerschieben('advanceCare', 'provisionInstruments', 0, 1), true);
  assert.equal(arten(), 'bank,vorsorge,general', 'erster nach unten');
  assert.equal(V.listenEintragVerschieben('advanceCare', 'provisionInstruments', 2, 1), false, 'letzter kann nicht tiefer');
  assert.equal(V.listenEintragVerschieben('advanceCare', 'provisionInstruments', 0, -1), false, 'erster kann nicht höher');
  assert.equal(arten(), 'bank,vorsorge,general', 'Ränder-No-op ließ Reihenfolge unverändert');
  assert.equal(V.listenEintragVerschieben('advanceCare', 'provisionInstruments', 9, 1), false, 'Index außerhalb → false');
});

/* ── Record: Vollmacht trägt refMehrfach + conditional Vertretungs-Modus ──── */
test('Vollmacht-Record: bevollmaechtigter = refMehrfach, vertretungsModus nur bei >1 Person', () => {
  const { V } = ladeKern();
  const feld = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).find(f => f.id === 'provisionInstruments');
  const bm = feld.unterFelder.find(u => u.id === 'authorizedPersons');
  const vm = feld.unterFelder.find(u => u.id === 'howDoThePeopleRepresentYou');
  assert.equal(bm.typ, 'refMehrfach');
  assert.equal(vm.typ, 'auswahl');
  assert.equal(vm.sichtbarWenn.feld, 'authorizedPersons');
  assert.equal(vm.sichtbarWenn.minAnzahl, 2);
  assert.equal(vm.optionen.map(o => o.wert).join(','), 'gleichwertig,nacheinander');
  // Sichtbarkeit gegen einen Eintrag ausgewertet: 1 Person → verborgen, 2 → sichtbar.
  assert.equal(V.feldSichtbar(vm, { authorizedPersons: [{ override: 'A' }] }), false);
  assert.equal(V.feldSichtbar(vm, { authorizedPersons: [{ override: 'A' }, { override: 'B' }] }), true);
});

/* ── Migration 29→30: Einzel-Ref → Array (verlustfrei) ───────────────────── */
test('Migration 29→30: bevollmaechtigter Einzel-Ref/String → Array; leer → []; idempotent', () => {
  const { V } = ladeKern();
  // U2-ADR-089 (38→39) hängt `vollmachten` additiv nach `provisionInstruments` um — die
  // Migration läuft komplett durch (29→…→39), das Endergebnis liegt also in der neuen Liste.
  const bau = (bevoll) => {
    const d = V.leeresDepot(); d.schemaVersion = 29;
    d.sektoren.vorsorge = { vollmachten: [{ art: 'bank', bevollmaechtigter: bevoll }] };
    V.depotNormalisieren(d);
    return d.sektoren.advanceCare.provisionInstruments[0].authorizedPersons;
  };
  assert.equal(JSON.stringify(bau({ ref: 'p1', override: '' })), JSON.stringify([{ ref: 'p1', override: '' }]), 'Einzel-Ref → [Ref]');
  assert.equal(JSON.stringify(bau('Anna')), JSON.stringify([{ ref: '', override: 'Anna' }]), 'Alt-String → [override]');
  assert.equal(JSON.stringify(bau({ ref: '', override: '' })), JSON.stringify([]), 'leerer Ref → []');
  // idempotent: ein bereits-Array bleibt unberührt
  const schon = [{ ref: 'p2', override: '' }, { ref: 'p3', override: '' }];
  const d2 = V.leeresDepot(); d2.schemaVersion = 30;
  d2.sektoren.vorsorge = { vollmachten: [{ art: 'bank', bevollmaechtigter: schon }] };
  V.depotNormalisieren(d2);
  assert.equal(d2.sektoren.advanceCare.provisionInstruments[0].authorizedPersons.length, 2, 'Array unverändert');
});

/* ── Erben als refMehrfach (Nachlauf: generische Anwendung auf ein Sektorfeld) ─ */
test('Erben-Feld ist refMehrfach; Migration 30→31 arrayt einen Einzel-Ref verlustfrei', () => {
  const { V } = ladeKern();
  const erben = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).find(f => f.id === 'heirsBriefOverview');
  assert.equal(erben.typ, 'refMehrfach', 'erben nutzt die generische Mechanik (kein Neubau)');
  assert.equal(erben.entitaet, 'person');
  const d = V.leeresDepot(); d.schemaVersion = 30; d.sektoren.vorsorge = { erben: { ref: 'p1', override: '' } };
  V.depotNormalisieren(d);
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'auf 31 gehoben');
  assert.ok(Array.isArray(d.sektoren.advanceCare.heirsBriefOverview), 'erben ist jetzt ein Array');
  assert.equal(d.sektoren.advanceCare.heirsBriefOverview[0].ref, 'p1');
  // leerer Einzel-Ref → Feld entfällt (kein Leer-Eintrag).
  const e = V.leeresDepot(); e.schemaVersion = 30; e.sektoren.vorsorge = { erben: { ref: '', override: '' } };
  V.depotNormalisieren(e);
  assert.ok(!('heirsBriefOverview' in e.sektoren.advanceCare), 'leerer erben-Ref entfällt');
});

/* ── Bug 1 (Nachlauf): getippte Namen → Register-Personen, case-insensitiver Dedup ── */
test('personFindenOderAnlegen: legt an, dedupt case-insensitiv/getrimmt, leer → ""', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const id1 = V.personFindenOderAnlegen('Anna Beispiel');
  assert.ok(id1, 'Name → neue Person mit id');
  assert.equal(V.getData().menschen.filter(p => p.name === 'Anna Beispiel').length, 1, 'genau eine Anna');
  // case-insensitiv + getrimmt → SELBE Person, kein Duplikat.
  assert.equal(V.personFindenOderAnlegen('  anna beispiel '), id1, 'Varianten treffen dieselbe id');
  assert.equal(V.getData().menschen.filter(p => /anna beispiel/i.test(p.name)).length, 1, 'kein Duplikat');
  // anderer Name → andere Person.
  const id2 = V.personFindenOderAnlegen('Bea Muster');
  assert.notEqual(id2, id1, 'anderer Name → andere id');
  // leerer/whitespace Name → keine Anlage, "".
  const vorher = V.getData().menschen.length;
  assert.equal(V.personFindenOderAnlegen('   '), '', 'leer → ""');
  assert.equal(V.getData().menschen.length, vorher, 'leer legt niemanden an');
});

test('_refmInsRegister (Zusatz 09.07.): KEINE stille Anlage — ref bleibt, Freitext bleibt Override', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const bestehend = V.personFindenOderAnlegen('Carla Bestand'); // schon im Register
  const vorher = V.getData().menschen.length;
  const raus = V._refmInsRegister([
    { ref: '', override: 'Anna' },                 // Freitext → bleibt Override, wird NICHT angelegt
    { ref: bestehend, override: 'Carla Bestand' }, // vorhandene ref bleibt, override daneben verworfen
    { ref: '', override: '  ' },                   // leer → fällt raus
  ]);
  // Der Kern des Zusatzes: der Save-Pfad legt NICHTS an — nur der Tap auf die „… anlegen"-Zeile (im Browser) tut das.
  assert.equal(V.getData().menschen.length, vorher, 'KEINE Person durch _refmInsRegister angelegt (keine stille Anlage)');
  assert.equal(raus.length, 2, 'leere Zeile raus; Freitext-Override + bestehende ref bleiben');
  assert.equal(JSON.stringify(raus[0]), JSON.stringify({ ref: '', override: 'Anna' }), 'Freitext bleibt Override, keine ref');
  assert.equal(raus[1].ref, bestehend, 'vorhandene ref unverändert');
  assert.equal(raus[1].override, '', 'override neben der ref verworfen (ref ist maßgeblich)');
  assert.ok(!V.getData().menschen.some(p => p.name === 'Anna'), 'Anna NICHT ins Register geschlichen');
});

test('_refmInsRegister: Nicht-Array → []; ohne ref und ohne Name → leer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  assert.equal(JSON.stringify(V._refmInsRegister(null)), '[]');
  assert.equal(JSON.stringify(V._refmInsRegister([{ ref: '', override: '' }])), '[]', 'leere Zeile → keine Person');
  assert.equal(V.getData().menschen.length, 0, 'nichts angelegt');
});

// Regression-Wächter 09.07.: die Vorschlagsliste ist position:fixed (entkommt dem Modal-overflow-Clip) und
// MUSS dem Feld beim Scrollen/Resize folgen — sonst löst sie sich beim Fokus-Scroll bzw. auf iOS bei
// erscheinender Tastatur vom Feld ab und wirkt „weg". Der Harness ist ein DOM-Stub (kein Layout/Event-System),
// darum sichern wir die Verdrahtung am Quelltext von _refMehrfachVerdrahten (wie andere Quell-Wächter der Suite).
test('Vorschlagsliste folgt dem Feld beim Scrollen (position:fixed-Nachführung verdrahtet)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const start = html.indexOf('function _refMehrfachVerdrahten(');
  assert.ok(start !== -1, '_refMehrfachVerdrahten gefunden');
  // Funktions-Körper grob eingrenzen (nächste Top-Level-Funktion danach).
  const rest = html.slice(start);
  const ende = rest.indexOf('\nfunction ', 1);
  const koerper = ende === -1 ? rest : rest.slice(0, ende);
  assert.match(koerper, /addEventListener\('scroll', positionieren, true\)/, 'Scroll-Hörer wird bei offener Liste angehängt');
  assert.match(koerper, /removeEventListener\('scroll', positionieren, true\)/, 'Scroll-Hörer wird beim Verbergen wieder abgehängt');
  assert.match(koerper, /const verbergen = [^\n]*scrollFolgeAus\(\)/, 'verbergen() hängt die Nachführung ab');
  assert.match(koerper, /scrollFolgeAn\(\)/, 'zeigen() schaltet die Nachführung an');
});

// Chip-Input-Wächter (Zusatz 2, 09.07.): Bestätigung ist eine bewusste Handlung, nie ein Nebeneffekt. Die
// „…als neue Person anlegen"-Zeile (Klickfalle) ist ENTFERNT; Neuanlage läuft über Enter oder den „Übernehmen"-
// Haken (beide → personFindenOderAnlegen). Blur/Tippen legen NIE an. Quell-Wächter (Harness ohne Layout/Events).
test('Chip-Input: keine Anlage-Zeile mehr; Neuanlage nur über Enter/„Übernehmen"-Haken (bewusst)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const start = html.indexOf('function _refMehrfachVerdrahten(');
  const rest = html.slice(start);
  const ende = rest.indexOf('\nfunction ', 1);
  const koerper = ende === -1 ? rest : rest.slice(0, ende);
  // Die Klickfalle ist weg: keine data-anlegen-Zeile, keine refm-anlegen-Klasse in der Vorschlagsliste.
  assert.ok(!/data-anlegen/.test(koerper), 'keine „…anlegen"-Zeile (Klickfalle) mehr');
  assert.ok(!/class="refm-anlegen"/.test(koerper), 'keine refm-anlegen-Zeile mehr');
  // Bewusste Bestätigung ist verdrahtet: bestaetige() über Enter und über den „Übernehmen"-Haken.
  assert.match(koerper, /const bestaetige = \(\)/, 'bestaetige() (bewusste Neuanlage) existiert');
  assert.match(koerper, /personFindenOderAnlegen\(nm\)/, 'Neuanlage/Dedup über personFindenOderAnlegen');
  assert.match(koerper, /data-refm-uebernehmen[\s\S]*bestaetige\(\)/, '„Übernehmen"-Haken ruft bestaetige()');
  assert.match(koerper, /key === 'Enter'[\s\S]*bestaetige\(\)/, 'Enter (ohne markierten Vorschlag) ruft bestaetige()');
  // Der zeile-HTML-Generator trägt den Haken + die Knopf-Gruppe (Funktions-Körper bis zur nächsten Top-Level-Funktion).
  const zStart = html.indexOf('function _refmZeileHTML(');
  const zRest = html.slice(zStart);
  const zh = zRest.slice(0, zRest.indexOf('\nfunction ', 1));
  assert.match(zh, /data-refm-uebernehmen/, '_refmZeileHTML rendert den „Übernehmen"-Haken');
  assert.match(zh, /refm-knoepfe/, '_refmZeileHTML gruppiert die Knöpfe');
});
