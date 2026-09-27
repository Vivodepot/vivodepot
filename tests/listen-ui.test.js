'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Listen-UI (U2-ADR-010 Render-Schicht, sektor-frei)
   ────────────────────────────────────────────────────────────────────────
   Drei Stücke, gegen einen neutralen Stub-Sektor:
     1) Zusammenfassungs-Zeile pro Eintrag (`feldWertHTML` für liste mit unterFelder).
     2) Eintrag-Editor: Data-Mutationen (Hinzufügen/Aktualisieren/Entfernen) mit Stempel
        und Sub-Input-Render (`listenEintragInputsHTML`); reines Werte-Mapping
        (`liesEintragAusWerten`).
     3) ref-Sub-Felder mit Dropdown-Picker (`personenVorschlag`/`institutionenVorschlag`),
        Override-Freitext und Inline-Anlage-Option.

   Die Modal-Brücken (`flowListenEintrag*`, `liesEintragAusDOM`, `flowRefNeueEntitaet`)
   sind UI-Code; ihre Daten-Logik wird durch die reinen Funktionen abgedeckt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-listen-ui';

function kinderFeld() {
  return {
    id: 'kinder', label: 'Kinder', typ: 'liste',
    unterFelder: [
      { id: 'vorname',  label: 'Vorname',     typ: 'text', pflicht: true },
      { id: 'nachname', label: 'Nachname',    typ: 'text' },
      { id: 'gebdatum', label: 'Geburtsdatum',typ: 'datum' },
      { id: 'sorge',    label: 'Sorgerecht',  typ: 'auswahl',
        optionen: [{ wert: 'g', label: 'gemeinsam' }, { wert: 'e', label: 'allein' }] },
    ],
  };
}

function unterhaltFeld() {
  return {
    id: 'unterhalt', label: 'Unterhalt', typ: 'liste',
    unterFelder: [
      { id: 'person', label: 'Person', typ: 'ref', entitaet: 'person' },
      { id: 'art',    label: 'Art',    typ: 'text' },
      { id: 'betrag', label: 'Betrag', typ: 'text' },
    ],
  };
}

/* ── 1) Zusammenfassungs-Zeile pro Eintrag ───────────────────────────── */

test('1a) listenEintragZusammenfassung zieht skalare Sub-Werte mit „ · " zusammen', () => {
  const { V } = ladeKern();
  const z = V.listenEintragZusammenfassung(kinderFeld(),
    { vorname: 'Anna', nachname: 'Müller', gebdatum: '2020-05-30' });
  assert.equal(z, 'Anna · Müller · 2020-05-30');
});

test('1b) listenEintragZusammenfassung überspringt leere Sub-Werte', () => {
  const { V } = ladeKern();
  assert.equal(V.listenEintragZusammenfassung(kinderFeld(), { vorname: 'Anna' }), 'Anna');
  assert.equal(V.listenEintragZusammenfassung(kinderFeld(), {}), '');
  assert.equal(V.listenEintragZusammenfassung(kinderFeld(), null), '');
});

test('1c) listenEintragZusammenfassung zeigt für auswahl das Label, nicht den Schlüssel', () => {
  const { V } = ladeKern();
  const z = V.listenEintragZusammenfassung(kinderFeld(), { vorname: 'Anna', sorge: 'g' });
  assert.equal(z, 'Anna · gemeinsam');
});

test('1d) listenEintragZusammenfassung löst ref-Sub-Werte über entitaetAnzeige auf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personHinzufuegen({ name: 'Maria Beispiel' });

  const z = V.listenEintragZusammenfassung(unterhaltFeld(),
    { person: { ref: id, override: '' }, art: 'monatlich', betrag: '300 EUR' });
  assert.equal(z, 'Maria Beispiel · monatlich · 300 EUR');

  // Override gewinnt vor Lookup.
  const z2 = V.listenEintragZusammenfassung(unterhaltFeld(),
    { person: { ref: id, override: 'Manuell anders' } });
  assert.equal(z2, 'Manuell anders');
});

test('1e) feldWertHTML für liste mit unterFelder rendert <ul> mit <li> pro Eintrag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const html = V.feldWertHTML(kinderFeld(), [
    { vorname: 'Anna', nachname: 'M.' },
    { vorname: 'Ben' },
  ]);
  assert.match(html, /<ul class="liste-eintraege">/, 'Liste als <ul>');
  assert.match(html, /<li data-eintrag="0">[^<]*Anna · M\./, 'Eintrag 0 mit Zusammenfassung');
  assert.match(html, /<li data-eintrag="1">[^<]*Ben/, 'Eintrag 1 mit Zusammenfassung');
});

test('1f) feldWertHTML für liste OHNE unterFelder bleibt Anzahl-Anzeige (rückwärtskompatibel)', () => {
  const { V } = ladeKern();
  const feld = { id: 'x', typ: 'liste' };  // keine unterFelder
  assert.match(V.feldWertHTML(feld, [{}, {}, {}]), /3 Einträge/);
  assert.match(V.feldWertHTML(feld, [{}]), /1 Eintrag/);
});

test('1g) feldWertHTML für leere Liste rendert die Leer-Phrase', () => {
  const { V } = ladeKern();
  assert.match(V.feldWertHTML(kinderFeld(), []), /<span class="leer">nicht hinterlegt/);
  assert.match(V.feldWertHTML(kinderFeld(), null), /<span class="leer">nicht hinterlegt/);
});

/* ── 2) Data-Mutationen + Sub-Input-Render + Werte-Mapping ──────────── */

test('2a) listenEintragHinzufuegen legt Liste an, hängt Eintrag, stempelt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Inhaberin');

  V.listenEintragHinzufuegen('test_sektor', 'kinder', { vorname: 'Anna' });
  const liste = V.getData().sektoren.test_sektor.kinder;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].vorname, 'Anna');
  // Stempel-Strang an feldId angehängt.
  const kette = V.liesUrheberschaft('test_sektor', 'kinder');
  assert.equal(kette.length, 1);
  assert.equal(kette[0].akteur, akteur.personId);
  // Code-Slot angelegt.
  assert.equal(V.liesCode('test_sektor', 'kinder'), null);
});

test('2b) listenEintragHinzufuegen ohne Sitzungs-Akteur wirft VOR jeder Mutation', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);          // kein akteurSelbstErklaeren
  assert.throws(() => V.listenEintragHinzufuegen('test_sektor', 'kinder', { vorname: 'A' }),
    /Sitzungs-Akteur/);
  assert.equal(V.getData().sektoren.test_sektor, undefined, 'keine Liste angelegt');
});

test('2c) listenEintragAktualisieren überschreibt, stempelt zusätzlich', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('test_sektor', 'kinder', { vorname: 'Anna' });
  V.listenEintragAktualisieren('test_sektor', 'kinder', 0, { vorname: 'Anna', nachname: 'Müller' });
  const eintrag = V.getData().sektoren.test_sektor.kinder[0];
  assert.equal(eintrag.nachname, 'Müller');
  // Zwei Stempel (Hinzufügen + Aktualisieren), append-only.
  assert.equal(V.liesUrheberschaft('test_sektor', 'kinder').length, 2);
});

test('2d) listenEintragAktualisieren mit ungültigem Index wirft', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  assert.throws(() => V.listenEintragAktualisieren('test_sektor', 'kinder', 0, { vorname: 'X' }),
    /außerhalb/);
});

test('2e) listenEintragEntfernen entfernt Eintrag, stempelt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  V.listenEintragHinzufuegen('test_sektor', 'kinder', { vorname: 'Anna' });
  V.listenEintragHinzufuegen('test_sektor', 'kinder', { vorname: 'Ben' });
  V.listenEintragEntfernen('test_sektor', 'kinder', 0);
  const liste = V.getData().sektoren.test_sektor.kinder;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].vorname, 'Ben');
  assert.equal(V.liesUrheberschaft('test_sektor', 'kinder').length, 3);  // 2 add + 1 remove
});

test('2f) listenEintragInputsHTML rendert pro Sub-Feld eine Sub-Zeile mit Label und Input', () => {
  const { V } = ladeKern();
  const html = V.listenEintragInputsHTML(kinderFeld(), { vorname: 'Anna' });
  assert.match(html, /<div class="liste-eintrag-form">/);
  assert.match(html, /<div class="feld-label">Vorname/, 'Label Vorname');
  assert.match(html, /<input type="text" data-edit="vorname"/, 'Text-Input für Vorname');
  assert.match(html, /<input type="date" data-edit="gebdatum"/, 'Date-Input für Geburtsdatum');
  assert.match(html, /<select data-edit="sorge"/, 'Select für Sorgerecht');
  // Pflicht-Marker bei vorname (pflicht: true) vorhanden.
  assert.match(html, /Vorname[\s\S]*<span class="feld-pflicht-marker"/, 'Pflicht-Marker');
});

test('2g) liesEintragAusWerten — reines Werte-Mapping ohne DOM', () => {
  const { V } = ladeKern();
  // Skalare Werte werden übernommen, leere weggelassen.
  let eintrag = V.liesEintragAusWerten(kinderFeld(),
    { vorname: 'Anna', nachname: '', gebdatum: '2020-05-30', sorge: 'g' });
  assert.deepEqual(JSON.parse(JSON.stringify(eintrag)),
    { vorname: 'Anna', gebdatum: '2020-05-30', sorge: 'g' });

  // ref-Werte: {ref, override}; leeres ref+override → übersprungen
  eintrag = V.liesEintragAusWerten(unterhaltFeld(),
    { person: { ref: 'id-1', override: '' }, art: 'monatlich' });
  assert.equal(eintrag.person.ref, 'id-1');
  assert.equal(eintrag.person.override, '');
  assert.equal(eintrag.art, 'monatlich');

  // ref='__neu__' wird übersprungen (Inline-Anlage läuft separat)
  eintrag = V.liesEintragAusWerten(unterhaltFeld(),
    { person: { ref: '__neu__', override: '' }, art: 'X' });
  assert.equal('person' in eintrag, false, 'ref=__neu__ NICHT gespeichert');
  assert.equal(eintrag.art, 'X');
});

/* ── 3) ref-Sub-Felder mit Dropdown-Picker + Inline-Anlage ───────────── */

test('3a) feldInputHTML für typ:ref rendert <select> mit personenVorschlag und Inline-Anlage', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id1 = V.personHinzufuegen({ name: 'Dr. Sommer' });
  const id2 = V.personHinzufuegen({ name: 'Dr. Winter' });
  V.personHinzufuegen({ name: 'Notar Müller' });

  const html = V.feldInputHTML(
    { id: 'hausarzt', typ: 'ref', entitaet: 'person', rolle: V.PERSON_ROLLEN.ARZT },
    { ref: id1, override: '' });

  assert.match(html, /<div class="feld-ref-picker">/);
  // Präfix-Form (kein exaktes „>"): toleriert den a11y-aria-label (2026-07-03) + künftige Attribute.
  assert.match(html, /<select data-edit-ref="hausarzt" data-typ="ref" data-entitaet="person"/);
  assert.match(html, /<select data-edit-ref="hausarzt"[^>]*aria-label="hausarzt"/, 'a11y: ref-Select trägt aria-label aus der Feld-Beschriftung');
  assert.ok(html.includes('Dr. Sommer'), 'Person 1 als Option');
  assert.ok(html.includes('Dr. Winter'), 'Person 2 als Option');
  assert.ok(html.includes('Notar Müller'), 'A1 (U2-ADR-021): rollenlos — auch der „Notar" erscheint im Arzt-Feld (kein Silo)');
  assert.match(html, /value="__neu__">\+ Neue Person anlegen<\/option>/, 'Inline-Anlage-Option');
  assert.match(html, /<input type="text" data-edit-override="hausarzt"/, 'Override-Input');
  // selected: id1 vorausgewählt
  const reIdSelected = new RegExp('value="' + id1 + '" selected');
  assert.match(html, reIdSelected, 'aktueller Ref vorausgewählt');
});

test('3b) feldInputHTML für ref mit entitaet:institution nutzt institutionenVorschlag und Label „Neue Institution"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.institutionHinzufuegen({ name: 'AOK Bayern', art: V.INSTITUTION_ART.KRANKENKASSE });
  V.institutionHinzufuegen({ name: 'Sparkasse', art: V.INSTITUTION_ART.BANK });

  const html = V.feldInputHTML(
    { id: 'kk', typ: 'ref', entitaet: 'institution', art: V.INSTITUTION_ART.KRANKENKASSE },
    null);
  assert.ok(html.includes('AOK Bayern'), 'Krankenkasse in Vorschlag');
  assert.equal(html.includes('Sparkasse'), false, 'Bank NICHT im krankenkasse-Filter');
  assert.match(html, /\+ Neue Institution anlegen/);
  assert.match(html, /data-entitaet="institution"/);
});

test('3c) feldInputHTML für liste mit unterFelder rendert Editor-Layout mit data-Hooks', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const html = V.feldInputHTML(kinderFeld(),
    [{ vorname: 'Anna' }, { vorname: 'Ben' }]);

  assert.match(html, /<div class="feld-liste-editor" data-feld-liste="kinder">/);
  assert.match(html, /<li data-eintrag="0">/);
  assert.match(html, /<li data-eintrag="1">/);
  assert.match(html, /data-eintrag-bearbeiten="0"/, 'Bearbeiten-Hook für Eintrag 0');
  assert.match(html, /data-eintrag-entfernen="0"/, 'Entfernen-Hook für Eintrag 0');
  assert.match(html, /data-eintrag-hinzufuegen="kinder"/, 'Hinzufügen-Hook');
});

/* ── Modal-Brücke flowRefNeueEntitaet end-to-end (Regression) ──────────────────
   Bisher waren die Modal-Brücken bewusst ungetestet (nur die reinen Funktionen).
   Genau dort steckte der Fehler: ui.modal übergibt onPrimaer eine schliessen-
   Funktion, dieser Flow las den Namen aber über ein vermeintliches Modal-Element
   → Name immer leer → es wurde nie gespeichert. Dieser Test treibt den Knopf durch. */

test('flowRefNeueEntitaet: Speichern legt die Person an, ruft onAnlegen und schließt', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  let gesetzt = null;
  V.flowRefNeueEntitaet({ entitaet: 'person', rolle: 'arzt' }, (id) => { gesetzt = id; });
  document.getElementById('ref-neu-name').value = 'Gierloff';
  await document.getElementById('m-ok').onclick();
  const menschen = V.getData().menschen;
  assert.equal(menschen.length, 1, 'Person wurde angelegt');
  assert.equal(menschen[0].name, 'Gierloff');
  assert.ok(!('rolle' in menschen[0]), 'A1 (U2-ADR-021): rollenloses Register — kein rolle am Inline-angelegten Eintrag');
  assert.equal(gesetzt, menschen[0].id, 'onAnlegen mit der neuen id aufgerufen');
});

test('flowRefNeueEntitaet: leerer Name legt nichts an (Pflichtfeld, kein onAnlegen)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  let gerufen = false;
  V.flowRefNeueEntitaet({ entitaet: 'person' }, () => { gerufen = true; });
  document.getElementById('ref-neu-name').value = '   ';
  await document.getElementById('m-ok').onclick();
  assert.equal((V.getData().menschen || []).length, 0, 'kein leerer Eintrag');
  assert.equal(gerufen, false, 'onAnlegen wurde nicht aufgerufen');
});

/* ── E2 D3: Institutions-Eingabemaske (analog Personen-Register-Editor) ────────
   Vier der sieben Institutions-Register-Felder (art/tel/email/adresse) hatten keinen
   Eingabepfad — nur `name` war über flowRefNeueEntitaet erfassbar.
   Der DOM-Stub dieser Suite (tests/load-kern.js, makeEl/makeDocument) simuliert KEINEN
   echten Baum — jedes querySelector liefert ein frisches, inhaltsloses Element (siehe
   Kommentar dort). Für verschachtelte Listen-Unterfelder (data-sub-zeile/data-edit)
   ist die Modal-Brücke deshalb wie überall sonst in dieser Suite (liesEintragAusDOM,
   flowListenEintrag*) bewusst NICHT DOM-getrieben getestet — nur die reine Werte-Logik
   (liesEintragAusWerten) und der gerenderte HTML-String. Der volle Speicher-Pfad geht
   auf die Geräte-Abnahme (Auftrag E2, Tests-Abschnitt). */

test('_institutionFelder: ohne vorgegebene Art alle sechs Felder inkl. Art-Auswahl (12 Typen)', () => {
  const { V } = ladeKern();
  const feld = V._institutionFelder(undefined);
  const ids = feld.unterFelder.map(u => u.id);
  assert.equal(JSON.stringify(ids), JSON.stringify(['name', 'art', 'tel', 'adresse', 'email', 'anmerkung']));
  const artFeld = feld.unterFelder.find(u => u.id === 'art');
  assert.equal(artFeld.typ, 'auswahl');
  assert.equal(artFeld.optionen.length, 12, 'INSTITUTION_ART hat 12 Typen („Person und Institution", 13.08.2026: Arztpraxis + generische Behörde ergänzt)');
  assert.ok(artFeld.optionen.some(o => o.wert === 'krankenhaus' && o.label === 'Krankenhaus'));
  assert.ok(artFeld.optionen.some(o => o.wert === 'arztpraxis' && o.label === 'Arztpraxis'));
  assert.ok(artFeld.optionen.some(o => o.wert === 'behoerde' && o.label === 'Behörde'));
});

test('_institutionFelder: mit vorgegebener Art (z. B. pflegedienst) entfällt die Art-Auswahl', () => {
  const { V } = ladeKern();
  const feld = V._institutionFelder('pflegedienst');
  const ids = feld.unterFelder.map(u => u.id);
  assert.equal(JSON.stringify(ids), JSON.stringify(['name', 'tel', 'adresse', 'email', 'anmerkung']), 'kein art-Unterfeld');
});

test('liesEintragAusWerten (Institution): reines Werte-Mapping ohne DOM — alle sechs Felder', () => {
  const { V } = ladeKern();
  const feld = V._institutionFelder(undefined);
  const eintrag = V.liesEintragAusWerten(feld, {
    name: 'Praxis Dr. Müller', art: 'krankenhaus', tel: '089 12345678',
    adresse: 'Musterstraße 1, 80331 München', email: 'kontakt@praxis.example.de',
    anmerkung: 'nur nachmittags erreichbar',
  });
  assert.equal(JSON.stringify(eintrag), JSON.stringify({
    name: 'Praxis Dr. Müller', art: 'krankenhaus', tel: '089 12345678',
    adresse: 'Musterstraße 1, 80331 München', email: 'kontakt@praxis.example.de',
    anmerkung: 'nur nachmittags erreichbar',
  }));
});

test('flowRefNeueEntitaet (Institution, ohne vorgegebene Art): Formular zeigt alle sechs Felder inkl. Art-Auswahl', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.flowRefNeueEntitaet({ entitaet: 'institution' }, () => {});
  const html = document.getElementById('modal-inhalt').innerHTML;
  for (const fid of ['name', 'art', 'tel', 'adresse', 'email', 'anmerkung']) {
    assert.match(html, new RegExp('data-edit="' + fid + '"'), fid + ' im Formular');
  }
  assert.match(html, /<option value="krankenhaus">Krankenhaus<\/option>/, 'Art-Auswahl trägt INSTITUTION_ART-Optionen');
});

test('flowRefNeueEntitaet (Institution, art vom Ref-Kontext vorgegeben): keine Art-Auswahl im Formular', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.flowRefNeueEntitaet({ entitaet: 'institution', art: 'pflegedienst' }, () => {});
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.doesNotMatch(html, /data-edit="art"/, 'keine Art-Auswahl, wenn der Ref-Kontext sie vorgibt');
  assert.match(html, /data-edit="name"/);
});

test('flowRefNeueEntitaet (Institution): leerer Name legt nichts an (Pflichtfeld, kein onAnlegen)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  let gerufen = false;
  V.flowRefNeueEntitaet({ entitaet: 'institution' }, () => { gerufen = true; });
  await document.getElementById('m-ok').onclick();
  assert.equal((V.getData().institutionen || []).length, 0, 'kein leerer Eintrag');
  assert.equal(gerufen, false, 'onAnlegen wurde nicht aufgerufen');
});
