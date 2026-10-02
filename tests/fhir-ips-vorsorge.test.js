'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   L1 · Vollmacht und Patientenverfügung im IPS-Export (U2-ADR-466, v857)
   ───────────────────────────────────────────────────────────────────────────
   Der Abschnitt Advance Directives (LOINC 42348-3) trägt je Instrument ein Consent nach `consent-eu-eps`. Geprüft:
     1. jede Vorsorgevollmacht erscheint als Consent, die Bevollmächtigten als RelatedPerson mit Rolle AGNT;
     2. Ablageort und Gesundheitsbefugnisse kommen an — aber nur mit Freigabe der sensiblen Felder;
     3. der Widerspruch gegen die Notvertretung durch den Ehegatten erscheint als deny;
     4. KLASSENWÄCHTER: jede Wahl des Feldes `instrument` hat eine Abbildung oder steht benannt ausgenommen, und jedes
        abgebildete Instrument hat im deutschen Rechtsraum-Modul eine Rechtsgrundlage mit Adresse;
     5. SPIEGELPROBE: das Consent für Vorsorge baut genau eine Funktion — eine zweite Ausgabe (ISiK) nimmt dieselbe.
   Gegen den offiziellen Validator (IPS 2.0.0 und EPS 1.0.0-ballot, jede Exportsprache, mit Rot-Beweis „ohne actor.role“):
   tools/ips-vorsorge-validieren.js und die Registry in tests/konformitaet/externe-validatoren.mjs.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { vorsorgeDepotAnlegen } = require('../tools/lib/ips-vorsorge-beispiel.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const RECHTSRAUM_DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8'));
const VORLAGE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'bereich-templates', 'vivodepot-advanceCare.json'), 'utf8'));
const ROLLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';

const ressourcen = (b, typ) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === typ);
const aufloesen = (b, ref) => (b.entry.find((e) => e.fullUrl === ref) || {}).resource;
const abschnitt = (b) => ressourcen(b, 'Composition')[0].section.find((s) => s.code.coding[0].code === '42348-3');
const consentMit = (b, norm) => ressourcen(b, 'Consent').find((c) => c.policy && c.policy[0].uri.endsWith(norm));

async function bundle(opt) {
  const { V } = ladeKern();
  await vorsorgeDepotAnlegen(V);
  return V.fhirIpsBundle('2026-10-01T12:00:00Z', opt);
}

test('[Vorsorge·Abbildung] Vollmacht, Patientenverfügung, Betreuungsverfügung und Widerspruch: je ein Consent nach consent-eu-eps', async () => {
  const b = await bundle({ sensibel: true });
  const s = abschnitt(b);
  assert.ok(s, 'der Abschnitt Advance Directives fehlt');
  const consents = ressourcen(b, 'Consent');
  assert.equal(consents.length, 4, 'Vollmacht, Patientenverfügung, Betreuungsverfügung, Widerspruch — Bankvollmacht und Testament nicht');
  assert.deepEqual(s.entry.map((e) => aufloesen(b, e.reference).resourceType), ['Consent', 'Consent', 'Consent', 'Consent']);
  for (const c of consents) {
    assert.deepEqual(c.meta.profile, ['http://hl7.eu/fhir/eps/StructureDefinition/consent-eu-eps']);
    assert.deepEqual(c.scope.coding[0], { system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'adr' });
    assert.equal(c.category[0].coding[0].code, 'acd');
    assert.ok(c.patient && c.patient.reference, 'ppc-4: scope adr verlangt einen Patienten');
    assert.ok(c.policy && /^https:\/\/www\.gesetze-im-internet\.de\/bgb\/__\d+\.html$/.test(c.policy[0].uri), 'Rechtsgrundlage aus dem Rechtsraum-Modul');
  }
  assert.ok(consentMit(b, '__1827.html'), 'Patientenverfügung');
  assert.ok(consentMit(b, '__1816.html'), 'Betreuungsverfügung');
  const json = JSON.stringify(b);
  assert.doesNotMatch(json, /Bankfiliale|Amtsgericht/, 'Bankvollmacht und Testament sind ausgenommen');
});

test('[Vorsorge·Vollmacht] Bevollmächtigte als RelatedPerson mit Rolle AGNT, Rollen und Verwandtschaft, Frist; „Privat“ nur mit Rolle', async () => {
  const b = await bundle({ sensibel: true });
  const c = consentMit(b, '__1820.html');
  assert.ok(c, 'die Vorsorgevollmacht fehlt');
  assert.equal(c.dateTime, '2025-03-01');
  assert.deepEqual(c.provision.period, { end: '2031-05-01' });
  assert.equal(c.provision.actor.length, 2);
  const personen = c.provision.actor.map((a) => {
    assert.deepEqual(a.role.coding[0], { system: 'http://terminology.hl7.org/CodeSystem/v3-RoleClass', code: 'AGNT' });
    const rp = aufloesen(b, a.reference.reference);
    assert.equal(rp && rp.resourceType, 'RelatedPerson', 'actor.reference zeigt auf eine RelatedPerson im Bundle');
    return rp;
  });
  const [anna, privat] = personen;
  assert.deepEqual(anna.name, [{ text: 'Anna Mustermann', family: 'Mustermann', given: ['Anna'] }], 'Familienname und Vornamen aus den eigenen Feldern');
  const codes = anna.relationship.flatMap((r) => (r.coding || []).filter((x) => x.system === ROLLE).map((x) => x.code));
  assert.deepEqual(codes, ['DPOWATT', 'HPOWATT'], 'Art der Vollmacht wie U2-ADR-452, dazu HPOWATT bei erteilter Gesundheitsbefugnis');
  assert.ok(anna.relationship.some((r) => r.text === 'Tochter'), 'die Verwandtschaft als Text, nicht geraten codiert');
  assert.deepEqual(anna.period, { end: '2031-05-01' });
  assert.ok(anna.telecom.some((t) => t.system === 'phone'));
  assert.equal(privat.name, undefined, '„Privat“ markiert: kein Name');
  assert.equal(privat.telecom, undefined, '„Privat“ markiert: keine Erreichbarkeit');
  assert.ok(privat.relationship.every((r) => !r.text), '„Privat“ markiert: keine Beziehung');
});

test('[Vorsorge·Sensibel] Ablageort und Gesundheitsbefugnisse nur mit Freigabe der sensiblen Felder', async () => {
  const mit = await bundle({ sensibel: true });
  const v = consentMit(mit, '__1820.html');
  assert.deepEqual(v.provision.provision.map((p) => p.type), ['permit', 'permit', 'permit', 'deny', 'deny']);
  assert.ok(v.provision.provision.every((p) => p.code[0].text), 'jede Befugnis trägt ihren Satz');
  assert.match(JSON.stringify(mit), /Schreibtisch, oberste Schublade/);
  assert.match(consentMit(mit, '__1827.html').text.div, /Hausarztpraxis/);

  const ohne = await bundle(undefined);
  const w = consentMit(ohne, '__1820.html');
  assert.ok(w, 'ohne Freigabe steht das Instrument trotzdem da');
  assert.equal(w.provision.provision, undefined, 'ohne Freigabe keine Gesundheitsbefugnisse');
  assert.doesNotMatch(JSON.stringify(ohne), /Schreibtisch|Hausarztpraxis/, 'ohne Freigabe kein Ablageort');
});

test('[Vorsorge·1358] der Widerspruch gegen die Notvertretung durch den Ehegatten ist ein Consent deny mit dem Ehegatten', async () => {
  const b = await bundle({ sensibel: true });
  const c = consentMit(b, '__1358.html');
  assert.ok(c, 'der Widerspruch fehlt');
  assert.equal(c.provision.type, 'deny');
  assert.equal(c.dateTime, '2024-06-01');
  const rp = aufloesen(b, c.provision.actor[0].reference.reference);
  assert.deepEqual(rp.name, [{ text: 'Paul Mustermann' }], 'ohne eigene Felder nur text — der Name wird nie zerlegt (U2-ADR-467)');
  assert.deepEqual(rp.relationship[0].coding[0], { system: ROLLE, code: 'SPS' }, 'Familienstand verheiratet');

  const { V } = ladeKern();
  await vorsorgeDepotAnlegen(V);
  V.sektorFeldSetzen('advanceCare', 'spousalRepresentationObjection', 'nein');
  assert.equal(consentMit(V.fhirIpsBundle('2026-10-01T12:00:00Z', { sensibel: true }), '__1358.html'), undefined, 'kein Widerspruch, kein Consent');
});

test('[Vorsorge·leer] ohne Instrument und ohne Widerspruch gibt es den Abschnitt nicht (im IPS optional)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('vorsorge-leer-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  const b = V.fhirIpsBundle('2026-10-01T12:00:00Z', { sensibel: true });
  assert.equal(abschnitt(b), undefined);
  assert.equal(ressourcen(b, 'Consent').length, 0);
});

/* ── Klassenwächter ─────────────────────────────────────────────────────────────── */
function konstante(name) {
  const m = KERN.match(new RegExp('const ' + name + ' = Object\\.freeze\\(([\\[{])([\\s\\S]*?)[\\]}]\\);'));
  assert.ok(m, 'Konstante ' + name + ' im Kern');
  const schluessel = m[1] === '{' ? /'([a-z-]+)':/g : /^\s*'([a-z-]+)',/gm;
  return [...m[2].matchAll(schluessel)].map((x) => x[1]);
}
function instrumentOptionen(vorlage) {
  let gefunden = null;
  const geh = (o) => {
    if (gefunden || !o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(geh); return; }
    if (o.id === 'instrument' && Array.isArray(o.optionen)) { gefunden = o.optionen.map((x) => x.wert); return; }
    Object.values(o).forEach(geh);
  };
  geh(vorlage);
  return gefunden;
}
// Was weder abgebildet noch benannt ausgenommen ist — und was beides zugleich ist.
function luecken(optionen, abgebildet, ausgenommen) {
  return {
    ohne: optionen.filter((o) => !abgebildet.includes(o) && !ausgenommen.includes(o)),
    doppelt: optionen.filter((o) => abgebildet.includes(o) && ausgenommen.includes(o)),
  };
}

test('[Vorsorge·Klasse] jede Wahl des Feldes instrument hat eine Abbildung oder steht benannt ausgenommen', () => {
  const optionen = instrumentOptionen(VORLAGE);
  const abgebildet = konstante('IPS_VORSORGE_ABBILDUNG');
  const ausgenommen = konstante('IPS_VORSORGE_AUSGENOMMEN');
  assert.ok(optionen.length > 0, 'Ausbeute: die Wahlen des Feldes instrument werden gelesen');
  assert.ok(optionen.length >= 7, 'Ausbeute: ' + optionen.length + ' Wahlen');
  assert.equal(abgebildet.length, 3, 'drei abgebildete Instrumente');
  assert.equal(ausgenommen.length, 4, 'vier benannt ausgenommene Instrumente');
  assert.deepEqual(luecken(optionen, abgebildet, ausgenommen), { ohne: [], doppelt: [] });
  assert.deepEqual(abgebildet.filter((a) => !optionen.includes(a)), [], 'keine Abbildung für ein Instrument, das es nicht gibt');
  // Rot-Beweis im Test: ein neues Instrument ohne Entscheidung fällt auf
  assert.deepEqual(luecken(optionen.concat(['neues-instrument']), abgebildet, ausgenommen).ohne, ['neues-instrument']);
});

test('[Vorsorge·Klasse] jedes abgebildete Instrument und der Widerspruch haben im deutschen Rechtsraum-Modul eine Rechtsgrundlage mit Adresse', () => {
  const typen = konstante('IPS_VORSORGE_ABBILDUNG').concat(['spousal-emergency-representation']);
  const ohne = typen.filter((t) => {
    const rg = (RECHTSRAUM_DE.typen[t] || {}).rechtsgrundlage;
    return !(rg && /^§ \d+/.test(rg.paragraf) && /^https:\/\/www\.gesetze-im-internet\.de\//.test(rg.uri));
  });
  assert.deepEqual(ohne, []);
});

test('[Vorsorge·Spiegel] das Vorsorge-Consent baut genau eine Funktion', () => {
  // Die Terminologie des Vorsorge-Consents (Profil, scope adr, category acd, Rolle AGNT) liest genau eine Stelle des Kerns.
  const leser = KERN.match(/IPS_BEGRIFFE\.advanceDirectives\b/g) || [];
  assert.equal(leser.length, 1, 'eine zweite Stelle, die Vorsorge-Consents baut, wäre eine zweite Abbildung derselben Vollmacht');
  assert.equal((KERN.match(/CodeSystem\/consentscope/g) || []).length, 1, 'scope adr steht nur in den Terminologie-Daten');
});
