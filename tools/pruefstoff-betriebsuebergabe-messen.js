#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pruefstoff-betriebsuebergabe-messen.js — trägt der Kontrakt einen Feldsatz,
   der ihn nicht kennt?
   ────────────────────────────────────────────────────────────────────────
   „Prüfstoff-Bündel Betriebsübergabe gegen den Kontrakt messen"
   (22.08.2026), Grundlage: interne Anforderung SP Pro vom selben Tag.
   Laufzettel Nacht 22./23.08.2026, Posten 4 — bewusst NACH Glied 6 des
   Schnitts gemessen, sonst wäre das Ziel beweglich gewesen.

   DIE HALTUNG IST DIE EINES FREMDEN, wie bei `tools/pro-durchstich-messen.js`
   (19.08.2026), dessen Harnisch dieses Werkzeug wörtlich übernimmt: wer den
   Feldsatz baut, kennt den Kern nicht und darf ihn nicht bitten, sich zu
   ändern. Anders als dort bringt dieser Prüfstoff einen EIGENEN BEREICH mit
   (fünftes Einlass-Register, `bereich`) und nicht nur Felder in einen
   bestehenden.

   Diese Datei MISST und ändert keine Zeile Produktcode.

   Aufruf:
     node tools/pruefstoff-betriebsuebergabe-messen.js
     node tools/pruefstoff-betriebsuebergabe-messen.js --json
   ════════════════════════════════════════════════════════════════════════ */
const { webcrypto } = require('node:crypto');
const path = require('node:path');

const ALS_JSON = process.argv.includes('--json');
const REPO = path.join(__dirname, '..');
const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
const { ladeGenerator } = require(path.join(REPO, 'tests', 'load-generator.js'));
const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-23T00:00:00Z';

const BEREICH_ID = 'betriebsuebergabe';
const HERKUNFT = 'urn:betriebsuebergabe:v0';   // Namensraum-Vorschlag der Anforderung, Abschnitt 2a

/* ══ DER FELDSATZ, HERSTELLERNEUTRAL AUS DER ANFORDERUNG ÜBERSETZT ═══════════
   NACHTRAG 23.08.2026 (SP Pro, zwei Korrekturen am eigenen Feldsatz — Fehler im
   Feldsatz, nicht im Befund): der Typ `kontakt` ist ENTFALLEN. Was ursprünglich
   `kontakt` hieß, wird jetzt strukturell wie jedes andere zusammengesetzte Feld
   behandelt — `feldtyp:'liste'` mit zwei Unterfeldern `Name`/`Erreichbarkeit` —
   und braucht darum KEINEN Ersatz-Eintrag mehr in `TYP_ERSATZ`. Die Typliste der
   Anforderung schrumpft damit von sieben auf vier: `text`, `datum`, `auswahl`,
   `jaNein`. Neu, an den Anfang von Block 1: `vertretung.alleinvertretung`
   (`jaNein`, `pflicht:true` — 1..1), s. FELDER unten.

   `kennung`, `verweis` bleiben der Messgegenstand (Abschnitt 2b der
   Anforderung) — sie werden NICHT stillschweigend auf `text` gemappt, sondern
   hier explizit benannt, mit Begründung, als eigene Konstante, damit der
   Bericht sie zählen kann, ohne den Feldsatz erneut zu lesen.

   ABBILDUNG DER ZWEI VERBLIEBENEN FEHLENDEN TYPEN (Zug 1, das eigentliche Messergebnis):
     kennung  -> text   (Registernummer/Urkundennummer/Vertragsnummer: freier
                 Text, keine Formprüfung verlangt — kein struktureller Verlust)
     verweis  -> text   (Ortsangabe „wo etwas liegt" — DASSELBE Muster wie die
                 zahlreichen `_ort`-Felder im eingebauten Katalog, z. B.
                 `testament_ort`; kein struktureller Verlust)

   DER FRÜHERE `kontakt`-EINTRAG (bis 22.08.2026 hier `kontakt: 'text'`, Name
   UND Erreichbarkeit in einem Feld): ERWOGEN und VERWORFEN blieb `typ:'ref'`
   (entitaet:'person') — trägt nur einen Namen/Override, kein Erreichbarkeits-
   Unterfeld; entweder ginge die Erreichbarkeit verloren, oder jeder Kontakt
   müsste erst eine Person im Register werden, obwohl viele „Kontakte" hier
   Institutionen sind (Notariat, Steuerbüro). Die jetzige Lösung (`liste` mit
   `Name`+`Erreichbarkeit`) verliert nichts UND behält die Struktur — sie
   braucht nichts Neues, dieselbe Bauart, die für 24 der 35 ursprünglichen
   Felder ohnehin schon verwendet wurde.

   ZUSAMMENGESETZTE FELDER (mehrere Typen in einer Zeile, gleich welcher
   Kardinalität) werden EINHEITLICH als `feldtyp:'liste'` mit `unterFelder`
   gebaut — das ist der von SP Bau vorab bestätigte Weg (Zug 1 der
   Anforderung: `finanzen.bankverbindung`). Für 0..1-Felder mit mehreren Typen
   bleibt das dieselbe Form; der Kontrakt kennt aber KEINE Kardinalitäts-
   Schranke — eine Liste, die „genau ein Eintrag" bedeuten soll, kann eine
   Bürgerin trotzdem auf zwei Einträge wachsen lassen. Das ist Befund 3
   (Kardinalität), nicht Befund 1 (Feldsatz-Änderung). GEMESSEN (ZUG 4 unten):
   die Umstellung von Korrektur zwei macht genau ZWEI der drei ursprünglich
   `kontakt`-typisierten Felder aus einem einwertigen Skalar unbegrenzt
   mehrwertig (`Benannte Person (Wunsch, keine Bestellung)`, G1;
   `Administration (intern/extern)`, G4) — das dritte
   (`Weitere Geschäftsführer/Vorstände`) war schon vor der Korrektur `liste`
   und bleibt es, nur mit einem zweiten Unterfeld. Die im Auftrag zu diesem
   Nachtrag genannten Beispiele „gesellschaft.notar"/„betrieb.datensicherung"
   halten der Nachmessung NICHT stand: beide heutigen Felder `Notar` (G2) und
   `Datensicherung` (G4) waren nie `kontakt`-typisiert und sind von Korrektur
   zwei unberührt — nur `betrieb.administration` trifft zu. */
const TYP_ERSATZ = Object.freeze({
  kennung: 'text',
  verweis: 'text',
});

function skalar(feldname, feldtyp, gruppe, extra) {
  return Object.assign({ feldname, feldtyp, bereich: BEREICH_ID, gruppe }, extra || {});
}
function liste(feldname, gruppe, unterFelder) {
  return { feldname, feldtyp: 'liste', bereich: BEREICH_ID, gruppe, unterFelder };
}
const UF = (feldname, typ) => ({ feldname, feldtyp: typ });

const G1 = 'Block 1 — Wer darf handeln';
const G2 = 'Block 2 — Was die Gesellschaft handlungsfähig macht';
const G3 = 'Block 3 — Fristen und Geld';
const G4 = 'Block 4 — Betrieb und Zugänge';
const G5 = 'Block 5 — Aufbewahrung und Ordnung';

const FELDER = [
  // ── Block 1 ────────────────────────────────────────────────────────────
  // NEU (Nachtrag 23.08.2026, Korrektur 1) — vertretung.alleinvertretung, 1..1: „Gibt es außer
  // der ausfüllenden Person eine weitere vertretungsberechtigte Person?" `pflicht:true` drückt
  // die Untergrenze aus (die Feld-Eigenschaft existiert bereits, s. ZUG 4 unten); die Obergrenze
  // 1 folgt aus dem Skalar-Typ selbst — kein Listenfeld.
  skalar('Weitere vertretungsberechtigte Person vorhanden', 'jaNein', G1, { pflicht: true }),
  skalar('Vertretungsregelung', 'auswahl', G1, { codeWerte: [
    { code: 'einzel', anzeige: 'Einzelvertretungsberechtigt' },
    { code: 'gesamt', anzeige: 'Gesamtvertretungsberechtigt' },
    { code: 'einzel_befreit', anzeige: 'Einzelvertretungsberechtigt, befreit von §181 BGB' },
    { code: 'gesamt_befreit', anzeige: 'Gesamtvertretungsberechtigt, befreit von §181 BGB' },
  ] }),
  skalar('Zuständiges Registergericht', 'text', G1),
  skalar('Registernummer', 'text', G1),                                    // kennung -> text
  // Nachtrag Korrektur 2: zweites Unterfeld ergänzt (Name/Erreichbarkeit statt einem `Kontakt`-Text) —
  // war schon vor der Korrektur `liste` (0..n „Weitere"), Kardinalität unveraendert.
  liste('Weitere Geschäftsführer/Vorstände', G1, [UF('Name', 'text'), UF('Erreichbarkeit', 'text')]),
  liste('Prokura', G1, [UF('Wer', 'text'), UF('Seit', 'datum'), UF('Urkunde liegt bei', 'text')]),
  liste('Handlungsvollmacht', G1, [UF('Wer', 'text'), UF('Wofür', 'text'), UF('Urkunde liegt bei', 'text')]),
  skalar('Vorsorgevollmacht privat — Ablageort', 'text', G1),              // verweis -> text
  liste('Unternehmervollmacht', G1, [UF('Notar', 'text'), UF('Urkundennummer', 'text'), UF('Verwahrort', 'text')]),
  liste('Vollmacht über den Tod hinaus', G1, [UF('Gilt', 'jaNein'), UF('Bevollmächtigter', 'text'), UF('Urkunde liegt bei', 'text')]),
  // Nachtrag Korrektur 2: SKALAR -> LISTE, echte Kardinalitäts-Weitung (0..1 gedacht -> 0..n), s. ZUG 4/Befund 3.
  liste('Benannte Person (Wunsch, keine Bestellung)', G1, [UF('Name', 'text'), UF('Erreichbarkeit', 'text')]),

  // ── Block 2 ────────────────────────────────────────────────────────────
  liste('Gesellschafterliste', G2, [UF('Fassung vom', 'datum'), UF('Original liegt bei', 'text')]),
  liste('Gesellschaftsvertrag', G2, [UF('Fundort', 'text'), UF('Letzte Änderung', 'datum')]),
  skalar('Nachfolgeklausel im Gesellschaftsvertrag vorhanden', 'jaNein', G2),
  liste('Notar', G2, [UF('Kanzlei', 'text'), UF('Urkundenverzeichnis liegt bei', 'text')]),
  liste('Steuerberatung', G2, [UF('Büro', 'text'), UF('Buchhaltung liegt bei', 'text')]),
  liste('Aufsichtsgremium (Beirat/Aufsichtsrat)', G2, [UF('Mitglied', 'text')]),
  liste('Erbregelung auf die Gesellschaft abgestimmt', G2, [UF('Abgestimmt', 'jaNein'), UF('Unterlage liegt bei', 'text')]),

  // ── Block 3 ────────────────────────────────────────────────────────────
  liste('Bankverbindung', G3, [UF('Institut', 'text'), UF('Vollmacht-Inhaber', 'text'), UF('Gilt über den Tod hinaus', 'jaNein')]),
  liste('Wiederkehrende Zahlung', G3, [UF('Bezeichnung', 'text'), UF('Fälligkeit', 'datum')]),
  liste('Kredit', G3, [UF('Bezeichnung', 'text'), UF('Ansprechpartner', 'text'), UF('Kündigungsrecht bei Führungswechsel', 'jaNein')]),
  liste('Persönliche Sicherheit (Bürgschaft)', G3, [UF('Wofür/gegenüber wem', 'text')]),
  liste('Steuerfrist', G3, [UF('Anmeldung/Vorauszahlung', 'text'), UF('Termin', 'datum')]),
  liste('Versicherung', G3, [UF('Art', 'text'), UF('Ansprechpartner', 'text'), UF('Meldefrist', 'datum')]),
  liste('Vertrag mit Kontrollwechsel-Klausel', G3, [UF('Vertrag', 'text'), UF('Ansprechpartner', 'text')]),

  // ── Block 4 ────────────────────────────────────────────────────────────
  liste('Fachanwendung', G4, [UF('Anbieter', 'text'), UF('Ansprechpartner', 'text'), UF('Vertragsnummer', 'text')]),
  liste('Behördenzugang', G4, [UF('Postfach', 'text'), UF('Zugangsmittel liegt bei', 'text')]),
  liste('Zugangsmittel', G4, [UF('Bezeichnung', 'text'), UF('Verwahrort', 'text')]),
  // Nachtrag Korrektur 2: SKALAR -> LISTE, echte Kardinalitäts-Weitung (0..1 gedacht -> 0..n), s. ZUG 4/Befund 3.
  liste('Administration (intern/extern)', G4, [UF('Name', 'text'), UF('Erreichbarkeit', 'text')]),
  liste('Personal', G4, [UF('Anzahl/Struktur', 'text'), UF('Ansprechpartner', 'text'), UF('Verträge liegen bei', 'text')]),
  liste('Räume', G4, [UF('Mietvertrag liegt bei', 'text'), UF('Kündigungsfrist', 'datum')]),
  liste('Datensicherung', G4, [UF('Ort/Verfahren', 'text'), UF('Wer kann zurückspielen', 'text')]),

  // ── Block 5 ────────────────────────────────────────────────────────────
  liste('Geschäftsunterlagen', G5, [UF('Ort', 'text'), UF('Systematik', 'text')]),
  liste('Aufbewahrungsfrist', G5, [UF('Unterlagenart', 'text'), UF('Fristende', 'datum')]),
  liste('Archivdienstleister', G5, [UF('Dienstleister', 'text'), UF('Vertragsnummer', 'text'), UF('Zugriffsregeln', 'text')]),
  liste('Branchenpflicht', G5, [UF('Pflicht', 'text'), UF('Frist', 'datum')]),
];

const grenzen = [];
const notiere = (was, wo, folge) => grenzen.push({ was, wo, folge });

(async () => {
  const ergebnis = { feldsatzAenderungen: [], kernAenderungen: [], nichtAusdrueckbar: [] };

  /* ══ ZUG 0 — die drei fehlenden Typen sind der Messgegenstand ═══════════ */
  const { V: K0 } = ladeKern();
  ergebnis.eingebauteTypen = Array.from(K0._TEMPLATE_FELDTYPEN || []);
  for (const [alt, ersatz] of Object.entries(TYP_ERSATZ)) {
    ergebnis.feldsatzAenderungen.push({
      kennung: alt, geforderteAenderung: 'Typ „' + alt + '" existiert nicht — abgebildet auf `' + ersatz + '`',
      grundImKern: '`_TEMPLATE_FELDTYPEN`/`FELDTYPEN` (Erzeuger) kennen zehn Typen; ' + alt + ' ist keiner davon.',
    });
  }
  ergebnis.feldsatzAenderungen.push({
    kennung: '(mehrere, s. Feldsatz)', geforderteAenderung: 'zusammengesetzte Zeilen als `feldtyp:\'liste\'` mit `unterFelder` statt eines einzelnen Typs',
    grundImKern: 'Es gibt keinen Skalar-Typ, der mehrere Werte in EINER Zeile trägt (Zug 1 der Anforderung, vorab bestätigt).',
  });

  /* ══ ZUG 1 — das Bündel bauen, als Fremder ═══════════════════════════════ */
  // Das Bereichs-Modul braucht keine eigene Signatur — U2-ADR-145 (signaturfreier Einlassweg
  // für die fünf Register): es unterscheidet Herkunft, es beglaubigt nicht.
  const { V: G } = ladeGenerator();
  const { V: I } = ladeIssuer();
  const { V: B } = ladeKern();

  // 1a · das eigene Depot ZUERST — ein Bereichs-Modul dockt in einen aktiven Umschlag an, nicht
  // ins Leere. Reihenfolge ist Absicht: `_bereichZuSektorId` (Übersetzer der Feld-Vorlage weiter
  // unten) prüft gegen `SEKTOR_BY_ID`, das erst NACH `_bereichsModuleAusDepotAnmelden` den neuen
  // Bereich kennt — der Bereich muss vor den Feldern angemeldet sein, sonst verwirft der
  // Übersetzer jedes Feld mit `grund: 'bereich'`.
  await B.depotAnlegen('Pruefstoff-Betriebsuebergabe-2026!');
  B.akteurSelbstErklaeren('Prüfstoff');

  // 1b · das BEREICHS-Modul — fünftes Einlass-Register, kein Vivodepot-Bezug im Wortlaut.
  const bereichsModul = { modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: HERKUNFT,
    bereiche: { [BEREICH_ID]: { label: 'Betriebsübergabe', icon: 'landmark' } } };
  const bereichEingelassen = B.modulEinlassen(JSON.stringify(bereichsModul));
  ergebnis.bereichEingelassen = bereichEingelassen.angenommen;
  ergebnis.bereichGrund = bereichEingelassen.grund;
  if (!bereichEingelassen.angenommen) {
    notiere('Das eigene Bereichs-Modul wird abgewiesen', 'bereichsModulPruefen: ' + bereichEingelassen.grund,
      'Ohne eigenen Bereich müsste der Feldsatz in einen der zwölf eingebauten Bereiche einziehen — genau die Rücksicht auf den Kern, die Abschnitt 1 der Anforderung ausschließt.');
  }
  B._bereichsModuleAusDepotAnmelden(B.getData());

  // 1c · die FELD-Vorlage (Template-Generator -> VC-Issuer -> Kern), wie beim Pro-Durchstich.
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const anbieter = G.baueAnbieter({
    anbieterName: 'Prüfstoff Betriebsübergabe', rechtsform: 'e.V.', ustId: 'DE000000000',
    strasse: 'Musterweg 1', plz: '00000', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'Prüfstoff', kontaktFunktion: 'Messung', kontaktEmail: 'pruefstoff@example.invalid',
    kontaktTelefon: '+49 0 000000', bereich: BEREICH_ID,
    useCase: 'Pruefstoff-Buendel „Betriebsuebergabe" (SP Pro, 22.08.2026) — herstellerneutraler Feldsatz, keine Anforderung an Vivodepot.',
  });
  const submission = await G.baueSubmissionSigniert({ anbieter, publicKeyJwk: pubJwk, felder: FELDER }, privJwk);
  ergebnis.felderEingereicht = submission.templates[0].felder.length;
  ergebnis.felderErwartet = FELDER.length;

  const d = I.submissionZuAnbieterDaten(submission);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-08-01T12:00:00Z', expirationDate: '2027-08-01T12:00:00Z',
  });
  const taSign = await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const bundle = I.baueAuslieferungsBundle(await I.stelleProviderCredentialAus(vc, taSign), d.templatesJws[0]);

  /* ══ ZUG 2 — andocken (der Bereich muss VOR den Feldern angemeldet sein) ═ */
  const teil = B._importEingabeAufteilen(JSON.stringify(bundle));
  const plan = await B.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  ergebnis.planGueltig = !plan.ungueltig;
  ergebnis.planGrund = plan.grund || null;
  ergebnis.definitionen = (plan.feldDefinitionen || []).length;
  ergebnis.verworfeneFelder = plan.verworfeneFelder || [];
  if (ergebnis.verworfeneFelder.length) {
    for (const v of ergebnis.verworfeneFelder) {
      notiere('Feld verworfen: ' + v.name, 'importPlanGeprueft -> verworfeneFelder, Grund: ' + v.grund,
        'Der Feldsatz braucht eine Änderung, damit dieses Feld ankommt.');
    }
  }

  B.importAnwenden(plan, {});

  // 2.1 · stehen die Felder in ihrem eigenen (angedockten) Bereich?
  const abschnitte = B._templateAbschnitte(BEREICH_ID);
  const html = B.templateAbschnitteHTML(abschnitte, BEREICH_ID, true);
  ergebnis.imEigenenBereichSichtbar = FELDER.every((f) => html.includes(f.feldname));
  ergebnis.fehlendeImHTML = FELDER.filter((f) => !html.includes(f.feldname)).map((f) => f.feldname);

  // 2.2 · ein Wert je Feldart setzen und wieder lesen — trägt der Rendern-Pfad verlustfrei?
  const defs = plan.feldDefinitionen || [];
  const skalarDef = defs.find((x) => x.typ === 'auswahl');
  if (skalarDef) B.sektorFeldSetzen(BEREICH_ID, skalarDef.feldId, 'einzel_befreit', { eingabeArt: 'eingabe' });
  const listenDef = defs.find((x) => x.typ === 'liste' && x.unterFelder && x.unterFelder.length >= 2);
  if (listenDef) {
    const eintrag = {};
    for (const uf of listenDef.unterFelder) eintrag[uf.id] = (uf.typ === 'datum') ? '2027-01-01' : (uf.typ === 'jaNein' ? 'ja' : 'Testwert');
    B.listenEintragHinzufuegen(BEREICH_ID, listenDef.feldId, eintrag);
  }
  ergebnis.skalarWertGesetzt = !!skalarDef;
  ergebnis.listenWertGesetzt = !!listenDef;
  const nachRender = B.templateAbschnitteHTML(B._templateAbschnitte(BEREICH_ID), BEREICH_ID, true);
  ergebnis.werteImHTML = (skalarDef ? nachRender.includes('einzel_befreit') || nachRender.includes('Einzelvertretungsberechtigt') : null);

  // 2.3 · Speicher-/Ladezyklus — überlebt Bereich UND Felder gemeinsam?
  const umschlag = await B.depotSerialisieren();
  await B.depotLaden(umschlag, 'Pruefstoff-Betriebsuebergabe-2026!');
  const nachher = B.getData();
  ergebnis.zyklusBereichVorhanden = Array.isArray(nachher.bereichsModule) && nachher.bereichsModule.length === 1;
  ergebnis.zyklusDefinitionenVorhanden = (nachher.feldDefinitionen || []).filter((x) => x.sektorId === BEREICH_ID).length;

  /* ══ ZUG 3 — die Zahl (Vergleichswert: NULL, wie am 21.08.) ══════════════ */
  ergebnis.kernZeilenGeaendert = 0;   // dieses Werkzeug ändert keine Zeile Produktcode — s. Dateikopf
  ergebnis.grenzen = grenzen;

  /* ══ ZUG 4 — Nachtrag 23.08.2026, Punkt 2: der Kardinalitäts-Befund BESTÄTIGT ODER
     WIDERLEGT, MIT BELEG. Ein `liste`-Feld mit einer zusätzlichen, im Einreich-Schema
     unbekannten Eigenschaft (`kardinalitaet: '0..1'`) durch denselben Importweg schicken
     wie jedes andere Feld — als Fremder, kein zweiter, präparierter Pfad. */
  const probeAnbieter = G.baueAnbieter({
    anbieterName: 'Kardinalitaets-Probe', rechtsform: 'e.V.', ustId: 'DE000000001',
    strasse: 'Musterweg 2', plz: '00000', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'Probe', kontaktFunktion: 'Messung', kontaktEmail: 'probe@example.invalid',
    kontaktTelefon: '+49 0 000000', bereich: BEREICH_ID, useCase: 'ZUG 4 — Kardinalitäts-Beleg, Nachtrag 23.08.2026.',
  });
  const probeFeld = { feldname: 'Kardinalitäts-Probe', feldtyp: 'liste', bereich: BEREICH_ID, gruppe: G1,
    kardinalitaet: '0..1',   // <- die Zusatzangabe, die der Nachtrag prüfen lässt
    unterFelder: [UF('Wert', 'text')] };
  const probeSubmission = await G.baueSubmissionSigniert({ anbieter: probeAnbieter, publicKeyJwk: pubJwk, felder: [probeFeld] }, privJwk);
  ergebnis.kardinalitaetUeberlebtBauSchritt = Object.prototype.hasOwnProperty.call(probeSubmission.templates[0].felder[0], 'kardinalitaet');
  // NACHTRAG 23.08.2026 (Auftrag „Das Einreich-Schema prüft nichts", Zug 2): der Bau-Schritt
  // filtert die Zusatzangabe weiterhin — MELDET das jetzt aber namentlich statt still.
  ergebnis.kardinalitaetErzeugerGemeldet = Array.isArray(probeSubmission._angeglichen)
    && probeSubmission._angeglichen.some((a) => a.was === 'kardinalitaet');
  const probeD = I.submissionZuAnbieterDaten(probeSubmission);
  const probeVc = I.baueProviderVC({
    anbieterId: probeD.anbieterId, anbieterName: probeD.anbieterName, anbieterTyp: probeD.anbieterTyp,
    publicKeyJwk: probeD.publicKeyJwk, templates: probeD.templates,
    issuanceDate: '2026-08-01T12:00:00Z', expirationDate: '2027-08-01T12:00:00Z',
  });
  const probeBundle = I.baueAuslieferungsBundle(await I.stelleProviderCredentialAus(probeVc, taSign), probeD.templatesJws[0]);
  const probeTeil = B._importEingabeAufteilen(JSON.stringify(probeBundle));
  const probePlan = await B.importPlanGeprueft('provider-credential', probeTeil.text,
    Object.assign({}, probeTeil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  ergebnis.kardinalitaetPlanGueltig = !probePlan.ungueltig;
  ergebnis.kardinalitaetVerworfen = (probePlan.verworfeneFelder || []).some((v) => v.grund !== 'unbekannte-eigenschaft');
  const probeDef = (probePlan.feldDefinitionen || [])[0];
  ergebnis.kardinalitaetAmDef = !!(probeDef && Object.prototype.hasOwnProperty.call(probeDef, 'kardinalitaet'));
  // NACHTRAG 23.08.2026 (Posten 1, „Die automatisierte Modulprüfung schließen"): da die Angabe
  // schon beim Erzeuger ausgefiltert wird, kommt sie am Kern für DIESEN Weg nie an — der Kern
  // WEIST eine unbekannte Eigenschaft inzwischen VOLLSTÄNDIG ab (`_templateFeldZuModell`, nicht
  // mehr nur melden), aber das greift hier gar nicht, weil die Eigenschaft den Kern nie erreicht.
  // Der Kern-seitige Wächter selbst ist am HANDGEBAUTEN Template belegt (Erzeuger umgangen), s.
  // `tests/schema-wirkt-nicht-nachtrag.test.js`, Zug2·3 — hier zählt nur der Erzeuger-Weg.
  // DIE ANTWORT bleibt unverändert WIDERLEGT (die Zusatzangabe wird weiterhin nicht verworfen,
  // sondern ausgefiltert) — der Erzeuger MELDET das seit dem Vor-Nachtrag namentlich
  // (`kardinalitaetErzeugerGemeldet`), statt es still verschwinden zu lassen.
  ergebnis.kardinalitaetBefund = (!ergebnis.kardinalitaetUeberlebtBauSchritt && ergebnis.kardinalitaetPlanGueltig
    && !ergebnis.kardinalitaetVerworfen && !ergebnis.kardinalitaetAmDef)
    ? 'WIDERLEGT — die Zusatzangabe wird ignoriert (schon beim Bau verworfen, nicht das Feld), UND seit dem Nachtrag namentlich gemeldet statt still'
    : 'unerwartetes Ergebnis — s. Einzelwerte';

  // Was der Kontrakt nicht ausdrücken kann (Liste 3 der Anforderung) — gemessen, nicht vermutet.
  // Nachtrag 23.08.2026: der `kontakt`-Punkt ist mit Korrektur 2 GELÖST (liste mit Name+Erreichbarkeit)
  // und darum hier nicht mehr aufgeführt.
  ergebnis.nichtAusdrueckbar = [
    { was: 'Kardinalität 1..1/0..1/0..n', befund:
      'Weder `validateTemplate` noch `_templateFeldZuModell` noch die Bearbeiten-Oberfläche kennen eine Obergrenze für `feldtyp:\'liste\'`. '
      + 'Ein als 0..1 gedachtes Feld (z. B. `Benannte Person`, G1, oder `Administration`, G4 — NICHT `Notar`/`Datensicherung`, die '
      + 'waren nie kontakt-typisiert, s. Kopf-Kommentar) kann eine Bürgerin trotzdem auf zwei Einträge wachsen lassen — der Kontrakt drückt nur '
      + '„mehrwertig oder nicht" aus, keine konkrete Ober-/Untergrenze. ZUG 4: eine mitgeführte Kardinalitäts-Angabe wird dabei NICHT verworfen, '
      + 'sondern schon vor der Signatur still ausgefiltert — ' + ergebnis.kardinalitaetBefund + '.' },
    { was: '„leer ist die Warnung" (vertretung.weitereLeitung)', befund:
      'Gelöst für DIESES eine Feld durch die Nachtrags-Korrektur 1: `vertretung.alleinvertretung` (jaNein, pflicht) steht jetzt am Anfang von '
      + 'Block 1 und macht „keine weitere vertretungsberechtigte Person" zu einer ausdrücklichen Aussage; `vertretung.weitereLeitung` '
      + '(„Weitere Geschäftsführer/Vorstände") verliert seine Nebenbedeutung und wird zum gewöhnlichen 0..n. Die REGEL dahinter ("eine Aussage über '
      + 'das Nichtvorhandensein wird ausgesagt, nicht weggelassen") bleibt darüber hinaus ungeklärt — Reichweitenfrage, s. Bericht.' },
    { was: 'Rechtsfolgen-Verknüpfung (§ 15a Abs. 3 InsO, § 29 BGB analog)', befund:
      'Der Kontrakt trägt reine Feldbeschriftungen, keine Verknüpfung zwischen einem leeren/befüllten Feld und einer Rechtsfolge — das ist so beauftragt '
      + '(„keine Rechtsfolgenhinweise im Bündel") und daher kein Mangel, sondern eine bestätigte Grenze.' },
  ];

  if (ALS_JSON) { console.log(JSON.stringify(ergebnis, null, 2)); return; }

  const ja = (x) => x === true ? 'JA' : (x === false ? 'NEIN' : 'unklar');
  console.log('Prüfstoff Betriebsübergabe — trägt der Kontrakt einen fremden Feldsatz?\n');
  console.log('Eingebaute Feldtypen: ' + ergebnis.eingebauteTypen.join(', '));
  console.log('Fehlende Typen (Anforderung, Nachtrag 23.08.2026): kennung, verweis — beide auf `text` abgebildet. '
    + '`kontakt` ist entfallen (Korrektur 2 — liste mit Name/Erreichbarkeit statt Ersatztyp).\n');

  console.log('ZUG 1 — Bereich + Felder, als Fremder gebaut');
  console.log('  Bereichs-Modul angenommen:      ' + ja(ergebnis.bereichEingelassen) + (ergebnis.bereichGrund ? ' (' + ergebnis.bereichGrund + ')' : ''));
  console.log('  Felder eingereicht/erwartet:    ' + ergebnis.felderEingereicht + ' / ' + ergebnis.felderErwartet);

  console.log('\nZUG 2 — andocken und öffnen');
  console.log('  Plan gültig:                    ' + ja(ergebnis.planGueltig) + (ergebnis.planGrund ? ' (' + ergebnis.planGrund + ')' : ''));
  console.log('  Definitionen angekommen:        ' + ergebnis.definitionen + ' / ' + ergebnis.felderErwartet);
  console.log('  Verworfene Felder:              ' + ergebnis.verworfeneFelder.length
    + (ergebnis.verworfeneFelder.length ? ' — ' + ergebnis.verworfeneFelder.map((v) => v.name + ':' + v.grund).join(', ') : ''));
  console.log('  Im eigenen Bereich sichtbar:    ' + ja(ergebnis.imEigenenBereichSichtbar)
    + (ergebnis.fehlendeImHTML.length ? ' — fehlen: ' + ergebnis.fehlendeImHTML.join(', ') : ''));
  console.log('  Werte tragen im Render:         ' + ja(ergebnis.werteImHTML));
  console.log('  Speicher-/Ladezyklus — Bereich: ' + ja(ergebnis.zyklusBereichVorhanden)
    + ', Definitionen: ' + ergebnis.zyklusDefinitionenVorhanden + '/' + ergebnis.felderErwartet);

  console.log('\nZUG 3 — die drei Listen des Berichts');
  console.log('  1) Feldsatz-Änderungen: ' + ergebnis.feldsatzAenderungen.length);
  for (const f of ergebnis.feldsatzAenderungen) console.log('     · ' + f.kennung + ': ' + f.geforderteAenderung);
  console.log('  2) Kern-Änderungen: ' + ergebnis.kernZeilenGeaendert + ' (Vergleichswert 21.08.: 0)');
  console.log('  3) Nicht ausdrückbar: ' + ergebnis.nichtAusdrueckbar.length);
  for (const n of ergebnis.nichtAusdrueckbar) console.log('     · ' + n.was);

  console.log('\nZUG 4 — Kardinalitäts-Beleg (Nachtrag 23.08.2026, Punkt 2)');
  console.log('  Zusatzangabe überlebt den Bau-Schritt (Erzeuger):  ' + ja(ergebnis.kardinalitaetUeberlebtBauSchritt));
  console.log('  Erzeuger meldet sie namentlich (Auftrag Zug 2):    ' + ja(ergebnis.kardinalitaetErzeugerGemeldet));
  console.log('  Plan gültig:                                      ' + ja(ergebnis.kardinalitaetPlanGueltig));
  console.log('  Feld verworfen:                                   ' + ja(ergebnis.kardinalitaetVerworfen));
  console.log('  Zusatzangabe an der Definition angekommen:        ' + ja(ergebnis.kardinalitaetAmDef));
  console.log('  Befund: ' + ergebnis.kardinalitaetBefund);

  if (grenzen.length) {
    console.log('\nWEITERE GRENZEN, an denen der Fremde anstößt:');
    for (const g of grenzen) console.log('  · ' + g.was + ' [' + g.wo + '] — ' + g.folge);
  }
})();
