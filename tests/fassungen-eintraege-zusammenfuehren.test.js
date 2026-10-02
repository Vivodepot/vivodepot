'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zusammenführen auf Eintragsebene: Listen und Register (U2-ADR-463, Ablage ohne Netz, Teil 2)
   ────────────────────────────────────────────────────────────────────────────
   A475 führt flache Felder zusammen; Listen und Register blieben ein Entweder-oder. Jetzt nennt jeder Listen-
   Stempel den Eintrag (`eintragId`, `listenAenderung`), gepaart wird über die `id`. Die Klasse, gegen die diese Proben
   stehen: ein Eintrag, der beim Zusammenführen STILL verschwindet oder STILL zurückkehrt (Geister-Eintrag) —
   beides ist beim Zusammenführen von Hand nicht mehr zu sehen.

   Namen wie in tests/a475-fassungen-zusammenfuehren.test.js: `vorher` (alt) und `datei` (neu = `data`, das Ziel jeder
   Schreibung). Im Konflikt-Dialog Gerät gegen Datei ist alt die Datei und neu der Stand auf dem Gerät.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');

const PW = 'eintraege-pw';
const S = 'finance', F = 'taxIdsTaxNumbers';

async function gemeinsameAusgangsfassung() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Anna');
  V.listenEintragHinzufuegen(S, F, { id: 'e-alt', system: 'DE', taxNumber: '11 111 111 111' });
  V.listenEintragHinzufuegen(S, F, { id: 'e-zwei', system: 'DE', taxNumber: '22 222 222 222' });
  return V.depotSerialisieren();
}
// Ein Kern aus einer mutierten Kopie, ausdrücklich gebacken wie das Standard-Produkt (Rot-Beweis).
function ladeKernAus(pfad) {
  fs.writeFileSync(pfad, _standardProduktBaken(fs.readFileSync(pfad, 'utf8')));
  const lader = require.resolve('./load-kern.js');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = pfad;
  delete require.cache[lader];
  try { return require(lader).ladeKern({ blank: true }); } finally {   // schon gebacken, oben
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[lader];
  }
}
async function fassungAus(gemeinsam, aendern, kernPfad) {
  const { V } = kernPfad ? ladeKernAus(kernPfad) : ladeKern();
  await V.depotLaden(await gemeinsam, PW);
  V.inhaberAkteurEtablieren();   // der Wiedereintritts-Weg: dieselbe Person wie in der Ausgangsfassung
  if (aendern) aendern(V);
  return V;
}
const index = (V, id) => V.getData().sektoren[S][F].findIndex((e) => e.id === id);
const ids = (V) => V.getData().sektoren[S][F].map((e) => e.id).sort();
const zeilenDerListe = (vergleich) => vergleich.eintraege.filter((z) => z.ort.sektorId === S && z.ort.feldId === F);

test('[Eintrag·Stempel] jeder Listen-Stempel nennt den Eintrag; der Entfernt-Stempel trägt keinen Inhalt', async () => {
  const V = await fassungAus(gemeinsameAusgangsfassung(), (W) => {
    W.listenEintragAktualisieren(S, F, index(W, 'e-alt'), { id: 'e-alt', system: 'DE', taxNumber: '11 111 111 112' });
    W.listenEintragEntfernen(S, F, index(W, 'e-zwei'));
  });
  const kette = V.getData().urheberschaft[S][F];
  assert.deepEqual(kette.map((st) => [st.eintragId, st.listenAenderung]),
    [['e-alt', 'neu'], ['e-zwei', 'neu'], ['e-alt', 'geaendert'], ['e-zwei', 'entfernt']]);
  const entfernt = kette[kette.length - 1];
  assert.ok(!JSON.stringify(entfernt).includes('22 222'), 'kein Inhalt des gelöschten Eintrags im Stempel');
});

test('[Eintrag·eine Seite] nur `vorher` hat angelegt, geändert und entfernt → alles ohne Rückfrage, nichts sonst', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => {
    W.listenEintragHinzufuegen(S, F, { id: 'e-neu', system: 'DE', taxNumber: '33 333 333 333' });
    W.listenEintragEntfernen(S, F, index(W, 'e-zwei'));
  });
  const datei = await fassungAus(gemeinsam, null);
  const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.deepEqual(zeilenDerListe(v).map((z) => [z.schluessel, z.art]).sort(), [['e-neu', 'alt'], ['e-zwei', 'weg']]);
  datei.fassungenZusammenfuehren(v, {});
  assert.deepEqual(ids(datei), ['e-alt', 'e-neu']);
});

test('[Eintrag·beide Seiten] beide legen verschiedene Einträge an → beide stehen danach da, ohne Rückfrage', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => W.listenEintragHinzufuegen(S, F, { id: 'e-v', system: 'DE', taxNumber: '44' }));
  const datei = await fassungAus(gemeinsam, (W) => W.listenEintragHinzufuegen(S, F, { id: 'e-d', system: 'DE', taxNumber: '55' }));
  const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.equal(zeilenDerListe(v).filter((z) => z.art === 'frage').length, 0);
  datei.fassungenZusammenfuehren(v, {});
  assert.deepEqual(ids(datei), ['e-alt', 'e-d', 'e-v', 'e-zwei']);
});

test('[Eintrag·kein Geist] auf einer Seite entfernt, auf der anderen unberührt → er bleibt weg, ohne Rückfrage', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => W.listenEintragHinzufuegen(S, F, { id: 'e-v', system: 'DE', taxNumber: '44' }));
  const datei = await fassungAus(gemeinsam, (W) => W.listenEintragEntfernen(S, F, index(W, 'e-zwei')));
  const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  assert.equal(zeilenDerListe(v).filter((z) => z.art === 'frage').length, 0);
  datei.fassungenZusammenfuehren(v, {});
  assert.ok(!ids(datei).includes('e-zwei'), 'der entfernte Eintrag kehrt nicht zurück');
  assert.ok(ids(datei).includes('e-v'));
});

test('[Eintrag·entfernt gegen geändert] eine Seite entfernt, die andere ändert → Frage, vorbelegt „behalten"', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => W.listenEintragAktualisieren(S, F, index(W, 'e-zwei'), { id: 'e-zwei', system: 'DE', taxNumber: '22 GEÄNDERT' }));
  const datei = await fassungAus(gemeinsam, (W) => W.listenEintragEntfernen(S, F, index(W, 'e-zwei')));
  const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const frage = zeilenDerListe(v).find((z) => z.schluessel === 'e-zwei');
  assert.equal(frage && frage.art, 'frage', 'die Änderung geht nicht still verloren');
  assert.equal(frage.uebernehmen, 'behalten');
  datei.fassungenZusammenfuehren(v, {});
  assert.equal(datei.getData().sektoren[S][F].find((e) => e.id === 'e-zwei').taxNumber, '22 GEÄNDERT');
  // Und wer „entfernen" wählt, bekommt das.
  const datei2 = await fassungAus(gemeinsam, (W) => W.listenEintragEntfernen(S, F, index(W, 'e-zwei')));
  datei2.fassungenZusammenfuehren(datei2.fassungenVergleichen(vorher.getData(), datei2.getData()), { [frage.key]: 'entfernen' });
  assert.ok(!ids(datei2).includes('e-zwei'));
});

test('[Eintrag·entfernt gegen geändert·Rot-Beweis] ohne die Prüfung „von der anderen Seite geändert" verschwindet die Änderung still', async () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const anker = "else if (bekannt && SB.entfernt.has(id) && !angefasst(SA, id)) continue;";
  assert.equal(kern.split(anker).length, 2, 'Anker trifft genau einmal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eintraege-rot-'));
  try {
    const ziel = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(ziel, kern.replace(anker, 'else if (bekannt && SB.entfernt.has(id)) continue;'));
    const gemeinsam = gemeinsameAusgangsfassung();
    const vorher = await fassungAus(gemeinsam, (W) => W.listenEintragAktualisieren(S, F, index(W, 'e-zwei'), { id: 'e-zwei', system: 'DE', taxNumber: '22 GEÄNDERT' }), ziel);
    const datei = await fassungAus(gemeinsam, (W) => W.listenEintragEntfernen(S, F, index(W, 'e-zwei')), ziel);
    const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
    assert.equal(zeilenDerListe(v).length, 0, 'mutiert: keine Frage — die Änderung wäre still verworfen');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Eintrag·beidseitig geändert] beide ändern denselben Eintrag verschieden → Frage mit beiden Fassungen', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => W.listenEintragAktualisieren(S, F, index(W, 'e-alt'), { id: 'e-alt', system: 'DE', taxNumber: 'V' }));
  const datei = await fassungAus(gemeinsam, (W) => W.listenEintragAktualisieren(S, F, index(W, 'e-alt'), { id: 'e-alt', system: 'DE', taxNumber: 'D' }));
  const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const frage = zeilenDerListe(v).find((z) => z.schluessel === 'e-alt');
  assert.equal(frage.art, 'frage');
  assert.equal(frage.alt.taxNumber, 'V');
  assert.equal(frage.neu.taxNumber, 'D');
  datei.fassungenZusammenfuehren(v, { [frage.key]: 'alt' });
  assert.equal(datei.getData().sektoren[S][F].find((e) => e.id === 'e-alt').taxNumber, 'V');
});

test('[Eintrag·Altbestand] ohne Nennung im Stempel wird ein Eintrag nur auf einer Seite gefragt, nicht still entschieden', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => { W.listenEintragHinzufuegen(S, F, { id: 'e-v', system: 'DE', taxNumber: '44' }); });
  const datei = await fassungAus(gemeinsam, (W) => { W.listenEintragEntfernen(S, F, index(W, 'e-zwei')); });
  // Stempel sind eingefroren; Ketten ohne Nennung stellen den Altbestand vor U2-ADR-463 her.
  const ohne = (kette) => kette.map(({ eintragId, listenAenderung, ...rest }) => rest);
  const alt = JSON.parse(JSON.stringify(vorher.getData())), neu = datei.getData();
  alt.urheberschaft[S][F] = ohne(alt.urheberschaft[S][F]);
  neu.urheberschaft[S][F] = ohne(neu.urheberschaft[S][F]);
  const v = datei.fassungenVergleichen(alt, neu);
  const art = Object.fromEntries(zeilenDerListe(v).map((z) => [z.schluessel, [z.art, z.uebernehmen]]));
  assert.deepEqual(art, { 'e-v': ['frage', 'behalten'], 'e-zwei': ['frage', 'behalten'] });
});

test('[Eintrag·Register] eine Person nur auf einer Seite wird gefragt, vorbelegt „behalten" — Register tragen keine Kette', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const vorher = await fassungAus(gemeinsam, (W) => W.personHinzufuegen({ name: 'Dr. Sommer' }));
  const datei = await fassungAus(gemeinsam, null);
  const v = datei.fassungenVergleichen(vorher.getData(), datei.getData());
  const frage = v.eintraege.find((z) => z.ort.register === 'menschen');
  assert.ok(frage && frage.art === 'frage' && frage.uebernehmen === 'behalten');
  datei.fassungenZusammenfuehren(v, {});
  assert.ok(datei.getData().menschen.some((m) => m.name === 'Dr. Sommer'), 'die Person ist nach dem Zusammenführen da');
});

test('[Eintrag·Rundlauf] Datei aus A, Änderungen auf A und B, zusammengeführt: keine Änderung geht verloren', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const a = await fassungAus(gemeinsam, (W) => {
    W.listenEintragHinzufuegen(S, F, { id: 'e-a', system: 'DE', taxNumber: 'A' });
    W.sektorFeldSetzen('identity', 'telephone', '0301 222222');   // ein Feld, das kein Register mitzieht
  });
  const b = await fassungAus(gemeinsam, (W) => {
    W.listenEintragHinzufuegen(S, F, { id: 'e-b', system: 'DE', taxNumber: 'B' });
    W.listenEintragEntfernen(S, F, index(W, 'e-zwei'));
    W.sektorFeldSetzen('identity', 'email', 'anna@b.example');
  });
  const v = b.fassungenVergleichen(a.getData(), b.getData());
  assert.equal(v.konflikte.length + v.eintraege.filter((z) => z.art === 'frage').length, 0, 'nichts zu fragen');
  b.fassungenZusammenfuehren(v, {});
  assert.deepEqual(ids(b), ['e-a', 'e-alt', 'e-b']);
  assert.equal(b.getData().sektoren.identity.telephone, '0301 222222');
  assert.equal(b.getData().sektoren.identity.email, 'anna@b.example');
});

/* Befund 01.10.2026 (U2-ADR-463, beim Bau gefunden): `data.depotUUID` gibt es nicht — die Kennung des offenen Depots
   steht in `aktuelleDepotUUID`. Der A475-Weg beim Öffnen fragte `vorherigeFassung.depotUUID` und brach darum IMMER
   ab: im Produkt wurde eine zweite Fassung desselben Depots nie erkannt, nur die Proben, die fassungenVergleichen
   direkt rufen, waren grün. */
test('[A475·Öffnen] wer eine zweite Fassung desselben Depots öffnet, bekommt die Änderungen der ersten zusammengeführt', async () => {
  const gemeinsam = gemeinsameAusgangsfassung();
  const { V } = ladeKern();
  await V.depotLaden(await gemeinsam, PW);
  V.inhaberAkteurEtablieren();
  V.listenEintragHinzufuegen(S, F, { id: 'e-offen', system: 'DE', taxNumber: 'OFFEN' });
  const vorher = V.getData();
  const uuidVorher = V._aktuelleDepotUUID();
  assert.ok(uuidVorher, 'Vorbedingung: das offene Depot hat eine Kennung');
  assert.equal(vorher.depotUUID, undefined, 'die Kennung steht nicht in data — darum darf der Weg sie dort nicht suchen');
  await V.depotLaden(await gemeinsam, PW);   // dieselbe Ausgangsdatei noch einmal: ohne den Eintrag
  V.inhaberAkteurEtablieren();
  V._fassungenNachOeffnenPruefen(vorher, uuidVorher);
  assert.ok(ids(V).includes('e-offen'), 'der Eintrag der zuerst offenen Fassung ist nach dem Öffnen da');
});

// Die Klasse dahinter: eine Kennung, die im Kern gelesen wird, wo sie nie geschrieben wird. Für die Depot-Kennung
// heißt das: kein Lesen von `data.depotUUID` (die Kennung steht in `aktuelleDepotUUID` und im Umschlag).
const DATA_UUID_LESER = /\b(?:data|vorherigeFassung|_fassungVorher)\.depotUUID\b/g;
test('[A475·Öffnen·Wächter] der Kern liest die Depot-Kennung nie aus `data`, wo sie nicht steht', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.deepEqual(kern.match(DATA_UUID_LESER) || [], []);
  assert.equal(('if (vorherigeFassung.depotUUID !== data.depotUUID) return;'.match(DATA_UUID_LESER) || []).length, 2, 'Rot-Beweis im Test: die alte Zeile würde gefunden');
  const { V } = ladeKern();
  assert.equal('depotUUID' in V.leeresDepot(), false, 'Grundlage des Wächters: ein Depot trägt die Kennung nicht in data');
});
