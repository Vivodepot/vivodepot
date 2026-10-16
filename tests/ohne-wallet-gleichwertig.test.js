'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter: niemand wird zurückgelassen — jeder Weg mit Wallet oder eID hat einen gleichwertigen Weg ohne (08.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Grundsatz der Geschäftsführung (08.10.2026, „Wallet will not be compulsory - so can we make sure nobody is left behind“):
   Jede Funktion, die eine EUDI-Wallet, eine eID oder einen Identitäts-Broker nutzt, hat einen gleichwertigen Weg ohne.
   Gemessen am Kanon a99f0f6a2: heute verlangt kein Weg eine Wallet oder eID. Dieser Wächter hält das fest.

   SUCHMUSTER (acht Klassen, Wort der Gegenlesung 08.10.): wallet/eudiw · oid4vp/openid4vp/oid4vci/openid4vci · vp_token · siop ·
   mdoc/mDL · eID · AusweisApp/eid-client · PID. Gesucht wird in Kern, Lese-App und Studio, Kommentarzeilen ausgenommen
   (sie öffnen keinen Weg).

   REGEL: jede Fundstelle, gruppiert nach Datei, umgebender Definition und Klasse, steht EINZELN in POSITIVLISTE —
     · `art: 'weg'`  — ein Wallet-/eID-Weg: `ohne` nennt die Funktion des gleichwertigen Wegs ohne, und die gibt es im Kern;
     · `art: 'begriff'` — kein Weg (Datei-Weg, der nur das Format nutzt; Kommentarblock; fremde Bedeutung wie Krypto-Wallet,
       Icon, Schriftparser) — mit Grund.
   Jeder Eintrag trägt `anzahl`, die genaue Zahl seiner Fundzeilen: eine weitere Fundzeile in derselben Funktion ist rot, nicht
   still mitgedeckt. Eine neue Stelle ohne Eintrag ist rot, ein Eintrag ohne Fund ist rot, ein `weg` ohne existierenden Weg
   ohne oder ohne existierende Probe ist rot.
   Dazu: eine Anfrage hat immer einen Antwortweg ohne Wallet, und „nur mit Wallet/eID“ ist nicht setzbar.
   ROT-BEWEIS je Klasse an synthetischem Code. GRENZE: der Wächter sieht Bezeichner, keine Bedeutung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { _entwicklerleisteSchneiden } = require('../tools/lib/produkt-text-erzeugen.js');

const WURZEL = path.join(__dirname, '..');
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html'];
const TEXTE = Object.fromEntries(DATEIEN.map((d) => [d, fs.readFileSync(path.join(WURZEL, d), 'utf8')]));

const KLASSEN = [
  ['wallet', /wallet|eudiw/i], ['oid4vp', /oid4vp|openid4vp|openid4vci|oid4vci/i], ['vp_token', /vp_token/i], ['siop', /\bsiop/i],
  ['mdoc', /\bmdoc\b|\bmdl\b|mDL/], ['eid', /\beid\b|eID/], ['ausweisapp', /ausweisapp|eid-client/i], ['pid', /\bpid\b|\bPID\b|pid_/],
];
const DEFINITION = /^(?:async )?function ([\w$]+)|^(?:const|let|var) ([\w$]+)|^\s*<(style)/;
const KOMMENTAR = /^\s*(?:\/\/|\*|\/\*)/;

// Je Stelle (Datei|Definition|Klasse) ein Eintrag — keine Sammel- oder Präfixeinträge.
const POSITIVLISTE = {
  'vivodepot.html|EUDIW_SD_JWT_TYP|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Formatkonstante des SD-JWT VC; die Datei entsteht ohne Wallet' },
  'vivodepot.html|EUDIW_SD_HASH_ALG|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Formatkonstante des SD-JWT VC' },
  'vivodepot.html|EUDIW_MIME|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Formatkonstante des SD-JWT VC' },
  'vivodepot.html|EUDIW_SICHTBAR|wallet': { anzahl: 1, art: 'weg', ohne: 'flowFormatExport', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', grund: 'Schalter der Wallet-Übergabe (aus); der Datei-Export hängt nicht an ihm' },
  'vivodepot.html|_eudiwDisclosure|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Teil des Serialisierers, den auch der Datei-Export nutzt' },
  'vivodepot.html|_eudiwDigest|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Teil des Serialisierers' },
  'vivodepot.html|EUDIW_SELBSTAUSKUNFT_TYP|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Formatkonstante der unsignierten Selbstauskunft' },
  'vivodepot.html|EUDIW_SELBSTAUSKUNFT_MIME|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Formatkonstante der unsignierten Selbstauskunft' },
  'vivodepot.html|eudiwSdJwtVcSerialisieren|wallet': { anzahl: 7, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Serialisierer, den auch der Datei-Export nutzt' },
  'vivodepot.html|eudiwOid4vpWrapper|wallet': { anzahl: 3, art: 'weg', ohne: 'formatExportInhalt', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Abruf-Vorlage als JSON-Datei, kein Live-Protokoll' },
  'vivodepot.html|eudiwOid4vpWrapper|oid4vp': { anzahl: 3, art: 'weg', ohne: 'formatExportInhalt', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Abruf-Vorlage im Stil von OID4VP als Datei' },
  'vivodepot.html|eudiwOid4vpWrapper|vp_token': { anzahl: 1, art: 'weg', ohne: 'formatExportInhalt', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'vp_token-Feld der Abruf-Vorlage (Datei)' },
  'vivodepot.html|_eudiwDateiname|wallet': { anzahl: 1, art: 'weg', ohne: 'formatAusgabeErzeugen', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', grund: 'Dateiname der Ausgabe' },
  'vivodepot.html|eudiwDefFuerSektor|wallet': { anzahl: 2, art: 'weg', ohne: 'flowFormatExport', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', grund: 'Formatwahl je Bereich; dieselben Formate im Datei-Export' },
  'vivodepot.html|flowEudiwUebergabe|wallet': { anzahl: 4, art: 'weg', ohne: 'flowFormatExport', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', grund: 'Wallet-Übergabe (ausgeblendet); dieselben Angaben als Datei' },
  'vivodepot.html|_eudiwAusgeben|wallet': { anzahl: 25, art: 'weg', ohne: 'flowFormatExport', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', grund: 'Ausgabe für die Wallet; derselbe Inhalt als Datei' },
  'vivodepot.html|_eudiwAusgeben|oid4vp': { anzahl: 1, art: 'weg', ohne: 'flowFormatExport', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', grund: 'ruft die Abruf-Vorlage auf; derselbe Inhalt als Datei' },
  'vivodepot.html|flowHerausgeben|wallet': { anzahl: 4, art: 'weg', ohne: 'flowFormatExport', probe: 'tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', grund: 'Knopf „An EUDI-Wallet übergeben“ neben den Datei-Wegen derselben Auswahl' },
  'vivodepot.html|formatAusgabeErzeugen|wallet': { anzahl: 2, art: 'begriff', grund: 'Datei-Weg selbst; ruft nur den SD-JWT-VC-Serialisierer' },
  'vivodepot.html|_formatExportDownload|wallet': { anzahl: 1, art: 'begriff', grund: 'Datei-Weg; Hinweis bei unsignierter Selbstauskunft' },
  'vivodepot.html|EXPORT_FORMATE|wallet': { anzahl: 3, art: 'begriff', grund: 'Markierung eudiw:true an Datei-Formaten' },
  'vivodepot.html|_FORMAT_SCHREIBER_LUECKEN|wallet': { anzahl: 1, art: 'begriff', grund: 'Text über das SD-JWT-Format' },
  'vivodepot.html|_jsonParse|wallet': { anzahl: 1, art: 'begriff', grund: 'Text im Import des eigenen Formats' },
  'vivodepot.html|<style>|wallet': { anzahl: 3, art: 'begriff', grund: 'CSS-Klasse der Wallet-Warnung' },
  'vivodepot.html|_MODUL_SPRACHE_FORM|wallet': { anzahl: 1, art: 'begriff', grund: 'Kommentartext' },
  'vivodepot.html|flowBereichPdf|wallet': { anzahl: 2, art: 'begriff', grund: 'Kommentarblock zum QR-Zerleger' },
  'vivodepot.html|_qrRahmenParsen|wallet': { anzahl: 2, art: 'begriff', grund: 'Kommentarblock zur Wallet-Übergabe (Datei und QR)' },
  'vivodepot.html|_qrRahmenParsen|oid4vp': { anzahl: 1, art: 'begriff', grund: 'Kommentar: kein laufendes OID4VCI/OID4VP' },
  'vivodepot.html|antwortJwePasswort|wallet': { anzahl: 1, art: 'begriff', grund: 'Kommentar zu U2-ADR-085' },
  'vivodepot.html|ICONS|wallet': { anzahl: 1, art: 'begriff', grund: 'Icon „wallet“ (Geldbörse)' },
  'vivodepot.html|KENNUNG_MAPPING|wallet': { anzahl: 2, art: 'begriff', grund: 'Krypto-Wallet-Felder' },
  'vivodepot.html|_VERWALTUNG_TOPF_B|wallet': { anzahl: 1, art: 'begriff', grund: 'Krypto-Wallet-Felder' },
  'vivodepot.html|SEKTION_STATUSKARTEN_CLUSTER|wallet': { anzahl: 1, art: 'begriff', grund: 'Krypto-Wallet-Felder' },
  'vivodepot.html|VC_IDENTITAET_MAPPING|pid': { anzahl: 1, art: 'begriff', grund: 'Text zum EUDI-PID-Schema (Feldnamen)' },
  'vivodepot.html|parseVivodepotBeta|pid': { anzahl: 4, art: 'begriff', grund: 'Profil-ID beim Import' },
  'vivodepot.html|importAnwenden|pid': { anzahl: 2, art: 'begriff', grund: 'Personen-ID beim Import' },
  'vivodepot.html|_ebTtfCmap|eid': { anzahl: 2, art: 'begriff', grund: 'Schriftparser: encodingID' },
  'vivodepot.html|_ebTtfCmap|pid': { anzahl: 2, art: 'begriff', grund: 'Schriftparser: platformID' },
  'vivodepot.html|YB_ZEICHEN|mdoc': { anzahl: 1, art: 'begriff', grund: 'Zeichenfolge in eingebettetem Bild (base64)' },
  'vivodepot.html|Ba|eid': { anzahl: 1, art: 'begriff', grund: 'eingebettete Bibliothek (jsPDF/pako)' },
  // 15.10.2026, Wort der Gegenlesung: der OID4VP-Spike in einer ENTWICKLERLEISTE-Spanne, aus jedem Produkt geschnitten (Probe unten).
  'vivodepot.html|_OID4VP_JWS_ALGS|oid4vp': { anzahl: 1, art: 'begriff', grund: 'Spike, Entwicklerleiste: erlaubte JWS-Algorithmen der OID4VP-Anfrage (tests/oid4vp-spike.test.js)' },
  'vivodepot.html|_oid4vpJwsPruefen|oid4vp': { anzahl: 3, art: 'begriff', grund: 'Spike, Entwicklerleiste: Prüfung der OID4VP-Anfrage-JWS (tests/oid4vp-spike.test.js)' },
  'vivodepot-lesen.html|TEXTSATZ_EINGEBAUT_LESEN|wallet': { anzahl: 2, art: 'begriff', grund: 'Krypto-Wallet-Bezeichnungen' },
  'vivodepot-lesen.html|SEKTOREN|wallet': { anzahl: 8, art: 'begriff', grund: 'Krypto-Wallet-Felder und Icon' },
  'vivodepot-lesen.html|SEKTOREN|eid': { anzahl: 1, art: 'begriff', grund: 'Beispieltext eines BundID-Felds (Vertrauensniveau)' },
  'vivodepot-lesen.html|KENNUNG_MAPPING|wallet': { anzahl: 2, art: 'begriff', grund: 'Krypto-Wallet-Felder' },
  'vivodepot-studio.html|FELDKATALOG|wallet': { anzahl: 2, art: 'begriff', grund: 'Krypto-Wallet-Felder' },
  'vivodepot-studio.html|BLATT_ICONS|wallet': { anzahl: 1, art: 'begriff', grund: 'Icon „wallet“' },
  'vivodepot-studio.html|BLATT_ICON_NAMEN|wallet': { anzahl: 1, art: 'begriff', grund: 'Icon „wallet“ = Finanzen' },
  'vivodepot-studio.html|<style>|eid': { anzahl: 1, art: 'begriff', grund: 'Zeichenfolge in eingebetteter Schrift (base64, Studio S0)' },
};

function funde(texte) {
  const raus = new Map();
  for (const [datei, text] of Object.entries(texte)) {
    let ort = '(kopf)';
    for (const zeile of text.split('\n')) {
      const m = DEFINITION.exec(zeile);
      if (m) ort = m[1] || m[2] || ('<' + m[3] + '>');
      if (KOMMENTAR.test(zeile)) continue;
      for (const [klasse, rx] of KLASSEN) if (rx.test(zeile)) { const k = datei + '|' + ort + '|' + klasse; raus.set(k, (raus.get(k) || 0) + 1); }
    }
  }
  return raus;   // Stelle → Zahl der Fundzeilen
}
function funktionGibtEs(text, name) { return new RegExp('^(?:async )?function ' + name + '\\(', 'm').test(text); }
function pruefen(texte, positiv = POSITIVLISTE) {
  const f = funde(texte);
  const kern = texte['vivodepot.html'] || '';
  return [...f.keys()].filter((k) => !Object.prototype.hasOwnProperty.call(positiv, k)).map((k) => 'ohne Eintrag: ' + k)
    .concat(Object.keys(positiv).filter((k) => !f.has(k)).map((k) => 'Eintrag ohne Fund: ' + k))
    // Exakt, nicht ≤: eine weitere Fundzeile in einer gelisteten Funktion ist eine neue Stelle und braucht einen Blick.
    .concat(Object.entries(positiv).filter(([k, e]) => f.has(k) && f.get(k) !== e.anzahl)
      .map(([k, e]) => k + ': ' + f.get(k) + ' Fundzeilen statt ' + e.anzahl))
    .concat(Object.entries(positiv).filter(([, e]) => e.art === 'weg' && !funktionGibtEs(kern, e.ohne)).map(([k, e]) => k + ': Weg ohne fehlt (' + e.ohne + ')'))
    .concat(Object.entries(positiv).filter(([, e]) => e.art === 'weg' && !probeGibtEs(e.probe)).map(([k, e]) => k + ': Probe fehlt (' + e.probe + ')'));
}
/* Die Probe des Wegs ohne: `tests/<datei>#<Testname>` — die Datei gibt es, und sie trägt genau diesen Testnamen. Eine Probe, die
   umbenannt wurde, macht den Wächter rot; so kann der Weg ohne nicht still aus der Suite fallen. */
function probeGibtEs(probe, lesen = (d) => { try { return fs.readFileSync(path.join(WURZEL, d), 'utf8'); } catch (_) { return null; } }) {
  if (typeof probe !== 'string' || probe.indexOf('#') < 0) return false;
  const [datei, name] = [probe.slice(0, probe.indexOf('#')), probe.slice(probe.indexOf('#') + 1)];
  const text = lesen(datei);
  return !!text && (text.indexOf("test('" + name + "'") >= 0 || text.indexOf('test("' + name + '"') >= 0);
}

test('[Ohne Wallet] jede Wallet-/eID-Stelle steht einzeln in der Liste, jeder Weg hat einen Weg ohne', () => {
  assert.deepEqual(pruefen(TEXTE), []);
  for (const [k, e] of Object.entries(POSITIVLISTE)) {
    assert.ok(e.art === 'weg' || e.art === 'begriff', k + ': art');
    assert.ok(e.grund && e.grund.length >= 8, k + ': Grund fehlt');
    if (e.art === 'weg') assert.ok(typeof e.ohne === 'string' && e.ohne && typeof e.probe === 'string', k + ': ohne und probe fehlen');
    assert.equal(k.split('|').length, 3, k + ': genau Datei|Definition|Klasse');
    assert.ok(Number.isInteger(e.anzahl) && e.anzahl >= 1, k + ': anzahl fehlt');
  }
});

test('[Ohne Wallet·Anfrage] jede Anfrage hat einen Antwortweg ohne Wallet; „nur mit Wallet/eID“ ist nicht setzbar', () => {
  const arten = /const ANFRAGE_ANTWORT_ARTEN = Object\.freeze\(\[([^\]]*)\]\)/.exec(TEXTE['vivodepot.html']);
  assert.ok(arten, 'ANFRAGE_ANTWORT_ARTEN gefunden');
  const liste = arten[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean);
  assert.ok(liste.some((a) => a === 'einmalpasswort' || a === 'schluesselpaar'), 'ein Antwortweg ohne Wallet: ' + liste.join(','));
  const nurWallet = /\bnurWallet\b|\bnurEid\b|pflicht\s*:\s*['"](?:eid|wallet)['"]|identifizierung\s*:\s*['"](?:wallet|eid)['"]/i;
  for (const [d, t] of Object.entries(TEXTE)) assert.doesNotMatch(t, nurWallet, d);
});

test('[Ohne Wallet·Positivkontrolle] die Wege von heute sind im Suchraum, die Wallet-Übergabe ist ausgeblendet', () => {
  const f = [...funde(TEXTE).keys()];
  for (const k of ['vivodepot.html|flowEudiwUebergabe|wallet', 'vivodepot.html|eudiwOid4vpWrapper|oid4vp', 'vivodepot.html|eudiwOid4vpWrapper|vp_token',
    'vivodepot.html|flowHerausgeben|wallet']) assert.ok(f.includes(k), k);
  assert.match(TEXTE['vivodepot.html'], /^const EUDIW_SICHTBAR = false;/m);
});

test('[Ohne Wallet·Rot-Beweis] je Musterklasse fällt eine neue Stelle ohne Eintrag, ein Weg ohne Weg-ohne ebenfalls', () => {
  const muster = { wallet: 'walletVorzeigen()', oid4vp: 'openid4vp://authorize', vp_token: 'vp_token', siop: 'siopv2', mdoc: 'mdoc',
    eid: 'eID', ausweisapp: 'AusweisApp', pid: 'pid_issuer' };
  for (const [klasse, token] of Object.entries(muster)) {
    const r = pruefen({ 'vivodepot.html': 'function neuerWeg() {\n  const x = "' + token + '";\n}\n' }, {});
    assert.deepEqual(r, ['ohne Eintrag: vivodepot.html|neuerWeg|' + klasse], klasse);
    assert.deepEqual(pruefen({ 'vivodepot.html': 'function neuerWeg() {\n  // ' + token + '\n}\n' }, {}), [], klasse + ': Kommentar zählt nicht');
  }
  const positiv = { 'vivodepot.html|neuerWeg|wallet': { anzahl: 1, art: 'weg', ohne: 'gibtEsNicht', probe: 'tests/gibt-es-nicht.test.js#x', grund: 'Probe' } };
  assert.deepEqual(pruefen({ 'vivodepot.html': 'function neuerWeg() { walletVorzeigen(); }\n' }, positiv),
    ['vivodepot.html|neuerWeg|wallet: Weg ohne fehlt (gibtEsNicht)', 'vivodepot.html|neuerWeg|wallet: Probe fehlt (tests/gibt-es-nicht.test.js#x)']);
  assert.equal(probeGibtEs('tests/ohne-wallet-dateiweg.test.js#[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf'), true, 'Positivkontrolle der Probenprüfung');
  assert.equal(probeGibtEs('tests/ohne-wallet-dateiweg.test.js#umbenannt'), false);
  // Eine ZWEITE Stelle in einer gelisteten Funktion fällt — der Eintrag deckt genau seine Zahl, nicht „alles in dieser Funktion“.
  const einStelle = { 'vivodepot.html|gelistet|wallet': { anzahl: 1, art: 'begriff', grund: 'Probe' } };
  assert.deepEqual(pruefen({ 'vivodepot.html': 'function gelistet() {\n  icon("wallet");\n}\n' }, einStelle), []);
  assert.deepEqual(pruefen({ 'vivodepot.html': 'function gelistet() {\n  icon("wallet");\n  walletVorzeigen();\n}\n' }, einStelle),
    ['vivodepot.html|gelistet|wallet: 2 Fundzeilen statt 1']);
  const nurWalletArten = "['wallet']".slice(1, -1).split(',').map((s) => s.trim().replace(/['"]/g, ''));
  assert.equal(nurWalletArten.some((a) => a === 'einmalpasswort' || a === 'schluesselpaar'), false, 'eine Liste nur mit wallet fiele');
});

/* Einträge mit „Spike, Entwicklerleiste" im Grund (15.10.2026): ihre Definition muss in einer ENTWICKLERLEISTE-Spanne liegen —
   im Kern vorhanden, nach dem Schnitt fort. Sonst stünde ein Produktweg unter dem Etikett des Spikes in der Liste. */
const SPIKE_GRUND = /Spike, Entwicklerleiste/;
function definitionDa(text, name) { return new RegExp('^(?:async )?function ' + name + '\\(|^(?:const|let|var) ' + name + '\\b', 'm').test(text); }
function spikeEintraegeAusserhalb(texte, positiv = POSITIVLISTE) {
  return Object.entries(positiv).filter(([, e]) => SPIKE_GRUND.test(e.grund)).map(([k]) => k).filter((k) => {
    const [datei, name] = k.split('|');
    const text = texte[datei] || '';
    return !definitionDa(text, name) || definitionDa(_entwicklerleisteSchneiden(text, datei), name);
  });
}

test('[Ohne Wallet·Spike] jeder Eintrag „Spike, Entwicklerleiste" nennt eine Definition in einer Entwicklerleisten-Spanne', () => {
  const spike = Object.entries(POSITIVLISTE).filter(([, e]) => SPIKE_GRUND.test(e.grund)).map(([k]) => k);
  assert.deepEqual(spike.sort(), ['vivodepot.html|_OID4VP_JWS_ALGS|oid4vp', 'vivodepot.html|_oid4vpJwsPruefen|oid4vp'], 'Positivkontrolle: die zwei Spike-Einträge');
  assert.deepEqual(spikeEintraegeAusserhalb(TEXTE), []);
});

test('[Ohne Wallet·Spike·Rot-Beweis] ein Eintrag „Spike, Entwicklerleiste" auf einer Produktdefinition fällt, ebenso einer ohne Definition', () => {
  const falsch = {
    'vivodepot.html|formatAusgabeErzeugen|wallet': { anzahl: 2, art: 'begriff', grund: 'Spike, Entwicklerleiste: falsch etikettiert' },
    'vivodepot.html|gibtEsNicht|oid4vp': { anzahl: 1, art: 'begriff', grund: 'Spike, Entwicklerleiste: fort' },
  };
  assert.deepEqual(spikeEintraegeAusserhalb(TEXTE, falsch).sort(), Object.keys(falsch).sort());
});
