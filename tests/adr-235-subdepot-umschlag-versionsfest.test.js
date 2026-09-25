'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-235 — Sub-Depot-Umschlag versionsfest (Rot-Beweis vor der Korrektur)
   ────────────────────────────────────────────────────────────────────────
   Befund (03.09.2026): sechs unabhängige Stellen rekonstruierten
   den Umschlag mit genau den sechs V3-Feldern (kryptoVersion, depotUUID,
   pbkdf2.salt, depotSalt, iv, ct) — seit dem Zerfall-Schnitt (A345, Commit
   `bd3cd84a`, 19.08.2026) liefert der TATSÄCHLICHE allgemeine Speicherweg
   `depotSerialisieren()` aber V4 (einheiten/umschlagTabelle statt iv/ct).
   ZWEI GETRENNTE ZEITFENSTER: der Fehler steht seit dem 19.08.2026 im Kern
   (Code-Fenster, 15 Tage bis zu diesem Fix) — aber die Testerinnen-Fassung,
   die ihn eine echte Person hätte treffen lassen können, ist erst seit dem
   01.09.2026 draußen (Nutzungs-Fenster, 2 Tage). Beide Zahlen stehen
   getrennt, keine ersetzt die andere.

   Mount (`umschlagAusDatei`/`pruefeBlackboxUmschlag`/`blackboxDateiAusUmschlag`/
   `subDepotEinhaengen`) UND Öffnen (`subDepotEntsiegeln`,
   `subDepotEigenerPasswortWechsel`) — sechs Stellen, dieselbe Annahme.
   `subDepotEntsiegeln`s Rückverschlüsselungs-Pfad (NFD-Fallback-Erfolg) und
   `subDepotEigenerPasswortWechsel` SCHREIBEN — vor der Korrektur hätten
   beide ein V4-Sub-Depot still auf V3 heruntergeschrieben (Datenverlust,
   kein Fehlschlag). `subDepotEigenerPasswortWechsel` war dabei am
   irreführendsten: der Rückgabewert behauptete `kryptoVersion: 4`, trug
   aber V3-Form — ein Umschlag, der über seine eigene Struktur lügt.

   DIE PROBE LÄUFT ÜBER DEN ECHTEN WEG, NICHT ÜBER depotSerialisierenV4()
   DIREKT — genau das war die Lücke: der einzige bestehende Test, der die
   reguläre-Depot-Datei-Öffnung prüft (adr-124-huelle-umpacken-zug3.test.js),
   rief depotSerialisierenV3() hartkodiert und traf die Lücke darum nie.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function verwaltendeSeiteBereit(passwort) {
  const { V } = ladeKern();
  await V.depotAnlegen(passwort);
  const personId = V.personSicherstellen('Verwalterin');
  V.setzeSitzungsAkteur({ personId, eigenschaft: 'selbst' });
  return V;
}

describe('U2-ADR-235 — Sub-Depot-Umschlag ist versionsfest', () => {
  test('eine ganz normal gespeicherte (heute: V4) Depot-Datei laesst sich einhaengen', async () => {
    // Geber-Seite: eine eigene Identitaet, ganz normal gespeichert — ueber
    // depotSerialisieren() OHNE Suffix, den echten Weg des Speichern-Knopfs.
    const { V: G } = ladeKern();
    await G.depotAnlegen('Geber-Passwort-2026!');
    const datei = await G.depotSerialisieren();
    assert.equal(datei.kryptoVersion, G.CRYPTO_VERSION_ZERFALL,
      'Testannahme: depotSerialisieren() liefert heute V4 — bricht diese Zeile, ist die Praemisse ' +
      'dieses Tests ueberholt (Kryptoversion erneut gewechselt), nicht der urspruengliche Fund.');

    const Vv = await verwaltendeSeiteBereit('Verwaltend-Passwort-2026!');
    const eintrag = Vv.subDepotEinhaengen(datei, { bezeichnung: 'Geber', inhaberin: 'Geber' });

    assert.equal(eintrag.umschlag.kryptoVersion, 4, 'der eingehaengte Umschlag traegt die V4-Kennung');
    assert.ok(eintrag.umschlag.einheiten, 'einheiten muss im gespeicherten Umschlag stehen');
    assert.ok(Array.isArray(eintrag.umschlag.umschlagTabelle) && eintrag.umschlag.umschlagTabelle.length,
      'umschlagTabelle muss im gespeicherten Umschlag stehen');
    assert.equal(eintrag.umschlag.iv, undefined, 'ein V4-Umschlag traegt kein iv auf oberster Ebene');
    assert.equal(eintrag.umschlag.ct, undefined, 'ein V4-Umschlag traegt kein ct auf oberster Ebene');

    // VERBATIM (Kommentar am Kern selbst: „kein Re-Encrypt") — byte-identisch zur Quelle.
    assert.deepEqual(eintrag.umschlag.einheiten, datei.einheiten, 'einheiten muss byte-identisch uebernommen sein');
    assert.deepEqual(eintrag.umschlag.umschlagTabelle, datei.umschlagTabelle, 'umschlagTabelle muss byte-identisch uebernommen sein');
  });

  test('eine ganz normal gespeicherte V3-Datei haengt weiterhin unveraendert ein (Kontrolle, kein Rueckschritt)', async () => {
    const { V: G } = ladeKern();
    await G.depotAnlegen('Geber-V3-Passwort-2026!');
    const datei = await G.depotSerialisierenV3();

    const Vv = await verwaltendeSeiteBereit('Verwaltend-V3-Passwort-2026!');
    const eintrag = Vv.subDepotEinhaengen(datei, { bezeichnung: 'Geber', inhaberin: 'Geber' });

    assert.equal(eintrag.umschlag.kryptoVersion, 3);
    assert.equal(eintrag.umschlag.iv, datei.iv);
    assert.equal(eintrag.umschlag.ct, datei.ct);
    assert.equal(eintrag.umschlag.einheiten, undefined, 'ein V3-Umschlag traegt kein einheiten-Feld');
    assert.equal(eintrag.umschlag.umschlagTabelle, undefined, 'ein V3-Umschlag traegt kein umschlagTabelle-Feld');
  });

  test('pruefeBlackboxUmschlag bleibt fuer V4 genauso hart wie fuer V3 (nicht weicher)', async () => {
    const { V: G } = ladeKern();
    await G.depotAnlegen('Haerte-Passwort-2026!');
    const { V } = ladeKern();
    // Ueber umschlagAusDatei ziehen (nicht depotSerialisierenV3/V4 direkt) — genau die
    // Sechs-Felder-Form, die pruefeBlackboxUmschlag auch im echten Betrieb sieht (ohne
    // angehoerigenOrt, das dort bereits vorher abgeschnitten wird).
    const v3 = V.umschlagAusDatei(await G.depotSerialisierenV3());
    const v4 = V.umschlagAusDatei(await G.depotSerialisierenV4());

    // V3: ct fehlt.
    const v3KaputtesCt = { kryptoVersion: v3.kryptoVersion, depotUUID: v3.depotUUID, pbkdf2: v3.pbkdf2, depotSalt: v3.depotSalt, iv: v3.iv };
    assert.throws(() => V.pruefeBlackboxUmschlag(v3KaputtesCt), /Umschlag|Feld/);

    // V3: iv zu kurz.
    const v3KurzesIv = Object.assign({}, v3, { iv: 'AAAA' });
    assert.throws(() => V.pruefeBlackboxUmschlag(v3KurzesIv), /iv/);

    // V4: umschlagTabelle fehlt.
    const v4OhneTabelle = { kryptoVersion: v4.kryptoVersion, depotUUID: v4.depotUUID, pbkdf2: v4.pbkdf2, depotSalt: v4.depotSalt, einheiten: v4.einheiten };
    assert.throws(() => V.pruefeBlackboxUmschlag(v4OhneTabelle), /Umschlag|Feld|umschlagTabelle/);

    // V4: einheiten ist leer.
    const v4LeereEinheiten = Object.assign({}, v4, { einheiten: {} });
    assert.throws(() => V.pruefeBlackboxUmschlag(v4LeereEinheiten), /einheiten/);

    // V4: eine Einheit hat ein zu kurzes iv.
    const v4KaputteEinheit = JSON.parse(JSON.stringify(v4));
    const ersteAdr = Object.keys(v4KaputteEinheit.einheiten)[0];
    v4KaputteEinheit.einheiten[ersteAdr].iv = 'AAAA';
    assert.throws(() => V.pruefeBlackboxUmschlag(v4KaputteEinheit), /iv/);
  });

  test('pruefeBlackboxUmschlag prueft bei V4 die Adress-Konsistenz zwischen einheiten und umschlagTabelle[0].umschlaege', async () => {
    const { V: G } = ladeKern();
    await G.depotAnlegen('Adresstest-Passwort-2026!');
    const { V } = ladeKern();
    const sauber = V.umschlagAusDatei(await G.depotSerialisierenV4());   // sechs Felder, wie im echten Betrieb
    const verstuemmelt = JSON.parse(JSON.stringify(sauber));
    const ersteAdresse = Object.keys(verstuemmelt.einheiten)[0];
    delete verstuemmelt.einheiten[ersteAdresse];   // eine Einheit fehlt jetzt gegenueber der Umschlagtabelle

    assert.throws(() => V.pruefeBlackboxUmschlag(verstuemmelt), /Adresse|stimmen/);
  });

  test('eine unbekannte kryptoVersion faellt weiterhin durch, mit einer Meldung, die die Version nennt', async () => {
    const { V: G } = ladeKern();
    await G.depotAnlegen('Fremdversion-Passwort-2026!');
    const v3 = await G.depotSerialisierenV3();
    const fremd = Object.assign({}, v3, { kryptoVersion: 999 });

    const { V } = ladeKern();
    assert.throws(() => V.pruefeBlackboxUmschlag(fremd), /kryptoVersion/);
  });
});

describe('U2-ADR-235 — Rueckverschluesselungs-Pfade schreiben die gelesene Version zurueck, nie eine feste (Site 5+6)', () => {
  const { webcrypto } = require('node:crypto');
  function randB64(n) { const a = new Uint8Array(n); webcrypto.getRandomValues(a); return Buffer.from(a).toString('base64'); }
  // "Müller" mit Umlaut als NFC (ü = U+00FC) bzw. NFD (u + U+0308) — wie nfc-passwort.test.js.
  const BASIS = 'Müller-Sub-Geheim-2026';
  const NFC = BASIS.normalize('NFC');
  const NFD = BASIS.normalize('NFD');
  assert.notEqual(NFC, NFD, 'Test-Vorbedingung: NFC und NFD muessen sich unterscheiden');

  // Baut einen V4-Umschlag, dessen Schluessel aus dem ROHEN (nicht normalisierten) Passwort
  // abgeleitet ist — die Zerfall-Entsprechung zu craftLegacyUmschlag in nfc-passwort.test.js.
  // Nur ueber die NFD-Eingabe zu oeffnen (Versuch 1 mit der NFC-Ableitung scheitert absichtlich).
  async function craftLegacyZerfallUmschlag(V, rohPw, inhalt) {
    const pbkdf2SaltB64 = randB64(16);
    const depotSaltB64 = randB64(32);
    const pbkdf2Salt = V.base64ToBytes(pbkdf2SaltB64);
    const depotSalt = V.base64ToBytes(depotSaltB64);
    const depotUUID = V.uuidV4();
    const bits = await V.deriveMasterBits(rohPw, pbkdf2Salt);     // roh, KEINE Normalisierung
    const master = await V.importMasterHkdfKey(bits);
    const neu = await V._zerfallSchreiben(inhalt, {
      hkdfKey: master, pbkdf2Salt, depotSalt, depotUUID, fachName: null, ortHinweis: null, faecher: [],
    });
    return {
      kryptoVersion: neu.kryptoVersion, depotUUID,
      pbkdf2: { salt: pbkdf2SaltB64 }, depotSalt: depotSaltB64,
      einheiten: neu.einheiten, umschlagTabelle: neu.umschlagTabelle,
    };
  }

  test('subDepotEntsiegeln: NFD-Fallback bei einem V4-Sub-Depot oeffnet UND schreibt beim Re-Encrypt wieder V4 zurueck (nie V3)', async () => {
    const { V } = ladeKern();
    const inhalt = V.leeresDepot();
    inhalt.sektoren = inhalt.sektoren || {};
    inhalt.sektoren.identitaet = { vorname: 'ADR-235-Site5-Marke' };
    const legacy = await craftLegacyZerfallUmschlag(V, NFD, inhalt);
    assert.equal(legacy.kryptoVersion, V.CRYPTO_VERSION_ZERFALL, 'Testaufbau: der Legacy-Umschlag ist V4');

    const { inhalt: geoeffnet, reEncryptUmschlag } = await V.subDepotEntsiegeln(legacy, NFD);
    assert.equal(geoeffnet.sektoren.identitaet.vorname, 'ADR-235-Site5-Marke', 'ueber NFD-Fallback geoeffnet, Inhalt korrekt');

    assert.ok(reEncryptUmschlag, 'ein Re-Encrypt-Umschlag entsteht (NFD-Fallback erfolgreich)');
    assert.equal(reEncryptUmschlag.kryptoVersion, V.CRYPTO_VERSION_ZERFALL,
      'DIE KERNPROBE: der zurueckgeschriebene Umschlag bleibt V4 — nicht auf V3 heruntergeschrieben');
    assert.ok(reEncryptUmschlag.einheiten, 'einheiten muss am zurueckgeschriebenen Umschlag stehen');
    assert.ok(Array.isArray(reEncryptUmschlag.umschlagTabelle) && reEncryptUmschlag.umschlagTabelle.length,
      'umschlagTabelle muss am zurueckgeschriebenen Umschlag stehen');
    assert.equal(reEncryptUmschlag.iv, undefined, 'kein V3-Feld an einem Umschlag, der V4 behauptet');
    assert.equal(reEncryptUmschlag.ct, undefined, 'kein V3-Feld an einem Umschlag, der V4 behauptet');
    assert.equal(reEncryptUmschlag.depotUUID, legacy.depotUUID, 'Identitaet bleibt stabil');

    // Und der neue Umschlag oeffnet jetzt mit der NFC-Eingabe ueber Versuch 1 (kein Fallback mehr noetig).
    const { inhalt: nachRundlauf } = await V.subDepotEntsiegeln(reEncryptUmschlag, NFC);
    assert.equal(nachRundlauf.sektoren.identitaet.vorname, 'ADR-235-Site5-Marke', 'nach Re-Encrypt mit NFC-Eingabe geoeffnet, Inhalt erhalten');
  });

  test('subDepotEigenerPasswortWechsel: bei einem V4-Sub-Depot bleibt der neue Umschlag V4 (kryptoVersion und Form stimmen ueberein)', async () => {
    const { V } = ladeKern();
    await V.depotAnlegen('Anker-fuer-Wechsel-2026!');
    const personId = V.personSicherstellen('Verwalterin');
    V.setzeSitzungsAkteur({ personId, eigenschaft: 'selbst' });

    const { V: G } = ladeKern();
    await G.depotAnlegen('Alt-Sub-Passwort-2026!');
    const gData = G.depotNormalisieren();
    gData.sektoren = gData.sektoren || {};
    gData.sektoren.identitaet = gData.sektoren.identitaet || {};
    gData.sektoren.identitaet.vorname = 'ADR-235-Site6-Marke';
    const datei = await G.depotSerialisieren();
    assert.equal(datei.kryptoVersion, V.CRYPTO_VERSION_ZERFALL, 'Testaufbau: die Quelldatei ist V4');

    const eintrag = V.subDepotEinhaengen(datei, { bezeichnung: 'Test', inhaberin: 'Test' });
    const neuerUmschlag = await V.subDepotEigenerPasswortWechsel(eintrag.umschlag, 'Alt-Sub-Passwort-2026!', 'Neu-Sub-Passwort-2026!');

    assert.equal(neuerUmschlag.kryptoVersion, V.CRYPTO_VERSION_ZERFALL, 'DIE KERNPROBE (Site 6): kryptoVersion bleibt 4');
    assert.ok(neuerUmschlag.einheiten, 'einheiten muss am neuen Umschlag stehen — nicht nur die Kennung behaupten');
    assert.ok(Array.isArray(neuerUmschlag.umschlagTabelle) && neuerUmschlag.umschlagTabelle.length,
      'umschlagTabelle muss am neuen Umschlag stehen');
    assert.equal(neuerUmschlag.iv, undefined, 'kein V3-Feld an einem Umschlag, der V4 behauptet');
    assert.equal(neuerUmschlag.ct, undefined, 'kein V3-Feld an einem Umschlag, der V4 behauptet');
    assert.equal(neuerUmschlag.depotUUID, eintrag.umschlag.depotUUID, 'Identitaet bleibt stabil');

    const { inhalt } = await V.subDepotEntsiegeln(neuerUmschlag, 'Neu-Sub-Passwort-2026!');
    assert.equal(inhalt.sektoren.identitaet.vorname, 'ADR-235-Site6-Marke', 'Inhalt ueberlebt den Passwortwechsel');
    await assert.rejects(() => V.subDepotEntsiegeln(neuerUmschlag, 'Alt-Sub-Passwort-2026!'),
      'das alte Passwort oeffnet den neuen Umschlag nicht mehr');
  });
});
