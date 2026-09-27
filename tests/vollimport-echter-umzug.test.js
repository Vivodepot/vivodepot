'use strict';
/* ════════════════════════════════════════════════════════════════════════
   vollimport-echter-umzug.test.js — „Vollimport ist kein Vollimport"
   (11.09.2026), Roter Beweis am ECHTEN Weg, nicht an einer Zwischenstufe.

   Genau der Weg, auf dem die andere Sitzung den ursprünglichen Befund fand — und der
   einzige Weg, den diese Datei gelten lässt: ein Depot FÜLLEN, ECHT EXPORTIEREN
   (`vollExportJSON`), den Export-Text in ein FRISCHES Depot EINLESEN (`importPlan` →
   `importAnwenden`, derselbe Weg, den die Oberfläche in `flowImportVorschau` fährt), und
   VERGLEICHEN. Kein Aufruf von `_vollDepotFelder` direkt, kein Kurzschluss über `data.rest`.

   Vor diesem Posten: nur `sektoren`, `feldDefinitionen`, `menschen` überlebten diesen Weg —
   45 von 48 Schlüsseln gingen still verloren (s. Bericht
   „vollimport-ist-kein-vollimport-2026-09-11.md"). Diese Datei beweist das Gegenteil für
   eine Auswahl aus allen drei betroffenen Klassen: das schwerste Einzelstück (`mappe`), den
   Referenz-Fund (`institutionen` — eine `ref:institution`-Verweis MUSS nach dem Umzug wieder
   auflösen, nicht nur „das Array ist nicht leer"), einen feldweisen Schlüssel
   (`angehoerigen_passwort_ort`), ein strukturelles Register (`empfaengerkreise`), einen
   Struktur-Schlüssel (`bereichssatz`) — UND die Gegenprobe, dass die bewusst draußen
   bleibenden Schlüssel (`schemaVersion`) es auch bleiben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function gefuelltesDepotExportieren(V) {
  V.setData(V.leeresDepot());
  V.akteurSelbstErklaeren('Tester');
  const instId = V.institutionHinzufuegen({ name: 'Pflegedienst Sonnenschein', tel: '030 1234567' });
  V.personHinzufuegen({ name: 'Pflegerin Meyer', institution: { ref: instId } });
  V.mappeEintragHinzufuegen({
    beschriftung: 'Ausweiskopie', dateiname: 'ausweis.pdf', mime: 'application/pdf',
    groesse: 10, inhalt: 'data:application/pdf;base64,AAAA==',
  });
  const d = V.getData();
  d.angehoerigen_passwort_ort = 'Tresor im Schlafzimmer, oberes Fach';
  d.empfaengerkreise.push({ id: 'ek1', name: 'Tochter Anna', bausteine: ['notfall'], ausnahmen: [], stand: '2026-09-11' });
  d.bereichssatz = ['identitaet', 'finanzen'];
  d.schemaVersion = 1;   // künstlich weit unter dem aktuellen Stand — Gegenprobe für DRAUSSEN unten
  const roh = V.vollExportJSON({ sensibel: true });
  return { text: JSON.stringify(roh), instId };
}

test('[Rot-Beweis] echter Umzug: mappe, institutionen (mit auflösender Referenz), empfaengerkreise, angehoerigen_passwort_ort, bereichssatz überleben Export→Einlesen', () => {
  const { V } = ladeKern();
  const { text, instId } = gefuelltesDepotExportieren(V);

  // Der eigentliche „Umzug": frisches Ziel, echter Import-Weg, nichts abgekürzt.
  V.setData(V.leeresDepot());
  const plan = V.importPlan('json', text);
  const ergebnis = V.importAnwenden(plan, {});

  const ziel = V.getData();

  // Schwerstes Einzelstück.
  assert.equal(ziel.mappe.length, 1, 'mappe hat den Umzug nicht überlebt');
  assert.equal(ziel.mappe[0].beschriftung, 'Ausweiskopie');

  // DER Referenz-Fund: nicht nur "institutionen ist nicht leer", sondern die Verweiskette
  // menschen[].institution.ref → institutionen[].id löst NACH DEM UMZUG wieder auf.
  assert.equal(ziel.institutionen.length, 1, 'institutionen hat den Umzug nicht überlebt');
  const pflegerin = ziel.menschen.find(p => p.name === 'Pflegerin Meyer');
  assert.ok(pflegerin && pflegerin.institution && pflegerin.institution.ref, 'die Person selbst (menschen[], bereits vorher mitwandernd) fehlt oder trägt keinen Institutions-Verweis mehr');
  assert.equal(V.institutionName(pflegerin.institution), 'Pflegedienst Sonnenschein',
    'ref:institution zeigt nach dem Umzug ins Leere — genau der Befund');

  // Feldweiser Schlüssel.
  assert.equal(ziel.angehoerigen_passwort_ort, 'Tresor im Schlafzimmer, oberes Fach');

  // Strukturelles Register mit echten Bürgerdaten (Nachlassplanung).
  assert.equal(ziel.empfaengerkreise.length, 1);
  assert.equal(ziel.empfaengerkreise[0].name, 'Tochter Anna');

  // Struktur-Schlüssel (Datei-Eigenschaft, aber über den Bürgerinhalt entschieden — reist mit,
  // s. Begründung U2-ADR-160 an VOLLIMPORT_MITNEHMEN_SCHLUESSEL).
  // Die Quelle ist auf Schema 1 gealtert und trägt die Bereichsauswahl mit den IDs von damals; der
  // Import hebt sie über die Schema-Kette (Code-Review K2, 15.09.2026) — sonst filterte bereicheAlle()
  // jeden eingebauten Bereich weg.
  assert.deepEqual([...ziel.bereichssatz], ['identity', 'finance']);

  // Gegenprobe: DRAUSSEN bleibt draußen. Das frische Zieldepot behält SEINE eigene
  // schemaVersion — die künstlich gealterte Quelle (1) darf sie nicht überschreiben.
  assert.notEqual(ziel.schemaVersion, 1, 'schemaVersion der Quelle hat das frische Ziel überschrieben — genau das darf nicht passieren');

  // Der Rundlauf berichtet ehrlich, was er wholesale gesetzt hat.
  for (const k of ['mappe', 'institutionen', 'angehoerigen_passwort_ort', 'empfaengerkreise', 'bereichssatz']) {
    assert.ok(ergebnis.restGesetzt.includes(k), k + ' fehlt in ergebnis.restGesetzt, obwohl es gesetzt wurde');
  }
});

test('[Negativkontrolle] ohne den Rundlauf-Zusatz (plan.rest leer) bleibt der alte Drei-Schlüssel-Zustand — der Unterschied ist real', () => {
  const { V } = ladeKern();
  const { text } = gefuelltesDepotExportieren(V);
  V.setData(V.leeresDepot());
  const plan = V.importPlan('json', text);
  // Fingiert den VOR-Posten-7-Zustand: derselbe Plan, aber ohne die neue `rest`-Nutzlast —
  // genau das, was `_planAusRoh` vor diesem Posten lieferte.
  const altePlanForm = Object.assign({}, plan, { rest: {} });
  V.importAnwenden(altePlanForm, {});
  const ziel = V.getData();
  assert.equal(ziel.mappe.length, 0, 'ohne rest sollte mappe NICHT ankommen (das ist der alte, kaputte Zustand)');
  assert.equal(ziel.institutionen.length, 0, 'ohne rest sollte institutionen NICHT ankommen (das ist der alte, kaputte Zustand)');
  assert.equal(ziel.angehoerigen_passwort_ort, '', 'ohne rest sollte angehoerigen_passwort_ort NICHT ankommen');
});

test('Gegenprobe: ein zweiter Import in ein bereits bewohntes Zieldepot überschreibt nicht still', () => {
  const { V } = ladeKern();
  const { text } = gefuelltesDepotExportieren(V);

  V.setData(V.leeresDepot());
  V.getData().angehoerigen_passwort_ort = 'Bereits eingetragen — eigener Wert der Bürgerin am Ziel';
  const plan = V.importPlan('json', text);
  const ergebnis = V.importAnwenden(plan, {});

  assert.equal(V.getData().angehoerigen_passwort_ort, 'Bereits eingetragen — eigener Wert der Bürgerin am Ziel',
    'ein bereits am Ziel vorhandener Wert wurde still überschrieben');
  assert.ok(ergebnis.restUebersprungen.includes('angehoerigen_passwort_ort'),
    'der übersprungene Schlüssel muss gemeldet werden, sonst ist der Verlust wieder still');
});
