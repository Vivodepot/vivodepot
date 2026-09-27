'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Lese-App (Klasse-A) — vivodepot-lesen.html (Komponente 2)
   ────────────────────────────────────────────────────────────────────────
   Prüft den Empfänger-Workflow End-to-End über die DOM-freien Kern- und
   Render-Funktionen der Lese-App, gegen vom Kern (Bürger-App) erzeugte Daten.

     T-A-01 Krypto-Roundtrip   — ein in der Bürger-App verschlüsselt gespeichertes
                                 Depot in der Lese-App öffnen → Inhalt feldweise gleich.
     T-A-02 Block-Integrität   — VdCrypto-Block-Hash der Lese-App == Kern (732ff4b0…).
     T-A-03 Read-only-Disziplin — keine Bearbeiten-/Schreib-/Re-Export-API; HTML ohne
                                 input/contenteditable in der Lese-Sicht.
     T-A-04 Sub-Modus-Erkennung — Sub-Depot-Blackbox wird als 'blackbox' erkannt,
                                 mit Sub-Passwort entsiegelbar, Sub-Modus gesetzt.
     T-A-05 Provenienz-Anzeige  — Stempel mit eingabeDurchName zeigt „von [Name]";
                                 ohne Stempel / Stempel vom Anker selbst: nichts.
     T-A-06 Notfall-QR          — QR-Klartext der Bürger-App-Papier-Karte → Notfall-
                                 Sicht zeigt die Akut-Felder.
     T-A-07 Keine Persistenz    — entladen() nullt alles; die Datei nutzt keinerlei
                                 localStorage/sessionStorage/IndexedDB/Cookies/Netz.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeLesen, kryptoBlock, sha256, BLOCK_HASH_ERWARTET, LESEN_PATH } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

// Ein vom Kern erzeugter, verschlüsselter Vollexport-Umschlag + die Klartext-Daten.
async function kernDepotUmschlag(password) {
  const { V: K } = ladeKern();
  await K.depotAnlegen(password);
  const d = K.getData();
  d.sektoren.identity = { vorname: 'Maria', nachname: 'Mustermann', geburtsdatum: '1980-04-12' };
  d.sektoren.health = { blutgruppe: '0 negativ', allergien: 'Penicillin', medikamente: 'L-Thyroxin 50' };
  d.sektoren.advanceCare   = { organspende: 'ja', patientenverf_ort: 'Ordner Wichtiges, Schrank' };
  d.menschen = [{ id: 'p1', name: 'Anna Schmidt' }];
  K.setData(d);
  const umschlag = await K.depotSerialisieren();
  return { umschlag, daten: d };
}

test('[Klasse-A] T-A-01 Krypto-Roundtrip: Bürger-App verschlüsselt → Lese-App entschlüsselt feldweise gleich', async () => {
  const password = 'GeheimesPasswort-2026!';
  const { umschlag, daten } = await kernDepotUmschlag(password);
  const { V: L } = ladeLesen();
  const obj = await L.leseDepotUmschlag(umschlag, password);
  /* A345 (19.08.2026): der Vergleich läuft KANONISCH, nicht über die rohe Zeichenkette.
     Der Zerfall in Feld-Einheiten setzt das Depot aus Einheiten zusammen, deren
     Reihenfolge den Adressen folgt (also dem HMAC) — die Schlüssel-REIHENFOLGE eines
     JSON-Objekts ist danach eine andere. Das war nie eine Zusicherung, und der Test
     hieß von Anfang an „feldweise gleich": geprüft wird der Inhalt, nicht die
     Schreibreihenfolge. Der Unterschied ist gemessen, nicht angenommen — bei einem
     Rundlauf über die Stufe weicht kein einziger PFAD ab, nur die Reihenfolge. */
  const kanonisch = (o) => JSON.stringify(o, (k, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const r = {}; for (const x of Object.keys(v).sort()) r[x] = v[x]; return r;
    }
    return v;
  });
  assert.equal(kanonisch(obj), kanonisch(daten), 'entschlüsseltes Depot muss feldweise dem Original gleichen');
  assert.deepEqual(Object.keys(obj).sort(), Object.keys(daten).sort(), 'derselbe Schlüsselsatz');
  assert.equal(obj.sektoren.health.blutgruppe, '0 negativ');

  // Falsches Passwort: GCM/AAD-Fehler → wirft (kein stiller Teilerfolg).
  await assert.rejects(() => L.leseDepotUmschlag(umschlag, 'falsch'), 'falsches Passwort muss werfen');
});

test('[Klasse-A] T-A-02 Block-Integrität: VdCrypto-Block-Hash der Lese-App == Kern (732ff4b0…)', () => {
  const { script1 } = ladeLesen();
  const hash = sha256(kryptoBlock(script1));
  assert.equal(hash, BLOCK_HASH_ERWARTET, 'VdCrypto-Block der Lese-App muss byte-identisch zum Kern sein (732ff4b0…)');

  // Der gemeinsame JWS-Block muss ebenfalls vorhanden und der Sentinel eingebettet sein.
  const { V: L } = ladeLesen();
  assert.equal(typeof L._verifyJWS, 'function', 'JWS-Block (_verifyJWS) muss eingebettet sein');
  assert.equal(L.TEST_SENTINEL_ISSUER, 'did:web:vivodepot.de', 'Test-Sentinel-Issuer muss eingebettet sein');
  assert.equal(L.istTestSentinelKey(L.TEST_SENTINEL_PUBLIC_JWK), true, 'Sentinel-Erkennung muss greifen');
});

test('[Klasse-A] T-A-03 Read-only-Disziplin: keine Schreib-/Re-Export-API, Lese-Sicht ohne Eingabefelder', async () => {
  const { V: L } = ladeLesen();
  // Es darf keinerlei Schreib-/Speicher-/Export-API geben.
  for (const verboten of [
    'depotSerialisieren', 'depotHerunterladen', 'sektorFeldSetzen', 'situationFeldSetzen',
    'bearbeitungSpeichern', 'listenEintragHinzufuegen', 'vollExportJSON', 'flowFormatExport',
    'subDepotVersiegeln', 'subDepotEinhaengen',
  ]) {
    assert.equal(L[verboten], undefined, 'Lese-App darf keine Schreib-/Export-API exportieren: ' + verboten);
  }
  // Die gerenderte Lese-Sicht trägt keine Eingabe-/Bearbeiten-Elemente.
  const { umschlag, daten } = await kernDepotUmschlag('pw-readonly-1');
  void umschlag;
  L.setData(daten);
  const html = L.sektorHTML('identitaet') + L.situationContentHTML('geburt');
  assert.ok(!/<input/i.test(html), 'Lese-Sicht darf kein <input> enthalten');
  assert.ok(!/<textarea/i.test(html), 'Lese-Sicht darf kein <textarea> enthalten');
  assert.ok(!/contenteditable/i.test(html), 'Lese-Sicht darf kein contenteditable enthalten');
  assert.ok(!/Bearbeiten|Speichern|Hinzufügen/i.test(html), 'Lese-Sicht darf keine Bearbeiten-Knöpfe tragen');

  /* ══ GESCHÄRFT am 20.08.2026 (Kette, Auftrag 8, Zug 2) ═══════════════════════════════
     BIS HIERHER: die Lese-App durfte GAR KEINEN Download-Pfad tragen. Die Zusicherung
     dahinter ist die Read-only-Disziplin: der Empfänger darf aus dem, was er zu sehen
     bekommt, keine zweite Datei machen — vor allem nicht aus einem geöffneten DEPOT.

     WARUM SIE GESCHÄRFT UND NICHT AUFGEWEICHT WIRD: Auftrag 8, Zug 2 verlangt ausdrücklich
     „entschlüsseln, anzeigen, ALS DATENSATZ WEITERGEBEN". Die Fachanwendung einer Behörde
     liest JSON, keinen Bildschirm; ohne diesen einen Weg endete die Antwort im Abtippen.
     Der Gegenstand ist ein anderer als der geschützte: nicht ein Depot, sondern GENAU der
     Datensatz, den die Bürgerin auf eine Anfrage hin freigegeben hat.

     DIE NEUE FASSUNG IST STRUKTURELL: es gibt GENAU EINEN Download-Pfad, er steht in
     `antwortWeitergeben`, und er serialisiert `antwortDatensatz` — nie `data`. Ein zweiter
     Pfad oder ein Pfad über das Depot lässt die Probe anschlagen.

     ⚠ DIESE ABSCHWÄCHUNG IST EINE PRODUKTENTSCHEIDUNG und im Bericht zu Auftrag 8
     namentlich gemeldet. Wer sie zurücknehmen will, nimmt damit auch Zug 2 zurück. */
  const file = fs.readFileSync(LESEN_PATH, 'utf8');
  const downloads = file.match(/\.download\s*=/g) || [];
  assert.equal(downloads.length, 1,
    'GENAU EIN Download-Pfad (die Antwort-Weitergabe aus Auftrag 8) — gefunden: ' + downloads.length);
  const fn = file.slice(file.indexOf('function antwortWeitergeben('));
  assert.ok(fn.slice(0, fn.indexOf('\n}')).includes('.download ='),
    'der eine Download-Pfad steht in antwortWeitergeben() und nirgends sonst');
  assert.ok(!/JSON\.stringify\(\s*data\b/.test(file),
    'ein geöffnetes DEPOT wird nirgends serialisiert — das bleibt verboten');
  assert.ok(!/new Blob\(\s*\[\s*JSON\.stringify\(\s*data\b/.test(file),
    'und erst recht nicht in eine Datei geschrieben');
});

test('[Klasse-A] T-A-04 Sub-Modus-Erkennung: Blackbox-Datei erkannt, Sub-Passwort entsiegelt, Sub-Modus gesetzt', async () => {
  const { V: K } = ladeKern();
  await K.depotAnlegen('anker-pw');
  const inhalt = { schemaVersion: 20, sektoren: { identitaet: { vorname: 'Bernd', nachname: 'Beispiel' } }, menschen: [], situationen: {} };
  const umschlag = await K.subDepotVersiegeln(inhalt, 'sub-geheim-9');
  const datei = K.blackboxDateiAusUmschlag(umschlag);

  const { V: L } = ladeLesen();
  assert.equal(L.erkenneFormat(datei), 'blackbox', 'Blackbox-Datei muss als blackbox erkannt werden');

  // Mit dem Sub-Passwort entsiegelbar, Inhalt korrekt.
  const dec = await L.leseSubUmschlag(datei.umschlag, 'sub-geheim-9');
  // U2-ADR-002 (23.09.2026, S1): V4 setzt den Inhalt aus Einheiten zusammen — die Schlüssel-REIHENFOLGE ist keine Eigenschaft
  // des Inhalts; verglichen wird weiter jedes Feld und jeder Wert, strikt.
  const kanonisch = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v))
    ? Object.keys(v).sort().reduce((acc, key) => { acc[key] = v[key]; return acc; }, {}) : v);
  assert.equal(kanonisch(dec), kanonisch(inhalt), 'Sub-Inhalt muss feldweise stimmen');
  await assert.rejects(() => L.leseSubUmschlag(datei.umschlag, 'falsch'), 'falsches Sub-Passwort muss werfen');

  // Sub-Modus-Färbung + Banner-Erkennung über den Zustand.
  L.setData(dec);
  L.setLeseModus('sub');
  L.setSubInfo({ inhaberin: 'Bernd Beispiel', bezeichnung: 'Depot Onkel Bernd' });
  assert.equal(L.getLeseModus(), 'sub', 'Lese-Modus muss sub sein');
  assert.equal(L.aktuellerAnkerName(), 'Bernd Beispiel', 'Anker-Name im Sub-Modus = Inhaberin');
});

test('[Klasse-A] T-A-05 Provenienz-Anzeige: Stempel mit eingabeDurchName zeigt „von [Name]"; ohne nichts', () => {
  const { V: L } = ladeLesen();
  // Stempel von abweichender Person (unter Vollmacht)
  L.setData({
    sektoren: { identity: { givenName: 'Maria', familyName: 'Mustermann' }, health: { bloodType: 'A+' } },
    menschen: [{ id: 'p2', name: 'Dr. Klein' }],
    urheberschaft: { health: { bloodType: [
      { akteur: 'p2', eigenschaft: 'unter-vollmacht', zeitpunkt: '2026-05-01T10:00:00Z', eingabeDurchName: 'Dr. Klein' },
    ] } },
  });
  L.setLeseModus('anker'); L.setSubInfo(null);
  const zeile = L.urheberschaftZeileHTML('health', 'bloodType');
  assert.ok(zeile.includes('Dr. Klein'), 'Provenienz muss „von Dr. Klein" zeigen');
  assert.ok(/von/.test(zeile) && /unter Vollmacht/.test(zeile), 'Provenienz muss „von … (unter Vollmacht)" zeigen');
  assert.equal(L.stempelName({ eingabeDurchName: 'Dr. Klein', akteur: 'p2' }), 'Dr. Klein');

  // Kein Stempel → leer.
  assert.equal(L.urheberschaftZeileHTML('health', 'allergiesMedicationFoodOther'), '', 'ohne Stempel keine Provenienz');

  // Stempel vom Anker selbst (Name == Anker) → leer (dezent, nur bei Abweichung).
  L.setData({
    sektoren: { identity: { givenName: 'Maria', familyName: 'Mustermann' } }, menschen: [],
    urheberschaft: { identity: { givenName: [
      { akteur: null, eigenschaft: 'selbst', zeitpunkt: '2026-05-01', eingabeDurchName: 'Maria Mustermann' },
    ] } },
  });
  assert.equal(L.urheberschaftZeileHTML('identity', 'givenName'), '', 'Stempel vom Anker selbst zeigt nichts');
});

test('[Klasse-A] T-A-06 Legacy-Notfall-QR-Empfänger: parseNotfallQrText liest den Alt-Klartext (überholt durch U2-ADR-077)', () => {
  const { V: L } = ladeLesen();
  // U2-ADR-077: Die Bürger-App erzeugt KEINEN Klartext-Notfall-QR mehr — der QR ist eine Kontakte-vCard,
  // die auf dem Telefon nativ in die Kontakte geht (kein Gesundheitsdatum im QR). Der Lese-App-Empfänger
  // `parseNotfallQrText` bleibt als LEGACY-Parser bestehen (überholt, s. U2-ADR-077); hier gegen einen
  // Literal-Alt-QR geprüft — NICHT mehr aus dem entfernten Generator notfallKernText.
  const legacy = 'VIVODEPOT NOTFALL\nVorname: Maria\nNachname: Mustermann\nBlutgruppe: 0 negativ\nAllergien: Penicillin';
  const modell = L.parseNotfallQrText(legacy);
  assert.ok(modell && modell.zeilen.length >= 3, 'Legacy-QR liefert die Akut-Zeilen');
  const labels = modell.zeilen.map(z => z.label).join('|');
  const werte = modell.zeilen.map(z => z.wert).join('|');
  assert.ok(/Blutgruppe/.test(labels), 'Legacy-Sicht enthält Blutgruppe');
  assert.ok(/0 negativ/.test(werte), 'Legacy-Sicht zeigt den Blutgruppen-Wert');
  // Nicht-Legacy-Text (z. B. eine vCard) wird NICHT als Notfall-QR erkannt.
  assert.equal(L.parseNotfallQrText('BEGIN:VCARD\nVERSION:3.0\nFN:Notfallkontakte\nEND:VCARD'), null, 'vCard ist kein Legacy-Notfall-QR');
  // Mehrteilige QR-Sammlung (VDQR-Pipe-Rahmen, U2-ADR-082): eigene Tests in qr-kette.test.js.
});

test('[Klasse-A] T-A-07 Keine Persistenz: entladen() nullt alles; Datei nutzt keinen Browser-Speicher / kein Netz', async () => {
  const { V: L } = ladeLesen();
  const { umschlag } = await kernDepotUmschlag('pw-persist');
  const obj = await L.leseDepotUmschlag(umschlag, 'pw-persist');
  L.setData(obj);
  assert.notEqual(L.getData(), null, 'vor entladen liegen Daten im RAM');
  L.entladen();
  assert.equal(L.getData(), null, 'entladen() muss data nullen');
  assert.equal(L.getLeseModus(), 'anker', 'entladen() muss den Modus zurücksetzen');
  assert.equal(L.getSubInfo(), null, 'entladen() muss Sub-Info nullen');

  // Quell-Disziplin: keinerlei persistente Speicher oder Netz-APIs in der Datei.
  const file = fs.readFileSync(LESEN_PATH, 'utf8');
  // Kommentare entfernen (Block /* */, Zeile //, HTML <!-- -->), damit nur ECHTER Code geprüft wird.
  // Diese Kommentare BESCHREIBEN die Invariante (z. B. „Kein localStorage…") und sind kein Verstoß.
  const code = file
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  for (const verboten of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket']) {
    assert.ok(!new RegExp(verboten.replace('.', '\\.')).test(code), 'Lese-App darf nicht verwenden: ' + verboten);
  }
  // fetch( darf nicht als Funktionsaufruf vorkommen.
  assert.ok(!/\bfetch\s*\(/.test(code), 'Lese-App darf kein fetch() verwenden');
  // CSP muss connect-src 'none' enthalten.
  assert.ok(/connect-src 'none'/.test(file), "CSP muss connect-src 'none' setzen");
});

/* ── B3 (21.07.2026) — Versions-Gate der Lese-App ──────────────────────────
   Bis dahin hatte die Lese-App KEINE explizite Versions-Prüfung: ein Nicht-v3-Umschlag
   lief durch die volle PBKDF2-Ableitung und scheiterte erst an der AAD/GCM-Bindung —
   fail-closed, aber teuer und mit irreführender Meldung („Das Passwort passt nicht",
   weil der catch im Passwort-Formular jeden Fehler gleich behandelte).
   Geprüft wird beides: Ablehnung VOR der Ableitung (Zähler auf deriveBits, mit Gegenprobe)
   und der eigene, bürgernahe Wortlaut statt der Passwort-Meldung. */
test('[Klasse-A] B3 Versions-Gate: Lese-App lehnt Nicht-v3-Umschlag vor der Ableitung ab', async () => {
  const { webcrypto } = require('node:crypto');
  const password = 'GeheimesPasswort-2026!';
  const { umschlag } = await kernDepotUmschlag(password);
  const { V: L } = ladeLesen();
  const fremd = JSON.parse(JSON.stringify(umschlag));
  fremd.kryptoVersion = 2;
  const istVersionsFehler = (e) => !!(e && e.vivodepotGrund === 'version');

  const orig = webcrypto.subtle.deriveBits;
  let ableitungen = 0;
  webcrypto.subtle.deriveBits = function (...a) { ableitungen++; return orig.apply(this, a); };
  try {
    await assert.rejects(() => L.leseDepotUmschlag(fremd, password), istVersionsFehler,
      'Vollexport-Pfad lehnt kryptoVersion 2 als Versions-Fehler ab');
    await assert.rejects(() => L.leseSubUmschlag(fremd, password), istVersionsFehler,
      'Sub-Depot-Pfad lehnt kryptoVersion 2 als Versions-Fehler ab');
    assert.equal(ableitungen, 0,
      'keine PBKDF2-Ableitung vor der Ablehnung (Gate liegt VOR der Schlüsselableitung)');
    await L.leseDepotUmschlag(umschlag, password);   // Gegenprobe: der Zähler misst wirklich
    assert.ok(ableitungen > 0, 'Gegenprobe: gültiger v3-Umschlag löst eine Ableitung aus');
  } finally {
    webcrypto.subtle.deriveBits = orig;
  }

  // Die UI-Meldung ist ein eigener Wortlaut, nicht die Passwort-Meldung, und nennt keine
  // Versionsnummer/kein Technik-Wort (Begriffs-Glossar: bürgernah).
  assert.ok(L.STRINGS.versionNichtLesbar, 'eigener Wortlaut für den Versions-Fall vorhanden');
  assert.notEqual(L.STRINGS.versionNichtLesbar, L.STRINGS.pwFalsch,
    'Versions-Ablehnung meldet NICHT „Passwort passt nicht"');
  assert.ok(!/krypto|version\s*\d|v3|PBKDF2|GCM/i.test(L.STRINGS.versionNichtLesbar),
    'kein Technik-Jargon in der UI-Meldung');
});
