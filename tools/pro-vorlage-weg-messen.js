'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pro-vorlage-weg-messen.js — trägt der Weg Feldliste → Generator → signierbares
   Modul → Pro durchgehend, deutsch und englisch? (16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: Pro-Vorlage „geplante Übergabe" für eine Bank-Demo. Die DoD verlangt,
   dass Vorlagen über Feldliste und Generator entstehen, nicht von Hand im Kern.
   Diese Datei MISST den Weg Station für Station an einer kleinen Probe-Feldliste
   und ändert keine Zeile Produktcode. Muster: tools/pro-durchstich-messen.js.

   JEDE STATION WIRD GEFAHREN, NICHT GELESEN. Wo der Generator blockiert, wird die
   nächste Station trotzdem mit einem Paket gefahren, das an der Generator-Prüfung
   vorbei gebaut ist — sonst bliebe unbekannt, ob der Riss nur im Generator liegt
   oder auch dahinter.

   KEIN ECHTER SCHLÜSSEL: Anbieter- und Anker-Schlüssel werden je Lauf frisch
   erzeugt und nach dem Lauf verworfen.

   Aufruf:
     node tools/pro-vorlage-weg-messen.js          Zusammenfassung
     node tools/pro-vorlage-weg-messen.js --json   Rohergebnis
   ════════════════════════════════════════════════════════════════════════════ */
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
const { ladeGenerator } = require(path.join(REPO, 'tests', 'load-generator.js'));
const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));

const PRO_BEREICH = 'pro-gesellschaft-nachfolge';
const JETZT = new Date('2026-09-16T12:00:00Z');
const ERSATZ = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereichsersatz.json'), 'utf8'));

// Kleine Probe, keine Vorlage: ein einfaches Feld, ein codiertes, ein Verweis, ein zweisprachiges.
const PROBE_DE = [
  { feldname: 'Art der Übergabe', feldtyp: 'auswahl', pflicht: false, bereich: PRO_BEREICH, gruppe: 'Geplante Übergabe',
    codeWerte: [{ code: 'familienintern', anzeige: 'familienintern' }, { code: 'verkauf', anzeige: 'Verkauf' }] },
  { feldname: 'Geplanter Zeitpunkt', feldtyp: 'text', pflicht: false, bereich: PRO_BEREICH, gruppe: 'Geplante Übergabe' },
];
const VERWEIS = { feldname: 'Nachfolge benannt', feldtyp: 'text', pflicht: false, bereich: PRO_BEREICH, gruppe: 'Geplante Übergabe',
  entitaet: 'person', rolle: 'nachfolge', verweisZweck: 'nachfolge' };
const ZWEISPRACHIG = { feldname: { de: 'Unternehmensbewertung', en: 'Business valuation' }, feldtyp: 'text', pflicht: false,
  bereich: PRO_BEREICH, gruppe: 'Geplante Übergabe' };

const ALS_JSON = process.argv.includes('--json');

async function schluessel() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

function anbieterDaten(G) {
  return G.baueAnbieter({
    anbieterName: 'Stadtbank Beispielstadt (Muster)', rechtsform: 'AöR', ustId: 'DE000000000',
    strasse: 'Musterweg 1', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland',
    kontaktName: 'Muster', kontaktFunktion: 'Muster', kontaktEmail: 'muster@beispiel.example',
    kontaktTelefon: '+49 30 0000000', bereich: 'finance', useCase: 'Messprobe, keine Vorlage.',
  });
}

async function kernMitProErsatz() {
  const { V: K } = ladeKern();
  K.BUERGERMODUL_BUENDEL.bereichsErsatz = { ersetzt: ERSATZ.ersetzt, neu: ERSATZ.neu };
  const bericht = K.buergermodulBuendelAnwenden(K.BUERGERMODUL_BUENDEL);
  return { K, bericht };
}

// Das Paket AN DER GENERATOR-NORMALISIERUNG VORBEI: unsigniert bauen, die Felder unverändert
// einsetzen, dann mit derselben Signaturfunktion des Generators signieren. So zeigt die nächste
// Station, ob Issuer und Kern Verweis und Sprachvarianten tragen würden, wenn der Generator sie liesse.
async function paketAnGeneratorVorbei(G, felder, anbieterSchluessel) {
  const anbieter = anbieterDaten(G);
  const paket = G.baueSammelSubmission([{ anbieter, publicKeyJwk: anbieterSchluessel.pub, felder }], { anbieter, publicKeyJwk: anbieterSchluessel.pub });
  paket.templates[0].felder = JSON.parse(JSON.stringify(felder));
  paket.templatesJws = [await G.templateJwsErzeugen(paket.templates[0], anbieterSchluessel.priv)];
  return paket;
}

async function durchIssuerUndKern({ G, I, felder, anker, anbieterSchluessel }) {
  const submission = await paketAnGeneratorVorbei(G, felder, anbieterSchluessel);
  const imPaket = submission.templates[0].felder;
  const d = I.submissionZuAnbieterDaten(submission);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp, publicKeyJwk: d.publicKeyJwk,
    templates: d.templates, issuanceDate: '2026-09-01T00:00:00Z', expirationDate: '2027-09-01T00:00:00Z',
  });
  const taSign = await I._jwsImportSignKey(anker.priv);
  const bundle = I.baueAuslieferungsBundle(await I.stelleProviderCredentialAus(vc, taSign), d.templatesJws[0]);
  const { K, bericht } = await kernMitProErsatz();
  const teil = K._importEingabeAufteilen(JSON.stringify(bundle));
  const plan = await K.importPlanGeprueft('provider-credential', teil.text, Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: anker.pub }));
  return { imPaket, plan, K, bericht };
}

async function messen() {
  const e = { stationen: [], risse: [] };
  const station = (name, einstufung, beleg) => e.stationen.push({ name, einstufung, beleg });
  const riss = (wo, was) => e.risse.push({ wo, was });

  const { V: G } = ladeGenerator();
  const { V: I } = ladeIssuer();
  const anker = await schluessel();
  const anbieterSchluessel = await schluessel();

  // ── 0 · Pro im Kern: gibt es den Zielbereich?
  {
    const { K, bericht } = await kernMitProErsatz();
    const ids = K.bereicheAlle().map((s) => s.id);
    const da = ids.includes(PRO_BEREICH);
    station('Pro-Bereich im Kern (bereichsErsatz)', da ? 'trägt' : 'reißt', 'ersetzt=' + bericht.ersetzteBereiche + ', ' + PRO_BEREICH + (da ? ' vorhanden' : ' fehlt'));
    if (!da) riss('Kern', 'Pro-Bereich ' + PRO_BEREICH + ' entsteht nicht');
  }

  // ── 1 · Generator: Konformitätsprüfung mit Pro-Bereich
  {
    const r = G.pruefeKonformitaet({ felder: PROBE_DE, anbieter: anbieterDaten(G), publicKeyJwk: anbieterSchluessel.pub });
    const blockiert = r.blocker.some((b) => /gültiger Bereich fehlt/.test(b));
    station('Generator: Feld auf Pro-Bereich', blockiert ? 'reißt' : 'trägt', blockiert ? r.blocker.find((b) => /Bereich/.test(b)).slice(0, 140) : 'kein Blocker');
    if (blockiert) riss('Generator, pruefeKonformitaet', 'erlaubt nur die 13 eingebauten Bürger-Bereiche; Pro-Bereiche aus bereichsErsatz sind gesperrt');
  }

  // ── 2 · Generator: CSV-Feldliste — tragen zusätzliche Spalten (Englisch, Verweis)?
  {
    const csv = 'feldname,feldtyp,pflicht,bereich,code_system,code_werte,hilfetext,feldname_en,entitaet\n'
      + 'Nachfolge benannt,text,nein,finance,,,,Successor named,person\n';
    const felder = G.csvZuFelder(csv);
    const f = (felder && (felder.felder || felder)[0]) || {};
    const traegtEn = JSON.stringify(f).includes('Successor named');
    const traegtVerweis = JSON.stringify(f).includes('person');
    station('Generator-CSV: englischer Feldname', traegtEn ? 'trägt' : 'reißt', 'Spalte feldname_en ' + (traegtEn ? 'übernommen' : 'verworfen'));
    station('Generator-CSV: Verweis (entitaet)', traegtVerweis ? 'trägt' : 'reißt', 'Spalte entitaet ' + (traegtVerweis ? 'übernommen' : 'verworfen'));
    if (!traegtEn) riss('Generator, CSV', 'keine Spalte für eine zweite Sprache');
    if (!traegtVerweis) riss('Generator, CSV', 'keine Spalte für Verweise (entitaet/rolle/verweisZweck)');
  }

  // ── 3 · Generator-Paket: überleben Verweis und Sprachvarianten die Paketbildung?
  {
    const sub = await G.baueSubmissionSigniert({ anbieter: anbieterDaten(G), publicKeyJwk: anbieterSchluessel.pub, felder: [VERWEIS, ZWEISPRACHIG] }, anbieterSchluessel.priv);
    const txt = JSON.stringify(sub.templates[0].felder);
    const verweis = txt.includes('"entitaet"');
    const en = txt.includes('Business valuation');
    station('Generator-Paket: Verweis', verweis ? 'trägt' : 'reißt', verweis ? 'entitaet im Paket' : 'entitaet fällt bei der Paketbildung weg');
    station('Generator-Paket: Sprachvarianten am Feldnamen', en ? 'trägt' : 'reißt', en ? 'englische Variante im Paket' : 'englische Variante fällt weg');
    if (!verweis) riss('Generator, baueSubmissionSigniert', 'Verweis-Schlüssel reisen nicht mit');
    if (!en) riss('Generator, baueSubmissionSigniert', 'Sprachvarianten reisen nicht mit');
  }

  // ── 4 · Hinter dem Generator: Issuer und Kern mit Pro-Ersatz (Paket an der Generator-Prüfung vorbei)
  for (const [name, felder] of [['einfache Felder', PROBE_DE], ['Verweis', [VERWEIS]], ['Sprachvarianten', [ZWEISPRACHIG]]]) {
    try {
      const { imPaket, plan, K } = await durchIssuerUndKern({ G, I, felder, anker, anbieterSchluessel });
      const defs = plan.feldDefinitionen || [];
      const defText = JSON.stringify(defs);
      // Nicht nur „ein Feld kam an": die EIGENSCHAFT, um die es geht, muss in der Definition stehen.
      const eigenschaft = name === 'Verweis' ? defText.includes('"person"')
        : name === 'Sprachvarianten' ? defText.includes('Business valuation') : true;
      const ok = !plan.ungueltig && defs.length === felder.length && eigenschaft;
      let sichtbar = false;
      if (ok) {
        await K.depotAnlegen('Messprobe-Passwort-2026-Nachfolge!');
        K.akteurSelbstErklaeren('Messprobe');
        K.importAnwenden(plan, {});
        const html = K.templateAbschnitteHTML(K._templateAbschnitte(PRO_BEREICH), PRO_BEREICH, true);
        sichtbar = html.includes('Geplante Übergabe') || html.includes('Übergabe');
      }
      const traegt = ok && sichtbar;
      station('Issuer → Kern (Pro): ' + name, traegt ? 'trägt' : 'reißt',
        'Eigenschaft in der Definition: ' + eigenschaft + ', im Paket ' + imPaket.length + ', Plan ' + (plan.ungueltig ? 'ungültig: ' + plan.grund : 'gültig, Definitionen ' + defs.length + ', verworfen ' + JSON.stringify(plan.verworfeneFelder || []).slice(0, 120)) + ', sichtbar im Pro-Bereich: ' + sichtbar);
      if (!traegt) riss('Issuer → Kern (Pro), ' + name, plan.ungueltig ? plan.grund : (!ok ? 'Felder verworfen' : 'nicht sichtbar'));
    } catch (err) {
      station('Issuer → Kern (Pro): ' + name, 'reißt', 'Fehler: ' + err.message.slice(0, 160));
      riss('Issuer → Kern (Pro), ' + name, err.message.slice(0, 160));
    }
  }

  // ── 5 · Szene 5: gibt es einen Anlass, der Nachfolge abbildet?
  {
    const { V: K } = ladeKern();
    const ids = (K.ANLAESSE || []).map((a) => a.id);
    const treffer = ids.filter((id) => /nachfolg|uebergab|betrieb|firma|unternehm|bank/i.test(id));
    station('Szene 5: Anlass Nachfolge', treffer.length ? 'gibt es' : 'gibt es nicht', ids.length + ' Anlässe, Treffer: ' + (treffer.join(', ') || 'keiner'));
  }

  return e;
}

messen().then((e) => {
  if (ALS_JSON) { console.log(JSON.stringify(e, null, 2)); return; }
  for (const s of e.stationen) console.log((s.einstufung.padEnd(14)) + ' ' + s.name + ' — ' + s.beleg);
  console.log('\nRisse: ' + e.risse.length);
  for (const r of e.risse) console.log('  - ' + r.wo + ': ' + r.was);
}).catch((err) => { console.error(err); process.exitCode = 1; });
