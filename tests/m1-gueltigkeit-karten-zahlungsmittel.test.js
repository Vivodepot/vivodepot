'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — M1 Zug 1, Gruppe „Karten und Zahlungsmittel" („M1", 09.08.2026)
   ────────────────────────────────────────────────────────────────────────
   EHIC steht auf der Rückseite der Krankenkassenkarte (Feld-Beispiel von
   `ehic_nr` selbst: „EHIC-Nr. auf Rückseite KK-Karte") — EIN gemeinsames
   Gültigkeitsdatum statt zweier widersprüchlicher. `d_ticket` bekommt
   bewusst KEIN Datumsfeld: ein rollierendes Monats-Abo ohne Einzel-
   Ablaufdatum — die eigentliche Frist ist die monatliche Kündigungsfrist,
   nicht vergleichbar mit einem befristeten Dokument.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): krankenkassenkarte_gueltig ist ins
// Unterfeld `gueltig` der Liste `krankenkassenkarte` gewandert.
test('[M1] krankenkassenkarte_gueltig deckt auch EHIC ab (dieselbe physische Karte)', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.health.sektionen.flatMap(s => s.felder);
  const liste = felder.find(x => x.id === 'healthInsuranceCards');
  const f = liste && liste.unterFelder.find(u => u.id === 'validUntilInclEhic');
  assert.ok(f && f.typ === 'datum');
  const ehic = felder.find(x => x.id === 'ehicCardEuropeanHealth');
  assert.match(ehic.hint || '', /gültig bis|Krankenkassenkarte/, 'ehic_nr verweist auf das gemeinsame Datum');
});

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): elefand_gueltig ist ins Unterfeld
// `gueltig` der Liste `elefand` gewandert.
test('[M1] elefand.gueltig existiert (Reise-/Registrierungsdauer)', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.mobility.sektionen.flatMap(s => s.felder);
  const liste = felder.find(x => x.id === 'elefandRegistrations');
  assert.equal(liste.unterFelder.find(u => u.id === 'validUntil').typ, 'datum');
});

test('[M1] kreditkarten-Liste bekommt ein gueltig_bis-Unterfeld', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.finance.sektionen.flatMap(s => s.felder);
  const liste = felder.find(x => x.id === 'creditCards');
  const uf = liste.unterFelder.find(u => u.id === 'validUntil');
  assert.ok(uf && uf.typ === 'datum');
});

test('[M1] d_ticket bekommt bewusst KEIN Datumsfeld — steht in W-12-AUSSCHLUSS statt', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID.mobility.sektionen.flatMap(s => s.felder);
  assert.equal(felder.find(x => x.id === 'd_ticket_gueltig'), undefined);
});

test('[M1] Prüftermine: krankenkassenkarte und elefand sind ablauf-getriebene standardDokumente', () => {
  const { V } = ladeKern();
  const alle = V.alleStandardDokumente();
  const kk = alle.find(d => d.typ === 'health-insurance-card');
  const el = alle.find(d => d.typ === 'elefand');
  assert.ok(kk && kk.felder[0].feldId === 'healthInsuranceCards' && kk.felder[0].unterfeldId === 'validUntilInclEhic');
  assert.ok(el && el.felder[0].feldId === 'elefandRegistrations' && el.felder[0].unterfeldId === 'validUntil');
});

/* ── Nachlese F8/M1 Zug 3 (11.08.2026): gemessen, NICHT gebaut ─────────────────────────────
   Auftrag: „Läuft eine ablaufende Kreditkarte in den Prüfterminen auf, oder bleibt sie stumm?"
   Messung unten: STUMM. Weder ERKENNUNG_LEITFELDER noch alleStandardDokumente() kennt
   karte_gueltig — anders als krankenkassenkarte_gueltig/elefand_gueltig oben trägt es keinen
   standardDokumente-Eintrag (M1s eigener Kommentar an karte_gueltig sagt es bereits:
   „Keine standardDokumente-Anbindung diesen Zug").

   WARUM das eine Mechanik-Änderung ist, nicht ein Nachlese-Bau: der Prüftermine-Weg (ERKENNUNG_
   LEITFELDER → _erkennungVorbelegung → data.dokumente[]) legt GENAU EIN Dokument-Datum pro `typ`
   an (Dedup by typ, `_dokumentTypRegistrieren`). Die einzige listenfähige Adressierung
   (`liste:<listeId>:<typWert>:<unterfeldId>`, s. `_listenSelektorZerlegen`) wählt GENAU EINE
   Zeile über einen `typ`-Diskriminator (funktioniert bei vorsorge_instrumente, weil jede Zeile
   ihren eigenen `typ` trägt). `finance.creditCards` hat keinen solchen Diskriminator und kann
   mehrere gleichartige Zeilen tragen (zwei, drei Karten) — eine Anbindung bräuchte (a) eine neue
   Selektor-Form, die ALLE Zeilen statt einer aufzählt, UND (b) das 1-Dokument-pro-typ-Modell auf
   N Dokumente (eines je Listen-Zeile) erweitert. Das ist der Umbau, den M1s eigener Kommentar
   bereits als offen benannt hat — kein Nachlese-Posten, sondern ein eigener Auftrag. */
test('[Nachlese F8/M1 Zug 3] Kreditkarten-Gültigkeit bleibt STUMM in den Prüfterminen — gemessen, nicht gebaut', async () => {
  const { V } = ladeKern();
  // (a) kein ERKENNUNG_LEITFELDER-Eintrag für Kreditkarten
  const leitfeldTypen = Object.keys(V.ERKENNUNG_LEITFELDER);
  assert.ok(!leitfeldTypen.includes('kreditkarte'), 'kein Erkennungs-Leitfeld für Kreditkarten');
  // (b) kein standardDokumente-Katalogeintrag, der karte_gueltig referenziert
  const alle = V.alleStandardDokumente();
  const trifft = alle.filter((d) => (d.felder || []).some((f) => f.feldId === 'creditCards' && f.unterfeldId === 'validUntil'));
  assert.deepEqual(trifft, [], 'karte_gueltig ist in keinem standardDokumente-Eintrag verknüpft');
  // (c) End-zu-Ende: eine seit Jahren abgelaufene Kreditkarte erzeugt weder einen dokumente[]-
  // Datensatz noch einen Prüftermine-Eintrag.
  await V.depotAnlegen('Kreditkarten-Zug3-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.finance = { creditCards: [{ providerLast4Digits: 'Visa · …4521', validUntil: '2020-01-01' }] };
  V.setData(d);
  assert.deepEqual(V.getData().dokumente || [], [], 'kein Dokument-Datensatz entsteht automatisch');
  assert.deepEqual(V.prueftermineDokumente('2026-08-11'), [], 'die abgelaufene Karte taucht in den Prüfterminen nicht auf');
});
