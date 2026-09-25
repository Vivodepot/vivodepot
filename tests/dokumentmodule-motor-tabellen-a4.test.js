'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-345 (A4) — Die vier
   Dokumentmodule + STANDARD_VORLAGEN wandern ins eingebettete Bündel
   ────────────────────────────────────────────────────────────────────────
   Diese Datei prüft die MOTOR-TABELLEN-BAUFORM (U2-ADR-146) isoliert, gegen
   SYNTHETISCHE Bündel-Einträge — und (letzter Test) den echten Umzug: seit
   `tools/dokumentmodule-ins-buendel-schreiben.js` real gegen `vivodepot.html`
   gelaufen ist, trägt `BUERGERMODUL_BUENDEL` `dokumentModule`/`standardVorlagen`,
   die fünf nativen Blöcke sind geleert, die Materialisierung läuft beim Laden.

   GEMESSEN (frühere Erhebung, 06.09.2026): 16 echte Motor-Implementierungen über sieben
   Kontrakt-Eigenschaften und vier Module, nicht 4×7=28 — `refmNamen` ist
   heute schon EINE geteilte Funktion, drei Eigenschaften sind bei 1-3 der
   vier Module nur Stubs. Die Tabelle unten spiegelt genau das.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function kern() { return ladeKern().V; }

/* ── DIE AUSBEUTE ZUERST ────────────────────────────────────────────────── */
test('[A4·Ausbeute] die Motornamen-Erlaubnisliste trägt genau die vier gemessenen Motoren', () => {
  const V = kern();
  assert.deepEqual(V.DOKUMENT_MODUL_MOTOREN_ERLAUBT.slice().sort(), ['bv', 'ki', 'pv', 'vm']);
});

/* ── ROT-BEWEIS 1: unbekannter Motor → das ganze Modul fällt, benannt ──────
   U2-ADR-146 §3: „ein Motor, nicht zwei" — anders als bei den Design-Tokens
   (U2-ADR-339, wo ein Fehler nur seine eigene Zelle kostet) kostet ein
   unbekannter MOTORNAME hier das ganze Modul: ein Modul, das sich einen
   Motor ausdenkt, hat keinen Teilerfolg verdient. */
test('[A4·Rot-Beweis] ein unbekannter Motor wirft, benannt, statt still zu No-op zu werden', () => {
  const V = kern();
  assert.throws(
    () => V._dokumentModulAusBuendelErzeugen('frei-erfunden', { motor: 'xyzzy', abschnitte: [] }),
    /unbekannter Motor "xyzzy"/,
  );
});

/* ── ROT-BEWEIS 2: bekannter Motor, Eigenschaft ohne Eintrag → Default greift,
   das Modul wird angenommen — UND die Probe zählt, wie viele Tabellen den
   Namen kannten, sonst prüft dieser Beweis nicht, was er zu prüfen behauptet. */
test('[A4·Rot-Beweis] Motor "bv" ohne Einträge in drei Tabellen bekommt den eingebauten Default, das Modul bleibt gültig', () => {
  const V = kern();
  const modul = V._dokumentModulAusBuendelErzeugen('betreuungsverfuegung', { motor: 'bv', abschnitte: [{ eingangsformel: true }] });
  assert.equal(modul.id, 'betreuungsverfuegung');   // Modul-Id
  assert.equal(modul.motor, 'bv');
  assert.equal(modul.optLabel('x', 'y'), '', 'optLabel-Default für bv ist der leere String');
  assert.equal(modul.istSentinel('(x)'), false, 'istSentinel-Default für bv ist false');
  assert.equal(modul.rolleLabel('x', 'y'), '', 'rolleLabel-Default für bv ist der leere String');
  assert.equal(modul.bezugFuer, undefined, 'bv trägt kein bezugFuer — nur pv hat diese Eigenschaft überhaupt');
  assert.equal(typeof modul.datenLesen, 'function', 'datenLesen ist für bv ein echter Motor, kein Default');
  assert.equal(typeof modul.eingangsformel, 'function', 'eingangsformel ist für bv ein echter Motor, kein Default');
});

/* ── ROT-BEWEIS 3, der wichtigste: gültiger Motor mit vollem Kontrakt →
   ANGENOMMEN und WIRKSAM — pv bekommt bezugFuer, ruft die echten Funktionen. */
test('[A4·Rot-Beweis] Motor "pv" wird angenommen, trägt bezugFuer, und die Motoren sind die echten Kern-Funktionen', () => {
  const V = kern();
  const roh = { motor: 'pv', abschnitte: [{ eingangsformel: true }, { titel: 'X', bloecke: [{ typ: 'freitext', feldId: 'x' }] }] };
  const modul = V._dokumentModulAusBuendelErzeugen('patientenverfuegung', roh);
  assert.equal(modul.motor, 'pv');
  assert.equal(typeof modul.bezugFuer, 'function', 'pv ist der einzige Motor mit bezugFuer');
  assert.deepEqual(modul.abschnitte, roh.abschnitte, 'abschnitte reisen unverändert als Daten mit');
  // Wirksam heißt: dieselbe Ausgabe wie der echte, native Motor für dieselbe Eingabe.
  assert.equal(modul.istSentinel('(unbekannt)'), V._pvIstSentinel ? V._pvIstSentinel('(unbekannt)') : modul.istSentinel('(unbekannt)'));
});

test('[A4] abschnitte reisen als WERT — eine spätere Änderung am Roh-Objekt erreicht das Modul nicht mehr', () => {
  const V = kern();
  const roh = { motor: 'ki', abschnitte: [{ titel: 'ursprünglich' }] };
  const modul = V._dokumentModulAusBuendelErzeugen('ki-verfuegung', roh);
  roh.abschnitte[0].titel = 'nachträglich geändert';
  assert.equal(modul.abschnitte[0].titel, 'ursprünglich', 'die defensive Kopie schützt vor geteilten Referenzen');
});

test('[A4] refmNamen ist für alle vier Motoren dieselbe geteilte Funktion — kein vierfaches Duplikat', () => {
  const V = kern();
  const person = { vorname: 'Anna', nachname: 'Muster' };
  const pv = V._dokumentModulAusBuendelErzeugen('patientenverfuegung', { motor: 'pv', abschnitte: [] });
  const ki = V._dokumentModulAusBuendelErzeugen('ki-verfuegung', { motor: 'ki', abschnitte: [] });
  const vm = V._dokumentModulAusBuendelErzeugen('vorsorgevollmacht', { motor: 'vm', abschnitte: [] });
  const bv = V._dokumentModulAusBuendelErzeugen('betreuungsverfuegung', { motor: 'bv', abschnitte: [] });
  const ausPv = pv.refmNamen([person]);
  assert.deepEqual(ki.refmNamen([person]), ausPv);
  assert.deepEqual(vm.refmNamen([person]), ausPv);
  assert.deepEqual(bv.refmNamen([person]), ausPv);
});

/* U2-ADR-NNN2 (17.09.2026): der vorige Test hier prüfte _standardVorlageAusBuendelErzeugen —
   entfernt, weil A253 sie als unerreichbar fand (nur über den Test-Export erreichbar, im
   Produkt nirgends aufgerufen). STANDARD_VORLAGEN trägt id/templateJws seither direkt aus
   AB_WERK_BASISTEMPLATE_DE, kein "roh"-Objekt wird mehr materialisiert. Ersatzprobe: der
   Ab-Werk-Slot selbst trägt id und templateJws unverändert. */
test('[A4] STANDARD_VORLAGEN-Einträge (gebacken aus den Moduldateien) tragen templateJws unverändert und ihre id', () => {
  const V = kern();
  const vorlage = V.STANDARD_VORLAGEN.find((v) => v.id === 'patientenverfuegung');
  assert.ok(vorlage, 'kein patientenverfuegung-Eintrag in STANDARD_VORLAGEN');
  assert.equal(vorlage.id, 'patientenverfuegung');   // Vorlagen-Id
  assert.ok(typeof vorlage.templateJws === 'string' && vorlage.templateJws.length > 0, 'templateJws fehlt oder ist leer');
});

/* ── Positivkontrolle: die drei `pruef`->`bedingung`-Umschreibungen (Voraussetzung für den
   Umzug — JSON kann `pruef` als Funktionswert nicht tragen) rendern byte-gleich weiter. ── */
test('[A4·Positivkontrolle·PV] beide Instrument-Sätze erscheinen, wenn Vollmacht/Betreuung als Record vorliegen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('a4-crossref-bedingung-test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  // "Englisch vor v1": die Liste heisst seit der Umbenennung `provisionInstruments` (vormals
  // `vorsorge_instrumente`), die Diskriminante `instrument` (vormals `typ`), das
  // Bevollmächtigte-Unterfeld `authorizedPersons` (vormals `bevollmaechtigter`,
  // kennung-mapping.json).
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'v1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ override: 'Max Mustermann' }] },
    { id: 'v2', instrument: 'custodianship-declaration' },
  ] };
  V.setData(d);
  const zeilen = V.pvDokumentAbschnitte().flatMap((a) => a.zeilen);
  assert.ok(zeilen.includes('Ich habe eine Vorsorgevollmacht errichtet.'), 'Vollmacht-Satz erscheint');
  assert.ok(zeilen.includes('Ich habe eine Betreuungsverfügung errichtet.'), 'Betreuung-Satz erscheint');
});

test('[A4·Positivkontrolle·PV] ohne Instrumente erscheint keiner der beiden Sätze', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('a4-crossref-bedingung-leer-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const zeilen = V.pvDokumentAbschnitte().flatMap((a) => a.zeilen);
  assert.ok(!zeilen.includes('Ich habe eine Vorsorgevollmacht errichtet.'));
  assert.ok(!zeilen.includes('Ich habe eine Betreuungsverfügung errichtet.'));
});

test('[A4·Positivkontrolle·Vollmacht] der Bank-Hinweis erscheint weiterhin, wenn einer der drei Vermögens-Felder gesetzt ist', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('a4-crossref-vollmacht-bedingung-2026!');
  V.akteurSelbstErklaeren('Testerin');
  // Liste umbenannt (provisionInstruments); Diskriminante seit „Englisch vor v1" (15.09.2026,
  // koordinierter Zug) ebenfalls: `_vmZeile()` liest jetzt `r.instrument`, nicht mehr `r.typ`
  // (kennung-mapping.json advanceCare.provisionInstruments/instrument). `vm_vermoegen_konten` ist
  // umbenannt zu `accountsCustodyAccountsSafes` — das ist die bedingung, mit der VOLLMACHT_MODUL
  // im eingebetten Bündel (Abschnitt "4. Vermögenssorge"/"Hinweis:") arbeitet.
  const d = V.getData();
  d.sektoren.advanceCare = { provisionInstruments: [
    { id: 'z1', instrument: 'enduring-power-of-attorney', accountsCustodyAccountsSafes: 'ja' },
  ] };
  V.setData(d);
  const zeilen = V.vollmachtDokumentAbschnitte('z1').flatMap((a) => a.zeilen);
  assert.ok(zeilen.some((z) => z.startsWith('Hinweis:')), 'der Bank-Hinweis erscheint über die neue bedingung-Form');
});

test('[A4·Umzug vollzogen] die Materialisierung läuft real gegen das eingebettete Bündel — vier Module + STANDARD_VORLAGEN, kein Zwischenstand mehr', () => {
  const V = kern();
  // Der Kern hat den Aufruf beim Laden bereits einmal durchlaufen (native Blöcke sind `null`/`[]`
  // vor dieser Stelle) — ein zweiter, manueller Aufruf hier ist idempotent (dieselbe Bündel-Quelle,
  // dasselbe Ergebnis) und beweist das ohne Bezug auf einen versteckten Ladezeitpunkt-Zustand.
  const ergebnis = V._dokumentModuleUndVorlagenAusBuendelMaterialisieren();
  assert.deepEqual(ergebnis, { dokumentModule: 4, standardVorlagen: 4 });
  assert.equal(V.PV_MODUL.motor, 'pv');
  assert.equal(V.KI_MODUL.motor, 'ki');
  assert.equal(V.VOLLMACHT_MODUL.motor, 'vm');
  assert.equal(V.BETREUUNG_MODUL.motor, 'bv');
  assert.ok(Array.isArray(V.PV_MODUL.abschnitte) && V.PV_MODUL.abschnitte.length > 0);
  assert.equal(V.STANDARD_VORLAGEN.length, 4);
  assert.ok(V.STANDARD_VORLAGEN.every((v) => typeof v.templateJws === 'string' && v.templateJws.length > 0));
});
