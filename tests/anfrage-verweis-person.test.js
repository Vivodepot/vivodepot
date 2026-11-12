'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Eine Anfrage löst einen Verweis in Felder der Person auf (06.11.2026; Feldregister-Kennungen people.person/<feld>)
   ────────────────────────────────────────────────────────────────────────────
   Die Wohnsitzanmeldung fragt nach Ehegatte, Kindern und Mitziehenden samt Anschrift und Geburtsdatum. Die Antwort zeigte von
   einer verwiesenen Person bisher nur den Namen (Verweis-Export-Regel D0). Jetzt darf ein Verweisfeld der Anfrage mit
   `personFelder` Felder dieser Person nennen. Gehalten wird:
   1. Die Antwort trägt genau die verlangten Felder der Person, mit dem Namen, und nichts darüber hinaus.
   2. Jedes verlangte Feld ist eine eigene Zeile in der Übersicht vor dem Senden; eine abgewählte Zeile fehlt in der Antwort.
   3. Ohne `personFelder` bleibt die Antwort wie bisher (nur der Name).
   4. Nur die Felder aus ANFRAGE_PERSON_FELDER, nur an einem Verweisfeld auf eine Person; sonst wird die Zeile verworfen.
   5. Was die Person nicht führt, steht in `fehlend`. Eine Person mit „Privat“ gibt keine Felder heraus.
   6. Ein zurückgehaltenes (sensibles) Verweisfeld gibt keine Personenfelder heraus.
   7. Führt die Person nach der Leseregel noch ihre bisherige Anschriftzeile, geht sie als `anschrift` mit, aber nur, wenn alle
      vier Teile verlangt sind und keiner abgewählt ist. Die Übersicht zeigt sie als eine abwählbare Zeile.
   Rot-Beweise je Punkt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const EHE = 'people.spouseOrCivilPartner';
const ANSCHRIFT = ['people.person/street', 'people.person/houseNumber', 'people.person/postalCode', 'people.person/city'];
const PARTNERIN = { id: 'p-1', name: 'Erika Beispiel', givenName: 'Erika', familyName: 'Beispiel', birthDate: '1944-08-19',
  birthPlace: 'Bonn', beziehung: 'Ehefrau, krank', email: 'erika@beispiel.invalid', tel: '0221 1',
  street: 'Lindenweg', houseNumber: '4', postalCode: '50667', city: 'Köln' };

async function kern(person) {
  const k = ladeKern();
  const { V } = k;
  await V.depotAnlegen('anfrage-verweis-person-2026');
  const d = V.getData();
  d.menschen.push(Object.assign({}, person || PARTNERIN));
  d.sektoren.people = Object.assign({}, d.sektoren.people, { [EHE]: undefined, spouseOrCivilPartner: { ref: 'p-1' } });
  V.setData(d);
  return { V, k };
}
function anfrage(felder) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Meldebehörde Beispielstadt', zweck: 'Anmeldung einer Wohnung',
    grundlage: '§ 17 BMG', vorgang: 'WA-PROBE-1', gestelltAm: '2026-11-06', gueltigBis: '2099-12-31',
    felder, antwort: { art: 'einmalpasswort', an: 'probe@beispiel.invalid' } };
}
const feld = (personFelder, kennung = EHE) => Object.assign({ kennung, zweck: 'Angaben zum Ehegatten (§ 3 Nr. 15 BMG)', pflicht: true },
  personFelder === undefined ? {} : { personFelder });
// Sensibel freigegeben: die Probe fragt nach der Auflösung, nicht nach dem Opt-in (den hält Punkt 6).
const antwort = (V, a, o) => V.anfrageAntwortDatensatz(a, Object.assign({ sensibel: true }, o || {}));
const person = (ds) => (ds.personen || []).find((p) => p.ref === 'p-1');

test('[Verweis·Person·1] die Antwort trägt genau die verlangten Felder der Person, mit dem Namen', async () => {
  const { V } = await kern();
  const ds = antwort(V, anfrage([feld(ANSCHRIFT.concat(['people.person/birthDate']))]));
  assert.ok(ds, 'Antwort entsteht');
  assert.deepEqual(person(ds), { ref: 'p-1', name: 'Erika Beispiel', familyName: 'Beispiel', givenName: 'Erika',
    street: 'Lindenweg', houseNumber: '4', postalCode: '50667', city: 'Köln', birthDate: '1944-08-19' });
});

test('[Verweis·Person·3] ohne personFelder bleibt es beim Namen; Rot-Beweis: nicht verlangt heißt nicht dabei', async () => {
  const { V } = await kern();
  const ohne = person(antwort(V, anfrage([feld(undefined)])));
  assert.deepEqual(Object.keys(ohne).sort(), ['familyName', 'givenName', 'name', 'ref']);
  const nurOrt = person(antwort(V, anfrage([feld(['people.person/city'])])));
  assert.equal(nurOrt.city, 'Köln');
  for (const k of ['birthDate', 'birthPlace', 'street', 'telephone', 'beziehung', 'relationship', 'email']) assert.equal(nurOrt[k], undefined, k);
});

test('[Verweis·Person·2] eine abgewählte Zeile fehlt in der Antwort', async () => {
  const { V } = await kern();
  const ds = antwort(V, anfrage([feld(ANSCHRIFT)]), { personFelderAus: [EHE + '|people.person/street', EHE + '|people.person/houseNumber'] });
  const p = person(ds);
  assert.equal(p.street, undefined);
  assert.equal(p.houseNumber, undefined);
  assert.equal(p.city, 'Köln');
  assert.equal(p.fehlend, undefined, 'abgewählt ist nicht fehlend');
});

test('[Verweis·Person·2] die Übersicht hat je Person und verlangtes Feld eine eigene Zeile mit dem Wert; abgewählt geht als personFelderAus weiter', async () => {
  const { V, k } = await kern();
  const a = anfrage([feld(ANSCHRIFT)]);
  const zeilen = V.anfragePersonZeilen(a, [EHE]);
  assert.deepEqual(zeilen.map((z) => z.schluessel), ANSCHRIFT.map((x) => EHE + '|' + x + '|p-1'), 'Schlüssel je Person');
  assert.ok(zeilen.every((z) => z.gruppe.startsWith('Erika Beispiel · ') && !z.fehlt), 'Zwischentitel „Name · Feld“');
  assert.deepEqual(zeilen.map((z) => z.label.split(': ')[1]), ['Lindenweg', '4', '50667', 'Köln'], 'die Zeile zeigt den Wert, der hinausgeht');
  assert.ok(zeilen.every((z) => !z.label.includes('Erika')), 'der Name steht im Zwischentitel, nicht in jeder Zeile');
  assert.deepEqual(V.anfragePersonZeilen(a, ['identity.givenName']), [], 'nur für Felder in der Auswahl');

  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const letztes = () => modale[modale.length - 1];
  const echt = k.document.getElementById.bind(k.document);
  let box = null;
  k.document.getElementById = (id) => {
    if (id !== 'modal-inhalt' || !modale.length) return echt(id);
    const html = letztes().koerperHTML;
    const knoepfe = [...html.matchAll(/<button type="button" class="btn-mini export-zz-btn[^"]*"([^>]*)>/g)].map((m) => {
      const attr = (n) => { const x = new RegExp(n + '="([^"]*)"').exec(m[1]); return x ? x[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&') : null; };
      return { getAttribute: attr, onclick: null };
    });
    const link = /id="exp-zurueckhalten-weg"/.test(html) ? { onclick: null } : null;
    box = { knoepfe, link, querySelector: (s) => (s === '#exp-zurueckhalten-weg' ? link : null), querySelectorAll: (s) => (s === '.export-zz-btn' ? knoepfe : []) };
    return box;
  };
  let bekommen = null;
  V.flowExportUebersicht({ kennungen: [EHE], zusatzZeilen: zeilen, titel: 'Probe', aufFortfahren: async (o) => { bekommen = o; } });
  for (const z of zeilen) assert.ok(letztes().koerperHTML.includes('data-zusatz="' + z.schluessel + '"'), 'Zeile in der Übersicht: ' + z.label);
  assert.equal(letztes().koerperHTML.split('class="export-zusatz-titel"').length - 1, 1, 'ein Zwischentitel für die eine Person');
  box.link.onclick();
  box.knoepfe.find((b) => b.getAttribute('data-zusatz') === EHE + '|people.person/street|p-1').onclick();
  assert.match(letztes().koerperHTML, /export-zz-gehalten" data-zusatz="people\.spouseOrCivilPartner\|people\.person\/street\|p-1"/);
  await letztes().onPrimaer(() => {});
  assert.deepEqual(bekommen.personFelderAus, [EHE + '|people.person/street|p-1']);
  const ohneStrasse = person(antwort(V, a, { personFelderAus: bekommen.personFelderAus }));
  assert.equal(ohneStrasse.street, undefined, 'die je Person abgewählte Zeile fehlt in der Antwort');
  assert.equal(ohneStrasse.city, 'Köln');
  // Rot-Beweis: ohne Zusatzzeilen bekommt aufFortfahren keine Abwahl, die Optionen bleiben wie bisher.
  V.flowExportUebersicht({ kennungen: [EHE], titel: 'Probe', aufFortfahren: async (o) => { bekommen = o; } });
  await letztes().onPrimaer(() => {});
  assert.equal(bekommen.personFelderAus, undefined);
});

test('[Verweis·Person·4] nur erlaubte Felder, nur an einem Verweisfeld auf eine Person; sonst wird die Zeile verworfen', async () => {
  const { V } = await kern();
  assert.deepEqual([...V.ANFRAGE_PERSON_FELDER].sort(), ['birthDate', 'birthPlace', 'birthYear', 'city', 'deceased', 'familyName',
    'givenName', 'houseNumber', 'name', 'postalCode', 'street', 'telephone']);
  const faelle = [
    [feld(['people.person/relationship']), 'Beziehung nie'], [feld(['people.person/institution']), 'Institution nie'],
    [feld(['people.person/email']), 'E-Mail nie'], [feld([]), 'leer'], [feld('people.person/city'), 'kein Array'],
    [feld(['people.person/city', 'people.person/city']), 'doppelt'], [feld(['people.person/unbekannt']), 'unbekannt'],
    [feld(['identity.city']), 'kein Personenfeld'], [feld(['people.person/city'], 'identity.givenName'), 'kein Verweisfeld'],
    [feld(['people.person/city'], 'health.healthInsurance'), 'Verweis auf eine Institution'],
  ];
  for (const [f, was] of faelle) {
    const g = V.anfragePruefen(anfrage([f, feld(undefined, 'identity.familyName')]));
    assert.equal(g.gueltig, true, was);
    assert.ok(g.verworfene.some((x) => x.grund === 'person-feld' && x.kennung === f.kennung), was + ': verworfen mit person-feld');
    assert.ok(!g.anfrage.felder.some((x) => x.kennung === f.kennung), was + ': die Zeile fällt weg');
  }
  const gut = V.anfragePruefen(anfrage([feld(['people.person/city'])]));
  assert.deepEqual(gut.anfrage.felder[0].personFelder, ['people.person/city'], 'Gegenprobe');
  // Der Schlüssel `person` bleibt ein Wert-Schlüssel: eine Anfrage, die ihn trägt, fällt ganz durch.
  const mitWert = anfrage([Object.assign(feld(undefined), { person: 'Erika' })]);
  assert.equal(V.anfragePruefen(mitWert).grund, 'personendaten');
});

test('[Verweis·Person·4] auch in einer Liste: ein Verweis-Unterfeld auf eine Person nimmt personFelder und löst sie auf', async () => {
  const BETREUUNG = 'advanceCare.provisionInstruments[custodianship-declaration].proposedPerson';
  const { V } = await kern();
  const g = V.anfragePruefen(anfrage([feld(['people.person/city'], BETREUUNG)]));
  assert.deepEqual(g.anfrage.felder[0].personFelder, ['people.person/city'], 'das Listen-Unterfeld ist ein Verweis auf eine Person');
  const d = V.getData();
  d.sektoren.advanceCare = Object.assign({}, d.sektoren.advanceCare, {
    provisionInstruments: [{ id: 'z-1', instrument: 'custodianship-declaration', proposedPerson: { ref: 'p-1' } }] });
  V.setData(d);
  const ds = antwort(V, anfrage([feld(['people.person/city'], BETREUUNG)]));
  assert.ok(ds.felder.some((e) => e.kennung === BETREUUNG), 'Vorbedingung: das Listen-Unterfeld geht mit');
  assert.equal(person(ds).city, 'Köln');
  assert.equal(person(ds).street, undefined, 'nur das verlangte Feld');
});

test('[Verweis·Person·5] was die Person nicht führt, steht in fehlend; „Privat“ gibt keine Felder heraus', async () => {
  const ohneGeburt = Object.assign({}, PARTNERIN); delete ohneGeburt.birthDate; delete ohneGeburt.street;
  const { V } = await kern(ohneGeburt);
  const p = person(antwort(V, anfrage([feld(['people.person/birthDate', 'people.person/street', 'people.person/city'])])));
  assert.deepEqual(p.fehlend, ['people.person/birthDate', 'people.person/street']);
  assert.equal(p.city, 'Köln');
  const privat = await kern(Object.assign({}, PARTNERIN, { nichtMitgeben: true }));
  const q = person(antwort(privat.V, anfrage([feld(ANSCHRIFT)])));
  assert.ok(q, 'der Verweis bleibt aufgelöst');
  assert.deepEqual(Object.keys(q).filter((k) => !['ref', 'name', 'familyName', 'givenName'].includes(k)), [], 'keine Personenfelder');
});

test('[Verweis·Person·5] die Anschrift kommt aus der einen Leseregel: Teile verdrängen die frühere Zeile', async () => {
  // Führt die Person alle Teile, gilt die frühere Zeile nicht mehr und geht nicht hinaus.
  const beides = Object.assign({}, PARTNERIN, { adresse: 'Am Hang 12, 50667 Köln' });
  const p = person(antwort((await kern(beides)).V, anfrage([feld(ANSCHRIFT)])));
  assert.equal(p.street, 'Lindenweg');
  assert.equal(p.anschrift, undefined);
  assert.ok(!JSON.stringify(p).includes('Am Hang'), 'die frühere Zeile geht nicht neben den Teilen hinaus');
  // Nur die frühere Zeile: sie gilt nach der Leseregel und geht als eine Zeile (Punkt 7).
  const nurZeile = person(antwort((await kern({ id: 'p-1', name: 'Erika Beispiel', adresse: 'Lindenweg 4, 50667 Köln' })).V,
    anfrage([feld(ANSCHRIFT)])));
  assert.equal(nurZeile.anschrift, 'Lindenweg 4, 50667 Köln');
});

test('[Verweis·Person·6] ein zurückgehaltenes Verweisfeld gibt keine Personenfelder heraus', async () => {
  const { V } = await kern();
  const def = V.kennungFeldDef(EHE);
  const sensibel = V.feldIstSensibel(def, 'people');
  const ohneOptIn = V.anfrageAntwortDatensatz(anfrage([feld(ANSCHRIFT)]), { sensibel: false });
  if (sensibel) {
    assert.ok(!ohneOptIn.felder.some((e) => e.kennung === EHE), 'Vorbedingung: das Feld bleibt zurück');
    assert.equal(person(ohneOptIn), undefined, 'keine Person, keine Personenfelder');
  } else {
    // Ist das Feld nicht sensibel, macht die Inhaberin es dazu (Überschreibung) — derselbe Weg.
    V.sensibelFeldSetzen('people', 'spouseOrCivilPartner', true);
    const zurueck = V.anfrageAntwortDatensatz(anfrage([feld(ANSCHRIFT)]), { sensibel: false });
    assert.ok(!zurueck.felder.some((e) => e.kennung === EHE), 'Vorbedingung: das Feld bleibt zurück');
    assert.equal(person(zurueck), undefined, 'keine Person, keine Personenfelder');
  }
  // Rot-Beweis: mit Opt-in gehen sie mit.
  assert.equal(person(antwort(V, anfrage([feld(ANSCHRIFT)]))).city, 'Köln');
});

/* 7 · Die bisherige Zeile: die Person führt nur „adresse“ und den Ort als Teil; nach der Leseregel gilt die Zeile. */
const MIT_ALTER_ZEILE = { id: 'p-1', name: 'Erika Beispiel', givenName: 'Erika', familyName: 'Beispiel',
  adresse: 'Am Hang 12, 50667 Köln', city: 'Köln' };

test('[Verweis·Person·7] die bisherige Anschriftzeile geht als eine Zeile mit, wenn alle vier Teile verlangt sind', async () => {
  const { V } = await kern(MIT_ALTER_ZEILE);
  const p = person(antwort(V, anfrage([feld(ANSCHRIFT)])));
  assert.equal(p.anschrift, 'Am Hang 12, 50667 Köln');
  for (const k of ['street', 'houseNumber', 'postalCode', 'city']) assert.equal(p[k], undefined, k);
  assert.equal(p.fehlend, undefined, 'die Teile gelten als beantwortet, nicht als fehlend');
  // Mit Teilen bleibt es bei den Teilen.
  const mitTeilen = person(antwort((await kern()).V, anfrage([feld(ANSCHRIFT)])));
  assert.equal(mitTeilen.anschrift, undefined);
  assert.equal(mitTeilen.street, 'Lindenweg');
});

test('[Verweis·Person·7·Rot-Beweis] nur der Ort verlangt, oder ein Teil abgewählt: keine Zeile, die Teile bleiben fehlend', async () => {
  const { V } = await kern(MIT_ALTER_ZEILE);
  const nurOrt = person(antwort(V, anfrage([feld(['people.person/city'])])));
  assert.equal(nurOrt.anschrift, undefined, 'nur city verlangt: keine Zeile');
  assert.deepEqual(nurOrt.fehlend, ['people.person/city']);
  const ohneStrasse = person(antwort(V, anfrage([feld(ANSCHRIFT)]), { personFelderAus: [EHE + '|people.person/street'] }));
  assert.equal(ohneStrasse.anschrift, undefined, 'ein Teil abgewählt: keine Zeile');
  assert.ok(!JSON.stringify(ohneStrasse).includes('Am Hang'));
});

test('[Verweis·Person·7] die Übersicht zeigt die bisherige Zeile als eine abwählbare Zeile; abgewählt geht sie nicht mit', async () => {
  const { V } = await kern(MIT_ALTER_ZEILE);
  const a = anfrage([feld(ANSCHRIFT.concat(['people.person/birthDate']))]);
  const zeilen = V.anfragePersonZeilen(a, [EHE]);
  assert.deepEqual(zeilen.map((z) => z.schluessel), [EHE + '|people.person/anschrift|p-1', EHE + '|people.person/birthDate|p-1']);
  assert.ok(zeilen[0].label.endsWith(': Am Hang 12, 50667 Köln') && !zeilen[0].fehlt);
  // Was die Person nicht führt, ist eine Zeile ohne Wahl: kein Wert, `fehlt`.
  assert.equal(zeilen[1].fehlt, true);
  assert.ok(!zeilen[1].label.includes(':'), 'eine fehlende Zeile trägt keinen Wert');
  const aus = person(antwort(V, a, { personFelderAus: [EHE + '|people.person/anschrift|p-1'] }));
  assert.equal(aus.anschrift, undefined);
  assert.ok(!JSON.stringify(aus).includes('Am Hang'), 'abgewählt geht nichts von der Anschrift hinaus');
  // Mit Teilen bleiben es vier Zeilen.
  const { V: V2 } = await kern();
  assert.deepEqual(V2.anfragePersonZeilen(a, [EHE]).map((z) => z.schluessel), ANSCHRIFT.concat(['people.person/birthDate']).map((x) => EHE + '|' + x + '|p-1'));
});

test('[Verweis·Person·8] eine fehlende Angabe steht in der Übersicht mit dem Chip „fehlt“, ohne Knopf, und zählt nicht mit', async () => {
  const { V } = await kern({ id: 'p-1', name: 'Erika Beispiel', givenName: 'Erika', familyName: 'Beispiel' });
  const a = anfrage([feld(['people.person/givenName', 'people.person/birthDate'])]);
  const zeilen = V.anfragePersonZeilen(a, [EHE]);
  assert.deepEqual(zeilen.map((z) => !!z.fehlt), [false, true]);
  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  V.flowExportUebersicht({ kennungen: [EHE], zusatzZeilen: zeilen, titel: 'Probe', aufFortfahren: async () => {} });
  const html = modale[modale.length - 1].koerperHTML;
  assert.match(html, /class="export-zusatz-fehlt">[^<]+<span class="export-chip-fehlt">fehlt<\/span>/);
  assert.ok(!html.includes('data-zusatz="' + zeilen[1].schluessel + '"'), 'Rot-Beweis: eine fehlende Angabe ist nicht abwählbar');
  // Fehlt alles, stehen unter dem Zwischentitel nur Chips, kein Erklärsatz.
  const nichts = V.anfragePersonZeilen(anfrage([feld(['people.person/birthDate', 'people.person/birthPlace'])]), [EHE]);
  assert.ok(nichts.every((z) => z.fehlt));
});
