'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Antwort-Seed — Wagen V2a des Plans „signierte Antwort und Zertifikat der Stelle" (15.10.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Bedingung zum Plan: Ein altes Depot ohne Seed öffnet sich und legt den Seed beim ersten Bedarf an.
   Eine Sicherung geht in 5 und in 50 Jahren auf: geöffnet werden eine Sicherung aus der Fassung vor dem Wagen und eine
   mit Seed, mit dem heutigen Kern und mit der Lese-App; der Seed übersteht Passwortwechsel und Wiederherstellung.

   Dazu die Klasse „nie in einer Ausgabe": der Seed ist Krypto-Material für die Schlüssel je Stelle und geht in keinen
   Export, keinen Ausschnitt, kein PDF-Modell, keine Credential-Nutzlast. Gehalten zweifach — am Quelltext (nur der eine
   Zugang liest ihn) und am erzeugten Artefakt (ein gepflanzter Seed steht in keiner Ausgabe).

   Fixtures: (a) vor dem Wagen — tests/fixtures/v515-ohne-auszuege (Schema 75, gepinnt) und das Vorführ-Depot
   tests/fixtures/vorfuehrung-zugang-zum-recht/demo-de.vivodepot; (b) mit Seed — tests/fixtures/antwort-seed/
   (erzeugt mit dem Kern dieses Wagens, gepinnt; Erzeuger und Passwort im README daneben).
   ═════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const PW = 'antwort-seed-probe-passwort-2026';
const PW_NEU = 'antwort-seed-probe-neues-passwort-2026';
const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const KANON_VOR_DEM_WAGEN = '4d9d3b9c3';   // der Kern, der den Antwort-Seed nicht kennt (v929)

// (a) vor dem Wagen — dieselbe Prüfsumme, die die Probe „Pro-Datei öffnen verliert nichts“ pinnt.
const ALT_V515 = path.join(__dirname, 'fixtures', 'v515-ohne-auszuege', 'depot-v515-ohne-auszuege.vivodepot');
const ALT_V515_SHA256 = '9323496003a4b2d0b3152166bde4295f93e5809da38f3b1a5bfbd84dad8b35be';
const ALT_V515_PW = 'v515-fixture-ohne-auszuege-2026';
const ALT_DEMO = path.join(__dirname, 'fixtures', 'vorfuehrung-zugang-zum-recht', 'demo-de.vivodepot');
const ALT_DEMO_PW = 'zugang-zum-recht-vorfuehrung-2026';
// (b) mit Seed — eingefroren. Die Prüfsumme gibt der Erzeuger im Fixture-Ordner aus (README daneben).
const MIT_SEED = path.join(__dirname, 'fixtures', 'antwort-seed', 'depot-mit-antwort-seed.json');
const MIT_SEED_SHA256 = 'ae28b98b3d5b5b706439a0d45a9686edf85dc78ea79981f68ac0a517354286e9';
const MIT_SEED_PW = 'antwort-seed-fixture-2026';

const kopie = (u) => JSON.parse(JSON.stringify(u));
const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const umschlagAusDatei = (pfad) => { const t = fs.readFileSync(pfad, 'utf8'); return JSON.parse(t.slice(t.indexOf('{'))); };
const sha256 = (pfad) => crypto.createHash('sha256').update(fs.readFileSync(pfad)).digest('hex');
// Ob das offene Depot den Seed trägt — am Depot-Objekt gemessen, nicht über eine eigene Kern-Funktion.
const hatSeed = (V) => Object.prototype.hasOwnProperty.call(V.getData() || {}, V.ANTWORT_SEED_FELD);
function seedWert(d, V) { const f = d && d[V.ANTWORT_SEED_FELD]; return f ? f.wert : undefined; }

async function depotMitInhalt(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Elisabeth Wredenhagen');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  return V;
}

// Eine Datei-Attrappe für den Speicherweg (dieselbe Bauart wie in tests/wiederherstellungs-code.test.js).
function dateiAttrappe() {
  const geschrieben = [];
  function FakeBlob(t) { this._text = String((t && t[0]) || ''); }
  const handle = { name: 'antwort-seed.vivodepot', createWritable: async () => ({ write: async (b) => { geschrieben.push(b._text); }, close: async () => {} }) };
  const letzte = () => { const t = geschrieben[geschrieben.length - 1]; return JSON.parse(t.slice(t.indexOf('{'))); };
  return { opts: { Blob: FakeBlob, showSaveFilePicker: async () => handle }, letzte };
}

// ── Anlegen: einmal, beim ersten Bedarf ──────────────────────────────────────────────────────────

test('[Antwort-Seed·Anlegen] ein frisches Depot trägt keinen Seed; der erste Bedarf legt 32 Byte an, jeder weitere liefert dieselben', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  assert.equal(hatSeed(V), false, 'nicht in leeresDepot(): angelegt wird erst beim Bedarf');
  assert.equal(Object.prototype.hasOwnProperty.call(V.leeresDepot(), V.ANTWORT_SEED_FELD), false);
  V.markiereGespeichert();
  const s1 = V._antwortSeedHolen();
  assert.equal(s1.length, 32);
  assert.equal(V.istUngespeichert(), true, 'der neue Seed wird mit dem nächsten Speichern geschrieben');
  const feld = V.getData()[V.ANTWORT_SEED_FELD];
  assert.deepEqual(Object.keys(feld).sort(), ['form', 'wert']);
  assert.equal(feld.form, 1);
  assert.equal(V._antwortSeedGueltig(feld), true);
  s1.fill(0);   // eine Kopie: nullen ändert den gespeicherten Seed nicht
  const s2 = V._antwortSeedHolen();
  const s3 = V._antwortSeedHolen();
  assert.equal(b64(s2), b64(s3), 'idempotent: kein zweiter Seed für dasselbe Depot');
  assert.equal(seedWert(V.getData(), V), feld.wert);
  assert.notEqual(b64(s2), b64(new Uint8Array(32)), 'nicht genullt');
});

test('[Antwort-Seed·Anlegen·Rot-Beweis] zwei Depots bekommen verschiedene Seeds — die Idempotenz-Probe ist nicht durch einen festen Wert grün', async () => {
  const gesehen = new Set();
  for (let i = 0; i < 4; i++) {
    const { V } = ladeKern();
    await V.depotAnlegen(PW + i);
    gesehen.add(b64(V._antwortSeedHolen()));
  }
  assert.equal(gesehen.size, 4);
});

test('[Antwort-Seed·kaputt] ein vorhandener, unlesbarer Eintrag wird nie still ersetzt', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const kaputt = [{ form: 1, wert: 'zu-kurz' }, { form: 2, wert: 'A'.repeat(43) }, { form: 1, wert: 'A'.repeat(43), extra: 1 }, 'text', null];
  for (const k of kaputt) {
    V.getData()[V.ANTWORT_SEED_FELD] = k;
    assert.throws(() => V._antwortSeedHolen(), /antwort-seed:ungueltig/, JSON.stringify(k));
    assert.deepEqual(V.getData()[V.ANTWORT_SEED_FELD], k, 'der Eintrag steht unverändert');
  }
});

// ── Quelltext: nur der eine Zugang liest den Seed ────────────────────────────────────────────────

function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\w\\])\/\/[^\n]*/g, '$1');
}
// Je Fundstelle die umgebende oberste Funktion oder Konstante.
function fundstellen(quelle, muster) {
  const raus = [];
  let kontext = null;
  ohneKommentare(quelle).split('\n').forEach((z, i) => {
    const m = z.match(/^(?:async )?function ([A-Za-z0-9_$]+)\(|^(?:const|let|var) ([A-Za-z0-9_$]+)\b/);
    if (m) kontext = m[1] || m[2];
    if (muster.test(z)) raus.push({ zeile: i + 1, kontext });
  });
  return raus;
}
const ERLAUBT_FELD = new Set(['ANTWORT_SEED_FELD', '_antwortSeedHolen', 'vollExportJSON', 'EMPFAENGER_NIE']);
const ERLAUBT_AUFRUF_HOLEN = new Set([]);   // Wagen V2 trägt hier die Ableitung je Stelle ein — sonst niemand
function quelltextBefunde(quelle) {
  const f = [];
  for (const s of fundstellen(quelle, /\bantwortSeed\b/)) if (s.kontext !== 'ANTWORT_SEED_FELD') f.push('Literal ausserhalb der Konstante: ' + s.kontext + ' (Zeile ' + s.zeile + ')');
  for (const s of fundstellen(quelle, /\bANTWORT_SEED_FELD\b/)) if (!ERLAUBT_FELD.has(s.kontext)) f.push('Feld gelesen in ' + s.kontext + ' (Zeile ' + s.zeile + ')');
  for (const s of fundstellen(quelle, /\b_antwortSeedHolen\(/)) {
    if (s.kontext !== '_antwortSeedHolen' && !ERLAUBT_AUFRUF_HOLEN.has(s.kontext)) f.push('Seed geholt in ' + s.kontext + ' (Zeile ' + s.zeile + ')');
  }
  for (const s of fundstellen(quelle, /\bconsole\./)) {
    if (/^_?antwortSeed/i.test(String(s.kontext))) f.push('Ausgabe auf die Konsole in ' + s.kontext);
  }
  return f;
}

test('[Antwort-Seed·Quelltext] nur der eine Zugang liest den Seed; die Ausgabe-Sperren nennen ihn; keine Konsole', () => {
  const funde = fundstellen(KERN_QUELLE, /\bANTWORT_SEED_FELD\b/);
  assert.ok(funde.some((s) => s.kontext === 'vollExportJSON'), 'Positivkontrolle: vollExportJSON löscht den Seed');
  assert.ok(funde.some((s) => s.kontext === 'EMPFAENGER_NIE'), 'Positivkontrolle: EMPFAENGER_NIE sperrt den Seed');
  assert.deepEqual(quelltextBefunde(KERN_QUELLE), []);
});

test('[Antwort-Seed·Quelltext·Rot-Beweis] ein gepflanzter Leser, ein Literal und ein Aufruf ausserhalb werden gefunden', () => {
  const anker = 'function vollDepotModell(optionen) {';
  assert.ok(KERN_QUELLE.includes(anker), 'Mutationsstelle fehlt');
  const f1 = quelltextBefunde(KERN_QUELLE.replace(anker, anker + '\n  const x = data[ANTWORT_SEED_FELD];'));
  assert.ok(f1.some((z) => /Feld gelesen in vollDepotModell/.test(z)), f1.join(' | '));
  const f2 = quelltextBefunde(KERN_QUELLE.replace(anker, anker + "\n  const y = data.antwortSeed;"));
  assert.ok(f2.some((z) => /Literal ausserhalb der Konstante: vollDepotModell/.test(z)), f2.join(' | '));
  const f3 = quelltextBefunde(KERN_QUELLE.replace(anker, anker + '\n  const z = _antwortSeedHolen();'));
  assert.ok(f3.some((z) => /Seed geholt in vollDepotModell/.test(z)), f3.join(' | '));
});

// ── Artefakt: ein gepflanzter Seed steht in keiner Ausgabe ───────────────────────────────────────

/* Ein Depot mit Inhalt in mehreren Bereichen und einer Person, ohne das zurückgehaltene Referenzdepot: diese Probe geht mit
   dem öffentlichen Stand hinaus. Je Bereich wird jedes Textfeld mit einem erkennbaren Wert belegt, damit jede Ausgabe etwas trägt. */
async function depotMitSeedUndInhalt() {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const d = V.getData();
  d.menschen = [{ id: 'p1', name: 'Anna Beispiel' }];
  for (const b of V.bereicheAlle()) {
    for (const sek of (b.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f && f.typ === 'text') (d.sektoren[b.id] || (d.sektoren[b.id] = {}))[f.id] = 'Probewert ' + b.id + '.' + f.id;
      }
    }
  }
  V.setData(d);
  const roh = V._antwortSeedHolen();
  const wert = seedWert(V.getData(), V);
  // Jede Schreibweise, in der der Seed hinausginge: base64url, base64, hex, und der Feldname selbst.
  const spuren = [wert, b64(roh), b64(roh).replace(/=+$/, ''), Buffer.from(roh).toString('hex'), V.ANTWORT_SEED_FELD];
  return { V, spuren };
}

async function alleAusgaben(V) {
  const raus = [];
  const dazu = (name, wert) => raus.push({ name, text: typeof wert === 'string' ? wert : JSON.stringify(wert) });
  for (const sensibel of [false, true]) {
    for (const def of V.EXPORT_FORMATE) dazu('format:' + def.id + (sensibel ? '+sensibel' : ''), await Promise.resolve(def.baue({ sensibel })));
    dazu('vollExportJSON' + (sensibel ? '+sensibel' : ''), V.vollExportJSON({ sensibel }));
    dazu('vollDepotModell' + (sensibel ? '+sensibel' : ''), V.vollDepotModell({ sensibel }));
    for (const b of V.bereicheAlle()) dazu('bereichVollModell:' + b.id + (sensibel ? '+sensibel' : ''), V.bereichVollModell(b.id, { sensibel }));
  }
  dazu('notfallKernModell', V.notfallKernModell());
  dazu('angehoerigenCacheModell', V.angehoerigenCacheModell());
  dazu('empfaengerZuschnittModell:alle-bausteine', V.empfaengerZuschnittModell({ id: 'k1', name: 'Probe', bausteine: V.empfaengerBausteineAlle().map((b) => b.id) }));
  return raus;
}

function ausgabeBefunde(ausgaben, spuren) {
  const f = [];
  for (const a of ausgaben) for (const s of spuren) if (s && a.text.includes(s)) f.push(a.name + ' trägt „' + s.slice(0, 12) + '…"');
  return f;
}

test('[Antwort-Seed·nie in einer Ausgabe] kein Export-Format, kein Voll-Export (auch Umzug), kein PDF-Modell, kein Ausschnitt trägt den Seed', async () => {
  const { V, spuren } = await depotMitSeedUndInhalt();
  const ausgaben = await alleAusgaben(V);
  assert.ok(ausgaben.length >= V.EXPORT_FORMATE.length * 2 + 6, 'Positivkontrolle: die Ausgaben sind erzeugt (' + ausgaben.length + ')');
  assert.ok(ausgaben.some((a) => a.name === 'vollExportJSON+sensibel' && a.text.length > 1000), 'Positivkontrolle: der Umzug trägt Inhalt');
  assert.deepEqual(ausgabeBefunde(ausgaben, spuren), []);
  assert.ok(hatSeed(V), 'Vorbedingung: der Seed liegt im Depot, die Ausgaben lassen ihn nur weg');
});

test('[Antwort-Seed·nie in einer Ausgabe·Rot-Beweis] eine Ausgabe, die das Depot ganz kopiert, wird gefunden', async () => {
  const { V, spuren } = await depotMitSeedUndInhalt();
  const f = ausgabeBefunde([{ name: 'gepflanzt', text: JSON.stringify(V.getData()) }], spuren);
  assert.ok(f.length >= 2, f.join(' | '));
});

// ── Sicherbarkeit (a): eine Sicherung von vor dem Wagen ──────────────────────────────────────────

test('[Sicherbarkeit·vor dem Wagen] die v515-Datei öffnet im heutigen Kern ohne Seed, legt ihn beim ersten Bedarf an, und die nächste Sicherung trägt ihn', async () => {
  assert.equal(sha256(ALT_V515), ALT_V515_SHA256, 'die Fixture von vor dem Wagen wurde getauscht');
  const { V } = ladeKern();
  await V.depotLaden(umschlagAusDatei(ALT_V515), ALT_V515_PW);
  assert.equal(hatSeed(V), false, 'Öffnen allein legt nichts an');
  assert.ok(Object.keys(V.getData().sektoren || {}).length > 0, 'Positivkontrolle: Inhalt geöffnet');
  const ohne = kopie(await V.depotSerialisieren());
  const O = ladeKern().V;
  await O.depotLaden(kopie(ohne), ALT_V515_PW);
  assert.equal(hatSeed(O), false, 'ohne Bedarf schreibt die Sicherung keinen Seed');

  const seed = b64(V._antwortSeedHolen());
  const mit = kopie(await V.depotSerialisieren());
  const W = ladeKern().V;
  await W.depotLaden(kopie(mit), ALT_V515_PW);
  assert.equal(b64(W._antwortSeedHolen()), seed, 'die Sicherung trägt denselben Seed');
});

test('[Sicherbarkeit·vor dem Wagen] die v515-Datei und das Vorführ-Depot öffnen in der Lese-App; der Kern legt in beiden beim Bedarf einen Seed an', async () => {
  for (const [pfad, pw] of [[ALT_V515, ALT_V515_PW], [ALT_DEMO, ALT_DEMO_PW]]) {
    const { V: L } = ladeLesen();
    const obj = await L.leseDepotUmschlag(umschlagAusDatei(pfad), pw);
    assert.ok(obj && obj.sektoren && Object.keys(obj.sektoren).length > 0, path.basename(pfad) + ': Inhalt in der Lese-App');
    assert.equal(Object.prototype.hasOwnProperty.call(obj, 'antwortSeed'), false, path.basename(pfad) + ': vor dem Wagen ohne Seed');
    const { V } = ladeKern();
    await V.depotLaden(umschlagAusDatei(pfad), pw);
    assert.equal(V._antwortSeedHolen().length, 32, path.basename(pfad));
  }
});

// ── Sicherbarkeit (b): eine Sicherung mit Seed ───────────────────────────────────────────────────

async function lesenUndAnzeigen(umschlag, pw) {
  const { V: L, document } = ladeLesen();
  const obj = await L.leseDepotUmschlag(kopie(umschlag), pw);
  L.setData(obj);
  L.setLeseModus('voll');
  L.renderVollExport();
  return { obj, html: document.getElementById('app').innerHTML };
}

test('[Sicherbarkeit·mit Seed] heutiger Kern und Lese-App öffnen eine Sicherung mit Seed; die Lese-App zeigt ihn nicht', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const seed = b64(V._antwortSeedHolen());
  const wert = seedWert(V.getData(), V);
  const datei = kopie(await V.depotSerialisieren());
  assert.equal(JSON.stringify(Object.keys(datei)).includes('antwortSeed'), false, 'nicht im Klartext-Umschlag');
  assert.equal(JSON.stringify(datei).includes(wert), false, 'der Wert steht nirgends im Klartext der Datei');

  const W = ladeKern().V;
  await W.depotLaden(kopie(datei), PW);
  assert.equal(b64(W._antwortSeedHolen()), seed);

  const { obj, html } = await lesenUndAnzeigen(datei, PW);
  assert.equal(obj.sektoren.health.bloodType, 'A+', 'Positivkontrolle: die Lese-App hat geöffnet');
  assert.ok(html.length > 200, 'Positivkontrolle: die Lese-App hat gezeichnet');
  assert.equal(html.includes(wert), false, 'die Lese-App zeigt den Seed nicht');
  assert.equal(html.includes('antwortSeed'), false, 'die Lese-App nennt das Feld nicht');
});

test('[Sicherbarkeit·Passwortwechsel] der Seed übersteht den Passwortwechsel byte-gleich', async () => {
  const a = dateiAttrappe();
  const { V } = ladeKern(a.opts);
  await depotMitInhalt(V);
  const seed = b64(V._antwortSeedHolen());
  assert.equal(await V.passwortWechselDurchfuehren(PW, PW_NEU), 'gewechselt');
  assert.equal(b64(V._antwortSeedHolen()), seed, 'in der Sitzung derselbe');
  const neu = a.letzte();
  const W = ladeKern().V;
  await W.depotLaden(kopie(neu), PW_NEU);
  assert.equal(b64(W._antwortSeedHolen()), seed, 'in der neuen Datei derselbe');
  await assert.rejects(() => ladeKern().V.depotLaden(kopie(neu), PW), 'Gegenprobe: das alte Passwort öffnet die neue Datei nicht');
  const { obj } = await lesenUndAnzeigen(neu, PW_NEU);
  assert.equal(obj.antwortSeed.wert, seedWert(W.getData(), W), 'die Lese-App liest dieselbe Datei');
});

test('[Sicherbarkeit·Wiederherstellung] der Seed übersteht die Wiederherstellung mit dem Code byte-gleich, auch in der danach geschriebenen Datei', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const seed = b64(V._antwortSeedHolen());
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(PW, code.slice(0, V.WHC_STELLEN));
  const datei = kopie(await V.depotSerialisieren());

  const W = ladeKern().V;
  await W.depotMitCodeLaden(kopie(datei), V.whcCodeGruppiert(code), PW_NEU);
  assert.equal(b64(W._antwortSeedHolen()), seed, 'nach dem Öffnen mit dem Code derselbe');
  const danach = kopie(await W.depotSerialisieren());
  assert.notEqual(danach.pbkdf2.salt, datei.pbkdf2.salt, 'Gegenprobe: wirklich neu verschlüsselt');
  const X = ladeKern().V;
  await X.depotLaden(kopie(danach), PW_NEU);
  assert.equal(b64(X._antwortSeedHolen()), seed, 'in der nach der Wiederherstellung geschriebenen Datei derselbe');
});

// ── Sicherbarkeit (b), eingefroren: eine Datei dieses Wagens, für jeden künftigen Kern ───────────

test('[Sicherbarkeit·eingefroren] die mit dem Wagen erzeugte Datei mit Seed öffnet im heutigen Kern und in der Lese-App mit demselben Seed', async () => {
  assert.ok(fs.existsSync(MIT_SEED), 'Fixture fehlt — erzeugen mit dem Erzeuger im Fixture-Ordner (README daneben)');
  assert.ok(MIT_SEED_SHA256, 'Prüfsumme der Fixture fehlt — der Erzeuger gibt sie aus; hier eintragen');
  assert.equal(sha256(MIT_SEED), MIT_SEED_SHA256, 'die eingefrorene Datei wurde getauscht oder neu erzeugt');
  const umschlag = umschlagAusDatei(MIT_SEED);
  const { V } = ladeKern();
  await V.depotLaden(kopie(umschlag), MIT_SEED_PW);
  assert.equal(hatSeed(V), true, 'die Datei trägt den Seed');
  const wert = seedWert(V.getData(), V);
  const seed = b64(V._antwortSeedHolen());
  const { obj, html } = await lesenUndAnzeigen(umschlag, MIT_SEED_PW);
  assert.equal(obj.antwortSeed.wert, wert, 'die Lese-App liest denselben Seed');
  assert.equal(html.includes(wert), false, 'und zeigt ihn nicht');
  // Und weiter über einen Speichervorgang des heutigen Kerns.
  const W = ladeKern().V;
  await W.depotLaden(kopie(await V.depotSerialisieren()), MIT_SEED_PW);
  assert.equal(b64(W._antwortSeedHolen()), seed);
});

// ── Sicherbarkeit: eine Datei mit Seed im Kern von vor dem Wagen ─────────────────────────────────
/* GERÜST-TEST: nur diese Probe lädt einen Kern roh — den von VOR dem Wagen, so wie er ausgeliefert wurde, als nacktes Gerüst
   (dieselbe Bauart wie die Probe WHC·#3 in tests/wiederherstellungs-code.test.js). Gemessen wird allein der Lese- und Schreibweg
   des Depots; der braucht kein Produkt. Alle übrigen Proben dieser Datei laufen im gebackenen Standard-Produkt (ladeKern()).
   Rückweg: wer eine ältere Fassung behält, öffnet eine neue Sicherung weiter, und deren Speichern verliert den Seed nicht;
   läuft darum nur im privaten Repo (Eintrag in tests/helfer/nur-privat.js, Grund GIT). */
test('[Sicherbarkeit·Kern vor dem Wagen] der Kern von vor dem Wagen öffnet eine Sicherung mit Seed, und seine nächste Sicherung trägt ihn weiter', async () => {
  const { V } = ladeKern();
  await depotMitInhalt(V);
  const seed = b64(V._antwortSeedHolen());
  const datei = kopie(await V.depotSerialisieren());
  const ziel = path.join(os.tmpdir(), 'vivodepot-vor-antwort-seed-' + process.pid + '.html');
  fs.writeFileSync(ziel, execFileSync('git', ['show', KANON_VOR_DEM_WAGEN + ':vivodepot.html'],
    { cwd: path.join(__dirname, '..'), env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 }));
  const zuvor = process.env.KERN_HTML_PATH;
  let zurueck;
  try {
    process.env.KERN_HTML_PATH = ziel;
    delete require.cache[require.resolve('./load-kern.js')];
    const alt = require('./load-kern.js').ladeKern({ blank: true }).V;
    assert.equal(typeof alt._antwortSeedHolen, 'undefined', 'Vorbedingung: der alte Kern kennt den Seed nicht');
    await alt.depotLaden(kopie(datei), PW);
    assert.equal(alt.getData().sektoren.health.bloodType, 'A+');
    zurueck = kopie(await alt.depotSerialisieren());
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(ziel);
  }
  const W = require('./load-kern.js').ladeKern().V;
  await W.depotLaden(kopie(zurueck), PW);
  assert.equal(b64(W._antwortSeedHolen()), seed, 'der Seed hat den alten Kern überstanden');
});
