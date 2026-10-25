'use strict';
/* Studio W3: die Bürgerin kommt über eine Anfrage an. Abnahme (Durchgang von außen, b01–b13):
   (1) Der erste Bildschirm nennt die Stelle, den Zweck und die Angaben mit Namen; keine nackte Zahl; alles als Text.
   (2) Auf dem Anfrage-Weg öffnen nach dem Anlegen weder Wiederherstellungs-Code noch Notfall-Blatt; auf den anderen Wegen beide
       unverändert. Keine Fortsetzung hält das Passwort.
   (3) Das Passwort-Fenster sagt, dass die Stelle das Passwort getrennt gegeben hat und es nicht das Depot-Passwort ist.
   (4) Der Endbildschirm nennt: noch nicht bei der Stelle, Datei und Ziel, die Bereiche im Depot, „Depot absichern“. Er kommt erst
       nach dem Schreiben der (signierten, verschlüsselten) Datei und kennt kein Passwort.
   (5) Ein Depot aus einer Anfrage ohne Code bekommt das Angebot beim nächsten Öffnen genau einmal; ohne Drängen.
   (6) Der Wiederherstellungs-Code: nur Darstellung und Aufrufstelle sind berührt. Er geht nicht in Logs, nicht ohne Klick in die
       Zwischenablage, und nach dem Schließen bleibt kein Knoten mit dem Code (mit Rot-Beweis an einer Kopie des Kerns).
   (7) Depot-Format: die zwei Marken am Anfrage-Eintrag sind optional; eine Datei ohne sie öffnet unverändert.
   Die Texte stehen in beiden Textsätzen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const W = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(W, 'vivodepot.html'), 'utf8');
const DE = JSON.parse(fs.readFileSync(path.join(W, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const EN = JSON.parse(fs.readFileSync(path.join(W, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
const rumpf = (name) => { const a = KERN.indexOf(name); return KERN.slice(a, KERN.indexOf('\n}\n', a) + 2); };

const NEU = ['anfrageAnkunftTitel', 'anfrageAnkunftAngaben', 'anfrageAnkunftText', 'anfrageAnkunftWeiter', 'antwortPasswortGetrennt',
  'anfrageEndeNichtDa', 'anfrageEndeSchicken', 'anfrageEndeSchickenOhneAn', 'anfrageEndeDepot', 'anfrageEndeAbsichern', 'anfrageEndeFertig',
  'anfrageAbsichernNachholenText', 'anfrageAbsichernNichtJetzt'];
// Diskriminante: die neuen Texte, die in einem Textsatz fehlen oder andere Platzhalter tragen.
function textVerstoesse(de, en) {
  const v = [];
  for (const k of NEU) {
    const d = de['strings:' + k + '.text'], e = en['strings:' + k + '.text'];
    if (!(d && e)) { v.push(k + ': fehlt ' + (d ? 'englisch' : 'deutsch')); continue; }
    const pd = (d.match(/\{[a-z]+\}/g) || []).sort(), pe = (e.match(/\{[a-z]+\}/g) || []).sort();
    if (JSON.stringify(pd) !== JSON.stringify(pe)) v.push(k + ': Platzhalter ' + pd.join(',') + ' gegen ' + pe.join(','));
  }
  return v;
}
test('[W3 · Texte] jeder neue Text steht deutsch und englisch, mit denselben Platzhaltern', () => {
  assert.deepEqual(textVerstoesse(DE, EN), []);
});
test('[W3 · Texte] keine Drängel- und Fortschrittssprache im nachgeholten Angebot', () => {
  for (const t of [DE['strings:anfrageAbsichernNachholenText.text'], EN['strings:anfrageAbsichernNachholenText.text']]) {
    assert.doesNotMatch(t, /\b(jetzt sofort|dringend|unbedingt|müssen|sollten|von \d|\d+ ?%|urgent|must|should|immediately)\b/i);
  }
});

/* ── (1) Ankunft ────────────────────────────────────────────────────────── */
test('[W3 · Ankunft] der erste Bildschirm nennt Stelle, Zweck und die Angaben mit Namen, als Text', () => {
  const f = rumpf('async function flowAnfrageEinstieg(');
  assert.match(f, /titel: STRINGS\.anfrageAnkunftTitel\.replace\('\{von\}', von\)/);
  assert.match(f, /escapeHTML\(String\(schritte\.anfrage\.zweck/);
  assert.match(f, /<ul id="anfrage-einstieg-angaben"><li>' \+ escapeHTML\(angaben\)\.replace\(\/\\n\/g, '<\/li><li>'\) \+ '<\/li><\/ul>'/, 'erst maskiert, dann Listenpunkte');
  assert.match(f, /const angaben = schritte\.schritte\.map\(\(x\) => String\(x\.label \|\| x\.kennung\)/, 'Namen der Angaben, keine Zahl');
  assert.doesNotMatch(f, /anfrage-einstieg-zahl/, 'keine nackte Zahl mehr');
  assert.match(f, /flowDepotAnlegen\(\(\) => weiter\(true\), 'anfrage'\)/);
});

/* ── (2) Die Dialoge nach dem Anlegen ───────────────────────────────────── */
test('[W3 · Anlegen] auf dem Anfrage-Weg kein Code- und kein Notfall-Dialog; sonst beide; das Passwort wird nicht gehalten', () => {
  const f = rumpf('function flowDepotAnlegen(');
  const zweig = /if \(grund === 'anfrage'\) \{ ([^\n]*) return; \}\n/.exec(f);
  assert.ok(zweig, 'der Anfrage-Weg zweigt ab');
  assert.match(zweig[1], /^pw = null;/, 'Anfrage-Weg: die Referenz fällt zuerst');
  assert.doesNotMatch(zweig[1], /wiederherstellungAnbieten|notfallblattAnbieten|fortsetzen\b/, 'Anfrage-Weg: keiner der beiden Dialoge');
  const ohne = /const ohneAngebot = (\(\) => \{[^\n]*\});/.exec(f);
  assert.ok(ohne && /pw = null;/.test(ohne[1]) && !/const p = pw|wiederherstellungAnbieten/.test(ohne[1]), 'die Fortsetzung des Anfrage-Wegs reicht das Passwort nicht weiter');
  assert.ok(f.indexOf(zweig[0]) < f.indexOf('if (webkitTabMitFrist()) _dateiNachAnlegenAnbieten(fortsetzen); else fortsetzen();'), 'der Zweig steht vor dem allgemeinen Weg');
  assert.match(f, /const fortsetzen = \(\) => \{ if \(fortgesetzt\) return; fortgesetzt = true; const p = pw; pw = null; wiederherstellungAnbieten\(p, notfallblattAnbieten\); \};/, 'andere Wege: unverändert');
});
test('[W3 · Anlegen · Rot-Beweis] fehlt der Zweig oder reicht er das Passwort weiter, fällt die Prüfung', () => {
  const f = rumpf('function flowDepotAnlegen(');
  const zweigRe = /if \(grund === 'anfrage'\) \{ ([^\n]*) return; \}\n/;
  assert.equal(zweigRe.exec(f.replace(zweigRe, '')), null, 'ohne Zweig liefe der Anfrage-Weg in die Dialoge');
  const weitergereicht = f.replace(zweigRe, "if (grund === 'anfrage') { fortsetzen(); return; }\n");
  assert.match(zweigRe.exec(weitergereicht)[1], /fortsetzen\b/, 'ein Zweig, der die allgemeine Fortsetzung ruft, wird erkannt');
});
// Diskriminante: die Funktionen des Anfrage-Wegs, deren Rumpf ein Passwort entgegennimmt oder hält.
function passwortHalter() {
  return ['async function flowAnfrageEinstieg(', 'function anfrageEndeModell(', 'function anfrageEndeZeigen(', 'function _anfrageAbsichernNachholen(']
    .filter((n) => /\bpw\b|passwort\s*[=:]|whcCodeZeigen\((?!undefined)/.test(rumpf(n)));
}
test('[W3 · Anlegen · Klasse] keine Funktion des Anfrage-Wegs nimmt ein Passwort entgegen oder hält es', () => {
  assert.deepEqual(passwortHalter(), []);
});
/* Die Klasse, nicht nur die vier Funktionen: das Depot-Passwort reicht nur der Anlege-Weg selbst an den Code weiter
   (wiederherstellungAnbieten und sein Ablehnen-Schritt). Jede andere Aufrufstelle von whcCodeZeigen übergibt keines, und keine
   Funktion mit „anfrage“ im Namen ruft das Angebot mit Passwort oder greift auf die Anlege-Referenz zu. */
const PW_ERLAUBT = new Set(['wiederherstellungAnbieten', '_whcAblehnenFragen']);
function umschliessendeFunktion(src, i) {
  const re = /\n(?:async )?function ([A-Za-z0-9_$]+)\(/g;
  let name = null, m;
  while ((m = re.exec(src)) && m.index < i) name = m[1];
  return name;
}
function klassenVerstoesse(src) {
  const v = [];
  const ruf = /whcCodeZeigen\(([^,)]*)/g;
  let m;
  while ((m = ruf.exec(src))) {
    const arg = m[1].trim();
    const fn = umschliessendeFunktion(src, m.index);
    if (fn === 'whcCodeZeigen') continue;   // die Definition selbst
    if (arg && arg !== 'undefined' && arg !== 'null' && !PW_ERLAUBT.has(fn)) v.push(fn + ': whcCodeZeigen(' + arg + ')');
  }
  const def = /\n(?:async )?function ([A-Za-z0-9_$]*[Aa]nfrage[A-Za-z0-9_$]*)\(/g;
  while ((m = def.exec(src))) {
    const ende = src.indexOf('\n}\n', m.index);
    const r = src.slice(m.index, ende < 0 ? undefined : ende);
    if (/\bpwFuerCode\b|wiederherstellungAnbieten\(|whcCodeZeigen\((?!undefined|null)/.test(r)) v.push(m[1]);
  }
  return v;
}
test('[W3 · Anlegen · Klasse] kein Anfrage-Weg hält ein Passwort: nur der Anlege-Weg reicht es an den Code weiter', () => {
  assert.deepEqual(klassenVerstoesse(KERN), []);
  // Vorbedingung, damit die Leere etwas bedeutet: die erlaubten Stellen und die neuen Aufrufer werden gefunden.
  assert.ok((KERN.match(/whcCodeZeigen\(passwort, weiter\)/g) || []).length >= 2, 'der Anlege-Weg reicht das Passwort weiter');
  assert.ok((KERN.match(/whcCodeZeigen\(undefined, /g) || []).length >= 2, 'Endbildschirm und Nachholen fragen neu ab');
});
test('[W3 · Anlegen · Klasse · Rot-Beweis] eine Anfrage-Funktion, die ein Passwort an den Code reicht, wird gemeldet', () => {
  const a = 'whcCodeZeigen(undefined, () => { try { notfallblattAnbieten(); } catch (_) {} });';
  assert.ok(KERN.includes(a));
  const kaputt = KERN.replace(a, 'whcCodeZeigen(pw, () => {});');
  assert.deepEqual(klassenVerstoesse(kaputt), ['anfrageEndeZeigen: whcCodeZeigen(pw)', 'anfrageEndeZeigen']);
});

/* ── (3) Passwort-Fenster ───────────────────────────────────────────────── */
test('[W3 · Passwort] das Fenster sagt, woher das Passwort kommt', () => {
  assert.match(rumpf('function _anfrageAntwortAusgeben('), /id="antwort-pw-getrennt">' \+ escapeHTML\(STRINGS\.antwortPasswortGetrennt\.replace\('\{von\}'/);
  assert.match(DE['strings:antwortPasswortGetrennt.text'], /getrennt gegeben.*nicht Ihr Depot-Passwort/);
});

/* ── (4) Endbildschirm ──────────────────────────────────────────────────── */
test('[W3 · Ende] der Endbildschirm nennt: noch nicht bei der Stelle, Datei und Ziel, die Bereiche, „Depot absichern“', () => {
  const { V } = ladeKern();
  const eintrag = { von: 'Bürgerservice Beispiel', anfrage: { von: 'Bürgerservice Beispiel', antwort: { art: 'einmalpasswort', an: 'termine@beispiel.example' },
    felder: [{ kennung: 'identity.familyName', zweck: 'x', pflicht: true }] } };
  // Der Datensatz der Antwort nennt je Angabe ihren Bereich; der Endbildschirm löst keine Kennung selbst auf.
  const bereich = V.kennungZuSelektor('identity.familyName').sektorId;
  const bereichName = V._sektorAusKatalog(bereich).label;
  assert.ok(bereichName && bereichName !== bereich, 'Vorbedingung: der Bereich hat einen Namen im Katalog');
  const ds = { felder: [{ kennung: 'identity.familyName', bereich, feld: 'a' }, { kennung: 'identity.givenName', bereich, feld: 'b' }] };
  const m = V.anfrageEndeModell(eintrag, 'Antwort_A-1.jwe', ds);
  assert.match(m.nichtDa, /Bürgerservice Beispiel/);
  assert.match(m.schicken, /Antwort_A-1\.jwe/); assert.match(m.schicken, /termine@beispiel\.example/);
  assert.ok(m.depot.includes(bereichName), 'der Bereich wird mit seinem Namen genannt');
  assert.equal(m.depot.split(bereichName).length - 1, 1, 'ein Bereich wird einmal genannt, auch bei zwei Angaben daraus');
  assert.equal(V.anfrageEndeModell(eintrag, 'Antwort_A-1.jwe', { felder: [] }).depot, '', 'Gegenprobe: ging nichts hinaus, wird kein Bereich behauptet');
  assert.equal(V.anfrageEndeModell(eintrag, 'Antwort_A-1.jwe').depot, '', 'ohne Datensatz ebenso');
  assert.doesNotMatch(rumpf('function anfrageEndeModell('), /kennungZuSelektor|SEKTOR_BY_ID|\ba\.felder\b/, 'keine eigene Auflösung, kein Griff in den Anzeige-Index');
  assert.equal(m.absichern, true, 'ohne Code wird „Depot absichern“ angeboten');
  assert.match(rumpf('function _anfrageAntwortSchreiben('), /anfrageEndeZeigen\(eintrag, name, ds\);/);
  assert.doesNotMatch(rumpf('function _anfrageAntwortSchreiben('), /ui\.toast\(STRINGS\.anfrageAntwortFertig/);
});

/* ── (5) Beim nächsten Öffnen, genau einmal ─────────────────────────────── */
test('[W3 · Nachholen] ein Depot aus einer Anfrage ohne Code bekommt das Angebot genau einmal; andere Einträge nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('w3-probe-passwort');
  const d = V.getData();
  d.anfragen = [{ id: 'a', vorgang: 'A-0' }, { id: 'b', vorgang: 'A-1', einstiegDepot: true }];
  V._anfrageAbsichernNachholen();
  assert.equal(d.anfragen[1].absichernNachgeholt, true, 'beim ersten Öffnen gemerkt');
  assert.equal(d.anfragen[0].absichernNachgeholt, undefined, 'ein Eintrag ohne Einstieg bleibt unberührt');
  assert.equal(V._anfrageAbsichernNachholen(), false, 'beim zweiten Öffnen nicht noch einmal');
});
test('[W3 · Nachholen] der Haken sitzt an beiden Wegen des Öffnens', () => {
  assert.equal((KERN.match(/ui\.toast\(STRINGS\.geoeffnet, 'ok'\); _anfrageAbsichernNachholen\(\);/g) || []).length, 2);
});
test('[W3 · Nachholen] die Marken überleben Schließen und Öffnen: vor dem Zeigen bleibt das Angebot fällig, danach kommt es nicht wieder', async () => {
  const { V } = ladeKern();
  const PW = 'w3-rundlauf-passwort';
  await V.depotAnlegen(PW);
  V.getData().anfragen = [{ id: 'b', vorgang: 'A-1', einstiegDepot: true }];
  // Erstes Schließen und Öffnen, bevor das Angebot gezeigt wurde: die Einstiegs-Marke ist mitgespeichert.
  await V.depotLaden(await V.depotSerialisieren(), PW);
  assert.equal(V.getData().anfragen[0].einstiegDepot, true, 'die Einstiegs-Marke geht nicht verloren');
  assert.notEqual(V.getData().anfragen[0].absichernNachgeholt, true, 'noch nicht gezeigt');
  V._anfrageAbsichernNachholen();
  // Zweites Schließen und Öffnen: die Marke „gezeigt“ ist mitgespeichert, das Angebot kommt nicht wieder.
  await V.depotLaden(await V.depotSerialisieren(), PW);
  assert.equal(V.getData().anfragen[0].absichernNachgeholt, true, 'die Marke „gezeigt“ überlebt den Rundlauf');
  assert.equal(V._anfrageAbsichernNachholen(), false, 'beim übernächsten Öffnen nicht noch einmal');
});
test('[W3 · Nachholen] die Marke „gezeigt“ zählt als Änderung, damit sie gespeichert wird (intern still, als Datei mit der üblichen Frage beim Schließen)', () => {
  assert.match(rumpf('function _anfrageAbsichernNachholen('), /e\.absichernNachgeholt = true;\n\s+markiereUngespeichert\(1\);/);
});

/* ── (4b) Endbildschirm und Antwort-Signierung ──────────────────────────── */
test('[W3 · Ende · Signierung] der Endbildschirm kommt erst nach Signieren, Verschlüsseln und Schreiben, einmal, ohne Passwort', () => {
  const r = rumpf('function _anfrageAntwortSchreiben(');
  const i = (s) => { const k = r.indexOf(s); assert.ok(k >= 0, s); return k; };
  // Der Zweig ohne Ed25519 ruft sich selbst wieder auf; der Endbildschirm steht nur am einen Ende des Wegs.
  assert.equal(r.split('anfrageEndeZeigen(').length - 1, 1, 'genau eine Aufrufstelle');
  assert.ok(i('ed25519Verfuegbar()') < i('antwortVerschluesseln(') && i('antwortVerschluesseln(') < i('dateiAusgeben(blob, name')
    && i('dateiAusgeben(blob, name') < i("weg !== 'abgebrochen' && weg !== 'vorschau'")
    && i("weg !== 'abgebrochen' && weg !== 'vorschau'") < i('anfrageEndeZeigen(eintrag, name, ds)'), 'Reihenfolge');
  assert.doesNotMatch(r, /anfrageEndeZeigen\([^)]*\b(o|opt|passwort|pw)\b/, 'der Endbildschirm bekommt weder Optionen noch Passwort');
});

/* ── (6) Wiederherstellungs-Code: Darstellung und Aufrufstelle ──────────── */
/* Die Test-DOM ist eine Attrappe: innerHTML ist ein String, der nicht geparst wird. Geprüft wird darum auf Zeichenebene, was im
   Inhalt des Dialogs steht, solange er offen ist, und was nach dem Schließen übrig bleibt. */
const CODE_RE = /id="whc-code"[^>]*>([^<]+)</;
async function kernMitDepot(htmlPfad) {
  const k = ladeKern(htmlPfad ? { htmlPfad, backen: true } : {});
  await k.V.depotAnlegen('w3-code-probe-passwort');
  return k;
}
function codeOffenUndNachSchliessen(k, oeffnen) {
  const box = k.document.getElementById('modal-inhalt');
  const toasts = k.document.getElementById('toast-host');
  const log = [];
  const alt = {};
  for (const n of ['log', 'info', 'warn', 'error', 'debug']) { alt[n] = console[n]; console[n] = (...a) => { log.push(a.map(String).join(' ')); }; }
  try {
    oeffnen();
    const m = CODE_RE.exec(box.innerHTML);
    assert.ok(m, 'der Dialog zeigt einen Code');
    const code = m[1].trim(), kompakt = code.replace(/\s+/g, '');
    assert.ok(kompakt.length >= 8, 'Vorbedingung: ein echter Code');
    k.document.getElementById('m-abbr').onclick();
    const rest = [box.innerHTML, toasts ? toasts.innerHTML : ''].join('\n');
    return { code, kompakt, rest, log };
  } finally { for (const n of Object.keys(alt)) console[n] = alt[n]; }
}
const enthaeltCode = (x, s) => s.includes(x.code) || s.replace(/\s+/g, '').includes(x.kompakt);
test('[W3 · Code] nach dem Schließen bleibt kein Knoten mit dem Code; er ging in kein Log', async () => {
  const k = await kernMitDepot();
  let danach = 0;
  const x = codeOffenUndNachSchliessen(k, () => k.V.whcCodeZeigen(undefined, () => { danach++; }));
  assert.equal(enthaeltCode(x, x.rest), false, 'nach dem Schließen steht der Code nirgends mehr');
  assert.equal(x.log.some((z) => enthaeltCode(x, z)), false, 'keine Konsolenzeile trägt den Code');
  assert.equal(danach, 1, 'die Fortsetzung läuft beim Abbrechen');
});
test('[W3 · Code] derselbe Befund auf dem Weg der Aufrufstelle: Nachholen beim Öffnen → „Einrichten“ → Code → Schließen', async () => {
  const k = await kernMitDepot();
  k.V.getData().anfragen = [{ id: 'b', vorgang: 'A-1', einstiegDepot: true }];
  const x = codeOffenUndNachSchliessen(k, () => {
    assert.equal(k.V._anfrageAbsichernNachholen(), true);
    assert.match(k.document.getElementById('modal-inhalt').innerHTML, /id="anfrage-absichern-nachholen"/, 'erst das Angebot, noch kein Code');
    assert.doesNotMatch(k.document.getElementById('modal-inhalt').innerHTML, CODE_RE);
    k.document.getElementById('m-ok').onclick();   // „Einrichten“: das Angebot schließt, der Code-Dialog öffnet
  });
  assert.equal(enthaeltCode(x, x.rest), false);
  assert.equal(x.log.some((z) => enthaeltCode(x, z)), false);
});
test('[W3 · Code · Rot-Beweis] leert das Schließen den Dialog nicht, bleibt der Code stehen, und die Probe sieht ihn', async () => {
  const html = fs.readFileSync(path.join(W, 'vivodepot.html'), 'utf8');
  const alt = "host.classList.remove('an'); box.innerHTML = '';";
  assert.equal(html.split(alt).length - 1, 1, 'Vorbedingung: das Schließen leert den Inhalt an genau einer Stelle');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anfrage-ankunft-w3-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, html.replace(alt, () => "host.classList.remove('an');"));
    const k = await kernMitDepot(p);
    const x = codeOffenUndNachSchliessen(k, () => k.V.whcCodeZeigen(undefined, () => {}));
    assert.equal(enthaeltCode(x, x.rest), true, 'ohne das Leeren stünde der Code nach dem Schließen noch im Dialog');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('[W3 · Code] whcCodeZeigen schreibt den Code nur in den Dialog: keine Konsole, keine Zwischenablage, kein Speicher', () => {
  const r = rumpf('function whcCodeZeigen(');
  assert.doesNotMatch(r, /console\.|clipboard|execCommand|localStorage|sessionStorage|indexedDB|\bdata\.[A-Za-z_]+\s*=/);
  // Der Code steht genau einmal im Markup, im Dialog-Inhalt; die übrigen Vorkommen sind Vergleich und Hinweis.
  assert.equal((r.match(/whcCodeGruppiert\(code\)/g) || []).length, 1);
  // Das Code-Blatt (Klick auf „Blatt“) bekommt den Code nicht.
  assert.match(r, /bl\.onclick = \(\) => _codeblattOeffnen\(\);/);
  assert.match(rumpf('function _codeblattOeffnen('), /codeblattHTML\(\)/);
});

/* ── (7) Depot-Format: die zwei Marken sind optional ────────────────────── */
test('[W3 · Depot-Format] eine Datei ohne die Marken öffnet unverändert und bekommt kein Angebot', async () => {
  const { V } = ladeKern();
  const PW = 'w3-altdatei-passwort';
  await V.depotAnlegen(PW);
  // Ein Anfrage-Eintrag, wie ihn eine Fassung vor Studio W3 schreibt: ohne einstiegDepot und ohne absichernNachgeholt.
  const alt = [{ id: 'q1', vorgang: 'A-7', von: 'Bürgerservice Beispiel', anbieterId: null, zweck: 'Termin', empfangenAm: '2026-10-01T09:00:00.000Z',
    beantwortetAm: null, geprueft: false, anfrage: { von: 'Bürgerservice Beispiel', vorgang: 'A-7', zweck: 'Termin', felder: [{ kennung: 'identity.familyName' }] } }];
  V.getData().anfragen = JSON.parse(JSON.stringify(alt));
  await V.depotLaden(await V.depotSerialisieren(), PW);
  const nachher = JSON.parse(JSON.stringify(V.getData().anfragen));
  assert.equal(nachher.length, 1);
  for (const k of Object.keys(alt[0])) assert.deepEqual(nachher[0][k], alt[0][k], k);
  assert.equal('einstiegDepot' in nachher[0] || 'absichernNachgeholt' in nachher[0], false, 'das Öffnen erfindet keine Marke');
  assert.equal(V._anfrageAbsichernNachholen(), false, 'ohne Marke kein Angebot');
  assert.deepEqual(JSON.parse(JSON.stringify(V.getData().anfragen)), nachher, 'und der Eintrag bleibt, wie er war');
});

/* ── (8) Beide Antwort-Wege: Schlüsselpaar (Hauptweg) und Einmalpasswort ── */
test('[W3 · Ende · beide Wege] der Endbildschirm ist für Schlüsselpaar und Einmalpasswort gleich und nennt kein Passwort', () => {
  const { V } = ladeKern();
  const bereich = V.kennungZuSelektor('identity.familyName').sektorId;
  const ds = { felder: [{ kennung: 'identity.familyName', bereich, feld: 'a' }] };
  const eintragMit = (antwort) => ({ von: 'Bürgerservice Beispiel', anfrage: { von: 'Bürgerservice Beispiel', vorgang: 'A-1', antwort,
    felder: [{ kennung: 'identity.familyName', zweck: 'x', pflicht: true }] } });
  const PW = 'einmal-passwort-der-stelle-0123';
  for (const an of ['termine@beispiel.example', undefined]) {
    const paar = V.anfrageEndeModell(eintragMit({ art: 'schluesselpaar', an }), 'Antwort_A-1.jwe', ds);
    const einmal = V.anfrageEndeModell(eintragMit({ art: 'einmalpasswort', an, passwort: PW }), 'Antwort_A-1.jwe', ds);
    assert.deepEqual(paar, einmal, 'derselbe Bildschirm auf beiden Wegen' + (an ? '' : ' (ohne Ziel)'));
    for (const m of [paar, einmal]) {
      for (const [k, v] of Object.entries(m)) {
        if (typeof v !== 'string') continue;
        assert.doesNotMatch(v, /passwort|password/i, k + ' nennt kein Passwort');
        assert.equal(v.includes(PW), false, k + ' trägt keinen Passwortwert');
      }
    }
  }
  assert.doesNotMatch(rumpf('function anfrageEndeModell('), /\.art\b|schluesselpaar|einmalpasswort/, 'das Modell unterscheidet die Wege gar nicht');
});
/* Der Schlüsselpaar-Weg geht ohne Passwort-Dialog zum Schreiben: im Rumpf von _anfrageAntwortAusgeben steht die Weiche vor dem
   ersten Dialog und reicht kein Passwort weiter. Auf Zeichenebene, weil der Stub keinen Dialog parst. */
const WEICHE = "if (art === 'schluesselpaar') return _anfrageAntwortSchreiben(eintrag, ds, {});";
function schluesselpaarWegMaengel(src) {
  const a = src.indexOf('function _anfrageAntwortAusgeben(');
  if (a < 0) return ['_anfrageAntwortAusgeben fehlt'];
  const r = src.slice(a, src.indexOf('\n}\n', a) + 2);
  const m = [];
  const w = r.indexOf(WEICHE), dialog = r.indexOf('ui.modal(');
  if (w < 0) m.push('keine Weiche für das Schlüsselpaar');
  else if (dialog >= 0 && w > dialog) m.push('die Weiche steht hinter dem Passwort-Dialog');
  if (!/const art = \(eintrag\.anfrage\.antwort && eintrag\.anfrage\.antwort\.art\) \|\| 'einmalpasswort';/.test(r)) m.push('art wird nicht aus der Anfrage gelesen');
  return m;
}
test('[W3 · Schlüsselpaar] _anfrageAntwortAusgeben führt bei „schluesselpaar“ ohne Passwort-Dialog zu _anfrageAntwortSchreiben', () => {
  assert.deepEqual(schluesselpaarWegMaengel(KERN), []);
  // Der Schreib-Weg selbst nimmt das Schlüsselpaar aus der Anfrage, nicht aus einer Eingabe: kein `passwort` in den Optionen.
  assert.match(WEICHE, /\{\}\);$/);
});
test('[W3 · Schlüsselpaar · Rot-Beweis] fehlt die Weiche oder steht sie hinter dem Dialog, wird es gemeldet', () => {
  assert.ok(KERN.includes(WEICHE));
  assert.deepEqual(schluesselpaarWegMaengel(KERN.replace(WEICHE, '')), ['keine Weiche für das Schlüsselpaar']);
  const a = KERN.indexOf('function _anfrageAntwortAusgeben(');
  const rumpfAlt = KERN.slice(a, KERN.indexOf('\n}\n', a) + 2);
  const dahinter = rumpfAlt.replace(WEICHE, '').replace('  ui.modal({', '  ui.modal({}); ' + WEICHE + '\n  ui.modal({');
  assert.deepEqual(schluesselpaarWegMaengel(KERN.replace(rumpfAlt, dahinter)), ['die Weiche steht hinter dem Passwort-Dialog']);
  assert.deepEqual(schluesselpaarWegMaengel(KERN.replace(rumpfAlt, rumpfAlt.replace("|| 'einmalpasswort';", "|| 'schluesselpaar';"))), ['art wird nicht aus der Anfrage gelesen']);
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Die übrigen Titel sind Abläufe oder Konstruktions-Form (feste Stellen im Rumpf, feste Eingaben), keine Verletzungsliste. */
module.exports = {
  PROBEN: [
    { fuer: '[W3 · Texte] jeder neue Text steht deutsch und englisch, mit denselben Platzhaltern', diskriminante: textVerstoesse },
    { fuer: '[W3 · Anlegen · Klasse] keine Funktion des Anfrage-Wegs nimmt ein Passwort entgegen oder hält es', diskriminante: passwortHalter },
    { fuer: '[W3 · Anlegen · Klasse] kein Anfrage-Weg hält ein Passwort: nur der Anlege-Weg reicht es an den Code weiter', diskriminante: klassenVerstoesse },
    { fuer: '[W3 · Schlüsselpaar] _anfrageAntwortAusgeben führt bei „schluesselpaar“ ohne Passwort-Dialog zu _anfrageAntwortSchreiben', diskriminante: schluesselpaarWegMaengel },
  ],
};
