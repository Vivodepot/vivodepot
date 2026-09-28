'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kein Personenname in einem erzeugten Dateinamen (28.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund DATEINAME-PERSON (HOCH): die Übergabe-Datei eines Sub-Depots hieß
   „<Marke>-Sub_<Bezeichnung>_<Datum>.json“ — der Name der vertretenen Person
   außerhalb jeder Verschlüsselung (Download-Ordner, Cloud, Mail-Anhang). Dazu
   hingen Export-Dateien den Vornamen an (exportDateiname) und die Datei eines
   Empfängerkreises den Namen des Kreises (empfaengerDateiname), der oft ein
   Mensch ist. Jetzt: Datum und vier Zeichen einer Kennung; die Sub-Depot-Liste
   nennt dieselben vier Zeichen, die Meldung nach dem Speichern sagt, für wen.
   Gehalten:
     · dynamisch: Haupt-, Sub-/Blackbox-, jede Export- und die Empfängerkreis-
       Datei tragen weder Vor- noch Nachnamen noch Kreis- noch Sub-Namen;
     · statisch (Klasse): keine Aufrufstelle von dateiAusgeben baut den Namen
       aus Personen-Feldern. Zwei benannte Ausnahmen, beide Namen, die die
       Bürgerin selbst gewählt hat: der Speichername (zielname) und die
       Beschriftung ihres eigenen Dokuments (Mappe, Original herunterladen).
   ROT-BEWEIS: die Namensbildung vor diesem Commit (Sub, Export, Kreis).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const NAMEN = /Maria|Musterfrau|Lea|Beispiel|Erika/;

test('[Dateiname·Person] Haupt-, Sub-, Export- und Kreis-Dateien tragen keinen Personennamen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Dateiname-2026!');
  V.akteurSelbstErklaeren('Maria Musterfrau');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea Beispiel', inhaberin: 'Lea Beispiel', verwaltungsTyp: 'verwaltet' }, 'Sub-Datei-2026!');
  // Zuerst die Wege, die es schon vor diesem Commit gab — gegen den alten Kern fallen sie am Namen, nicht an einer fehlenden Funktion.
  const namen = [
    V.depotDateiname(new Date('2026-09-28T10:00:00Z')),
    V.empfaengerDateiname({ id: 'a1b2c3d4-0000', name: 'Tante Erika' }),
    ...V.EXPORT_FORMATE.map((def) => V.exportDateiname(def)),
  ];
  assert.ok(namen.length > 5, 'Vorbedingung: mehrere Dateinamen erzeugt');
  for (const n of namen) assert.doesNotMatch(n, NAMEN, 'Personenname im Dateinamen: ' + n);
  assert.doesNotMatch(V.blackboxDateiname(e.depotUUID, new Date('2026-09-28T10:00:00Z')), NAMEN);
  const kurz = e.depotUUID.replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase();
  assert.equal(V.blackboxDateiname(e.depotUUID, new Date('2026-09-28T10:00:00Z')), 'Vivodepot-Sub_2026-09-28_' + kurz + '.json');
});

/* Dynamisch über die echten Ausgabewege (Erfassung tests/ausgabe-fang.js): was über dateiAusgeben das Gerät verließe, wird
   abgefangen; kein Dateiname trägt einen Namen aus dem Depot. Die Wege sind dieselben, die die Ausgabewege-Proben fahren. */
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');
test('[Dateiname·Person·Wege] PDF-, FHIR-, XML-, Zusammenstellungs- und Kalender-Dateien tragen keinen Namen aus dem Depot', async () => {
  const k = await ladeMitAusgabe();
  const V = k.V;
  await V.depotAnlegen('Dateiname-Wege-2026!');
  V.akteurSelbstErklaeren('Maria Musterfrau');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  const wege = [
    () => V.flowGesundheitFhirExport({}), () => V.flowNotfallkartePdf(), () => V.flowBereichPdf('identity', {}),
    () => V.flowVollDepotPdf({}), () => V.flowSituationPdf('arzt'), () => V.flowErbscheinXmlSichern(),
    () => V.flowAnlassExport('geburt', {}),
    // Jedes Registry-Exportformat (XÖV, EDCI, vCard, …) über denselben Download-Weg; dort hing bis heute der Vorname am Namen.
    ...V.EXPORT_FORMATE.map((def) => () => V._formatExportDownload(def, {})),
  ];
  let n = 0;
  for (const w of wege) { try { w(); n += 1; await warteAufDateien(k, k.gefangen.length + 1, 4000); } catch (_) { /* ein Weg ohne Daten gibt nichts aus */ } }
  assert.ok(k.gefangen.length >= 4, 'Vorbedingung: mehrere Dateien abgefangen (' + k.gefangen.length + ')');
  for (const g of k.gefangen) assert.doesNotMatch(g.name, NAMEN, 'Personenname im Dateinamen: ' + g.name);
});

test('[Dateiname·Person·Klasse] keine dateiAusgeben-Stelle baut den Namen aus Personen-Feldern', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const PERSON = /bezeichnung|inhaberin|givenName|familyName|vorname|nachname|kreis\.name|\bbez\b/;
  const AUSNAHMEN = [/dateiAusgeben\(blob, zielname,/, /dateiAusgeben\(new Blob\(\[bytes\], \{ type: mime \}\), basis \+ '\.json', mime\)/];
  const zeilen = kern.split('\n').filter((z) => z.includes('dateiAusgeben(') && !/function dateiAusgeben/.test(z) && !/^\s*(\/\/|\*)/.test(z));
  assert.ok(zeilen.length > 10, 'Vorbedingung: Aufrufstellen gefunden');
  const funde = zeilen.filter((z) => PERSON.test(z) && !AUSNAHMEN.some((a) => a.test(z)));
  assert.deepEqual(funde, []);
});

test('[Dateiname·Person·Rot-Beweis] die Namensbildung vor diesem Commit fällt', () => {
  const sub = 'Vivodepot-Sub_' + 'Lea_Beispiel' + '_2026-09-28.json';
  const exp = 'Vivodepot_' + 'Export' + '_Maria.json';
  const kreis = 'vivodepot-fuer-' + 'Tante-Erika' + '-2026-09-28.vivodepot';
  for (const n of [sub, exp, kreis]) assert.match(n, NAMEN);
  const altZeile = "  return dateiAusgeben(blob, _dateiNamePraefix() + '-Sub_' + kennung + '_' + datum + '.json', 'application/json');";
  assert.ok(/kennung/.test(altZeile), 'die alte Zeile nahm die Bezeichnung über „kennung“ — die Klasse fängt sie über den dynamischen Teil');
});
