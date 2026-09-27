'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Pro hat die Struktur von Privat (Entscheidungen 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Rückmeldung zu Pro v718: keine persönlichen Angaben, eine einzige Gruppe „Bereiche" mit
   Ordner-Icons, Sektionen doppelt, „Block n —" im Bürgertext, private Auszüge und „Weitere
   Bereiche" im frischen Produkt. Gemessen an ECHT konfektionierten Produkten, deutsch und englisch:
   - identity steht in Pro (Name, Geburtsdatum), in Themen-Clustern mit sprechenden Icons;
   - ein bestehendes Depot übernimmt pro-identitaet beim Öffnen, nichts wird verworfen;
   - „Weitere Bereiche" nur für selbst eingelassene Templates;
   - Ab-Werk-Logikmodule überleben das Wiederöffnen;
   - private Auszüge nicht in einem Produkt, das ihren Bereich ersetzt;
   - Vorlagen-Felder einer alten pro-en-Datei gehen in die Bereichsfelder auf, mit benanntem Grund,
     wenn die Paarung nicht trägt.
   ════════════════════════════════════════════════════════════════════════════ */
const { after } = require('node:test');
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const ERBSCHEIN_TEXT = fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Pro-Struktur-wie-Privat-2026';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-struktur-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const gebaut = new Map();
/* `mitAlterVorlage`: das Produkt, wie es bis v720 gebaut wurde — mit der Pro-Vorlage. */
function kern(slug, mitAlterVorlage) {
  const schluessel = slug + (mitAlterVorlage ? '-alt' : '');
  if (!gebaut.has(schluessel)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const extra = mitAlterVorlage ? [slug === 'pro-en' ? VP.PRO_VORLAGE_EN_PFAD : VP.PRO_VORLAGE_DE_PFAD] : [];
    const r = konfektionieren({
      ziel: path.join(TMP, schluessel), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: VP.modulDateienFuer(p).concat(extra),
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(schluessel);
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}
async function frisch(slug) {
  const k = kern(slug);
  await k.V.depotAnlegen(PW);
  k.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  return k;
}
async function wiederOeffnen(slug, V) {
  const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  const k = kern(slug);
  await k.V.depotLaden(umschlag, PW);
  k.V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  return k;
}
function seitenleiste(k) {
  k.V.betreteApp();
  k.V.renderSidebar();
  return k.document.getElementById('sidebar').innerHTML;
}

/* ── Navigation und Identität ─────────────────────────────────────────────── */
function strukturVerstoesse(V) {
  const v = [];
  const gruppen = V.bereicheNachCluster();
  if (gruppen.length < 2) v.push('nur ' + gruppen.length + ' Gruppe(n): ' + gruppen.map((g) => g.titel).join(', '));
  if (gruppen.some((g) => g.cluster === 'module')) v.push('Auffangbecken „Bereiche" steht noch');
  const icons = gruppen.flatMap((g) => g.bereiche.map((b) => b.id + ':' + b.icon));
  if (icons.some((x) => x.endsWith(':folder'))) v.push('folder-Icons: ' + icons.filter((x) => x.endsWith(':folder')).join(', '));
  const identity = V.bereicheAlle().find((b) => b.id === 'identity');
  const felder = identity ? identity.sektionen.flatMap((s) => s.felder.map((f) => f.id)) : [];
  for (const f of ['givenName', 'familyName', 'birthDate', 'streetAddress', 'telephone', 'email']) {
    if (felder.indexOf(f) < 0) v.push('identity ohne ' + f);
  }
  if (V.bereicheAlle().some((b) => b.id === 'pro-identitaet')) v.push('pro-identitaet steht noch');
  return v;
}

test('[Pro-Struktur·pro-de] Themen-Cluster, sprechende Icons, identity mit Name und Geburtsdatum', async () => {
  const { V } = await frisch('pro-de');
  const verstoesse = strukturVerstoesse(V);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
  assert.deepEqual(V.bereicheNachCluster().map((g) => g.titel), ['Zur Person', 'Vertretung &amp; Nachfolge', 'Betrieb &amp; Finanzen']);
});

test('[Pro-Struktur·pro-en] Themen-Cluster, sprechende Icons, identity mit Name und Geburtsdatum', async () => {
  const { V } = await frisch('pro-en');
  const verstoesse = strukturVerstoesse(V);
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
  assert.deepEqual(V.bereicheNachCluster().map((g) => g.titel), ['Personal details', 'Representation &amp; succession', 'Operations &amp; finances']);
});

test('[Pro-Struktur·Gegenprobe] privat-de behält seine fünf Cluster', async () => {
  const { V } = await frisch('privat-de');
  assert.equal(V.bereicheNachCluster().length, 5);
  assert.ok(!V.bereicheNachCluster().some((g) => g.cluster === 'module'));
});

/* ── Übernahme pro-identitaet → identity ─────────────────────────────────── */
test('[Pro-Identität·Übernahme] Telefon, E-Mail und Notiz gehen in leere identity-Felder, ein abweichender Wert bleibt, die Mitschrift wird angeglichen', () => {
  const { V } = require(LOAD_KERN).ladeKern();
  const d = {
    sektoren: {
      identity: { telephone: '030 111' },
      'pro-identitaet': { tpl_telefon: '030 999', tpl_e_mail: 'chefin@example.org', notiz: 'Notiz aus Pro' },
    },
    bereicheVerwaist: {},
    bereichsIdentitaeten: { 'pro-identitaet': { label: 'Identität', icon: 'user' } },
    abWerkMitschrift: { bereichsErsatz: { ersetzt: ['identity', 'people'], neu: { 'pro-identitaet': {}, 'pro-x': {} } } },
  };
  V._proIdentitaetUebernehmen(d);
  assert.equal(d.sektoren.identity.telephone, '030 111', 'ein vorhandener Wert wird nie überschrieben');
  assert.equal(d.sektoren.identity.email, 'chefin@example.org');
  assert.equal(d.sektoren.identity.furtherDetails, 'Notiz aus Pro');
  assert.deepEqual(d.sektoren['pro-identitaet'], { tpl_telefon: '030 999' }, 'der abweichende Wert bleibt, wo er war');
  assert.deepEqual(d.abWerkMitschrift.bereichsErsatz.ersetzt, ['people']);
  assert.ok(d.abWerkMitschrift.bereichsErsatz.neu['pro-identitaet'], 'solange Werte übrig sind, bleibt die Definition');
  V._proIdentitaetUebernehmen(d);
  assert.deepEqual(d.sektoren['pro-identitaet'], { tpl_telefon: '030 999' }, 'wiederholbar');
});

test('[Pro-Identität·Übernahme] auch aus bereicheVerwaist; ohne Rest verschwinden Schnappschuss und Definition', () => {
  const { V } = require(LOAD_KERN).ladeKern();
  const d = {
    sektoren: {},
    bereicheVerwaist: { 'pro-identitaet': { tpl_telefon: '030 222' } },
    bereicheVerwaistIdentitaet: { 'pro-identitaet': { label: 'Identität' } },
    abWerkMitschrift: { bereichsErsatz: { ersetzt: ['identity'], neu: { 'pro-identitaet': {} } } },
  };
  V._proIdentitaetUebernehmen(d);
  assert.equal(d.sektoren.identity.telephone, '030 222');
  assert.equal(d.bereicheVerwaist['pro-identitaet'], undefined);
  assert.equal(d.bereicheVerwaistIdentitaet['pro-identitaet'], undefined);
  assert.equal(d.abWerkMitschrift.bereichsErsatz.neu['pro-identitaet'], undefined);
});

test('[Pro-Identität·Notfallmappe] die Pro-Logikmodule lesen Telefon und E-Mail aus identity', () => {
  for (const datei of ['pro-logikmodul-testschablone-de.json', 'pro-logikmodul-testschablone-en.json',
    'pro-logikmodul-testschablone-zwei-de.json', 'pro-logikmodul-testschablone-zwei-en.json']) {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', datei), 'utf8'));
    assert.deepEqual(m.datenSchema.kontakt_telefon, { typ: 'feld', sektor: 'identity', feld: 'telephone' }, datei);
    assert.deepEqual(m.datenSchema.kontakt_email, { typ: 'feld', sektor: 'identity', feld: 'email' }, datei);
  }
});

/* ── „Weitere Bereiche" und Ab-Werk-Logikmodule ───────────────────────────── */
function weitereEintraege(html) {
  return (html.match(/data-modul-verzeichnis="[^"]*"/g) || []).map((x) => x.slice('data-modul-verzeichnis="'.length, -1));
}

/* Seit U2-ADR-427 backt pro-de/pro-en das Notar-Template (id pro-notar-kanzleivertretung) ein — die Testschablone trägt dieselbe Kennung
   und würde als „selbst geladen“ zu Recht abgewiesen (kennung-ab-werk). Für ein SELBST geladenes Template nimmt die Probe darum eine eigene
   Kennung; die alte Kennung dient unten als Gegenprobe (sie ist jetzt ab Werk belegt). */
const EIGENE_SCHABLONE_ID = 'pro-testschablone-selbst-geladen';
function eigeneSchablone() {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pro-logikmodul-testschablone-zwei-de.json'), 'utf8'));
  m.id = EIGENE_SCHABLONE_ID;
  return JSON.stringify(m);
}

test('[Weitere Bereiche] ein frisches Produkt zeigt keine — pro-de, pro-en und privat-de, auch nach dem Wiederöffnen', async () => {
  for (const slug of ['pro-de', 'pro-en', 'privat-de']) {
    const k = await frisch(slug);
    assert.deepEqual(weitereEintraege(seitenleiste(k)), [], slug + ' frisch');
    const w = await wiederOeffnen(slug, k.V);
    assert.deepEqual(weitereEintraege(seitenleiste(w)), [], slug + ' wieder geöffnet');
  }
});

test('[Weitere Bereiche] ein selbst eingelassenes Template erscheint dort, mit Paket-Icon', async () => {
  const k = await frisch('pro-de');
  const r = k.V.modulEinlassen(eigeneSchablone());
  assert.equal(r.angenommen, true, 'Vorbedingung: Einlass angenommen — ' + r.grund);
  const html = seitenleiste(k);
  assert.deepEqual(weitereEintraege(html), [EIGENE_SCHABLONE_ID]);
  assert.match(html, /nav-gruppe-fremd/);
});

test('[Ab-Werk-Logikmodul] pro-de behält seine Notfallmappe nach dem Wiederöffnen', async () => {
  const k = await frisch('pro-de');
  const w = await wiederOeffnen('pro-de', k.V);
  assert.ok(w.V._logikModuleAlle(w.V.getData()).some((m) => m.id === 'pro-geschaeftsfuehrerin-notfallmappe'));
});

/* ── P3: private Auszüge nicht in Pro ────────────────────────────────────── */
/* 21.09.2026 (Template zugang-zum-recht, U2-ADR-427): der Zugangs-Auszug steht nicht mehr im Kern, sondern als Template
   in privat-de/privat-en. Diese Probe hielt bisher „Pro trägt BEIDE Auszüge in der Datei (R1)". Ob Pro den Zugang trägt,
   ist eine OFFENE Produktentscheidung — sie wird hier weder behauptet noch ausgeschlossen. Seit Schema 87 gilt dasselbe für den
   Erbschein: er ist ein Template in privat-de/privat-en, keine Kopie im Depot. R1 („nach dem Umweg über Pro fehlt er in Privat
   für immer") erledigt sich damit: Privat bringt beide Auszüge selbst als Saat mit, die Pro-Datei braucht keine Kopie. */
test('[P3] pro-de zeigt und trägt die privaten Auszüge nicht; privat-de zeigt beide, ohne Kopie im Depot', async () => {
  const pro = await frisch('pro-de');
  const idsPro = (pro.V.getData().logikModule || []).map((m) => m.id);
  assert.ok(!idsPro.some((id) => /erbschein|beratungshilfe/.test(id)), 'keine private Kopie in der Pro-Datei: ' + JSON.stringify(idsPro));
  assert.deepEqual(pro.V.logikModuleAlsKarten().map((k) => k.id).filter((id) => /erbschein|beratungshilfe/.test(id)), []);
  const privat = await frisch('privat-de');
  const idsPrivat = privat.V.logikModuleAlsKarten().map((k) => k.id);
  assert.ok(idsPrivat.includes('erbschein-vorbereitung') && idsPrivat.includes('zugang-zum-recht-beratungshilfe'), JSON.stringify(idsPrivat));
});

/* ── P1: Vorlagen-Felder einer alten pro-en-Datei ────────────────────────── */
async function altePro(slug, werte) {
  const alt = kern(slug, true);
  await alt.V.depotAnlegen(PW);
  const d = alt.V.getData();
  werte(d);
  alt.V.setData(d);
  const umschlag = JSON.parse(JSON.stringify(await alt.V.depotSerialisieren()));
  const neu = kern(slug);
  await neu.V.depotLaden(umschlag, PW);
  return neu.V;
}

test('[P1·pro-en] Werte unter den englischen Vorlagen-Kennungen gehen in die Bereichsfelder, die Definitionen ziehen nach feldDefinitionenUebernommen', async () => {
  const B = 'pro-gesellschaft-nachfolge';
  let text, liste;
  const V = await altePro('pro-en', (d) => {
    const defs = d.feldDefinitionen.filter((x) => x.sektorId === B);
    text = defs.find((x) => x.typ === 'text');
    liste = defs.find((x) => x.typ === 'liste' && !/estate_plan/.test(x.feldId));
    d.sektoren[B] = Object.assign({}, d.sektoren[B] || {}, {
      [text.feldId]: 'Wert unter EN-Kennung',
      [liste.feldId]: [{ id: 'z1', [liste.unterFelder[1].id]: 'Zeilenwert' }],
    });
  });
  const nd = V.getData();
  const bereichFelder = V.bereicheAlle().find((b) => b.id === B).sektionen.flatMap((s) => s.felder);
  const werte = Object.values(nd.sektoren[B]);
  assert.ok(werte.includes('Wert unter EN-Kennung'), JSON.stringify(nd.sektoren[B]));
  assert.equal(nd.sektoren[B][text.feldId], undefined, 'die englische Kennung ist geräumt');
  const zielListe = bereichFelder.find((f) => f.typ === 'liste' && Array.isArray(nd.sektoren[B][f.id]));
  assert.ok(zielListe, 'die Liste steht unter der Bereichs-Kennung');
  assert.equal(nd.sektoren[B][zielListe.id][0][zielListe.unterFelder[1].id], 'Zeilenwert', 'die Unterfelder sind umbenannt');
  assert.ok((nd.feldDefinitionenUebernommen || []).some((x) => x.feldId === text.feldId && x.uebernommenIn), 'nichts gelöscht');
  assert.ok(!(nd.feldDefinitionen || []).some((x) => x.feldId === text.feldId));
});

/* ── B1 (Code-Review 17.09.2026): Zuordnung über die eingefrorene Tabelle, nicht über die Position ── */
const TABELLE = require('../tools/pro-vorlage-en-kennungen.json').zuordnung;

test('[B1·Tausch] zwei gleichartige Felder in getauschter Reihenfolge landen trotzdem jedes in seinem Feld (Rot-Beweis zur Positions-Paarung)', async () => {
  const B = 'pro-vertretung-vollmachten';
  const V = await altePro('pro-en', (d) => {
    const i = d.feldDefinitionen.findIndex((x) => x.sektorId === B && x.feldId === 'tpl_competent_registry_court');
    const k = d.feldDefinitionen.findIndex((x) => x.sektorId === B && x.feldId === 'tpl_register_number');
    assert.ok(i >= 0 && k >= 0, 'Vorbedingung: beide Felder stehen in der alten Datei');
    [d.feldDefinitionen[i], d.feldDefinitionen[k]] = [d.feldDefinitionen[k], d.feldDefinitionen[i]];
    d.sektoren[B] = Object.assign({}, d.sektoren[B] || {}, {
      tpl_competent_registry_court: 'Amtsgericht Charlottenburg',
      tpl_register_number: 'HRB 12345',
    });
  });
  const werte = V.getData().sektoren[B];
  assert.equal(werte.tpl_zustaendiges_registergericht, 'Amtsgericht Charlottenburg');
  assert.equal(werte.tpl_registernummer, 'HRB 12345');
  assert.deepEqual(V.VORLAGEN_UEBERNAHME_BEFUND.filter((b) => b.sektorId === B && b.grund !== 'unterfelder'), []);
});

test('[B1·Unbekannt] eine Kennung, die die Tabelle nicht kennt, wird nicht geraten: Definition und Wert bleiben, der Grund steht im Befund', async () => {
  const B = 'pro-aufbewahrung-ordnung';
  let vorhanden;
  const V = await altePro('pro-en', (d) => {
    vorhanden = d.feldDefinitionen.find((x) => x.sektorId === B && x.typ !== 'liste' && TABELLE[B][x.feldId]);
    d.feldDefinitionen.push({ sektorId: B, feldId: 'tpl_erfundenes_feld', typ: 'text', label: 'Erfunden' });
    d.sektoren[B] = Object.assign({}, d.sektoren[B] || {}, { tpl_erfundenes_feld: 'bleibt stehen', [vorhanden.feldId]: 'geht über' });
  });
  const nd = V.getData();
  assert.ok(V.VORLAGEN_UEBERNAHME_BEFUND.some((b) => b.sektorId === B && b.grund === 'unbekannte-kennung' && b.feldId === 'tpl_erfundenes_feld'), JSON.stringify(V.VORLAGEN_UEBERNAHME_BEFUND));
  assert.equal(nd.sektoren[B].tpl_erfundenes_feld, 'bleibt stehen');
  assert.ok(nd.feldDefinitionen.some((x) => x.sektorId === B && x.feldId === 'tpl_erfundenes_feld'), 'die Definition bleibt');
  assert.equal(nd.sektoren[B][TABELLE[B][vorhanden.feldId].nach], 'geht über', 'die bekannten Felder desselben Bereichs gehen trotzdem über');
});

test('[B1·Typ] weicht der Typ ab, bleibt das Feld stehen und der Grund steht im Befund', async () => {
  const B = 'pro-vertretung-vollmachten';
  const V = await altePro('pro-en', (d) => {
    const def = d.feldDefinitionen.find((x) => x.sektorId === B && x.feldId === 'tpl_register_number');
    def.typ = 'datum';
    d.sektoren[B] = Object.assign({}, d.sektoren[B] || {}, { tpl_register_number: '2026-01-01' });
  });
  assert.ok(V.VORLAGEN_UEBERNAHME_BEFUND.some((b) => b.grund === 'typ' && b.feldId === 'tpl_register_number'), JSON.stringify(V.VORLAGEN_UEBERNAHME_BEFUND));
  assert.equal(V.getData().sektoren[B].tpl_register_number, '2026-01-01');
  assert.equal(V.getData().sektoren[B].tpl_registernummer, undefined);
});

test('[B1·Unterfelder] die vier Listen mit abweichendem Unterfeld-Typ bleiben stehen und sind benannt', async () => {
  const V = await altePro('pro-en', () => {});
  const benannt = V.VORLAGEN_UEBERNAHME_BEFUND.filter((b) => b.grund === 'unterfelder').map((b) => b.feldId).sort();
  assert.deepEqual(benannt, ['tpl_bank_account', 'tpl_estate_plan_coordinated_with_the_company', 'tpl_loan', 'tpl_power_of_attorney_beyond_death']);
});

test('[B1·Tabelle] jede Kennung der ausgelieferten EN-Vorlage steht in der Tabelle, und jedes Ziel gibt es im Bereich', () => {
  const { V } = kern('pro-en');
  V.setData(V.leeresDepot());
  const vorlage = JSON.parse(fs.readFileSync(VP.PRO_VORLAGE_EN_PFAD, 'utf8'));
  const defs = V._templateFelderUebersetzen(vorlage).feldDefinitionen;
  const bereiche = new Map(V.bereicheAlle().map((b) => [b.id, new Set(b.sektionen.flatMap((x) => x.felder.map((f) => f.id)))]));
  const fehlt = defs.filter((d) => !(TABELLE[d.sektorId] && TABELLE[d.sektorId][d.feldId])).map((d) => d.sektorId + '/' + d.feldId);
  assert.deepEqual(fehlt, []);
  const ohneZiel = Object.entries(TABELLE).flatMap(([s, f]) => Object.values(f).filter((e) => !(bereiche.get(s) || new Set()).has(e.nach)).map((e) => s + '/' + e.nach));
  assert.deepEqual(ohneZiel, []);
  assert.equal(defs.length, 54);
});

test('[B1·Tabelle] die Tabelle ist frisch aus ihren Quellen erzeugt und reist in der eingebackenen Region mit', () => {
  const { zuordnungErzeugen } = require('../tools/pro-vorlage-en-kennungen-erzeugen.js');
  assert.equal(JSON.stringify(zuordnungErzeugen(), null, 2) + '\n', fs.readFileSync(path.join(__dirname, '..', 'tools', 'pro-vorlage-en-kennungen.json'), 'utf8'));
  const bekannt = JSON.parse(fs.readFileSync(VP.BEREICHE_BEKANNT_PFAD, 'utf8'));
  assert.deepEqual(bekannt.vorlagenKennungen.zuordnung, TABELLE);
  const { V } = kern('privat-en');
  assert.deepEqual(V.AB_WERK_BEREICHE_BEKANNT.vorlagenKennungen.zuordnung, TABELLE, 'auch Privat übernimmt eine alte pro-en-Datei gleich');
});

/* ── B2 und B3 (Code-Review 17.09.2026): das Merkmal abWerk kommt nicht aus der Datei ── */
test('[B2] eine Datei kann das Merkmal abWerk weder entfernen noch einem selbst geladenen Modul anheften', async () => {
  const k = await frisch('pro-de');
  const d = k.V.getData();
  // Ein eingebackenes Modul des Produkts (das Notar-Template) liegt als Kopie im Depot, ohne Marke.
  const notar = JSON.parse(JSON.stringify(k.V._logikModuleAlle(d).find((m) => m.id === 'pro-notar-kanzleivertretung')));
  delete notar.abWerk;
  d.logikModule = (d.logikModule || []).concat([notar]);
  const r = k.V.modulEinlassen(eigeneSchablone());
  assert.equal(r.angenommen, true, r.grund);
  for (const m of k.V.getData().logikModule) if (m.id === EIGENE_SCHABLONE_ID) m.abWerk = true;
  const w = await wiederOeffnen('pro-de', k.V);
  const nach = new Map(w.V.getData().logikModule.map((m) => [m.id, m]));
  assert.equal(nach.get('pro-notar-kanzleivertretung').abWerk, true, 'entfernt in der Datei, gesetzt beim Laden');
  assert.equal(nach.get(EIGENE_SCHABLONE_ID).abWerk, undefined, 'angeheftet in der Datei, entfernt beim Laden');
  assert.deepEqual(weitereEintraege(seitenleiste(w)), [EIGENE_SCHABLONE_ID]);
});

test('[B3] ein selbst eingelassenes Logikmodul mit der Kennung eines ab Werk eingebackenen wird benannt abgewiesen', async () => {
  // Nur privat-de trägt den Erbschein als eingebackenes Template; in pro-de ist die Kennung nicht ab Werk (Pro trägt ihn nicht).
  for (const slug of ['privat-de']) {
    const k = await frisch(slug);
    const d = k.V.getData();
    const vorher = (d.logikModule || []).length;
    const eigen = JSON.parse(ERBSCHEIN_TEXT);
    eigen.titel = 'Eigenes Modul mit fremder Kennung';
    eigen.herkunft = 'probe-eigen';
    const r = k.V.modulEinlassen(JSON.stringify(eigen));
    assert.equal(r.angenommen, false, slug);
    assert.equal(r.grund, 'kennung-ab-werk', slug);
    assert.equal((k.V.getData().logikModule || []).length, vorher, slug + ': nichts dazugekommen');
    assert.equal((k.V.getData().logikModule || []).filter((m) => m.id === 'erbschein-vorbereitung').length, 0, slug + ': keine Kopie im Depot, das Modul steht als Saat des Produkts da');
  }
  const pro = await frisch('pro-de');
  const fremd = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pro-logikmodul-testschablone-de.json'), 'utf8'));
  fremd.titel = 'Fremde Fassung';
  assert.equal(pro.V.modulEinlassen(JSON.stringify(fremd)).grund, 'kennung-ab-werk', 'auch das eingebackene Pro-Logikmodul');
});

test('[Notar-Template ab Werk] pro-de und pro-en tragen das Notar-Template eingebacken (ab Werk); dieselbe Kennung selbst geladen wird abgewiesen (U2-ADR-427)', async () => {
  for (const slug of ['pro-de', 'pro-en']) {
    const k = await frisch(slug);
    const notar = k.V._logikModuleAlle(k.V.getData()).find((m) => m.id === 'pro-notar-kanzleivertretung');
    assert.ok(notar, slug + ': das Notar-Template fehlt im Produkt');
    assert.deepEqual(weitereEintraege(seitenleiste(k)), [], slug + ': erscheint nicht unter „Weitere Bereiche“');
  }
  const pro = await frisch('pro-de');
  const eigen = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pro-logikmodul-testschablone-zwei-de.json'), 'utf8'));
  assert.equal(pro.V.modulEinlassen(JSON.stringify(eigen)).grund, 'kennung-ab-werk');
  const privat = await frisch('privat-de');
  assert.ok(!privat.V._logikModuleAlle(privat.V.getData()).some((m) => m.id === 'pro-notar-kanzleivertretung'), 'privat trägt das Pro-Template nicht');
});

test('[B3·Gegenprobe] Vivodepots eigenes Modul, Zeichen für Zeichen gleich, bleibt einlassbar und steht danach einmal da', async () => {
  const k = await frisch('privat-de');
  const d = k.V.getData();
  d.logikModule = (d.logikModule || []).filter((m) => m.id !== 'erbschein-vorbereitung');
  const r = k.V.modulEinlassen(ERBSCHEIN_TEXT);
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(k.V.getData().logikModule.filter((m) => m.id === 'erbschein-vorbereitung').length, 1);
});

test('[P1·pro-de] ein frisches Pro-Produkt schreibt keine Vorlagen-Felder mehr', async () => {
  for (const slug of ['pro-de', 'pro-en']) {
    const { V } = await frisch(slug);
    assert.deepEqual((V.getData().feldDefinitionen || []).filter((x) => /^pro-/.test(x.sektorId)).length, 0, slug);
  }
});

/* ── Situationsblätter und Hinweise nach dem Identitäts-Umbau ────────────── */
test('[Situationsblatt] Pro zeigt keine Bereichs-Kennung in Klammern, wenn der Heimat-Bereich ersetzt ist; Privat zeigt den Bereichsnamen', async () => {
  for (const slug of ['pro-de', 'pro-en']) {
    const k = await frisch(slug);
    k.V.betreteApp();
    k.V.renderSituation('krankenhaus');
    const html = k.document.getElementById('content').innerHTML;
    assert.ok(html.length > 0, slug + ': das Blatt ist gerendert');
    assert.doesNotMatch(html, /\((advanceCare|health|people|personal|finance)\)/, slug);
  }
  const p = await frisch('privat-de');
  p.V.betreteApp();
  p.V.renderSituation('krankenhaus');
  const html = p.document.getElementById('content').innerHTML;
  assert.match(html, /quelle-tag">\(Vorsorge/, 'Gegenprobe: in Privat steht der Bereichsname');
});

test('[Hinweis] der Name-und-Geburtsdatum-Hinweis nennt in Pro einen Bereich, den es gibt, mit Geburtsdatum', async () => {
  for (const slug of ['pro-de', 'pro-en']) {
    const { V } = await frisch(slug);
    const identity = V.bereicheAlle().find((b) => b.id === 'identity');
    assert.ok(identity, slug + ': identity steht im Katalog');
    assert.ok(V.STRINGS.identitaetKernFehltHinweis.includes(identity.label), slug + ': ' + identity.label);
    assert.ok(identity.sektionen.some((x) => x.felder.some((f) => f.id === 'birthDate')), slug + ': Geburtsdatum');
  }
});

module.exports = {
  PROBEN: [
    { fuer: '[Pro-Struktur·pro-de] Themen-Cluster, sprechende Icons, identity mit Name und Geburtsdatum', diskriminante: strukturVerstoesse },
    { fuer: '[Pro-Struktur·pro-en] Themen-Cluster, sprechende Icons, identity mit Name und Geburtsdatum', diskriminante: strukturVerstoesse },
  ],
};
