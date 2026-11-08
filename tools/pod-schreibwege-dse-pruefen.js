#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pod-schreibwege-dse-pruefen.js — jeder Weg, auf dem die Pod-Brücke etwas schreibt, steht in der Datenschutzerklärung
   ────────────────────────────────────────────────────────────────────────────
   Die Pod-Brücke (pod/) ist die einzige Seite mit Netzzugang. Was sie in einen Pod, an einen Anbieter oder an einen
   Posteingang schreibt, muss Ziffer 7b der Datenschutzerklärung nennen. Anlass: eine Kopie des Ablage-Verzeichnisses im
   Pod kam in den Code, ohne dass Ziffer 7b sie nannte (Befund POD-DSE-VERZEICHNISKOPIE, 03.11.2026).

   Zwei Prüfungen:
   1. Code gegen Register (immer): Jede Funktion in pod/*.js mit einem schreibenden Aufruf (method 'PUT', 'POST',
      'PATCH', 'DELETE') steht in SCHREIBWEGE, jeder Schlüssel von ORDNER in pod/bruecke.js und jede Art in POD_ARTEN
      des Kerns steht in ORDNER_KENNUNG. Ein schreibender Aufruf mit nicht wörtlicher Methode ist rot, außer im
      Durchreicher PODFETCH_DURCHREICHER. Schreibend ist auch ein Aufruf schreiben(senden, 'PUT', …) der Außenablage. Ein Registereintrag ohne Funktion im Code ist rot (Karteileiche), nur am
      Stand des Repos; mit --pod (ein Paket, auch ein älteres) nicht.
   2. Register gegen Datenschutzerklärung (mit --dse): Jede Kennung, die der Code braucht, hat ihr Muster in Ziffer 7b,
      deutsch und englisch (die Seite trägt DE und EN untereinander; das erste Vorkommen von 7b ist DE, das zweite EN).

   Ein neuer Schreibweg braucht also zuerst einen Satz in 7b und einen Eintrag hier; sonst ist die Probe rot.

   Aufruf:
     node tools/pod-schreibwege-dse-pruefen.js                                  → Code gegen Register (Repo)
     node tools/pod-schreibwege-dse-pruefen.js --dse <datenschutz.html>         → dazu Register gegen DSE
     node tools/pod-schreibwege-dse-pruefen.js --pod <ordner> --kern <datei>    → anderer Stand der Brücke bzw. des Kerns
   Exit 0 grün, 1 rot. Ohne --kern wird POD_ARTEN nur geprüft, wenn vivodepot.html neben pod/ liegt.
   Probe: tests/pod-schreibwege-dse.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const SCHREIBEND = /method:\s*'(PUT|POST|PATCH|DELETE)'/;
const METHODE_DYNAMISCH = /method:\s*[A-Za-z_$][\w$]*\s*[,}]/;
// Schreiben über die Außenablage (Außenablagen nur Chiffrat): schreiben(senden, 'PUT', …). Die Methode steht als zweites Argument.
const SCHREIBEND_AUSSENABLAGE = /\bschreiben\(\s*[^,()]+,\s*'(PUT|POST|PATCH|DELETE)'/;
const AUSSENABLAGE_DYNAMISCH = /\bschreiben\(\s*[^,()]+,\s*[A-Za-z_$][\w$]*\s*,/;
// Durchreicher: Funktionen, die eine Methode als Argument annehmen. Ihre Aufrufer stehen mit wörtlicher Methode im Register.
// aussenablage.js:schreiben nimmt nur PUT und POST an und prüft den Körper (Außenablagen nur Chiffrat, Nr. 1).
const PODFETCH_DURCHREICHER = Object.freeze(['solid-oidc.js:podFetch', 'aussenablage.js:schreiben']);

// Je Kennung das Muster, das Ziffer 7b tragen muss.
const KENNUNGEN = Object.freeze({
  'POD-REGISTRIERUNG': { DE: /registriert sich dort als „Vivodepot Pod-Brücke“/, EN: /registers there as “Vivodepot Pod-Brücke”/ },
  'POD-ANMELDUNG': { DE: /meldet Sie bei dem Anbieter an/, EN: /signs you in with the provider/ },
  'POD-ABLAGE': { DE: /legt die verschlüsselte Datei dort ab/, EN: /stores the encrypted file there/ },
  // Ein Grant geht nur an den Freigabe-Dienst des Pods, nie in den Pod (Außenablagen nur Chiffrat, Nr. 3).
  'POD-FREIGABE': { DE: /Dienst für Freigaben[^.]*stellt die Brücke dort eine Freigabe aus/, EN: /grant service[^.]*the bridge issues a grant there/ },
  'POD-POSTEINGANG': { DE: /an den Posteingang der Stelle/, EN: /to the organisation’s inbox/ },
  'POD-RUECKNAHME': { DE: /zurücknehmen/, EN: /withdraw/ },
  // Das Verzeichnis der Ablagen im Pod (nicht das im Browser): beide Wörter im selben Satz. Am Dateinamen hängt das Muster nicht,
  // weil der Name sich mit dem Umbau auf Chiffrat ändert.
  'POD-VERZEICHNIS-KOPIE': {
    DE: /Verzeichnis Ihrer Ablagen[^.]*in Ihrem Pod|in Ihrem Pod[^.]*Verzeichnis Ihrer Ablagen/,
    EN: /directory of your stored files[^.]*in your pod|in your pod[^.]*directory of your stored files/,
  },
  // Die Ablaufliste im Pod (U2-ADR-520): Adresse und Ablauf, damit die Brücke Abgelaufenes auch ohne Kern löscht.
  'POD-ABLAUFLISTE': { DE: /Liste mit Adresse und Ablauf/, EN: /list with the address and expiry/ },
});

// Sätze, die ein früherer Stand der Brücke trug und die heute falsch sind. Steht einer in Ziffer 7b, ist die DSE rot.
const WIDERRUFEN = Object.freeze({
  'POD-FREIGABE-IM-POD': { DE: /legt die Brücke in Ihrem Pod eine Freigabe ab/, EN: /the bridge places a grant in your pod/ },
});

// Je schreibende Funktion (Datei:Funktion) die Kennungen, die sie in 7b braucht.
const SCHREIBWEGE = Object.freeze({
  'solid-oidc.js:registrieren': ['POD-REGISTRIERUNG'],
  'solid-oidc.js:tokenAnfrage': ['POD-ANMELDUNG'],
  'bruecke.js:aclSetzen': ['POD-ABLAGE'],
  'bruecke.js:ordnerBereit': ['POD-ABLAGE'],
  'bruecke.js:ablegen': ['POD-ABLAGE'],
  // Ersetzt den Stand einer eigenen Ablage an derselben Adresse (Kind-Datei); dieselbe verschlüsselte Datei, derselbe Ort.
  'bruecke.js:ersetzen': ['POD-ABLAGE'],
  'bruecke.js:grantAnlegen': ['POD-FREIGABE', 'POD-POSTEINGANG'],
  'bruecke.js:kopieSchreiben': ['POD-VERZEICHNIS-KOPIE'],
  'bruecke.js:ablaufRunde': ['POD-ABLAUFLISTE'],
  'bruecke.js:loeschen': ['POD-RUECKNAHME'],
});

// Je Ordner der Brücke bzw. Art des Kerns die Kennung.
const ORDNER_KENNUNG = Object.freeze({
  stelle: 'POD-ABLAGE', link: 'POD-ABLAGE', eigen: 'POD-ABLAGE', intern: 'POD-VERZEICHNIS-KOPIE',
});

/** Schreibende Aufrufe je Datei: [{ weg: 'datei:funktion', zeile, dynamisch }]. Funktion = letzte benannte davor. */
function schreibaufrufe(dateiname, text) {
  const treffer = [];
  let funktion = '(oberste Ebene)';
  text.split('\n').forEach((z, i) => {
    const f = z.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (f) funktion = f[1];
    const aufruf = f ? z.slice(f.index + f[0].length) : z;   // die Kopfzeile einer Funktion schreiben(…) ist kein Aufruf
    if (SCHREIBEND.test(z) || SCHREIBEND_AUSSENABLAGE.test(aufruf)) treffer.push({ weg: dateiname + ':' + funktion, zeile: i + 1, dynamisch: false });
    else if (METHODE_DYNAMISCH.test(z) || AUSSENABLAGE_DYNAMISCH.test(aufruf)) treffer.push({ weg: dateiname + ':' + funktion, zeile: i + 1, dynamisch: true });
  });
  return treffer;
}

function ordnerSchluessel(brueckeText) {
  const m = brueckeText.match(/var\s+ORDNER\s*=\s*\{([^}]*)\}/);
  if (!m) return null;
  return [...m[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((x) => x[1]);
}

function podArten(kernText) {
  const m = kernText.match(/const\s+POD_ARTEN\s*=\s*Object\.freeze\(\[([^\]]*)\]\)/);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Prüfung 1. Gibt { fehler, kennungen } zurück: kennungen = die Kennungen, die der Code braucht. */
function codePruefen(podOrdner, kernDatei, karteileiche) {
  const fehler = [];
  const kennungen = new Set();
  const dateien = fs.readdirSync(podOrdner).filter((d) => d.endsWith('.js')).sort();
  if (!dateien.length) return { fehler: ['pod/: keine .js-Datei gefunden (' + podOrdner + ')'], kennungen };
  const gefunden = new Set();
  for (const d of dateien) {
    for (const t of schreibaufrufe(d, fs.readFileSync(path.join(podOrdner, d), 'utf8'))) {
      if (t.dynamisch) {
        if (!PODFETCH_DURCHREICHER.includes(t.weg)) fehler.push(t.weg + ' (Zeile ' + t.zeile + '): Methode nicht wörtlich, Schreibweg nicht prüfbar');
        continue;
      }
      gefunden.add(t.weg);
      const k = SCHREIBWEGE[t.weg];
      if (!k) fehler.push(t.weg + ' (Zeile ' + t.zeile + '): schreibt, steht aber nicht in SCHREIBWEGE — erst Satz in DSE 7b, dann Eintrag');
      else k.forEach((x) => kennungen.add(x));
    }
  }
  if (karteileiche) for (const w of Object.keys(SCHREIBWEGE)) if (!gefunden.has(w)) fehler.push(w + ': steht in SCHREIBWEGE, schreibt im Code aber nicht (Karteileiche)');
  const bruecke = path.join(podOrdner, 'bruecke.js');
  const ordner = fs.existsSync(bruecke) ? ordnerSchluessel(fs.readFileSync(bruecke, 'utf8')) : null;
  if (!ordner) fehler.push('bruecke.js: ORDNER nicht gefunden');
  else for (const o of ordner) {
    if (!ORDNER_KENNUNG[o]) fehler.push('ORDNER.' + o + ': neuer Ordner im Pod ohne Eintrag in ORDNER_KENNUNG');
    else kennungen.add(ORDNER_KENNUNG[o]);
  }
  if (kernDatei) {
    const arten = podArten(fs.readFileSync(kernDatei, 'utf8'));
    if (!arten) fehler.push(path.basename(kernDatei) + ': POD_ARTEN nicht gefunden');
    else for (const a of arten) {
      if (!ORDNER_KENNUNG[a]) fehler.push('POD_ARTEN ' + a + ': Art des Kerns ohne Eintrag in ORDNER_KENNUNG');
      else if (ordner && !ordner.includes(a)) fehler.push('POD_ARTEN ' + a + ': Art des Kerns ohne Ordner in der Brücke');
    }
  }
  return { fehler, kennungen };
}

function ziffer7b(html) {
  const abschnitte = [];
  const re = /<h2>7b\.\s/g;
  let m;
  while ((m = re.exec(html))) {
    const ende = html.indexOf('<h2>', m.index + 4);
    abschnitte.push(html.slice(m.index, ende < 0 ? html.length : ende).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  }
  return abschnitte;
}

/** Prüfung 2. */
function dsePruefen(html, kennungen) {
  const fehler = [];
  const abschnitte = ziffer7b(html);
  if (abschnitte.length < 2) return ['Ziffer 7b kommt ' + abschnitte.length + '-mal vor, erwartet je Sprache einmal (DE, EN)'];
  for (const k of [...kennungen].sort()) {
    const muster = KENNUNGEN[k];
    if (!muster) { fehler.push(k + ': Kennung ohne Muster'); continue; }
    if (!muster.DE.test(abschnitte[0])) fehler.push(k + ': fehlt in Ziffer 7b (DE), Muster ' + muster.DE);
    if (!muster.EN.test(abschnitte[1])) fehler.push(k + ': fehlt in Ziffer 7b (EN), Muster ' + muster.EN);
  }
  for (const [k, muster] of Object.entries(WIDERRUFEN)) {
    if (muster.DE.test(abschnitte[0])) fehler.push(k + ': widerrufener Satz steht in Ziffer 7b (DE), Muster ' + muster.DE);
    if (muster.EN.test(abschnitte[1])) fehler.push(k + ': widerrufener Satz steht in Ziffer 7b (EN), Muster ' + muster.EN);
  }
  return fehler;
}

function pruefen(o) {
  const podOrdner = o.pod || path.join(WURZEL, 'pod');
  const kern = o.kern !== undefined ? o.kern : (fs.existsSync(path.join(podOrdner, '..', 'vivodepot.html')) ? path.join(podOrdner, '..', 'vivodepot.html') : null);
  const c = codePruefen(podOrdner, kern, !o.pod);   // Karteileichen nur am eigenen Stand; ein älteres Paket kennt neuere Wege nicht
  const fehler = c.fehler.slice();
  if (o.dse) fehler.push(...dsePruefen(fs.readFileSync(o.dse, 'utf8'), c.kennungen));
  return { fehler, kennungen: [...c.kennungen].sort() };
}

module.exports = { pruefen, codePruefen, dsePruefen, schreibaufrufe, KENNUNGEN, WIDERRUFEN, SCHREIBWEGE, ORDNER_KENNUNG };

if (require.main === module) {
  const a = process.argv.slice(2);
  const wert = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const r = pruefen({ pod: wert('--pod'), kern: wert('--kern'), dse: wert('--dse') });
  console.log('pod-schreibwege-dse: Kennungen ' + r.kennungen.join(', ') + (wert('--dse') ? ' · DSE ' + wert('--dse') : ' · ohne DSE'));
  if (r.fehler.length) { r.fehler.forEach((f) => console.log('  ROT ' + f)); process.exit(1); }
  console.log('pod-schreibwege-dse: grün');
}
