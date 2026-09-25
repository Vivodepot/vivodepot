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

const ARBEIT = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-extval-'));

/* ── Java finden: PATH zuerst, dann die üblichen Orte ─────────────────────────
   Homebrew verlinkt `openjdk` bewusst NICHT in den PATH — am 26.07. führte genau das
   zur Fehldiagnose „kein Java auf dem Rechner", obwohl zwei JDKs installiert waren.
   Darum die Suche, statt sich auf `java` im PATH zu verlassen. */
function javaPfad() {
  const kandidaten = [
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    'java',
    '/opt/homebrew/opt/openjdk@21/bin/java',
    '/opt/homebrew/opt/openjdk/bin/java',
    '/usr/local/opt/openjdk@21/bin/java',
  ].filter(Boolean);
  for (const k of kandidaten) {
    try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { /* weiter */ }
  }
  return null;
}

/* ── Die Registry ─────────────────────────────────────────────────────────────
   Je Eintrag: WER urteilt, WAS er prüft, WIE er gerufen wird, WAS ihm vorgelegt wird,
   WIE ein Urteil gelesen wird. Versionen sind GEPINNT und hier sichtbar — `eu.eps` ist
   ein Ballot-Stand, ein Wechsel muss eine bewusste Änderung sein, keine stille. */
export const VALIDATOREN = [
  {
    id: 'hl7-fhir-validator',
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
      return { ok: true, java, jar };
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
      const bau = async (name, erwartet, warum, fuellen) => {
        const { V } = ladeKern();
        await V.depotAnlegen('pw');
        V.akteurSelbstErklaeren('Konformitaet');
        fuellen(V);
        const p = path.join(ARBEIT, name + '.json');
        fs.writeFileSync(p, JSON.stringify(V.fhirIpsBundle('2026-07-26T12:00:00Z'), null, 1));
        faelle.push({ name, pfad: p, erwartet, warum });
      };
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

/* ── Der Lauf ──────────────────────────────────────────────────────────────────
   Die Test-TITEL sind bewusst LITERAL und laufen ueber die ganze Registry, statt je
   Eintrag zusammengesetzt zu werden. Grund: der Pruefstand (U2-ADR-099) loest jede
   Klausel-Zeile auf einen echten Test-Titel in der Datei auf — ein zur Laufzeit
   gebauter Name ist dort nicht auffindbar, und die Bindung waere unlesbar. Welcher
   Validator gefallen ist, steht in der Fehlermeldung, nicht im Titel. */
const UMGEBUNGEN = new Map(VALIDATOREN.map(v => [v.id, v.vorhanden()]));
const ALLE_DA = [...UMGEBUNGEN.values()].every(u => u.ok);
const FEHLGRUND = [...UMGEBUNGEN.entries()].filter(([, u]) => !u.ok)
  .map(([id, u]) => id + ': ' + u.grund).join(' · ');

test('[Extern] jedes Werkzeug der Registry ist da (eigenständiges Werkzeug, nicht in der Pflicht-Kette)', () => {
  if (ALLE_DA) return;
  const satz = 'UNGEMESSEN — ' + FEHLGRUND;
  console.log('\n  ⚠ ' + satz);
  console.log('  ⚠ Die folgenden [Extern]-Pruefungen sind damit UNGEMESSEN, nicht gruen.');
  console.log('  ⚠ Ausfuehrbar mit: FHIR_VALIDATOR_JAR=/pfad/validator_cli.jar npm run test:konformitaet:extern\n');
});

test('[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil', async (t) => {
  if (!ALLE_DA) return t.skip('UNGEMESSEN — ' + FEHLGRUND + ' (zaehlt NICHT als bestanden)');
  const abweichungen = [];
  for (const v of VALIDATOREN) {
    const umgebung = UMGEBUNGEN.get(v.id);
    const faelle = await v.artefakte();
    assert.ok(faelle.length >= 4, v.id + ': Positivkontrolle — Suchraum besetzt (' + faelle.length + ')');
    assert.ok(faelle.some(f => f.erwartet === 'gueltig') && faelle.some(f => f.erwartet === 'ungueltig'),
      v.id + ': Positivkontrolle — BEIDE Erwartungen kommen vor, sonst prueft der Lauf nur eine Richtung');
    for (const f of faelle) {
      const u = v.urteile(umgebung, f.pfad);
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
  if (!ALLE_DA) return t.skip('UNGEMESSEN — ' + FEHLGRUND + ' (zaehlt NICHT als bestanden)');
  for (const v of VALIDATOREN) {
    const f = await v.kaputt();
    const u = v.urteile(UMGEBUNGEN.get(v.id), f.pfad);
    assert.ok(u.gelesen, v.id + ': Urteil lesbar');
    assert.equal(u.gueltig, false,
      v.id + ' MUSS ein beschaedigtes Erzeugnis ablehnen. Tut er das nicht, urteilt er nicht '
      + 'wirklich — und jedes gruene Ergebnis oben waere wertlos.');
  }
});

test('[Extern] die Registry ist nicht leer und jeder Eintrag ist vollstaendig', () => {
  assert.ok(VALIDATOREN.length > 0, 'ohne Eintrag liefe dieser Ort ueber nichts');
  const unvollstaendig = [];
  for (const v of VALIDATOREN) {
    for (const feld of ['id', 'autoritaet', 'prueft', 'werkzeugVersion', 'pakete',
                        'vorhanden', 'urteile', 'artefakte', 'kaputt']) {
      if (!v[feld]) unvollstaendig.push(v.id + ': ' + feld + ' fehlt');
    }
    // Gepinnte Versionen, sichtbar: ein Ballot-Stand darf nicht still wandern.
    for (const p of (v.pakete || [])) {
      if (!/#/.test(p)) unvollstaendig.push(v.id + ': Paket ohne gepinnte Version — ' + p);
    }
  }
  assert.deepEqual(unvollstaendig, [], unvollstaendig.join(' · '));
});
