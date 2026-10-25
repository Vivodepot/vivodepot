'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Glied 7 · Die Form eines Format-Kanals — Beschreibung, niemals Code
   ────────────────────────────────────────────────────────────────────────
   Der Befund aus A272: streng 0 von 17 Import-Kanälen sind Konfiguration,
   weit 4, dazu 2 ohne Erkenner. Grund ist keine Lücke, sondern eine
   Nicht-Begegnung — die Kanäle mit Tabelle haben keinen Erkenner in
   Datenform, die mit Erkenner keine Tabelle.

   Die Rot-Belege, die der Auftrag verlangt:
   ein Format-Modul AUS EINER DATEI liest ein Dokument ein, das der
   eingebaute Satz NICHT kennt · und eine Probe wird ROT, wenn ein Modul
   ausführbaren Code einschleusen könnte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

// Die Beschreibung eines externen PID-Nachweises, den der eingebaute Satz NICHT kennt:
// fremder Namensraum (`urn:beispiel:pid`), fremder Umschlag (`nachweis`), fremde Claim-Namen.
const FREMDER_KANAL = {
  modulTyp: 'format', sprache: 'de', moduleVersion: 1,
  format: 'pid-fremd', richtung: 'import', sektor: 'identity',
  label: 'Ein Personalausweis-Nachweis einer fremden Stelle',
  akzeptiert: '.json,application/json',
  leser: 'json', quelle: 'nachweis',
  erkennen: [{ pfad: 'doctype', gleich: 'urn:beispiel:pid' }, { pfad: 'nachweis', istObjekt: true }],
  zuordnung: [
    { feld: 'givenName', ziel: 'vn' },
    { feld: 'familyName', ziel: 'nn' },
    { feld: 'birthDate', ziel: 'geb.datum' },
  ],
};
const FREMDES_DOKUMENT = JSON.stringify({
  doctype: 'urn:beispiel:pid',
  nachweis: { vn: 'Mira', nn: 'Sandoval', geb: { datum: '1984-03-07' } },
});

/* ══ Die Vorbedingung: der eingebaute Satz kennt dieses Dokument NICHT ══ */

test('[Glied 7·Vorbedingung] der eingebaute Satz erkennt das fremde Dokument nicht — sonst bewiese der Rot-Beleg nichts', () => {
  const V = frisch();
  assert.equal(V.importFormatErkennen(FREMDES_DOKUMENT, 'identity'), null,
    'kein eingebauter Kanal beansprucht dieses Dokument');
});

/* ══ Rot-Beleg 1 · ein Modul AUS EINER DATEI liest ein fremdes Dokument ══ */

test('[Glied 7·Rot 1] ein eingelassenes Format-Modul erkennt und liest ein Dokument, das der Kern nicht kennt', () => {
  const V = frisch();
  // Der Rohtext einer Datei — derselbe Weg, den der Einlassknopf fährt (U2-ADR-145).
  const r = V.modulEinlassen(JSON.stringify(FREMDER_KANAL));
  assert.equal(r.angenommen, true, r.grund || '');
  assert.equal(r.typ, 'format');
  assert.equal(r.kennung, 'pid-fremd');
  assert.equal(r.ungeprueft, true, 'ein eingelassenes Modul zertifiziert niemanden');

  assert.equal(V.importFormatErkennen(FREMDES_DOKUMENT, 'identity'), 'pid-fremd',
    'jetzt beansprucht der eingelassene Kanal die Datei');

  const def = V.importFormatFuerId('pid-fremd');
  assert.ok(def, 'der Kanal ist über seine Kennung auffindbar');
  const plan = def.parse(FREMDES_DOKUMENT);
  assert.deepEqual(plan.felder, [
    { sektorId: 'identity', feldId: 'givenName', wert: 'Mira' },
    { sektorId: 'identity', feldId: 'familyName', wert: 'Sandoval' },
    { sektorId: 'identity', feldId: 'birthDate', wert: '1984-03-07' },
  ], 'die drei Felder kommen an — über einen verschachtelten Pfad und einen Umschlag');

  // Und er steht in der Bereichs-Liste, die der Import-Dialog anbietet.
  assert.ok(V.importFormateFuerSektor('identity').some(f => f.id === 'pid-fremd'),
    'der Kanal erscheint im Import-Dialog des Bereichs');
});

/* ══ Rot-Beleg 2 · ausführbarer Code kommt NICHT durch ══════════════════ */

test('[Glied 7·Rot 2] ein Modul mit einem Funktionswert wird verworfen — an JEDER Stelle des Baums', () => {
  const V = frisch();
  const stellen = [
    ['erkennen als Funktion', (m) => { m.erkennen = () => true; }],
    ['parse als Funktion', (m) => { m.parse = () => ({ felder: [] }); }],
    ['Funktion tief in der Zuordnung', (m) => { m.zuordnung[0].transform = (v) => v; }],
    ['Funktion tief im Erkenner', (m) => { m.erkennen[0].pruef = () => true; }],
    ['Leser als Funktion statt als Name', (m) => { m.leser = (t) => JSON.parse(t); }],
  ];
  for (const [was, kaputt] of stellen) {
    const m = JSON.parse(JSON.stringify(FREMDER_KANAL));
    kaputt(m);
    const g = V.formatModulPruefen(m);
    assert.equal(g.gueltig, false, was + ' muss verworfen werden');
    assert.ok(g.grund === 'kein-code-erlaubt' || g.grund === 'leser', was + ': Grund war ' + g.grund);
    // Und der Einlassweg lässt es ebenfalls nicht durch — ohne Spur im Depot.
    const r = V.modulEinlassen(m);
    assert.equal(r.angenommen, false, was + ' kommt auch über den Einlassweg nicht durch');
    assert.equal(V.getData().formatModule.length, 0, was + ' hinterlässt keine Spur');
  }
});

test('[Glied 7·Rot 2b] ein Modul, das über einen Pfad an die Prototypenkette will, wird verworfen', () => {
  const V = frisch();
  for (const pfad of ['__proto__', 'constructor.prototype', 'a.__proto__.b']) {
    const m = JSON.parse(JSON.stringify(FREMDER_KANAL));
    m.zuordnung[0].ziel = pfad;
    const g = V.formatModulPruefen(m);
    // Entweder der ganze Baum trägt einen verbotenen Schlüssel (dann: kein-code-erlaubt),
    // oder der Pfad wird als Zuordnungszeile verworfen. Beides ist ein Nein.
    if (g.gueltig) {
      assert.ok(!g.kanal.zuordnung.some(z => z.ziel === pfad), pfad + ' darf keine Zuordnung werden');
    }
  }
  // Und ein Dokument, das den Prototyp mitschickt, verändert nichts am Kanal.
  assert.equal(V.modulEinlassen(JSON.stringify(FREMDER_KANAL)).angenommen, true);
  const def = V.importFormatFuerId('pid-fremd');
  const plan = def.parse(JSON.stringify({ doctype: 'urn:beispiel:pid', nachweis: { vn: 'Mira', __proto__: { nn: 'geschmuggelt' } } }));
  assert.deepEqual(plan.felder, [{ sektorId: 'identity', feldId: 'givenName', wert: 'Mira' }],
    'nur der eigene Schlüssel kommt an');
});

test('[Glied 7·Rot 2c] der Leser wird NAMENTLICH gewählt — ein unbekannter Name verwirft das Modul', () => {
  const V = frisch();
  for (const name of ['eval', 'constructor', 'toString', 'xml-irgendwas', '']) {
    const m = JSON.parse(JSON.stringify(FREMDER_KANAL));
    m.leser = name;
    assert.equal(V.formatModulPruefen(m).gueltig, false, 'Leser „' + name + '" darf nicht gelten');
  }
  /* F1/B1/B2 (20.08.2026): die Tabelle ist gewachsen und ihre Kennungen tragen jetzt eine
     Version (U2-ADR-155). Sie bleibt eingebaut und abgeschlossen — das ist die Aussage dieser
     Zeile, nicht die Zahl zwei. */
  assert.deepEqual(Object.keys(V.FORMAT_LESER).sort(), ['csv@1', 'json@1', 'sd-jwt@1', 'vcard-erste@1', 'xml@1'],
    'die Leser-Tabelle ist eingebaut und abgeschlossen');
});

/* ══ Die vier weiten Fälle aus A272 — verlustfrei ausdrückbar ═══════════ */

test('[Glied 7] die Form drückt sd-jwt-vc-identitaet VERLUSTFREI aus — Feld für Feld gegen den eingebauten Kanal', () => {
  const V = frisch();
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): document_number/issuance_date/expiry_date
  // stehen absichtlich weiterhin in der Nutzlast (ein echter sd-jwt-vc-identitaet-Claim-Satz
  // trüge sie) — sie mappen aber nicht mehr zurück, seit VC_IDENTITAET_MAPPING die drei
  // ausweis_*-Zeilen verloren hat (Liste statt Skalar, dokumentierter Gap). Der eingebaute Kanal
  // liefert darum acht statt elf Tabellen-Felder plus zwei aus der Adresse.
  const dok = JSON.stringify({
    vct: 'urn:vivodepot:identitaet',
    claims: {
      given_name: 'Mira', family_name: 'Sandoval', birthdate: '1984-03-07',
      birth_family_name: 'Ortiz', birthplace: 'Bremen', nationalities: ['DE'],
      mobile_phone_number: '+49 170 1234567', email_address: 'mira@example.org',
      document_number: 'L01X00T47', issuance_date: '2020-01-02', expiry_date: '2030-01-01',
      address: { street_address: 'Kirchweg 4', locality: '28195 Bremen' },
    },
  });
  const eingebaut = V.IMPORT_FORMAT_BY_ID['sd-jwt-vc-identitaet'].parse(dok);
  // Eine Null wäre hier ein Fund, kein Ergebnis: ein leerer Vergleich bewiese die
  // Verlustfreiheit gegen nichts. Zehn Felder — acht aus der Tabelle, zwei aus der Adresse.
  assert.equal(eingebaut.felder.length, 10, 'Vorbedingung: der eingebaute Kanal liefert 10 Felder');

  const modul = {
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'sd-jwt-vc-identitaet-nachbau',
    richtung: 'import', sektor: 'identity', label: 'Nachbau als Beschreibung',
    leser: 'json', quelle: 'claims', quelleWurzelFallback: true,
    erkennen: [{ pfad: 'vct', gleich: 'urn:vivodepot:identitaet' }],
    // U2-ADR-482: die Staatsangehörigkeit (die Zeile mit `ausRohwert`) ist ein Rechtsraum-Codefeld — `codeliste: true`, sonst
    // läse der Nachbau den Code als Freitext. Die übrigen Listen-Zeilen bleiben `alsListe`.
    zuordnung: V.VC_IDENTITAET_MAPPING.map(m => (
      m.ausRohwert ? { feld: m.feld, ziel: m.ziel, codeliste: true }
        : m.rueck ? { feld: m.feld, ziel: m.ziel, alsListe: true } : { feld: m.feld, ziel: m.ziel }
    )).concat([
      { feld: 'streetAddress', ziel: 'address.street_address' },
      { feld: 'postcodeCity', ziel: 'address.locality' },
    ]),
  };
  const kanal = V.formatModulZuImportKanal(modul);
  assert.ok(kanal, 'die Beschreibung trägt');
  assert.equal(kanal.erkennen(dok), true, 'der Erkenner greift über den `vct`-WERT, nicht über eine Wortsuche');
  assert.deepEqual(kanal.parse(dok).felder, eingebaut.felder,
    'dieselben Felder, dieselbe Reihenfolge, dieselben Werte wie der eingebaute Kanal');
});

test('[Glied 7] die beiden Kanäle OHNE Erkenner sind ausdrückbar — und beanspruchen keine Datei', () => {
  const V = frisch();
  const modul = {
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'xoev-nachbau', richtung: 'import',
    sektor: 'administration', label: 'XÖV-Nachbau ohne Erkenner', leser: 'json', quelle: 'datensatz',
    zuordnung: V.XOEV_VERWALTUNG_MAPPING.map(m => ({ feld: m.feld, ziel: m.ziel })),
  };
  const kanal = V.formatModulZuImportKanal(modul);
  assert.ok(kanal, 'ein Kanal ohne Erkenner ist zulässig — er wird von Hand gewählt');
  assert.equal(typeof kanal.erkennen, 'undefined', 'ohne Erkenner beansprucht er keine Datei');
  const ziel = V.XOEV_VERWALTUNG_MAPPING[0];
  const dok = JSON.stringify({ datensatz: { [ziel.ziel]: 'Musterwert' } });
  assert.equal(V.IMPORT_FORMAT_BY_ID['xoev-verwaltung'].parse(dok).felder.length, 1,
    'Vorbedingung: der eingebaute Kanal liest hier genau ein Feld — sonst verglichen wir zwei leere Listen');
  assert.deepEqual(kanal.parse(dok).felder,
    V.IMPORT_FORMAT_BY_ID['xoev-verwaltung'].parse(dok).felder,
    'derselbe Feld-Plan wie der eingebaute Kanal');
});

test('[Glied 7] ein Erkenner mit ZWEI Bedingungen trägt den EDCI-Fall — beide müssen zutreffen', () => {
  const V = frisch();
  const modul = {
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'edci-nachbau', richtung: 'import',
    sektor: 'education', label: 'EDCI-Nachbau', leser: 'json', quelle: 'learningAchievements',
    erkennen: [{ pfad: 'schemaVersion', gleich: 'edci-1.0-vivodepot' }, { pfad: 'learningAchievements', istObjekt: true }],
    zuordnung: V.EDCI_BILDUNG_MAPPING.map(m => ({ feld: m.feld, ziel: m.ziel })),
  };
  const kanal = V.formatModulZuImportKanal(modul);
  const gut = JSON.stringify({ schemaVersion: 'edci-1.0-vivodepot', learningAchievements: {} });
  assert.equal(kanal.erkennen(gut), true);
  assert.equal(kanal.erkennen(JSON.stringify({ schemaVersion: 'edci-1.0-vivodepot' })), false, 'zweite Bedingung fehlt');
  assert.equal(kanal.erkennen(JSON.stringify({ learningAchievements: {} })), false, 'erste Bedingung fehlt');
  assert.equal(kanal.erkennen('kein json'), false, 'ein unlesbares Dokument ist kein Treffer, kein Absturz');
});

/* ══ Reservierte Kennungen · Grenzen · Befund statt Absturz ═════════════ */

test('[Glied 7] eine eingebaute Format-Kennung ist reserviert — in BEIDEN Richtungen', () => {
  const V = frisch();
  for (const id of ['json', 'sd-jwt-vc-identitaet', 'fhir-ips', 'ics-vorsorge']) {
    const m = Object.assign({}, FREMDER_KANAL, { format: id });
    const g = V.formatModulPruefen(m);
    assert.equal(g.gueltig, false, id + ' ist reserviert');
    assert.equal(g.grund, 'reserviert');
  }
  // Und der eingebaute `json`-Kanal bleibt der, der ein Depot wiederherstellt.
  assert.equal(V.importFormatFuerId('json'), V.IMPORT_FORMAT_BY_ID['json']);
});

test('[Glied 7] ein Modul erfindet kein Feld und keinen Bereich', () => {
  const V = frisch();
  const fremderBereich = Object.assign({}, FREMDER_KANAL, { sektor: 'gibt-es-nicht' });
  assert.equal(V.formatModulPruefen(fremderBereich).grund, 'sektor');

  const fremdesFeld = JSON.parse(JSON.stringify(FREMDER_KANAL));
  fremdesFeld.zuordnung = [{ feld: 'gibt_es_nicht', ziel: 'x' }, { feld: 'givenName', ziel: 'vn' }];
  const g = V.formatModulPruefen(fremdesFeld);
  assert.equal(g.gueltig, true, 'die gültige Zeile trägt weiter');
  assert.deepEqual(g.kanal.zuordnung.map(z => z.feld), ['givenName'], 'die erfundene Zeile ist draußen');
  assert.ok(g.verworfene.some(v => v.feld === 'gibt_es_nicht' && v.grund === 'feld-unbekannt'),
    'sie wird NAMENTLICH ausgewiesen, nicht still geschluckt');
});

test('[Glied 7] ein kaputtes Modul ist ein Befund, kein Absturz — und hinterlässt keine Spur', () => {
  const V = frisch();
  for (const roh of ['', '{', 'null', '[]', '{"modulTyp":"format"}', JSON.stringify({ modulTyp: 'format', sprache: 'de', moduleVersion: 0, format: 'x' })]) {
    const r = V.modulEinlassen(roh);
    assert.equal(r.angenommen, false, 'kein Modul: ' + roh);
    assert.ok(typeof r.grund === 'string' && r.grund, 'es gibt einen benennbaren Grund');
  }
  assert.equal(V.getData().formatModule.length, 0, 'nichts davon liegt im Depot');
});

/* ══ Die Exportseite — derselbe Schnitt ═════════════════════════════════ */

test('[Glied 7] dieselbe Beschreibung trägt die Exportseite — über denselben Motor', () => {
  const V = frisch();
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { givenName: 'Mira', familyName: 'Sandoval' });
  V.setData(d);

  const modul = {
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'pid-fremd-export', richtung: 'export',
    sektor: 'identity', label: 'Ausgabe für eine fremde Stelle', leser: 'json', quelle: 'nachweis',
    zuordnung: [{ feld: 'givenName', ziel: 'vn' }, { feld: 'familyName', ziel: 'nn' }],
  };
  const r = V.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, r.grund || '');
  const kanal = V.exportFormatFuerId('pid-fremd-export');
  assert.ok(kanal, 'der Export-Kanal ist über seine Kennung auffindbar');
  assert.deepEqual(JSON.parse(kanal.baue({ sensibel: false })), { nachweis: { vn: 'Mira', nn: 'Sandoval' } },
    'die Zuordnung läuft in beide Richtungen über dieselbe Tabelle');
  // Und der Import-Kanal desselben Depots bleibt davon unberührt.
  assert.equal(V.importFormatFuerId('pid-fremd-export'), undefined, 'eine Export-Beschreibung ist kein Import-Kanal');
});

/* DIE GRENZE IST AM 21.08.2026 GEFALLEN, und dieser Wächter hat sie gehalten, bis sie fiel.
   Er verlangte bis dahin, dass ein verschachteltes Export-Ziel BENANNT verworfen wird
   (`export-ziel-verschachtelt`) — richtig, solange `baueAusMapping` nur eine flache Ebene
   schreiben konnte: ein Punkt im Ziel wäre dort zu einem SCHLÜSSEL MIT PUNKT geworden, und das
   Modul hätte ausgesehen, als sei es angekommen.

   Seit dem Auftrag „Verschachtelte Exportziele" trägt der Schreibweg (`_formatPfadSchreiben`),
   und die Abweisung ist ersatzlos fort. Die Probe wird darum UMGEDREHT, nicht gelöscht: sie
   hält jetzt fest, dass beide Ziele ankommen — und dass die FORM des Pfades weiterhin geprüft
   wird. Eine gelöschte Probe hätte den Weg schweigend geöffnet. */
test('[Glied 7] ein verschachteltes Ziel kommt auf der Exportseite an — die Grenze ist gefallen', () => {
  const V = frisch();
  const modul = {
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'export-verschachtelt', richtung: 'export',
    sektor: 'identity', label: 'Grenze', leser: 'json',
    zuordnung: [{ feld: 'givenName', ziel: 'a.b' }, { feld: 'familyName', ziel: 'nn' }],
  };
  const g = V.formatModulPruefen(modul);
  assert.ok(!g.verworfene.some(v => v.grund === 'export-ziel-verschachtelt'),
    'das verschachtelte Ziel wird noch verworfen — dann ist der Bau zurückgerollt');
  assert.deepEqual(g.kanal.zuordnung.map(z => z.ziel), ['a.b', 'nn'], 'beide Ziele stehen im Kanal');
});

test('[Glied 7] die FORM des Pfades wird weiter geprüft — ein verbotenes Teilstück fällt durch', () => {
  /* Die Grenze ist gefallen, die Formprüfung nicht: `_formatPfadTeile` verwirft ein leeres
     Teilstück und `__proto__`/`constructor`/`prototype`. */
  const V = frisch();
  const g = V.formatModulPruefen({
    modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'export-boeser-pfad', richtung: 'export',
    sektor: 'identity', label: 'Pfad', leser: 'json',
    zuordnung: [{ feld: 'givenName', ziel: '__proto__.x' }, { feld: 'familyName', ziel: 'nn' }],
  });
  assert.deepEqual(g.kanal.zuordnung.map(z => z.ziel), ['nn'], 'der verbotene Pfad kommt nicht durch');
});

/* ══ Aktualisieren statt Einfrieren — wie bei Textsatz und Rechtsraum ═══ */

test('[Glied 7] ein Modul desselben Formats ersetzt den Bestand nur bei höherer moduleVersion', () => {
  const V = frisch();
  V.modulEinlassen(JSON.stringify(FREMDER_KANAL));
  const v1 = Object.assign({}, FREMDER_KANAL, { moduleVersion: 1, sprache: 'de', label: 'alt' });
  const v2 = Object.assign({}, FREMDER_KANAL, { moduleVersion: 2, sprache: 'de', label: 'neu' });
  V.modulEinlassen(JSON.stringify(v1));
  assert.equal(V.getData().formatModule.length, 1, 'kein zweiter Eintrag derselben Kennung');
  assert.equal(V.getData().formatModule[0].label, FREMDER_KANAL.label, 'gleiche Version ersetzt nicht');
  V.modulEinlassen(JSON.stringify(v2));
  assert.equal(V.getData().formatModule[0].label, 'neu', 'höhere Version ersetzt');
});

test('[Glied 7] die Marke reist am Modul mit — der eingelassene Kanal steht im sichtbaren Hinweis', () => {
  const V = frisch();
  V.modulEinlassen(JSON.stringify(FREMDER_KANAL));
  const offen = V.eingelasseneModule();
  assert.ok(offen.some(m => m.typ === 'format' && m.kennung === 'pid-fremd'),
    'das vierte Register wird vom EINEN Hinweis mitgezählt, ohne eigenen Weg');
});

/* ══ U2-ADR-482 (06.10.2026, Wort der Gegenlesung, Variante A) · `codeliste: true` — ein Rechtsraum-Codefeld in einer Beschreibung ══
   Das Modul nennt nur das Merkmal; die Abbildung ist DIESELBE wie die des eingebauten PID-Kanals (staatsangehoerigkeitAusPid /
   staatsangehoerigkeitFuerPid), keine zweite. Alle oder keine, kein Raten. Ein einlesendes Modul, das ein Codefeld ohne
   `codeliste` zuordnet, wird verworfen — sonst schriebe es den Text des Dokuments als Freitext in das Feld. */
const fsCl = require('node:fs');
const pathCl = require('node:path');
const KERN_CL = fsCl.readFileSync(pathCl.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZCL = ['_rechtsraumCodefeldAbbildung', 'staatsangehoerigkeitAusPid', 'staatsangehoerigkeitFuerPid', 'rechtsraumFeldBindung'];
const LCL = 'destatis-staatsangehoerigkeit';
const pidImport = (zeile) => ({
  modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'pid-codeliste', richtung: 'import', sektor: 'identity',
  label: 'PID mit Staatsangehörigkeit', leser: 'json', quelle: 'claims',
  zuordnung: [{ feld: 'givenName', ziel: 'given_name' }, Object.assign({ feld: 'nationality', ziel: 'nationalities' }, zeile)],
});
const pidDok = (nat) => JSON.stringify({ claims: { given_name: 'Mira', nationalities: nat } });
function nationalitaetGelesen(V, nat, zeile) {
  const kanal = V.formatModulZuImportKanal(pidImport(zeile || { codeliste: true }));
  assert.ok(kanal, 'die Beschreibung trägt');
  const f = kanal.parse(pidDok(nat)).felder.find((x) => x.feldId === 'nationality');
  return f ? f.wert : undefined;
}
function codelisteFunde(V) {
  const funde = [];
  const fall = (name, nat, erwartet) => {
    const ist = nationalitaetGelesen(V, nat);
    if (JSON.stringify(ist) !== JSON.stringify(erwartet)) funde.push(name + ': ' + JSON.stringify(ist));
  };
  fall('bekannt', ['DE', 'TR'], [{ liste: LCL, code: '000' }, { liste: LCL, code: '163' }]);
  fall('unbekannter Wert', ['XX'], undefined);
  fall('Teilmenge', ['DE', 'XX'], undefined);
  fall('PID-Sonderwert', ['QS'], [{ liste: LCL, code: '997' }]);
  return funde;
}
test('[Glied 7·codeliste] Import über dieselbe Abbildung wie die PID: bekannt, unbekannt, Teilmenge, Sonderwert', () => {
  const { V } = ladeKern({ zusatzBindungen: ZCL });
  assert.ok(V.__zusatz.rechtsraumFeldBindung('identity.nationality'), 'Vorbedingung: die Zusammenstellung bindet die Liste');
  assert.deepEqual(codelisteFunde(V), []);
});
test('[Glied 7·codeliste·Rot-Beweis] ohne die Abbildung landete der PID-Code als Text im Feld — alle drei Fälle fielen', () => {
  const zeile = "  const mapping = k.zuordnung.map((z, i) => (z.codeliste ? { feld: z.feld, ziel: String(i), rueck: _rechtsraumCodefeldAbbildung(k.sektor + '.' + z.feld).aus }";
  assert.ok(KERN_CL.includes(zeile), 'Vorbedingung: die Zeile steht im Kern');
  const pfad = pathCl.join(require('node:os').tmpdir(), 'glied7-codeliste-rot-' + process.pid + '.html');
  fsCl.writeFileSync(pfad, KERN_CL.replace(zeile, "  const mapping = k.zuordnung.map((z, i) => (z.codeliste ? { feld: z.feld, ziel: String(i), alsListe: true }"));
  try {
    const { V } = ladeKern({ htmlPfad: pfad, backen: true, zusatzBindungen: ZCL });
    assert.deepEqual(codelisteFunde(V).map((f) => f.slice(0, f.indexOf(':'))), ['bekannt', 'unbekannter Wert', 'Teilmenge', 'PID-Sonderwert']);
  } finally { fsCl.rmSync(pfad, { force: true }); }
});
test('[Glied 7·codeliste] die Abbildung ist die des eingebauten Kanals — und jede Kennung aus RECHTSRAUM_CODEFELDER hat eine', () => {
  const { V } = ladeKern({ zusatzBindungen: ZCL });
  const abb = V.__zusatz._rechtsraumCodefeldAbbildung('identity.nationality');
  assert.equal(abb.aus, V.__zusatz.staatsangehoerigkeitAusPid);
  assert.equal(abb.fuer, V.__zusatz.staatsangehoerigkeitFuerPid);
  const nat = V.VC_IDENTITAET_MAPPING.find((m) => m.feld === 'nationality');
  assert.match(String(nat.rueck), /staatsangehoerigkeitAusPid/, 'der eingebaute Kanal nutzt dieselbe Funktion');
  const codefelder = JSON.parse(/const RECHTSRAUM_CODEFELDER = Object\.freeze\((\[[^\]]*\])\)/.exec(KERN_CL)[1].replace(/'/g, '"'));
  for (const k of codefelder) assert.ok(V.__zusatz._rechtsraumCodefeldAbbildung(k), k + ' ohne Abbildung');
  assert.equal(V.__zusatz._rechtsraumCodefeldAbbildung('identity.birthPlace'), null);
});
test('[Glied 7·codeliste] benannt verworfen: ohne Codefeld, falscher Wert, Kombination mit alsListe/werte', () => {
  const V = frisch();
  const grund = (zeile, richtung) => {
    const m = pidImport({}); m.zuordnung[1] = Object.assign({ ziel: 'x' }, zeile);
    if (richtung) m.richtung = richtung;
    return V.formatModulPruefen(m).verworfene.map((v) => v.grund);
  };
  assert.deepEqual(grund({ feld: 'birthPlace', codeliste: true }), ['codeliste-ohne-codefeld']);
  assert.deepEqual(grund({ feld: 'nationality', codeliste: 'ja' }), ['zuordnung-codeliste']);
  assert.deepEqual(grund({ feld: 'nationality', codeliste: true, alsListe: true }), ['zuordnung-codeliste-kombination']);
  assert.deepEqual(grund({ feld: 'nationality', codeliste: true, werte: { a: 'b' } }, 'export'), ['zuordnung-codeliste-kombination']);
});
test('[Glied 7·codeliste] ein einlesendes Modul, das das Codefeld OHNE codeliste zuordnet, wird verworfen — die Ausgabe darf es', () => {
  const V = frisch();
  for (const zeile of [{}, { alsListe: true }]) {
    const g = V.formatModulPruefen(pidImport(zeile));
    assert.ok(g.verworfene.some((v) => v.feld === 'nationality' && v.grund === 'codefeld-ohne-codeliste'), JSON.stringify(g.verworfene));
    assert.ok(!g.kanal.zuordnung.some((z) => z.feld === 'nationality'));
  }
  const aus = pidImport({}); aus.richtung = 'export';
  assert.ok(V.formatModulPruefen(aus).kanal.zuordnung.some((z) => z.feld === 'nationality'), 'Gegenprobe: die Ausgabe als Text bleibt erlaubt');
});
test('[Glied 7·codeliste·Rot-Beweis] ohne die Verschärfung schriebe ein Modul den Text „deutsch“ in das Codefeld', () => {
  const zeile = "    if (_cfAbb && z.codeliste !== true && richtung === 'import') { verworfene.push({ feld: z.feld, grund: 'codefeld-ohne-codeliste' }); continue; }\n";
  assert.ok(KERN_CL.includes(zeile), 'Vorbedingung: die Zeile steht im Kern');
  const pfad = pathCl.join(require('node:os').tmpdir(), 'glied7-codefeld-rot-' + process.pid + '.html');
  fsCl.writeFileSync(pfad, KERN_CL.replace(zeile, ''));
  try {
    const { V } = ladeKern({ htmlPfad: pfad, backen: true, zusatzBindungen: ZCL });
    assert.equal(nationalitaetGelesen(V, 'deutsch', {}), 'deutsch');
  } finally { fsCl.rmSync(pfad, { force: true }); }
});
test('[Glied 7·codeliste] die Ausgabe trägt dieselben Codes wie die PID — alle oder keine', () => {
  const V = frisch();
  const m = { modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'pid-codeliste-aus', richtung: 'export', sektor: 'identity',
    label: 'Ausgabe', leser: 'json', quelle: 'claims', zuordnung: [{ feld: 'givenName', ziel: 'given_name' }, { feld: 'nationality', ziel: 'nationalities', codeliste: true }] };
  const r = V.modulEinlassen(JSON.stringify(m));
  assert.equal(r.angenommen, true, r.grund || '');
  V.akteurSelbstErklaeren('Tester');
  const baue = (wert) => {
    V.sektorFeldSetzen('identity', 'givenName', 'Mira');
    V.sektorFeldSetzen('identity', 'nationality', wert);
    return JSON.parse(V.exportFormatFuerId('pid-codeliste-aus').baue({ sensibel: true })).claims.nationalities;
  };
  assert.deepEqual(baue([{ liste: LCL, code: '000' }, { liste: LCL, code: '163' }]), ['DE', 'TR']);
  assert.deepEqual(baue([{ liste: LCL, code: '997' }]), ['QS']);
  assert.equal(baue('deutsch'), undefined, 'ein Altwert geht nie hinaus');
});
