'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════
   Befund ANTWORT-EINMALPASSWORT-OHNE-MINDESTLAENGE (MITTEL, 17.10.2026) — das Einmalpasswort der Antwort
   ────────────────────────────────────────────────────────────────────────────────────────────────────────
   Der Kern nahm jedes nicht leere Passwort an. Die Antwort ist mit PBES2 verschlüsselt, das bremst das Durchprobieren nur
   linear: ein PIN wie „4711“ ist offline schnell gefunden, wenn jemand die Antwortdatei abfängt. Entschieden ist ein Hinweis
   mit Wahl, keine Sperre — die Person hat das Passwort nicht gewählt und kann es nicht ändern.

   (1) KERN: ein kurzes Passwort zeigt den Hinweis; „Abbrechen“ schreibt nichts und zeigt wieder die Eingabe; „Trotzdem
       verschlüsseln“ schreibt die JWE. Studio-Form und 16 Zeichen ohne Trennzeichen zeigen keinen Hinweis.
   (2) KLASSE ERZEUGER ↔ KERN: jedes Passwort, das das Studio erzeugt, gilt im Kern als nicht kurz.
   (3) FORMAT: beide Format-Dokumente nennen dieselbe Mindestlänge wie der Kern und dieselbe Zeichenmenge wie das Studio.
   (4) ROT-BEWEISE: ein Kern ohne die Prüfung verschlüsselt „4711“ ohne Hinweis; ein Dokument mit anderer Zahl fällt auf.

   Nicht hier: die Demo-Szenarien (tools/demo-szenarien/*.json, `einmalpasswortBeispiel`) tragen noch „4711“. Ihre Probe
   kommt mit dem Ersatz des Beispiels.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');

const WURZEL = path.join(__dirname, '..');
const KERN = path.join(WURZEL, 'vivodepot.html');
const PW_DEPOT = 'Einmalpasswort-Probe-2026!';

function anfrage() {
  return {
    modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Stelle', zweck: 'Aufnahme', grundlage: 'Vertrag', vorgang: 'EP-2026-1017',
    gestelltAm: '2026-10-17', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }],
    antwort: { art: 'einmalpasswort', an: 'aufnahme@probe.example' },
  };
}

/* Ein Kern mit Depot; jeder Dialog und jede herausgegebene Datei wird mitgeschrieben. */
async function kern(htmlPfad) {
  const gefangen = [];
  const k = ladeKern(Object.assign({ Blob, ausgabeErfassen: (x) => gefangen.push(x) }, htmlPfad ? { htmlPfad, backen: true } : {}));
  const V = k.V;
  await V.depotAnlegen(PW_DEPOT);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  const dialoge = [];
  V.ui.modal = (o) => { dialoge.push(o); return () => {}; };
  V.ui.toast = () => {};
  return { V, document: k.document, dialoge, gefangen };
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
/* Seit „Link senden“ (L1b, 19.10.2026) fragt eine signierte Antwort erst nach dem Weg; die Probe wählt „Herunterladen“,
   den Weg, den sie hält. */
async function warteAufDatei(K, ms) {
  const ende = Date.now() + (ms || 15000);
  let gewaehlt = false;
  while (!K.gefangen.length && Date.now() < ende) {
    const d = K.dialoge.at(-1);
    if (!gewaehlt && d && /id="ausgabe-datei"/.test(d.koerperHTML || '')) { gewaehlt = true; d.onPrimaer(() => {}); }
    await warte(25);
  }
  return K.gefangen.length;
}
const istEingabe = (V, d) => !!d && d.titel === V.STRINGS.antwortPasswortTitel && /id="antwort-pw"/.test(d.koerperHTML);
const istHinweis = (V, d) => !!d && d.titel === V.STRINGS.antwortPasswortKurzTitel;

/* Die Person tippt `pw` ein und drückt „Antworten“. → { eintrag, ds, hinweis } — hinweis ist der neue Dialog oder null. */
function eingeben(K, pw) {
  const a = anfrage();
  const eintrag = { anfrage: a, anbieterId: null };
  const ds = K.V.anfrageAntwortDatensatz(a, { sensibel: false });
  K.V._anfrageAntwortAusgeben(eintrag, ds);
  const eingabe = K.dialoge.at(-1);
  assert.ok(istEingabe(K.V, eingabe), 'Vorbedingung: die Eingabe des Einmalpassworts steht');
  K.document.getElementById('antwort-pw').value = pw;
  const vorher = K.dialoge.length;
  eingabe.onPrimaer(() => {});
  const neu = K.dialoge.length > vorher ? K.dialoge.at(-1) : null;
  return { eintrag, ds, hinweis: istHinweis(K.V, neu) ? neu : null };
}

/* ── (1) Kern ─────────────────────────────────────────────────────────────── */
test('[Einmalpasswort · Länge] gezählt wird ohne Bindestrich und Leerraum; die Grenze ist 16', () => {
  const { V } = ladeKern();
  assert.equal(V.EINMALPASSWORT_MIN_ZEICHEN, 16);
  for (const kurz of ['4711', 'AB-CD', 'ABCDEFGHJKLMNPQ', 'ABCD-EFGH-JKLM-NPQ', 'ABCD EFGH JKLM NPQ', '----------------', '']) {
    assert.equal(V._einmalpasswortKurz(kurz), true, 'kurz: „' + kurz + '“');
  }
  for (const lang of ['ABCD-EFGH-JKLM-NPQR', 'ABCDEFGHJKLMNPQR', 'ABCD EFGH JKLM NPQR', 'vorgang-einmal-2026']) {
    assert.equal(V._einmalpasswortKurz(lang), false, 'nicht kurz: „' + lang + '“');
  }
});

for (const pw of ['4711', 'ABCDEFGHJKLMNPQ', 'AB-CD']) {
  test('[Einmalpasswort · Hinweis] „' + pw + '“ zeigt den Hinweis; „Abbrechen“ schreibt nichts und zeigt wieder die Eingabe', async () => {
    const K = await kern();
    const { hinweis } = eingeben(K, pw);
    assert.ok(hinweis, 'der Hinweis steht');
    assert.ok(hinweis.koerperHTML.includes(K.V.STRINGS.antwortPasswortKurzText.replace(/&/g, '&amp;')), 'der Text aus dem Textsatz');
    assert.equal(hinweis.primaerLabel, K.V.STRINGS.antwortPasswortKurzTrotzdem);
    assert.equal(hinweis.zweitAktion && hinweis.zweitAktion.label, K.V.STRINGS.btnAbbrechen);
    assert.equal(hinweis.ohneAbbrechen, true, 'genau ein „Abbrechen“, und das führt zurück');
    hinweis.zweitAktion.handler(() => {});
    assert.ok(istEingabe(K.V, K.dialoge.at(-1)), 'nach „Abbrechen“ steht wieder die Eingabe da');
    await warte(300);
    assert.equal(K.gefangen.length, 0, 'nach „Abbrechen“ geht nichts hinaus');
  });
}

test('[Einmalpasswort · Hinweis] „Trotzdem verschlüsseln“ schreibt die Antwort wie bisher: eine JWE mit PBES2', async () => {
  const K = await kern();
  const { hinweis } = eingeben(K, '4711');
  assert.ok(hinweis, 'der Hinweis steht');
  assert.equal(K.gefangen.length, 0, 'vor der Wahl geht nichts hinaus');
  hinweis.onPrimaer(() => {});
  assert.equal(await warteAufDatei(K), 1, 'die Antwort geht hinaus');
  assert.match(K.gefangen[0].name, /_Antwort_EP-2026-1017\.jwe$/);
  const jwe = (await K.gefangen[0].blob.text()).trim();
  assert.equal(jwe.split('.').length, 5, 'JWE Compact: fünf Teile');
  const kopf = JSON.parse(Buffer.from(jwe.split('.')[0], 'base64url').toString('utf8'));
  assert.equal(kopf.alg, 'PBES2-HS512+A256KW', 'das Verfahren ist unverändert');
  assert.equal(kopf.p2c, 600000, 'die Iterationszahl ist unverändert');
});

for (const pw of ['ABCD-EFGH-JKLM-NPQR', 'ABCDEFGHJKLMNPQR']) {
  test('[Einmalpasswort · ohne Hinweis] „' + pw + '“ wird ohne Hinweis verschlüsselt', async () => {
    const K = await kern();
    const { hinweis } = eingeben(K, pw);
    assert.equal(hinweis, null, 'kein Hinweis');
    assert.equal(await warteAufDatei(K), 1, 'die Antwort geht hinaus');
  });
}

/* ── (2) Klasse Erzeuger ↔ Kern ───────────────────────────────────────────── */
test('[Einmalpasswort · Klasse] 1000 Passwörter aus dem Studio gelten im Kern alle als nicht kurz', () => {
  const S = ladeGenerator().V;
  const { V } = ladeKern();
  assert.equal(typeof S.einmalpasswortErzeugen, 'function', 'Vorbedingung: das Studio erzeugt Einmalpasswörter');
  const kurz = [];
  for (let i = 0; i < 1000; i++) {
    const pw = S.einmalpasswortErzeugen();
    if (V._einmalpasswortKurz(pw)) kurz.push(pw);
  }
  assert.deepEqual(kurz, []);
});

/* ── (3) Format ───────────────────────────────────────────────────────────── */
const DOKUMENTE = Object.freeze([
  { datei: 'docs/REQUESTS-AND-RESPONSES.md', anfang: '- With `einmalpasswort`, the password', zahl: /at least (\d+) characters/ },
  { datei: 'docs/integrieren.md', anfang: '- Bei `einmalpasswort` muss das Passwort', zahl: /mindestens (\d+) Zeichen/ },
]);
/* Der Absatz zum Einmalpasswort je Dokument: die Mindestlänge und die Zeichenmenge des Studios. → Liste der Abweichungen. */
function formatBefunde(texte, minZeichen, zeichen) {
  const f = [];
  DOKUMENTE.forEach((d, i) => {
    const t = texte[i];
    const a = t.indexOf(d.anfang);
    if (a < 0) { f.push(d.datei + ': kein Absatz zum Einmalpasswort'); return; }
    const absatz = t.slice(a, t.indexOf('\n- ', a + 1) < 0 ? undefined : t.indexOf('\n- ', a + 1));
    const m = d.zahl.exec(absatz);
    if (!m) f.push(d.datei + ': keine Mindestlänge');
    else if (Number(m[1]) !== minZeichen) f.push(d.datei + ': Mindestlänge ' + m[1] + ' statt ' + minZeichen);
    if (!absatz.includes('`' + zeichen + '`')) f.push(d.datei + ': die Zeichenmenge des Studios fehlt');
  });
  return f;
}
const dokumentTexte = () => DOKUMENTE.map((d) => fs.readFileSync(path.join(WURZEL, d.datei), 'utf8'));

test('[Einmalpasswort · Format] beide Dokumente nennen die Mindestlänge des Kerns und die Zeichenmenge des Studios', () => {
  const { V } = ladeKern();
  const S = ladeGenerator().V;
  assert.equal(S.EINMALPASSWORT_ZEICHEN, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 'Vorbedingung: die Zeichenmenge des Studios');
  assert.deepEqual(formatBefunde(dokumentTexte(), V.EINMALPASSWORT_MIN_ZEICHEN, S.EINMALPASSWORT_ZEICHEN), []);
});

test('[Einmalpasswort · Format · Rot-Beweis] eine andere Zahl oder eine fehlende Zeichenmenge fällt auf', () => {
  const texte = dokumentTexte();
  const zahl = texte.slice(); zahl[1] = zahl[1].replace('mindestens 16 Zeichen', 'mindestens 12 Zeichen');
  assert.notEqual(zahl[1], texte[1], 'Vorbedingung: die Mutation greift');
  assert.deepEqual(formatBefunde(zahl, 16, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), ['docs/integrieren.md: Mindestlänge 12 statt 16']);
  const menge = texte.slice(); menge[0] = menge[0].replace('`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`', '`A-Z, 2-9`');
  assert.notEqual(menge[0], texte[0], 'Vorbedingung: die Mutation greift');
  assert.deepEqual(formatBefunde(menge, 16, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), ['docs/REQUESTS-AND-RESPONSES.md: die Zeichenmenge des Studios fehlt']);
  assert.deepEqual(formatBefunde(texte, 20, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789').length, 2, 'eine andere Zahl im Kern fällt in beiden Dokumenten auf');
});

/* ── (4) Rot-Beweis am Kern ───────────────────────────────────────────────── */
function kernOhne(alt, neu) {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.equal(html.split(alt).length, 2, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt.trim());
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'einmalpasswort-laenge-'));
  const p = path.join(dir, 'kern.html');
  fs.writeFileSync(p, html.replace(alt, () => neu));
  return { pfad: p, aufraeumen: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('[Einmalpasswort · Rot-Beweis] ohne die Prüfung wird „4711“ ohne Hinweis verschlüsselt', async () => {
  const k = kernOhne('      if (_einmalpasswortKurz(pw)) return _einmalpasswortKurzHinweis(eintrag, ds, pw);\n', '');
  try {
    const K = await kern(k.pfad);
    const { hinweis } = eingeben(K, '4711');
    assert.equal(hinweis, null, 'genau der Befund: kein Hinweis');
    assert.equal(await warteAufDatei(K), 1, 'genau der Befund: die Antwort geht mit „4711“ hinaus');
  } finally { k.aufraeumen(); }
});
