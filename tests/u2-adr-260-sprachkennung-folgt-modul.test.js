'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-260 Posten 2 (04.09.2026, Auftrag) — `lang` folgt der aktiven
   Sprache, nicht dem Zustand des eingebauten DE/EN-Schalters
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, selbst gemessen und nicht aus dem Bericht übernommen. Der Bericht
   (Fundsachen-Erhebung, Posten B10) nannte ein statisches `<html lang="de">` in
   der ausgelieferten englischen Modul-App und war gegen Build v486 gemessen.
   Nachgemessen am 04.09.2026 in echtem Chromium über HTTP gegen die tatsächlich
   ausgelieferte App (`module-apps/englisch`, inzwischen v501):

       Start        lang="en"   Text englisch   → richtig (U2-ADR-208 wirkt)
       1× geschaltet lang="en"  Text englisch   → richtig
       2× geschaltet lang="de"  Text ENGLISCH   → falsch

   Der Fund des Berichts ist also behoben, sein Symptom aber mit zwei Klicks
   wiederherstellbar: `vorDepotSpracheUmschalten()` schrieb seinen eigenen
   Zustand (`_vorDepotSprache`, kennt nur 'de' und 'en') roh nach
   `document.documentElement.lang` und überschrieb damit die Kennung des
   angedockten Sprachmoduls. Sichtbar bleibt der Modultext (STRINGS), weil
   `vorDepotText` für alles ausserhalb von PRE_DEPOT_EN dorthin zurückfällt.
   WCAG 2.2 SC 3.1.1 (Stufe A): eine Vorleserin bekäme deutsche Aussprache für
   englischen Text.

   WAS DIESER TEST HÄLT: die Kennung kommt aus der AKTIVEN Sprache, nicht aus
   zwei festen Werten. Darum prüft er ausdrücklich mit einem DRITTEN Sprachmodul
   (Ungarisch) — ein hartes 'en' statt eines harten 'de' wäre derselbe Fehler
   mit anderem Vorzeichen und käme durch einen reinen DE/EN-Vergleich glatt
   hindurch.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

/* FESTE Kennung, kein `.label` (Fund/Auflage 18.09.2026): die beiden
   U2-ADR-278-Gegenproben unten pflanzten bis heute `'health.label'` — eine Kennung, die
   `_eingebauteBereichsBeschriftungVerwerfen` (Kaperungs-Sperre gegen Depot-/angedockte
   Module, die eine eingebaute Bereichs-Beschriftung überschreiben) seit heute zurücksetzt.
   Ihr Gegenstand ist aber die Sprachkennung (`lang`), nicht Bereichs-Beschriftungen — die
   Kennung ist nur das FAHRZEUG, das den Textsatz-Weg auslöst. `mobility.einfuehrungstext`
   ist KEINE Bereichs-Beschriftung (Suffix `einfuehrungstext`, nicht in
   `_BEREICH_ARTEN_OHNE_MODUL` = ['label', 'navUnterzeile']) — kategorisch nie geschützt,
   unabhängig davon, welche Bereiche künftig nativ sind. */
const TEXTSATZ_PROBE_KENNUNG = 'mobility.einfuehrungstext';

/* Signier-Helfer — derselbe Aufbau wie tests/vor-depot-konfiguration-anwenden.test.js.
   Der Vor-Depot-Kanal verschafft KEINEN Vertrauensvorschuss: jedes Bündel läuft durch
   modulEinlassenGeprueft (volle Zertifikatskette). Ein Test, der das umgeht, würde einen
   Weg prüfen, den die Bürgerin nie sieht. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-08-28T09:00:00Z' });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  return V._signJWS(payload, await V._jwsImportSignKey(privJwk), {});
}
/* Dockt ein signiertes Sprachmodul über den echten Vor-Depot-Weg an — genau den Weg, den
   eine verpackte Modul-App nimmt (tools/modul-app-packen.js legt das Bündel als
   `vorabkonfiguration.js` neben die App). */
async function spracheAndocken(V, sprache, texte) {
  const anbieter = await wegwerfKeypair();
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache, texte: texte || {} };
  const buendel = {
    providerCredentialJws: await signieren(V, anbieterCertRohling('institution/u2-adr-260', anbieter.pubJwk), SENTINEL_PRIVATE_JWK),
    modulSignaturJws: await signieren(V, modul, anbieter.privJwk),
  };
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
}

/* GRENZE DES MESSMODELLS, benannt statt umgangen: den Aufruf beim ANKOMMEN des Moduls macht
   `vorDepotKonfigurationAnwenden()` über `textsatzSprachkennungAnwenden()` — und der schreibt
   per `setAttribute`, das der DOM-Stub in tests/load-kern.js als noop führt. Im Stub ist dieser
   eine Schritt darum unsichtbar; im echten Browser ist er gemessen (04.09.2026, Chromium über
   HTTP gegen module-apps/englisch: Start `lang="en"`). Was dieser Test hält, ist deshalb die
   AUFLÖSUNG und der Schalterweg — beides schreibt die Eigenschaft und ist hier beobachtbar. */
test('[U2-ADR-260·lang] das angedockte Sprachmodul bestimmt die Kennung', async () => {
  const { V } = ladeKern();
  await spracheAndocken(V, 'en', { 'health.label': 'Health' });
  assert.equal(V.textsatzSpracheAktiv(), 'en', 'Vorbedingung: das Modul ist angedockt');
  assert.equal(V.vorDepotSprachkennung(), 'en');
  const dok = { documentElement: {} };
  assert.equal(V.vorDepotSprachkennungAnwenden(dok), 'en');
  assert.equal(dok.documentElement.lang, 'en');
});

test('[U2-ADR-260·lang·der gemessene Fund] zweimal schalten nimmt dem Modul die Kennung NICHT mehr weg', async () => {
  const { V, document } = ladeKern();
  await spracheAndocken(V, 'en', { 'health.label': 'Health' });

  V.vorDepotSpracheUmschalten();   // → eingebautes Englisch (PRE_DEPOT_EN)
  assert.equal(document.documentElement.lang, 'en',
    'Stellung „en": der Schirm zeigt den eingebauten englischen Satz — englisch bleibt englisch');

  V.vorDepotSpracheUmschalten();   // → zurück; die Texte stellt weiterhin das Modul
  assert.equal(document.documentElement.lang, 'en',
    'DAS IST DER FUND: der Schalter stand wieder auf „de", der sichtbare Text kam aber weiter aus '
    + 'dem englischen Modul — `lang="de"` bei englischem Text ist WCAG 2.2 SC 3.1.1 (Stufe A)');
  assert.equal(V.SEKTOREN.find((s) => s.id === 'health').label, 'Health',
    'Beleg im selben Lauf, dass der sichtbare Text tatsächlich englisch geblieben ist — sonst '
    + 'prüfte die Zeile darüber eine Behauptung statt eines Zustands');
});

test('[U2-ADR-260·lang] ein DRITTES Sprachmodul wird richtig deklariert — keine zwei festen Werte', async () => {
  const { V, document } = ladeKern();
  await spracheAndocken(V, 'hu', { 'health.label': 'Egészség' });
  assert.equal(V.vorDepotSprachkennung(), 'hu');

  V.vorDepotSpracheUmschalten();   // Stellung „en": eingebautes Englisch gewinnt über die Modultexte
  assert.equal(document.documentElement.lang, 'en',
    'in Stellung „en" zeigt der Schirm PRE_DEPOT_EN — dann ist er englisch, nicht ungarisch');

  V.vorDepotSpracheUmschalten();   // zurück: die Modultexte stellen den Schirm
  assert.equal(document.documentElement.lang, 'hu',
    'ein hartes „en" oder „de" statt der aufgelösten Sprache wäre derselbe Fehler mit anderem '
    + 'Vorzeichen — genau das fängt dieser dritte Sprachfall');
});

test('[U2-ADR-260·lang·Gegenprobe] OHNE Modul bleibt der Schalter die Quelle — unverändert de/en', () => {
  const { V, document } = ladeKern();
  assert.equal(V.textsatzSpracheAktiv(), 'de', 'Vorbedingung: kein Sprachmodul angedockt');
  V.vorDepotSpracheUmschalten();
  assert.equal(document.documentElement.lang, 'en');
  V.vorDepotSpracheUmschalten();
  assert.equal(document.documentElement.lang, 'de',
    'ohne Modul darf sich nichts geändert haben — U2-ADR-208 bleibt in Kraft');
});

test('[U2-ADR-260·lang] die Auflösung ist ohne DOM prüfbar und liefert dieselbe Kennung', async () => {
  const { V } = ladeKern();
  assert.equal(V.vorDepotSprachkennung(), 'de');
  await spracheAndocken(V, 'hu', {});
  assert.equal(V.vorDepotSprachkennung(), 'hu');
  // Und das Anwenden auf ein FREMDES Dokument schreibt dieselbe Kennung dorthin —
  // die Funktion hängt nicht am globalen `document`.
  const dok = { documentElement: {} };
  assert.equal(V.vorDepotSprachkennungAnwenden(dok), 'hu');
  assert.equal(dok.documentElement.lang, 'hu');
});

test('[U2-ADR-260·lang·Positivkontrolle] die alte Fassung fällt bei genau dieser Probe durch', async () => {
  // Die alte Zeile, wörtlich: `document.documentElement.lang = _vorDepotSprache;`
  // Nachgebaut als reine Funktion über denselben Zustand — ein Test, der nur die neue
  // Fassung fährt, könnte grün sein, ohne dass die Probe je etwas unterschieden hätte.
  const alteFassung = (schalterZustand /* _vorDepotSprache */) => schalterZustand;
  assert.equal(alteFassung('de'), 'de');

  const { V } = ladeKern();
  await spracheAndocken(V, 'hu', {});
  V.vorDepotSpracheUmschalten();   // → 'en'
  V.vorDepotSpracheUmschalten();   // → Schalterzustand wieder 'de'
  assert.notEqual(V.vorDepotSprachkennung(), alteFassung('de'),
    'neue und alte Fassung liefern denselben Wert — dann misst die Probe den Unterschied nicht');
  assert.equal(V.vorDepotSprachkennung(), 'hu');
});

/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-278 (05.09.2026) — dieselbe Krankheit, eine zweite Auslöseform, die
   U2-ADR-208 nicht sah: ein Modul für die aktive Sprache EXISTIERT, ist aber
   nur unter einem ANDEREN Rechtsraum registriert (kein `''`-Fach). `textLesen()`
   fiel schon vorher auf `AB_WERK_TEXTSATZ_DE` zurück (immer Deutsch, s. Zeile
   6413 — der einzige Rückfallzweig, kein Modul kann ihn ersetzen); `sprachkennung`
   behauptete bis zu diesem Bau trotzdem die neue Sprache — Vorlese-Stimme und
   `document.lang` sagten Englisch, jedes sichtbare Wort blieb Deutsch. Diese
   Fälle docken direkt im BESTEHENDEN Depot (nicht über den Vor-Depot-Kanal wie
   oben), weil `textsatzRechtsraumAktiv()` `data.rechtsraum` liest — ohne Depot
   ist der Rechtsraum immer leer, der Fehler kann dort nie auftreten. */
function textsatzModulEinlassenRoh(V, modul) {
  // `modulEinlassen()` allein schreibt nur in `d.textsatzModule` — `data.textsprache` und die
  // Registry (`_TEXTSATZ_MODUL_REGISTRY`) bekommt erst `_moduleEinlassWirken(r)`, der EINE
  // Aufrufer im echten Weg (`modDatei.onchange`, vivodepot.html:38800). Beide hier aufgerufen,
  // sonst prüfte diese Probe eine Registry, die kein Bürgerweg je herstellt.
  const r = V.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, 'Vorbedingung dieser Proben: das Modul selbst muss gültig sein — ' + (r.grund || ''));
  V._moduleEinlassWirken(r);
}

test('[U2-ADR-278] Rechtsraum passt NICHT, kein rechtsraumloses Fach — die Kennung bleibt beim eingebauten Rückfall', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('u2-adr-278-pw');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.rechtsraum = 'DE';
  V.setData(d);
  textsatzModulEinlassenRoh(V, { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'my',
    rechtsraum: 'MY', texte: { 'health.label': 'Kesihatan' } });
  assert.equal(V.getData().textsprache, 'my', 'Vorbedingung: das Modul ist jetzt die aktive Sprache');
  // U2-ADR-363 (Zug 2, 07.09.2026): textLesen() faellt nicht mehr auf AB_WERK_TEXTSATZ_DE
  // zurueck — kein Fach für Rechtsraum DE und kein leeres Fach heisst jetzt `null`, nicht mehr
  // der eingebaute deutsche Text. Der eigentliche FUND dieser Probe (Sprachkennung bleibt
  // korrekt trotz fehlendem Fach) steht unveraendert in der Zeile darunter.
  assert.equal(V.textLesen('health.label'), null,
    'kein Fach für Rechtsraum DE und kein leeres Fach — keine Kennung findet einen Satz, also null');
  assert.equal(V.textsatzRegeln().sprachkennung, 'de-DE',
    'DAS IST DER FUND: ohne diese Behebung stand hier "my" — Vorlese-Stimme/`lang` behaupteten '
    + 'Malaiisch, während jeder Text deutsch blieb (WCAG 2.2 SC 3.1.1)');
});

test('[U2-ADR-278·Gegenprobe] Rechtsraum passt — der Normalfall bleibt unverändert (nichts hier gebaut)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('u2-adr-278-pw-2');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.rechtsraum = 'MY';
  V.setData(d);
  textsatzModulEinlassenRoh(V, { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'my',
    rechtsraum: 'MY', texte: { [TEXTSATZ_PROBE_KENNUNG]: 'Kesihatan' } });
  assert.equal(V.textLesen(TEXTSATZ_PROBE_KENNUNG), 'Kesihatan', 'Vorbedingung: der Modultext wird wirklich gefunden');
  assert.equal(V.textsatzRegeln().sprachkennung, 'my',
    'passender Rechtsraum ist der Pfad, den U2-ADR-260 schon grün hält — diese Behebung fasst ihn nicht an');
});

test('[U2-ADR-278·Gegenprobe] kein erklärter Rechtsraum am Modul (das ""-Fach) — funktioniert unabhängig vom aktiven Rechtsraum', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('u2-adr-278-pw-3');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.rechtsraum = 'DE';
  V.setData(d);
  textsatzModulEinlassenRoh(V, { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'my',
    texte: { [TEXTSATZ_PROBE_KENNUNG]: 'Kesihatan' } });   // kein `rechtsraum`-Schlüssel → ""-Fach
  assert.equal(V.textLesen(TEXTSATZ_PROBE_KENNUNG), 'Kesihatan');
  assert.equal(V.textsatzRegeln().sprachkennung, 'my',
    'der dokumentierte Normalfall (Kammer-Vorlagen für genau ein Land brauchen keinen Rechtsraum) bleibt unverändert');
});

test('[U2-ADR-278·Positivkontrolle] die alte Fassung fällt bei genau dieser Probe durch', async () => {
  // Die alte Zeile, wörtlich: `raus.sprachkennung = sprache;` VOR jeder Prüfung von `modul`.
  const alteFassung = (sprache) => sprache;

  const { V } = ladeKern();
  await V.depotAnlegen('u2-adr-278-pw-4');
  V.akteurSelbstErklaeren('B');
  const d = V.getData();
  d.rechtsraum = 'DE';
  V.setData(d);
  textsatzModulEinlassenRoh(V, { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'my',
    rechtsraum: 'MY', texte: { 'health.label': 'Kesihatan' } });
  assert.notEqual(V.textsatzRegeln().sprachkennung, alteFassung('my'),
    'neue und alte Fassung liefern im Fehlerfall denselben Wert — dann misst die Probe den Unterschied nicht');
  assert.equal(V.textsatzRegeln().sprachkennung, 'de-DE');
});
