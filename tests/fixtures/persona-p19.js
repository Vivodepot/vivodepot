'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P19 — Die Geschäftsführerin einer NGO in Ecuador
   ────────────────────────────────────────────────────────────────────────────
   „P19 und P20 — zwei Rechtsräume, eine Sprache" (21.08.2026).
   Erzeugt über echte Schreibwege, wie P1–P12. Kein Durchklicken.

   SIE IST KEINE ZWÖLFTE VARIANTE DER BÜRGERIN, sondern der erste Prüfstoff,
   an dem der Kern GLEICHZEITIG an fünf Stellen an seine deutsche Herkunft
   stößt: zwei Nachnamen, eine siebenteilige Anschrift, die Daten einer
   juristischen Person, eine fremde Währung und ein Anbieter ohne Kammer.

   WAS SIE BRICHT, IST HIER NICHT REPARIERT — so beauftragt. Jede Bruchstelle
   trägt ihre Einordnung: Schicht 2 (Bürgersatz — trifft jede Bürgerin, gehört
   in den laufenden Schnitt oder gar nicht) oder Schicht 3 (Modul — ein
   Anbieter bringt es mit, ohne dass der Kern sich ändert).

   DER BEHELF, ausdrücklich als Befund (Abbruch-Klausel des Auftrags): beide
   Nachnamen stehen in EINEM Feld `nachname`. Der Kern nimmt das an, ohne zu
   klagen — die Persona ist also anlegbar, und das ist der erste Befund.
   `geburtsname` wäre der naheliegende zweite Ort und ist eine Falle:
   das Feld ist sensibel voreingestellt und fehlt darum im Datensatz.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P19';
const TITEL = 'Die Geschäftsführerin einer NGO in Ecuador';
const PASSWORT = 'p19-fundacion-manos-2026';

/* Der Name nach ecuadorianischem Recht: Vatername, dann Muttername. Beide sind
   Teil des amtlichen Namens; keiner ist ein „Geburtsname" im deutschen Sinn. */
const NACHNAME_VATER = 'Vaca';
const NACHNAME_MUTTER = 'Espinoza';
const NACHNAME_BEHELF = NACHNAME_VATER + ' ' + NACHNAME_MUTTER;

/* Die Anschrift, wie sie auf Post steht — sieben Bestandteile. Der Kern führt
   `strasse` und `plz_ort`; vier davon haben keinen Ort (Messpunkt 2). */
const ANSCHRIFT = Object.freeze({
  strasse:   'Av. Amazonas N34-451 y Av. Atahualpa',
  gebaeude:  'Edificio Torre Blanca, Piso 5, Of. 502',
  stadtteil: 'La Carolina',
  plz:       '170518',
  ort:       'Quito',
  provinz:   'Pichincha',
  land:      'Ecuador',
});

const MENSCHEN = Object.freeze([
  { schluessel: 'praesidentin', name: 'Rosa Chimbo Guanoluisa', beziehung: 'Präsidentin des Vorstands' },
  { schluessel: 'buchhalter', name: 'Édgar Toapanta Lema', beziehung: 'Contador (Buchhalter)', tel: '+593 2 5550140' },
  { schluessel: 'tochter', name: 'Camila Vaca Moreira', beziehung: 'Tochter' },
]);

const INSTITUTIONEN = Object.freeze([
  { schluessel: 'bank', name: 'Banco Pichincha' },
  { schluessel: 'ministerium', name: 'Ministerio de Inclusión Económica y Social (MIES)' },
]);

/* Die Angaben der juristischen Person. Sechs Stück, für die es keinen Feldtyp
   `organisation` gibt (Messpunkt 3) — sie landen als Freitext. */
const ORGANISATION = Object.freeze({
  name: 'Fundación Manos del Río',
  gruendungsurkunde: 'Escritura pública Nr. 2018-4471, Notaría Décima de Quito, 12.09.2018',
  satzung: 'Estatutos, zuletzt reformiert 14.03.2023',
  register: 'RUC 1791234567001',
  gemeinnuetzigkeit: 'Organización sin fines de lucro, MIES Acuerdo 0043-2019',
  vertretung: 'Representante Legal allein vertretungsberechtigt, bestellt bis 30.06.2027',
});

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Der zweite Nachname hat keinen eigenen Ort. `identitaet` führt `vorname`, `nachname` und '
  + '`geburtsname` je EINMAL — beide Nachnamen stehen darum in `nachname`, durch ein Leerzeichen '
  + 'getrennt. Das ist ein BEHELF und kein Feld: nichts im Kern weiß, dass es zwei sind. '
  + 'SCHICHT 2 — der Feldkatalog ist der Bürgersatz.',
  'Vier der sieben Anschrift-Bestandteile haben keinen Ort: Gebäude/Stockwerk, Stadtteil, '
  + 'Provinz und LAND. Der Kern führt kein Länderfeld in `identitaet` — eine Anschrift außerhalb '
  + 'Deutschlands ist damit nicht als solche erkennbar. SCHICHT 2.',
  'Die sechs Angaben der Stiftung haben keinen Feldtyp. `institutionHinzufuegen` nimmt `name` '
  + 'und `art` — mehr nicht. Und der Freitext-Ausweg ist enger als gedacht: `verwaltung` und '
  + '`finanzen` führen GAR KEIN Freitextfeld, die einzigen stehen in `identitaet` und '
  + '`persoenliches`. Die Gründungsurkunde einer Stiftung liegt darum unter „Sonstiges '
  + 'Persönliches". SCHICHT 3: eine eigene Rubrik mit eigenen Feldern ist genau das, was ein '
  + 'Bereichsmodul mitbringen kann (wie der Anwaltssatz seine `obhut`).',
  'Ecuador führt US-Dollar. Die Textsatz-Regel `waehrung` steht auf `EUR` und hängt an der '
  + 'SPRACHE, nicht am Rechtsraum — ein spanischer Satz kann nur EINE Währung sagen, und '
  + 'Spanien und Ecuador teilen sich die Sprache. SCHICHT 3, aber mit einem Schlüssel, der die '
  + 'falsche Dimension trägt.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Lucía');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Lucía',
    /* DER BEHELF, und er ist der Befund: beide Nachnamen in EIN Feld. */
    familyName: NACHNAME_BEHELF,
    birthDate: '1979-11-04',
    nationality: 'ecuadorianisch',
    birthPlace: 'Riobamba',
    /* Die Anschrift, so weit sie hineinpasst. Das Land steht NICHT im Depot — es
       gibt kein Feld dafür, und es in `plz_ort` zu schmuggeln wäre ein zweiter
       Behelf, der den ersten verdeckt. */
    streetAddress: ANSCHRIFT.strasse + ', ' + ANSCHRIFT.gebaeude,
    postcodeCity: ANSCHRIFT.plz + ' ' + ANSCHRIFT.ort,
    telephone: '+593 2 5550139',
    email: 'lucia@manosdelrio.example',
    maritalStatus: 'verh',
  });

  /* DIE JURISTISCHE PERSON — und der zweite gemessene Befund dieser Persona:
     `verwaltung` und `finanzen` führen ÜBERHAUPT KEIN Freitextfeld. Ein erster
     Anlauf schrieb nach `verwaltung/sonstiges_verwaltung` und `finanzen/
     sonstiges_finanzen`; beide gibt es nicht (`sektorFeldSetzen` nimmt eine
     unbekannte Id klaglos an — genau der Fund aus A379, hier am eigenen Bau).
     Die einzigen Freitextfelder des Kerns stehen in `identitaet` (`notizen_start`)
     und `persoenliches` (`sonstiges_persoenlich`, `erinnerungen_sonstiges`).

     Die Gründungsurkunde einer Stiftung landet damit unter „Sonstiges
     Persönliches" — sachlich falsch, und der Ort, an dem der Verlust sichtbar
     wird. SCHICHT 3: eine Betriebs-Rubrik ist genau das, was ein Bereichsmodul
     mitbringt. */
  setze('personal', {
    whatElseIWantToSayWhatElse: Object.entries(ORGANISATION)
      .map(([k, v]) => k + ': ' + v).join('\n')
      + '\n\nAlle Beträge der Stiftung sind US-Dollar; Vivodepot rechnet in EUR.',
  });

  V.dokumentAnlegen({
    typ: 'sonstiges', name: 'Escritura de constitución — Fundación Manos del Río',
    sektorId: 'administration', gueltigAb: '2018-09-12',
  });
  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'DER NAME: beide Nachnamen stehen unversehrt in EINEM Feld — der Kern klagt nicht',
      fn: (V) => {
        const ident = V.getData().sektoren.identity;
        assert.equal(ident.familyName, NACHNAME_BEHELF,
          'der Behelf trägt: der Wert kommt unversehrt an, es geht nichts verloren');
        assert.equal(ident.birthName, undefined,
          'der zweite Nachname steht NICHT in `geburtsname` — das wäre die Falle, s. nächste Probe');
      } },

    { name: 'DIE FALLE, und darum steht der Behelf in `nachname`: `geburtsname` fiele aus dem Datensatz',
      fn: async () => {
        /* WARUM DAS EINE PROBE WERT IST: `geburtsname` ist der naheliegende zweite
           Ort für einen zweiten Nachnamen. Er ist im Feldkatalog `sensibel: true`,
           und die Schema-Vorgabe ist seit A161 die Voreinstellung — ohne eigene
           Entscheidung der Bürgerin hält der Datensatz das Feld zurück. Der zweite
           Nachname verschwände also aus jeder maschinellen Ausgabe, und
           `_zurueckgehalten` nennt einzelne Sektorfelder nicht.
           DAS IST KEIN DEFEKT — es ist der Sensibel-Schutz, der genau so wirken
           soll. Es ist der Grund, warum `geburtsname` der falsche Ort ist. */
        const { ladeKern } = require('../load-kern.js');
        const { V } = ladeKern();
        await V.depotAnlegen('p19-falle-pw');
        V.akteurSelbstErklaeren('Lucía');
        V.sektorFeldSetzen('identity', 'givenName', 'Lucía');
        V.sektorFeldSetzen('identity', 'familyName', NACHNAME_VATER);
        V.sektorFeldSetzen('identity', 'birthName', NACHNAME_MUTTER);
        const e = V.vollExportJSON();
        assert.equal(e.depot.sektoren.identity.familyName, NACHNAME_VATER,
          'Positivkontrolle: der erste Nachname IST im Datensatz — der Weg läuft');
        assert.equal(e.depot.sektoren.identity.birthName, undefined,
          'der zweite fehlt: `geburtsname` ist sensibel voreingestellt');
      } },

    { name: 'DIE ADRESSE: vier von sieben Bestandteilen haben keinen Ort — darunter das Land',
      fn: (V) => {
        const sektor = (V.SEKTOREN || []).find((s) => s.id === 'identity');
        const ids = [];
        for (const sek of (sektor.sektionen || [])) for (const f of (sek.felder || [])) ids.push(f.id);
        assert.equal(ids.includes('land'), false, 'es gibt kein Länderfeld in `identitaet`');
        assert.equal(ids.includes('staat'), false, 'und auch keines unter anderem Namen');
        assert.ok(ids.includes('streetAddress') && ids.includes('postcodeCity'),
          'Positivkontrolle: die zwei deutschen Adressfelder gibt es sehr wohl — die Suche greift');
        const ident = V.getData().sektoren.identity;
        assert.equal(/Ecuador/.test(JSON.stringify(ident)), false,
          'das Land steht nirgends im Depot: es ist nicht untergebracht, sondern fort');
      } },

    { name: 'DIE JURISTISCHE PERSON: eine Institution führt drei Schlüssel, die Stiftung hat sechs Angaben',
      fn: (V) => {
        const inst = (V.getData().institutionen || [])
          .find((i) => i.name === 'Banco Pichincha');
        assert.ok(inst, 'Positivkontrolle: die Institution ist angelegt');
        assert.deepEqual(Object.keys(inst).sort(), ['id', 'name'],
          'eine Institution trägt hier nur Id und Name — eine `art` fehlt, s. nächste Zusicherung');
        /* UND DER GRUND, gemessen statt behauptet: KEINE der zwölf Institutions-Arten
           paßt auf eine Stiftung oder einen gemeinnützigen Verein. `behoerde` wäre
           falsch, `arbeitgeber` beschreibt eine andere Beziehung. Sie bleibt darum
           ohne Art — und das ist ein Verlust, kein Versäumnis der Persona.
           SCHICHT 3: `institutionsArt` ist eines der fünf Einlass-Register, ein
           Anbieter kann eine Art mitbringen. */
        const arten = V.institutionsArtenAlle().map((o) => o.wert || o);
        assert.equal(arten.length, 12, 'Positivkontrolle: die Liste ist gefüllt — die Suche greift');
        for (const w of ['stiftung', 'verein', 'ngo', 'fundacion', 'gemeinnuetzig']) {
          assert.equal(arten.includes(w), false, 'keine Art `' + w + '` — die Stiftung hat keine');
        }
        const text = String(V.getData().sektoren.personal.whatElseIWantToSayWhatElse || '');
        for (const k of Object.keys(ORGANISATION)) {
          assert.ok(text.includes(k + ':'), 'die Angabe `' + k + '` liegt als Freitext, nicht als Feld');
        }
      } },

    { name: 'DIE WÄHRUNG: die Regel steht auf EUR und hängt an der Sprache, nicht am Rechtsraum',
      fn: (V) => {
        assert.equal(V.textsatzRegeln().waehrung, 'EUR',
          'das Depot rechnet in Euro — die Bürgerin in Quito nicht');
        /* Positivkontrolle: ein Modul KANN die Regel ändern — der Weg ist nicht zu. */
        const d = V.getData();
        d.textsprache = 'es';
        d.textsatzModule = [{ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'es',
          texte: { 'identity.familyName.label': 'Apellidos' }, regeln: { waehrung: 'USD' } }];
        V.setData(d);
        V._textsatzModuleAusDepotAnmelden(d);
        assert.equal(V.textsatzRegeln().waehrung, 'USD',
          'Positivkontrolle: ein Modul setzt die Währung — der Schlüssel trägt, er trägt nur die falsche Dimension');
      } },

    { name: 'WER SIGNIERT IHR MODUL: kein Weg im Kern setzt eine Kammer voraus',
      fn: (V) => {
        /* Zu messen, nicht zu lösen — so beauftragt. Das Ergebnis WIDERLEGT die
           Vermutung des Auftrags: der Einlassweg kennt `anbieterId`, eine freie
           Kennung. „Kammer" kommt im Kern nur in Kommentaren vor. */
        const ngo = V.textsatzModulPruefen({ modulTyp: 'textsatz', moduleVersion: 1,
          sprache: 'qu', anbieterId: 'fundacion-manos-del-rio',
          texte: { 'identity.familyName.label': 'Apellidos' } });
        assert.equal(ngo.gueltig, true, 'eine NGO darf ein Modul ausliefern — keine Kammer nötig');
        const kaputt = V.textsatzModulPruefen({ modulTyp: 'textsatz', moduleVersion: 0,
          sprache: 'qu', texte: {} });
        assert.equal(kaputt.gueltig, false,
          'Positivkontrolle: ein echter Fehler wird sehr wohl abgewiesen — die Prüfung ist nicht blind');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, NACHNAME_VATER, NACHNAME_MUTTER, NACHNAME_BEHELF,
  ANSCHRIFT, ORGANISATION, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot, pruefungen };
