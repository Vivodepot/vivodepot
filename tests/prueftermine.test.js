'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Prüftermine — In-App-Sicht auf der DOKUMENT-Ebene (U2-ADR-014, Stufe 3)
   ────────────────────────────────────────────────────────────────────────
   Das Prüfblatt liest jetzt die DOKUMENT-Liste (data.dokumente[]) statt
   data.erinnerungen. Diese Tests decken ab:
     • VERORTUNG der Sicht (Sidebar, Welcome trägt nichts, Leerzustand) — wie bisher;
     • EINSAMMELN über alle Bereiche: nur Dokumente mit gueltigAb; ohne gueltigAb
       und quelle:'erkannt-abgelehnt' ausgeschlossen;
     • Ampel + Sortierung (rot→gelb→grün) PRO Dokument;
     • „Als geprüft" setzt aktualisiertAm (deeskaliert die Ampel);
     • Sprung-Anker data-dokument-id im Prüfblatt vorhanden + Sprung in den Bereich;
     • migrierte Alt-Einträge erscheinen GENAU EINMAL (keine Doppelzählung mit
       data.erinnerungen — das Blatt liest sie NICHT mehr direkt).
   KEINE Krypto, KEINE Mappings. Die Ampel-STATUS-Logik selbst liegt unverändert
   in ampel.test.js / erinnerungen.test.js (dokumentAmpel = dünne Brücke darauf).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const JETZT = new Date('2026-06-03T10:00:00Z');

/* prueftermineSektionHTML() (anders als ihre Geschwister prueftermineDokumente(jetzt)/
   dokumentAnlegen(…, jetzt) weiter unten) nimmt kein Datum entgegen und rechnet intern
   gegen `new Date()`. Die beiden Tests unten deklarierten seit jeher ein `heute`, das nie
   verdrahtet war — toter Code, unsichtbar, solange die reale Uhr nahe am angenommenen
   Bezugstag stand. Am 01.09.2026 (Kalendersprung mitten in der Sitzung) schob das den
   'gelb'-Fall über die Rot-Schwelle. Reparatur HIER (Testdatei, eingefrorene Uhr über
   ladeKern({ Date }) — dasselbe Muster wie tests/datum-heute-grenze.test.js), NICHT an
   prueftermineSektionHTML() selbst — deren fehlender Parameter bleibt ein eigener,
   unbehobener Produktcode-Befund (s. Bericht). */
function fixierteUhr(iso) {
  const ms = Date.parse(iso);
  return class FixeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(ms);
      else super(...args);
    }
    static now() { return ms; }
  };
}

function frischesDepot() {
  const { V, document } = ladeKern();
  V.setData(V.leeresDepot());
  return { V, document };
}

/* ── Welcome trägt KEINE Ampel mehr ─────────────────────────────────────── */
test('[Prüftermine] Welcome-Schirm zeigt keine Ampel-Sektion mehr', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderWelcome();
  const html = document.getElementById('overlay-inhalt').innerHTML;
  assert.ok(!html.includes('ampel-sektion'), 'keine Ampel auf dem Willkommensschirm');
  assert.ok(html.includes('welcome-wort'), 'Welcome ist tatsächlich gerendert');
});

/* ── Sidebar: „Prüftermine"-Eintrag unter FINDEN, mit Untertitel ────────── */
test('[Prüftermine] Sidebar trägt den Eintrag (Label + b16-Untertitel) unter FINDEN', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  assert.ok(html.includes('data-prueftermine'), 'Prüftermine-Eintrag verdrahtet');
  assert.ok(html.includes(V.STRINGS.navPrueftermine), 'Label „Prüftermine"');
  assert.equal(V.STRINGS.navPrueftermine, 'Prüftermine');
  assert.ok(html.includes(V.STRINGS.navPrueftermineSub), 'Untertitel „Was wann erneuern"');
  assert.equal(V.STRINGS.navPrueftermineSub, 'Was wann erneuern');
  assert.ok(html.indexOf(V.STRINGS.gruppeFinden) < html.indexOf('data-prueftermine'), 'unter FINDEN');
  assert.ok(html.indexOf('data-mappe') < html.indexOf('data-prueftermine'), 'nach Meine Mappe');
});

/* ── Rückweg-Beschriftung: „Depot verlassen" (Auftrag Eingangsschirm, 20.07.2026) ────────
   Vorher hieß der Eintrag "Zuhause" (davor kurzzeitig "Übersicht") — beides versprach einen
   Ort INNERHALB des Depots, den es nie gab: der Knopf führt zum Willkommensschirm außerhalb
   der Sitzung. Diese Umbenennung ist keine Rückkehr zu einem alten Namen, sondern die erste
   Beschriftung, die zur tatsächlichen Funktion passt. */
test('[Prüftermine] Rückweg-Eintrag heißt „Depot verlassen" (nicht „Zuhause"/„Übersicht")', async () => {
  const { V, document } = ladeKern();
  assert.equal(V.STRINGS.navDepotVerlassen, 'Depot verlassen');
  await V.depotAnlegen(PW);
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  assert.ok(html.includes('data-verlassen'), 'Rückweg-Eintrag (data-verlassen)');
  assert.ok(!html.includes('>Übersicht<'), 'kein sichtbarer „Übersicht"-Eintrag mehr');
  assert.ok(!html.includes('>Zuhause<'), 'kein sichtbarer „Zuhause"-Eintrag mehr');
});

/* ── oeffnePrueftermine schaltet die Sicht + rendert die Sektion in #content ── */
test('[Prüftermine] oeffnePrueftermine setzt aktiveAnsicht und rendert die Sektion in #content', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.oeffnePrueftermine();
  assert.equal(V.getViewState().aktiveAnsicht, 'prueftermine');
  const content = document.getElementById('content').innerHTML;
  assert.ok(content.includes('ampel-sektion'), 'Sektion in der Content-Sicht');
  assert.ok(content.includes(V.STRINGS.prueftermineTitel), 'Sicht-Kopf „Prüftermine"');
  const sb = document.getElementById('sidebar').innerHTML;
  const aktivStueck = sb.split('data-prueftermine')[0].slice(-80);
  assert.ok(aktivStueck.includes('aktiv'), 'Sidebar-Eintrag aktiv markiert');
});

/* ── Leer-Zustand: GAR KEIN Dokument → ruhiger Einführungstext (Stufe 3b) ──── */
test('[Prüftermine] Leeres Depot (kein Dokument) → ruhiger Einführungstext statt Leerzeile', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.oeffnePrueftermine();
  const content = document.getElementById('content').innerHTML;
  assert.ok(content.includes(V.STRINGS.prueftermineEinfuehrung.slice(0, 30)), 'Einführungstext statt Leerzeile');
  assert.ok(!content.includes('Sobald Sie bei einem Eintrag ein Datum hinterlegen'), 'die alte „Sobald Sie…"-Leerzeile ist weg (STRINGS.ampelLeer selbst entfernt, „W-10 und stumme Wortlaute", 13.08.2026 — Wortlaut hier als Literal, damit die Probe bestehen bleibt)');
  assert.ok(content.includes('ampel-sektion'), 'die Sektion ist da (Kopf + Einführung)');
});

/* ════════════════════════════════════════════════════════════════════════
   EINSAMMELN über alle Bereiche (prueftermineDokumente) — reine Logik
   ════════════════════════════════════════════════════════════════════════ */

/* ── Nur Dokumente MIT gueltigAb; ohne gueltigAb ausgeschlossen ──────────── */
test('[Prüftermine] sammelt nur Dokumente MIT gueltigAb (undatierte ausgeschlossen)', () => {
  const { V } = frischesDepot();
  V.dokumentAnlegen({ name: 'Vorsorgevollmacht', sektorId: 'vorsorge', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'Undatiert', sektorId: 'finanzen' }, JETZT);   // kein gueltigAb
  const liste = V.prueftermineDokumente(JETZT);
  assert.equal(liste.length, 1, 'nur das datierte Dokument');
  assert.equal(liste[0].name, 'Vorsorgevollmacht');
  assert.equal(liste[0].sektorId, 'vorsorge');
});

/* ── quelle:'erkannt-abgelehnt' wird NIE eingesammelt (auch falls je datiert) ── */
test('[Prüftermine] quelle:erkannt-abgelehnt ist ausgeschlossen', () => {
  const { V } = frischesDepot();
  // dünne Ablehnung sind ohnehin ohne gueltigAb — defensiv zusätzlich getestet,
  // falls jemals ein gueltigAb daran hängt, bleibt es unsichtbar.
  V.dokumentAnlegen({ name: 'Abgelehnt', sektorId: 'vorsorge', gueltigAb: '2025-01-03', quelle: 'erkannt-abgelehnt', pruefIntervallMonate: 12 }, JETZT);
  // pruefIntervallMonate gesetzt: seit 23.07. gibt es OHNE Intervall keine Ampel (kein stiller Default).
  V.dokumentAnlegen({ name: 'Echt', sektorId: 'vorsorge', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  const liste = V.prueftermineDokumente(JETZT);
  assert.equal(liste.length, 1, 'nur das echte Dokument');
  assert.equal(liste[0].name, 'Echt');
});

/* ── Einsammeln über MEHRERE Bereiche ───────────────────────────────────── */
test('[Prüftermine] sammelt über mehrere Bereiche hinweg ein', () => {
  const { V } = frischesDepot();
  V.dokumentAnlegen({ name: 'A', sektorId: 'vorsorge', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'B', sektorId: 'finanzen', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'C', sektorId: 'identitaet', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  const liste = V.prueftermineDokumente(JETZT);
  assert.equal(liste.length, 3);
  const bereiche = new Set(liste.map(x => x.sektorId));
  assert.ok(bereiche.has('vorsorge') && bereiche.has('finanzen') && bereiche.has('identitaet'), 'alle drei Bereiche dabei');
});

/* ── Ampel + Sortierung pro Dokument (rot→gelb→grün) ────────────────────── */
test('[Prüftermine] Ampel pro Dokument + Sortierung rot→gelb→grün', () => {
  const { V } = frischesDepot();
  // grün (jung), gelb (knapp drüber), rot (lange her) — je 12-Monats-Rhythmus
  V.dokumentAnlegen({ name: 'Grün', sektorId: 'vorsorge', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'Gelb', sektorId: 'finanzen', gueltigAb: '2025-06-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'Rot', sektorId: 'identitaet', gueltigAb: '2025-03-03', pruefIntervallMonate: 12 }, JETZT);
  const liste = V.prueftermineDokumente(JETZT);
  assert.equal(liste.length, 3);
  assert.equal(liste.map(x => x.stufe).join('|'), 'rot|gelb|gruen', 'rot vor gelb vor grün');
  assert.equal(liste.map(x => x.name).join('|'), 'Rot|Gelb|Grün');
});

/* ── „wieder fällig" wird aus Rhythmus/Ablauf berechnet ─────────────────── */
test('[Prüftermine] faelligAm: Ablaufdatum übersteuert, sonst Basis + Rhythmus', () => {
  const { V } = frischesDepot();
  V.dokumentAnlegen({ name: 'Rhythmus', sektorId: 'vorsorge', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'Ablauf', sektorId: 'identitaet', gueltigAb: '2026-01-03', ablaufDatum: '2026-12-31' }, JETZT);
  const liste = V.prueftermineDokumente(JETZT);
  const rh = liste.find(x => x.name === 'Rhythmus');
  const ab = liste.find(x => x.name === 'Ablauf');
  assert.equal(rh.faelligAm, '2027-01-03', 'Basis 2026-01-03 + 12 Monate');
  assert.equal(ab.faelligAm, '2026-12-31', 'Ablaufdatum übersteuert den Rhythmus');
});

/* ── „Als geprüft markieren" setzt aktualisiertAm → Ampel deeskaliert ───── */
test('[Prüftermine] dokumentAlsGeprueft setzt aktualisiertAm=heute (rot → grün)', () => {
  const { V } = frischesDepot();
  const d = V.dokumentAnlegen({ name: 'Rot', sektorId: 'identitaet', gueltigAb: '2025-03-03', pruefIntervallMonate: 12 }, JETZT);
  assert.equal(V.prueftermineDokumente(JETZT)[0].stufe, 'rot', 'startet rot');
  V.dokumentAlsGeprueft(d.id, JETZT);
  const doc = V.dokumentLesen(d.id);
  assert.equal(doc.aktualisiertAm, '2026-06-03', 'aktualisiertAm auf heute gesetzt');
  assert.equal(doc.gueltigAb, '2025-03-03', 'gueltigAb (fachliches Datum) unberührt');
  assert.equal(V.prueftermineDokumente(JETZT)[0].stufe, 'gruen', 'jetzt grün');
});

/* ════════════════════════════════════════════════════════════════════════
   PRÜFBLATT-UI: Anker + Sprung zum konkreten Dokument (Konsequenz 6)
   ════════════════════════════════════════════════════════════════════════ */

/* ── Sprung-Anker data-dokument-id im Prüfblatt vorhanden ────────────────── */
test('[Prüftermine] Prüfblatt rendert pro Zeile den data-dokument-id-Anker', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const d = V.dokumentAnlegen({ name: 'Pass', sektorId: 'identitaet', gueltigAb: '2025-03-03', pruefIntervallMonate: 12 }, JETZT);
  V.oeffnePrueftermine();
  const content = document.getElementById('content').innerHTML;
  assert.ok(content.includes('data-dokument-id="' + d.id + '"'), 'Anker zum konkreten Dokument');
  assert.ok(content.includes('data-prtm-bearb="' + d.id + '"'), 'Ansehen/bearbeiten verdrahtbar');
  assert.ok(content.includes('data-prtm-geprueft="' + d.id + '"'), 'Als-geprüft verdrahtbar');
  assert.ok(content.includes('Pass'), 'Dokument-Name in der Zeile');
});

/* ── Sprung springt in den Heimat-Bereich (+ Bearbeiten-Modus) ──────────── */
test('[Prüftermine] Sprung öffnet den Heimat-Bereich des Dokuments (Dokument-Panel sichtbar)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const d = V.dokumentAnlegen({ name: 'Konto', sektorId: 'finance', gueltigAb: '2026-01-03' }, JETZT);
  V.prueftermineSpringeZuDokument(d.id);
  const vs = V.getViewState();
  assert.equal(vs.aktiverSektorId, 'finance', 'in den Heimat-Bereich gesprungen');
  assert.equal(vs.aktiveAnsicht, 'sektor');
  // Umbau „immer editierbar": der Bereich ist sofort editierbar; das Dokument-Panel ist sichtbar.
  assert.ok(document.getElementById('content').innerHTML.includes('class="doku-panel"'),
    'Dokument-Panel im (immer editierbaren) Bereich sichtbar');
});

/* ── Verwaiste/unbekannte id bricht nicht ───────────────────────────────── */
test('[Prüftermine] Sprung mit unbekannter id bricht nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  assert.doesNotThrow(() => V.prueftermineSpringeZuDokument('gibtsnicht'));
});

/* ════════════════════════════════════════════════════════════════════════
   MIGRATION: Alt-Einträge erscheinen GENAU EINMAL (keine Doppelzählung)
   ════════════════════════════════════════════════════════════════════════ */

test('[Prüftermine] migrierte data.erinnerungen erscheinen genau einmal (keine Doppelzählung)', () => {
  const { V } = frischesDepot();
  const d = V.getData();
  d.erinnerungen = {
    'sektor:vorsorge': { aktualisiertAm: '2025-03-03', erstelltAm: '2025-03-03', pruefIntervallMonate: 12 },
    'sektor:finanzen': { aktualisiertAm: '2026-01-03', erstelltAm: '2026-01-03', pruefIntervallMonate: 12 },
  };
  V.depotNormalisieren(d);
  const liste = V.prueftermineDokumente(JETZT);
  assert.equal(liste.length, 2, 'zwei migrierte Dokumente, genau einmal');
  // data.erinnerungen bleibt additiv erhalten (Folge-Schuld D1) …
  assert.ok(d.erinnerungen['sektor:vorsorge'], 'Alt-Modell unverändert vorhanden');
  // … wird vom Prüfblatt aber NICHT zusätzlich gezählt: erneutes Normalisieren bleibt bei 2.
  V.depotNormalisieren(d);
  assert.equal(V.prueftermineDokumente(JETZT).length, 2, 'keine Dublette bei erneutem Laden');
});

test('[Prüftermine] Prüfblatt liest data.erinnerungen NICHT direkt (nur die Dokument-Liste)', () => {
  const { V } = frischesDepot();
  const d = V.getData();
  // Eine Erinnerung OHNE Migration ins Dokument-Register: darf NICHT im Blatt erscheinen.
  d.erinnerungen = { 'sektor:vorsorge': { aktualisiertAm: '2025-03-03', pruefIntervallMonate: 12 } };
  // (depotNormalisieren wird hier bewusst NICHT gerufen)
  assert.equal(V.prueftermineDokumente(JETZT).length, 0, 'ohne Dokument-Datensatz nichts im Blatt');
});

/* ════════════════════════════════════════════════════════════════════════
   GRUPPE 2 „ohne Prüftermin" (Stufe 3b) — undatierte Dokumente einsammeln,
   erkannt-abgelehnt ausgeschlossen, Reihenfolge/Sichtbarkeit, Sprung.
   ════════════════════════════════════════════════════════════════════════ */

/* ── Gruppe 2 sammelt genau die undatierten Dokumente (Gegenstück zu Gruppe 1) ── */
test('[Prüftermine 3b] Gruppe 2 sammelt nur Dokumente OHNE gueltigAb', () => {
  const { V } = frischesDepot();
  V.dokumentAnlegen({ name: 'Datiert', sektorId: 'vorsorge', gueltigAb: '2026-01-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'Undatiert A', sektorId: 'finanzen' }, JETZT);
  V.dokumentAnlegen({ name: 'Undatiert B', sektorId: 'identitaet' }, JETZT);
  const ohne = V.prueftermineDokumenteOhneTermin();
  assert.equal(ohne.length, 2, 'beide undatierten, nicht das datierte');
  assert.equal(ohne.map(x => x.name).join('|'), 'Undatiert A|Undatiert B', 'alphabetisch, keine Ampel-Sortierung');
  // Gruppe 1 enthält das datierte; die Gruppen überschneiden sich NICHT.
  assert.equal(V.prueftermineDokumente(JETZT).map(x => x.name).join('|'), 'Datiert');
});

/* ── erkannt-abgelehnt erscheint in KEINER Gruppe ───────────────────────── */
test('[Prüftermine 3b] quelle:erkannt-abgelehnt ist auch in Gruppe 2 unsichtbar', () => {
  const { V } = frischesDepot();
  V.dokumentAnlegen({ name: 'Abgelehnt', sektorId: 'vorsorge', quelle: 'erkannt-abgelehnt' }, JETZT); // undatiert
  V.dokumentAnlegen({ name: 'Echt undatiert', sektorId: 'vorsorge' }, JETZT);
  const ohne = V.prueftermineDokumenteOhneTermin();
  assert.equal(ohne.length, 1, 'nur das echte undatierte Dokument');
  assert.equal(ohne[0].name, 'Echt undatiert');
  // …und in keiner der beiden Gruppen taucht die Ablehnung auf.
  assert.equal(V.prueftermineDokumente(JETZT).length, 0, 'Gruppe 1 leer (nichts datiert)');
});

/* ── Leerer Sammler bei leerem Register (defensiv) ──────────────────────── */
test('[Prüftermine 3b] Gruppe 2 ist leer bei leerem Register (wirft nicht)', () => {
  const { V } = frischesDepot();
  assert.doesNotThrow(() => V.prueftermineDokumenteOhneTermin());
  assert.equal(V.prueftermineDokumenteOhneTermin().length, 0);
});

/* ── UI: Reihenfolge — Gruppe 1 zuerst, dann Gruppe 2 ───────────────────── */
test('[Prüftermine 3b] Sicht zeigt Gruppe 1 vor Gruppe 2 (Reihenfolge)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.dokumentAnlegen({ name: 'Mit Datum', sektorId: 'vorsorge', gueltigAb: '2025-03-03', pruefIntervallMonate: 12 }, JETZT);
  V.dokumentAnlegen({ name: 'Ohne Datum', sektorId: 'finanzen' }, JETZT);
  V.oeffnePrueftermine();
  const content = document.getElementById('content').innerHTML;
  assert.ok(content.includes('ampel-sektion'), 'Gruppe 1 (Prüfliste) gerendert');
  assert.ok(content.includes('prueftermine-ohne'), 'Gruppe 2 (ohne Termin) gerendert');
  assert.ok(content.indexOf('id="ampel-sektion"') < content.indexOf('prueftermine-ohne'), 'Gruppe 1 vor Gruppe 2');
  assert.ok(content.includes(V.STRINGS.prueftermineOhneTitel), 'Gruppe-2-Titel');
  assert.ok(content.includes(V.STRINGS.prueftermineOhneZeile), 'dezenter „kein Prüftermin"-Hinweis je Zeile');
});

/* ── UI: leere Gruppe wird NICHT gerendert (nur Gruppe 1 vorhanden) ─────── */
test('[Prüftermine 3b] nur datierte Dokumente → Gruppe 2 fehlt komplett', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.dokumentAnlegen({ name: 'Mit Datum', sektorId: 'vorsorge', gueltigAb: '2025-03-03', pruefIntervallMonate: 12 }, JETZT);
  V.oeffnePrueftermine();
  const content = document.getElementById('content').innerHTML;
  assert.ok(content.includes('ampel-sektion'), 'Gruppe 1 da');
  assert.ok(!content.includes('prueftermine-ohne'), 'Gruppe 2 weg (keine undatierten)');
  assert.ok(!content.includes(V.STRINGS.prueftermineEinfuehrung.slice(0, 30)), 'kein Leer-Zustand, da Dokumente da sind');
});

/* ── UI: nur undatierte Dokumente → Gruppe 1 fehlt, Gruppe 2 da, kein Leer-Zustand ── */
test('[Prüftermine 3b] nur undatierte Dokumente → Gruppe 1 fehlt, Gruppe 2 da', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.dokumentAnlegen({ name: 'Ohne Datum', sektorId: 'finanzen' }, JETZT);
  V.oeffnePrueftermine();
  const content = document.getElementById('content').innerHTML;
  assert.ok(content.includes('prueftermine-ohne'), 'Gruppe 2 da');
  assert.ok(!content.includes('id="ampel-sektion"'), 'Gruppe 1 (Prüfliste) fehlt — nichts datiert');
  assert.ok(!content.includes(V.STRINGS.prueftermineEinfuehrung.slice(0, 30)), 'kein Leer-Zustand — es gibt ein Dokument');
});

/* ── UI: Gruppe-2-Zeile trägt den Sprung-Anker + Sprung-Knopf, KEINEN Ampelpunkt/Rot ── */
test('[Prüftermine 3b] Gruppe-2-Zeile: data-dokument-id + Sprung, kein Ampelpunkt', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const d = V.dokumentAnlegen({ name: 'Reisepass-Entwurf', sektorId: 'identitaet' }, JETZT);
  V.oeffnePrueftermine();
  const content = document.getElementById('content').innerHTML;
  // Sprung-Anker + Sprung-Knopf (gleicher data-prtm-bearb-Pfad wie Gruppe 1)
  assert.ok(content.includes('data-dokument-id="' + d.id + '"'), 'Anker zum konkreten Dokument');
  assert.ok(content.includes('data-prtm-bearb="' + d.id + '"'), 'Sprung-Knopf zum Eintragen');
  assert.ok(content.includes('Reisepass-Entwurf'), 'Dokument-Name in der Zeile');
  // Gruppe 2 selbst trägt KEINEN Ampelpunkt und KEIN „Als geprüft" (kein Termin zu deeskalieren).
  const g2 = content.slice(content.indexOf('prueftermine-ohne'));
  assert.ok(!g2.includes('ampel-dot'), 'kein Ampelpunkt in Gruppe 2 (ruhig, kein Rot)');
  assert.ok(!g2.includes('data-prtm-geprueft'), 'kein „Als geprüft" in Gruppe 2');
});

/* ── Sprung aus Gruppe 2 öffnet den Heimat-Bereich im Bearbeiten-Modus ──── */
test('[Prüftermine 3b] Sprung aus Gruppe 2 führt ins Dokument im Bereich (Datum ergänzen)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const d = V.dokumentAnlegen({ name: 'Ohne Datum', sektorId: 'finance' }, JETZT);
  V.prueftermineSpringeZuDokument(d.id);
  const vs = V.getViewState();
  assert.equal(vs.aktiverSektorId, 'finance', 'in den Heimat-Bereich gesprungen');
  assert.equal(vs.aktiveAnsicht, 'sektor');
  // Umbau „immer editierbar": der Bereich ist sofort editierbar; das Dokument-Panel (gültig-ab/
  // Rhythmus ergänzen) ist sichtbar.
  assert.ok(document.getElementById('content').innerHTML.includes('class="doku-panel"'),
    'Dokument-Panel (gültig-ab/Rhythmus) im immer editierbaren Bereich sichtbar');
});

/* ── Zweiter Kanal: Klartext neben dem Farbpunkt (WCAG 1.4.1, Block Prüftermine 23.07.) ──
   Der Farbpunkt ist aria-hidden — Text ist der tragende Kanal. Er wird hier praezisiert,
   nicht verdoppelt: Der frueheren „Aktuell/Bald faellig/Ueberfaellig" tritt eine Sprache,
   die ohne die Farbe verstaendlich ist. Bei dieser Zielgruppe kein Formalpunkt:
   Rot-Gruen-Schwaeche + Linsentruebung im Alter. */
test('[Prüftermine] jede Ampelzeile trägt Klartext neben dem aria-hidden-Punkt', () => {
  const { V } = ladeKern({ Date: fixierteUhr('2026-07-24T12:00:00Z') });
  V.setData({ schemaVersion: 40, sektoren: {}, menschen: [], dokumente: [
    { id: 'r', typ: 'enduring-power-of-attorney', name: 'Überfällig-Doc', sektorId: 'vorsorge',
      gueltigAb: '2023-01-01', aktualisiertAm: '2023-01-01', pruefIntervallMonate: 12 },
    { id: 'gr', typ: 'living-will', name: 'Aktuell-Doc', sektorId: 'vorsorge',
      gueltigAb: '2026-06-01', aktualisiertAm: '2026-06-01', pruefIntervallMonate: 12 },
  ] });
  const html = V.prueftermineSektionHTML();
  assert.ok(/aria-hidden="true"/.test(html), 'der Farbpunkt bleibt aria-hidden — er ist Zugabe, nicht Träger');
  assert.ok(html.includes('Prüftermin überschritten'), 'rot trägt Klartext: ' + html.slice(0, 40));
  assert.ok(/Nächste Prüfung/.test(html), 'grün nennt den nächsten Termin im Klartext');
});

test('[Prüftermine] die drei Stufen tragen die festgelegten Texte', () => {
  const { V } = ladeKern({ Date: fixierteUhr('2026-07-24T12:00:00Z') });
  const bau = (id, basis) => ({ id, typ: 'enduring-power-of-attorney', name: id, sektorId: 'vorsorge',
    gueltigAb: basis, aktualisiertAm: basis, pruefIntervallMonate: 12 });
  V.setData({ schemaVersion: 40, sektoren: {}, menschen: [], dokumente: [
    bau('rot', '2023-01-01'),        // > 14 Monate → überschritten
    bau('gelb', '2025-07-01'),       // ~12,5 Monate → steht an
    bau('gruen', '2026-06-01'),      // frisch → aktuell
  ] });
  const html = V.prueftermineSektionHTML();
  assert.ok(html.includes('Prüftermin überschritten'), 'rot');
  assert.ok(html.includes('Prüftermin steht an'), 'gelb');
  assert.ok(/Nächste Prüfung \w+ 20\d\d/.test(html), 'grün: „Nächste Prüfung <Monat Jahr>"');
});
