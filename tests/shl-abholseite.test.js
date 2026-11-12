'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — die Abhol-Seite (share/empfangen.*), Nachtrag zu U2-ADR-183
   ────────────────────────────────────────────────────────────────────────
   Dieselbe Bauform wie die Ablage-Seite, andere Richtung: die Ablage-Seite
   LEGT AB, diese HOLT AB — und zwar von FREMDEN Hosts, denn die Freigabe
   einer Aerztin liegt auf ihrem Server, nicht auf unserem.

   WARUM DIESE SEITE EINE EIGENE PROBE BRAUCHT: sie haelt fuer einige Sekunden
   ENTSCHLUESSELTES Gesundheits-FHIR im Speicher. Die App selbst sieht nie
   etwas anderes als Chiffretext. Dieser Unterschied ist der Grund fuer jede
   Strenge unten — und fuer die Sperre, dass der Kern NICHT mitgelockert wird.

   Die Probe ist bewusst STRUKTURELL und braucht keinen Browser: sie haelt die
   ausgelieferten Dateien gegen die Zusagen. Der Lauf gegen einen echten Host
   ist tools/shl-empfangen-probe.js und laeuft nicht in der Suite.

   Anlass, gemessen: Gazelle TI-751 am 23.09.2026 — Manifest-Weg mit Passcode,
   Aufloesung ueber `location`, Entschluesselung im Browser. Die Seite war zu
   dem Zeitpunkt nicht versioniert; genau das schliesst diese Probe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const S = (name) => fs.readFileSync(path.join(WURZEL, 'share', name), 'utf8');

test('[U2-ADR-183] die drei Dateien der Abhol-Seite sind versioniert', () => {
  for (const f of ['empfangen.html', 'empfangen.js', 'empfangen.css']) {
    const p = path.join(WURZEL, 'share', f);
    assert.ok(fs.existsSync(p), `share/${f} fehlt — die Seite lebte sonst nur auf dem Webhost`);
    assert.ok(fs.statSync(p).size > 500, `share/${f} ist verdaechtig klein`);
  }
});

test('[U2-ADR-183] der KERN bleibt bei connect-src none — diese Seite lockert ihn nicht', () => {
  /* Die eigentliche Sperre. Die Abhol-Seite darf ins Netz; die Anwendung nicht.
     Wer das je zusammenlegt, bricht die Zusage „die App macht zu keinem
     Zeitpunkt einen Netzaufruf". */
  for (const kern of ['vivodepot.html', 'vivodepot-lesen.html']) {
    assert.deepEqual(kernSperreBefund(fs.readFileSync(path.join(WURZEL, kern), 'utf8')), [], kern);
  }
});

function kernSperreBefund(t) {
  const fehler = [];
  if (!/connect-src\s+'none'/.test(t)) fehler.push("connect-src 'none' fehlt");
  if (/connect-src\s+https:/.test(t)) fehler.push('connect-src https: gehoert NICHT in den Kern');
  if (t.includes('empfangen.js')) fehler.push('die Abhol-Seite gehoert nicht in den Kern');
  return fehler;
}

test('[Negativprobe] Rot-Beweis zu U2-ADR-183: ein gelockerter Kern fällt, connect-src https: und die eingebundene Abhol-Seite', () => {
  // Am 25.09.2026 einmal von Hand gefahren (Kern-CSP auf connect-src https:), seit 26.09.2026 hier festgeschrieben.
  const echt = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const gelockert = echt.replace("connect-src 'none'", 'connect-src https:');
  assert.notEqual(gelockert, echt, 'Vorbedingung: die CSP-Zeile ließ sich ändern');
  assert.ok(kernSperreBefund(gelockert).includes('connect-src https: gehoert NICHT in den Kern'));
  assert.ok(kernSperreBefund(echt + '\n<script src="empfangen.js"></script>').includes('die Abhol-Seite gehoert nicht in den Kern'));
});

test('[U2-ADR-183] CSP der Abhol-Seite: alles zu, nur connect-src offen', () => {
  const h = S('empfangen.html');
  const m = h.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(m, 'CSP-Meta fehlt');
  const csp = m[1];
  assert.match(csp, /default-src 'none'/, 'default-src none');
  assert.match(csp, /script-src 'self'/, 'nur eigene Skripte');
  assert.match(csp, /connect-src https:/, 'der EINE Unterschied zur Ablage-Seite');
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.ok(!csp.includes('unsafe-inline'), 'kein unsafe-inline');
  assert.ok(!csp.includes('unsafe-eval'), 'kein unsafe-eval');
  assert.ok(!/frame-ancestors/.test(csp), 'frame-ancestors wird in einer Meta-CSP ignoriert — gehoert nicht hinein');
});

/* RECHTSLINKS (31.10.2026, mit Freigabe): die zwei Wächter unten lesen jedes href/src als Quelle. Erlaubt ist daneben
   genau ein <a> zu Impressum oder Datenschutz des Anbieters, und nur mit rel="noreferrer noopener": die Abhol-Seite trägt den
   Schlüssel im Link, kein Referrer darf hinaus. Eine Positivliste mit zwei Einträgen; jedes andere <a> nach draußen bleibt rot,
   ebenso jedes src und jedes <link href> nach draußen. */
const ERLAUBTE_RECHTSLINKS = Object.freeze(['https://vivodepot.de/impressum.html', 'https://vivodepot.de/datenschutz.html']);
function ohneErlaubteRechtslinks(html) {
  return html.replace(/<a\b[^>]*>/g, (tag) => {
    const ziel = (tag.match(/\shref="([^"]+)"/) || [])[1];
    const rel = ((tag.match(/\srel="([^"]+)"/) || [])[1] || '').split(/\s+/);
    return ERLAUBTE_RECHTSLINKS.includes(ziel) && rel.includes('noreferrer') && rel.includes('noopener') ? '<a>' : tag;
  });
}

test('[U2-ADR-183] kein Inline-Skript, keine fremden Quellen', () => {
  const h = ohneErlaubteRechtslinks(S('empfangen.html'));
  for (const tag of h.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) || []) {
    assert.match(tag, /\ssrc="/, 'jedes <script> hat ein src — kein Inline-Code');
    assert.match(tag, /<script[^>]*>\s*<\/script>/, '<script src> hat keinen Rumpf');
  }
  for (const ref of h.match(/(?:src|href)="([^"]+)"/g) || []) {
    const v = ref.split('"')[1];
    assert.ok(!/^https?:/i.test(v) && !v.startsWith('//'),
      `fremde Quelle in der Seite: ${v} — alles kommt vom eigenen Host`);
  }
  assert.ok(!/\son\w+=/.test(h), 'keine Inline-Ereignisbehandler (onclick=…)');
});

test('[U2-ADR-183] beide Freigabewege werden bedient — U und Manifest', () => {
  const j = S('empfangen.js');
  assert.match(j, /flag[^\n]*includes\('U'\)/, 'der Direkt-Weg wird am U-Flag erkannt');
  assert.match(j, /flag[^\n]*includes\('P'\)/, 'der Passcode wird am P-Flag erkannt');
  assert.match(j, /method:\s*'GET'/, 'U-Flag: GET');
  assert.match(j, /method:\s*'POST'/, 'Manifest: POST');
  assert.match(j, /searchParams\.set\('recipient'/, 'U-Flag: recipient als Abfrageparameter');
  assert.match(j, /\{\s*recipient:/, 'Manifest: recipient im Koerper');
  assert.match(j, /location/, 'das Manifest darf statt embedded eine location liefern');
});

test('[U2-ADR-183] der Passcode wird NUR bei P-Flag mitgeschickt', () => {
  const j = S('empfangen.js');
  assert.match(j, /if \(brauchtPasscode\(p\)\) koerper\.passcode =/,
    'der Passcode haengt an der Flag-Pruefung, nicht am Vorhandensein einer Eingabe');
});

test('[U2-ADR-183] die Entschluesselung bindet den Kopf als Zusatzdaten (AAD)', () => {
  /* RFC 7516 §5.1: AAD ist der KODIERTE geschuetzte Kopf als ASCII. Fehlt das,
     schlaegt jede echte JWE fehl — und es sieht aus wie ein Verbindungsfehler. */
  const j = S('empfangen.js');
  assert.match(j, /name:\s*'AES-GCM'/);
  assert.match(j, /additionalData:\s*new TextEncoder\(\)\.encode\(/, 'AAD wird gesetzt');
  assert.match(j, /tagLength:\s*128/);
});

test('[U2-ADR-183] der Schluessel verlaesst das Geraet nicht', () => {
  const j = S('empfangen.js');
  for (const stelle of j.match(/fetch\([\s\S]{0,400}?\)/g) || []) {
    assert.ok(!/\bkey\b/.test(stelle), `der Schluessel taucht in einem fetch auf:\n${stelle.slice(0, 200)}`);
  }
});

test('[U2-ADR-183] der Download-Anker haengt im Dokument, bevor er geklickt wird', () => {
  /* Ohne appendChild feuert click() in mehreren Browsern nicht — die Buergerin
     haelt das Dokument dann fuer verloren, und die Freigabe ist verbraucht. */
  const j = S('empfangen.js');
  assert.match(j, /appendChild\(a\);\s*a\.click\(\)/, 'erst einhaengen, dann klicken');
});

test('[U2-ADR-183] die Seite nennt keinen festen Host — sie folgt dem Link', () => {
  const j = S('empfangen.js');
  assert.ok(!/share\.vivodepot\.de/.test(j),
    'die Adresse kommt aus dem Freigabe-Link der Absenderin, nicht aus unserem Code');
});

/* Befund STYLE-CSS-NICHT-OEFFENTLICH (04.10.2026): die Seite lud style.css, das nur auf dem Webhost und im internen Repo
   lag. Was die Seite lädt, muss hier liegen — nur dann geht es mit dem Zuschnitt hinaus und ist von Dritten
   nachprüfbar. Geprüft wird jede Ressource, die das HTML selbst nennt (href/src), gegen share/. */
function fremdeRessourcenBefund(html, vorhanden) {
  const fehler = [];
  for (const m of ohneErlaubteRechtslinks(html).matchAll(/\b(?:href|src)\s*=\s*"([^"]+)"/g)) {
    const ziel = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(ziel) || ziel.startsWith('//')) { fehler.push(ziel + ': fremder Ursprung'); continue; }
    if (ziel.startsWith('#')) continue;
    if (!vorhanden(ziel.split(/[?#]/)[0])) fehler.push(ziel + ': liegt nicht unter share/ (nicht öffentlich nachprüfbar)');
  }
  return fehler;
}
const inShare = (rel) => fs.existsSync(path.join(WURZEL, 'share', rel));

test('[STYLE-CSS-NICHT-OEFFENTLICH] jede Ressource, die empfangen.html lädt, liegt versioniert unter share/', () => {
  assert.deepEqual(fremdeRessourcenBefund(S('empfangen.html'), inShare), []);
});

test('[Negativprobe] Rot-Beweis zu STYLE-CSS-NICHT-OEFFENTLICH: style.css wieder eingebunden und ein fremder Ursprung fallen', () => {
  const echt = S('empfangen.html');
  const alt = echt.replace('<link rel="stylesheet" href="empfangen.css">',
    '<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="empfangen.css">');
  assert.notEqual(alt, echt, 'Vorbedingung: die Zeile ließ sich einsetzen');
  assert.ok(fremdeRessourcenBefund(alt, inShare).some((x) => x.startsWith('style.css:')));
  const fremd = echt.replace('src="empfangen.js"', 'src="https://cdn.example/empfangen.js"');
  assert.ok(fremdeRessourcenBefund(fremd, inShare).some((x) => /fremder Ursprung/.test(x)));
});

/* Kopplung Wächter ↔ Probe (operating-manual §7.5): der Prüfstand ersetzt kernSperreBefund durch einen Ersatz,
   der immer meldet, und verlangt, dass der Wächter oben dann rot wird — so ist belegt, dass er sie wirklich ruft. */
module.exports = {
  PROBEN: [
    { fuer: '[U2-ADR-183] der KERN bleibt bei connect-src none — diese Seite lockert ihn nicht', diskriminante: kernSperreBefund },  ],
};

test('[Rechtslinks·Rot-Beweis] nur die zwei Rechtslinks mit noreferrer gehen durch; Laden von draußen bleibt rot', () => {
  const echt = S('empfangen.html');
  const fall = (html) => fremdeRessourcenBefund(html, inShare).filter((x) => /fremder Ursprung/.test(x));
  assert.deepEqual(fall(echt), [], 'die echte Seite: grün');
  const linkFremd = echt.replace('<link rel="stylesheet" href="empfangen.css">', '<link rel="stylesheet" href="https://vivodepot.de/style.css">');
  const srcFremd = echt.replace('src="empfangen.js"', 'src="https://vivodepot.de/empfangen.js"');
  const aFremd = echt.replace('href="https://vivodepot.de/impressum.html"', 'href="https://example.org/impressum.html"');
  const ohneRel = echt.replace('href="https://vivodepot.de/datenschutz.html" rel="noreferrer noopener"', 'href="https://vivodepot.de/datenschutz.html"');
  for (const [name, html] of [['link', linkFremd], ['src', srcFremd], ['a fremd', aFremd], ['a ohne noreferrer', ohneRel]]) {
    assert.notEqual(html, echt, 'Vorbedingung: ' + name + ' ließ sich einsetzen');
    assert.equal(fall(html).length, 1, name + ' fällt auf');
  }
});

/* ── Auftragsmodus (L6, 02.11.2026): der Kern hält den Schlüssel, diese Seite holt nur das Chiffrat ─────────────────────────── */
function auftragTeil() {
  const vm = require('node:vm');
  const js = S('empfangen.js');
  const a = js.indexOf('/* ══ SHL-ABLAGE-URL-BLOCK'); const b = js.indexOf('/* ══ ENDE SHL-ABLAGE-URL-BLOCK ══ */');
  const c = js.indexOf('const AUFTRAG_FELDER'); const d = js.indexOf('function auftragZeigen');
  assert.ok(a > 0 && b > a && c > 0 && d > c, 'Block und Auftragsteil in empfangen.js');
  const k = { URL, Date };
  vm.runInNewContext(js.slice(a, b) + '\n' + js.slice(c, d) + '\nthis.pruefen = auftragPruefen; this.form = antwortJwe;', k);
  return k;
}
// Jeder fetch-Aufruf bis zu seinem Ende `);` (die Optionen können verschachtelte Objekte tragen).
function fetchAufrufe(js) {
  const aus = [];
  for (let i = js.indexOf('await fetch('); i >= 0; i = js.indexOf('await fetch(', i + 1)) aus.push(js.slice(i, js.indexOf(');', i) + 2));
  return aus;
}
const AUFTRAG = { typ: 'vd-shl-holen', fassung: 1, id: 'AbCdEfGhIjKlMnOpQrStUv', url: 'https://share.vivodepot.de/holen.php?t=' + 'a'.repeat(48), flag: 'U', bis: 2000 };

test('[Auftrag] angenommen nur vom Öffner, mit genau diesen Feldern, vor Fristende, mit geprüfter Adresse, ohne Passcode', () => {
  const { pruefen } = auftragTeil();
  const oeffner = {};
  const jetzt = () => 1000;
  const a = pruefen({ source: oeffner, origin: 'null', data: AUFTRAG }, oeffner, jetzt);
  assert.equal(a.host, 'share.vivodepot.de');
  assert.equal(a.quelle, oeffner);
  const rot = {
    'fremdes Fenster': [{ source: {}, origin: 'null', data: AUFTRAG }],
    'kein Öffner': [{ source: oeffner, origin: 'null', data: AUFTRAG }, null],
    'Schlüssel mitgeschickt': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { key: 'k' }) }],
    'Passcode-Flag': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { flag: 'P' }) }],
    'http': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { url: 'http://share.vivodepot.de/x' }) }],
    'Zugangsdaten': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { url: 'https://a:b@x.example/x' }) }],
    'abgelaufen': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { bis: 999 }) }],
    'id': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { id: 'x' }) }],
    'Fassung': [{ source: oeffner, data: Object.assign({}, AUFTRAG, { fassung: 2 }) }],
  };
  for (const [name, [e, o]] of Object.entries(rot)) assert.equal(pruefen(e, o === undefined ? oeffner : o, jetzt), null, name);
});

test('[Auftrag] zurück geht nur eine Antwort in JWE-Form mit begrenzter Größe', () => {
  const { form } = auftragTeil();
  assert.equal(form(' a..b.c.d\n'), 'a..b.c.d');
  for (const j of ['a.b.c.d', 'a..b.c', '{"resourceType":"Bundle"}', 'a..b.c.d+', '<html>', '', null]) assert.equal(form(j), null, String(j));
  assert.equal(form('a..b.c.' + 'd'.repeat(12 * 1024 * 1024)), null, 'Größe');
});

test('[Auftrag] Abruf nur nach Klick, jeder fetch ohne Anmeldedaten und ohne Referrer; die Antwort mit der id an den Öffner', () => {
  const js = S('empfangen.js');
  const fetches = fetchAufrufe(js);
  assert.equal(fetches.length, 3, 'drei fetch-Aufrufe in jweHolen');
  for (const f of fetches) {
    assert.match(f, /credentials: 'omit'/, f);
    assert.match(f, /referrerPolicy: 'no-referrer'/, f);
  }
  const hoerer = js.slice(js.indexOf("window.addEventListener('message'"), js.indexOf("document.getElementById('auftrag-knopf')"));
  assert.doesNotMatch(hoerer, /jweHolen|fetch|auftragAusfuehren/, 'die Nachricht allein holt nichts');
  assert.match(js, /getElementById\('auftrag-knopf'\)\.addEventListener\('click', auftragAusfuehren\)/);
  assert.match(js, /auftrag\.quelle\.postMessage\(\{ typ: 'vd-shl-geholt', fassung: 1, id: auftrag\.id, jwe \}/);
  assert.doesNotMatch(js.slice(js.indexOf('async function auftragAusfuehren')), /entschluesseln\(/, 'im Auftragsmodus entschlüsselt die Seite nicht');
  assert.match(js, /linkEingabe\.closest\('\.kasten'\)\.hidden = true;/, 'im Auftragsmodus steht das Einfügefeld nicht daneben');
  const html = S('empfangen.html');
  for (const id of ['auftrag', 'auftrag-liste', 'auftrag-knopf', 'auftrag-fehler', 'auftrag-datei-knopf']) assert.match(html, new RegExp('id="' + id + '"'), id);
});

test('[Auftrag·Rot] vor L6 gingen die fetch-Aufrufe mit Anmeldedaten (Vorgabe same-origin) hinaus', () => {
  const alt = S('empfangen.js').replace(/credentials: 'omit', /g, '').replace(/\n {4}credentials: 'omit',/g, '');
  const fetches = fetchAufrufe(alt);
  assert.equal(fetches.length, 3);
  assert.ok(fetches.every((f) => !/credentials/.test(f)), 'ohne die Angabe fällt jede Probe oben');
});
