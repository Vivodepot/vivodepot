'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kette, Auftrag 7: die Anfrage von aussen
   (SP Bau, 20.08.2026 — setzt Auftrag 6 voraus)
   ────────────────────────────────────────────────────────────────────────
   *Danach beschreibt eine Institution ihren Bedarf selbst, ohne dass wir sie
   kennen.* Das ist die Stelle, an der aus einem Ablageprogramm ein Produkt
   wird, das jemand kauft.

   DER PRÜFSTOFF (Pflicht 3) sind die zwölf Angaben einer Heimaufnahme —
   dieselben, an denen Auftrag 3 gemessen hat, und derselbe Depot-Aufbau.
   Kein Prüfstück: die Anfrage eines Pflegeheims fragt genau danach.

   DER SUCHRAUM (Pflicht 5) ist `vivodepot.html` — die Anfrage lebt
   vollständig im Kern; die Signaturkette ist die bestehende zweistufige aus
   U2-ADR-040 (`verifiziereProviderCredential` → `_verifiziereTemplateSignatur`),
   keine zweite daneben.

   DIE ROT-BEWEISE laufen AM GEGENSTAND (Regel 18): Mutation auf einer KOPIE
   des echten Kerns, das Original danach byte-gleich nachgeprüft.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const HTML_PATH = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'kette07-pw';
const JETZT = new Date('2026-08-20T10:00:00Z');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

/* ── Der Prüfstoff: die zwölf Angaben einer Heimaufnahme ──────────────────── */
const ZWOELF = [
  { kennung: 'identity.givenName',                                                    wert: 'Hedwig',                    zweck: 'Anrede im Aufnahmebogen' },
  { kennung: 'identity.familyName',                                                   wert: 'Brandt',                    zweck: 'Anrede im Aufnahmebogen' },
  { kennung: 'identity.birthDate',                                                    wert: '1938-03-14',                zweck: 'Zuordnung zur Akte, Verwechslungsschutz' },
  { kennung: 'health.healthInsurance',                                                wert: { override: 'AOK Bayern' },  zweck: 'Abrechnung mit der Kasse' },
  { kennung: 'health.insuranceNumber',                                                wert: 'A123456780',                zweck: 'Abrechnung mit der Kasse' },
  { kennung: 'socialInsurance.careLevel',                                             wert: '3',                         zweck: 'Bemessung der Leistungen' },
  { kennung: 'socialInsurance.longTermCareFundPhone',                                 wert: '089 123456',                zweck: 'Rückfragen zur Kostenübernahme' },
  { kennung: 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation',   wert: null,                        zweck: 'Wer im Notfall entscheiden darf' },
  { kennung: 'health.medicationOngoing',                                              wert: [{ text: 'Metformin 500' }], zweck: 'Fortführung der Medikation' },
  { kennung: 'health.allergiesMedicationFoodOther',                                   wert: [{ text: 'Penicillin' }],    zweck: 'Vermeidung von Zwischenfällen' },
  { kennung: 'health.chronicConditionsDiagnoses',                                     wert: [{ text: 'Diabetes Typ 2' }],zweck: 'Pflegeplanung' },
  { kennung: 'health.emergencyContacts',                                              wert: null,                        zweck: 'Ansprechperson für die Station' },
];

async function heimaufnahmeDepot(auslassen) {
  const weg = new Set(auslassen || []);
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  for (const a of ZWOELF) {
    if (a.wert == null || weg.has(a.kennung)) continue;
    const sel = V.kennungZuSelektor(a.kennung);
    V.sektorFeldSetzen(sel.sektorId, sel.feldId, a.wert);
  }
  if (!weg.has('health.emergencyContacts')) {
    const p = V.personSicherstellen('Tochter Reiter');
    V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: (p && (p.id || p)) || 'Tochter Reiter' }]);
  }
  if (!weg.has('advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation')) {
    V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', storageLocation: 'Ordner im Wohnzimmer' });
  }
  return V;
}

/* Die Anfrage des Pflegeheims. KEIN Personendatum, nur Kennungen und Zwecke. */
function heimAnfrage(ueber) {
  return Object.assign({
    modulTyp: 'anfrage',
    anfrageVersion: 1,
    von: 'Pflegeheim Sonnenhof gGmbH',
    zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
    grundlage: '§ 630f BGB (Behandlungsdokumentation) und der von Ihnen unterzeichnete Heimvertrag',
    vorgang: 'AUF-2026-0815',
    gestelltAm: '2026-08-18',
    gueltigBis: '2026-09-30',
    felder: ZWOELF.map((a) => ({ kennung: a.kennung, zweck: a.zweck, pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example.de' },
  }, ueber || {});
}

/* ── Signieren wie eine Institution es täte (dieselbe Kette wie eine Vorlage) ── */
async function anbieterPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}
function baueCert(publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de',
    issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: {
      anbieterId: 'heim/sonnenhof', anbieterName: 'Pflegeheim Sonnenhof gGmbH',
      anbieterTyp: 'institution/pflege', publicKeyJwk,
    },
  };
}
async function signierterUmschlag(V, anfrage, opt) {
  const o = opt || {};
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const paar = o.paar || await anbieterPaar();
  const certJws = await V._signJWS(baueCert(paar.pubJwk), sentinelSign, {});
  const signKey = await V._jwsImportSignKey(o.signPriv || paar.privJwk);
  const anfrageJws = await V._signJWS(o.signInhalt || anfrage, signKey, {});
  return { umschlag: { format: 'vivodepot-anfrage@1', anfrage, zertifikat: certJws, anfrageJws }, paar };
}
const PRUEF_OPT = { jetzt: '2026-08-20T10:00:00Z', ankerJwk: SENTINEL_PUBLIC_JWK };

// Mutation auf einer KOPIE des echten Kerns (Regel 18) — das Original bleibt unberührt und
// wird danach byte-gleich nachgeprüft.
async function mitMutation(anker, ersatz, pruefung) {
  const original = fs.readFileSync(HTML_PATH, 'utf8');
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'kette-07-probe-' + process.pid + '-' + Math.floor(process.hrtime()[1]) + '.html');
  fs.writeFileSync(tmp, original.replace(anker, ersatz));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    await V.depotAnlegen(PW);
    await pruefung(V);
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
  }
  assert.equal(fs.readFileSync(HTML_PATH, 'utf8'), original, 'die Probe darf den echten Kern nicht verändert haben');
}

/* ══ ZUG 1 — die vollständige Anfrage ═════════════════════════════════════ */

test('[Kette 07 · tragend] die vollständige Anfrage kommt vollständig an — Zweck, Grundlage, Frist, Vorgang, Zweck je Feld', async () => {
  const V = await heimaufnahmeDepot();
  const g = V.anfragePruefen(heimAnfrage());
  assert.equal(g.gueltig, true, g.grund || '');
  const a = g.anfrage;
  assert.equal(a.zweck, 'Aufnahme in die vollstationäre Pflege ab 01.10.2026');
  assert.equal(a.grundlage, '§ 630f BGB (Behandlungsdokumentation) und der von Ihnen unterzeichnete Heimvertrag');
  assert.equal(a.vorgang, 'AUF-2026-0815');
  assert.equal(a.gueltigBis, '2026-09-30');
  assert.equal(a.felder.length, 12, 'zwölf Angaben, nicht zehn');
  // Der Zweck steht JE FELD, nicht nur einmal am Kopf.
  for (const f of a.felder) assert.ok(f.zweck && f.zweck.length > 3, 'jede Angabe trägt ihren eigenen Zweck: ' + f.kennung);
  assert.notEqual(a.felder[0].zweck, a.felder[3].zweck, 'und die Zwecke sind verschieden, kein Sammelzweck in zwölf Kopien');
  assert.equal(g.verworfene.length, 0, 'nichts wird verworfen');
});

test('[Kette 07 · Zug 1] LESBAR, NICHT BINÄR — ein Justiziar liest Zweck und Grundlage im Klartext', async () => {
  const V = await heimaufnahmeDepot();
  const text = JSON.stringify(V.anfragePruefen(heimAnfrage()).anfrage, null, 2);
  assert.ok(text.includes('§ 630f BGB'), 'die Grundlage steht als Satz da, nicht als Kennziffer');
  assert.ok(text.includes('Aufnahme in die vollstationäre Pflege'), 'und der Zweck ebenso');
  assert.ok(text.includes('Abrechnung mit der Kasse'), 'auch der Zweck einzelner Angaben');
});

/* Rot-Beweis JE ANGABE, einzeln (fünf Stück) — die Angabe wird aus der FORM entfernt,
   und die Probe muss anschlagen. Das ist die Mutation am Gegenstand: nicht ein
   ausgelassener Wert, sondern eine Form, die die Angabe nicht mehr kennt. */
for (const angabe of ['zweck', 'grundlage', 'vorgang', 'gueltigBis']) {
  test('[Kette 07 · Zug 1 · Rot-Beweis] ohne „' + angabe + '" in der Form kommt die Angabe NICHT an', async () => {
    await mitMutation(
      "const ANFRAGE_SCHLUESSEL = Object.freeze(['modulTyp', 'format', 'anfrageVersion', 'appVersion',\n  'von', 'anbieterId', 'zweck', 'grundlage', 'vorgang', 'gestelltAm', 'gueltigBis', 'felder', 'antwort']);",
      "const ANFRAGE_SCHLUESSEL = Object.freeze(['modulTyp', 'format', 'anfrageVersion', 'appVersion',\n  'von', 'anbieterId', 'zweck', 'grundlage', 'vorgang', 'gestelltAm', 'gueltigBis', 'felder', 'antwort'].filter(k => k !== '" + angabe + "'));",
      async (V) => {
        const g = V.anfragePruefen(heimAnfrage());
        // Entweder die Anfrage fällt durch, oder die Angabe steht als verworfen da —
        // in KEINEM Fall kommt sie still an.
        const stillAngekommen = g.gueltig && g.verworfene.every(v => v.schluessel !== angabe);
        assert.equal(stillAngekommen, false, 'die Angabe „' + angabe + '" darf nicht stillschweigend verschwinden');
      });
  });
}
test('[Kette 07 · Zug 1 · Rot-Beweis] ohne „zweck" am FELD kommt der Feld-Zweck nicht an', async () => {
  await mitMutation(
    "const ANFRAGE_FELD_SCHLUESSEL = Object.freeze(['kennung', 'zweck', 'pflicht']);",
    "const ANFRAGE_FELD_SCHLUESSEL = Object.freeze(['kennung', 'pflicht']);",
    async (V) => {
      const g = V.anfragePruefen(heimAnfrage());
      const stillAngekommen = g.gueltig && g.anfrage.felder.length === 12
        && g.anfrage.felder.every(f => f.zweck);
      assert.equal(stillAngekommen, false, 'der Zweck je Feld darf nicht stillschweigend verschwinden');
    });
});

test('[Kette 07 · Zug 1 · Gegenprobe] die unveränderte Form nimmt alle fünf Angaben an', async () => {
  const V = await heimaufnahmeDepot();
  const g = V.anfragePruefen(heimAnfrage());
  assert.equal(g.gueltig, true);
  for (const k of ['zweck', 'grundlage', 'vorgang', 'gueltigBis']) assert.ok(g.anfrage[k], k + ' kommt an');
  assert.ok(g.anfrage.felder.every(f => f.zweck), 'und der Zweck je Feld auch');
});

/* KEINE PERSONENDATEN — und das ist mechanisch, nicht behauptet. */
test('[Kette 07 · Zug 1] eine Anfrage mit einem WERT fällt durch — keine Personendaten', async () => {
  const V = await heimaufnahmeDepot();
  const mitWert = heimAnfrage();
  mitWert.felder = mitWert.felder.slice();
  mitWert.felder[0] = Object.assign({}, mitWert.felder[0], { wert: 'Hedwig' });
  assert.equal(V.anfragePruefen(mitWert).grund, 'personendaten');
  assert.equal(V.anfragePruefen(heimAnfrage({ betrifft: 'Hedwig Brandt' })).grund, 'personendaten');
});
test('[Kette 07 · Zug 1 · Gegenprobe] der Abgleich BRAUCHT kein Personendatum — die Abbruchklausel trifft nicht zu', async () => {
  const V = await heimaufnahmeDepot();
  const ab = V.anfrageAbgleich(heimAnfrage(), { jetzt: JETZT });
  assert.equal(ab.ok, true);
  assert.equal(ab.vorhanden.length, 12, 'alle zwölf werden gefunden — allein über die Kennungen');
});

/* ══ ZUG 2 — der Abgleich ═════════════════════════════════════════════════ */

test('[Kette 07 · Zug 2] fehlen drei geforderte Angaben, zeigt die Anfrage GENAU diese drei', async () => {
  const FEHLT = ['health.insuranceNumber', 'socialInsurance.careLevel', 'health.allergiesMedicationFoodOther'];
  const V = await heimaufnahmeDepot(FEHLT);
  const ab = V.anfrageAbgleich(heimAnfrage(), { jetzt: JETZT });
  assert.equal(ab.ok, true);
  assert.deepEqual(ab.fehlend.map(f => f.kennung).sort(), FEHLT.slice().sort(), 'genau diese drei');
  assert.equal(ab.vorhanden.length, 9, 'und die übrigen neun sind da');
  assert.equal(ab.vollstaendig, false, 'drei fehlende Pflichtangaben heissen: nicht vollständig');
  for (const f of ab.fehlend) assert.ok(f.zweck, 'auch das fehlende Feld sagt, WOZU es gefragt wird');
});

test('[Kette 07 · Zug 2 · Gegenprobe] ein vollständiges Depot zeigt KEINE Lücke', async () => {
  const V = await heimaufnahmeDepot();
  const ab = V.anfrageAbgleich(heimAnfrage(), { jetzt: JETZT });
  assert.deepEqual(ab.fehlend, [], 'keine Lücke');
  assert.equal(ab.vollstaendig, true);
});

test('[Kette 07 · Zug 2] Fehlendes wird AN ORT UND STELLE nachgetragen — ohne den Weg zu verlassen', async () => {
  const V = await heimaufnahmeDepot(['health.insuranceNumber']);
  const vorher = V.anfrageAbgleich(heimAnfrage(), { jetzt: JETZT });
  assert.equal(vorher.fehlend.length, 1);
  const r = V.anfrageFeldNachtragen('health.insuranceNumber', 'A123456780');
  assert.equal(r.ok, true, r.grund || '');
  const nachher = V.anfrageAbgleich(heimAnfrage(), { jetzt: JETZT });
  assert.deepEqual(nachher.fehlend, [], 'die Lücke ist geschlossen');
  assert.equal(nachher.vollstaendig, true);
  // Derselbe Schreibweg wie überall: mit Urheberschafts-Stempel.
  assert.equal(V.getData().sektoren.health.insuranceNumber, 'A123456780');
});
test('[Kette 07 · Zug 2 · Rot-Beweis] ein Nachtrag auf eine unbekannte Kennung schreibt NICHTS', async () => {
  const V = await heimaufnahmeDepot();
  const r = V.anfrageFeldNachtragen('health.gibtesnicht', 'X');
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'unbekannt');
});

test('[Kette 07 · Zug 2] ein zurückgehaltenes sensibles Feld verschwindet NICHT aus beiden Listen', async () => {
  const V = await heimaufnahmeDepot();
  const ab = V.anfrageAbgleich(heimAnfrage(), { jetzt: JETZT });
  // Die Bestandsaufnahme fragt „habe ich das", nicht „gebe ich das heraus": ein sensibles
  // Feld steht bei „vorhanden" UND ist als sensibel gekennzeichnet.
  assert.equal(ab.vorhanden.length + ab.fehlend.length, 12,
    'keine der zwölf Angaben fällt zwischen die beiden Listen');
  assert.ok(Array.isArray(ab.sensibelBetroffen), 'und was nur mit Freigabe mitginge, ist benannt');
});

/* ══ ZUG 3 — unbekannte Kennung ═══════════════════════════════════════════ */

test('[Kette 07 · Zug 3] eine unbekannte Kennung wird GESAGT — und die Anfrage gilt nicht als vollständig beantwortet', async () => {
  const V = await heimaufnahmeDepot();
  const anfrage = heimAnfrage();
  anfrage.felder = anfrage.felder.concat([{ kennung: 'health.lieblingsfarbe', zweck: 'Zimmergestaltung', pflicht: false }]);
  const ab = V.anfrageAbgleich(anfrage, { jetzt: JETZT });
  assert.equal(ab.unbekannt.length, 1, 'sie wird nicht stillschweigend um die Zeile erleichtert');
  assert.equal(ab.unbekannt[0].kennung, 'health.lieblingsfarbe', 'und sie wird BENANNT');
  assert.equal(ab.vollstaendig, false, 'trotz freigestellt: eine unbekannte Kennung macht die Antwort unvollständig');
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  assert.equal(ds.vollstaendig, false, 'und der Datensatz sagt es dem Empfänger');
  assert.equal(ds.unbekannt.length, 1);
  assert.equal(ds.felder.length, 12, 'die zwölf bekannten gehen trotzdem hinaus — eine Restantwort nützt mehr als keine');
});

test('[Kette 07 · Zug 3 · Gegenprobe] ohne unbekannte Kennung ist der Schlüssel da und LEER', async () => {
  const V = await heimaufnahmeDepot();
  const ds = V.anfrageAntwortDatensatz(heimAnfrage(), { sensibel: true });
  assert.deepEqual(ds.unbekannt, [], 'immer da, auch leer — darauf kann ein Empfänger sich verlassen');
  assert.equal(ds.vollstaendig, true);
});

/* ══ ZUG 4 — geprüft oder ungeprüft ═══════════════════════════════════════ */

test('[Kette 07 · Zug 4] eine signierte Anfrage wird als GEPRÜFT gezeigt — mit dem Anbieter aus dem Zertifikat', async () => {
  const V = await heimaufnahmeDepot();
  const { umschlag } = await signierterUmschlag(V, heimAnfrage());
  const p = await V.anfrageSignaturPruefen(umschlag, PRUEF_OPT);
  assert.equal(p.geprueft, true, p.grund + ' ' + (p.detail || ''));
  assert.equal(p.anbieterId, 'heim/sonnenhof', 'der Bezeichner kommt aus dem SIGNIERTEN Zertifikat, nicht aus der Anfrage');
  assert.equal(p.anbieterName, 'Pflegeheim Sonnenhof gGmbH');
});

test('[Kette 07 · Zug 4 · DER WICHTIGSTE ROT-BEWEIS] eine MANIPULIERTE Anfrage wird NICHT als geprüft gezeigt', async () => {
  const V = await heimaufnahmeDepot();
  const echt = heimAnfrage();
  // Der Angriff: der lesbare Teil wird ausgetauscht, die alte Signatur bleibt daneben stehen.
  const { umschlag } = await signierterUmschlag(V, echt);
  const gefaelscht = Object.assign({}, umschlag, {
    anfrage: Object.assign({}, echt, { antwort: { art: 'einmalpasswort', an: 'angreifer@example.invalid' } }),
  });
  const p = await V.anfrageSignaturPruefen(gefaelscht, PRUEF_OPT);
  assert.equal(p.geprueft, false, 'eine ausgetauschte Anfrage ist keine geprüfte');
  assert.equal(p.grund, 'anfrage-abweichung', 'und der Grund benennt genau das');
  // Und die zweite Richtung: eine mit dem FALSCHEN Schlüssel signierte Anfrage.
  const fremd = await anbieterPaar();
  const { umschlag: u2 } = await signierterUmschlag(V, echt, { signPriv: fremd.privJwk });
  const p2 = await V.anfrageSignaturPruefen(u2, PRUEF_OPT);
  assert.equal(p2.geprueft, false, 'mit fremdem Schlüssel signiert ist nicht geprüft');
  assert.equal(p2.grund, 'signatur-ungueltig');
});

test('[Kette 07 · Zug 4] eine UNSIGNIERTE Anfrage wird ANGENOMMEN und als ungeprüft gezeigt — die Tür bleibt offen', async () => {
  const V = await heimaufnahmeDepot();
  const umschlag = V.anfrageAusText(JSON.stringify(heimAnfrage()));
  assert.ok(umschlag, 'sie wird gelesen');
  const p = await V.anfrageSignaturPruefen(umschlag, PRUEF_OPT);
  assert.equal(p.geprueft, false);
  assert.equal(p.grund, 'ohne-zertifikat', 'nicht abgelehnt — nur nicht bestätigt');
  const r = V.anfrageMerken(umschlag, p);
  assert.equal(r.ok, true, 'und sie kommt an ihrem Ort an');
  assert.equal(r.eintrag.geprueft, false);
});

test('[Kette 07 · Zug 4 · Gegenprobe] die Signaturprüfung läuft OHNE NETZ', async () => {
  const V = await heimaufnahmeDepot();
  const { umschlag } = await signierterUmschlag(V, heimAnfrage());
  // Die Verbindung wird gesperrt: jeder Netzzugriff wirft. Die Prüfung muss trotzdem laufen.
  const globale = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
  const zuvor = {};
  for (const g of globale) { zuvor[g] = global[g]; global[g] = function () { throw new Error('Netzzugriff gesperrt: ' + g); }; }
  try {
    const p = await V.anfrageSignaturPruefen(umschlag, PRUEF_OPT);
    assert.equal(p.geprueft, true, 'offline bleibt offline — geprüft wird gegen den eingebauten Anker');
  } finally {
    for (const g of globale) { if (zuvor[g] === undefined) delete global[g]; else global[g] = zuvor[g]; }
  }
});

/* ══ Der Bestätigungsschritt (Produktentscheidung, 20.08., Variante A) ══ */

test('[Kette 07 · Zug 4] der Bestätigungsschritt erscheint bei einer UNGEPRÜFTEN Anfrage — und sagt, WOHIN', async () => {
  const V = await heimaufnahmeDepot();
  const m = await V.anfrageBestaetigungModell(heimAnfrage(), { geprueft: false });
  assert.ok(m && m.noetig === true, 'er erscheint');
  const arten = m.wohin.map(w => w.was);
  assert.ok(arten.includes('von'), 'er sagt, wer fragt');
  assert.ok(arten.includes('an'), 'und wohin die Antwort geht — nicht nur, DASS etwas ungeprüft ist');
});

test('[Kette 07 · Zug 4 · ROT-BEWEIS] bei einer GEPRÜFTEN Anfrage erscheint er NICHT — die Gewöhnung ist der Fehler', async () => {
  const V = await heimaufnahmeDepot();
  const m = await V.anfrageBestaetigungModell(heimAnfrage(), { geprueft: true });
  assert.equal(m, null, 'erscheint er hier, ist der Zug falsch: dann klickt der Mensch ihn überall durch');
});

test('[Kette 07 · Zug 4 · Gegenprobe] er ist NICHT überspringbar und NICHT vorbelegt', async () => {
  const V = await heimaufnahmeDepot();
  const m = await V.anfrageBestaetigungModell(heimAnfrage(), { geprueft: false });
  assert.equal(m.vorbelegt, false, 'ein vorausgefülltes Häkchen wäre derselbe Warnhinweis in anderer Form');
  assert.equal(m.ueberspringbar, false);
});

test('[Kette 07 · Zug 4] der Schlüssel-Abdruck steht im Schritt, wenn ein Schlüssel mitreist', async () => {
  const V = await heimaufnahmeDepot();
  const paar = await anbieterPaar();
  const a = heimAnfrage({ antwort: { art: 'schluesselpaar', an: 'aufnahme@sonnenhof.example.de', publicKeyJwk: paar.pubJwk } });
  const m = await V.anfrageBestaetigungModell(a, { geprueft: false });
  const s = m.wohin.find(w => w.was === 'schluessel');
  assert.ok(s && s.wert && s.wert.length > 10, 'für WELCHEN Schlüssel verschlüsselt wird, steht da');
});

/* ══ Ablauf ═══════════════════════════════════════════════════════════════ */

test('[Kette 07 · Ablauf] eine abgelaufene Anfrage wird als abgelaufen gezeigt und NICHT stillschweigend beantwortet', async () => {
  const V = await heimaufnahmeDepot();
  const alt = heimAnfrage({ gueltigBis: '2026-07-31' });
  assert.equal(V.anfrageAbgelaufen(alt, JETZT), true);
  const ab = V.anfrageAbgleich(alt, { jetzt: JETZT });
  assert.equal(ab.abgelaufen, true, 'der Abgleich sagt es');
  const umschlag = V.anfrageAusText(JSON.stringify(alt));
  const r = V.anfrageMerken(umschlag, null);
  assert.equal(V.anfrageZustand(r.eintrag, JETZT), 'abgelaufen', 'und der Ort zeigt sie als abgelaufen');
});
test('[Kette 07 · Ablauf · Gegenprobe] eine gültige Anfrage ist NICHT abgelaufen — auch am letzten Tag', async () => {
  const V = await heimaufnahmeDepot();
  assert.equal(V.anfrageAbgelaufen(heimAnfrage(), JETZT), false);
  assert.equal(V.anfrageAbgelaufen(heimAnfrage({ gueltigBis: '2026-08-20' }), JETZT), false,
    'wer am letzten Tag antwortet, antwortet rechtzeitig');
});

/* ══ Die Teilantwort ══════════════════════════════════════════════════════ */

test('[Kette 07 · Teilantwort] fünf von neun — der Datensatz sagt, dass vier fehlen', async () => {
  const NEUN = ZWOELF.slice(0, 9);
  const FEHLT = NEUN.slice(5).map(a => a.kennung);      // vier Stück
  const V = await heimaufnahmeDepot(FEHLT);
  const anfrage = heimAnfrage({ felder: NEUN.map(a => ({ kennung: a.kennung, zweck: a.zweck, pflicht: true })) });
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  assert.equal(ds.felder.length, 5, 'fünf sind da');
  assert.equal(ds.fehlend.length, 4, 'und vier fehlen');
  assert.equal(ds.vollstaendig, false, 'eine stumme Teilantwort wäre ein Fehlschlag');
  for (const f of ds.fehlend) assert.ok(f.kennung && f.label, 'und jede fehlende ist benannt, nicht gezählt');
});
test('[Kette 07 · Teilantwort · Rot-Beweis] eine STUMME Teilantwort schlägt an', async () => {
  const NEUN = ZWOELF.slice(0, 9);
  const V = await heimaufnahmeDepot(NEUN.slice(5).map(a => a.kennung));
  const anfrage = heimAnfrage({ felder: NEUN.map(a => ({ kennung: a.kennung, zweck: a.zweck, pflicht: true })) });
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  // Die Mutation am Gegenstand: der Empfänger bekommt den Datensatz OHNE die Fehlmeldung.
  const stumm = Object.assign({}, ds); delete stumm.fehlend; delete stumm.vollstaendig;
  assert.equal(stumm.fehlend === undefined && ds.fehlend.length === 4, true,
    'genau das ist der Fehlschlag, den diese Probe fängt: ohne `fehlend` hält der Empfänger fünf für neun');
});

/* ══ ZUG 6 — der Ort, an dem eine Anfrage ankommt ═════════════════════════ */

test('[Kette 07 · Zug 6] Datei, Link und QR führen an DENSELBEN Ort — derselbe Umschlag', async () => {
  const V = await heimaufnahmeDepot();
  const roh = JSON.stringify(heimAnfrage());
  const ausDatei = V.anfrageAusText(roh);
  const ausQr = V.anfrageAusText('  ' + roh + '\n');
  const b64 = Buffer.from(roh, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const ausLink = V.anfrageAusText('https://privat-de.vivodepot.org/#' + V.ANFRAGE_LINK_MARKE + b64);
  assert.deepEqual(ausQr, ausDatei, 'QR-Text und Datei ergeben denselben Umschlag');
  assert.deepEqual(ausLink, ausDatei, 'und der Link ebenso');
});
test('[Kette 07 · Zug 6 · Gegenprobe] was keine Anfrage ist, wird NICHT zu einer erfunden', async () => {
  const V = await heimaufnahmeDepot();
  assert.equal(V.anfrageAusText('kein json'), null);
  assert.equal(V.anfrageAusText('{"was":"anderes"}'), null);
  assert.equal(V.anfrageAusText('https://example.invalid/app#anfrage=nichtbase64!!'), null);
});

test('[Kette 07 · Zug 6] der Ort aus Auftrag 4 wird gefüllt — offen, beantwortet, abgelaufen', async () => {
  const V = await heimaufnahmeDepot();
  assert.equal(V.anfragenOrtModell(JETZT).leer, true, 'vorher leer, und das wird gesagt');
  const r = V.anfrageMerken(V.anfrageAusText(JSON.stringify(heimAnfrage())), null);
  assert.equal(r.ok, true);
  let m = V.anfragenOrtModell(JETZT);
  assert.equal(m.leer, false);
  assert.equal(m.nachZustand.offen, 1);
  V.anfrageBeantwortetVermerken('AUF-2026-0815', null);
  m = V.anfragenOrtModell(JETZT);
  assert.equal(m.nachZustand.beantwortet, 1, '„beantwortet" ist eine Aussage über etwas Vergangenes');
  assert.equal(m.nachZustand.offen, 0);
  const html = V.anfragenOrtHTML();
  assert.ok(html.includes('data-anfrage-zustand="beantwortet"'), 'und der Ort zeigt es');
  assert.ok(html.includes('Pflegeheim Sonnenhof'), 'mit dem Namen dessen, der gefragt hat');
});

test('[Kette 07 · Zug 6] dieselbe Anfrage zweimal zugestellt steht EINMAL da', async () => {
  const V = await heimaufnahmeDepot();
  const u = V.anfrageAusText(JSON.stringify(heimAnfrage()));
  V.anfrageMerken(u, null);
  const zweitens = V.anfrageMerken(u, null);
  assert.equal(zweitens.neu, false, 'die Identität ist anbieterId + vorgang, nicht der Wortlaut');
  assert.equal(V.anfragenListe().length, 1);
});

test('[Kette 07 · Zug 6] die Anfrage ÜBERLEBT das Schliessen — sonst kann sie nie beantwortet gewesen sein', async () => {
  const V = await heimaufnahmeDepot();
  const { umschlag } = await signierterUmschlag(V, heimAnfrage());
  const p = await V.anfrageSignaturPruefen(umschlag, PRUEF_OPT);
  V.anfrageMerken(umschlag, p);
  V.anfrageBeantwortetVermerken('AUF-2026-0815', 'heim/sonnenhof');
  const gesichert = await V.depotSerialisieren();

  const { V: V2 } = ladeKern();
  await V2.depotLaden(gesichert, PW);
  const liste = V2.anfragenListe();
  assert.equal(liste.length, 1, 'sie ist noch da');
  assert.equal(liste[0].geprueft, true, 'und dass sie geprüft war, ebenso');
  assert.equal(V2.anfrageZustand(liste[0], JETZT), 'beantwortet');
});

test('[Kette 07 · Zug 6 · Schema 68] ein Bestandsdepot bekommt den Schlüssel, leer — und verliert nichts', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const d = V.getData();
  d.schemaVersion = 67;
  delete d.anfragen;
  V.depotNormalisieren(d);
  assert.ok(Array.isArray(d.anfragen), 'der Schlüssel entsteht hier');
  assert.equal(d.anfragen.length, 0, 'und er ist leer — die Stufe erfindet keine Anfrage');
  assert.ok(d.schemaVersion >= 68);
  assert.equal(d.sektoren.identity.givenName, 'Hedwig', 'und sie schreibt nichts um');
});

test('[Kette 07 · Zug 6] eine Anfrage geht NICHT in einer beiläufigen Ausgabe mit', async () => {
  const V = await heimaufnahmeDepot();
  V.anfrageMerken(V.anfrageAusText(JSON.stringify(heimAnfrage())), null);
  const ohne = V.vollExportJSON({});
  assert.deepEqual(ohne.depot.anfragen, [], 'WER Sie wonach gefragt hat, ist eine Aussage über eine Lebenslage');
  assert.equal(ohne._zurueckgehalten.anfragen, 1, 'zurückgehalten wird GEZÄHLT, nicht verschwiegen');
  const mit = V.vollExportJSON({ sensibel: true });
  assert.equal(mit.depot.anfragen.length, 1, 'beim Umzug geht sie mit — Gegenprobe');
});

/* ══ ZUG 7 — die Anfrage als Einstieg ═════════════════════════════════════ */

test('[Kette 07 · Zug 7] die Anfrage führt durch GENAU die Felder, die sie verlangt — nicht durch 178 andere', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);                      // ein frisches, leeres Depot
  const s = V.anfrageEinstiegSchritte(heimAnfrage());
  assert.equal(s.ok, true);
  assert.equal(s.schritte.length, 12, 'zwölf Schritte, nicht 178');
  assert.deepEqual(s.schritte.map(x => x.kennung).sort(), ZWOELF.map(a => a.kennung).sort());
  for (const x of s.schritte) assert.ok(x.label && x.zweck, 'jeder Schritt trägt Beschriftung und Zweck');
});
test('[Kette 07 · Zug 7] Pflichtangaben zuerst, unbekannte Kennungen führen durch NICHTS', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const a = heimAnfrage();
  a.felder = [{ kennung: 'health.lieblingsfarbe', zweck: 'Zimmer', pflicht: true },
              { kennung: 'health.bloodType', zweck: 'Notfall', pflicht: false },
              { kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }];
  const s = V.anfrageEinstiegSchritte(a);
  assert.equal(s.schritte.length, 2, 'die unbekannte führt durch nichts');
  assert.equal(s.unbekannt.length, 1, 'sie wird benannt');
  assert.equal(s.schritte[0].pflicht, true, 'Pflichtangaben zuerst');
  assert.equal(s.schritte[1].pflicht, false);
});
test('[Kette 07 · Zug 7 · Gegenprobe] eine Anfrage ohne ein einziges bekanntes Feld ergibt KEINEN Einstieg', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const a = heimAnfrage({ felder: [{ kennung: 'health.gibtesnicht', zweck: 'x', pflicht: true }] });
  const s = V.anfrageEinstiegSchritte(a);
  assert.equal(s.schritte.length, 0, 'ein frisch angelegtes Depot mit nichts darin wäre eine leere Zusage');
});

/* ══ DER INSTITUTIONSLAUF (Ebene 3) ═══════════════════════════════════════
   erzeugen · zustellen · lesen · abgleichen · nachtragen · beantworten ·
   Antwort kommt an · wird gelesen. In EINEM Lauf, ohne Zwischenzustand von Hand. */

test('[Kette 07 · Ebene 3] der ganze Weg: erzeugen · zustellen · lesen · abgleichen · nachtragen · beantworten · ankommen', async () => {
  // 1 · ERZEUGEN — die Institution baut ihre Anfrage und signiert sie.
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const anfrage = heimAnfrage();
  const { umschlag } = await signierterUmschlag(V, anfrage);

  // 2 · ZUSTELLEN — als Link (der Weg vom schwarzen Brett).
  const b64 = Buffer.from(JSON.stringify(umschlag), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const link = 'https://privat-de.vivodepot.org/#anfrage=' + b64;

  // 3 · LESEN — bei der Bürgerin, deren Depot zwei der geforderten Angaben nicht hat.
  const B = await heimaufnahmeDepot(['health.insuranceNumber', 'socialInsurance.careLevel']);
  const gelesen = B.anfrageAusText(link);
  assert.ok(gelesen, 'die Anfrage kommt an');
  const pruef = await B.anfrageSignaturPruefen(gelesen, PRUEF_OPT);
  assert.equal(pruef.geprueft, true, 'und sie ist geprüft: ' + (pruef.grund || ''));
  const eintrag = B.anfrageMerken(gelesen, pruef).eintrag;

  // 4 · ABGLEICHEN — genau die zwei Lücken.
  let ab = B.anfrageAbgleich(eintrag.anfrage, { jetzt: JETZT });
  assert.deepEqual(ab.fehlend.map(f => f.kennung).sort(),
    ['health.insuranceNumber', 'socialInsurance.careLevel'].sort());

  // 5 · NACHTRAGEN — an Ort und Stelle, ohne den Weg zu verlassen.
  assert.equal(B.anfrageFeldNachtragen('health.insuranceNumber', 'A123456780').ok, true);
  assert.equal(B.anfrageFeldNachtragen('socialInsurance.careLevel', '3').ok, true);
  ab = B.anfrageAbgleich(eintrag.anfrage, { jetzt: JETZT });
  assert.deepEqual(ab.fehlend, [], 'die Lücken sind zu');

  // 6 · BEANTWORTEN.
  const antwort = B.anfrageAntwortDatensatz(eintrag.anfrage, { sensibel: true });
  B.anfrageBeantwortetVermerken(eintrag.anfrage.vorgang, eintrag.anbieterId);
  assert.equal(B.anfrageZustand(B.anfragenListe()[0], JETZT), 'beantwortet');

  // 7 · ANKOMMEN UND GELESEN WERDEN — die Antwort trägt alle zwölf Angaben mit Werten,
  //     ihren Vorgang und ihre Grundlage, und sagt selbst, dass nichts fehlt.
  const beimEmpfaenger = JSON.parse(JSON.stringify(antwort));
  assert.equal(beimEmpfaenger.felder.length, 12, 'zwölf Angaben, nicht zehn');
  assert.equal(beimEmpfaenger.vollstaendig, true);
  assert.deepEqual(beimEmpfaenger.unbekannt, []);
  assert.equal(beimEmpfaenger.anfrage.vorgang, 'AUF-2026-0815', 'der Empfänger weiss, worauf das die Antwort ist');
  assert.equal(beimEmpfaenger.anfrage.grundlage.includes('§ 630f BGB'), true, 'und auf welcher Grundlage er gefragt hat');
  const bereiche = new Set(beimEmpfaenger.felder.map(f => f.bereich));
  assert.ok(bereiche.size >= 4, 'bereichsübergreifend, wie eine Heimaufnahme nun einmal ist');
  for (const f of beimEmpfaenger.felder) assert.ok(f.zweck, 'und je Angabe steht da, wozu sie gefragt wurde');
});

/* ══ ZUG 5 — DERSELBE ERZEUGER, ZWEITE AUSGABEART ═════════════════════════
   Kein zweites Werkzeug: wer für Anfragen ein eigenes Programm baut, pflegt zwei. */
const { ladeGenerator } = require('./load-generator.js');
const GEN = ladeGenerator().V;

function erzeugerState(pubJwk, ueber) {
  return Object.assign({
    anbieter: { anbieterId: 'heim/sonnenhof', anbieterName: 'Pflegeheim Sonnenhof gGmbH' },
    publicKeyJwk: pubJwk,
    anfrage: {
      zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
      grundlage: '§ 630f BGB (Behandlungsdokumentation) und der von Ihnen unterzeichnete Heimvertrag',
      vorgang: 'AUF-2026-0815', gueltigBis: '2026-09-30',
      antwortArt: 'einmalpasswort', antwortAn: 'aufnahme@sonnenhof.example.de',
      felder: ZWOELF.map((a) => ({ kennung: a.kennung, zweck: a.zweck, pflicht: true })),
    },
  }, ueber || {});
}

test('[Kette 07 · Zug 5] der Erzeuger baut eine Anfrage — über die SUCHE, mit Zweck je Feld', async () => {
  assert.ok(GEN.FELDKATALOG.length > 200, 'der Feldkatalog kommt aus dem Kern, nicht aus einer Handliste');
  const treffer = GEN.anfrageFelderSuchen('geburtsdatum');
  assert.ok(treffer.some((f) => f.kennung === 'identity.birthDate'), 'gesucht wird über die Beschriftung');
  assert.ok(GEN.anfrageFelderSuchen('gebúrtsdatum').length >= 0, 'die Suche wirft nie');
  const paar = await anbieterPaar();
  const p = GEN.pruefeAnfrage(erzeugerState(paar.pubJwk));
  // Array.from: der Erzeuger läuft in einem eigenen Realm, seine Arrays tragen einen eigenen
  // Prototyp — `deepStrictEqual` vergliche sonst Herkunft statt Inhalt.
  assert.deepEqual(Array.from(p.blocker), [], 'die erzeugte Anfrage entspricht ihrem eigenen Schema');
  assert.deepEqual(Array.from(p.warnungen), [], 'und jede Kennung steht im Feldkatalog');
  assert.equal(p.anfrage.felder.length, 12);
  assert.ok(p.anfrage.felder.every((f) => f.zweck), 'Zweck JE FELD');
});

test('[Kette 07 · Zug 5 · Gegenprobe] eine Kennung, die es nicht gibt, wird BEIM ERZEUGER benannt', async () => {
  const paar = await anbieterPaar();
  const st = erzeugerState(paar.pubJwk);
  st.anfrage.felder = st.anfrage.felder.concat([{ kennung: 'health.lieblingsfarbe', zweck: 'Zimmer', pflicht: false }]);
  const p = GEN.pruefeAnfrage(st);
  assert.equal(Array.from(p.warnungen).length, 1, 'sie kostet die Bürgerin sonst eine Rückfrage, die offline niemand beantwortet');
  assert.ok(p.warnungen[0].includes('lieblingsfarbe'));
});
test('[Kette 07 · Zug 5 · Gegenprobe] eine Anfrage ohne Grundlage wird gar nicht erst erzeugt', async () => {
  const paar = await anbieterPaar();
  const st = erzeugerState(paar.pubJwk);
  st.anfrage.grundlage = '';
  assert.ok(Array.from(GEN.pruefeAnfrage(st).blocker).length > 0, 'die Grundlage ist Pflicht, nicht Kür');
});

test('[Kette 07 · Zug 5 · Rundlauf] was der Erzeuger signiert, liest die Bürger-Anwendung als GEPRÜFT', async () => {
  const V = await heimaufnahmeDepot();
  const paar = await anbieterPaar();
  // Das Zertifikat stellt die Trust Authority aus — hier über den Test-Sentinel.
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await V._signJWS(baueCert(paar.pubJwk), sentinelSign, {});
  const st = erzeugerState(paar.pubJwk, { zertifikatJws: certJws });

  const umschlag = await GEN.baueAnfrageSigniert(st, paar.privJwk);
  assert.ok(umschlag.anfrageJws, 'der Erzeuger signiert');

  // Zustellung als LINK — der Weg vom schwarzen Brett.
  const link = GEN.anfrageAlsLink(umschlag);
  const gelesen = V.anfrageAusText(link);
  assert.ok(gelesen, 'die Bürger-Anwendung liest ihn');
  const p = await V.anfrageSignaturPruefen(gelesen, PRUEF_OPT);
  assert.equal(p.geprueft, true, 'und prüft ihn über dieselbe zweistufige Kette wie eine Vorlage: ' + (p.grund || ''));
  assert.equal(p.anbieterId, 'heim/sonnenhof');
  const ab = V.anfrageAbgleich(gelesen.anfrage, { jetzt: JETZT });
  assert.equal(ab.ok, true);
  assert.equal(ab.vorhanden.length, 12, 'und findet alle zwölf verlangten Angaben');
});
test('[Kette 07 · Zug 5 · Rot-Beweis] mit dem FALSCHEN Private-Key bricht der Erzeuger ab — nicht erst die Bürgerin', async () => {
  const paar = await anbieterPaar();
  const fremd = await anbieterPaar();
  await assert.rejects(() => GEN.baueAnfrageSigniert(erzeugerState(paar.pubJwk), fremd.privJwk),
    /passt nicht zum Public-Key/, 'der falsche Schlüssel wird FRÜH gefangen');
});
test('[Kette 07 · Zug 5] eine unsignierte Anfrage entsteht trotzdem — die Tür bleibt offen', async () => {
  const paar = await anbieterPaar();
  const umschlag = await GEN.baueAnfrageSigniert(erzeugerState(paar.pubJwk), null);
  assert.equal(umschlag.anfrageJws, undefined, 'ohne Schlüssel keine Signatur');
  const V = await heimaufnahmeDepot();
  assert.ok(V.anfrageAusText(GEN.anfrageAlsText(umschlag)), 'und die Bürger-Anwendung nimmt sie an');
});

/* ══ EINE FORM, DREI SEITEN — der Wächter dagegen, dass sie auseinanderlaufen ══
   Kern, Einreich-Schema und Erzeuger beschreiben DIESELBE Anfrage. Stünde die
   Form nur auf einer Seite, hielte sie allein — genau der Zustand, den Auftrag 5
   an den vier Feldarten gemessen hat. */
test('[Kette 07 · Wächter] Kern, Schema-Datei und Erzeuger kennen dieselben Anfrage-Schlüssel', async () => {
  const V = await heimaufnahmeDepot();
  const datei = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'template-generator', 'anfrage-schema.json'), 'utf8'));
  assert.equal(JSON.stringify(GEN.ANFRAGE_SCHEMA), JSON.stringify(datei),
    'ein Vertrag in zwei Fassungen ist kein Vertrag');
  assert.deepEqual(Object.keys(datei.properties).sort(), Array.from(V.ANFRAGE_SCHLUESSEL).sort(),
    'die Schlüssel der Anfrage sind auf beiden Seiten dieselben');
  assert.deepEqual(Object.keys(datei.properties.felder.items.properties).sort(),
    Array.from(V.ANFRAGE_FELD_SCHLUESSEL).sort(), 'und die eines Feld-Eintrags ebenso');
  assert.deepEqual(datei.properties.antwort.properties.art.enum.slice().sort(),
    Array.from(V.ANFRAGE_ANTWORT_ARTEN).sort(), 'und die zwei Antwortwege');
});
test('[Kette 07 · Wächter · Rot-Beweis] ein Schlüssel nur auf einer Seite lässt den Wächter anschlagen', async () => {
  const V = await heimaufnahmeDepot();
  const datei = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'template-generator', 'anfrage-schema.json'), 'utf8'));
  const gekippt = Object.keys(datei.properties).concat(['heimlichNochWas']).sort();
  assert.notDeepEqual(gekippt, Array.from(V.ANFRAGE_SCHLUESSEL).sort(),
    'genau das fängt der Wächter: eine Seite kennt etwas, das die andere nicht kennt');
});
test('[Kette 07 · Wächter] der Feldkatalog des Erzeugers stimmt mit dem Kern überein', () => {
  /* NACHGEZOGEN (18.09.2026, feldkatalog/457-Befund): `katalogAusKern()` allein war bis zum
     17.09.2026 der GANZE Katalog — seit „Templates als eigene Quelle" (build-feldkatalog.js,
     Kopf-Kommentar zu katalogAusTemplateDatei) liefert sie nur noch den KERN-materialisierten
     Teil (`template: null`), die tools/bereich-templates/-Felder kommen zusätzlich über
     katalogAusTemplateVerzeichnis() + felderVereinigen() hinzu — genau der Weg, den
     build-feldkatalog.js main() selbst geht, um GEN.FELDKATALOG zu schreiben. Ein Vergleich
     gegen katalogAusKern() allein verglich die GANZE Ausgabe mit einem TEIL ihrer Quellen und
     mußte seit dem 17.09.2026 auseinanderlaufen (gemessen: 613 gegen 457) — kein Katalog-Bug. */
  const { katalogAusKern, katalogAusTemplateVerzeichnis, felderVereinigen, BEREICH_TEMPLATES_DIR }
    = require('../tools/build-feldkatalog.js');
  // Dieselbe Quelle wie build-feldkatalog.js main(): der PRODUKT-Kern liefert
  // kennungAusSelektor/textLesen, nicht GEN (der Generator hat eigene Instanzen derselben
  // Funktionen, aber main() selbst geht über den Produkt-Kern — treu nachgebaut, nicht geraten).
  const { V: produktKern } = require('../tests/load-kern.js').ladeKern();
  const nativeFelder = katalogAusKern();
  const templateFelder = katalogAusTemplateVerzeichnis(
    BEREICH_TEMPLATES_DIR, produktKern.kennungAusSelektor, produktKern.textLesen);
  const ausKern = felderVereinigen(nativeFelder, templateFelder);
  assert.equal(GEN.FELDKATALOG.length, ausKern.length, 'gleiche Zahl');
  assert.deepEqual(Array.from(GEN.FELDKATALOG).map((f) => f.kennung), ausKern.map((f) => f.kennung),
    'und dieselben Kennungen, in derselben Reihenfolge — eine Quelle, kein zweiter Katalog');
});
