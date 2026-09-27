'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Vollmacht-Dokument-Generator (Auftrag Vollmacht/Betreuung-
   Generatoren, 01.08.2026) — Zug 2
   ────────────────────────────────────────────────────────────────────────
   Dritte Modul-Vertrag-Instanz (nach PV/KI), erste zeilenscharfe
   (mehrfach:true — mehrere Vollmacht-Datensätze möglich).

   PFLICHT-ERGÄNZUNG (SP, Zug-1-Nachtrag): automatisierte Prüfung, dass
   JEDER Textbaustein, den der Generator in ein Dokument setzen KANN, eine
   exakte Teilzeichenkette von STANDARD_VORLAGEN['vorsorgevollmacht'].
   wortlaut ist — dem bereits signierten Wortlaut (U2-ADR-040), aus dem
   VOLLMACHT_BMJ/VOLLMACHT_MODUL laut Architektur-Entscheidung extrahiert
   wurden (keine unabhängige Zweitabschrift vom PDF). Nicht von Auge
   geprüft — genau diese Fehlerklasse ist im Projekt bereits mehrfach
   aufgetreten (Regel „übernommen ist nicht gemessen").

   Die Prüfung geht über eine wörtliche „steps[]"-Lesart hinaus: sie läuft
   über JEDEN Text, den VOLLMACHT_MODUL tatsächlich in ein Dokument setzen
   kann — auswahlFest-Blocktexte, mehrfachauswahl-Optionen/Einleitung/
   Abschluss, den freitextSatz-Rahmensatz und die festen Eingangsformel-
   Absätze. Das deckt den echten Umfang der Zusicherung, nicht nur den
   Namen der Datenstruktur.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Alle Fest-Texte, die VOLLMACHT_MODUL.abschnitte tatsächlich in ein Dokument setzen kann.
function alleModulTexte(modul) {
  const texte = [];
  for (const abschnitt of modul.abschnitte) {
    if (abschnitt.eingangsformel) continue;   // eigene Prüfung unten (personenbezogene Platzhalter)
    for (const blk of abschnitt.bloecke) {
      if (blk.typ === 'auswahlFest' || blk.typ === 'auswahlPaar') texte.push(blk.text);
      else if (blk.typ === 'mehrfachauswahl') {
        if (blk.einleitung) texte.push(blk.einleitung);
        if (blk.abschluss) texte.push(blk.abschluss);
      } else if (blk.typ === 'auswahlPaarGruppe') {
        // „Nachlese F8/M1" (11.08.2026): wie mehrfachauswahl (Einleitung/Abschluss),
        // plus je Punkt sein eigener Fragment-Text (ersetzt hier vm_gesundheit_freiheitsentzug).
        if (blk.einleitung) texte.push(blk.einleitung);
        if (blk.abschluss) texte.push(blk.abschluss);
        for (const p of blk.punkte) texte.push(p.text);
      } else if (blk.typ === 'freitextSatz') {
        // Rahmensatz ohne den {text}-Platzhalter selbst prüfen (Nutzereingabe, kein amtlicher Text).
        texte.push(blk.satz.replace('{text}', '').replace(/\s+$/, ''));
      }
      // freitext (reine Nutzereingabe) trägt keinen amtlichen Text — nichts zu prüfen.
    }
  }
  return texte;
}

// Optionen-Labels aus VOLLMACHT_BMJ.steps, wo sie tatsächlich für die Dokument-Erzeugung gebraucht
// werden (mehrfachauswahl — optLabel wird dort aufgerufen; die reinen ja/nein-Wizard-Labels der
// auswahlFest-Felder sind KEIN amtlicher Text, s. Kommentar bei VOLLMACHT_BMJ).
function mehrfachauswahlOptionsTexte(bmj) {
  const texte = [];
  for (const step of bmj.steps) {
    if (step.feld.typ === 'mehrfachauswahl') {
      for (const o of step.feld.optionen) texte.push(o.label);
    }
  }
  return texte;
}

test('[Vollmacht·Konsistenz] JEDER auswahlPaar/mehrfachauswahl/freitextSatz-Text ist eine exakte Teilzeichenkette des signierten Wortlauts', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'vorsorgevollmacht').wortlaut;
  const texte = alleModulTexte(V.VOLLMACHT_MODUL).concat(mehrfachauswahlOptionsTexte(V.VOLLMACHT_BMJ));
  assert.ok(texte.length >= 20, 'Vorbedingung: genug Bausteine gesammelt, sonst prüft der Test nichts');
  const fehlend = texte.filter(t => !wortlaut.includes(t));
  assert.deepEqual(fehlend, [], 'jeder Textbaustein muss wörtlich im signierten Wortlaut stehen');
});

test('[Vollmacht·Konsistenz] die festen Eingangsformel-Absätze sind exakte Teilzeichenketten des Wortlauts', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'vorsorgevollmacht').wortlaut;
  const fixiert = [
    'Ich, (Vollmachtgeber/in)',
    'erteile hiermit Vollmacht an (bevollmächtigte Person)',
    'Diese Vertrauensperson wird hiermit bevollmächtigt, mich in allen Angelegenheiten zu vertreten, die ich im Folgenden angekreuzt oder angegeben habe. Durch diese Vollmachtserteilung soll eine vom Gericht angeordnete Betreuung vermieden werden. Die Vollmacht bleibt daher in Kraft, wenn ich nach ihrer Errichtung geschäftsunfähig geworden sein sollte.',
    'Die Vollmacht ist nur wirksam, solange die bevollmächtigte Person die Vollmachtsurkunde besitzt und bei Vornahme eines Rechtsgeschäfts die Urkunde im Original vorlegen kann.',
  ];
  const fehlend = fixiert.filter(t => !wortlaut.includes(t));
  assert.deepEqual(fehlend, []);
});

// „Nachlese F8/M1" (11.08.2026): vm_gesundheit_freiheitsentzug (EIN mehrfachauswahl-
// Feld mit vier Optionen) ist vier eigene ☐ja/☐nein-Felder geworden — die frühere Prüfung „die
// vier Options-Labels des einen Schema-Felds stehen im Wortlaut" hat kein Gegenstück mehr (jedes
// der vier neuen Schema-Felder trägt nur noch ja/nein als Optionen, keinen amtlichen Fließtext —
// derselbe, bereits etablierte Musterfall wie bei den anderen 19 Ja/Nein-Feldern, deren kurze
// UI-Labels ebenfalls keine Wortlaut-Teilzeichenketten sind). Der amtliche Text der vier Punkte
// selbst bleibt geprüft — über die auswahlPaarGruppe-Punkte in der ersten Konsistenz-Probe oben.
test('[Vollmacht·Konsistenz] die vier neuen Freiheitsentzug-Felder sind auswahl (ja/nein), keine mehrfachauswahl mehr', () => {
  const { V } = ladeKern();
  for (const fid of ['healthCarePlacementDepriving', 'healthCareMeasuresDepriving',
    'healthCareCompulsoryMedical', 'healthCareAdmissionToHospital']) {
    const feld = V.feldDefFuer('advanceCare', 'liste:vorsorge_instrumente:enduring-power-of-attorney:' + fid)
      || V._listenUnterfeldDef('advanceCare', 'provisionInstruments', fid);
    assert.ok(feld, fid + ' fehlt im Schema');
    assert.equal(feld.typ, 'auswahl', fid + ' muss auswahl sein (ja/nein unterscheidbar von unset)');
    assert.deepEqual(feld.optionen.map((o) => o.wert), ['ja', 'nein']);
  }
});

test('[Vollmacht·1] nur aktiv gewählte Bausteine erscheinen — nichts vorausgewählt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-leer', instrument: 'enduring-power-of-attorney' },   // gar nichts gewählt
  ] };
  V.setData(d);
  const abschnitte = V.vollmachtDokumentAbschnitte('vm-leer');
  // Nur der Kopf (Eingangsformel) bleibt — jeder inhaltliche Abschnitt ist leer und fällt weg.
  assert.equal(abschnitte.length, 1);
  assert.equal(abschnitte[0].titel, '');
});

test('[Vollmacht·2] F8 Zug3: ja- UND nein-Felder erscheinen, mit dem jeweils angekreuzten Kästchen — nur UNGESETZTE Felder bleiben unsichtbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', healthCareGeneralDecision: 'ja', healthCareMedicalProcedures: 'nein' },
    // healthCareMedicalRecords (ehem. vm_gesundheit_schweigepflicht) bleibt UNGESETZT
  ] };
  V.setData(d);
  const abschnitte = V.vollmachtDokumentAbschnitte('vm-1');
  const alleZeilen = abschnitte.flatMap(a => a.zeilen);
  const jaZeile = alleZeilen.find(z => z.startsWith('Sie darf in allen Angelegenheiten der Gesundheitssorge entscheiden'));
  const neinZeile = alleZeilen.find(z => z.startsWith('Sie darf insbesondere in eine Untersuchung des Gesundheitszustands'));
  assert.ok(jaZeile, 'ja-Feld erscheint');
  assert.ok(neinZeile, 'F8 Zug3: nein-Feld erscheint jetzt auch (bisher: unsichtbar wie ungesetzt)');
  assert.match(jaZeile, /☒ ja  ☐ nein$/);
  assert.match(neinZeile, /☐ ja  ☒ nein$/);
  assert.ok(!alleZeilen.some(z => z.startsWith('Sie darf Krankenunterlagen einsehen')), 'ungesetztes Feld bleibt unsichtbar wie zuvor');
});

test('[Vollmacht·12] F8 Zug2: Hinweis 1/2 erscheint, sobald einer der drei verweisenden Vermögenssorge-Punkte gesetzt ist', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', disposeOfAssets: 'ja' },
  ] };
  V.setData(d);
  const zeilen = V.vollmachtDokumentAbschnitte('vm-1').flatMap(a => a.zeilen);
  assert.ok(zeilen.some(z => z.startsWith('Hinweis:')));
  assert.ok(zeilen.some(z => z.includes('1. Denken Sie an die erforderliche Form der Vollmacht bei Immobiliengeschäften')));
  assert.ok(zeilen.some(z => z.includes('2. Für die Vermögenssorge in Bankangelegenheiten')));
});

test('[Vollmacht·13] F8 Zug2: Hinweis 1/2 erscheint NICHT, wenn keiner der drei verweisenden Punkte gesetzt ist', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', acceptPaymentsAndValuables: 'ja' },   // referenziert KEINEN Hinweis
  ] };
  V.setData(d);
  const zeilen = V.vollmachtDokumentAbschnitte('vm-1').flatMap(a => a.zeilen);
  assert.ok(!zeilen.some(z => z.startsWith('Hinweis:')));
});

test('[Vollmacht·3] auswahlPaarGruppe — Einleitung + gewählte Punkte (je mit ja/nein-Kästchen) + Schlusswort, nur bei mindestens einer Wahl', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    // „Nachlese F8/M1" (11.08.2026): vier eigene Felder statt eines mehrfachauswahl-
    // Arrays — 'nein' MUSS jetzt genauso sichtbar werden wie 'ja' (F8 Zug3s Maßstab).
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', healthCarePlacementDepriving: 'ja', healthCareCompulsoryMedical: 'nein' },
    { id: 'vm-2', instrument: 'enduring-power-of-attorney' },   // nichts gewählt
  ] };
  V.setData(d);
  const mitWahl = V.vollmachtDokumentAbschnitte('vm-1').flatMap(a => a.zeilen);
  assert.ok(mitWahl.includes('Solange es erforderlich ist, darf sie'));
  assert.ok(mitWahl.includes('entscheiden.'));
  const jaZeile = mitWahl.find((z) => z.includes('freiheitsentziehende Unterbringung'));
  const neinZeile = mitWahl.find((z) => z.includes('ärztliche Zwangsmaßnahmen'));
  assert.ok(jaZeile, 'ja-Punkt erscheint');
  assert.ok(neinZeile, 'nein-Punkt erscheint — der eigentliche Punkt dieses Zugs');
  assert.match(jaZeile, /☒ ja  ☐ nein$/);
  assert.match(neinZeile, /☐ ja  ☒ nein$/);
  assert.ok(!mitWahl.some((z) => z.includes('einem Heim oder in einer sonstigen Einrichtung')), 'ungesetzter Punkt bleibt unsichtbar');

  const ohneWahl = V.vollmachtDokumentAbschnitte('vm-2').flatMap(a => a.zeilen);
  assert.ok(!ohneWahl.includes('Solange es erforderlich ist, darf sie'), 'ohne Wahl erscheint auch die Einleitung nicht');
  assert.ok(!ohneWahl.includes('entscheiden.'), 'ohne Wahl erscheint auch das Schlusswort nicht');
});

test('[Vollmacht·4] zeilenscharf — zwei Vollmacht-Datensätze erzeugen unabhängige Dokumente, kein Bleed-Through', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-gesundheit', instrument: 'enduring-power-of-attorney', healthCareGeneralDecision: 'ja' },
    { id: 'vm-vermoegen', instrument: 'enduring-power-of-attorney', assetManagementGeneral: 'ja' },
  ] };
  V.setData(d);
  const gesundheit = V.vollmachtDokumentAbschnitte('vm-gesundheit').flatMap(a => a.zeilen).join(' | ');
  const vermoegen = V.vollmachtDokumentAbschnitte('vm-vermoegen').flatMap(a => a.zeilen).join(' | ');
  assert.match(gesundheit, /Angelegenheiten der Gesundheitssorge/);
  assert.doesNotMatch(gesundheit, /Vermögen verwalten/);
  assert.match(vermoegen, /Vermögen verwalten/);
  assert.doesNotMatch(vermoegen, /Angelegenheiten der Gesundheitssorge/);
});

test('[Vollmacht·5] Freitext-Ausschluss (§4) und Weitere Regelungen (§10) werden übernommen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney',
      transactionsExpresslyExcluded: 'Verkauf der selbstbewohnten Immobilie',
      furtherProvisions: 'Jährliche Rechenschaftslegung gegenüber meiner Tochter.' },
  ] };
  V.setData(d);
  const zeilen = V.vollmachtDokumentAbschnitte('vm-1').flatMap(a => a.zeilen);
  assert.ok(zeilen.some(z => z === 'Folgende Geschäfte soll sie nicht wahrnehmen können: Verkauf der selbstbewohnten Immobilie'));
  assert.ok(zeilen.includes('Jährliche Rechenschaftslegung gegenüber meiner Tochter.'));
});

test('[Vollmacht·6] Bevollmächtigte-Person-Name erscheint in der Eingangsformel, wenn eingetragen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personSicherstellen('Max Mustermann');
  const d = V.getData();
  const person = d.menschen.find(p => p.name === 'Max Mustermann');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: person.id }] },
  ] };
  V.setData(d);
  const kopf = V.vollmachtDokumentAbschnitte('vm-1')[0].zeilen.join('\n');
  assert.match(kopf, /Max Mustermann/);
});

test('[Vollmacht·10] F8 Zug1: eigene Partei UND Bevollmächtigte(r) zeigen volle Personalie in der Eingangsformel', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Max Mustermann', birthDate: '1970-05-01', birthPlace: 'Köln',
    adresse: 'Musterweg 1, 50667 Köln', tel: '0221 123456', email: 'max@beispiel.example' });
  const d = V.getData();
  const person = d.menschen.find(p => p.name === 'Max Mustermann');
  d.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
    birthPlace: 'Augsburg', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München',
    telephone: '089 87654321', email: 'elisabeth@beispiel.example' };
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: person.id }] },
  ] };
  V.setData(d);
  const kopf = V.vollmachtDokumentAbschnitte('vm-1')[0].zeilen.join('\n');
  assert.match(kopf, /Elisabeth Beispiel, geboren am 14\.03\.1958 in Augsburg, wohnhaft in Lindenweg 4, 80331 München, 089 87654321, elisabeth@beispiel\.example/);
  assert.match(kopf, /Max Mustermann, geboren am 01\.05\.1970 in Köln, wohnhaft in Musterweg 1, 50667 Köln, 0221 123456, max@beispiel\.example/);
});

test('[Vollmacht·11] F8 Zug1 Kern-Gate: fehlt Name/Geburtsdatum der eigenen Partei, öffnet vollmachtDokumentOeffnen kein Blatt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel' };   // kein Geburtsdatum
  d.sektoren.advanceCare = { provisionInstruments: [ { id: 'vm-1', instrument: 'enduring-power-of-attorney', representationInCourt: 'ja' } ] };
  V.setData(d);
  assert.equal(V.vollmachtDokumentOeffnen('vm-1'), 'identitaet-unvollstaendig');

  const d2 = V.getData();
  d2.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14' };
  V.setData(d2);
  assert.notEqual(V.vollmachtDokumentOeffnen('vm-1'), 'identitaet-unvollstaendig');
});

test('[Vollmacht·14] F8 Zug4: vertretungsModus "nacheinander" erscheint als Satz in der Eingangsformel, bei ≥2 Bevollmächtigten', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Erste Person' });
  V.personHinzufuegen({ name: 'Zweite Person' });
  const d = V.getData();
  const p1 = d.menschen.find(p => p.name === 'Erste Person');
  const p2 = d.menschen.find(p => p.name === 'Zweite Person');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: p1.id }, { ref: p2.id }], howDoThePeopleRepresentYou: 'nacheinander' },
  ] };
  V.setData(d);
  const kopf = V.vollmachtDokumentAbschnitte('vm-1')[0].zeilen.join('\n');
  assert.match(kopf, /nacheinander/);
  assert.match(kopf, /Reihenfolge/);
});

test('[Vollmacht·15] F8 Zug4: vertretungsModus "gleichwertig" — anderer Satz, unterscheidbar von "nacheinander"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Erste Person' });
  V.personHinzufuegen({ name: 'Zweite Person' });
  const d = V.getData();
  const p1 = d.menschen.find(p => p.name === 'Erste Person');
  const p2 = d.menschen.find(p => p.name === 'Zweite Person');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: p1.id }, { ref: p2.id }], howDoThePeopleRepresentYou: 'gleichwertig' },
  ] };
  V.setData(d);
  const kopf = V.vollmachtDokumentAbschnitte('vm-1')[0].zeilen.join('\n');
  assert.match(kopf, /gleichwertig/);
  assert.doesNotMatch(kopf, /Reihenfolge/);
});

test('[Vollmacht·16] F8 Zug4: ohne vertretungsModus-Wert oder bei nur einer Person erscheint kein Vertretungs-Satz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.personHinzufuegen({ name: 'Erste Person' });
  const d = V.getData();
  const p1 = d.menschen.find(p => p.name === 'Erste Person');
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: p1.id }] },   // nur 1 Person, kein vertretungsModus
  ] };
  V.setData(d);
  const kopf = V.vollmachtDokumentAbschnitte('vm-1')[0].zeilen.join('\n');
  assert.doesNotMatch(kopf, /gleichwertig/);
  assert.doesNotMatch(kopf, /nacheinander/);
});

test('[Vollmacht·7] UI-Knopf erscheint nur bei tatsächlichen Angaben (_vmZeileHatDaten), zeilenscharf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'vm-leer', instrument: 'enduring-power-of-attorney' },
    { id: 'vm-voll', instrument: 'enduring-power-of-attorney', appliesBeyondDeath: 'ja' },
  ] };
  V.setData(d);
  assert.equal(V._vmZeileHatDaten('vm-leer'), false);
  assert.equal(V._vmZeileHatDaten('vm-voll'), true);
});

test('[Vollmacht·8] die Engine-Erweiterung ist abwärtskompatibel — PV/KI unverändert (kein zeilenId nötig)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.pv_situationen = ['sterbeprozess'];
  V.setData(d);
  assert.doesNotThrow(() => V.pvDokumentAbschnitte());
  const pv = V.pvDokumentAbschnitte();
  assert.ok(pv.length > 0, 'PV-Generator liefert weiterhin Abschnitte, unverändert durch die Vollmacht-Erweiterung');
});

test('[Vollmacht·9] Registry-Herkunft konsistent — vorsorgevollmacht ist jetzt "amtlich" auch auf der Karte', () => {
  const { V } = ladeKern();
  const modul = V.VORSORGE_MODUL_BY_ID['vorsorgevollmacht'];
  assert.equal(modul.herkunft, 'amtlich');
  // K4 Zug 4 (10.08.2026): die Kachel zeigt seither STRINGS.amtlicherWortlautBadge, nicht mehr
  // den rohen Registry-Wert — "amtlich" allein klang für die Bürgerin nach amtlichem DOKUMENT,
  // dabei ist nur der Wortlaut amtlich (§ 1827 BGB fordert für die PV ohnehin Schriftform,
  // kein amtliches Formular). Der Registry-Wert selbst (Zeile darüber) bleibt 'amtlich' — das
  // ist die Sache, nicht das Etikett.
  assert.equal(V.modulKarteHerkunft(modul), V.STRINGS.amtlicherWortlautBadge);
  assert.equal(modul.generator, V.VOLLMACHT_MODUL);
});

/* ════════════════════════════════════════════════════════════════════════
   F8 Zug5 — die dauerhafte Probe (Auftrag: "ein Test, der jeden Verweis auf
   einen Baustein im Wortlaut gegen die tatsächlich ausgegebenen Bausteine
   prüft"). Genau diese Fehlerklasse hat "Hinweis 1"/"Hinweis 2" entkommen
   lassen: der Wortlaut verweist per Text auf einen Baustein, den kein Modul-
   Block je ausgegeben hat — die bestehenden Konsistenz-Tests prüfen nur die
   GEGENRICHTUNG (jeder Baustein-Text ⊆ Wortlaut), nicht diese.

   Prüft NICHT "Hinweis 1/2" hart codiert, sondern generisch: jede Zahl N in
   "nachfolgenden Hinweis N" im signierten Wortlaut braucht einen Block-Text,
   der als eigener Hinweis-Baustein "N. " trägt. Ein künftiger "Hinweis 3" im
   Wortlaut, dem kein Baustein folgt, macht diese Probe rot. */
function referenzierteHinweisNummern(wortlaut) {
  const re = /nachfolgenden Hinweis (\d+)/g;
  const nums = new Set();
  let m;
  while ((m = re.exec(wortlaut))) nums.add(m[1]);
  return nums;
}
function ausgegebeneHinweisNummern(modul) {
  const nums = new Set();
  for (const abschnitt of modul.abschnitte) {
    if (abschnitt.eingangsformel) continue;
    for (const blk of abschnitt.bloecke) {
      const text = blk.text || '';
      if (!text.startsWith('Hinweis:')) continue;
      const re = /\n\n(\d+)\. /g;
      let m;
      while ((m = re.exec(text))) nums.add(m[1]);
    }
  }
  return nums;
}

test('[Vollmacht·Zug5] jede im Wortlaut referenzierte Hinweis-Nummer hat einen tatsächlich ausgegebenen Baustein', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'vorsorgevollmacht').wortlaut;
  const referenziert = referenzierteHinweisNummern(wortlaut);
  assert.ok(referenziert.size >= 1, 'Vorbedingung: der Wortlaut referenziert mindestens einen Hinweis, sonst prüft der Test nichts');
  const ausgegeben = ausgegebeneHinweisNummern(V.VOLLMACHT_MODUL);
  const fehlend = [...referenziert].filter(n => !ausgegeben.has(n));
  assert.deepEqual(fehlend, [], 'diese im Wortlaut referenzierten Hinweis-Nummern haben KEINEN ausgegebenen Baustein: ' + fehlend.join(', '));
});

test('[Vollmacht·Zug5·Gegenprobe] ohne den Hinweis-Baustein wird die Probe tatsächlich rot (kein stummer Wächter)', () => {
  const { V } = ladeKern();
  const wortlaut = V.STANDARD_VORLAGEN.find(x => x.id === 'vorsorgevollmacht').wortlaut;
  const referenziert = referenzierteHinweisNummern(wortlaut);
  // Simuliert den Zustand VOR F8 Zug2: ein Modul ganz ohne Hinweis-Baustein.
  const modulOhneHinweis = { abschnitte: V.VOLLMACHT_MODUL.abschnitte.map(a => ({
    ...a, bloecke: (a.bloecke || []).filter(b => !(b.text || '').startsWith('Hinweis:')),
  })) };
  const ausgegeben = ausgegebeneHinweisNummern(modulOhneHinweis);
  const fehlend = [...referenziert].filter(n => !ausgegeben.has(n));
  assert.ok(fehlend.length > 0, 'Gate-Nachweis: ohne den Baustein muss die Probe etwas Fehlendes finden');
});
