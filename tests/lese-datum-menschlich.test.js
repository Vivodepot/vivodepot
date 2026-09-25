'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Lese-App zeigt Daten deutsch — auf JEDER Oberfläche, die ein Mensch liest.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor dem Bau geschrieben und rot.

   ANLASS UND UMFANG: Aufgefallen ist es am Notfallblatt (`1950-03-07` statt
   `07.03.1950`) — der Oberfläche, die unter Zeitdruck von Menschen gelesen
   wird, die das Produkt nicht kennen. Die Nachfrage nach dem tatsächlichen
   Umfang hat mehr ergeben als den Anlass:

     · `_wertTextMenschlich` im Kern leistet NUR die Datums-Aufbereitung;
       alles Übrige (Auswahl-Labels, Referenz-Auflösung) delegiert es an
       `feldWertText`, das die Lese-App bereits hat. Insoweit ist der
       Datums-Fall der ganze Fall — nicht die Spitze eines Eisbergs.
     · ABER: Die Lese-App kennt `_datumDeutsch` ÜBERHAUPT NICHT. Es fehlt
       nicht am Notfallblatt, sondern an jeder Stelle — Bereichsansicht,
       Situationsblätter, QR-PDF. Das Notfallblatt ist das Dringendste,
       nicht das Einzige.

   WARUM DER SPIEGEL AN ZWEI STELLEN SITZT und nicht einfach in
   `feldWertText`: Der Kern hält `feldWertText` bewusst UNVERÄNDERT für die
   maschinenlesbaren Export-Mapper (ISO bleibt ISO) und legt die menschliche
   Aufbereitung als eigene Schicht darüber. Die Lese-App bekommt denselben
   Aufbau — sonst wäre ein späterer maschinenlesbarer Pfad still auf
   deutschem Datum, und das fiele erst beim Empfänger auf.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const DEPOT = () => ({
  schemaVersion: 40,
  sektoren: {
    identity: { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1950-03-07' },
    health: { bloodType: 'A+' },
    // NICHT schwerbehindertenausweis_gueltig (sensibel:true seit jeher im Schema) — seit Befund 2
    // („Die Lese-App wird nirgends mitgemessen", 12./13.08.2026) hält die Lese-App
    // sensible Felder korrekt zurück; ein Datums-Formatierungstest braucht ein NICHT-sensibles
    // Beispiel, sonst prüft er unbeabsichtigt die Zurückhaltung statt die Formatierung.
    education: { employmentContractFixedTerm: '2028-12-31' },
    advanceCare: {},
  },
  menschen: [],
});

function leseApp() {
  const Lr = ladeLesen(); const V = Lr.V || Lr;
  V.setData(V._foldVollmachtenLesen(DEPOT()));
  return V;
}

test('[LeseDatum] Notfallblatt: deutsches Datum, nicht ISO', () => {
  const V = leseApp();
  const werte = V.notfallKernModell().map(z => String(z.wert)).join(' | ');
  assert.ok(werte.includes('07.03.1950'),
    'Das Notfallblatt wird unter Zeitdruck von Menschen gelesen, die das Produkt nicht kennen. '
    + '„1950-03-07" ist dort keine Schoenheitsfrage: ' + werte);
  assert.ok(!werte.includes('1950-03-07'), 'kein ISO-Rest daneben');
});

test('[LeseDatum] Bereichsansicht: deutsches Datum', () => {
  const V = leseApp();
  const html = V.sektorHTML('identity');
  assert.ok(html.includes('07.03.1950'), 'das Geburtsdatum steht deutsch im Bereich');
  assert.ok(!html.includes('1950-03-07'), 'kein ISO-Rest');
});

test('[LeseDatum] auch die uebrigen Datums-Felder, nicht nur das Geburtsdatum', () => {
  const V = leseApp();
  const html = V.sektorHTML('education');
  assert.ok(html.includes('31.12.2028'),
    'Das befristete Vertragsende ist ein Datum wie jedes andere — eine Loesung, die nur das '
    + 'Geburtsdatum trifft, waere ein Einzelfix statt einer Regel');
});

test('[LeseDatum] wortgleich mit dem Kern — beide Apps zeigen dasselbe', () => {
  const K = ladeKern().V;
  K.setData(DEPOT());
  const kern = K.notfallKernModell().map(z => z.label + '=' + z.wert).join(' | ');
  const lese = leseApp().notfallKernModell().map(z => z.label + '=' + z.wert).join(' | ');
  assert.equal(lese, kern,
    'Paritaet (Invariante 5): Kern und Lese-App zeigen fuer dasselbe Depot dasselbe');
});

test('[LeseDatum] feldWertText bleibt ISO — die Maschinen-Schicht ist unberuehrt', () => {
  const Lr = ladeLesen(); const V = Lr.V || Lr;
  assert.equal(V.feldWertText({ id: 'd', typ: 'datum' }, '1950-03-07'), '1950-03-07',
    'Der Kern haelt feldWertText bewusst maschinenlesbar und legt die menschliche Aufbereitung '
    + 'darueber. Wuerde die Lese-App das Datum SCHON HIER eindeutschen, traege ein spaeterer '
    + 'Export-Pfad still deutsches Datum — und das faellt erst beim Empfaenger auf.');
});

test('[LeseDatum] ein unplausibler Alt-Wert wird nicht verschluckt', () => {
  const Lr = ladeLesen(); const V = Lr.V || Lr;
  V.setData(V._foldVollmachtenLesen({
    schemaVersion: 40, sektoren: { identity: { birthDate: 'unbekannt' } }, menschen: [],
  }));
  const html = V.sektorHTML('identity');
  assert.ok(html.includes('unbekannt'),
    'Ein Wert, den die Aufbereitung nicht deuten kann, muss ROH erscheinen statt zu verschwinden — '
    + 'sonst frisst die Anzeige einen Bestandswert, den die Buergerin selbst eingetragen hat');
});
