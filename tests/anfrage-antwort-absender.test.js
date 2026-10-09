'use strict';
/* Wer antwortet (U2-ADR-437). Die Antwort auf eine Anfrage trägt `absender = { name, rolle, fuer }` IM verschlüsselten
   Datensatz; die Lese-App macht daraus die Überschrift „Antwort von {name} ({Rolle}) auf die Anfrage von {Stelle}".
   Entstanden am 26.09.2026 aus der Klinikaufnahme-Demo: die Klinik sah, WORAUF geantwortet wurde, nicht VON WEM.

   Geprüft in beiden Richtungen: der Kern schreibt das Feld (eigenes Depot, Sub-Depot unter Vollmacht, empfangener Teil),
   die Lese-App liest es — und eine Antwort OHNE das Feld (vor v807) bleibt lesbar und sagt, dass der Absender fehlt.
   Die Rolle im Teil folgt der Rechtsgrundlage: bevollmächtigt nur, wenn eine Vollmacht im Teil genau diese Person nennt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'absender-pw';
const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1,
  von: 'Kliniksozialdienst', zweck: 'Wer darf vertreten?', grundlage: 'Behandlungsvertrag',
  vorgang: 'SD-1', gueltigBis: '2099-12-31',
  felder: [
    { kennung: 'identity.givenName', zweck: 'Zuordnung', pflicht: true },
    { kennung: 'identity.familyName', zweck: 'Zuordnung', pflicht: true },
  ],
  antwort: { art: 'einmalpasswort', an: 'sozialdienst@example.de' },
};

async function gertrud({ vollmachtFuer = 'anna', bank = false } = {}) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Gertrud Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Gertrud');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  const ids = { anna: V.personSicherstellen('Anna Mustermann'), paul: V.personSicherstellen('Paul Mustermann') };
  const eintrag = { instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: ids[vollmachtFuer] }] };
  if (bank) eintrag.typeOfPowerOfAttorney = 'bank';
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', eintrag);
  return V;
}
// Der Teil, wie ihn der Empfänger öffnet: der Zuschnitt seines Kreises, und nur der.
function teilOeffnen(V, kreisName) {
  const quelle = JSON.parse(JSON.stringify(V.getData()));
  const kreis = { id: 'kreis-1', name: kreisName, bausteine: ['bereich:identity', 'bereich:advanceCare', 'bereich:people'], ausnahmen: [] };
  const teil = V.empfaengerZuschnittModell(kreis, quelle);
  assert.equal(teil.empfaengerAusschnitt.kreisName, kreisName, 'der Teil trägt den Namen seines Kreises');
  V.setData(Object.assign(quelle, teil));
  return V;
}

/* Der lesbare Teil einer JWE, vollständig dekodiert: der geschützte Kopf als JSON, und jeder base64url-Parameter darin
   (apu, apv, p2s, kid) noch einmal dekodiert. Nur so findet eine Suche nach einem Namen auch, was jemand in apu legt. */
function jweLesbarerTeil(jwe) {
  const kopf = JSON.parse(Buffer.from(String(jwe).split('.')[0], 'base64url').toString('utf8'));
  const teile = [JSON.stringify(kopf)];
  for (const k of ['apu', 'apv', 'p2s', 'kid']) {
    if (typeof kopf[k] === 'string') teile.push(Buffer.from(kopf[k], 'base64url').toString('utf8'));
  }
  if (kopf.epk) teile.push(JSON.stringify(kopf.epk));
  return teile.join('\n');
}

test('[Absender] eigenes Depot: die Inhaberin, rolle selbst', async () => {
  const V = await gertrud();
  const ds = V.anfrageAntwortDatensatz(ANFRAGE);
  assert.deepEqual(JSON.parse(JSON.stringify(ds.absender)), { name: 'Gertrud Mustermann', rolle: 'selbst' });
});

test('[Absender] empfangener Teil mit Vollmacht für die Person des Kreises: bevollmächtigt für die Inhaberin', async () => {
  const V = teilOeffnen(await gertrud(), 'Anna (Tochter, bevollmächtigt)');
  const ds = V.anfrageAntwortDatensatz(ANFRAGE);
  assert.deepEqual(JSON.parse(JSON.stringify(ds.absender)), { name: 'Anna Mustermann', rolle: 'bevollmaechtigt', fuer: 'Gertrud Mustermann' });
});

test('[Absender · Rot-Beweis] die Vollmacht nennt Anna, der Teil gehört Paul: Paul ist NICHT bevollmächtigt', async () => {
  const V = teilOeffnen(await gertrud(), 'Paul');
  const ds = V.anfrageAntwortDatensatz(ANFRAGE);
  assert.deepEqual(JSON.parse(JSON.stringify(ds.absender)), { name: 'Paul Mustermann', rolle: 'teil', fuer: 'Gertrud Mustermann' });
});

test('[Absender · Rot-Beweis] eine Bankvollmacht macht im Teil niemanden zur Vertretung', async () => {
  const V = teilOeffnen(await gertrud({ bank: true }), 'Anna');
  assert.equal(V.anfrageAntwortDatensatz(ANFRAGE).absender.rolle, 'teil');
});

test('[Absender] nennt der Kreisname keine oder mehrere Personen, steht der Kreisname da, rolle kreis', async () => {
  for (const name of ['Familie', 'Anna und Paul']) {
    const V = teilOeffnen(await gertrud(), name);
    assert.deepEqual(JSON.parse(JSON.stringify(V.anfrageAntwortDatensatz(ANFRAGE).absender)), { name, rolle: 'kreis', fuer: 'Gertrud Mustermann' });
  }
});

test('[Absender] Sub-Depot unter Vollmacht: die handelnde Person des Ankers, für die Vertretene', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Anna Mustermann');
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'Mutter', inhaberin: 'Gertrud Mustermann', verwaltungsTyp: 'verwaltet', akzent: 'sand' }, PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  const ds = V.anfrageAntwortDatensatz(ANFRAGE);
  assert.deepEqual(JSON.parse(JSON.stringify(ds.absender)), { name: 'Anna Mustermann', rolle: 'bevollmaechtigt', fuer: 'Gertrud Mustermann' });
});

test('[Absender] steht im verschlüsselten Datensatz, nicht im Klartext des Umschlags, und kommt beim Empfänger an', async () => {
  const V = teilOeffnen(await gertrud(), 'Anna');
  const L = ladeLesen().V;
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(ANFRAGE), ANFRAGE, { passwort: 'einmal-1' });
  // Seit U2-ADR-449 ist die Antwort eine JWE: lesbar ist nur der geschützte Kopf, der Datensatz liegt im Chiffrat.
  const lesbar = jweLesbarerTeil(u);
  assert.equal(lesbar.includes('absender'), false, 'kein Absender-Schlüssel im Kopf');
  assert.equal(lesbar.includes('Anna'), false, 'kein Name im Kopf, auch nicht in apu/apv');
  const zurueck = JSON.parse((await L.antwortJweOeffnen(u, { passwort: 'einmal-1' })).klartext);
  assert.equal(zurueck.absender.name, 'Anna Mustermann');
  assert.equal(zurueck.absender.rolle, 'bevollmaechtigt');
});

test('[Absender·Rot-Beweis] ein Name im Kopf der JWE, auch base64url in apu, wird gefunden', async () => {
  const V = teilOeffnen(await gertrud(), 'Anna');
  const u = await V.antwortVerschluesseln(V.anfrageAntwortDatensatz(ANFRAGE), ANFRAGE, { passwort: 'einmal-1' });
  const t = String(u).split('.');
  const kopf = JSON.parse(Buffer.from(t[0], 'base64url').toString('utf8'));
  kopf.apu = Buffer.from('Anna Mustermann').toString('base64url');
  t[0] = Buffer.from(JSON.stringify(kopf)).toString('base64url');
  assert.equal(t.join('.').includes('Anna'), false, 'Vorbedingung: im rohen Token sieht man ihn nicht');
  assert.equal(jweLesbarerTeil(t.join('.')).includes('Anna'), true, 'dekodiert wird er gefunden');
});

/* ── Lese-App ──────────────────────────────────────────────────────────────── */
const DS = (absender, felder) => Object.assign({
  felder: felder || [
    { kennung: 'identity.givenName', label: 'Vorname', wert: 'Gertrud' },
    { kennung: 'identity.familyName', label: 'Nachname', wert: 'Mustermann' },
  ],
  fehlend: [], anfrage: { von: 'Kliniksozialdienst', vorgang: 'SD-1' }, vollstaendig: true,
}, absender ? { absender } : {});
// Die Überschrift als Text, aus dem Markup (die Test-Umgebung parst innerHTML nicht).
const h1 = (document) => (document.getElementById('app').innerHTML.match(/<h1 id="antwort-absender">([\s\S]*?)<\/h1>/) || [])[1] || '';
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const kopf = (L, document, ds) => { L.renderAntwort(ds, { vorgang: 'SD-1' }); return text(h1(document)); };

test('[Lese-App · Absender] „Antwort von Anna Mustermann (bevollmächtigt) auf die Anfrage von …", als Angabe der Person', () => {
  const { V: L, document } = ladeLesen();
  const t = kopf(L, document, DS({ name: 'Anna Mustermann', rolle: 'bevollmaechtigt', fuer: 'Gertrud Mustermann' }));
  assert.match(t, /^Antwort von Anna Mustermann \(bevollmächtigt\) auf die Anfrage von Kliniksozialdienst/);
  assert.match(t, /von der Person angegeben$/);
  assert.match(h1(document), /class="weg-hint antwort-herkunft" data-herkunft="eingetragen"/);
});

test('[Lese-App · Absender] „für …" nur, wenn die Zeile darunter die Vertretene nicht nennt; selbst und Teil-Depot', () => {
  const { V: L, document } = ladeLesen();
  assert.match(kopf(L, document, DS({ name: 'Anna Mustermann', rolle: 'bevollmaechtigt', fuer: 'Gertrud Mustermann' }, [])),
    /^Antwort von Anna Mustermann \(bevollmächtigt für Gertrud Mustermann\) auf/);
  assert.match(kopf(L, document, DS({ name: 'Gertrud Mustermann', rolle: 'selbst' })), /^Antwort von Gertrud Mustermann \(selbst\) auf/);
  assert.match(kopf(L, document, DS({ name: 'Paul Mustermann', rolle: 'teil', fuer: 'Gertrud Mustermann' })),
    /^Antwort von Paul Mustermann \(Teil-Depot von Gertrud Mustermann\) auf/);
  assert.match(kopf(L, document, DS({ name: 'Familie', rolle: 'kreis', fuer: 'Gertrud Mustermann' })),
    /^Antwort aus dem Teil „Familie“ des Depots von Gertrud Mustermann auf/);
});

test('[Lese-App · Absender · Verträglichkeit] eine Antwort ohne das Feld (vor v807) bleibt lesbar und sagt, dass der Absender fehlt', () => {
  const { V: L, document } = ladeLesen();
  const t = kopf(L, document, DS(null));
  assert.match(t, /^Antwort auf die Anfrage von Kliniksozialdienst/);
  assert.match(t, /Absender nicht angegeben$/);
  assert.match(document.getElementById('app').innerHTML, /id="antwort-person">Angaben zu Gertrud Mustermann/, 'der Rest der Antwort steht wie zuvor');
});

/* Seit dem Befund ANTWORT-VERIFIZIERT-SELBSTAUSKUNFT (05.10.2026) macht auch `verifiziert: true` den Absender nicht geprüft: die
   Antwort ist nicht signiert, das Feld ist Selbstauskunft der Datei (vivodepot-lesen.html, antwortAngabeHerkunft). */
test('[Lese-App · Absender · Rot-Beweis] unbekannte Rolle wird weggelassen, nicht übersetzt; geprüft nie aus der Datei', () => {
  const { V: L, document } = ladeLesen();
  assert.match(kopf(L, document, DS({ name: 'X Mustermann', rolle: 'notar' })), /^Antwort von X Mustermann auf die Anfrage/);
  assert.equal(L.antwortAnzeigeModell(DS({ name: 'X', rolle: 'selbst', herkunft: { verifiziert: 'ja' } })).absender.herkunft, 'eingetragen');
  assert.equal(L.antwortAnzeigeModell(DS({ name: 'X', rolle: 'selbst', herkunft: { verifiziert: true } })).absender.herkunft, 'eingetragen');
  assert.equal(L.antwortAnzeigeModell(DS({ name: '   ', rolle: 'selbst' })).absender, null, 'ein leerer Name ist kein Absender');
});

test('[Lese-App · Absender] Deutsch und Englisch tragen jeden Schlüssel', () => {
  const { V: L } = ladeLesen();
  for (const k of ['antwortAbsenderVon', 'antwortAbsenderVonOhneRolle', 'antwortAbsenderAusTeil', 'antwortAbsenderOhne',
    'antwortAbsenderNichtAngegeben', 'antwortRolleSelbst', 'antwortRolleBevollmaechtigt', 'antwortRolleBevollmaechtigtFuer', 'antwortRolleTeil']) {
    assert.ok(typeof L.STRINGS[k] === 'string' && L.STRINGS[k].trim(), 'Deutsch fehlt: ' + k);
    assert.ok(typeof L.LESE_TEXTE_EN[k] === 'string' && L.LESE_TEXTE_EN[k].trim(), 'Englisch fehlt: ' + k);
  }
});
