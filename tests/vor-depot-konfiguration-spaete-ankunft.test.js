'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-182 Nachtrag (28.08.2026, Fund xShare):
   spät eintreffendes Vor-Depot-Ergebnis muss Sidebar/Kopfzeile trotzdem
   nachziehen, wenn die Bürgerin inzwischen schon im echten Depot ist
   ────────────────────────────────────────────────────────────────────────
   BEFUND: die Depot-Pille in der Kopfzeile zeigte bei einem Live-Test
   weiterhin "Mein Depot", obwohl das Vor-Depot-Englisch-Paket aktiv war.
   Zwei sorgfältige, faithful Nachbauten des Standard-Flows (Vor-Depot →
   Willkommensschirm → depotAnlegen → betreteApp, SYNCHRON) zeigten dabei
   KEIN Problem — STRINGS.depotPilleEigen kam korrekt englisch zurück. Der
   Fund reproduziert also nicht über die Daten-Logik selbst.

   ECHTE URSACHE (gefunden beim Lesen von booteEingang()):
   `vorDepotKonfigurationAnwenden()` läuft NEBENHER (fire-and-forget, das
   Skript lädt asynchron). Der `.then()`-Callback rief bisher NUR bei
   `!data` renderWelcome() — war die Bürgerin SCHNELLER im echten Depot als
   das Vor-Depot-Skript im Laden (plausibel bei einer institutionellen
   Subdomain mit echter Netzwerk-Latenz, anders als hier im Test), traf das
   späte Ergebnis auf ein bereits offenes Depot — und NICHTS rendert die
   Sidebar/Kopfzeile danach neu. STRINGS/SEKTOREN sind längst aktualisiert,
   nur niemand hat es der Chrome gesagt.

   BEWUSST NICHT GETESTET: der echte <script>-Tag-Ladeweg selbst
   (_vorDepotSkriptLaden) — der Test-DOM-Stub feuert kein `load`, der
   interne 3-Sekunden-Zeitdeckel würde jeden Testlauf künstlich verlangsamen
   und einen hängenden Timer hinterlassen. Stattdessen: derselbe explizite
   Bündel-Weg wie in vor-depot-konfiguration-anwenden.test.js, aber ERST
   NACH depotAnlegen()/betreteApp() aufgerufen — das IST die späte Ankunft,
   nur ohne die Skript-Lade-Verzögerung selbst nachzubilden. Was danach
   passieren MUSS (Sidebar/Kopfzeile ziehen nach), ist exakt dieselbe Zeile
   wie in booteEingang() — hier als eigenständiger Beleg, nicht kopiert.

   NICHT ÜBERSCHRIEBEN WERDEN DARF: renderContent()/#content — eine Eingabe
   mitten im Tippen ginge sonst verloren (unverändert, s. Kommentar in
   booteEingang()). Dieser Test prüft nur, was NACHZIEHEN MUSS (Chrome),
   nicht, was stehen bleiben MUSS (Daten) — die Rot-Beweis-Pflicht darunter
   holt beides ein.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK });

async function signiertesKernBuendel(V, modul) {
  // Weg A (U2-ADR-181, "vivodepot/kern"): EIN Schlüssel signiert BEIDES — das Zertifikat UND
  // den Modul-Inhalt — und das Zertifikat behauptet genau diesen Schlüssel als eigenen
  // publicKeyJwk (selbstreferenziell, direkt gegen den Anker). Hier: der Sentinel-Anker selbst
  // steht für den Anker (SENTINEL_PRIVATE_JWK signiert, SENTINEL_PUBLIC_JWK wird behauptet UND
  // ist der Anker, den opts.ankerJwk injiziert) — derselbe Aufbau wie in
  // tests/vc-issuer-schnellweg-vivodepot-kern.test.js.
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const vc = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2036-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'vivodepot', anbieterTyp: 'vivodepot/kern', anbieterName: 'Vivodepot', publicKeyJwk: SENTINEL_PUBLIC_JWK },
  };
  const providerCredentialJws = await V._signJWS(vc, signKey, {});
  const modulSignaturJws = await V._signJWS(modul, signKey, {});
  return { providerCredentialJws, modulSignaturJws };
}

const EN_MODUL = Object.freeze({ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot', texte: { 'strings:depotPilleEigen.text': 'My vault' } });

test('[Vor-Depot·Rot-Beweis] OHNE Nachzieh-Schritt bliebe die Kopfzeile deutsch — belegt, dass der Fund real war, nicht nur behauptet', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.betreteApp();
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Mein Depot', 'Vorbedingung: Kopfzeile startet deutsch');

  const buendel = await signiertesKernBuendel(V, EN_MODUL);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);   // "spät" eingetroffen, data existiert schon
  // KEIN renderTopbar()/renderSidebar() hier — genau der Zustand VOR dem Fix.
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Mein Depot',
    'STRINGS ist längst englisch, aber ohne Nachzieh-Schritt zeigt die Kopfzeile das trotzdem nicht — das war der gemeldete Fund.');
  assert.equal(V.STRINGS.depotPilleEigen, 'My vault', 'zur Kontrolle: die Daten SIND aktuell, nur die Kopfzeile weiß es noch nicht');
});

test('[Vor-Depot] spät eintreffendes Bündel: Kopfzeile zieht nach, sobald data bereits existiert', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.betreteApp();
  assert.equal(document.getElementById('tb-depot-name').textContent, 'Mein Depot', 'Vorbedingung: Kopfzeile startet deutsch');

  const buendel = await signiertesKernBuendel(V, EN_MODUL);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  // Das ist die Nachzieh-Zeile, die booteEingang()s .then()-Callback jetzt auch bei
  // bereits vorhandenem data ausführt (vivodepot.html, booteEingang()) — hier als eigener,
  // von der Skript-Lade-Mechanik unabhängiger Beleg, dass sie das Problem tatsächlich behebt.
  V.renderSidebar();
  V.renderTopbar();

  assert.equal(document.getElementById('tb-depot-name').textContent, 'My vault', 'Kopfzeile muss nach dem Nachzieh-Schritt englisch zeigen');
});

test('[Vor-Depot] spät eintreffendes Bündel: renderSidebar() lässt sich gefahrlos ein zweites Mal aufrufen (kein Absturz, keine Dopplung)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.betreteApp();
  const vorher = document.getElementById('sidebar').innerHTML.length;
  const buendel = await signiertesKernBuendel(V, EN_MODUL);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  assert.doesNotThrow(() => V.renderSidebar());
  const nachher = document.getElementById('sidebar').innerHTML.length;
  assert.ok(nachher > 0 && Math.abs(nachher - vorher) < vorher, 'ein erneutes renderSidebar() ersetzt den Inhalt, dopplet ihn nicht');
});

test('[Vor-Depot·Gegenprobe] booteEingang()s eigener .then()-Zweig: kein Depot offen → weiterhin nur renderWelcome(), kein Absturz durch die neue Chrome-Verzweigung', async () => {
  const { V, document } = ladeKern();
  // Kein depotAnlegen() — data bleibt null, wie beim allerersten Aufruf. booteEingang() lief
  // schon einmal automatisch beim Laden (load-kern.js) — hier nur geprüft, dass ein zweiter,
  // manueller Aufruf im "kein Depot"-Zustand nicht wirft (die if(!data)-Kurzschluss-Rückkehr
  // muss weiterhin vor dem neuen renderSidebar()/renderTopbar()-Zweig greifen).
  assert.doesNotThrow(() => V.booteEingang());
});
