'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ZUG 2 · Die vier Schicht-2-Befunde — additiv oder Migrationsstufe?
   ────────────────────────────────────────────────────────────────────────────
   „Die elf Befunde bekommen Zeilen — und die Schicht-2-Frage wird
   gemessen" (21.08.2026), Zug 2. Betrifft A460–A463.
   Messwerkzeug: `tools/schicht2-additiv-oder-stufe-messen.js`.

   **DAS ERGEBNIS IN EINEM SATZ: KEINER DER VIER BRAUCHT EINE MIGRATIONSSTUFE.**
   Damit muss keiner von ihnen die Produktentscheidung abwarten — nur was
   eine Stufe braucht, gehört in den laufenden Schnitt.

   **Drei sind glatt additiv** (ungenaues Datum, Transkriptions-Anlass, Vorlauf).
   **Der vierte — der zweite Nachname — braucht ebenfalls keine Stufe, aber auch
   nicht bloss eine Ergänzung:** der Schlüssel nimmt eine Liste heute schon an
   und trägt sie unversehrt durch Speichern und Laden, **aber rund zwanzig
   direkte Lesestellen rendern sie falsch** (`"Vaca,Espinoza"`, in der vCard
   sogar als escaptes `\,`). Vor dem Bau gehören diese Lesestellen auf die EINE
   vorhandene Zugriffsstelle `feldRohwert` — das ist eine Zusammenführung, kein
   zweiter Lesepfad und keine Migration.

   **KEIN BAU.** Diese Datei misst, ob der Weg besteht — sie geht ihn nicht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/schicht2-additiv-oder-stufe-messen.js');

let _m = null;
async function gemessen() {
  if (!_m) _m = await M.messen(ladeKern().V, ladeKern);
  return _m;
}

test('[Zug2·A461] das ungenaue Datum ist ADDITIV — kein Bestandswert zieht um', async () => {
  const m = await gemessen();
  assert.equal(m.datum.modellNimmtAn, true, 'das Modell nimmt „ca. 1990" heute schon an');
  assert.equal(m.datum.ueberlebtMigration, true, 'die Migrationskette lässt den Wert unangetastet');
  assert.equal(m.datum.ueberlebtSpeichernUndLaden, true, 'und Speichern und Laden ebenso');
  /* DIE EIGENTLICHE MESSUNG: an einem MUTIERTEN Kern, in dem `geburtsdatum` den
     Feldtyp `text` trägt, wird der gepflanzte Bestandswert unverändert gelesen —
     und die Maske zeigt ihn jetzt. Das ist die Positivkontrolle des Auftrags:
     „ein gepflanzter Bestandswert alter Form muss unverändert gelesen werden". */
  assert.equal(m.datum.umgestellt, true, 'die Mutation hat wirklich gegriffen (sonst misst das nichts)');
  assert.equal(m.datum.nachUmstellung.wert, 'ca. 1990');
  assert.equal(m.datum.nachUmstellung.kontrolle, 'Kontrolle', 'Positivkontrolle: das Nachbarfeld ist heil');
  assert.match(m.datum.nachUmstellung.maske, /type="text"[^>]*value="ca\. 1990"/,
    'und die Maske zeigt den Wert — genau das, was heute fehlt');
});

test('[Zug2·A462] der Transkriptions-Anlass ist ADDITIV — gebaut 22.08.2026, achte Option', async () => {
  const m = await gemessen();
  assert.equal(m.anlass.optionen.length, 8);
  assert.ok(m.anlass.optionen.includes('transkription'), 'A462: transkription ist jetzt eine echte Option');
  assert.equal(m.anlass.unbekannterAngenommen, true,
    'derselbe Schreibweg wie vorher — kein Tor, das eine Migration ausgelöst hätte, egal ob der Wert bekannt ist');
  assert.deepEqual(m.anlass.festeListenImKern.filter((n) => /^ANLASS_(?!TEXT|FORMAT|QR)/.test(n)), [],
    'keine feste Anlass-Liste im Kern; die vier ANLASS_-Namen gehören zum Anlass-Ausgang, nicht zu diesem Feld');
  /* Die Liste steht ZWEIMAL — im Kern und in der Lese-App. Ein neuer Wert muss an
     beiden Stellen entstehen. Das ist Pflege, keine Migration, und es ist der
     Grund, warum diese Zusicherung hier steht: wer nur eine Stelle ändert, merkt
     es sonst erst beim Leser. */
  assert.equal(m.anlass.auchInLeseApp, true);
});

test('[Zug2·A463] der Vorlauf ist ADDITIV — Prüfsteine stehen im Katalog, nicht im Depot', async () => {
  const m = await gemessen();
  assert.equal(m.vorlauf.stehtImKatalog, true);
  assert.deepEqual(m.vorlauf.schluessel, ['typ', 'name', 'empfRhythmusMonate', 'hinweis', 'felder'],
    'fünf Schlüssel, keiner davon ein Vorlauf');
  assert.equal(m.vorlauf.imDepotAbgelegt, false,
    'DAS IST DIE ANTWORT: ein Prüfstein ist eine Eigenschaft von SEKTOREN, nicht von `data` — '
    + 'ein Schlüssel mehr dort zieht keinen einzigen Bestandswert um');
  /* Und die andere Bauart — ein Vorlauf JE DOKUMENT — wäre ein Depotwert. Auch
     sie ist additiv: ein Dokument trägt bereits `ablaufDatum`, ein weiterer
     Schlüssel daneben ist ein neuer Schlüssel an einem bestehenden Satz. */
  assert.ok(m.vorlauf.dokumentSchluessel.includes('ablaufDatum'),
    'Positivkontrolle: ein Dokument führt schon heute eine Fristangabe');
});

test('[Zug2·A460] der zweite Nachname braucht KEINE Stufe — aber eine Zusammenführung der Lesestellen', async () => {
  const m = await gemessen();
  /* DER GEPFLANZTE BESTANDSWERT alter Form, unverändert gelesen — die
     Positivkontrolle des Auftrags. */
  assert.equal(m.nachname.altGelesen.roh, 'Silva');
  assert.equal(m.nachname.altGelesen.vcard, 'Silva');
  assert.deepEqual(m.nachname.altGelesen.claims, { family_name: 'Silva' });
  assert.deepEqual(m.nachname.altGelesen.papier, ['Silva']);

  /* DIE NEUE FORM wird heute schon angenommen und übersteht die Rundreise. */
  assert.equal(m.nachname.listeAngenommen, true,
    'der Schlüssel nimmt eine Liste an — kein Tor weist sie ab, keine Stufe nötig');
  assert.deepEqual(m.nachname.neuGelesen.roh, ['Vaca', 'Espinoza']);

  /* UND GENAU DAS IST DER GEFÄHRLICHE ZWISCHENZUSTAND, den diese Probe festhält:
     jeder Leser macht daraus eine Zeichenkette mit Komma, die vCard escapt es
     sogar zu `\,` — der Empfänger sieht dann ein Komma INNERHALB eines
     Namensteils. Solange das so ist, ist die Liste eine Falle und keine
     Fähigkeit. KEINE BEHEBUNG — der Auftrag verlangt Messen, nicht Bauen. */
  assert.equal(m.nachname.neuGelesen.vcard, 'Vaca\\,Espinoza',
    'die vCard escapt das Komma — der Empfänger liest EINEN Namen mit Komma darin');
  assert.equal(m.nachname.neuGelesen.claims.family_name, 'Vaca,Espinoza');
  assert.deepEqual(m.nachname.neuGelesen.papier, ['Vaca,Espinoza']);

  /* Die Zahl, die den Bauaufwand bemisst — und die Antwort auf die Frage des
     Auftrags, ob es ohne zweiten Lesepfad ginge: es gibt bereits EINE
     Zugriffsstelle (`feldRohwert`). Ursprünglich lasen rund zwanzig Stellen
     die Eigenschaft direkt; U2-ADR-256 (04.09.2026) hat einen guten Teil davon
     bereits auf EINE gemeinsame Funktion zusammengeführt (identitaetAnzeigename,
     nicht extra für diesen Zweck gebaut, sondern als Nebeneffekt eines anderen
     Auftrags: der Namens-Anzeigereihenfolge). Was jetzt noch direkt liest, ist
     der REST — genau die Zahl, die eine künftige Zusammenführung noch bewegen
     müsste. Sie zu senken ist keine Verschlechterung der Probe, sondern die
     Zusammenführung, die dieser Test seit jeher als das Gegenteil eines
     zweiten Pfads beschreibt.
     Kennungs-Umbau (15.09.2026): gezählt wird jetzt `.familyName`. Die echten
     Lesestellen der Identität sind dieselben sieben geblieben; die Zahl fiel
     von 13 auf 10, weil der alte Token `.nachname` auch Beifang traf (vCard-
     Import `cur/k.nachname`, Migrations-Prüfung `sektorDaten.nachname`, ein
     Kommentar), der neue dafür die eingebettete Mapping-Zeile trifft.
     Englisch überall (16.09.2026, U2-ADR-416): 10 → 12. Die zwei neuen Treffer sind keine Lesestellen,
     sondern die beiden Kennungen `identity.familyName.label` und `.beispiel` im eingebackenen englischen
     Ab-Werk-Satz — derselbe Beifang wie die deutsche Zeile daneben, gemessen, nicht angenommen.
     S1 (20.09.2026, U2-ADR-426): 12 → 10. Der eingebackene englische Ab-Werk-Satz ist aus dem Gerüst entfernt;
     seine zwei Beifang-Treffer (die Kennungen `identity.familyName.label` und `.beispiel`) entfallen mit ihm —
     keine Lesestelle verschwunden, dieselben zehn wie vor der Umkehr vom 16.09.
     S8 (21.09.2026, U2-ADR-428): 10 → 8. Der deutsche Satz steht nicht mehr im Kern; seine zwei Beifang-Treffer
     (die Kennungen `identity.familyName.label` und `.beispiel`) entfallen mit ihm — wieder keine Lesestelle verschwunden. */
  assert.equal(m.nachname.leseStellen, 8,
    'direkte Lesestellen im Kern, nach U2-ADR-256: ' + m.nachname.leseStellen + ' (vormals rund zwanzig)');
});

test('[Zug2·DAS ERGEBNIS] keiner der vier braucht eine Migrationsstufe', async () => {
  /* Die Zusammenfassung als eigene Zusicherung, damit sie nicht nur im Bericht
     steht: keiner der vier Befunde muss den laufenden Schnitt abwarten. */
  const m = await gemessen();
  assert.equal(m.datum.ueberlebtSpeichernUndLaden, true, 'A461');
  assert.equal(m.anlass.unbekannterAngenommen, true, 'A462');
  assert.equal(m.vorlauf.imDepotAbgelegt, false, 'A463');
  assert.equal(m.nachname.listeAngenommen, true, 'A460');
});
