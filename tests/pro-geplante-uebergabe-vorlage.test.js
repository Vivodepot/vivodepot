'use strict';
/* Pro-Vorlage „geplante Übergabe" (Bank-Demo, Auftrag 16.09.2026): der ganze Weg
   Feldliste (CSV) → Generator → signiertes Paket → Issuer mit Test-Anker → Kern mit Pro-Bereichen,
   deutsch und englisch. Die Feldlisten liegen in tools/pro-geplante-uebergabe/. Sichtbar als Muster
   gekennzeichnet (Gruppe und erster Hilfetext); die drei vorhandenen Pro-Stellen (Gesellschaftsvertrag,
   Testament, Vertretung) werden genannt, nicht doppelt angelegt. Nur Test-Schlüssel. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');
const LOAD_KERN = require.resolve('./load-kern.js');

const REPO = path.join(__dirname, '..');
const PRO_BEREICH = 'pro-gesellschaft-nachfolge';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-geplante-uebergabe-'));
test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

/* „Kern mit Pro-Bereichen" ist das gebackene Pro-Produkt, nicht der Standardkern mit einem
   nachträglich gesetzten bereichsErsatz: BUERGERMODUL_BUENDEL ist seit dem Schnitt null, die Pro-Bereiche
   kommen als Templates in das Produkt (tools/lib/vier-produkte.js, modulDateienFuer). */
function kernFuer(slug) {
  const p = VP.PRODUKTE.find((x) => x.slug === slug);
  const r = konfektionieren({
    ziel: path.join(TMP, slug), slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: VP.modulDateienFuer(p),
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}

const { V: G } = ladeGenerator();
const { V: I } = ladeIssuer();
const j = (x) => JSON.parse(JSON.stringify(x));

const STAMMDATEN = {
  anbieterName: 'Stadtbank Beispielstadt (Muster)', rechtsform: 'Anstalt öffentlichen Rechts',
  strasse: 'Musterweg 1', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland',
  kontaktName: 'Muster-Beratung', kontaktFunktion: 'Nachfolgeberatung', kontaktEmail: 'beratung@stadtbank-beispielstadt.example.org',
  kontaktTelefon: '+49 30 0000000', bereich: 'finance',
  useCase: 'Muster für eine Vorführung: geplante Übergabe eines Betriebs aus Sicht der Bank, im Pro-Bereich Gesellschaft und Nachfolgeregelung.',
};

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

function feldliste(sprache) {
  return G.felderAngleichungen(G.csvZuFelder(fs.readFileSync(path.join(REPO, 'tools/pro-geplante-uebergabe/feldliste-' + sprache + '.csv'), 'utf8')));
}

for (const [sprache, gruppe, erstesFeld] of [['de', 'Geplante Übergabe (Muster)', 'Art der Übergabe'], ['en', 'Planned handover (sample)', 'Type of handover']]) {
  test('[Pro-Vorlage geplante Übergabe·' + sprache + '·Rot-Beweis] ein Feld mit Tippfehler im Pro-Bereich blockiert — die Probe unten ist nicht grün aus Blindheit', () => {
    const { felder } = feldliste(sprache);
    const kaputt = felder.map((f, i) => (i === 0 ? Object.assign({}, f, { bereich: 'pro-gesellschaft-nachfolg' }) : f));
    const k = G.pruefeKonformitaet({ felder: kaputt, anbieter: G.baueAnbieter(STAMMDATEN), publicKeyJwk: { kty: 'OKP' } });
    assert.ok(k.blocker.length > 0);
  });

  test('[Pro-Vorlage geplante Übergabe·' + sprache + '] Feldliste → Generator: 13 Felder, nichts angeglichen, kein Blocker, keine Fehlstelle', () => {
    const { felder, angeglichen } = feldliste(sprache);
    assert.equal(felder.length, 13);
    assert.deepEqual(j(angeglichen), []);
    const k = G.pruefeKonformitaet({ felder, anbieter: G.baueAnbieter(STAMMDATEN), publicKeyJwk: { kty: 'OKP' } });
    assert.deepEqual(j(k.blocker), []);
    assert.ok(!k.warnungen.some((w) => /^ACHTUNG/.test(w)));
    const a = G.fehlstellenAuskunft({ felder });
    assert.equal(a.torOffen, true);
    assert.deepEqual(j([a.nichtAngezeigt, a.ohneZeilen, a.feldVerworfen]), [[], [], []]);
    assert.ok(felder.every((f) => f.bereich === PRO_BEREICH && f.gruppe === gruppe));
    assert.match(felder[0].hilfetext, sprache === 'de' ? /^Muster für die Vorführung/ : /^Sample for demonstration/);
  });

  test('[Pro-Vorlage geplante Übergabe·' + sprache + '] signiert → Issuer mit Test-Anker → Kern mit Pro-Bereichen: alle 13 kommen an, Verweise tragen', async () => {
    const { felder } = feldliste(sprache);
    const anbieterSchluessel = await paar();
    const anker = await paar();
    const submission = await G.baueSubmissionSigniert({
      anbieter: G.baueAnbieter(STAMMDATEN), publicKeyJwk: anbieterSchluessel.pub, felder,
      vorlageId: 'pro-geplante-uebergabe-' + sprache, version: 1,
    }, anbieterSchluessel.priv);
    assert.deepEqual(j(G.validiereSubmission(submission)), []);
    const d = I.submissionZuAnbieterDaten(submission);
    const vc = I.baueProviderVC({ anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
      publicKeyJwk: d.publicKeyJwk, templates: d.templates, issuanceDate: '2026-09-01T00:00:00Z', expirationDate: '2027-09-01T00:00:00Z' });
    const bundle = I.baueAuslieferungsBundle(await I.stelleProviderCredentialAus(vc, await I._jwsImportSignKey(anker.priv)), d.templatesJws[0]);

    const { V: K } = kernFuer('pro-' + sprache);
    const teil = K._importEingabeAufteilen(JSON.stringify(bundle));
    const plan = await K.importPlanGeprueft('provider-credential', teil.text,
      Object.assign({}, teil.opts, { jetzt: new Date('2026-09-16T12:00:00Z'), ankerJwk: anker.pub }));
    assert.ok(!plan.ungueltig, 'Plan ungültig: ' + plan.grund);
    const defs = plan.feldDefinitionen || [];
    assert.equal(defs.length, 13, 'verworfen: ' + JSON.stringify(plan.verworfeneFelder || []));
    assert.ok(defs.every((x) => x.sektorId === PRO_BEREICH));
    assert.deepEqual(j(defs.filter((x) => x.entitaet).map((x) => x.entitaet)), ['person', 'person', 'mappe', 'person']);

    await K.depotAnlegen('Probe-Passwort-2026-Uebergabe!');
    K.akteurSelbstErklaeren('Probe');
    K.importAnwenden(plan, {});
    const html = K.templateAbschnitteHTML(K._templateAbschnitte(PRO_BEREICH), PRO_BEREICH, true);
    assert.ok(html.includes(gruppe), 'Gruppe sichtbar im Pro-Bereich');
    assert.ok(html.includes(erstesFeld), 'erstes Feld sichtbar');
  });
}
