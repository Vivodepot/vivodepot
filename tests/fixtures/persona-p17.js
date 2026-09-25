'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P17 — Die Bürgerin in Österreich
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C1. Erzeugt über echte Schreibwege,
   wie P1–P12 und P19/P20. Kein Durchklicken.

   WARUM SIE DER BILLIGSTE PRÜFSTEIN IST: **deutsch, anderes Recht.** Bei P19
   (Ecuador) und P20 fielen Sprache und Rechtsraum gemeinsam aus dem Rahmen, und
   die zwei Ursachen liessen sich nur durch Nachdenken trennen. Hier ist die
   Sprache dieselbe — jeder Bruch, der bleibt, ist ein Rechtsraum-Bruch und kein
   Sprachbruch. **Das belegt die Schlüsselfrage „Sprache allein oder Sprache mal
   Rechtsraum" mit einem einzigen Depot statt mit einer Überlegung.**

   WAS SIE BRICHT, IST HIER NICHT REPARIERT — so beauftragt. Jede Bruchstelle
   trägt ihre Einordnung: Schicht 2 (Bürgersatz), Schicht 3 (Modul) oder Kern.

   NACHTRAG (Laufzettel Nacht 22./23.08.2026, Posten 16, A480) — GEMESSEN, NICHT
   REPARIERT: die Schlüsselfrage selbst („Sprache allein oder Sprache mal
   Rechtsraum"), die diese Persona belegt, hat seit dem 21.08. eine Antwort
   bekommen — Schnitt Glied 4 (A469, U2-ADR-162) trägt `rechtsraum` seither als
   eigenen Schlüssel neben `sprache` im Textsatz. Ein Anbieter KÖNNTE `sprache:
   'de', rechtsraum: 'AT'` heute andocken, ohne dass „de-AT" die Sprache
   verfälscht. Diese Persona selbst bleibt bewusst UNVERÄNDERT (kein Modul
   angedockt, kein Wortlaut erfunden) — das wäre eine Inhalts-Entscheidung
   (welcher Text, welches Register bekommt einen Ort), keine, die CC trifft.
   Die vier übrigen Bruchstellen (Rechtsraum-Katalog nur `DE`, ÖZVV/ÖZTR/
   Notariatskammer ohne Ort, Drei-Zeugen-Regel als Rechtsfolge, Erwachsenen-
   vertretung↔Betreuung) sind UNVERÄNDERT offen.

   ERFUNDEN: alle Personen, Orte, Nummern und Daten. Die österreichische
   Sozialversicherungsnummer ist nach der echten FORM gebildet (vier Ziffern
   laufende Nummer plus Prüfziffer, dann TTMMJJ), trägt aber eine erfundene
   laufende Nummer.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P17';
const TITEL = 'Die Bürgerin in Österreich';
const PASSWORT = 'p17-graz-sozialversicherung-2026';

/* Die österreichische Sozialversicherungsnummer: zehnstellig, vier Ziffern
   laufende Nummer, eine Prüfziffer, dann das Geburtsdatum als TTMMJJ. Der Kern
   führt genau EIN Feld dafür — und es heisst `rentenversicherungsnummer`. */
const SV_NUMMER = '1234 030581';

/* Die österreichischen Entsprechungen der sechs Vorsorge-Instrumente, die der
   Kern führt. Sie sind der Kern dieser Persona: das Instrument gibt es, aber der
   WORTLAUT und die REGISTRIERUNG sind andere. */
const INSTRUMENTE_AT = Object.freeze([
  { de: 'enduring-power-of-attorney', at: 'Vorsorgevollmacht',
    register: 'ÖZVV — Österreichisches Zentrales Vertretungsverzeichnis',
    form: 'vor Notar, Rechtsanwalt oder Erwachsenenschutzverein (§ 262 ABGB)' },
  { de: 'custodianship-declaration', at: 'Erwachsenenvertreter-Verfügung',
    register: 'ÖZVV',
    form: 'schriftlich, Registrierung im ÖZVV empfohlen — die deutsche „Betreuung" heisst hier '
      + 'Erwachsenenvertretung (seit dem 2. ErwSchG 2018)' },
  { de: 'living-will', at: 'Patientenverfügung',
    register: 'Patientenverfügungsregister der Österreichischen Notariatskammer',
    form: 'verbindlich nur mit ärztlicher Aufklärung und juristischer Belehrung, '
      + 'acht Jahre gültig (PatVG)' },
  { de: 'will', at: 'Testament',
    register: 'Österreichisches Zentrales Testamentsregister (ÖZTR)',
    form: 'eigenhändig oder fremdhändig mit DREI Zeugen (§ 579 ABGB) — die deutsche '
      + 'Zwei-Zeugen-Regel gilt hier nicht' },
  { de: 'ki-verfuegung', at: '(keine österreichische Entsprechung erhoben)', register: null, form: null },
  { de: 'spousal-emergency-representation', at: 'Vertretungsbefugnis nächster Angehöriger',
    register: 'ÖZVV', form: '§ 284b ABGB — anderer Zuschnitt als § 1358a BGB' },
]);

const MENSCHEN = Object.freeze([
  { schluessel: 'mann', name: 'Gernot Pichler', beziehung: 'Ehemann', tel: '+43 664 5550117' },
  { schluessel: 'sohn', name: 'Tobias Pichler', beziehung: 'Sohn' },
  { schluessel: 'notarin', name: 'Dr. Elisabeth Url', beziehung: 'Notarin, Graz' },
]);

const INSTITUTIONEN = Object.freeze([
  { schluessel: 'oegk', name: 'Österreichische Gesundheitskasse (ÖGK)' },
  { schluessel: 'pva', name: 'Pensionsversicherungsanstalt (PVA)' },
  { schluessel: 'bank', name: 'Steiermärkische Sparkasse' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'DAS FELD HEISST `rentenversicherungsnummer`. Österreich führt eine '
  + 'SOZIALVERSICHERUNGSNUMMER — eine Nummer für Pension, Kranken- und Unfallversicherung '
  + 'zusammen. Der Wert passt, die BESCHRIFTUNG ist falsch. SCHICHT 2 in der Form, aber '
  + 'ausdrücklich NICHT als Feld-Neubau: die Beschriftung ist genau das, was ein Textsatz '
  + 'ändern würde — wenn er am Rechtsraum hinge und nicht an der Sprache. Hier ist er '
  + 'deutsch, und die Bürgerin ist es auch.',
  'DIE SECHS VORSORGE-INSTRUMENTE FÜHREN NUR `DE`. `AB_WERK_RECHTSRAUM_DE` trägt je Instrument '
  + 'genau einen Rechtsraum-Schlüssel, und der ist überall `DE`. Für Österreich gibt es keinen '
  + 'Wortlaut, keine Behörde und kein Register. SCHICHT 3 — genau das, was ein '
  + 'Rechtsraum-Modul mitbringen soll.',
  'DIE REGISTER HABEN KEINEN ORT. ÖZVV, ÖZTR und das Patientenverfügungsregister der '
  + 'Notariatskammer sind die österreichischen Entsprechungen des Zentralen Vorsorgeregisters. '
  + 'Der Kern kennt die Register als Teil des `DE`-Wortlauts, nicht als eigene Angabe. '
  + 'SCHICHT 3.',
  'DIE DREI-ZEUGEN-REGEL IST EINE RECHTSFOLGE, KEIN TEXT. § 579 ABGB verlangt beim '
  + 'fremdhändigen Testament DREI Zeugen; § 2247 BGB kennt das eigenhändige ohne Zeugen. '
  + 'Ein Rechtsraum-Modul, das nur den WORTLAUT austauscht, trägt diese Regel nicht — sie '
  + 'gehört in die Prüfung, nicht in den Satz. SCHICHT 3, und der Punkt, an dem ein '
  + 'Wortlaut-Modul zu wenig ist.',
  'DIE ERWACHSENENVERTRETUNG IST NICHT DIE BETREUUNG. Seit dem 2. Erwachsenenschutzgesetz '
  + '(2018) kennt Österreich vier Stufen der Vertretung; das deutsche Betreuungsrecht kennt '
  + 'sie nicht. Der Kern führt `betreuungsverfuegung` als EIN Instrument. SCHICHT 3 — und '
  + 'anders als der Wortlaut ist das eine Frage des Zuschnitts, nicht der Übersetzung.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Ingrid');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  setze('identity', {
    givenName: 'Ingrid',
    familyName: 'Pichler',
    birthName: 'Hasenöhrl',
    birthDate: '1981-05-03',
    nationality: 'österreichisch',
    birthPlace: 'Leoben',
    streetAddress: 'Sackstraße 17/3',
    postcodeCity: '8010 Graz',
    telephone: '+43 316 5550118',
    email: 'ingrid.pichler@example.de',
    maritalStatus: 'verh',
  });

  /* DER MESSPUNKT, um den es geht: die österreichische Sozialversicherungsnummer
     geht in dieselbe Liste, die `rentenversicherungsnummer` (Schnitt Glied 3, A448,
     U2-ADR-161: jetzt `rentenversicherung`, mehrwertig) hiess. Der Wert kommt an —
     die Beschriftung bleibt deutsch, obwohl die Sprache stimmt. Anders als bei P15
     braucht P17 nur EINEN Eintrag — ihr Befund ist Sprache/Rechtsraum, nicht
     „ein Wert oder mehrere" (das ist P15s Frage). */
  V.listenEintragHinzufuegen('socialInsurance', 'pensionInsuranceNumbers', { system: '', pensionInsuranceNumber: SV_NUMMER });

  setze('health', {
    /* `kv_art` ist ein VERWEIS-Feld (A43/U2-ADR-116): ein roher String wirft.
       Die ÖGK steht darum als `override` — dieselbe Form, die P1 und P12 für
       eine deutsche Kasse nutzen. Der Verweis trägt also auch für eine
       ausländische Kasse; das ist die Entwarnung neben den fünf Befunden. */
    healthInsurance: [{ override: 'Österreichische Gesundheitskasse (ÖGK)' }],
    insuranceNumber: SV_NUMMER,
    insuredThrough: 'Ingrid Pichler',
    bloodType: '0+',
  });
  /* Die e-card ist die österreichische Krankenversichertenkarte. Der Kern führt
     seit Schnitt Glied 3 `krankenkassenkarte` als Liste — der Ort passt, der
     Name nicht (unverändert der Befund dieser Persona). */
  V.listenEintragHinzufuegen('health', 'healthInsuranceCards', { system: '', storageLocation: 'e-card, in der Geldbörse' });

  /* DIE SECHS INSTRUMENTE, so weit sie sich ablegen lassen. Der Kern legt sie als
     Dokumente an; der WORTLAUT dahinter ist deutscher Wortlaut, und das ist der
     Befund — nicht das Fehlen des Dokuments. */
  V.dokumentAnlegen({ typ: 'enduring-power-of-attorney', name: 'Vorsorgevollmacht (österreichische Form)',
    sektorId: 'advanceCare', gueltigAb: '2024-03-11' });
  V.dokumentAnlegen({ typ: 'living-will', name: 'Patientenverfügung (verbindlich, PatVG)',
    sektorId: 'advanceCare', gueltigAb: '2024-03-11' });
  V.dokumentAnlegen({ typ: 'will', name: 'Fremdhändiges Testament, drei Zeugen (§ 579 ABGB)',
    sektorId: 'advanceCare', gueltigAb: '2023-09-28' });

  /* Was keinen Ort hat, steht im einzigen Freitextfeld, das der Kern in
     `identitaet` führt — derselbe Ausweg wie bei P19, und aus demselben Grund
     ein Befund und keine Lösung. */
  setze('identity', {
    furtherDetails: INSTRUMENTE_AT
      .filter((i) => i.register)
      .map((i) => i.at + ' — Register: ' + i.register + ' · Form: ' + i.form).join('\n\n'),
  });

  return { p, inst };
}

function pruefungen(assert) {
  return [
    { name: 'DIE SOZIALVERSICHERUNGSNUMMER kommt unversehrt an — in der Liste `rentenversicherung`',
      fn: (V) => {
        const sv = V.getData().sektoren.socialInsurance;
        assert.equal(sv.pensionInsuranceNumbers.length, 1);
        assert.equal(sv.pensionInsuranceNumbers[0].pensionInsuranceNumber, SV_NUMMER,
          'der Wert trägt: es geht nichts verloren, und genau darum ist der Befund die BESCHRIFTUNG');
      } },

    { name: 'SPRACHE STIMMT, RECHT NICHT: die Beschriftung ist deutsch und richtig — und trotzdem falsch',
      fn: (V) => {
        /* DAS IST DER PRÜFSTEIN DIESER PERSONA. Bei P19 hätte man einwenden
           können, die Beschriftung sei nur unübersetzt. Hier ist sie übersetzt —
           die Bürgerin liest Deutsch, und liest trotzdem das falsche Wort. */
        const treffer = [];
        (function geh(n) {
          if (!n) return;
          if (Array.isArray(n)) return n.forEach(geh);
          if (n.id === 'pensionInsuranceNumbers') treffer.push(String(n.label));
          if (n.felder) n.felder.forEach(geh);
          if (n.sektionen) n.sektionen.forEach(geh);
        })(V.SEKTOREN.find((s) => s.id === 'socialInsurance').sektionen);
        assert.equal(treffer.length, 1, 'genau ein Feld trägt diese Kennung');
        assert.match(treffer[0], /Rentenversicherung/,
          'die Beschriftung nennt die deutsche Rentenversicherung — der Textsatz hängt an der '
          + 'SPRACHE, und die ist hier dieselbe. Ein Sprach-Modul kann diesen Bruch nicht heilen.');
      } },

    { name: 'DIE SECHS INSTRUMENTE FÜHREN NUR `DE` — für Österreich gibt es keinen Wortlaut',
      fn: (V) => {
        const K = require('../helfer/rechtsraum-katalog-de.js').katalogDe(V);
        const instrumente = Object.keys(K);
        assert.ok(instrumente.length >= 6, 'sechs oder mehr Instrumente im Katalog');
        for (const i of instrumente) {
          const raeume = Object.keys(K[i]).filter((k) => k !== 'zweck');
          assert.deepEqual(raeume, ['DE'],
            i + ' führt mehr oder weniger als genau `DE`: ' + raeume.join(','));
        }
      } },

    { name: 'Positivkontrolle — das Depot ist anlegbar, und die drei Dokumente stehen',
      fn: (V) => {
        /* Ohne sie wäre „nichts passt" nicht davon zu unterscheiden, dass die
           Persona gar nicht erst entsteht. */
        const d = V.getData();
        assert.equal(d.sektoren.identity.givenName, 'Ingrid');
        const typen = (d.dokumente || []).map((x) => x.typ).sort();
        assert.deepEqual(typen, ['enduring-power-of-attorney', 'living-will', 'will']);
      } },

    { name: 'DIE REGISTER stehen im Freitext, weil sie keinen Ort haben',
      fn: (V) => {
        const notiz = String(V.getData().sektoren.identity.furtherDetails || '');
        assert.match(notiz, /ÖZVV/, 'das ÖZVV steht da — als Freitext, nicht als Angabe');
        assert.match(notiz, /ÖZTR/);
        assert.ok(notiz.includes('§ 579 ABGB'),
          'die Drei-Zeugen-Regel steht im Freitext — sie ist eine Rechtsfolge und kein Text, '
          + 'und genau darum ist ein Wortlaut-Modul hier zu wenig');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT, baueDepot, pruefungen, UNTERLAGEN_OHNE_FELD,
  SV_NUMMER, INSTRUMENTE_AT, MENSCHEN, INSTITUTIONEN };
