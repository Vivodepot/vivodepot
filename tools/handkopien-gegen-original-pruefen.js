#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   handkopien-gegen-original-pruefen.js — U2-ADR-262 (Auftrag, 04.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND: `vivodepot-template-generator.html` führt eine Handkopie von
   `FORMAT_MODUL_SCHLUESSEL` aus `vivodepot.html` — ohne Wächter lief sie
   auseinander (`rechtsraum`/U2-ADR-255 und `schreiber`/U2-ADR-257 fehlten in
   der Kopie). Dieselbe Bauart (eine Konstante, von Hand in einer zweiten Datei
   nachgebildet, weil diese Datei nicht requiren kann) findet sich an mehreren
   weiteren Stellen — REGISTRY unten hält jede, die diese Prüfung erreicht.

   WAS DIESES WERKZEUG NICHT PRÜFT — bewusst, mit Grund, nicht still:
   - Konstanten innerhalb des gepinnten Krypto-Blocks (`tools/
     krypto-block-propagation-pruefen.js` hält sie bereits byte-identisch —
     eine zweite Prüfung wäre redundant, nicht zusätzlich schützend).
   - `TRUST_AUTHORITY_PUBLIC_JWK` (`tests/lese-app-zertifikate.test.js`,
     feldweiser Vergleich) und `WIDERRUFS_LISTE` (`tools/
     build-widerrufsliste.js` + `tests/a405-widerrufsliste-lese-app.test.js`,
     generierte Region) — beide bereits eigens gehalten.
   - `STRINGS`/`SEKTOREN`/`SITUATIONEN` und die übrigen großen, generierten
     Registry-Inhalte — deren Kongruenz ist Gegenstand der `paritaet-kern-
     lese`-Testfamilie (teilweise, für Feld-Label/-Struktur) bzw. ausdrücklich
     als offene Lücke dokumentiert (`tests/etappe2c-situationen-weglassen.
     test.js`); ein vollständiger struktureller Abgleich dieser Größenordnung
     ist ein eigener Zug, kein Nachtrag zu diesem.
   - `LISTEN_AUSWAHLFORM` (Kern) — Werte hängen von `_rechtsraumKatalogLesen()`
     ab, ist also keine literale Aufzählung, sondern von Laufzeit-Code
     abhängig; nicht ohne den Kern auszuführen sicher auswertbar.
   Jede Auslassung ist hier benannt, keine still.

   WIE GEPRÜFT WIRD: `konstantenText()` liest den Deklarationstext einer
   `const NAME = …;`-Zeile per Regex (dieselbe Form wie `konstantenWert()` in
   `tools/krypto-block-propagation-pruefen.js`) und wertet ihn über
   `new Function()` isoliert aus — nur für Deklarationen, die eine
   in-sich-geschlossene literale Aufzählung sind (kein Bezug auf anderen
   Code). Nur `git ls-files`-geführte Dateien werden gelesen (lokale,
   nie committete Fassungen fallen sonst nur auf dieser Maschine rot).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

/* U2-ADR-232: `cwd` verliert gegen GIT_DIR/GIT_INDEX_FILE, wenn beide gesetzt sind (echter
   pre-commit-Lauf) — ohne Stripping antwortet `git ls-files` fürs Repo aus der Umgebung, nicht
   für `repo`. Dieselbe Form wie `ohneGitUmgebung()` in scripts/build-datum-kern.js. */
function ohneGitEnv() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
}

function trackierteDateien(repo) {
  const out = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8', env: ohneGitEnv() });
  return new Set(out.split('\n').filter(Boolean));
}

/* Dieselbe Form wie konstantenWert() in tools/krypto-block-propagation-pruefen.js —
   bewusst dieselbe Regex, nicht neu erfunden: `[^;]+` greift, weil keiner der
   hier geführten Werte ein literales Semikolon enthält (geprüft, nicht angenommen). */
function konstantenText(quelle, name) {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*([^;]+);').exec(quelle);
  return m ? m[1].trim() : null;
}

function wertAusText(text) {
  return new Function('return (' + text + ')')(); // eslint-disable-line no-new-func
}

function liesKonstante(repo, tracked, datei, name) {
  if (!tracked.has(datei)) return { fehlt: true, grund: 'Datei nicht von git verfolgt — übersprungen' };
  let quelle;
  try { quelle = fs.readFileSync(path.join(repo, datei), 'utf8'); }
  catch { return { fehlt: true, grund: 'Datei nicht lesbar' }; }
  const text = konstantenText(quelle, name);
  if (text === null) return { fehlt: true, grund: 'Konstante `' + name + '` in dieser Datei nicht gefunden' };
  try { return { wert: wertAusText(text) }; }
  catch (e) { return { fehlt: true, grund: 'Ausdruck nicht auswertbar: ' + e.message }; }
}

/* ── Struktur-Vergleiche — jeder benennt den Fehlbestand, zählt ihn nicht nur ── */

function mengenDiff(original, kopie) {
  const so = new Set(original), sk = new Set(kopie);
  return {
    fehltInKopie: [...so].filter((x) => !sk.has(x)),
    zusaetzlichInKopie: [...sk].filter((x) => !so.has(x)),
  };
}

function werteGleich(a, b) {
  if (a instanceof RegExp || b instanceof RegExp) return String(a) === String(b);
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

function objektDiff(original, kopie) {
  const schluesselOriginal = Object.keys(original);
  const schluesselKopie = Object.keys(kopie);
  const fehltInKopie = schluesselOriginal.filter((k) => !(k in kopie));
  const zusaetzlichInKopie = schluesselKopie.filter((k) => !(k in original));
  const abweichendeWerte = schluesselOriginal
    .filter((k) => k in kopie && !werteGleich(original[k], kopie[k]))
    .map((k) => ({ schluessel: k, original: String(original[k]), kopie: String(kopie[k]) }));
  return { fehltInKopie, zusaetzlichInKopie, abweichendeWerte };
}

/* ── Die Registry — jede Zeile eine gemessene Handkopie ────────────────────── */
/* art: 'wert' (primitiver Literal, strikte Gleichheit) | 'liste' (Array,
   Mengenvergleich) | 'objekt' (Objekt aus Primitiven/Arrays/RegExp,
   schlüsselweiser Vergleich) | 'werte-aus-objekt' (Original ist ein Objekt,
   die Kopie führt dessen Object.values() als flaches Array — INSTITUTION_ART
   vs. INSTITUTION_ART_EINGEBAUT). */
const REGISTRY = [
  { label: 'FORMAT_MODUL_SCHLUESSEL', art: 'liste',
    original: { datei: 'vivodepot.html', name: 'FORMAT_MODUL_SCHLUESSEL' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: 'FORMAT_MODUL_SCHLUESSEL' }],
    // U2-ADR-262: `schreiber` ist eine BENANNTE Ausnahme, keine stille — der Generator hat
    // keinen FORMAT_SCHREIBER_BEKANNT-Mirror für die Wertprüfung; s. Kommentar an der
    // FORMAT_MODUL_SCHLUESSEL-Deklaration in vivodepot-template-generator.html.
    ausnahmen: ['schreiber'] },
  { label: 'FORMAT_ERKENNER_SCHLUESSEL', art: 'liste',
    original: { datei: 'vivodepot.html', name: 'FORMAT_ERKENNER_SCHLUESSEL' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: 'FORMAT_ERKENNER_SCHLUESSEL' }] },
  { label: 'FORMAT_ZUORDNUNG_SCHLUESSEL', art: 'liste',
    original: { datei: 'vivodepot.html', name: 'FORMAT_ZUORDNUNG_SCHLUESSEL' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: 'FORMAT_ZUORDNUNG_SCHLUESSEL' }] },
  { label: 'BRANDING_MODUL_SCHLUESSEL', art: 'liste',
    original: { datei: 'vivodepot.html', name: 'BRANDING_MODUL_SCHLUESSEL' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: 'BRANDING_MODUL_SCHLUESSEL' }] },
  { label: '_RECHTSRAUM_MODUL_SCHLUESSEL', art: 'liste',
    original: { datei: 'vivodepot.html', name: '_RECHTSRAUM_MODUL_SCHLUESSEL' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: '_RECHTSRAUM_MODUL_SCHLUESSEL' }] },
  { label: '_FORMAT_PFAD_VERBOTEN', art: 'liste',
    original: { datei: 'vivodepot.html', name: '_FORMAT_PFAD_VERBOTEN' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: '_FORMAT_PFAD_VERBOTEN' }] },
  { label: '_TEMPLATE_FELDID_PRAEFIX', art: 'wert',
    original: { datei: 'vivodepot.html', name: '_TEMPLATE_FELDID_PRAEFIX' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: '_TEMPLATE_FELDID_PRAEFIX' }] },
  { label: 'INSTITUTION_ART → INSTITUTION_ART_EINGEBAUT', art: 'werte-aus-objekt',
    original: { datei: 'vivodepot.html', name: 'INSTITUTION_ART' },
    kopien: [{ datei: 'vivodepot-template-generator.html', name: 'INSTITUTION_ART_EINGEBAUT' }] },
  { label: 'JWS_ALG_FALLBACK', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'JWS_ALG_FALLBACK' },
    kopien: [
      { datei: 'vivodepot-template-generator.html', name: 'JWS_ALG_FALLBACK' },
      { datei: 'vivodepot-lesen.html', name: 'JWS_ALG_FALLBACK' },
      { datei: 'vivodepot-vc-issuer.html', name: 'JWS_ALG_FALLBACK' },
    ] },
  { label: 'TEST_SENTINEL_ISSUER', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'TEST_SENTINEL_ISSUER' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'TEST_SENTINEL_ISSUER' }] },
  { label: 'TEST_SENTINEL_PUBLIC_JWK', art: 'objekt',
    original: { datei: 'vivodepot.html', name: 'TEST_SENTINEL_PUBLIC_JWK' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'TEST_SENTINEL_PUBLIC_JWK' }] },
  { label: 'DATEI_MAGIC', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'DATEI_MAGIC' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'DATEI_MAGIC' }] },
  { label: 'INSTRUMENT_ZEILE_PRAEFIX', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'INSTRUMENT_ZEILE_PRAEFIX' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'INSTRUMENT_ZEILE_PRAEFIX' }] },
  { label: 'EMPFAENGER_QR_HASH_PRAEFIX', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'EMPFAENGER_QR_HASH_PRAEFIX' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'EMPFAENGER_QR_HASH_PRAEFIX' }] },
  { label: 'LISTEN_UNTERFELD_PRAEFIX', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'LISTEN_UNTERFELD_PRAEFIX' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'LISTEN_UNTERFELD_PRAEFIX' }] },
  { label: 'LISTEN_AUSWAHLFORM_STANDARD', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'LISTEN_AUSWAHLFORM_STANDARD' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'LISTEN_AUSWAHLFORM_STANDARD' }] },
  { label: 'MODUL_HERKUNFT_FORMAT', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'MODUL_HERKUNFT_FORMAT' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'MODUL_HERKUNFT_FORMAT' }] },
  { label: 'NOTFALL_KERN_FELDER', art: 'liste-von-objekten',
    original: { datei: 'vivodepot.html', name: 'NOTFALL_KERN_FELDER' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'NOTFALL_KERN_FELDER' }] },
  { label: 'TEXTSATZ_REGELN_EINGEBAUT', art: 'objekt',
    original: { datei: 'vivodepot.html', name: 'TEXTSATZ_REGELN_EINGEBAUT' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'TEXTSATZ_REGELN_EINGEBAUT' }] },
  { label: 'TEXTSATZ_REGELN_ERLAUBT', art: 'objekt',
    original: { datei: 'vivodepot.html', name: 'TEXTSATZ_REGELN_ERLAUBT' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'TEXTSATZ_REGELN_ERLAUBT' }] },
  { label: 'TEXTSATZ_REGEL_FORM', art: 'objekt',
    original: { datei: 'vivodepot.html', name: 'TEXTSATZ_REGEL_FORM' },
    kopien: [{ datei: 'vivodepot-lesen.html', name: 'TEXTSATZ_REGEL_FORM' }] },
  // Nachtrag (04.09.2026, Anlass: Frage nach der Vollständigkeit der Registry
  // während einer Warte-Etappe): beide unten stehenden Funde tragen JEWEILS eine `tools/`-Kopie,
  // damit außerhalb des Vierer-Fokus (Generator/Lesen/vc-issuer), auf den die ursprüngliche Suche
  // begrenzt war.
  { label: 'AUSGABESTELLE_ANBIETERTYP', art: 'wert',
    original: { datei: 'vivodepot.html', name: 'AUSGABESTELLE_ANBIETERTYP' },
    kopien: [
      { datei: 'vivodepot-vc-issuer.html', name: 'AUSGABESTELLE_ANBIETERTYP' },
      { datei: 'tools/herausgeber-onboarding-dienst.js', name: 'AUSGABESTELLE_ANBIETERTYP' },
    ] },
  { label: 'KRYPTO_VERSION_ALLOWLIST (Node-Werkzeug-Kopie)', art: 'liste',
    original: { datei: 'vivodepot.html', name: 'KRYPTO_VERSION_ALLOWLIST' },
    // tools/depot-umschlag-diagnose.js:37 trägt die Kopie ausdrücklich benannt („von Hand
    // synchron gehalten, s. Test") — der zitierte Test existierte nicht (grep gegen
    // tests/depot-umschlag-diagnose.test.js: null Treffer für KRYPTO_VERSION_ALLOWLIST). Der
    // Kommentar versprach Deckung, die es nicht gab — genau das Muster, das diese Registry
    // insgesamt schließen soll.
    kopien: [{ datei: 'tools/depot-umschlag-diagnose.js', name: 'KRYPTO_VERSION_ALLOWLIST' }] },
];

function schluesselFuerListeVonObjekten(objekt) {
  // Stabiler String-Schlüssel je Eintrag, unabhängig von Objekt-Schlüsselreihenfolge.
  return JSON.stringify(Object.keys(objekt).sort().map((k) => [k, objekt[k]]));
}

function pruefeEintrag(repo, tracked, eintrag) {
  const original = liesKonstante(repo, tracked, eintrag.original.datei, eintrag.original.name);
  if (original.fehlt) {
    return [{ ...eintrag, kopie: null, ok: false,
      meldung: 'Original `' + eintrag.original.name + '` in ' + eintrag.original.datei + ': ' + original.grund }];
  }
  const originalWert = eintrag.art === 'werte-aus-objekt' ? Object.values(original.wert) : original.wert;

  return eintrag.kopien.map((kopieRef) => {
    const kopie = liesKonstante(repo, tracked, kopieRef.datei, kopieRef.name);
    if (kopie.fehlt) {
      return { ...eintrag, kopie: kopieRef, ok: false,
        meldung: '`' + kopieRef.name + '` in ' + kopieRef.datei + ': ' + kopie.grund };
    }
    const basis = { ...eintrag, kopie: kopieRef };

    if (eintrag.art === 'wert') {
      if (werteGleich(originalWert, kopie.wert)) return { ...basis, ok: true, meldung: 'gleich' };
      return { ...basis, ok: false,
        meldung: '`' + eintrag.original.name + '` weicht ab — Original ' + JSON.stringify(originalWert) +
          ' (' + eintrag.original.datei + '), Kopie ' + JSON.stringify(kopie.wert) + ' (' + kopieRef.datei + ')' };
    }

    if (eintrag.art === 'liste' || eintrag.art === 'werte-aus-objekt') {
      const ausnahmen = eintrag.ausnahmen || [];
      const { fehltInKopie: fehltRoh, zusaetzlichInKopie } = mengenDiff(originalWert, kopie.wert);
      const benannteAusnahmen = fehltRoh.filter((s) => ausnahmen.includes(s));
      const fehltInKopie = fehltRoh.filter((s) => !ausnahmen.includes(s));
      if (fehltInKopie.length === 0 && zusaetzlichInKopie.length === 0) {
        const hinweis = benannteAusnahmen.length
          ? ' (benannte Ausnahme, s. Registry-Kommentar: ' + benannteAusnahmen.map((s) => '`' + s + '`').join(', ') + ')'
          : '';
        return { ...basis, ok: true, meldung: 'gleich' + hinweis };
      }
      const teile = [];
      if (fehltInKopie.length) teile.push(fehltInKopie.map((s) => '`' + s + '`').join(', ') +
        ' fehlt in der Kopie in ' + kopieRef.datei);
      if (zusaetzlichInKopie.length) teile.push(zusaetzlichInKopie.map((s) => '`' + s + '`').join(', ') +
        ' steht NUR in der Kopie in ' + kopieRef.datei + ', nicht im Original (' + eintrag.original.datei + ')');
      return { ...basis, ok: false, meldung: teile.join('; ') };
    }

    if (eintrag.art === 'objekt') {
      const { fehltInKopie, zusaetzlichInKopie, abweichendeWerte } = objektDiff(originalWert, kopie.wert);
      if (!fehltInKopie.length && !zusaetzlichInKopie.length && !abweichendeWerte.length) {
        return { ...basis, ok: true, meldung: 'gleich' };
      }
      const teile = [];
      if (fehltInKopie.length) teile.push('Schlüssel ' + fehltInKopie.map((s) => '`' + s + '`').join(', ') +
        ' fehlt in der Kopie in ' + kopieRef.datei);
      if (zusaetzlichInKopie.length) teile.push('Schlüssel ' + zusaetzlichInKopie.map((s) => '`' + s + '`').join(', ') +
        ' steht NUR in der Kopie in ' + kopieRef.datei);
      if (abweichendeWerte.length) teile.push(abweichendeWerte
        .map((d) => '`' + d.schluessel + '`: Original ' + d.original + ' ≠ Kopie ' + d.kopie)
        .join('; ') + ' (' + kopieRef.datei + ')');
      return { ...basis, ok: false, meldung: teile.join('; ') };
    }

    if (eintrag.art === 'liste-von-objekten') {
      const so = new Set(originalWert.map(schluesselFuerListeVonObjekten));
      const sk = new Set(kopie.wert.map(schluesselFuerListeVonObjekten));
      const fehltInKopie = originalWert.filter((o) => !sk.has(schluesselFuerListeVonObjekten(o)));
      const zusaetzlichInKopie = kopie.wert.filter((o) => !so.has(schluesselFuerListeVonObjekten(o)));
      if (!fehltInKopie.length && !zusaetzlichInKopie.length) return { ...basis, ok: true, meldung: 'gleich' };
      const teile = [];
      if (fehltInKopie.length) teile.push(fehltInKopie.length + ' Eintrag/Einträge fehlen in der Kopie in ' +
        kopieRef.datei + ' (' + fehltInKopie.map((o) => JSON.stringify(o)).join(', ') + ')');
      if (zusaetzlichInKopie.length) teile.push(zusaetzlichInKopie.length + ' Eintrag/Einträge stehen NUR in der Kopie in ' +
        kopieRef.datei + ' (' + zusaetzlichInKopie.map((o) => JSON.stringify(o)).join(', ') + ')');
      return { ...basis, ok: false, meldung: teile.join('; ') };
    }

    throw new Error('Unbekannte art: ' + eintrag.art);
  });
}

function pruefeAlle(repo) {
  const tracked = trackierteDateien(repo);
  return REGISTRY.flatMap((eintrag) => pruefeEintrag(repo, tracked, eintrag));
}

function main() {
  const befunde = pruefeAlle(REPO);
  const rot = befunde.filter((b) => !b.ok);
  for (const b of befunde) {
    console.log((b.ok ? 'OK  ' : 'ROT ') + b.label + (b.kopie ? ' (' + b.kopie.datei + ')' : '') + ': ' + b.meldung);
  }
  console.log('\n' + befunde.length + ' geprüft, ' + rot.length + ' abweichend.');
  if (rot.length) process.exit(1);
}

if (require.main === module) main();
module.exports = {
  REGISTRY, pruefeAlle, pruefeEintrag, liesKonstante, konstantenText, wertAusText,
  mengenDiff, objektDiff, werteGleich, trackierteDateien, REPO,
};
