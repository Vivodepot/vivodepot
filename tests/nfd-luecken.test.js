'use strict';
/* ═════════════════════════════════════════════════════════════════
   NFD-Lücken (29.09.2026, v835): Schwangerschaft und Weglaufgefährdung

   Der Notfalldatensatz (gemSpec_InfoNFDM 1.7.1, Kap. 3.6.1) kennt unter „Besondere Hinweise“ Schwangerschaft
   (mit errechnetem Entbindungstermin) und Weglaufgefährdung (mit Erläuterung). Beide kennen nur „ja“ oder keine
   Angabe: „Eine Schwangerschaft kann nicht zwingend ausgeschlossen werden … Insofern ist nur die Auswahl ‚keine Angabe‘
   zulässig.“ Vivodepot hatte keine Kennung dafür.

   Geprüft:
     1. die vier Kennungen: sensibel, nur „ja“ als Wert (nie „nein“), Termin und Umstände hängen an ihrem „ja“;
     2. der IPS-Export: bei „ja“ Schwangerschaftsstatus (mit Termin) und ein Warnhinweis mit dem KBV-Code, bei keiner
        Angabe weder Eintrag noch Sektion — nie ein „nicht schwanger“;
     3. die Notfallkarte (PDF) und die Notfall-Ansicht: eingetragen → drauf, leer → nicht drauf (Entscheidung vom
        29.09.2026 „ja, nur wenn eingetragen“). Rot-Beweis je Weg gegen den Kern vor diesem Bau.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KENNUNGEN = ['pregnancy', 'pregnancyEstimatedDueDate', 'wanderingRisk', 'wanderingRiskDetails'];
const KBV = 'https://fhir.kbv.de/CodeSystem/KBV_CS_MIO_NFD_Runaway_Risk';
// Der Kern vor diesem Bau — für die Rot-Beweise: der heutige Kern ohne die vier Zeilen des Notfall-Kerns und ohne die
// vier Kennungen in der Karten-Gruppe „Im Notfall“. Aus dem Arbeitsstand gebaut, nicht aus der Git-Historie: ein Test, der
// hinausgeht, liest keinen Commit des privaten Repos ([Zuschnitt·Git-Historie]).
const NFD_KERN_ZEILE = new RegExp("^\\s*\\{ sektor: 'health', feld: '(" + KENNUNGEN.join('|') + ")'.*\\n", 'gm');
const NFD_IN_GRUPPE = new RegExp(", '(" + KENNUNGEN.join('|') + ")'", 'g');

async function depot(V, werte) {
  await V.depotAnlegen('nfd-luecken-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  for (const [k, v] of Object.entries(werte)) V.sektorFeldSetzen('health', k, v);
}
const VOLL = { pregnancy: 'ja', pregnancyEstimatedDueDate: '2027-02-11', wanderingRisk: 'ja', wanderingRiskDetails: 'verlässt nachts die Wohnung' };

function kernVorher(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nfd-vorher-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  const p = path.join(d, 'vivodepot.html');
  const heute = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const vorher = heute.replace(NFD_KERN_ZEILE, '').replace(NFD_IN_GRUPPE, '');
  assert.ok((heute.match(NFD_KERN_ZEILE) || []).length === 4 && vorher.length < heute.length, 'Vorbedingung: der heutige Kern trägt die vier Zeilen');
  fs.writeFileSync(p, vorher);
  return p;
}

test('[NFD·Kennungen] vier Kennungen, sensibel, nur „ja“ als Wert; Termin und Umstände hängen an ihrem „ja“', () => {
  const { V } = ladeKern();
  for (const k of KENNUNGEN) {
    const def = V.kennungFeldDef('health.' + k);
    assert.ok(def, 'Kennung fehlt: health.' + k);
    assert.equal(def.sensibel, true, 'Art. 9 DSGVO: ' + k);
  }
  for (const k of ['pregnancy', 'wanderingRisk']) {
    assert.deepEqual(V.kennungFeldDef('health.' + k).optionen.map((o) => o.wert), ['ja'], k + ': kein „nein“ (NFD: nur „ja“ oder keine Angabe)');
  }
  assert.deepEqual(V.kennungFeldDef('health.pregnancyEstimatedDueDate').sichtbarWenn, { feld: 'pregnancy', wert: 'ja' });
  assert.deepEqual(V.kennungFeldDef('health.wanderingRiskDetails').sichtbarWenn, { feld: 'wanderingRisk', wert: 'ja' });
});

function eintraege(b, typ) { return (b.entry || []).map((e) => e.resource).filter((r) => r.resourceType === typ); }
function sektion(b, code) { return eintraege(b, 'Composition')[0].section.find((s) => s.code.coding[0].code === code); }

test('[NFD·IPS] bei „ja“: Schwangerschaftsstatus mit Termin und ein Warnhinweis mit dem KBV-Code', async () => {
  const { V } = ladeKern();
  await depot(V, VOLL);
  const b = await V.fhirIpsBundle(undefined, { sensibel: true });
  const obs = eintraege(b, 'Observation');
  const status = obs.find((o) => o.code.coding.some((c) => c.code === '82810-3'));
  assert.ok(status, 'Schwangerschaftsstatus fehlt');
  assert.ok(status.valueCodeableConcept.coding.some((c) => c.system === 'http://snomed.info/sct' && c.code === '77386006'));
  assert.ok(status.valueCodeableConcept.coding.some((c) => c.system === 'http://loinc.org' && c.code === 'LA15173-0'));
  const termin = obs.find((o) => o.code.coding.some((c) => c.code === '11778-8'));
  assert.equal(termin && termin.valueDateTime, '2027-02-11');
  assert.ok(status.hasMember && status.hasMember.length === 1, 'der Termin hängt am Status');
  assert.ok(sektion(b, '10162-6'), 'Sektion History of Pregnancy');
  const flag = eintraege(b, 'Flag')[0];
  assert.ok(flag, 'Warnhinweis fehlt');
  assert.deepEqual(flag.code.coding[0], { system: KBV, version: '1.0.0', code: 'Weglaufgefaehrdung', display: 'Weglaufgefährdung' });
  assert.equal(flag.code.text, 'verlässt nachts die Wohnung');
  assert.ok(sektion(b, '104605-1'), 'Sektion Alerts');
});

test('[NFD·IPS] keine Angabe: weder Eintrag noch Sektion, nie ein „nicht schwanger“; ohne Freigabe des Sensiblen nichts', async () => {
  const { V } = ladeKern();
  await depot(V, {});
  const b = await V.fhirIpsBundle(undefined, { sensibel: true });
  assert.equal(eintraege(b, 'Flag').length, 0);
  assert.equal(sektion(b, '10162-6'), undefined);
  assert.equal(sektion(b, '104605-1'), undefined);
  assert.equal(JSON.stringify(b).includes('60001007'), false, '„Not pregnant“ wird nie behauptet');
  const k2 = ladeKern();
  await depot(k2.V, VOLL);
  const ohne = await k2.V.fhirIpsBundle(undefined, { sensibel: false });
  assert.equal(eintraege(ohne, 'Flag').length, 0, 'sensible Angaben gehen nur mit Freigabe hinaus');
  assert.equal(sektion(ohne, '10162-6'), undefined);
});

function kartenTexte(V) {
  const texte = [];
  const doc = {
    internal: { pageSize: { getWidth: () => 105, getHeight: () => 148 }, getNumberOfPages: () => 1 },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {}, addPage() {}, setPage() {}, addImage() {},
    splitTextToSize: (t) => [String(t)],
    text: (t) => { texte.push(Array.isArray(t) ? t.join(' ') : String(t)); },
  };
  V.zeichneNotfallkarte(doc, V.notfallKernModell(), { name: 'Maria Mustermann', datum: '29.09.2026' }, null);
  return texte.join('\n');
}

test('[NFD·Karte] eingetragen → auf der Notfallkarte; leer → nicht drauf, auch kein „nein“', async () => {
  const k = ladeKern();
  await depot(k.V, VOLL);
  const t = kartenTexte(k.V);
  for (const s of ['Schwangerschaft', 'ja, schwanger', 'Errechneter Entbindungstermin', 'Weglaufgefährdung', 'verlässt nachts die Wohnung']) assert.ok(t.includes(s), 'fehlt auf der Karte: ' + s);
  const leer = ladeKern();
  await depot(leer.V, {});
  const tl = kartenTexte(leer.V);
  assert.equal(/Schwangerschaft|Weglaufgefährdung|Entbindungstermin/.test(tl), false, 'ohne Eintrag steht nichts davon auf der Karte');
  const nurTermin = ladeKern();
  await depot(nurTermin.V, { pregnancyEstimatedDueDate: '2027-02-11' });
  assert.equal(kartenTexte(nurTermin.V).includes('Entbindungstermin'), false, 'ein Termin ohne „ja“ geht nicht auf die Karte');
});

/* Der alte Kern läuft in einem eigenen Prozess: ladeKern merkt sich die Quelle je Prozess, ein umgelenkter KERN_HTML_PATH
   im selben Prozess träfe den schon geladenen neuen Kern. `backen`: der alte Kern mit dem heutigen Produkt — die neuen
   Felder sind da, nur der alte Notfall-Kern kennt sie nicht. */
function imAltenKern(t, weg) {
  const skript = `
    const { ladeKern } = require(${JSON.stringify(path.join(__dirname, 'load-kern.js'))});
    (async () => {
      const k = ladeKern({ backen: true });
      await k.V.depotAnlegen('nfd-luecken-2026!');
      k.V.akteurSelbstErklaeren('Maria Mustermann');
      k.V.sektorFeldSetzen('identity', 'givenName', 'Maria');
      for (const [a, b] of Object.entries(${JSON.stringify(VOLL)})) k.V.sektorFeldSetzen('health', a, b);
      let text = '';
      if (${JSON.stringify(weg)} === 'karte') text = k.V.notfallKernModell().map((z) => z.label + ' ' + z.wert).join('\\n');
      else { k.V.renderNotfall(); text = k.document.getElementById('content').innerHTML; }
      process.stdout.write(JSON.stringify({ n: k.V.NOTFALL_KERN_FELDER.length, treffer: /Schwangerschaft|Weglaufgefährdung/.test(text) }));
    })().catch((e) => { process.stderr.write(String(e && e.stack || e)); process.exit(1); });`;
  const aus = execFileSync(process.execPath, ['-e', skript], { cwd: REPO, encoding: 'utf8', env: { ...process.env, KERN_HTML_PATH: kernVorher(t) } });
  return JSON.parse(aus);
}

test('[NFD·Karte·Rot-Beweis] der Kern vor diesem Bau trug nichts davon auf die Karte', (t) => {
  const r = imAltenKern(t, 'karte');
  assert.ok(r.n > 0, 'Vorbedingung: der alte Kern hat einen Notfall-Kern');
  assert.equal(r.treffer, false, 'der alte Kern hätte es schon getragen — der Rot-Beweis prüft nichts');
});

test('[NFD·Ansicht] eingetragen → in der Notfall-Ansicht; leer → nicht', async () => {
  const k = ladeKern();
  await depot(k.V, VOLL);
  k.V.renderNotfall();
  const html = k.document.getElementById('content').innerHTML;
  for (const s of ['Schwangerschaft', 'Weglaufgefährdung', 'verlässt nachts die Wohnung']) assert.ok(html.includes(s), 'fehlt in der Ansicht: ' + s);
  const leer = ladeKern();
  await depot(leer.V, {});
  leer.V.renderNotfall();
  assert.equal(/Schwangerschaft|Weglaufgefährdung/.test(leer.document.getElementById('content').innerHTML), false);
});

test('[NFD·Ansicht·Rot-Beweis] der Kern vor diesem Bau zeigte nichts davon in der Ansicht', (t) => {
  const r = imAltenKern(t, 'ansicht');
  assert.equal(r.treffer, false, 'die alte Ansicht hätte es schon gezeigt — der Rot-Beweis prüft nichts');
});

test('[NFD·Terminologie] die SNOMED-Begriffe der Terminologie-Quelle sind die freigegebenen GPS-Begriffe, unverändert', () => {
  const quelle = JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', 'terminologie', 'ips-nfd.json'), 'utf8'));
  const freigabe = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'snomed-freigabe.json'), 'utf8')).freigegeben;
  const codes = Object.keys(quelle.snomed).filter((k) => !k.startsWith('_'));
  assert.ok(codes.length >= 2, 'Vorbedingung: die Quelle trägt SNOMED-Begriffe');
  for (const c of codes) {
    assert.ok(freigabe[c], c + ' steht nicht in tools/snomed-freigabe.json (GPS-Nutzungsmuster, U2-ADR-446)');
    assert.equal(quelle.snomed[c], freigabe[c].begriff, c + ': der Begriff ist nicht der freigegebene GPS-Begriff');
  }
});
