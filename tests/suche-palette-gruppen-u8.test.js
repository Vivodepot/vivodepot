'use strict';
/* Suche als Palette (U-8, 16.11.2026, Inventur D96–D101 gegen den Desktop-Dummy, Abschnitt „Suche“).
   - D97: die Dokumente des Depots sind Suchziele, nach Titel und Typ.
   - D98: je Treffer ein Quellen-Icon und der Pfad. Das Icon ist bei eingelesenen Angaben die Initiale des Ausstellers, bei
     selbst eingetragenen nichts (17.11.2026: Eigenes ohne Zeichen), bei Dokumenten ein Dokument, bei allem zum Erledigen ein Pfeil.
     Der Pfad lautet „Bereich › Feld“.
   - D99: Gruppen „Angaben · Dokumente · Erledigen“ mit Kopf; Befehle (Herausgeben, Notfall) stehen unter Erledigen. Eine leere
     Gruppe erscheint nicht.
   - D100: ohne Treffer, bei offenem Depot, steht der Weg „Als neue Angabe eintragen“; er öffnet den zuletzt geöffneten Bereich.
   - D101: Enter ohne Pfeilwahl wählt den ersten sichtbaren Treffer.
   Rot-Beweis: am Stand vor U-8 (Suche nur mit Liste ohne Gruppen, Enter ohne Wahl tat nichts) fällt jede Probe hier. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function mitDepot() {
  const k = ladeKern();
  const V = k.V;
  await V.depotAnlegen('suche-palette-pw');
  V.akteurSelbstErklaeren('Tester');
  V.__dokument = k.document;
  return V;
}
function tippe(V, text) {
  V._sucheVerdrahten();
  const ein = V.__dokument.getElementById('suche-eingabe');
  ein.value = text;
  ein.oninput();
  return { ein, liste: V.__dokument.getElementById('suche-vorschlaege') };
}
const gruppenKoepfe = (html) => (html.match(/<li class="suche-gruppe"[^>]*>([^<]*)<\/li>/g) || [])
  .map((z) => z.replace(/<[^>]+>/g, ''));
const PLAN = '<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
  + '<P g="Erika" f="Musterfrau" b="19600101"/>'
  + '<A n="Praxis Beispielweg" s="Lindenallee 3" z="12345" c="Musterstadt" t="20261106"/>'
  + '<S><M p="1234567" a="Beispielol 5 mg" m="1" v="1"><W w="Beispielwirkstoff" s="5 mg"/></M></S></MP>';

test('[U8·Dokumente] ein Dokument des Depots wird über seinen Titel gefunden und steht in der Gruppe Dokumente (D97)', async () => {
  const V = await mitDepot();
  const d = V.getData();
  d.dokumente = (d.dokumente || []).concat([{ id: 'u8-dok', sektorId: 'identity', typ: 'u8-frei', name: 'Geburtsurkunde Beispielkind' }]);
  V.setData(d);
  const t = V._sucheTreffer('Beispielkind').filter((e) => e.quelle === 'dokument');
  assert.equal(t.length, 1);
  assert.equal(V._sucheGruppe(t[0]), 'dokumente');
  assert.equal(t[0].pfad, V.bereicheAlle().find((b) => b.id === 'identity').label);
  t[0].ziel();
  assert.equal(V.getViewState().aktiverSektorId, 'identity', 'der Treffer öffnet den Bereich des Dokuments');
});

test('[U8·Gruppen] Angaben und Dokumente erscheinen mit Kopf, die leere Gruppe Erledigen nicht (D99)', async () => {
  const V = await mitDepot();
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Praxis Zwinkerhausen');
  const d = V.getData();
  d.dokumente = (d.dokumente || []).concat([{ id: 'u8-dok', sektorId: 'health', typ: 'u8-frei', name: 'Befund Zwinkerhausen' }]);
  V.setData(d);
  const { liste } = tippe(V, 'Zwinkerhausen');
  assert.deepEqual(gruppenKoepfe(liste.innerHTML), [V.STRINGS.sucheGruppeAngaben, V.STRINGS.sucheGruppeDokumente]);
  const { liste: l2 } = tippe(V, 'Herausgeben');
  const koepfe = gruppenKoepfe(l2.innerHTML);
  assert.ok(koepfe.includes(V.STRINGS.sucheGruppeErledigen), 'der Befehl steht unter Erledigen');
  assert.ok(V._sucheTreffer('Herausgeben').some((e) => e.quelle === 'befehl' && e.label === V.STRINGS.navWeitergeben));
  assert.ok(V._sucheTreffer('Notfall').some((e) => e.quelle === 'befehl' && e.label === V.STRINGS.navNotfall));
});

test('[U8·Befehle] ohne offenes Depot gibt es keine Befehle', () => {
  const { V } = ladeKern();
  assert.equal(V.getData(), null);
  assert.equal(V._sucheTreffer('Herausgeben').filter((e) => e.quelle === 'befehl').length, 0);
});

test('[U8·Icon·Pfad] Initiale der Herkunft und Pfad „Bereich › Feld“ (D98)', async () => {
  const V = await mitDepot();
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Praxis Beispielhausen');
  const eigen = V._sucheTreffer('Beispielhausen').find((e) => e.quelle === 'angabe');
  assert.equal(eigen.initiale, '', 'selbst eingetragen: ohne Zeichen (17.11.2026)');
  const bereich = V.bereicheAlle().find((b) => b.id === 'health');
  const feld = bereich.sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'ongoingTreatmentNext');
  assert.equal(V._suchePfad(eigen), bereich.label + ' › ' + feld.label);
  V.bmpPlanUebernehmen(V.bmpXmlLesen(PLAN).plan);
  const eingelesen = V._sucheTreffer('Beispielol').find((e) => e.quelle === 'angabe');
  assert.equal(eingelesen.initiale, 'P', 'eingelesen: die Initiale des Ausstellers (Praxis Beispielweg)');
  const { liste } = tippe(V, 'Beispielhausen');
  assert.match(liste.innerHTML, /<span class="suche-quelle-i" aria-hidden="true"><\/span>/, 'eigene Angabe: kein Icon, keine Initiale');
  assert.ok(!liste.innerHTML.includes(V.STRINGS.sucheHerkunftEingetragen.replace('%s', 'Tester')), 'selbst Eingetragenes wird nicht gekennzeichnet');
  const { liste: l2 } = tippe(V, 'Erbfall');
  assert.match(l2.innerHTML, /suche-quelle-i" aria-hidden="true"><svg/, 'zum Erledigen: ein Pfeil');
});

test('[U8·Icon] ohne Stempel keine erfundene Initiale', async () => {
  const V = await mitDepot();
  const d = V.getData();
  d.sektoren = Object.assign({}, d.sektoren, { health: Object.assign({}, d.sektoren.health, { ongoingTreatmentNext: 'Praxis Altbestand' }) });
  V.setData(d);
  assert.equal(V.herkunftInitiale('health', 'ongoingTreatmentNext'), '');
});

test('[U8·Leer] ohne Treffer: „Als neue Angabe eintragen“ öffnet den zuletzt geöffneten Bereich (D100)', async () => {
  const V = await mitDepot();
  V.oeffneSektor('finance');
  const { liste } = tippe(V, 'xyzzy-nichts-u8');
  assert.match(liste.innerHTML, /<button type="button" class="suche-leer-neu" data-suche-neu="1">/, 'der Weg zur neuen Angabe steht da');
  assert.ok(liste.innerHTML.includes(V.STRINGS.sucheAlsNeueAngabe));
  assert.equal(V._sucheNeueAngabeZiel(), 'finance');
  // Enter im Leer-Zustand nimmt denselben Weg wie der Link: aus einer anderen Ansicht zurück in den zuletzt geöffneten Bereich.
  V.oeffneUeberHinweise();
  assert.equal(V.getViewState().aktiveAnsicht, 'ueber-hinweise', 'Vorbedingung');
  const { ein, liste: l2 } = tippe(V, 'xyzzy-nichts-u8');
  ein.onkeydown({ key: 'Enter', preventDefault() {} });
  assert.equal(V.getViewState().aktiveAnsicht, 'sektor');
  assert.equal(V.getViewState().aktiverSektorId, 'finance');
  assert.equal(l2.hidden, true);
});

test('[U8·Leer] ohne offenes Depot kein Weg zur neuen Angabe', () => {
  const k = ladeKern();
  k.V._sucheVerdrahten();
  const ein = k.document.getElementById('suche-eingabe');
  ein.value = 'xyzzy-nichts-u8';
  ein.oninput();
  const html = k.document.getElementById('suche-vorschlaege').innerHTML;
  assert.match(html, /suche-leer/);
  assert.doesNotMatch(html, /data-suche-neu/);
});

test('[U8·Enter] Enter ohne Pfeilwahl wählt den ersten sichtbaren Treffer (D101)', async () => {
  const V = await mitDepot();
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Praxis Zwinkerbello');
  V.oeffneSektor('finance');
  const { ein, liste } = tippe(V, 'Zwinkerbello');
  assert.match(liste.innerHTML, /<li role="option" data-idx="0">/);
  assert.equal(V.getViewState().aktiverSektorId, 'finance', 'Vorbedingung');
  ein.onkeydown({ key: 'Enter', preventDefault() {} });
  assert.equal(V.getViewState().aktiverSektorId, 'health', 'der erste Treffer ist geöffnet');
  assert.equal(liste.hidden, true);
});
