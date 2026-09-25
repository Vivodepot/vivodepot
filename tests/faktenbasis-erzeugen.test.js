'use strict';
/* ════════════════════════════════════════════════════════════════════════
   faktenbasis-erzeugen — „Die Faktenbasis — und STANDARDS.md als
   erstes Dokument" (13.08.2026), Zug 1.
   ────────────────────────────────────────────────────────────────────────
   Drei mechanische Fehler wurden beim ersten Lauf gefunden und hier fest-
   gehalten, damit sie nicht wiederkehren: (1) die ADR-Register-Regex traf
   nur EINEN von drei im Bestand benutzten Trennern (":", "·", "—") und ließ
   ~63 von 143 Titeln als "(unlesbar)" stehen — genau die Klasse Fehler, die
   dieses Werkzeug verhindern soll; (2) ein mechanischer `test(`-Zähler ergab
   3539 gegen den echten Lauf 3649 (Differenz 110, Schleifen-generierte
   Tests); (3) die Import-Erzeuger-Extraktion lieferte rohen, abgeschnittenen
   Closure-Quelltext statt eines Funktionsnamens.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  erzeugeFaktenbasis, formatiereMarkdown, versionsBelegeAusFunktion,
  erzeugerName, importErzeugerName, importWegBeschreiben, adrRegister, normalisiertFuerVergleich,
  gestaltungsKlassen, DESIGN_KLASSEN,
  commitErreichbar,
} = require('../tools/faktenbasis-erzeugen.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const AUSGABE = path.join(REPO, 'docs', 'faktenbasis.md');

test('[ADR-Register] alle drei im Bestand benutzten Titel-Trenner werden erkannt (":", "·", "—")', () => {
  const eintraege = adrRegister();
  const unlesbar = eintraege.filter((e) => e.titel.startsWith('(kein Titel'));
  assert.deepEqual(unlesbar, [], `unlesbare Titel gefunden — genau der Fehler, den die Tabelle verhindern soll: ${JSON.stringify(unlesbar)}`);
});

test('[ADR-Register] Nummer kommt aus dem Dateinamen, nicht aus der ersten Zeile', () => {
  const eintraege = adrRegister();
  const e001 = eintraege.find((e) => e.datei.includes('U2-ADR-001'));
  assert.equal(e001.nummer, 'U2-ADR-001');
  assert.match(e001.titel, /Eigener ADR-Namensraum/);
});

test('[ADR-Register] README.md ist KEIN ADR-Eintrag, und ein Muster wie die frühere U2-INDEX-Datei würde auch keiner sein', () => {
  // Die U2-INDEX-Datei selbst ist seit 15.08.2026 kein Bewohner von docs/adr/ mehr (abgelöst
  // durch README.md, s. Auftrag „Eine Datei für die ADR-Übersicht") — die zweite Prüfung ist
  // darum reiner Muster-Regressionsschutz, kein Beleg über eine real vorhandene Datei.
  const eintraege = adrRegister();
  assert.ok(!eintraege.some((e) => e.datei === 'README.md'), 'README.md wurde fälschlich als ADR gezählt');
  assert.ok(!eintraege.some((e) => e.datei.startsWith('vivodepot-U2-INDEX')), 'ein U2-INDEX-förmiger Dateiname würde fälschlich als ADR gezählt');
});

test('[ADR-Register] doppelt vergebene Nummern (Nachtrag-Dateien) bleiben als zwei Einträge erhalten', () => {
  const eintraege = adrRegister();
  const nr077 = eintraege.filter((e) => e.nummer === 'U2-ADR-077');
  assert.equal(nr077.length, 2, 'U2-ADR-077 hat im Bestand zwei Dateien (Original + Nachtrag) — beide gehören in die Tabelle');
});

test('[Negativprobe] adrRegister erkennt einen vierten, im Bestand nicht vorkommenden Trenner NICHT — Titel bliebe dann roh', () => {
  // Direkte Regex-Probe statt Dateisystem-Fixture: derselbe Ausdruck, den adrRegister() intern
  // benutzt. Belegt, dass die Erkennung an die drei bekannten Trenner gebunden ist — kein
  // Freifahrtschein für einen völlig neuen Trenner ohne erneute Prüfung.
  const erstZeile = '# U2-ADR-200 / Ein Titel mit Schrägstrich als Trenner';
  let titel = erstZeile.replace(/^#\s*/, '');
  titel = titel.replace(/^U2-ADR-\d+(-Nachtrag)?\s*[:·—]\s*/i, '');
  assert.equal(titel, erstZeile.replace(/^#\s*/, ''), 'unveränderter Titel belegt: der Schrägstrich wird NICHT als Trenner erkannt (erwartetes Verhalten dieser Probe)');
});

test('[Import-Erzeuger] importErzeugerName findet die erste mit `text` aufgerufene Funktion', () => {
  // Simuliert die reale Form: "(text) => { const o = _jsonParse(text); return ...; }"
  const parseEcht = eval('(text) => { const o = _jsonParse(text); return o ? { felder: _fhirIpsFelder(o) } : null; }');
  assert.equal(importErzeugerName(parseEcht), '_jsonParse');
});

test('[Import-Erzeuger] kein Parser hinterlegt (def.parse ist undefined) wird ehrlich ausgewiesen, nicht verschwiegen', () => {
  assert.equal(importErzeugerName(undefined), '(kein Parser hinterlegt)');
});

test('[Import-Erzeuger] eine Funktion, die stets null liefert, wird als "kein Import-Pfad" erkannt statt als Funktionsname "null"', () => {
  const fn = () => null;
  assert.equal(importErzeugerName(fn), '(kein Import-Pfad — Funktion liefert stets null)');
});

test('[Negativprobe] importErzeugerName liefert bei einer Closure ohne "(text)"-Aufruf den rohen (gekürzten) Quelltext, keinen erfundenen Namen', () => {
  const fn = (eingabe) => { const o = JSON.parse(eingabe); return o; };
  const ergebnis = importErzeugerName(fn);
  assert.notEqual(ergebnis, '(kein Parser hinterlegt)');
  assert.notEqual(ergebnis, '(kein Import-Pfad — Funktion liefert stets null)');
  assert.ok(ergebnis.includes('JSON.parse') || ergebnis.length <= 60, 'Fallback muss der (gekürzte) echte Quelltext sein, keine Erfindung');
});

/* NACHTRAG (07.09.2026, Fund von `51` beim Poster-Bau): `importErzeugerName` mißt nur an
   `parse` entlang — für zwei registrierte Formate (`fhir-lab`/autoritativDoc, `provider-credential`/
   felderAusClaims) behauptete das bislang eine Abwesenheit, wo ein echter, anderer Import-Weg
   existiert. `importWegBeschreiben(def)` prüft das GANZE `def`, bevor es das behauptet. */
test('[Rot-Beweis] autoritativDoc: true mit parse: () => null wird als Ablage-Weg ausgewiesen, nicht als Loch', () => {
  const def = { id: 'fixture-autoritativ', autoritativDoc: true, parse: () => null };
  const ergebnis = importWegBeschreiben(def);
  assert.notEqual(ergebnis, '(kein Import-Pfad — Funktion liefert stets null)',
    'ein autoritativDoc-Eintrag hat einen echten Import-Weg (flowImportAutoritativ) — parse:()=>null ist Absicherung, keine Abwesenheit');
  assert.match(ergebnis, /flowImportAutoritativ/);
});

test('[Rot-Beweis] felderAusClaims OHNE parse-Feld wird als eigener Import-Weg ausgewiesen, nicht als "kein Parser"', () => {
  const def = { id: 'fixture-fachpfad', fachpfad: true, felderAusClaims: (nutzlast) => ({ felder: nutzlast }) };
  const ergebnis = importWegBeschreiben(def);
  assert.notEqual(ergebnis, '(kein Parser hinterlegt)',
    'felderAusClaims ist ein eigener, funktionierender Import-Weg — kein "kein Parser hinterlegt"');
  assert.match(ergebnis, /felderAusClaims/);
});

test('[Gegenprobe] ein Eintrag ohne autoritativDoc/felderAusClaims verhält sich wie bisher (importErzeugerName unverändert)', () => {
  const echtesParse = (text) => { const o = JSON.parse(text); return o; };
  assert.equal(importWegBeschreiben({ id: 'x', parse: echtesParse }), importErzeugerName(echtesParse));
  assert.equal(importWegBeschreiben({ id: 'y' }), '(kein Parser hinterlegt)');
  assert.equal(importWegBeschreiben({ id: 'z', parse: () => null }), '(kein Import-Pfad — Funktion liefert stets null)',
    'ein "() => null" OHNE autoritativDoc bleibt weiterhin ehrlich als Loch ausgewiesen — nicht jeder Null-Parser hat einen Ersatzweg');
});

test('[Positivkontrolle·echter Bestand] fhir-lab und provider-credential werden im echten Kern korrekt als Import-Wege erkannt', () => {
  const { V } = ladeKern();
  const fhirLab = V.IMPORT_FORMATE.find((d) => d.id === 'fhir-lab');
  const providerCredential = V.IMPORT_FORMATE.find((d) => d.id === 'provider-credential');
  assert.ok(fhirLab, 'fhir-lab muss im echten Bestand existieren — sonst prüft dieser Test nichts');
  assert.ok(providerCredential, 'provider-credential muss im echten Bestand existieren — sonst prüft dieser Test nichts');
  assert.match(importWegBeschreiben(fhirLab), /flowImportAutoritativ/);
  assert.match(importWegBeschreiben(providerCredential), /felderAusClaims/);
});

test('[Export-Erzeuger] erzeugerName liest den aufgerufenen Bezeichner aus der Wrapper-Closure', () => {
  assert.equal(erzeugerName(eval('(opt) => vcardMenschen(opt)')), 'vcardMenschen');
});

test('[Versions-Belege] VERSION:-Zeile, FHIR-Profil-URL, vct und resourceType werden gefunden, nichts sonst erfunden', () => {
  const fn = () => 'VERSION:4.0\nhttp://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips\nvct: "urn:vivodepot:identitaet"\nresourceType: "Patient"';
  const belege = versionsBelegeAusFunktion(fn);
  assert.ok(belege.includes('VERSION:4.0'));
  assert.ok(belege.includes('http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips'));
  assert.ok(belege.includes('vct:urn:vivodepot:identitaet'));
  assert.ok(belege.includes('resourceType:Patient'));
});

test('[Versions-Belege] keine Marker im Code → leere Liste, nicht erfunden', () => {
  const fn = () => 'nichts Auffälliges hier';
  assert.deepEqual(versionsBelegeAusFunktion(fn), []);
});

test('[Positivkontrolle] echter Lauf gegen den echten Kern: keine unlesbaren ADR-Titel, mindestens 130 ADR-Einträge, 10 Export- und 17 Import-Formate', () => {
  const f = erzeugeFaktenbasis();
  assert.ok(f.adrZahl > 130, `zu wenige ADR-Einträge erkannt: ${f.adrZahl}`);
  assert.ok(!f.adr.some((a) => a.titel.startsWith('(kein Titel')), 'unlesbare ADR-Titel im echten Lauf');
  // 11 -> 10 (U2-ADR-NNN, 18.09.2026): der offene JSON-Vollexport ist aus EXPORT_FORMATE entfernt.
  assert.equal(f.exportFormateZahl, 10);
  assert.equal(f.importFormateZahl, 17);
});

test('[--check] normalisiertFuerVergleich blendet Kopfzeile UND Suite-Zeile aus, sonst nichts', () => {
  const a = '**Erzeugt am:** 2026-01-01 · **Commit:** `abc1234`\n- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): 100\nRest bleibt gleich';
  const b = '**Erzeugt am:** 2026-08-13 · **Commit:** `def5678`\n- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): 999\nRest bleibt gleich';
  assert.equal(normalisiertFuerVergleich(a), normalisiertFuerVergleich(b));
});

test('[Negativprobe / Rotmachbarkeit] --check schlägt an, wenn eine echte Kern-Zahl von der Datei abweicht', () => {
  // Reine String-Probe, KEIN Schreiben auf docs/faktenbasis.md — die Datei ist geteilter Zustand
  // mit tests/faktenbasis-aktualitaet.test.js, die im selben Suite-Lauf parallel laufen kann
  // (Node startet verschiedene Testdateien nebenläufig); ein Schreib-Wettlauf zwischen beiden
  // Dateien hat hier real einen Fehlalarm erzeugt (13.08.2026) — behoben durch reines In-Memory-
  // Vergleichen statt Mutieren der committeten Datei.
  const bisherig = fs.readFileSync(AUSGABE, 'utf8');
  // U2-ADR-NNN (18.09.2026): 11 -> 10 Exportwege (der offene JSON-Vollexport ist entfernt).
  const verfaelscht = bisherig.replace('## Export-Formate (10)', '## Export-Formate (11)');
  assert.notEqual(verfaelscht, bisherig, 'Fixture griff nicht — Text nicht gefunden');
  const f = erzeugeFaktenbasis();
  const neu = formatiereMarkdown(f);
  const gleich = normalisiertFuerVergleich(verfaelscht) === normalisiertFuerVergleich(neu);
  assert.equal(gleich, false, 'eine gepflanzte Abweichung (Export-Formate-Zahl) wurde NICHT erkannt');
});

test('[Rot⇄Grün] nach Wiederherstellung der echten Datei stimmt --check wieder überein', () => {
  const f = erzeugeFaktenbasis();
  const neu = formatiereMarkdown(f);
  const bisherig = fs.readFileSync(AUSGABE, 'utf8');
  assert.equal(normalisiertFuerVergleich(bisherig), normalisiertFuerVergleich(neu), 'docs/faktenbasis.md weicht vom echten Kern ab — node tools/faktenbasis-erzeugen.js erneut laufen lassen');
});

// ── Gestaltung („Faktenbasis-Design", Zug 2, 14.08.2026) ──────────────────────────
test('[Gestaltung] findet eine echte, existierende Klasse mit ihrer Deklaration', () => {
  const html = '<style>.btn { background: var(--forest); padding: 4px; }</style><div class="btn">x</div>';
  const [treffer] = gestaltungsKlassen(html, ['btn']);
  assert.equal(treffer.klasse, '.btn');
  assert.equal(treffer.regelnGefunden, 1);
  assert.match(treffer.deklarationen[0], /background: var\(--forest\)/);
  assert.equal(treffer.verwendungAusserhalbStyle, 1);
});

test('[Gestaltung] eine im Code nicht existierende Klasse liefert 0 Regeln, 0 Verwendungen — nichts erfunden', () => {
  const html = '<style>.btn { color: red; }</style><div class="btn">x</div>';
  const [treffer] = gestaltungsKlassen(html, ['btn-primary']);
  assert.equal(treffer.regelnGefunden, 0);
  assert.deepEqual(treffer.deklarationen, []);
  assert.equal(treffer.verwendungAusserhalbStyle, 0);
});

test('[Gestaltung] "btn" und "btn-sek" werden nicht verwechselt (Klassengrenze, kein Teilstring-Treffer)', () => {
  const html = '<style>.btn { color: red; } .btn-sek { color: blue; }</style><div class="btn-sek">x</div>';
  const [btn, btnSek] = gestaltungsKlassen(html, ['btn', 'btn-sek']);
  assert.equal(btn.regelnGefunden, 1, 'nur die eigene Regel, nicht auch .btn-sek');
  assert.equal(btn.verwendungAusserhalbStyle, 0, 'class="btn-sek" darf NICHT als Verwendung von "btn" zählen');
  assert.equal(btnSek.regelnGefunden, 1);
  assert.equal(btnSek.verwendungAusserhalbStyle, 1);
});

test('[Gestaltung] toter Code wird sichtbar: eine Klasse mit Regel(n), aber 0 Verwendung außerhalb des Stylesheets', () => {
  const html = '<style>.btn-notfall { color: red; }</style><div class="btn">kein Notfall-Knopf im Markup</div>';
  const [treffer] = gestaltungsKlassen(html, ['btn-notfall']);
  assert.equal(treffer.regelnGefunden, 1);
  assert.equal(treffer.verwendungAusserhalbStyle, 0);
});

test('[Gestaltung] mehrere Regeln für dieselbe Klasse (Basis + :hover) werden beide erfasst', () => {
  const html = '<style>.btn { color: red; } .btn:hover { color: blue; }</style><div class="btn"></div>';
  const [treffer] = gestaltungsKlassen(html, ['btn']);
  assert.equal(treffer.regelnGefunden, 2);
});

test('[Positivkontrolle] echter Lauf: DESIGN_KLASSEN sind alle im Stylesheet auffindbar außer den bewusst toten', () => {
  const htmlText = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const treffer = gestaltungsKlassen(htmlText, DESIGN_KLASSEN);
  const ohneRegel = treffer.filter((t) => t.regelnGefunden === 0);
  assert.deepEqual(ohneRegel, [], 'jede Klasse in DESIGN_KLASSEN muss mindestens eine CSS-Regel haben, sonst gehört sie nicht in die Liste');
  const btnNotfall = treffer.find((t) => t.klasse === '.btn-notfall');
  assert.ok(btnNotfall, 'DESIGN_KLASSEN muss .btn-notfall enthalten (bekannter toter Code, U2-ADR-078)');
  assert.equal(btnNotfall.verwendungAusserhalbStyle, 0, '.btn-notfall bleibt toter Code — wird das nicht mehr 0, hat sich etwas geändert und die Faktenbasis muss es zeigen');
});

/* ── Die Commit-Zeile zeigt nie ins Leere (16.09.2026) ────────────────────────────────────────
   BEFUND: docs/faktenbasis.md nannte `ebbc319a` — ein Vor-Rebase-Stand, der auf keinem
   Remote-Zweig liegt. Die Zeile sieht aus wie ein Weg zum Nachsehen und ist keiner. Ursache ist
   nicht der eine Fall: `commitHash()` liest `git rev-parse HEAD` aus dem Arbeitsbaum, und jeder
   Rebase danach macht den Wert tot. Darum sagt die Zeile jetzt dazu, wenn der Stand nicht
   gepusht ist. */
test('[Faktenbasis·Commit] ein gelandeter Commit steht nackt, ein ungepushter trägt seinen Vermerk', () => {
  const { execSync } = require('node:child_process');
  const REPO_ = path.join(__dirname, '..');
  /* U2-ADR-232: jeder verschachtelte git-Aufruf bekommt die GIT_*-Variablen abgestreift. Läuft
     dieser Test im pre-commit-Hook, sind GIT_DIR/GIT_INDEX_FILE auf das echte Repo gesetzt und
     ein Kindprozess erbt sie — `cwd` allein schützt nicht. (Genau hier gefunden: die erste
     Fassung dieser Probe hat der Wächter gefangen.) */
  const ohneGit = Object.assign({}, process.env);
  for (const k of Object.keys(ohneGit)) if (k.startsWith('GIT_')) delete ohneGit[k];
  const gelandet = execSync('git rev-parse --short origin/u2-kanon', { cwd: REPO_, env: ohneGit }).toString().trim();
  assert.equal(commitErreichbar(gelandet), true, 'Testaufbau: der gelandete Kanon-Commit muss auf einem Remote-Zweig liegen');

  // Ein Commit, den es im Repo gibt, der aber auf keinem Remote-Zweig liegt: ein frischer,
  // leerer Commit-Gegenstand ohne Zweig — dieselbe Lage wie ein Stand vor dem Rebase.
  const baum = execSync('git rev-parse HEAD^{tree}', { cwd: REPO_, env: ohneGit }).toString().trim();
  const lose = execSync('git commit-tree ' + baum + ' -m "loser Stand fuer die Probe"',
    { cwd: REPO_, env: Object.assign({}, ohneGit, { GIT_AUTHOR_NAME: 'Probe', GIT_AUTHOR_EMAIL: 'probe@example.invalid', GIT_COMMITTER_NAME: 'Probe', GIT_COMMITTER_EMAIL: 'probe@example.invalid' }) })
    .toString().trim();
  assert.equal(commitErreichbar(lose), false, 'ein Commit ohne Remote-Zweig darf NICHT als erreichbar gelten');
});
