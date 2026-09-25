'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Situationsblatt-Maschine (U2-ADR-012, Schritt 2)
   ────────────────────────────────────────────────────────────────────────
   Prüft die generische Maschine, NICHT einzelne Situationen (die kommen je
   eine pro Commit, „Einfach so" nach Vorschlag). Die Registry ist heute leer;
   die Maschine wird über eine synthetische Situations-Definition geprüft —
   dasselbe Muster wie renderSektor(def) bei den Sektoren.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

/* U2-ADR-089 Block 2: „gezogenes Feld existiert wirklich" muss die ABGELEITETE Instrument-Zeile
   kennen — sie hat kein Sektor-Feld dieses Namens, ist also kein Waisen-Verweis, sondern wird
   anders geprüft: der Typ muss in den `typ`-Optionen der geteilten Liste vorkommen. Ein Tippfehler
   (instrument:testment) fällt damit weiterhin auf, nur an der richtigen Stelle. Typen aus dem Kern
   gelesen, nicht dupliziert — ein siebtes Instrument merkt der Wächter sofort. */
function gueltigeInstrumentTypen(V) {
  const liste = V.SEKTOR_BY_ID['advanceCare'].sektionen
    .flatMap(x => x.felder || []).find(f => f.id === 'provisionInstruments');
  const typFeld = (liste.unterFelder || []).find(f => f.id === 'instrument');
  return new Set((typFeld.optionen || []).map(o => o.wert));
}
function feldExistiertOderInstrument(V, set, feld) {
  if (typeof feld === 'string' && feld.startsWith(V.INSTRUMENT_ZEILE_PRAEFIX)) {
    return gueltigeInstrumentTypen(V).has(feld.slice(V.INSTRUMENT_ZEILE_PRAEFIX.length));
  }
  // U2-ADR-096: `liste:<listeId>:<typwert>:<unterfeldId>` — waisenfrei heisst hier: die Liste
  // existiert, der Typ ist gueltig UND das Unterfeld ist an der Liste deklariert. Sonst zeigt der
  // Verweis ins Leere, ohne zu werfen — genau die Fehlerklasse, die diese Pruefung fangen soll.
  const sel = V._listenSelektorZerlegen && V._listenSelektorZerlegen(feld);
  if (sel) {
    const liste = Object.values(V.SEKTOR_BY_ID)
      .flatMap(s => (s.sektionen || []).flatMap(x => x.felder || []))
      .find(f => f.id === sel.listeId);
    if (!liste) return false;
    if (!gueltigeInstrumentTypen(V).has(sel.typWert)) return false;
    return (liste.unterFelder || []).some(u => u.id === sel.unterfeldId);
  }
  return set.has(feld);
}

// Synthetische Situation: ein sektor-gezogener Eintrag + zwei eigene Felder (eines sensibel).
function synthSituation() {
  return {
    id: 'tsit', titel: 'Test-Situation', icon: 'star', modus: 'eigen',
    einfuehrung: 'Eine Probe.',
    bloecke: [
      { titel: 'Aus Ihren Bereichen', eintraege: [
          { quelle: 'identity', feld: 'givenName' },
      ] },
      { titel: 'Für diese Situation', eintraege: [
          { feld: { id: 'tsit_eigen', label: 'Eigenes Feld', typ: 'text', beispiel: 'x' } },
          { feld: { id: 'tsit_geheim', label: 'Geheim', typ: 'text', sensibel: true } },
      ] },
    ],
  };
}

/* ── Datenmodell + Registry ─────────────────────────────────────────────── */

test('Datenmodell: leeres Depot trägt situationen als leeres Objekt', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  assert.ok(d.situationen && typeof d.situationen === 'object');
  assert.equal(Object.keys(d.situationen).length, 0);
});

test('Registry: SITUATIONEN ist Array, SITUATION_BY_ID konsistent', () => {
  const { V } = ladeKern();
  assert.ok(Array.isArray(V.SITUATIONEN), 'SITUATIONEN ist ein Array');
  assert.ok(V.SITUATION_BY_ID && typeof V.SITUATION_BY_ID === 'object');
  // SITUATION_BY_ID spiegelt SITUATIONEN.
  for (const si of V.SITUATIONEN) assert.equal(V.SITUATION_BY_ID[si.id], si);
});

/* ── SITUATION_FELD_EXPORT (Brief-Anbindung, analog CROSS_SEKTOR_FELDER) ──── */

test('situationFeldExportAnmelden: validiert, registriert, idempotent', () => {
  const { V } = ladeKern();
  assert.throws(() => V.situationFeldExportAnmelden({ feld: 'x', ziel: 'y' }), /quelle/);
  assert.throws(() => V.situationFeldExportAnmelden({ quelle: 'x', ziel: 'y' }), /feld/);
  assert.throws(() => V.situationFeldExportAnmelden({ quelle: 'x', feld: 'y' }), /ziel/);
  const vorher = V.SITUATION_FELD_EXPORT.length;
  V.situationFeldExportAnmelden({ quelle: 'personal', feld: 'letterForTheEmergencyDoctor', ziel: 'tsit' });
  assert.equal(V.SITUATION_FELD_EXPORT.length, vorher + 1);
  V.situationFeldExportAnmelden({ quelle: 'personal', feld: 'letterForTheEmergencyDoctor', ziel: 'tsit' }); // idempotent
  assert.equal(V.SITUATION_FELD_EXPORT.length, vorher + 1);
});

/* ── situationFeldSetzen — eigener Namespace, Stempel, Code-Slot ─────────── */

test('situationFeldSetzen: schreibt in data.situationen + stempelt im Namespace sit:<id>', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.situationFeldSetzen('geburt', 'klinik', 'Klinikum München');
  const d = V.getData();
  // Eigener Wert liegt in data.situationen, NICHT in data.sektoren.
  assert.equal(d.situationen.geburt.klinik, 'Klinikum München');
  assert.equal(d.sektoren.geburt, undefined, 'kein Sektor-Namespace-Übergriff');
  // Urheberschaft im sit-Namespace, getrennt vom Sektor-Namespace.
  assert.equal(d.urheberschaft['sit:geburt'].klinik.length, 1, 'ein Stempel im sit-Namespace');
  assert.equal(d.urheberschaft.geburt, undefined, 'kein Stempel im nackten Sektor-Namespace');
  // Code-Slot (U2-ADR-006) angelegt, leer.
  assert.equal(d.codes['sit:geburt'].klinik, null);
  // liesSituation liefert eine Kopie.
  assert.equal(V.liesSituation('geburt').klinik, 'Klinikum München');
});

test('situationFeldSetzen ohne Sitzungs-Akteur wirft (keine vorgetäuschte Urheberschaft)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);   // kein akteurSelbstErklaeren
  assert.throws(() => V.situationFeldSetzen('geburt', 'klinik', 'x'), /Sitzungs-Akteur/);
});

/* ── renderSituation — Karte, sektor-gezogen + eigen, Click-Through ──────── */

test('renderSituation: Karte mit sektor-gezogener Zeile (Quelle-Tag + Click-Through) + Pausen-Zeile', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');     // Quelle füllen
  V.renderSituation(synthSituation());
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Test-Situation'), 'Titel');
  assert.ok(html.includes('Aus Ihren Bereichen'), 'Block-Titel');
  assert.ok(html.includes('Maria'), 'sektor-gezogener Wert wird zur Laufzeit gezogen');
  assert.ok(html.includes('quelle-tag'), 'Quelle-Tag sichtbar');
  assert.ok(html.includes('Identität'), 'Quelle-Sektor benannt');
  assert.ok(html.includes('data-klick-sektor="identity"') && html.includes('data-klick-feld="givenName"'),
    'Click-Through-Anker auf Sektor+Feld');
  assert.ok(html.includes('klick-durch'), 'Click-Through-Klasse');
  assert.ok(html.includes('pause-erlaubnis'), 'Pausen-Zeile');
});

test('renderSituation: eigenes Feld zeigt Wert; sensibel trägt Bildschirm-Marker', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.situationFeldSetzen('tsit', 'tsit_eigen', 'Hallo Welt');
  V.renderSituation(synthSituation());
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Eigenes Feld') && html.includes('Hallo Welt'), 'eigenes Feld mit Wert');
  assert.ok(html.includes('Geheim') && html.includes(V.STRINGS.situationSensibel),
    'sensibel-Feld trägt „nur am Bildschirm"-Marker');
});

test('renderSituation druck=true: sensibel-Feld ausgeblendet, restliche Felder bleiben', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation(synthSituation(), { druck: true });
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Eigenes Feld'), 'nicht-sensibles Feld bleibt im Druck');
  assert.ok(!html.includes('Geheim'), 'sensibel-Feld ist im Druck ausgeblendet');
  assert.ok(!html.includes(V.STRINGS.situationSensibel), 'kein Bildschirm-Marker im Druck');
});

/* ── §5.4 Export-Modul: „Als PDF"-Knopf + PDF-Modell/Meta (jsPDF browser-seitig) ── */

test('renderSituation Bildschirm: „Als PDF"-Knopf vorhanden; eigene Felder sind sofort editierbar', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');   // Setup-first: Editieren setzt einen Sitzungs-Akteur voraus
  V.renderSituation(synthSituation());
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('id="b-pdf"'), 'Als-PDF-Knopf am Blatt');
  assert.ok(html.includes(V.STRINGS.btnPdf), 'Als-PDF-Label');
  // Umbau „immer editierbar": kein b-bearb mehr — eigene Felder rendern direkt als Eingabefelder.
  assert.ok(!html.includes('id="b-bearb"') && !html.includes('id="b-fertig"'), 'kein Bearbeiten/Fertig-Knopf mehr');
  assert.ok(html.includes('data-edit'), 'eigene Felder sind sofort editierbar (Eingabefeld)');
});

test('renderSituation Bildschirm: reine Linse trägt „Als PDF", aber kein Bearbeiten', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSituation('einfach-so');   // reine Linse, keine eigenen Felder
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('id="b-pdf"'), 'auch die Linse darf man als PDF mitnehmen');
  assert.ok(!html.includes('id="b-bearb"'), 'kein Bearbeiten ohne eigene Felder');
  assert.ok(!html.includes('id="b-drucken"') && !html.includes('Drucken'), 'der alte Druck-Weg ist weg');
});

test('situationModell: Klartext-Werte, sektor-gezogen + eigen, sensibel-Feld fällt weg', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.situationFeldSetzen('tsit', 'tsit_eigen', 'Hallo Welt');
  const m = V.situationModell(synthSituation());
  assert.equal(m.titel, 'Test-Situation');
  // sektor-gezogene Zeile als Klartext + Quelle.
  const z1 = m.bloecke[0].zeilen[0];
  assert.equal(z1.label, 'Vorname');
  assert.equal(z1.wert, 'Maria');
  assert.equal(z1.quelle, 'Identität & Person');
  // eigenes Feld mit Wert; sensibel-Feld (Geheim) fehlt komplett.
  const zeilen = m.bloecke.flatMap(b => b.zeilen);
  assert.ok(zeilen.some(z => z.label === 'Eigenes Feld' && z.wert === 'Hallo Welt'), 'eigenes Feld als Klartext');
  assert.ok(!zeilen.some(z => z.label === 'Geheim'), 'sensibel-Feld nicht im PDF-Modell');
});

test('situationModell: leerer Wert wird zur Leer-Phrase („nicht hinterlegt")', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const m = V.situationModell(synthSituation());   // nichts gesetzt
  const vorname = m.bloecke.flatMap(b => b.zeilen).find(z => z.label === 'Vorname');
  assert.equal(vorname.wert, V.STRINGS.leerZustand);
});

test('situationPdfMeta: Anlass, Generierer (Sitzungs-Akteur) und Datum', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria Beispiel');
  const meta = V.situationPdfMeta('arzt');
  assert.equal(meta.anlass, V.SITUATION_BY_ID.arzt.titel, 'Anlass = Situations-Titel');
  assert.equal(meta.generierer, 'Maria Beispiel', 'Generierer = handelnde Person');
  assert.match(meta.datum, /^\d{2}\.\d{2}\.\d{4}$/, 'Datum tt.mm.jjjj');
  assert.equal(meta.copyright, '© Vivodepot');
});

test('flowSituationPdf: ohne jsPDF im Harness kehrt sauber zurück (kein Wurf)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // window.jspdf fehlt im Stub (der jsPDF-Block wird nicht geladen) → Modell/Meta werden gebaut,
  // dann sauberer Rückzug, kein Wurf. Das echte Zeichnen ist browser-verifiziert.
  assert.doesNotThrow(() => V.flowSituationPdf('arzt'));
});

test('jsPDF ist inline eingebettet (offline) — §4.1', () => {
  const { html } = ladeKern();
  assert.ok(html.includes('jsPDF - PDF Document creation from JavaScript'), 'jsPDF-Lizenzkopf inline');
  assert.ok(html.includes('Version 4.2.1'), 'jsPDF 4.2.1');
  // Kein externes Laden der Bibliothek: kein <script src="http…jspdf…"> (jsPDF trägt intern selbst
  // einen <script src=>-String, daher gezielt auf eine externe jsPDF-URL prüfen, nicht pauschal).
  assert.equal(/<script[^>]+src=["']https?:\/\/[^"']*jspdf/i.test(html), false, 'jsPDF nicht per CDN geladen');
});

test('renderSituation: SITUATION_FELD_EXPORT erscheint als sektor-gezogener Block', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('personal', 'letterForTheEmergencyDoctor', 'Liebe Helferin …');
  V.situationFeldExportAnmelden({ quelle: 'personal', feld: 'letterForTheEmergencyDoctor', ziel: 'tsit' });
  V.renderSituation(synthSituation());
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Liebe Helferin'), 'Brief-Wert wird gezogen');
  assert.ok(html.includes('data-klick-feld="letterForTheEmergencyDoctor"'), 'Brief als Click-Through-Anker');
});

/* ── Sidebar: Situationen NICHT mehr einzeln (Bruch A, Struktur-Spec §4) ──── */

test('Sidebar: keine Situations-Einträge mehr — Blätter über „Für einen Anlass"', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  // Keine SITUATIONSBLÄTTER-Gruppe, keine data-situation-Einträge (keine doppelte Tür, Spec §4).
  assert.ok(!html.includes(V.STRINGS.gruppeSituationen), 'keine Situationsblätter-Gruppe in der Sidebar');
  assert.ok(!html.includes('data-situation='), 'keine einzelnen Situations-Einträge');
  // Stattdessen: ein „Für einen Anlass"-Eintrag unter HERAUSHOLEN.
  assert.ok(html.includes('data-anlass-auswahl'), 'Für-einen-Anlass-Eintrag verdrahtet');
  assert.ok(html.includes(V.STRINGS.navFuerEinenAnlass), 'Für-einen-Anlass-Label');
  // Die Situationen leben weiter in der Registry (Maschine unberührt, nur die Sidebar-Tür ändert sich).
  assert.ok(V.SITUATION_BY_ID.geburt, 'Geburt-Situation existiert weiter');
});

/* ── Blatt 1: Bei der Geburt eines Kindes ───────────────────────────────── */

test('Blatt Geburt: in Registry, zieht Identität + Kinder-Liste, hat eigene Felder', () => {
  const { V } = ladeKern();
  const g = V.SITUATION_BY_ID.geburt;
  assert.ok(g, 'Geburt-Situation existiert');
  assert.equal(g.titel, 'Bei der Geburt eines Kindes');
  assert.equal(g.modus, 'eigen');
  // sektor-gezogene Einträge: Identität (vorname/nachname) + Kinder-Liste aus Meine Menschen.
  const sektorPulls = g.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.some(e => e.quelle === 'identity' && e.feld === 'familyName'));
  assert.ok(sektorPulls.some(e => e.quelle === 'people' && e.feld === 'childrenAndDependants'));
  // eigene Felder rund um die Geburt.
  const eigene = g.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['geburt_klinik', 'geburt_elterngeld', 'geburt_kindergeld', 'geburt_vaterschaft']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

test('Blatt Geburt: rendert mit gezogenem Identitäts-Wert + Click-Through zur Kinder-Liste', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.renderSituation('geburt');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Bei der Geburt eines Kindes'), 'Titel');
  assert.ok(html.includes('Mustermann'), 'gezogener Identitäts-Wert');
  assert.ok(html.includes('data-klick-sektor="people"') && html.includes('data-klick-feld="childrenAndDependants"'),
    'Click-Through zur Kinder-Liste');
  assert.ok(html.includes('Geburtsklinik / Geburtsort'), 'eigenes Feld sichtbar');
});

test('Anlass-Routing: gebauter Anlass geburt hat ein Situationsblatt (SITUATION_BY_ID)', () => {
  const { V } = ladeKern();
  // Jede Anlass-Kachel öffnet ihr Blatt — für gebaute Anlässe existiert die Situation gleichen ids.
  const anlassGeburt = V.SITUATION_BY_ID.geburt;
  assert.ok(anlassGeburt, 'Anlass geburt → Situationsblatt geburt vorhanden');
});

// Guard gegen Dangling-Verweise (Klasse, nicht nur der eine Fall): jeder Anlass, der auf einen
// Wizard zeigt, muss auf einen REAL existierenden Wizard auflösen. Fing den pflegeheim → 'pflegewiz'-
// Tippfehler (real 'pflwiz'), der ins Leere klickte (Existenz-Guard im Router → kein Start).
test('Anlass-Routing: jeder ziel.wizard-Verweis löst auf einen echten Wizard auf (kein Dangling)', () => {
  const { V } = ladeKern();
  const verweise = V.ANLAESSE.filter(a => a.ziel && a.ziel.wizard).map(a => ({ id: a.id, wizard: a.ziel.wizard }));
  assert.ok(verweise.length >= 1, 'mindestens ein Wizard-Anlass vorhanden');
  for (const v of verweise) {
    assert.ok(V.WIZARD_BY_ID[v.wizard], 'Anlass „' + v.id + '" → Wizard „' + v.wizard + '" existiert nicht (Dangling)');
  }
});

/* ── Blatt 2: Bei Volljährigkeit oder Auszug ────────────────────────────── */

test('Blatt Volljährigkeit: in Registry, zieht Identität, hat eigene Felder', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.volljaehrig;
  assert.ok(s, 'Volljährigkeit-Situation existiert');
  assert.equal(s.titel, 'Bei Volljährigkeit oder Auszug');
  assert.equal(s.modus, 'eigen');
  // sektor-gezogene Einträge: Identität (Name, Geburtsdatum, Ausweis, Meldeadresse).
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.some(e => e.quelle === 'identity' && e.feld === 'birthDate'));
  assert.ok(sektorPulls.some(e => e.quelle === 'identity' && e.feld === 'postcodeCity'));
  // alle gezogenen Felder existieren wirklich im Identitäts-Sektor (kein toter Verweis).
  const idFelder = new Set(V.SEKTOR_BY_ID.identity.sektionen.flatMap(sek => sek.felder).map(f => f.id));
  for (const e of sektorPulls) {
    assert.equal(e.quelle, 'identity');
    assert.ok(feldExistiertOderInstrument(V, idFelder, e.feld), 'gezogenes Feld existiert: ' + e.feld);
  }
  // eigene Felder rund um Volljährigkeit & Auszug.
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['vj_ummeldung', 'vj_mietvertrag', 'vj_krankenversicherung', 'vj_vorsorge']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

test('Blatt Volljährigkeit: rendert mit gezogenem Identitäts-Wert + eigenes Feld sichtbar', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'postcodeCity', '80331 München');
  V.renderSituation('volljaehrig');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Bei Volljährigkeit oder Auszug'), 'Titel');
  assert.ok(html.includes('80331 München'), 'gezogener Identitäts-Wert');
  assert.ok(html.includes('data-klick-sektor="identity"') && html.includes('data-klick-feld="postcodeCity"'),
    'Click-Through zur Meldeadresse');
  assert.ok(html.includes('Ummeldung beim Einwohnermeldeamt'), 'eigenes Feld sichtbar');
});

/* ── Blatt 3: Beim Hauskauf oder einer Heirat ───────────────────────────── */

test('Blatt Hauskauf: in Registry, zieht Identität + Wohnform, zwei eigene Blöcke', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.hauskauf;
  assert.ok(s, 'Hauskauf-Situation existiert');
  assert.equal(s.titel, 'Beim Hauskauf oder einer Heirat');
  assert.equal(s.modus, 'eigen');
  // sektor-gezogene Felder existieren wirklich (Identität + Wohnen, kein toter Verweis).
  const idFelder = new Set(V.SEKTOR_BY_ID.identity.sektionen.flatMap(sek => sek.felder).map(f => f.id));
  const wohnFelder = new Set(V.SEKTOR_BY_ID.housing.sektionen.flatMap(sek => sek.felder).map(f => f.id));
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.some(e => e.quelle === 'identity' && e.feld === 'maritalStatus'));
  assert.ok(sektorPulls.some(e => e.quelle === 'housing' && e.feld === 'ownedOrRented'));
  for (const e of sektorPulls) {
    const set = e.quelle === 'identity' ? idFelder : (e.quelle === 'housing' ? wohnFelder : null);
    assert.ok(set, 'erwartete Quelle ' + e.quelle);
    assert.ok(feldExistiertOderInstrument(V, set, e.feld), 'gezogenes Feld existiert: ' + e.quelle + '.' + e.feld);
  }
  // zwei thematische eigene Blöcke (Hauskauf + Heirat).
  const blockTitel = s.bloecke.map(b => b.titel);
  assert.ok(blockTitel.includes('Rund um den Hauskauf'), 'Hauskauf-Block');
  assert.ok(blockTitel.includes('Rund um die Heirat'), 'Heirat-Block');
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['hk_notartermin', 'hk_finanzierung', 'heirat_standesamt', 'heirat_ehevertrag_vorhanden']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

test('Blatt Hauskauf: rendert mit gezogener Wohnform + beide eigenen Blöcke sichtbar', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.renderSituation('hauskauf');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Beim Hauskauf oder einer Heirat'), 'Titel');
  assert.ok(html.includes('Mustermann'), 'gezogener Identitäts-Wert');
  // beide thematischen Blöcke rendern (Block-Titel ohne Sonderzeichen geprüft).
  assert.ok(html.includes('Rund um den Hauskauf'), 'Hauskauf-Block sichtbar');
  assert.ok(html.includes('Rund um die Heirat'), 'Heirat-Block sichtbar');
  assert.ok(html.includes('Notartermin für den Kaufvertrag'), 'Hauskauf-Feld sichtbar');
  assert.ok(html.includes('Standesamt'), 'Heirat-Feld sichtbar');
});

/* ── Blatt 4: Beim Notar oder bei der Bank ──────────────────────────────── */

test('Blatt Notar: in Registry, zieht Vorsorge + Konto, zwei eigene Blöcke', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.notar;
  assert.ok(s, 'Notar-Situation existiert');
  assert.equal(s.titel, 'Beim Notar oder bei der Bank');
  assert.equal(s.modus, 'eigen');
  // sektor-gezogene Felder existieren wirklich (Vorsorge + Finanzen, kein toter Verweis).
  const vorsFelder = new Set(V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(sek => sek.felder).map(f => f.id));
  const finFelder = new Set(V.SEKTOR_BY_ID.finance.sektionen.flatMap(sek => sek.felder).map(f => f.id));
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.some(e => e.quelle === 'advanceCare' && e.feld === 'instrument:enduring-power-of-attorney'));
  assert.ok(sektorPulls.some(e => e.quelle === 'finance' && e.feld === 'accounts'));
  for (const e of sektorPulls) {
    const set = e.quelle === 'advanceCare' ? vorsFelder : (e.quelle === 'finance' ? finFelder : null);
    assert.ok(set, 'erwartete Quelle ' + e.quelle);
    assert.ok(feldExistiertOderInstrument(V, set, e.feld), 'gezogenes Feld existiert: ' + e.quelle + '.' + e.feld);
  }
  // zwei thematische eigene Blöcke (Notar + Bank).
  const blockTitel = s.bloecke.map(b => b.titel);
  assert.ok(blockTitel.includes('Beim Notar'), 'Notar-Block');
  assert.ok(blockTitel.includes('Bei der Bank'), 'Bank-Block');
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['notar_termin', 'notar_urkunde', 'bank_vollmacht', 'bank_schliessfach']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

test('Blatt Notar: rendert mit gezogenem Vorsorge-Wert + beide eigenen Blöcke', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  // U2-ADR-096: Der Ablageort lebt an der Testament-ZEILE, nicht als Flachfeld. Der Wert wird
  // deshalb dort gesetzt, wo das Blatt ihn auch zieht (liste:...:will:storageLocation; Zeilentyp-Schlüssel `instrument`) — sonst prueft
  // der Test einen Wert, den das Blatt gar nicht liest, und waere gruen ueber ein leeres Blatt.
  V.setData(Object.assign(V.getData(), { sektoren: Object.assign(V.getData().sektoren, {
    advanceCare: Object.assign(V.getData().sektoren.advanceCare || {}, {
      provisionInstruments: [{ id: 't1', instrument: 'will', storageLocation: 'beim Notar Dr. Sommer' }] }) }) }));
  V.renderSituation('notar');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Beim Notar oder bei der Bank'), 'Titel');
  assert.ok(html.includes('beim Notar Dr. Sommer'), 'gezogener Vorsorge-Wert');
  assert.ok(html.includes('Beim Notar') && html.includes('Bei der Bank'), 'beide Blöcke sichtbar');
  assert.ok(html.includes('Bank- / Kontovollmacht'), 'Bank-Feld sichtbar');
});

/* ── Blatt 5: Vor einem Arzttermin ──────────────────────────────────────── */

test('Blatt Arzt: in Registry, zieht Gesundheits-Felder, hat eigene Felder', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.arzt;
  assert.ok(s, 'Arzt-Situation existiert');
  assert.equal(s.titel, 'Vor einem Arzttermin');
  assert.equal(s.modus, 'eigen');
  // alle gezogenen Felder existieren wirklich im Gesundheits-Sektor (kein toter Verweis).
  const gFelder = new Set(V.SEKTOR_BY_ID.health.sektionen.flatMap(sek => sek.felder).map(f => f.id));
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.length > 0);
  for (const e of sektorPulls) {
    assert.equal(e.quelle, 'health');
    assert.ok(feldExistiertOderInstrument(V, gFelder, e.feld), 'gezogenes Feld existiert: ' + e.feld);
  }
  assert.ok(sektorPulls.some(e => e.feld === 'medicationOngoing'));
  assert.ok(sektorPulls.some(e => e.feld === 'allergiesMedicationFoodOther'));
  // eigene Felder zur Termin-Vorbereitung.
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['arzt_termin', 'arzt_fragen', 'arzt_mitbringen', 'arzt_ergebnis']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

test('Blatt Arzt: rendert mit gezogenem Medikamenten-Wert + eigenes Feld sichtbar', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg morgens' }]);
  V.renderSituation('arzt');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Vor einem Arzttermin'), 'Titel');
  assert.ok(html.includes('Ramipril 5 mg morgens'), 'gezogener Medikamenten-Wert');
  assert.ok(html.includes('data-klick-sektor="health"') && html.includes('data-klick-feld="medicationOngoing"'),
    'Click-Through zum Gesundheits-Sektor');
  assert.ok(html.includes('Meine Fragen an die Ärztin'), 'eigenes Feld sichtbar');
});

/* ── Blatt 6: Einfach so — weil es Zeit wird (reine Linse, keine eigenen Felder) ── */

test('Blatt Einfach so: reine Linse — nur sektor-gezogen, KEINE eigenen Felder', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID['einfach-so'];
  assert.ok(s, 'Einfach-so-Situation existiert');
  assert.equal(s.titel, 'Einfach so — weil es Zeit wird');
  assert.equal(s.modus, 'eigen');
  const alle = s.bloecke.flatMap(b => b.eintraege);
  // Das Unterscheidungsmerkmal: keine eigenen Felder, reine Linse.
  const eigene = alle.filter(e => e.feld && typeof e.feld === 'object');
  assert.equal(eigene.length, 0, 'keine eigenen Felder');
  // Jeder Eintrag ist sektor-gezogen und zeigt auf ein real existierendes Feld.
  for (const e of alle) {
    assert.ok(e.quelle, 'sektor-gezogen');
    const sek = V.SEKTOR_BY_ID[e.quelle];
    assert.ok(sek, 'Quelle-Sektor existiert: ' + e.quelle);
    const felder = new Set(sek.sektionen.flatMap(x => x.felder).map(f => f.id));
    // U2-ADR-022: meine-menschen/menschen ist ein gültiger Register-Pull (kein Sektor-Feld mehr).
    assert.ok(feldExistiertOderInstrument(V, felder, e.feld) || (e.quelle === 'people' && e.feld === 'menschen'),
      'gezogenes Feld existiert: ' + e.quelle + '.' + e.feld);
  }
  // Digital-Zugang-Zeile in Block 2 (Passwort-Manager aus Verwaltung).
  assert.ok(alle.some(e => e.quelle === 'administration' && e.feld === 'passwordManager'), 'Digital-Zugang-Zeile');
  // Drei ruhige Blöcke.
  const titel = s.bloecke.map(b => b.titel);
  assert.ok(titel.includes('Wer Sie sind'), 'Block 1');
  assert.ok(titel.includes('Im Ernstfall wichtig'), 'Block 2');
  assert.ok(titel.includes('Was geregelt sein sollte'), 'Block 3');
});

test('Blatt Einfach so: rendert als Lese-Sicht mit Click-Through, kein Bearbeiten-eigenes-Feld', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.renderSituation('einfach-so');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Einfach so — weil es Zeit wird'), 'Titel');
  assert.ok(html.includes('Maria'), 'gezogener Identitäts-Wert');
  assert.ok(html.includes('data-klick-sektor="identity"'), 'Click-Through in den Bereich');
  assert.ok(html.includes('data-klick-sektor="administration"') && html.includes('data-klick-feld="passwordManager"'),
    'Digital-Zugang-Zeile gerendert');
  // Reine Linse: kein Bearbeiten-Knopf (nichts Eigenes zum Eintragen).
  assert.ok(!html.includes('id="b-bearb"'), 'kein Bearbeiten-Knopf auf der reinen Linse');
});

test('renderSituation: Blatt MIT eigenen Feldern ist sofort editierbar (kein Bearbeiten-Knopf)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');   // Setup-first: Editieren setzt einen Sitzungs-Akteur voraus
  V.renderSituation('arzt');   // hat eigene Felder
  const html = document.getElementById('content').innerHTML;
  // Umbau „immer editierbar": eigene Felder rendern direkt als Eingabefelder, kein b-bearb/b-fertig.
  assert.ok(!html.includes('id="b-bearb"') && !html.includes('id="b-fertig"'), 'kein Bearbeiten/Fertig-Knopf mehr');
  assert.ok(html.includes('data-edit'), 'Anlass-Blatt mit eigenen Feldern ist sofort editierbar');
});

/* ── Blatt 7: Vor einem Krankenhaus-Aufenthalt ──────────────────────────── */

test('Blatt Krankenhaus: in Registry (Eigen-Modus), zieht Gesundheit + Vorsorge, eigene Felder', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.krankenhaus;
  assert.ok(s, 'Krankenhaus-Situation existiert');
  assert.equal(s.titel, 'Vor einem Krankenhaus-Aufenthalt');
  assert.equal(s.modus, 'eigen');   // getrennt vom Angehörigen-Akut (U2-ADR-012)
  const gFelder = new Set(V.SEKTOR_BY_ID.health.sektionen.flatMap(x => x.felder).map(f => f.id));
  const vFelder = new Set(V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(x => x.felder).map(f => f.id));
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.some(e => e.quelle === 'health' && e.feld === 'implantsProsthesesPacemakers'));
  // U2-ADR-096: Ablageort der Patientenverfuegung ueber den Selektor, nicht als Flachfeld.
  assert.ok(sektorPulls.some(e => e.quelle === 'advanceCare'
    && e.feld === 'liste:provisionInstruments:living-will:storageLocation'));
  for (const e of sektorPulls) {
    const set = e.quelle === 'health' ? gFelder : (e.quelle === 'advanceCare' ? vFelder : null);   // Selektoren loest feldExistiertOderInstrument auf
    assert.ok(set, 'erwartete Quelle ' + e.quelle);
    assert.ok(feldExistiertOderInstrument(V, set, e.feld), 'gezogenes Feld existiert: ' + e.quelle + '.' + e.feld);
  }
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['kh_termin', 'kh_tasche', 'kh_zuhause', 'kh_entlassung']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

/* ── Blatt 8: Beim Einzug ins Pflegeheim ────────────────────────────────── */

test('Blatt Pflegeheim: in Registry, zieht Pflegegrad + GdB + Pflegekasse, eigene Felder', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.pflegeheim;
  assert.ok(s, 'Pflegeheim-Situation existiert');
  assert.equal(s.titel, 'Beim Einzug ins Pflegeheim');
  assert.equal(s.modus, 'eigen');
  const sets = {
    health: new Set(V.SEKTOR_BY_ID.health.sektionen.flatMap(x => x.felder).map(f => f.id)),
    socialInsurance: new Set(V.SEKTOR_BY_ID.socialInsurance.sektionen.flatMap(x => x.felder).map(f => f.id)),
    advanceCare: new Set(V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(x => x.felder).map(f => f.id)),
  };
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  // Pflegegrad UND GdB werden gezogen (der Kern-Sinn dieses Blatts). Pflegegrad seit U2-ADR-018 aus Sozialversicherung.
  assert.ok(sektorPulls.some(e => e.quelle === 'socialInsurance' && e.feld === 'careLevel'));
  assert.ok(sektorPulls.some(e => e.quelle === 'socialInsurance' && e.feld === 'degreeOfDisabilityGdb'));
  for (const e of sektorPulls) {
    assert.ok(sets[e.quelle], 'erwartete Quelle ' + e.quelle);
    assert.ok(feldExistiertOderInstrument(V, sets[e.quelle], e.feld), 'gezogenes Feld existiert: ' + e.quelle + '.' + e.feld);
  }
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  for (const id of ['ph_einrichtung', 'ph_kosten', 'ph_heimvertrag', 'ph_wohnung']) {
    assert.ok(eigene.includes(id), 'eigenes Feld ' + id);
  }
});

/* ── Blatt 9: Im Erbfall (Nachlass-Blatt, 25 erb_*-Felder) ──────────────── */

test('Blatt Erbfall: in Registry, 25 eigene erb_*-Felder, zieht Vorsorge/Bestattung', () => {
  const { V } = ladeKern();
  const s = V.SITUATION_BY_ID.erbfall;
  assert.ok(s, 'Erbfall-Situation existiert');
  assert.equal(s.titel, 'Im Erbfall');
  assert.equal(s.modus, 'eigen');
  const eigene = s.bloecke.flatMap(b => b.eintraege).filter(e => e.feld && typeof e.feld === 'object').map(e => e.feld.id);
  // 23 erb_*-Felder aus dem Entwurf (U2-ADR-010/012) + zwei Bezugsdatum-Felder aus Auftrag
  // „W-7 und W-12", Zug 3 (09.08.2026): erb_sterbedatum (§ 28 PStG) und erb_schulden_kenntnis
  // (§ 1944 BGB, Fristbeginn ist die Kenntnis, nicht der Tod) + erb_erbschein_frueher (F4 Zug 1,
  // 11.08.2026, Rettungsfeld der Erbschein-Katalog-Migration).
  const erb = eigene.filter(id => id.startsWith('erb_'));
  assert.equal(erb.length, 26, '26 erb_*-Felder');
  assert.equal(eigene.length, 26, 'alle eigenen Felder sind erb_*-Felder');
  // Feld-IDs eindeutig (keine Doppelung im Situations-Namespace).
  assert.equal(new Set(eigene).size, eigene.length, 'eigene Feld-IDs eindeutig');
  // gezogene Felder existieren wirklich in ihren Sektoren.
  const sektorPulls = s.bloecke.flatMap(b => b.eintraege).filter(e => e.quelle);
  assert.ok(sektorPulls.some(e => e.quelle === 'personal' && e.feld === 'typeOfFuneral'));
  for (const e of sektorPulls) {
    const sek = V.SEKTOR_BY_ID[e.quelle];
    assert.ok(sek, 'Quelle-Sektor existiert: ' + e.quelle);
    const felder = new Set(sek.sektionen.flatMap(x => x.felder).map(f => f.id));
    // U2-ADR-022: meine-menschen/menschen ist ein gültiger Register-Pull (kein Sektor-Feld mehr).
    assert.ok(feldExistiertOderInstrument(V, felder, e.feld) || (e.quelle === 'people' && e.feld === 'menschen'),
      'gezogenes Feld existiert: ' + e.quelle + '.' + e.feld);
  }
});

test('Blatt Erbfall: rendert mit eigenen Feldern, sofort editierbar (eigene Felder vorhanden)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.situationFeldSetzen('erbfall', 'erb_sterbeurkunde', 'mehrere Ausfertigungen');
  V.renderSituation('erbfall');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Im Erbfall'), 'Titel');
  assert.ok(html.includes('mehrere Ausfertigungen'), 'eigener erb-Wert sichtbar');
  assert.ok(html.includes('Die ersten Schritte') && html.includes('Kontakte fürs Erbe'), 'thematische Blöcke');
  // Umbau „immer editierbar": eigene Felder sind sofort editierbar, kein Bearbeiten-Knopf.
  assert.ok(!html.includes('id="b-bearb"'), 'kein Bearbeiten-Knopf mehr');
  assert.ok(html.includes('data-edit'), 'eigene Felder sind sofort editierbar (Eingabefeld)');
});
