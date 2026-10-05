/* ════════════════════════════════════════════════════════════════════════
   externe-validatoren.mjs — der ORT, an dem gegen externe Autoritäten geprüft wird
   ────────────────────────────────────────────────────────────────────────
   WARUM ES DIESE DATEI GIBT (26.07.2026): Das Produkt erzeugte ein ungültiges
   FHIR-Bundle — `Procedure` ohne das Pflichtfeld `performed[x]` —, während die
   Konformitäts-Suite 22/0 grün stand. Gefunden hat es eine gezielte Einzelmessung,
   nicht die Architektur. Erschwerend: der Kopf von `tests/fhir-ips.test.js`
   BEHAUPTETE, die echte Profil-Validierung laufe in `tests/fhir-ips-validator.test.js`
   und in CI. Die Datei existierte nie; in den vier Workflows kam kein Validator vor.
   Die Falschaussage hat nicht nur die Bau-Sicht getäuscht, sondern die Lagebeurteilung.

   DIE LIEFERUNG IST DIE REGISTRY, nicht der eine Validator. Ein zweiter externer
   Prüfer (Schematron, JSON-Schema, ein Terminologie-Dienst, ein DIN-/eIDAS-Werkzeug)
   ist ein Eintrag in VALIDATOREN — kein Umbau dieses Schritts.

   ZWEI REGELN, die diesen Ort von einem gewöhnlichen Test unterscheiden:
   1. GEPRÜFT WIRD, WAS DAS PRODUKT HEUTE AUSGIBT. Die Artefakte werden bei jedem
      Lauf vom echten Generator erzeugt, nie aus abgelegten Dateien gelesen. Eine
      Fixture altert und prüft am Ende sich selbst.
   2. EIN ÜBERSPRUNGENER VALIDATOR ZÄHLT NIE ALS GRÜN. Fehlt das Werkzeug, ist das
      Ergebnis „ungemessen" — sichtbar ausgewiesen und NICHT als bestanden gezählt.
      Ein Test, der sich selbst überspringt, wäre genau die Klasse Fehler, gegen
      die dieser Ort gebaut ist.

   ZURÜCK IN DIE AUTOMATISCHE KETTE (Entscheidung vom 06.08.2026, A108/Z21) — nach
   RAUS AUS DER PFLICHT-KETTE (30.07.2026, B22): der Validator hing an einer fremden
   Gegenstelle (HL7-Release-Download); ein `curl`-Fehlschlag dort machte das ganze
   Konformitäts-Gate rot, ohne dass am Produkt etwas gemessen wurde — falsch-rot bei
   jedem Serveraussetzer. DER FIX LAG NIE IM ABLAGEORT, sondern in der Fehlerklasse:
   `tools/hl7-validator-beschaffen.js` läuft jetzt VOR dieser Datei in
   `.github/workflows/konformitaet.yml`, gepinnt (Version + SHA-256, kein Re-Hosting).
   Scheitert die Beschaffung, bleibt `FHIR_VALIDATOR_JAR` unbesetzt, und genau der
   Mechanismus hier unten (Punkt 2 oben, `vorhanden()` → „ungemessen") greift — das Gate bleibt grün,
   nur eine falsche Prüfsumme macht den Beschaffungsschritt selbst rot.
   `tools/hl7-validator-alarm-waechter.js` beobachtet die CI-Historie und schlägt Alarm,
   falls „ungemessen" mehrfach hintereinander auftritt, statt still dauerhaft zu werden.

   Manuell ausführen (z. B. lokal ohne CI): FHIR_VALIDATOR_JAR=/pfad/validator_cli.jar
   npm run test:konformitaet:extern (JAR besorgen: node tools/hl7-validator-beschaffen.js,
   oder von Hand: https://github.com/hapifhir/org.hl7.fhir.core/releases, Version siehe
   `werkzeugVersion` unten, `6.9.12`; Java 21 muss im PATH/JAVA_HOME stehen.)
   ════════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ladeKern } = require('../load-kern.js');
const { urteilsZuordnung } = require('../../tools/lib/fhir-urteil-zuordnung.js');
const { registerLesen, kaputtListe } = require('../../tools/standards-register-pruefen.js');
const { vorsorgeDepotAnlegen } = require('../../tools/lib/ips-vorsorge-beispiel.js');
const { ohneActorRolle } = require('../../tools/ips-vorsorge-validieren.js');
import { javaPfad } from './adapter/_umgebung.mjs';
import { ladeAdapter } from './adapter/_lader.mjs';
import { urteileHolen } from './adapter/_urteile.mjs';

const ARBEIT = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-extval-'));

/* ── Java finden: seit der Standards-Schnittstelle (28.09.2026) in adapter/_umgebung.mjs, dieselbe Suche
   (JAVA_HOME, PATH, Homebrew-Orte); ohne Argument genau das Verhalten von vorher. */
/* ── Die Registry ─────────────────────────────────────────────────────────────
   Je Eintrag: WER urteilt, WAS er prüft, WIE er gerufen wird, WAS ihm vorgelegt wird,
   WIE ein Urteil gelesen wird. Versionen sind GEPINNT und hier sichtbar — `eu.eps` ist
   ein Ballot-Stand, ein Wechsel muss eine bewusste Änderung sein, keine stille. */
export const VALIDATOREN = [
  {
    id: 'hl7-fhir-validator',
    sammelPflicht: true,   // eine JVM je Datei sprengt die Zeitgrenze des Gates — nur der Sammelaufruf (adapter/_urteile.mjs)
    autoritaet: 'HL7 International — offizieller FHIR-Validator (org.hl7.fhir.core)',
    prueft: 'FHIR-R4-Bundles gegen die Profile hl7.fhir.uv.ips und hl7.fhir.eu.eps',
    werkzeugVersion: '6.9.12',
    pakete: ['hl7.fhir.uv.ips#2.0.0', 'hl7.fhir.eu.eps#1.0.0-ballot'],
    // `-tx n/a`: OHNE Terminologie-Server. Am 26.07. gemessen — das Urteil ist identisch,
    // UND die ValueSet-Negativkontrolle (Code außerhalb des ValueSets) greift weiterhin aus
    // den lokalen Terminologie-Paketen. Damit ist der Lauf offline und reproduzierbar,
    // ohne den Prüfer zu schwächen. Ohne diese Messung wäre `-tx n/a` eine Abkürzung gewesen.
    vorhanden: () => {
      const java = javaPfad();
      const jar = process.env.FHIR_VALIDATOR_JAR;
      if (!java) return { ok: false, grund: 'kein Java gefunden (PATH, JAVA_HOME, Homebrew-Orte)' };
      if (!jar) return { ok: false, grund: 'FHIR_VALIDATOR_JAR nicht gesetzt' };
      if (!fs.existsSync(jar)) return { ok: false, grund: 'validator_cli.jar nicht unter ' + jar };
      // Welche Fassung wirklich prüft (Befund HL7-VALIDATOR-FASSUNG): aus dem Jar, nicht aus dieser Registry-Zeile.
      let validator;
      try { validator = require('../../tools/lib/hl7-validator-beleg.js').jarFassung(jar); } catch (e) { return { ok: false, grund: e.message }; }
      const pin = require('../../tools/lib/hl7-validator-pin.json').version;
      if (validator.fassung !== pin) return { ok: false, grund: 'validator_cli ' + validator.fassung + ' statt der gepinnten ' + pin + ' (tools/lib/hl7-validator-pin.json)' };
      return { ok: true, java, jar, validator };
    },
    /* EIN JVM-AUFRUF FÜR ALLE ARTEFAKTE (28.09.2026). Je Artefakt eine eigene JVM kostete jedes Mal Start und das
       Laden beider Leitfäden; mit den drei Verwahrungs-Hüllen (U2-ADR-444) stieg die Laufzeit dieser Datei unter Last
       über die 240-s-Grenze des pre-push-Gates (scripts/pruefe-fhir-gate.js). Die Grenze bleibt; der Lauf wird kürzer.
       Der Validator nimmt mehrere Dateien und schreibt ein Bundle mit einem OperationOutcome je Datei. Zugeordnet wird
       über die Extension operationoutcome-file (den Pfad), NIE über die Reihenfolge — tools/lib/fhir-urteil-zuordnung.js, mit
       eigener Probe. */
    urteileAlle: (umgebung, dateiPfade) => {
      const aus = path.join(ARBEIT, 'sammel-' + dateiPfade.length + '-' + Date.now() + '.outcome.json');
      try {
        execFileSync(umgebung.java, ['-jar', umgebung.jar, ...dateiPfade, '-version', '4.0.1',
          '-ig', 'hl7.fhir.uv.ips#2.0.0', '-ig', 'hl7.fhir.eu.eps#1.0.0-ballot',
          '-tx', 'n/a', '-output', aus], { stdio: 'ignore', timeout: 600000 });
      } catch (_) { /* Rückgabecode ≠ 0 ist bei Validierungsfehlern normal — es zählt das OperationOutcome */ }
      if (!fs.existsSync(aus)) return new Map(dateiPfade.map((p) => [p, { gelesen: false, fehler: ['Validator lieferte kein OperationOutcome'] }]));
      return urteilsZuordnung(JSON.parse(fs.readFileSync(aus, 'utf8')), dateiPfade);
    },
    urteile: (umgebung, dateiPfad) => {
      const aus = path.join(ARBEIT, path.basename(dateiPfad) + '.outcome.json');
      try {
        execFileSync(umgebung.java, ['-jar', umgebung.jar, dateiPfad, '-version', '4.0.1',
          '-ig', 'hl7.fhir.uv.ips#2.0.0', '-ig', 'hl7.fhir.eu.eps#1.0.0-ballot',
          '-tx', 'n/a', '-output', aus], { stdio: 'ignore', timeout: 600000 });
      } catch (_) { /* Rückgabecode ≠ 0 ist bei Validierungsfehlern normal — es zählt das OperationOutcome */ }
      if (!fs.existsSync(aus)) return { gelesen: false, fehler: ['Validator lieferte kein OperationOutcome'] };
      const oo = JSON.parse(fs.readFileSync(aus, 'utf8'));
      const fehler = (oo.issue || []).filter(i => i.severity === 'fatal' || i.severity === 'error');
      return {
        gelesen: true,
        gueltig: fehler.length === 0,
        fehler: fehler.map(i => ((i.expression && i.expression[0]) || '?') + ': '
          + String((i.details && i.details.text) || '').replace(/\s+/g, ' ').slice(0, 180)),
      };
    },
    /* Erzeugnisse aus dem ECHTEN Generator, bei jedem Lauf neu.
       JEDER FALL TRÄGT SEINE ERWARTUNG. Der Auftrag listete „leeres Depot" als gültig zu
       erwartenden Fall — beim ersten Lauf hat der Validator das widerlegt, und die Widerlegung
       ist die interessantere Aussage: `Patient.name` und `Patient.birthDate` sind in
       `Patient-uv-ips` min=1. Ein Patientenkurzbrief OHNE Patient ist kein gültiger
       Patientenkurzbrief — das ist keine Schwäche des Generators, sondern die Grenze des
       Formats. Der Fall bleibt drin und pinnt diese Grenze, statt still zu verschwinden.
       Die Sektions-Fälle bekommen darum die Mindest-Identität (Name + Geburtsdatum): sie sollen
       die SEKTIONEN prüfen, nicht am Patienten scheitern. */
    artefakte: async () => {
      const faelle = [];
      const bau = async (name, erwartet, warum, fuellen, opt) => {
        const { V } = ladeKern();
        await V.depotAnlegen('pw');
        V.akteurSelbstErklaeren('Konformitaet');
        fuellen(V);
        const p = path.join(ARBEIT, name + '.json');
        fs.writeFileSync(p, JSON.stringify(V.fhirIpsBundle('2026-07-26T12:00:00Z', opt), null, 1));
        faelle.push({ name, pfad: p, erwartet, warum });
      };
      /* U2-ADR-466 (L1): der Abschnitt Advance Directives — Vollmacht, Patientenverfügung, Betreuungsverfügung und der
         Widerspruch gegen die Notvertretung als Consent nach consent-eu-eps, mit Freigabe der sensiblen Felder. Das Depot
         kommt aus tools/lib/ips-vorsorge-beispiel.js (dieselbe Stelle wie Probe und Werkzeug). Das Gegenstück nimmt einem
         Consent `provision.actor.role` (dort 1..1) und MUSS fallen. Alle Exportsprachen: tools/ips-vorsorge-validieren.js. */
      const bauVorsorge = async (name, erwartet, warum, beschaedigen) => {
        const { V } = ladeKern();
        await vorsorgeDepotAnlegen(V);
        const b = V.fhirIpsBundle('2026-07-26T12:00:00Z', { sensibel: true });
        const p = path.join(ARBEIT, name + '.json');
        fs.writeFileSync(p, JSON.stringify(beschaedigen ? beschaedigen(b) : b, null, 1));
        faelle.push({ name, pfad: p, erwartet, warum });
      };
      await bauVorsorge('vorsorge-alle-instrumente', 'gueltig',
        'U2-ADR-466: Consent je Instrument mit RelatedPerson (AGNT), Befugnissen permit/deny und dem Widerspruch als deny');
      await bauVorsorge('vorsorge-ohne-actor-rolle', 'ungueltig',
        'consent-eu-eps: provision.actor.role ist 1..1 — ein Consent ohne Rolle der Vertretung muss fallen', ohneActorRolle);
      // Mindest-Identität, ohne die KEIN IPS-Bundle gültig sein kann (gemessen 26.07.).
      const person = (V) => {
        V.sektorFeldSetzen('identity', 'givenName', 'Maria');
        V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
        V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
      };
      await bau('volles-depot', 'gueltig', 'alle Sektionen befüllt', (V) => {
        person(V);
        V.sektorFeldSetzen('identity', 'gender', 'w');
        V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }, { text: 'Haselnuss' }]);
        V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg' }]);
        V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Diabetes mellitus Typ 2' }]);
        V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm-Entfernung', year: '2008' });
        V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', 'Hüft-TEP rechts (Stryker), seit 2019');
      });
      // U2-ADR-452: delegierter Export — die RelatedPerson trägt neben der Verwandtschaft die Vertretungsrolle
      // (v3-RoleCode DPOWATT) und das Ende des Fachs als period.end. Beide Codes müssen im ValueSet von
      // RelatedPerson.relationship (extensible) bestehen, am echten Validator, nicht angenommen.
      await bau('delegiert-vertretung-gilt-bis', 'gueltig',
        'U2-ADR-452: RelatedPerson mit Beziehung CHILD, Rolle DPOWATT und period.end aus „gilt bis“ des Fachs',
        (V) => person(V),
        { anker: { name: 'Anna Mustermann', beziehungCode: 'CHILD', grundlage: 'vorsorge', giltBis: '2031-05-01' } });
      await bau('nur-identitaet-alle-sektionen-leer', 'gueltig',
        'alle Pflichtsektionen tragen emptyReason — das allein macht ein Bundle NICHT ungültig',
        (V) => person(V));
      // DER FALL VOM 26.07.: Eingriff ohne Jahr. Ohne `dataAbsentReason` wäre das Bundle ungültig.
      await bau('eingriff-ohne-jahr', 'gueltig',
        'U2-ADR-105: performed[x] mit dataAbsentReason statt weglassen',
        (V) => { person(V); V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Hüft-TEP rechts' }); });
      await bau('implantate-gefuellt', 'gueltig',
        'U2-ADR-105: Medizinprodukte-Sektion trägt einen Eintrag statt der Falschaussage',
        (V) => { person(V); V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', 'Hüft-TEP rechts (Stryker), seit 2019'); });
      // „Ausdrücklich keine" (12.08.2026): alle fünf IPS-Pflichtsektionen tragen
      // „ausdrücklich keine" statt notasked — je EIN Eintrag mit einem no-known-*-Code aus
      // hl7.org/fhir/uv/ips/CodeSystem/absent-unknown-uv-ips. Muss gültig sein, genau wie ein
      // Bundle mit echten Daten — der Punkt des Auftrags ist eine WAHRE zweite Aussage, keine
      // Ausnahme vom Profil.
      await bau('ausdruecklich-keine-alle-fuenf', 'gueltig',
        '„Ausdrücklich keine": je ein no-known-*-Eintrag statt notasked in allen '
        + 'fünf Pflichtsektionen — das IPS-Design-Prinzip „known absent im Entry, nicht in '
        + 'section.emptyReason" muss am echten Validator bestehen, nicht nur behauptet sein',
        (V) => {
          person(V);
          for (const f of ['allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses', 'operationsProcedures', 'implantsProsthesesPacemakers']) {
            V.ausdruecklichKeineSetzen('health', f, true);
          }
        });
      /* U2-ADR-458: der Begleittext in der beim Export gewählten Sprache — Composition.language und lang/xml:lang der
         Narrative ändern sich, die Profile müssen dasselbe Urteil fällen. Stichprobe: Deutsch, und zwei Sprachen mit
         eigener Schrift (Griechisch, Bulgarisch); je ein volles Depot und je „ausdrücklich keine“ in allen fünf Sektionen. */
      const volles = (V) => {
        person(V);
        V.sektorFeldSetzen('identity', 'gender', 'w');
        V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
        V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg' }]);
        V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Diabetes mellitus Typ 2' }]);
        V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm-Entfernung', year: '2008' });
      };
      const keine = (V) => {
        person(V);
        for (const f of ['allergiesMedicationFoodOther', 'medicationOngoing', 'chronicConditionsDiagnoses', 'operationsProcedures', 'implantsProsthesesPacemakers']) {
          V.ausdruecklichKeineSetzen('health', f, true);
        }
      };
      for (const sprache of ['de', 'el', 'bg']) {
        await bau('exportsprache-' + sprache + '-volles-depot', 'gueltig', 'U2-ADR-458: Begleittext ' + sprache + ', volles Depot', volles, { sprache });
        await bau('exportsprache-' + sprache + '-ausdruecklich-keine', 'gueltig', 'U2-ADR-458: Begleittext ' + sprache + ', „ausdrücklich keine“ in allen fünf Sektionen', keine, { sprache });
      }
      // Die gemessenen GRENZEN, ausdrücklich als ungültig erwartet.
      await bau('voellig-leeres-depot', 'ungueltig',
        'Patient.name und Patient.birthDate sind min=1 in Patient-uv-ips — ein Patientenkurzbrief '
        + 'ohne Patient ist keiner. Grenze des Formats, kein Generator-Fehler',
        () => { /* nichts */ });
      /* U2-ADR-107: die EINZELNE Pflicht, getrennt gepinnt. Ein Depot ohne Namen ist ein
         vorgesehener Zustand (das Passwort-Modal hat kein Namensfeld) — das Bundle daraus ist
         trotzdem ungültig. Genau darum gibt es seit dem 26.07. ein Export-Gate für den Namen;
         dieser Eintrag hält fest, WARUM es das gibt, am echten Validator statt in Prosa. */
      await bau('mit-geburtsdatum-ohne-namen', 'ungueltig',
        'Patient.name ist min=1 — gemessen: „mindestens erforderlich = 1, aber nur gefunden 0". '
        + 'Der Bürgerinnen-Weg ist seit U2-ADR-107 gegated, der Builder bleibt rein',
        (V) => {
          V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
          V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
        });
      /* U2-ADR-444 (Verwahrung V1): die Hülle mit Verwahrungsnachweis — Bundle type=collection,
         das Original als Binary, eine Provenance (transmit). Die Hülle kommt aus dem echten
         Generator (verwahrungsNachweisBundle); gelesen wird nur das ORIGINAL, das eine fremde
         Stelle ausgestellt hat — es ist Eingabe, nicht Erzeugnis. Das kaputte Gegenstück
         streicht Provenance.target (min=1) und MUSS abgelehnt werden. */
      const bauVerwahrung = async (name, erwartet, warum, datei, beschaedigen) => {
        const { V } = ladeKern();
        await V.depotAnlegen('pw');
        V.akteurSelbstErklaeren('Konformitaet');
        V.sektorFeldSetzen('identity', 'givenName', 'Maria');
        V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
        const bytes = fs.readFileSync(path.join(import.meta.dirname, '..', 'fixtures', datei));
        const id = V.importAutoritativDokument(bytes.toString('utf8'), new Uint8Array(bytes));
        const b = JSON.parse(JSON.stringify(V.verwahrungsNachweisBundle(id, new Date('2026-09-28T12:00:00Z'))));
        if (beschaedigen) beschaedigen(b);
        const p = path.join(ARBEIT, name + '.json');
        fs.writeFileSync(p, JSON.stringify(b, null, 1));
        faelle.push({ name, pfad: p, erwartet, warum });
      };
      await bauVerwahrung('verwahrung-laborbefund', 'gueltig',
        'U2-ADR-444: Hülle um einen EU-Laborbefund — Binary, Patient, Provenance mit Verwahrerin und Autor',
        'eigenprobe-eu-lab.json');
      await bauVerwahrung('verwahrung-entlassbrief', 'gueltig',
        'U2-ADR-444: Hülle um einen EU-Entlassbrief',
        'eigenprobe-eu-hdr.json');
      await bauVerwahrung('verwahrung-ohne-target', 'ungueltig',
        'Provenance.target ist min=1 — eine Hülle, deren Nachweis auf nichts zeigt, muss fallen',
        'eigenprobe-eu-lab.json',
        (b) => { delete b.entry.find((x) => x.resource.resourceType === 'Provenance').resource.target; });
      return faelle;
    },
    /* Die KAPUTT-Probe: ein absichtlich beschädigtes Erzeugnis MUSS abgelehnt werden.
       Ohne sie wäre jeder grüne Lauf vakuum-grün — er könnte auch heißen, dass gar nicht
       geurteilt wird. Das Pflichtfeld `status` der Composition fällt weg. */
    kaputt: async () => {
      const { V } = ladeKern();
      await V.depotAnlegen('pw');
      V.akteurSelbstErklaeren('Konformitaet');
      V.sektorFeldSetzen('identity', 'givenName', 'Maria');
      V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
      const b = JSON.parse(JSON.stringify(V.fhirIpsBundle('2026-07-26T12:00:00Z')));
      delete b.entry[0].resource.status;
      const p = path.join(ARBEIT, 'kaputt.json');
      fs.writeFileSync(p, JSON.stringify(b, null, 1));
      return { name: 'kaputt-absichtlich', pfad: p };
    },
  },
];

/* ── Die Adapter (docs/standards-schnittstelle.md): je Familie eine Datei in adapter/, hinter die
   inline-Einträge gehängt. Ein Adapter mit `standards` ist die Neuform; ohne ist Altform (wie oben). */
VALIDATOREN.push(...await ladeAdapter());
test.after(() => { for (const v of VALIDATOREN) if (typeof v._aufraeumen === 'function') v._aufraeumen(); });

/* ── Der Lauf ──────────────────────────────────────────────────────────────────
   Die Test-TITEL sind bewusst LITERAL und laufen ueber die ganze Registry, statt je
   Eintrag zusammengesetzt zu werden. Grund: der Pruefstand (U2-ADR-099) loest jede
   Klausel-Zeile auf einen echten Test-Titel in der Datei auf — ein zur Laufzeit
   gebauter Name ist dort nicht auffindbar, und die Bindung waere unlesbar. Welcher
   Validator gefallen ist, steht in der Fehlermeldung, nicht im Titel. */
/* JE PRÜFER, NICHT ALLES ODER NICHTS (28.09.2026): bis hier lief kein Urteil, sobald EIN Werkzeug fehlte. Mit einem
   zweiten Prüfer, dessen Werkzeug noch nicht beschafft ist, wäre damit auch FHIR dauerhaft ungemessen gewesen. Jetzt
   urteilt, wer da ist; wer fehlt, steht als UNGEMESSEN da — nie als grün. Im Gate-Modus (VD_EXTERN_GATE=1: pre-push,
   landung-vorbereiten) ist ein fehlender Prüfer rot, sobald ein Standard mit status `echt` an ihm hängt: `echt` folgt
   nie aus der Struktur allein. */
const UMGEBUNGEN = new Map(VALIDATOREN.map(v => [v.id, v.vorhanden()]));
const GEMESSEN = VALIDATOREN.filter(v => UMGEBUNGEN.get(v.id).ok);
const ALLE_DA = GEMESSEN.length === VALIDATOREN.length;
const FEHLGRUND = [...UMGEBUNGEN.entries()].filter(([, u]) => !u.ok)
  .map(([id, u]) => id + ': ' + u.grund).join(' · ');
const ECHT_AM_ADAPTER = new Map();
for (const { inhalt } of registerLesen()) {
  for (const st of inhalt.standards || []) if (st.status === 'echt') ECHT_AM_ADAPTER.set(inhalt.adapter, [...(ECHT_AM_ADAPTER.get(inhalt.adapter) || []), st.id]);
}
const altform = (v) => !Array.isArray(v.standards);

test('[Extern] jedes Werkzeug der Registry ist da (eigenständiges Werkzeug, nicht in der Pflicht-Kette)', () => {
  if (ALLE_DA) return;
  const satz = 'UNGEMESSEN — ' + FEHLGRUND;
  console.log('\n  ⚠ ' + satz);
  console.log('  ⚠ Die [Extern]-Pruefungen dieser Werkzeuge sind damit UNGEMESSEN, nicht gruen.');
  console.log('  ⚠ Ausfuehrbar mit: FHIR_VALIDATOR_JAR=/pfad/validator_cli.jar npm run test:konformitaet:extern\n');
  if (process.env.VD_EXTERN_GATE === '1') {
    const echtUngemessen = VALIDATOREN.filter(v => !UMGEBUNGEN.get(v.id).ok && ECHT_AM_ADAPTER.has(v.id))
      .map(v => v.id + ' (echt: ' + ECHT_AM_ADAPTER.get(v.id).join(', ') + ') — ' + UMGEBUNGEN.get(v.id).grund);
    assert.deepEqual(echtUngemessen, [], 'Gate: ein Standard mit status echt ist UNGEMESSEN — rot, nicht still ok:\n    ' + echtUngemessen.join('\n    '));
  }
});

test('[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil', async (t) => {
  if (!GEMESSEN.length) return t.skip('UNGEMESSEN — ' + FEHLGRUND + ' (zaehlt NICHT als bestanden)');
  const abweichungen = [];
  for (const v of GEMESSEN) {
    const umgebung = UMGEBUNGEN.get(v.id);
    const faelle = await v.artefakte();
    if (altform(v)) {
      assert.ok(faelle.length >= 4, v.id + ': Positivkontrolle — Suchraum besetzt (' + faelle.length + ')');
      assert.ok(faelle.some(f => f.erwartet === 'gueltig') && faelle.some(f => f.erwartet === 'ungueltig'),
        v.id + ': Positivkontrolle — BEIDE Erwartungen kommen vor, sonst prueft der Lauf nur eine Richtung');
    } else {
      // Neuform: je Standard ein gueltig-Fall — das hält `echt` im Register ehrlich. Die Gegenrichtung trägt kaputt().
      const ohne = v.standards.filter(sid => !faelle.some(f => f.standard === sid && f.erwartet === 'gueltig'));
      assert.deepEqual(ohne, [], v.id + ': Positivkontrolle — je Standard ein gueltig-Fall');
    }
    // Sammelaufruf, wo der Prüfer ihn kann; bei sammelPflicht nie der Einzelweg (adapter/_urteile.mjs).
    const urteileJe = urteileHolen(v, umgebung, faelle);
    for (const f of faelle) {
      const u = urteileJe.get(f.pfad);
      if (!u.gelesen) { abweichungen.push(v.id + '/' + f.name + ': kein Urteil lesbar'); continue; }
      const ist = u.gueltig ? 'gueltig' : 'ungueltig';
      if (ist === f.erwartet) continue;
      abweichungen.push(v.id + '/' + f.name + ': erwartet ' + f.erwartet + ', ist ' + ist
        + '\n      (' + f.warum + ')'
        + (u.fehler.length ? '\n      ' + u.fehler.join('\n      ') : ''));
    }
  }
  assert.deepEqual(abweichungen, [],
    'Urteil eines externen Validators weicht ab:\n    ' + abweichungen.join('\n    '));
});

test('[Extern·Negativprobe] ein absichtlich kaputtes Erzeugnis wird ABGELEHNT', async (t) => {
  if (!GEMESSEN.length) return t.skip('UNGEMESSEN — ' + FEHLGRUND + ' (zaehlt NICHT als bestanden)');
  for (const v of GEMESSEN) {
    // kaputt() liefert ein Objekt (Altform) oder je Standard einen Fall (Neuform).
    const liste = kaputtListe(await v.kaputt());
    assert.ok(liste.length > 0, v.id + ': kaputt() liefert keinen Fall');
    if (!altform(v)) {
      const ohne = v.standards.filter(sid => !liste.some(f => f.standard === sid));
      assert.deepEqual(ohne, [], v.id + ': je Standard ein kaputter Fall');
    }
    const urteileJe = urteileHolen(v, UMGEBUNGEN.get(v.id), liste);
    for (const f of liste) {
      const u = urteileJe.get(f.pfad);
      assert.ok(u.gelesen, v.id + ': Urteil lesbar');
      assert.equal(u.gueltig, false,
        v.id + ' MUSS ein beschaedigtes Erzeugnis ablehnen. Tut er das nicht, urteilt er nicht '
        + 'wirklich — und jedes gruene Ergebnis oben waere wertlos.');
    }
  }
});

test('[Extern] die Registry ist nicht leer und jeder Eintrag ist vollstaendig', () => {
  assert.ok(VALIDATOREN.length > 0, 'ohne Eintrag liefe dieser Ort ueber nichts');
  const unvollstaendig = [];
  for (const v of VALIDATOREN) {
    // Altform (inline, ohne standards) nennt ihre Pakete; die Neuform ihre Familie und Standards.
    const felder = altform(v) ? ['id', 'autoritaet', 'prueft', 'werkzeugVersion', 'pakete', 'vorhanden', 'urteile', 'artefakte', 'kaputt']
      : ['id', 'familie', 'autoritaet', 'prueft', 'werkzeugVersion', 'standards', 'vorhanden', 'urteile', 'artefakte', 'kaputt'];
    for (const feld of felder) {
      if (!v[feld]) unvollstaendig.push(v.id + ': ' + feld + ' fehlt');
    }
    // Gepinnte Versionen, sichtbar: ein Ballot-Stand darf nicht still wandern.
    for (const p of (v.pakete || [])) {
      if (!/#/.test(p)) unvollstaendig.push(v.id + ': Paket ohne gepinnte Version — ' + p);
    }
  }
  assert.deepEqual(unvollstaendig, [], unvollstaendig.join(' · '));
});
