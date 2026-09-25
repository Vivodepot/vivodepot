'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pro-durchstich-messen.js — trägt die Ableitungslinie?
   ────────────────────────────────────────────────────────────────────────
   DIE FRAGE, an der alles hängt („Pro-Durchstich Andocken",
   19.08.2026): wie viele Zeilen im KERN müssen geändert werden, damit ein
   Berufsmodul andockt? Null heisst, die Linie trägt. Mehr als null heisst,
   jede fremde Ableitung stösst einen Kernumbau an.

   DIE HALTUNG IST DIE EINES FREMDEN: wer das Modul baut, hat keinen Zugriff
   auf den Kern und darf ihn nicht bitten, etwas zu ändern. Stösst der Bau an
   eine Grenze, wird sie NOTIERT und umgangen — genau diese Grenzen sind der
   Ertrag, nicht das Hindernis.

   DER PRÜFSTOFF ist ausdrücklich klein und ist ein PRÜFSTÜCK, kein Feldsatz:
   Bereich 6 der Deklination („Bildung & Beruf" → „Qualifikation und
   Nachweise", SP Pro, 18.08.2026), fünf Felder, darunter zwei vom Typ Datum
   und eines, das nach der Deklination eine LAUFENDE Nachweispflicht trägt —
   also die Marke `laeuftAb` bräuchte. Ein grösseres Modul beantwortete
   dieselbe Frage nicht besser.

   Zuschnitt wie in den Pro-Papieren: Verweise, keine Bestände. Kein Name
   eines Mandanten, keine Akte. Das hält den Durchstich aus § 203 StGB und
   Art. 9 DSGVO heraus.

   Diese Datei MISST und ändert keine Zeile Produktcode.

   Aufruf:
     node tools/pro-durchstich-messen.js
     node tools/pro-durchstich-messen.js --json
   ════════════════════════════════════════════════════════════════════════ */
const { webcrypto } = require('node:crypto');
const path = require('node:path');

const ALS_JSON = process.argv.includes('--json');
const REPO = path.join(__dirname, '..');
const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
const { ladeGenerator } = require(path.join(REPO, 'tests', 'load-generator.js'));
const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
const { ladeLesen } = require(path.join(REPO, 'tests', 'load-lesen.js'));

/* Der Sentinel-Vertrauensanker aus dem Energie-Durchstich. Er steht hier für
   „die Trust-Authority hat zertifiziert" — und dass er gebraucht wird, ist
   selbst ein Messergebnis (s. GRENZE 3 unten). */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-19T00:00:00Z';

/* Bereich 6 der Deklination. `bereich` trägt die ID, nicht die Beschriftung —
   U2-ADR-143 Punkt 3. Der Abschnittsname ist der berufliche Name aus der
   Deklination; er ist das Einzige, was das Modul an Benennung mitbringen kann. */
const ABSCHNITT = 'Qualifikation und Nachweise';
const MODUL_FELDER = [
  { feldname: 'Kammer-Mitgliedsnummer', feldtyp: 'text', bereich: 'education', gruppe: ABSCHNITT },
  { feldname: 'Fachanwaltschaft', feldtyp: 'auswahl', bereich: 'education', gruppe: ABSCHNITT,
    codeWerte: [
      { code: 'arbeitsrecht', anzeige: 'Arbeitsrecht' },
      { code: 'familienrecht', anzeige: 'Familienrecht' },
      { code: 'erbrecht', anzeige: 'Erbrecht' },
    ] },
  { feldname: 'Fortbildungspunkte im laufenden Jahr', feldtyp: 'zahl', bereich: 'education', gruppe: ABSCHNITT },
  { feldname: 'Fortbildungsnachweis faellig am', feldtyp: 'datum', bereich: 'education', gruppe: ABSCHNITT },
  { feldname: 'Berufshaftpflicht gueltig bis', feldtyp: 'datum', bereich: 'education', gruppe: ABSCHNITT },
];

const grenzen = [];   // jede Stelle, an der der Fremde anstösst
const notiere = (was, wo, folge) => grenzen.push({ was, wo, folge });

(async () => {
  const ergebnis = { zug1: {}, zug2: {}, zug3: {} };

  /* ══ ZUG 1 — das Modul bauen, als Fremder ═══════════════════════════════ */
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

  const { V: G } = ladeGenerator();
  const anbieter = G.baueAnbieter({
    anbieterName: 'Rechtsanwaltskammer Musterstadt', rechtsform: 'KdöR', ustId: 'DE987654321',
    strasse: 'Kammerweg 1', plz: '54321', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'K. Ammer', kontaktFunktion: 'Geschaeftsstelle', kontaktEmail: 'stelle@rak-musterstadt.example',
    kontaktTelefon: '+49 30 7654321', bereich: 'education',
    useCase: 'Pruefstueck Vivodepot Pro: Qualifikation und Nachweise (Deklination Bereich 6). Kein Feldsatz, keine Anforderung.',
  });
  const submission = await G.baueSubmissionSigniert(
    { anbieter, publicKeyJwk: pubJwk, felder: MODUL_FELDER },
    privJwk);
  ergebnis.zug1.generatorSigniert = !!(submission.templatesJws && submission.templatesJws[0]);
  ergebnis.zug1.felderImModul = submission.templates[0].felder.length;

  /* GRENZE 1 — die Marke, die die Deklination verlangt, kann nicht mitreisen.
     Das Generator-Vokabular kennt `feldname/feldtyp/pflicht/bereich/gruppe/
     hilfetext/mehrzeilig/codeSystem/codeWerte`. `marken` ist nicht darunter,
     und `_templateFeldZuModell` würde es auch nicht übersetzen. */
  const mitMarke = JSON.parse(JSON.stringify(MODUL_FELDER));
  mitMarke[4].marken = ['laeuftAb'];
  const versuch = await G.baueSubmissionSigniert(
    { anbieter, publicKeyJwk: pubJwk, felder: mitMarke },
    privJwk);
  const markeUeberlebtGenerator = JSON.stringify(versuch.templates[0].felder).includes('laeuftAb');
  ergebnis.zug1.markeUeberlebtGenerator = markeUeberlebtGenerator;
  if (!markeUeberlebtGenerator) {
    notiere('Die Marke `laeuftAb` reist nicht mit',
      'Generator-Vokabular (`baueSubmissionSigniert` → `template.felder`)',
      'Ein Modul kann kein Feld mit laufender Nachweispflicht anlegen — genau die Eigenschaft, '
      + 'die Befund 4 der Deklination als den laufenden Nutzen benennt.');
  }

  /* GRENZE 2 — kann der Fremde einen Bereich mitbringen? Diese Stelle stand bis
     zum 21.08.2026 als feste Behauptung („kennt vier Typen; keiner davon ist ein
     Bereich") und druckte sie neben die eigene Messung, die inzwischen `bereich`
     mit auflistete. Seit A389/U2-ADR-154 ist der Bereich das FÜNFTE Register.
     Die Grenze wird darum GEMESSEN, nicht behauptet — und fällt weg, sobald das
     Register sie nicht mehr trägt. */
  const { V: B } = ladeKern();
  const einlassTypen = (B.EINLASS_REGISTER || []).map(r => r.typ);
  ergebnis.zug1.einlassTypen = einlassTypen;
  ergebnis.zug1.bereichIstRegister = einlassTypen.includes('bereich');
  if (!ergebnis.zug1.bereichIstRegister) {
    notiere('Kein Register für Bereiche',
      '`EINLASS_REGISTER` trägt ' + einlassTypen.length + ' Typen: ' + einlassTypen.join(', '),
      'Die zwölf Bereiche stehen im Kern (`SEKTOREN`, U2-ADR-143 Punkt 1: „Der Kern ist die Quelle"). '
      + 'Ein Modul dockt FELDER in einen bestehenden Bereich an, es bringt keinen mit.');
  }

  /* ══ ZUG 2 — andocken und öffnen ════════════════════════════════════════ */
  const { V: I } = ladeIssuer();
  const d = I.submissionZuAnbieterDaten(submission);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-08-01T12:00:00Z', expirationDate: '2027-08-01T12:00:00Z',
  });
  const taSign = await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const bundle = I.baueAuslieferungsBundle(await I.stelleProviderCredentialAus(vc, taSign), d.templatesJws[0]);

  // GRENZE 3 — geht es auch OHNE den Vertrauensanker? Der Fremde hat ihn nicht.
  const teil = B._importEingabeAufteilen(JSON.stringify(bundle));
  const ohneAnker = await B.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: JETZT }));
  ergebnis.zug2.ohneAnkerAngenommen = !ohneAnker.ungueltig;
  ergebnis.zug2.ohneAnkerGrund = ohneAnker.grund || null;
  if (ohneAnker.ungueltig) {
    notiere('Ohne Vertrauensanker wird das Modul abgewiesen',
      '`importPlanGeprueft` ohne `ankerJwk` → ungueltig: ' + (ohneAnker.grund || '(ohne Grund)'),
      'Ein Fremder braucht ein von der Vivodepot-Trust-Authority zertifiziertes Anbieter-Credential. '
      + 'Der signaturfreie Einlassweg (U2-ADR-145) gilt für die ' + einlassTypen.length
      + ' Register, nicht für Felder.');
  }

  const plan = await B.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  ergebnis.zug2.planGueltig = !plan.ungueltig;
  ergebnis.zug2.planGrund = plan.grund || null;
  ergebnis.zug2.definitionen = (plan.feldDefinitionen || []).length;
  ergebnis.zug2.verworfene = plan.verworfeneFelder || [];

  await B.depotAnlegen('Kanzlei-Pruefstueck-Passwort-2026!');
  B.akteurSelbstErklaeren('Pruefstueck');
  B.importAnwenden(plan, {});

  // 2.1 · Erscheinen die Felder des Moduls in ihrem Bereich?
  const html = B.templateAbschnitteHTML(B._templateAbschnitte('education'), 'education', true);
  ergebnis.zug2.p1_imBereichSichtbar = html.includes(ABSCHNITT)
    && html.includes('Kammer-Mitgliedsnummer') && html.includes('Arbeitsrecht');

  // Werte setzen — ohne Werte sagt der Rest nichts.
  const feldIds = (plan.feldDefinitionen || []).map(x => x.feldId);
  const idVon = (teil) => feldIds.find(x => x.includes(teil));
  B.sektorFeldSetzen('education', idVon('kammer'), '12345', { eingabeArt: 'eingabe' });
  B.sektorFeldSetzen('education', idVon('fachanwaltschaft'), 'erbrecht', { eingabeArt: 'eingabe' });
  B.sektorFeldSetzen('education', idVon('fortbildungspunkte'), '15', { eingabeArt: 'eingabe' });
  B.sektorFeldSetzen('education', idVon('faellig'), '2026-12-31', { eingabeArt: 'eingabe' });
  B.sektorFeldSetzen('education', idVon('berufshaftpflicht'), '2027-03-31', { eingabeArt: 'eingabe' });

  // 2.2 · Die reduzierten Sichten — Notfall, Angehörige, Lese-App.
  const notfall = B.notfallblattHTML ? B.notfallblattHTML() : '';
  const angModell = B.angehoerigenCacheModell();
  const angText = JSON.stringify(angModell);
  ergebnis.zug2.p2_notfall = feldIds.some(f => String(notfall).includes(f)) || String(notfall).includes(ABSCHNITT);
  ergebnis.zug2.p2_angehoerige = feldIds.some(f => angText.includes(f)) || angText.includes(ABSCHNITT);

  const depotFuerLesen = JSON.parse(JSON.stringify(B.getData()));
  const { V: L } = ladeLesen();
  L.setData(depotFuerLesen);
  const lHtml = L.sektorHTML('education');
  ergebnis.zug2.p2_leseApp = lHtml.includes(ABSCHNITT) && lHtml.includes('12345');

  /* GEGENPROBE zum Export, und ohne sie wäre die Zahl wertlos: ein Format, das
     die Modul-Felder nicht trägt, könnte auch schlicht leer sein. Darum wird ein
     KERN-Feld desselben Bereichs gesetzt und im selben Lauf mitgesucht. Trägt ein
     Format das Kern-Feld und das Modul-Feld nicht, ist das eine Auslassung; trägt
     es beide nicht, ist es für diesen Bereich einfach nicht zuständig. */
  const sektorBildung = B.SEKTOREN.find(s => s && s.id === 'education');
  const kernFeldBildung = ((sektorBildung && sektorBildung.sektionen) || [])
    .flatMap(a => a.felder || []).find(f => f && f.typ === 'text' && !f.sensibel);
  if (kernFeldBildung) B.sektorFeldSetzen('education', kernFeldBildung.id, 'KERNPROBE-XYZ', { eingabeArt: 'eingabe' });
  ergebnis.zug2.kernFeldFuerGegenprobe = kernFeldBildung ? kernFeldBildung.id : null;

  // 2.3 · Trägt der Export sie? Je Format einzeln, nicht pauschal.
  ergebnis.zug2.p3_export = [];
  for (const f of (B.EXPORT_FORMATE || [])) {
    let traegt = null, grund = null;
    try {
      const inhalt = B.formatExportInhalt(f, { sensibel: true });
      const txt = typeof inhalt === 'string' ? inhalt : JSON.stringify(inhalt);
      traegt = feldIds.some(x => txt.includes(x)) || txt.includes('12345') || txt.includes(ABSCHNITT);
      var kernDrin = txt.includes('KERNPROBE-XYZ');
    } catch (e) { traegt = null; grund = e.name + ': ' + String(e.message).slice(0, 60); }
    ergebnis.zug2.p3_export.push({ format: f.id, traegt, kernFeldDrin: (typeof kernDrin === 'boolean' ? kernDrin : null), grund });
  }

  /* Der QR-Weg gehört zu Punkt 3 („PDF, maschinenlesbar, QR"). Er hängt an
     denselben Feldern wie die Notfall-Sicht — `NOTFALL_KERN_FELDER` ist eine
     feste Liste von `{sektor, feld}`-Paaren im Kern (B6 der Pro-Übergabe).
     Gemessen statt geschlossen. */
  let qrText = '';
  try {
    const meta = B.notfallKartenMeta ? B.notfallKartenMeta() : null;
    qrText = JSON.stringify(meta || '') + String(B.notfallblattHTML ? B.notfallblattHTML() : '');
  } catch (e) { qrText = ''; }
  ergebnis.zug2.p3_qr = feldIds.some(f => qrText.includes(f)) || qrText.includes('12345');
  ergebnis.zug2.notfallFelderFestVerdrahtet = (B.NOTFALL_KERN_FELDER || []).length;

  // 2.4 · Tragen die Gültigkeiten? Ein Datum des Moduls müsste einen Prüftermin erzeugen.
  const termine = B.prueftermineFelder ? B.prueftermineFelder() : [];
  const termineText = JSON.stringify(termine);
  ergebnis.zug2.p4_prueftermine = feldIds.some(f => termineText.includes(f));
  ergebnis.zug2.p4_termineGesamt = Array.isArray(termine) ? termine.length : null;

  // 2.5 · Überlebt das Modul einen Speicher- und Ladezyklus?
  const umschlag = await B.depotSerialisieren();
  await B.depotLaden(umschlag, 'Kanzlei-Pruefstueck-Passwort-2026!');
  const nachher = B.getData();
  const defsNachher = (nachher.feldDefinitionen || []).filter(x => x && x.sektorId === 'education');
  ergebnis.zug2.p5_zyklusDefinitionen = defsNachher.length;
  ergebnis.zug2.p5_zyklusWert = (nachher.sektoren && nachher.sektoren.education
    && nachher.sektoren.education[idVon('kammer')]) || null;
  ergebnis.zug2.p5_ueberlebt = defsNachher.length === (plan.feldDefinitionen || []).length
    && ergebnis.zug2.p5_zyklusWert === '12345';

  /* ══ ZUG 3 — die Zahl ═══════════════════════════════════════════════════ */
  ergebnis.zug3.kernZeilenGeaendert = 0;
  ergebnis.zug3.grenzen = grenzen;

  if (ALS_JSON) { console.log(JSON.stringify(ergebnis, null, 2)); return; }

  const ja = (x) => x === true ? 'JA' : (x === false ? 'NEIN' : 'unklar');
  console.log('Pro-Durchstich — trägt die Ableitungslinie?\n');
  console.log('ZUG 1 — das Modul, als Fremder gebaut');
  console.log('  Generator signiert:            ' + ja(ergebnis.zug1.generatorSigniert)
    + ' (' + ergebnis.zug1.felderImModul + ' Felder)');
  console.log('  Marke `laeuftAb` reist mit:    ' + ja(ergebnis.zug1.markeUeberlebtGenerator));
  console.log('  Einlass-Register-Typen:        ' + ergebnis.zug1.einlassTypen.join(', '));

  console.log('\nZUG 2 — andocken und öffnen');
  console.log('  ohne Vertrauensanker angenommen: ' + ja(ergebnis.zug2.ohneAnkerAngenommen)
    + (ergebnis.zug2.ohneAnkerGrund ? '  (' + ergebnis.zug2.ohneAnkerGrund + ')' : ''));
  console.log('  mit Anker: Plan gültig:          ' + ja(ergebnis.zug2.planGueltig)
    + ', ' + ergebnis.zug2.definitionen + ' Definitionen'
    + (ergebnis.zug2.verworfene.length ? ', verworfen: ' + JSON.stringify(ergebnis.zug2.verworfene) : ''));
  console.log('  1 · im Bereich sichtbar:         ' + ja(ergebnis.zug2.p1_imBereichSichtbar));
  console.log('  2 · Notfall-Sicht:               ' + ja(ergebnis.zug2.p2_notfall));
  console.log('  2 · Angehörigen-Sicht:           ' + ja(ergebnis.zug2.p2_angehoerige));
  console.log('  2 · Lese-App:                    ' + ja(ergebnis.zug2.p2_leseApp));
  console.log('  3 · Export je Format:');
  for (const e of ergebnis.zug2.p3_export) {
    console.log('        ' + String(e.format).padEnd(30) + 'Modul: ' + ja(e.traegt).padEnd(7)
      + 'Kern-Feld desselben Bereichs: ' + ja(e.kernFeldDrin) + (e.grund ? '   ' + e.grund : ''));
  }
  console.log('  3 · QR/Notfall-Karte:             ' + ja(ergebnis.zug2.p3_qr)
    + '  (NOTFALL_KERN_FELDER: ' + ergebnis.zug2.notfallFelderFestVerdrahtet + ' fest verdrahtete Paare)');
  console.log('  4 · Prüftermin erzeugt:          ' + ja(ergebnis.zug2.p4_prueftermine)
    + '  (Termine gesamt: ' + ergebnis.zug2.p4_termineGesamt + ')');
  console.log('  5 · überlebt Speichern+Laden:    ' + ja(ergebnis.zug2.p5_ueberlebt)
    + '  (' + ergebnis.zug2.p5_zyklusDefinitionen + ' Definitionen, Wert: ' + ergebnis.zug2.p5_zyklusWert + ')');

  console.log('\nZUG 3 — DIE ZAHL');
  console.log('  Kern-Zeilen für das Andocken geändert: ' + ergebnis.zug3.kernZeilenGeaendert);
  console.log('\n  Grenzen, an die der Fremde gestossen ist (' + grenzen.length + '):');
  for (const g of grenzen) {
    console.log('    · ' + g.was);
    console.log('      wo:    ' + g.wo);
    console.log('      folge: ' + g.folge);
  }
})().catch((e) => { console.error('DURCHSTICH ABGEBROCHEN:', e); process.exit(2); });
